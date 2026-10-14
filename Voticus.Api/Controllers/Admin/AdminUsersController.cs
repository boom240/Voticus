using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Contracts.Admin;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;

namespace Voticus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = Roles.Admin)]
public class AdminUsersController(UserAdminService users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminUserDto>>> List(CancellationToken ct) => Ok(await users.ListAsync(ct));

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(string id)
    {
        await users.SetApprovedAsync(id, true, User.ToCurrentUser());
        return NoContent();
    }

    [HttpPost("{id}/revoke-approval")]
    public async Task<IActionResult> RevokeApproval(string id)
    {
        await users.SetApprovedAsync(id, false, User.ToCurrentUser());
        return NoContent();
    }

    [HttpPost("{id}/grant-admin")]
    public async Task<IActionResult> GrantAdmin(string id)
    {
        await users.SetAdminAsync(id, true, User.ToCurrentUser());
        return NoContent();
    }

    [HttpPost("{id}/revoke-admin")]
    public async Task<IActionResult> RevokeAdmin(string id)
    {
        await users.SetAdminAsync(id, false, User.ToCurrentUser());
        return NoContent();
    }
}
