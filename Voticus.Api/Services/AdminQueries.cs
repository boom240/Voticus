using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Admin;
using Voticus.Api.Data;
using Voticus.Api.Domain;

namespace Voticus.Api.Services;

// Admin tables: entries with owners, votes with voters, and the audit log for a competition.
public class AdminQueries(AppDbContext db)
{
    public async Task<List<AdminEntryDto>> EntriesAsync(int competitionId, CancellationToken ct = default)
    {
        await EnsureCompetition(competitionId, ct);
        var entries = await db.Entries
            .AsNoTracking()
            .Where(e => e.CompetitionId == competitionId)
            .Select(e => new
            {
                e.Id, e.Title, e.Description, e.UserId, OwnerEmail = e.User != null ? e.User.Email : null,
                ImageCount = e.Images.Count, VoteCount = e.Votes.Count, e.CreatedAtUtc, e.UpdatedAtUtc,
            })
            .ToListAsync(ct);

        var labels = CompetitionQueries.OwnerLabels(entries.Select(e => new Entry { Id = e.Id, UserId = e.UserId, CreatedAtUtc = e.CreatedAtUtc }));
        return entries
            .OrderBy(e => e.CreatedAtUtc).ThenBy(e => e.Id)
            .Select(e => new AdminEntryDto(
                e.Id, e.Title, e.Description, e.UserId, e.OwnerEmail ?? CompetitionQueries.DeletedUserLabel, labels[e.Id],
                e.ImageCount, e.VoteCount, e.CreatedAtUtc, e.UpdatedAtUtc))
            .ToList();
    }

    public async Task<List<AdminVoteDto>> VotesAsync(int competitionId, CancellationToken ct = default)
    {
        await EnsureCompetition(competitionId, ct);
        return await db.Votes
            .AsNoTracking()
            .Where(v => v.CompetitionId == competitionId)
            .OrderBy(v => v.CreatedAtUtc)
            .Select(v => new AdminVoteDto(v.Id, v.UserId, v.User.Email ?? "", v.EntryId, v.Entry.Title, v.CreatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<List<AuditLogDto>> AuditAsync(int competitionId, CancellationToken ct = default)
    {
        await EnsureCompetition(competitionId, ct);
        return await db.AuditLogs
            .AsNoTracking()
            .Where(a => a.CompetitionId == competitionId)
            .OrderByDescending(a => a.CreatedAtUtc).ThenByDescending(a => a.Id)
            .Select(a => new AuditLogDto(a.Id, a.ActorEmail, a.Action, a.EntityType, a.EntityId, a.OldValue, a.NewValue, a.CreatedAtUtc))
            .ToListAsync(ct);
    }

    private async Task EnsureCompetition(int competitionId, CancellationToken ct)
    {
        if (!await db.Competitions.AnyAsync(c => c.Id == competitionId, ct))
        {
            throw DomainException.NotFound("Competition not found.");
        }
    }
}
