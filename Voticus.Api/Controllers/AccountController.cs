using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Contracts.Account;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController(AccountService account) : ControllerBase
{
    [HttpGet("entries")]
    public async Task<ActionResult<List<MyEntryDto>>> MyEntries(CancellationToken ct)
    {
        return Ok(await account.MyEntriesAsync(User.ToCurrentUser(), ct));
    }

    [HttpGet("votes")]
    public async Task<ActionResult<List<MyVoteDto>>> MyVotes(CancellationToken ct)
    {
        return Ok(await account.MyVotesAsync(User.ToCurrentUser(), ct));
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        await account.ChangePasswordAsync(User.ToCurrentUser(), request);
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(DeleteAccountRequest request, CancellationToken ct)
    {
        await account.DeleteAccountAsync(User.ToCurrentUser(), request.Password, ct);
        return NoContent();
    }
}
