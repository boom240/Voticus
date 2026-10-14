using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Admin;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Approval and admin role changes. An admin cannot remove their own admin role.
public class UserAdminService(AppDbContext db, UserManager<User> users, AuditService audit)
{
    public async Task<List<AdminUserDto>> ListAsync(CancellationToken ct = default)
    {
        var rows = await db.Users
            .AsNoTracking()
            .Select(u => new { u.Id, u.Email, u.CreatedAtUtc, EntryCount = u.Entries.Count, VoteCount = u.Votes.Count })
            .ToListAsync(ct);
        var approved = (await users.GetUsersInRoleAsync(Roles.Approved)).Select(u => u.Id).ToHashSet();
        var admins = (await users.GetUsersInRoleAsync(Roles.Admin)).Select(u => u.Id).ToHashSet();

        return rows
            .OrderBy(u => u.Email)
            .Select(u => new AdminUserDto(u.Id, u.Email ?? "", approved.Contains(u.Id), admins.Contains(u.Id), u.CreatedAtUtc == default ? null : u.CreatedAtUtc, u.EntryCount, u.VoteCount))
            .ToList();
    }

    public Task SetApprovedAsync(string userId, bool approved, CurrentUser actor) =>
        SetRole(userId, Roles.Approved, approved, actor);

    public async Task SetAdminAsync(string userId, bool admin, CurrentUser actor)
    {
        if (!admin && userId == actor.Id)
        {
            throw DomainException.Conflict("You cannot remove your own admin role. Ask another admin to do it.");
        }
        await SetRole(userId, Roles.Admin, admin, actor);
    }

    private async Task SetRole(string userId, string role, bool grant, CurrentUser actor)
    {
        var user = await users.FindByIdAsync(userId) ?? throw DomainException.NotFound("User not found.");
        var has = await users.IsInRoleAsync(user, role);
        if (has == grant)
        {
            return;
        }

        var result = grant ? await users.AddToRoleAsync(user, role) : await users.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
        {
            throw DomainException.BadRequest(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        await audit.LogAsync(actor, grant ? $"{role}Granted" : $"{role}Revoked", "User", 0, null,
            new { user.Email, Role = role, Had = has }, new { user.Email, Role = role, Has = grant });
    }
}
