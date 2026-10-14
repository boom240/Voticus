using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/competitions/{competitionId:int}/votes")]
[Authorize]
public class VotesController(VoteService votes) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("vote")]
    public async Task<IActionResult> Cast(int competitionId, CastVoteRequest request, CancellationToken ct)
    {
        await votes.CastAsync(competitionId, request.EntryId, User.ToCurrentUser(), ct);
        return NoContent();
    }
}
