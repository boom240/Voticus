using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Admin;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Admin side of competitions: create, edit, publish, close, archive, delete. Timing rules from section 6.
public class CompetitionService(AppDbContext db, UserManager<User> users, AuditService audit, TimeProvider clock)
{
    public static readonly TimeSpan MinDuration = TimeSpan.FromHours(1);
    public static readonly TimeSpan MaxDuration = TimeSpan.FromDays(90);

    public async Task<List<AdminCompetitionDto>> ListAsync(CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var rows = await db.Competitions
            .AsNoTracking()
            .Select(c => new { Competition = c, EntryCount = c.Entries.Count, VoteCount = c.Votes.Count })
            .ToListAsync(ct);
        return rows
            .OrderByDescending(r => r.Competition.CreatedAtUtc)
            .Select(r => ToDto(r.Competition, r.EntryCount, r.VoteCount, now))
            .ToList();
    }

    public async Task<AdminCompetitionDto> GetAsync(int id, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var row = await db.Competitions
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new { Competition = c, EntryCount = c.Entries.Count, VoteCount = c.Votes.Count })
            .SingleOrDefaultAsync(ct) ?? throw DomainException.NotFound("Competition not found.");
        return ToDto(row.Competition, row.EntryCount, row.VoteCount, now);
    }

    public async Task<Competition> CreateAsync(CompetitionUpsertRequest request, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var starts = AsUtc(request.StartsAtUtc);
        var ends = AsUtc(request.EndsAtUtc);
        ValidateWindow(starts, ends);
        if (starts < now)
        {
            throw DomainException.BadRequest("The start time cannot be in the past.");
        }

        var competition = new Competition
        {
            Title = request.Title.Trim(),
            Description = NullIfBlank(request.Description),
            StartsAtUtc = starts,
            EndsAtUtc = ends,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedByUserId = actor.RequireId(),
        };
        db.Competitions.Add(competition);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionCreated", "Competition", competition.Id, competition.Id, null, Snapshot(competition), ct);
        return competition;
    }

    public async Task<Competition> UpdateAsync(int id, CompetitionUpsertRequest request, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await Load(id, ct);
        var old = Snapshot(competition);
        var starts = AsUtc(request.StartsAtUtc);
        var ends = AsUtc(request.EndsAtUtc);
        ValidateWindow(starts, ends);

        if (competition.HasStarted(now))
        {
            // Once started, the only time change allowed is extending the end.
            if (starts != competition.StartsAtUtc)
            {
                throw DomainException.BadRequest("The start time cannot change once the competition has started.");
            }
            if (ends < competition.EndsAtUtc)
            {
                throw DomainException.BadRequest("The end time can only be extended once the competition has started.");
            }
        }
        else if (competition.PublishedAtUtc is not null && starts < now)
        {
            throw DomainException.BadRequest("The start time cannot be in the past.");
        }

        competition.Title = request.Title.Trim();
        competition.Description = NullIfBlank(request.Description);
        competition.StartsAtUtc = starts;
        competition.EndsAtUtc = ends;
        competition.UpdatedAtUtc = now;
        if (ends > now)
        {
            // Reopened by extension, so the turnout snapshot is stale.
            competition.ApprovedMembersAtClose = null;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionUpdated", "Competition", id, id, old, Snapshot(competition), ct);
        return competition;
    }

    public async Task<Competition> PublishAsync(int id, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await Load(id, ct);
        if (competition.PublishedAtUtc is not null)
        {
            throw DomainException.Conflict("This competition is already published.");
        }
        if (competition.StartsAtUtc < now)
        {
            throw DomainException.BadRequest("The start time has passed. Update the times before publishing.");
        }
        var old = Snapshot(competition);
        competition.PublishedAtUtc = now;
        competition.UpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionPublished", "Competition", id, id, old, Snapshot(competition), ct);
        return competition;
    }

    public async Task<Competition> UnpublishAsync(int id, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await Load(id, ct);
        if (competition.PublishedAtUtc is null)
        {
            throw DomainException.Conflict("This competition is already a draft.");
        }
        if (competition.HasStarted(now))
        {
            throw DomainException.Conflict("A competition that has started cannot go back to draft. Close it instead.");
        }
        var old = Snapshot(competition);
        competition.PublishedAtUtc = null;
        competition.UpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionUnpublished", "Competition", id, id, old, Snapshot(competition), ct);
        return competition;
    }

    // Force close: the end time becomes now.
    public async Task<Competition> CloseAsync(int id, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await Load(id, ct);
        if (competition.GetStatus(now) != CompetitionStatus.Open)
        {
            throw DomainException.Conflict("Only an open competition can be closed early.");
        }
        var old = Snapshot(competition);
        competition.EndsAtUtc = now;
        competition.ApprovedMembersAtClose = (await users.GetUsersInRoleAsync(Roles.Approved)).Count;
        competition.UpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionClosed", "Competition", id, id, old, Snapshot(competition), ct);
        return competition;
    }

    public async Task<Competition> ArchiveAsync(int id, bool archived, CurrentUser actor, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await Load(id, ct);
        if (competition.IsArchived == archived)
        {
            return competition;
        }
        var old = Snapshot(competition);
        competition.ArchivedAtUtc = archived ? now : null;
        competition.UpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, archived ? "CompetitionArchived" : "CompetitionUnarchived", "Competition", id, id, old, Snapshot(competition), ct);
        return competition;
    }

    // Hard delete only for drafts with no entries.
    public async Task DeleteAsync(int id, CurrentUser actor, CancellationToken ct = default)
    {
        var competition = await Load(id, ct);
        if (competition.PublishedAtUtc is not null)
        {
            throw DomainException.Conflict("Only draft competitions can be deleted. Archive this one instead.");
        }
        if (await db.Entries.AnyAsync(e => e.CompetitionId == id, ct))
        {
            throw DomainException.Conflict("Competitions with entries cannot be deleted. Archive it instead.");
        }
        var old = Snapshot(competition);
        db.Competitions.Remove(competition);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "CompetitionDeleted", "Competition", id, null, old, null, ct);
    }

    public static void ValidateWindow(DateTime starts, DateTime ends)
    {
        if (ends <= starts)
        {
            throw DomainException.BadRequest("The end time must be after the start time.");
        }
        var duration = ends - starts;
        if (duration < MinDuration)
        {
            throw DomainException.BadRequest("A competition must run for at least 1 hour.");
        }
        if (duration > MaxDuration)
        {
            throw DomainException.BadRequest("A competition can run for at most 90 days.");
        }
    }

    public static AdminCompetitionDto ToDto(Competition c, int entryCount, int voteCount, DateTime now) => new(
        c.Id, c.Title, c.Description, c.GetStatus(now).ToString(), c.StartsAtUtc, c.EndsAtUtc, c.PublishedAtUtc,
        c.ArchivedAtUtc, c.ApprovedMembersAtClose, entryCount, voteCount, c.CreatedAtUtc, c.UpdatedAtUtc,
        CanDelete: c.PublishedAtUtc is null && entryCount == 0);

    private async Task<Competition> Load(int id, CancellationToken ct) =>
        await db.Competitions.SingleOrDefaultAsync(c => c.Id == id, ct) ?? throw DomainException.NotFound("Competition not found.");

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static object Snapshot(Competition c) => new
    {
        c.Title, c.Description, c.StartsAtUtc, c.EndsAtUtc, c.PublishedAtUtc, c.ArchivedAtUtc,
    };
}
