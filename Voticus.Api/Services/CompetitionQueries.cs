using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Read side for the public pages. Vote counts are only exposed once a competition is closed.
public class CompetitionQueries(AppDbContext db, TimeProvider clock)
{
    public const string DeletedUserLabel = "Deleted user";

    public async Task<List<CompetitionSummaryDto>> ListAsync(CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competitions = await db.Competitions
            .AsNoTracking()
            .Where(c => c.PublishedAtUtc != null && c.ArchivedAtUtc == null)
            .Select(c => new { Competition = c, EntryCount = c.Entries.Count })
            .ToListAsync(ct);

        return competitions
            .Select(x => ToSummary(x.Competition, x.EntryCount, now))
            .OrderBy(s => SortRank(s.Status))
            .ThenBy(s => s.Status == nameof(CompetitionStatus.Closed) ? -s.EndsAtUtc.Ticks : s.EndsAtUtc.Ticks)
            .ToList();
    }

    public async Task<CompetitionDetailDto> GetDetailAsync(int id, CurrentUser user, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await db.Competitions
            .AsNoTracking()
            .Include(c => c.Entries).ThenInclude(e => e.Images)
            .Include(c => c.Entries).ThenInclude(e => e.Votes)
            .SingleOrDefaultAsync(c => c.Id == id, ct);

        if (competition is null || !IsVisibleTo(competition, user))
        {
            throw DomainException.NotFound("Competition not found.");
        }

        var status = competition.GetStatus(now);
        var closed = status == CompetitionStatus.Closed;
        var ordered = OrderEntries(competition.Entries, closed);

        var myEntry = user.Id is null ? null : competition.Entries.FirstOrDefault(e => e.UserId == user.Id);
        var myVote = user.Id is null ? null : competition.Entries.SelectMany(e => e.Votes).FirstOrDefault(v => v.UserId == user.Id);

        var labels = OwnerLabels(competition.Entries);
        var cards = ordered.Select(e => new EntryCardDto(
            e.Id,
            e.Title,
            Excerpt(e.Description),
            labels[e.Id],
            user.Id is not null && e.UserId == user.Id,
            e.Images.OrderBy(i => i.Position).Select(ToImageDto).FirstOrDefault(),
            e.Images.Count,
            closed ? e.Votes.Count : null)).ToList();

        var isOpen = status == CompetitionStatus.Open;
        return new CompetitionDetailDto(
            competition.Id,
            competition.Title,
            competition.Description,
            status.ToString(),
            competition.StartsAtUtc,
            competition.EndsAtUtc,
            competition.Entries.Count,
            cards,
            myEntry?.Id,
            myVote?.EntryId,
            CanEnter: isOpen && user.IsApproved && myEntry is null,
            CanVote: isOpen && user.IsApproved && myVote is null,
            ResultsAvailable: closed);
    }

    public async Task<EntryDetailDto> GetEntryAsync(int competitionId, int entryId, CurrentUser user, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await db.Competitions
            .AsNoTracking()
            .Include(c => c.Entries).ThenInclude(e => e.Images)
            .Include(c => c.Entries).ThenInclude(e => e.Votes)
            .SingleOrDefaultAsync(c => c.Id == competitionId, ct);

        if (competition is null || !IsVisibleTo(competition, user))
        {
            throw DomainException.NotFound("Competition not found.");
        }

        var entry = competition.Entries.FirstOrDefault(e => e.Id == entryId)
            ?? throw DomainException.NotFound("Entry not found.");

        var status = competition.GetStatus(now);
        var closed = status == CompetitionStatus.Closed;
        var isOpen = status == CompetitionStatus.Open;
        var isMine = user.Id is not null && entry.UserId == user.Id;
        var myVote = user.Id is null ? null : competition.Entries.SelectMany(e => e.Votes).FirstOrDefault(v => v.UserId == user.Id);

        return new EntryDetailDto(
            entry.Id,
            competition.Id,
            competition.Title,
            status.ToString(),
            entry.Title,
            entry.Description,
            OwnerLabels(competition.Entries)[entry.Id],
            isMine,
            CanEdit: user.IsAdmin || (isMine && isOpen),
            CanVote: isOpen && user.IsApproved && myVote is null,
            myVote?.EntryId,
            entry.CreatedAtUtc,
            entry.Images.OrderBy(i => i.Position).Select(ToImageDto).ToList(),
            closed ? entry.Votes.Count : null);
    }

    public static ImageDto ToImageDto(EntryImage i) => new(
        i.Id, i.Position, i.StorageKey, i.ThumbnailKey, i.PlaceholderDataUrl, i.AltText, i.Width, i.Height, i.ContentType);

    // "Entrant N" by creation order within the competition, or "Deleted user".
    public static Dictionary<int, string> OwnerLabels(IEnumerable<Entry> entries)
    {
        return entries
            .OrderBy(e => e.CreatedAtUtc).ThenBy(e => e.Id)
            .Select((e, index) => (e.Id, Label: e.UserId is null ? DeletedUserLabel : $"Entrant {index + 1}"))
            .ToDictionary(x => x.Id, x => x.Label);
    }

    public static string Excerpt(string text, int max = 120)
    {
        var flat = text.ReplaceLineEndings(" ").Trim();
        return flat.Length <= max ? flat : flat[..max].TrimEnd() + "…";
    }

    private static bool IsVisibleTo(Competition competition, CurrentUser user)
    {
        if (user.IsAdmin) return true;
        return competition.PublishedAtUtc is not null && competition.ArchivedAtUtc is null;
    }

    // Creation order while open so nothing hints at the standings. Votes first once closed.
    private static IEnumerable<Entry> OrderEntries(IEnumerable<Entry> entries, bool closed)
    {
        return closed
            ? entries.OrderByDescending(e => e.Votes.Count).ThenBy(e => e.CreatedAtUtc).ThenBy(e => e.Id)
            : entries.OrderBy(e => e.CreatedAtUtc).ThenBy(e => e.Id);
    }

    private static CompetitionSummaryDto ToSummary(Competition c, int entryCount, DateTime now) => new(
        c.Id, c.Title, c.Description, c.GetStatus(now).ToString(), c.StartsAtUtc, c.EndsAtUtc, entryCount);

    private static int SortRank(string status) => status switch
    {
        nameof(CompetitionStatus.Open) => 0,
        nameof(CompetitionStatus.Upcoming) => 1,
        nameof(CompetitionStatus.Closed) => 2,
        _ => 3,
    };
}
