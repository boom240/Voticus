using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Results are public once closed. Before that the response only carries the end time.
public class ResultsService(AppDbContext db, UserManager<User> users, TimeProvider clock)
{
    public async Task<ResultsDto> GetAsync(int competitionId, CurrentUser user, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var competition = await db.Competitions
            .Include(c => c.Entries).ThenInclude(e => e.Images)
            .Include(c => c.Entries).ThenInclude(e => e.Votes)
            .SingleOrDefaultAsync(c => c.Id == competitionId, ct);

        if (competition is null || (!user.IsAdmin && (competition.PublishedAtUtc is null || competition.IsArchived)))
        {
            throw DomainException.NotFound("Competition not found.");
        }

        var status = competition.GetStatus(now);
        if (status != CompetitionStatus.Closed)
        {
            return new ResultsDto(competition.Id, competition.Title, status.ToString(), competition.EndsAtUtc,
                Available: false, 0, competition.Entries.Count, null, null, [], [], []);
        }

        // Snapshot the turnout denominator the first time results are read after the close.
        if (competition.ApprovedMembersAtClose is null)
        {
            competition.ApprovedMembersAtClose = (await users.GetUsersInRoleAsync(Roles.Approved)).Count;
            await db.SaveChangesAsync(ct);
        }

        var labels = CompetitionQueries.OwnerLabels(competition.Entries);
        var totalVotes = competition.Entries.Sum(e => e.Votes.Count);
        var top = competition.Entries.Count == 0 ? 0 : competition.Entries.Max(e => e.Votes.Count);

        var entries = competition.Entries
            .OrderByDescending(e => e.Votes.Count).ThenBy(e => e.CreatedAtUtc).ThenBy(e => e.Id)
            .Select(e => new ResultEntryDto(
                e.Id,
                e.Title,
                labels[e.Id],
                e.Images.OrderBy(i => i.Position).Select(CompetitionQueries.ToImageDto).FirstOrDefault(),
                e.Votes.Count,
                totalVotes == 0 ? 0 : Math.Round(100.0 * e.Votes.Count / totalVotes, 1),
                // Joint winners share the top count. No votes at all means no winner.
                IsWinner: top > 0 && e.Votes.Count == top))
            .ToList();

        var timeline = competition.Entries
            .SelectMany(e => e.Votes)
            .OrderBy(v => v.CreatedAtUtc)
            .Select((v, index) => new TimelinePointDto(v.CreatedAtUtc, index + 1))
            .ToList();

        var approved = competition.ApprovedMembersAtClose;
        double? turnout = approved is > 0 ? Math.Round(100.0 * totalVotes / approved.Value, 1) : null;

        return new ResultsDto(
            competition.Id,
            competition.Title,
            status.ToString(),
            competition.EndsAtUtc,
            Available: true,
            totalVotes,
            competition.Entries.Count,
            approved,
            turnout,
            entries.Where(e => e.IsWinner).ToList(),
            entries,
            timeline);
    }
}
