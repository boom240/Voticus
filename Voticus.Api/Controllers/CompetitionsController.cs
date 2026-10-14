using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/competitions")]
public class CompetitionsController(CompetitionQueries queries, ResultsService results) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<CompetitionSummaryDto>>> List(CancellationToken ct)
    {
        return Ok(await queries.ListAsync(ct));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<CompetitionDetailDto>> Get(int id, CancellationToken ct)
    {
        return Ok(await queries.GetDetailAsync(id, User.ToCurrentUser(), ct));
    }

    [HttpGet("{id:int}/entries/{entryId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<EntryDetailDto>> GetEntry(int id, int entryId, CancellationToken ct)
    {
        return Ok(await queries.GetEntryAsync(id, entryId, User.ToCurrentUser(), ct));
    }

    [HttpGet("{id:int}/results")]
    [AllowAnonymous]
    public async Task<ActionResult<ResultsDto>> Results(int id, CancellationToken ct)
    {
        return Ok(await results.GetAsync(id, User.ToCurrentUser(), ct));
    }
}
