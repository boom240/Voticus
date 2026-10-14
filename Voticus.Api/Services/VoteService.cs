using Microsoft.EntityFrameworkCore;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Vote rules: approved, open, one per competition, never for your own entry. Admin changes are audited.
public class VoteService(AppDbContext db, AuditService audit, TimeProvider clock)
{
    public async Task<Vote> CastAsync(int competitionId, int entryId, CurrentUser actor, CancellationToken ct = default)
    {
        if (!actor.IsApproved)
        {
            throw DomainException.Forbidden("Only approved members can vote.");
        }
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await db.Competitions.SingleOrDefaultAsync(c => c.Id == competitionId, ct);
        if (competition is null || competition.PublishedAtUtc is null || competition.IsArchived)
        {
            throw DomainException.NotFound("Competition not found.");
        }
        if (!competition.IsOpen(now))
        {
            throw DomainException.Conflict("Voting is not open for this competition.");
        }

        var vote = await BuildVote(competition, entryId, actor.RequireId(), now, ct);
        db.Votes.Add(vote);
        await db.SaveChangesAsync(ct);
        return vote;
    }

    // Admin tools. The one vote and no self vote rules still apply, but the open window does not.
    public async Task<Vote> AdminCreateAsync(int competitionId, int entryId, string userId, CurrentUser actor, CancellationToken ct = default)
    {
        var competition = await db.Competitions.SingleOrDefaultAsync(c => c.Id == competitionId, ct)
            ?? throw DomainException.NotFound("Competition not found.");
        var user = await db.Users.FindAsync([userId], ct) ?? throw DomainException.NotFound("User not found.");

        var vote = await BuildVote(competition, entryId, user.Id, clock.GetUtcNow().UtcDateTime, ct);
        db.Votes.Add(vote);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "VoteCreated", "Vote", vote.Id, competitionId, null, Snapshot(vote), ct);
        return vote;
    }

    public async Task<Vote> AdminChangeAsync(int competitionId, int voteId, int newEntryId, CurrentUser actor, CancellationToken ct = default)
    {
        var vote = await db.Votes.SingleOrDefaultAsync(v => v.Id == voteId && v.CompetitionId == competitionId, ct)
            ?? throw DomainException.NotFound("Vote not found.");
        var old = Snapshot(vote);

        var entry = await db.Entries.SingleOrDefaultAsync(e => e.Id == newEntryId && e.CompetitionId == competitionId, ct)
            ?? throw DomainException.NotFound("Entry not found in this competition.");
        if (entry.UserId == vote.UserId)
        {
            throw DomainException.BadRequest("A member cannot vote for their own entry.");
        }

        vote.EntryId = newEntryId;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "VoteChanged", "Vote", vote.Id, competitionId, old, Snapshot(vote), ct);
        return vote;
    }

    public async Task AdminDeleteAsync(int competitionId, int voteId, CurrentUser actor, CancellationToken ct = default)
    {
        var vote = await db.Votes.SingleOrDefaultAsync(v => v.Id == voteId && v.CompetitionId == competitionId, ct)
            ?? throw DomainException.NotFound("Vote not found.");
        var old = Snapshot(vote);

        db.Votes.Remove(vote);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(actor, "VoteDeleted", "Vote", voteId, competitionId, old, null, ct);
    }

    private async Task<Vote> BuildVote(Competition competition, int entryId, string userId, DateTime now, CancellationToken ct)
    {
        var entry = await db.Entries.SingleOrDefaultAsync(e => e.Id == entryId && e.CompetitionId == competition.Id, ct)
            ?? throw DomainException.NotFound("Entry not found in this competition.");
        if (entry.UserId == userId)
        {
            throw DomainException.BadRequest("You cannot vote for your own entry.");
        }
        if (await db.Votes.AnyAsync(v => v.CompetitionId == competition.Id && v.UserId == userId, ct))
        {
            throw DomainException.Conflict("You have already voted in this competition. Votes are final.");
        }

        return new Vote
        {
            CompetitionId = competition.Id,
            EntryId = entryId,
            UserId = userId,
            CreatedAtUtc = now,
        };
    }

    private static object Snapshot(Vote vote) => new { vote.Id, vote.EntryId, vote.UserId, vote.CreatedAtUtc };
}
