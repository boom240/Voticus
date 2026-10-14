using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Services;

// Entry rules: approved users only, open window, one per competition, owner or admin edits.
public class EntryService(
    AppDbContext db,
    IImageProcessor images,
    IFileStorage storage,
    AuditService audit,
    TimeProvider clock)
{
    public record NewImage(Stream Content, string? AltText);

    public async Task<Entry> CreateAsync(
        int competitionId,
        CurrentUser actor,
        string ownerUserId,
        string title,
        string description,
        IReadOnlyList<NewImage> newImages,
        CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await LoadCompetition(competitionId, actor, ct);

        if (!actor.IsAdmin)
        {
            if (!actor.IsApproved) throw DomainException.Forbidden("Only approved members can enter.");
            if (!competition.IsOpen(now)) throw DomainException.Conflict("This competition is not open for entries.");
        }
        if (actor.IsAdmin && competition.GetStatus(now) == CompetitionStatus.Draft)
        {
            throw DomainException.Conflict("Publish the competition before adding entries.");
        }

        if (await db.Entries.AnyAsync(e => e.CompetitionId == competitionId && e.UserId == ownerUserId, ct))
        {
            throw DomainException.Conflict("You already have an entry in this competition. Edit that one instead.");
        }
        if (newImages.Count < Entry.MinImages)
        {
            throw DomainException.BadRequest("Add at least one image.");
        }
        if (newImages.Count > Entry.MaxImages)
        {
            throw DomainException.BadRequest("An entry can have at most 10 images.");
        }

        var entry = new Entry
        {
            CompetitionId = competitionId,
            UserId = ownerUserId,
            Title = title.Trim(),
            Description = description.Trim(),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
        };

        var stored = new List<EntryImage>();
        try
        {
            for (var i = 0; i < newImages.Count; i++)
            {
                stored.Add(await StoreImage(newImages[i], i, entry.Title, ct));
            }
        }
        catch
        {
            await DeleteFiles(stored, ct);
            throw;
        }

        foreach (var image in stored)
        {
            entry.Images.Add(image);
        }

        db.Entries.Add(entry);
        await db.SaveChangesAsync(ct);

        if (actor.IsAdmin && actor.Id != ownerUserId)
        {
            await audit.LogAsync(actor, "EntryCreated", "Entry", entry.Id, competitionId, null, new { entry.Title, OwnerUserId = ownerUserId }, ct);
        }

        return entry;
    }

    public async Task<Entry> UpdateAsync(int competitionId, int entryId, CurrentUser actor, UpdateEntryRequest request, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        var old = new { entry.Title, entry.Description };

        entry.Title = request.Title.Trim();
        entry.Description = request.Description.Trim();
        entry.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        if (actor.IsAdmin && entry.UserId != actor.Id)
        {
            await audit.LogAsync(actor, "EntryUpdated", "Entry", entry.Id, competitionId, old, new { entry.Title, entry.Description }, ct);
        }
        return entry;
    }

    public async Task DeleteAsync(int competitionId, int entryId, CurrentUser actor, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        var votes = await db.Votes.CountAsync(v => v.EntryId == entryId, ct);
        var files = entry.Images.ToList();

        // Votes cascade with the entry, so those voters can vote again while the competition is open.
        db.Entries.Remove(entry);
        await db.SaveChangesAsync(ct);
        await DeleteFiles(files, ct);

        if (actor.IsAdmin && entry.UserId != actor.Id)
        {
            await audit.LogAsync(actor, "EntryDeleted", "Entry", entryId, competitionId, new { entry.Title, entry.UserId, Votes = votes }, null, ct);
        }
    }

    public async Task<List<EntryImage>> AddImagesAsync(int competitionId, int entryId, CurrentUser actor, IReadOnlyList<NewImage> newImages, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        if (newImages.Count == 0)
        {
            throw DomainException.BadRequest("Add at least one image.");
        }
        if (entry.Images.Count + newImages.Count > Entry.MaxImages)
        {
            throw DomainException.BadRequest("An entry can have at most 10 images.");
        }

        var nextPosition = entry.Images.Count == 0 ? 0 : entry.Images.Max(i => i.Position) + 1;
        var stored = new List<EntryImage>();
        try
        {
            for (var i = 0; i < newImages.Count; i++)
            {
                stored.Add(await StoreImage(newImages[i], nextPosition + i, entry.Title, ct));
            }
        }
        catch
        {
            await DeleteFiles(stored, ct);
            throw;
        }

        foreach (var image in stored)
        {
            entry.Images.Add(image);
        }
        entry.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        return stored;
    }

    public async Task RemoveImageAsync(int competitionId, int entryId, int imageId, CurrentUser actor, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        var image = entry.Images.FirstOrDefault(i => i.Id == imageId) ?? throw DomainException.NotFound("Image not found.");
        if (entry.Images.Count <= Entry.MinImages)
        {
            throw DomainException.BadRequest("An entry needs at least one image. Add another before removing this one.");
        }

        entry.Images.Remove(image);
        db.EntryImages.Remove(image);
        Renumber(entry);
        entry.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);
        await DeleteFiles([image], ct);
    }

    public async Task<List<EntryImage>> ReorderAsync(int competitionId, int entryId, int[] imageIds, CurrentUser actor, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        var current = entry.Images.Select(i => i.Id).OrderBy(x => x).ToArray();
        if (imageIds.Length != current.Length || !imageIds.OrderBy(x => x).SequenceEqual(current))
        {
            throw DomainException.BadRequest("The order must list every image of this entry exactly once.");
        }

        // Two passes so the unique (EntryId, Position) index is never hit mid-update.
        var byId = entry.Images.ToDictionary(i => i.Id);
        foreach (var image in entry.Images)
        {
            image.Position = image.Position + 100;
        }
        await db.SaveChangesAsync(ct);
        for (var i = 0; i < imageIds.Length; i++)
        {
            byId[imageIds[i]].Position = i;
        }
        entry.UpdatedAtUtc = clock.GetUtcNow().UtcDateTime;
        await db.SaveChangesAsync(ct);

        return entry.Images.OrderBy(i => i.Position).ToList();
    }

    public async Task<EntryImage> UpdateImageAsync(int competitionId, int entryId, int imageId, string altText, CurrentUser actor, CancellationToken ct = default)
    {
        var entry = await LoadEditable(competitionId, entryId, actor, ct);
        var image = entry.Images.FirstOrDefault(i => i.Id == imageId) ?? throw DomainException.NotFound("Image not found.");
        image.AltText = string.IsNullOrWhiteSpace(altText) ? entry.Title : altText.Trim();
        await db.SaveChangesAsync(ct);
        return image;
    }

    private async Task<Competition> LoadCompetition(int competitionId, CurrentUser actor, CancellationToken ct)
    {
        var competition = await db.Competitions.SingleOrDefaultAsync(c => c.Id == competitionId, ct);
        if (competition is null || (!actor.IsAdmin && (competition.PublishedAtUtc is null || competition.IsArchived)))
        {
            throw DomainException.NotFound("Competition not found.");
        }
        return competition;
    }

    // Owner while open, or admin at any time.
    private async Task<Entry> LoadEditable(int competitionId, int entryId, CurrentUser actor, CancellationToken ct)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var entry = await db.Entries
            .Include(e => e.Competition)
            .Include(e => e.Images)
            .SingleOrDefaultAsync(e => e.Id == entryId && e.CompetitionId == competitionId, ct)
            ?? throw DomainException.NotFound("Entry not found.");

        if (actor.IsAdmin)
        {
            return entry;
        }
        if (entry.UserId != actor.Id)
        {
            throw DomainException.Forbidden("You can only change your own entry.");
        }
        if (!entry.Competition.IsOpen(now))
        {
            throw DomainException.Conflict("Entries can only be changed while the competition is open.");
        }
        return entry;
    }

    private async Task<EntryImage> StoreImage(NewImage source, int position, string entryTitle, CancellationToken ct)
    {
        var processed = await images.ProcessAsync(source.Content, ct);
        var (fullKey, thumbKey) = StorageKeys.NewPair(processed.Extension);
        await storage.SaveAsync(fullKey, processed.Full, ct);
        await storage.SaveAsync(thumbKey, processed.Thumbnail, ct);

        var alt = string.IsNullOrWhiteSpace(source.AltText) ? entryTitle : source.AltText.Trim();
        return new EntryImage
        {
            Position = position,
            StorageKey = fullKey,
            ThumbnailKey = thumbKey,
            PlaceholderDataUrl = processed.PlaceholderDataUrl,
            ContentType = processed.ContentType,
            SizeBytes = processed.Full.Length,
            Width = processed.Width,
            Height = processed.Height,
            AltText = alt.Length > EntryImage.AltTextMax ? alt[..EntryImage.AltTextMax] : alt,
        };
    }

    private async Task DeleteFiles(IEnumerable<EntryImage> toDelete, CancellationToken ct)
    {
        foreach (var image in toDelete)
        {
            await storage.DeleteAsync(image.StorageKey, ct);
            await storage.DeleteAsync(image.ThumbnailKey, ct);
        }
    }

    private static void Renumber(Entry entry)
    {
        var ordered = entry.Images.OrderBy(i => i.Position).ToList();
        for (var i = 0; i < ordered.Count; i++)
        {
            ordered[i].Position = i;
        }
    }
}
