using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Account;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Services;

public class AccountService(AppDbContext db, UserManager<User> users, IFileStorage storage, TimeProvider clock)
{
    public async Task<List<MyEntryDto>> MyEntriesAsync(CurrentUser user, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var entries = await db.Entries
            .AsNoTracking()
            .Where(e => e.UserId == user.Id)
            .Select(e => new { e.Id, e.CompetitionId, e.Competition, e.Title, e.CreatedAtUtc, VoteCount = e.Votes.Count })
            .ToListAsync(ct);

        return entries
            .OrderByDescending(e => e.CreatedAtUtc)
            .Select(e =>
            {
                var status = e.Competition.GetStatus(now);
                return new MyEntryDto(
                    e.Id, e.CompetitionId, e.Competition.Title, status.ToString(), e.Title, e.CreatedAtUtc,
                    status == CompetitionStatus.Closed ? e.VoteCount : null);
            })
            .ToList();
    }

    public async Task<List<MyVoteDto>> MyVotesAsync(CurrentUser user, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var votes = await db.Votes
            .AsNoTracking()
            .Where(v => v.UserId == user.Id)
            .Select(v => new { v.Id, v.CompetitionId, v.Competition, v.EntryId, EntryTitle = v.Entry.Title, v.CreatedAtUtc })
            .ToListAsync(ct);

        return votes
            .OrderByDescending(v => v.CreatedAtUtc)
            .Select(v => new MyVoteDto(
                v.Id, v.CompetitionId, v.Competition.Title, v.Competition.GetStatus(now).ToString(), v.EntryId, v.EntryTitle, v.CreatedAtUtc))
            .ToList();
    }

    public async Task ChangePasswordAsync(CurrentUser user, ChangePasswordRequest request)
    {
        var account = await users.FindByIdAsync(user.RequireId()) ?? throw DomainException.NotFound("Account not found.");
        var result = await users.ChangePasswordAsync(account, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            throw DomainException.BadRequest(string.Join(" ", result.Errors.Select(e => e.Description)));
        }
    }

    // Section 13.7: votes go, entries go only on open competitions, closed entries stay as "Deleted user".
    public async Task DeleteAccountAsync(CurrentUser user, string password, CancellationToken ct = default)
    {
        var account = await users.FindByIdAsync(user.RequireId()) ?? throw DomainException.NotFound("Account not found.");
        if (!await users.CheckPasswordAsync(account, password))
        {
            throw DomainException.BadRequest("The password is incorrect.");
        }
        if (user.IsAdmin)
        {
            var otherAdmins = (await users.GetUsersInRoleAsync(Roles.Admin)).Count(u => u.Id != account.Id);
            if (otherAdmins == 0)
            {
                throw DomainException.Conflict("You are the only admin. Grant admin to someone else before deleting your account.");
            }
        }

        var now = clock.GetUtcNow().UtcDateTime;
        var entries = await db.Entries
            .Include(e => e.Competition)
            .Include(e => e.Images)
            .Where(e => e.UserId == account.Id)
            .ToListAsync(ct);

        var filesToDelete = new List<EntryImage>();
        foreach (var entry in entries)
        {
            if (entry.Competition.IsClosed(now))
            {
                entry.UserId = null;
            }
            else
            {
                filesToDelete.AddRange(entry.Images);
                db.Entries.Remove(entry);
            }
        }
        await db.SaveChangesAsync(ct);

        // Votes cascade from the user row.
        var result = await users.DeleteAsync(account);
        if (!result.Succeeded)
        {
            throw DomainException.BadRequest(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        foreach (var image in filesToDelete)
        {
            await storage.DeleteAsync(image.StorageKey, ct);
            await storage.DeleteAsync(image.ThumbnailKey, ct);
        }
    }
}
