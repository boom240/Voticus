using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Contracts.Admin;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/competitions")]
[Authorize(Roles = Roles.Admin)]
public class AdminCompetitionsController(
    CompetitionService competitions,
    AdminQueries queries,
    EntryService entries,
    VoteService votes,
    CompetitionQueries publicQueries) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AdminCompetitionDto>>> List(CancellationToken ct) =>
        Ok(await competitions.ListAsync(ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminCompetitionDto>> Get(int id, CancellationToken ct) =>
        Ok(await competitions.GetAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<AdminCompetitionDto>> Create(CompetitionUpsertRequest request, CancellationToken ct)
    {
        var created = await competitions.CreateAsync(request, User.ToCurrentUser(), ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, await competitions.GetAsync(created.Id, ct));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<AdminCompetitionDto>> Update(int id, CompetitionUpsertRequest request, CancellationToken ct)
    {
        await competitions.UpdateAsync(id, request, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpPost("{id:int}/publish")]
    public async Task<ActionResult<AdminCompetitionDto>> Publish(int id, CancellationToken ct)
    {
        await competitions.PublishAsync(id, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpPost("{id:int}/unpublish")]
    public async Task<ActionResult<AdminCompetitionDto>> Unpublish(int id, CancellationToken ct)
    {
        await competitions.UnpublishAsync(id, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpPost("{id:int}/close")]
    public async Task<ActionResult<AdminCompetitionDto>> Close(int id, CancellationToken ct)
    {
        await competitions.CloseAsync(id, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpPost("{id:int}/archive")]
    public async Task<ActionResult<AdminCompetitionDto>> Archive(int id, CancellationToken ct)
    {
        await competitions.ArchiveAsync(id, true, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpPost("{id:int}/unarchive")]
    public async Task<ActionResult<AdminCompetitionDto>> Unarchive(int id, CancellationToken ct)
    {
        await competitions.ArchiveAsync(id, false, User.ToCurrentUser(), ct);
        return Ok(await competitions.GetAsync(id, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await competitions.DeleteAsync(id, User.ToCurrentUser(), ct);
        return NoContent();
    }

    // Entries

    [HttpGet("{id:int}/entries")]
    public async Task<ActionResult<List<AdminEntryDto>>> Entries(int id, CancellationToken ct) =>
        Ok(await queries.EntriesAsync(id, ct));

    [HttpPost("{id:int}/entries")]
    [RequestSizeLimit(ImageRules.MaxBytes * 11)]
    public async Task<ActionResult<EntryDetailDto>> CreateEntry(int id, [FromForm] AdminCreateEntryForm form, CancellationToken ct)
    {
        var actor = User.ToCurrentUser();
        var entry = await entries.CreateAsync(
            id, actor, form.UserId, form.Title, form.Description, EntriesController.ToNewImages(form.Images, form.AltTexts), ct);
        return Ok(await publicQueries.GetEntryAsync(id, entry.Id, actor, ct));
    }

    // Votes

    [HttpGet("{id:int}/votes")]
    public async Task<ActionResult<List<AdminVoteDto>>> Votes(int id, CancellationToken ct) =>
        Ok(await queries.VotesAsync(id, ct));

    [HttpPost("{id:int}/votes")]
    public async Task<ActionResult<List<AdminVoteDto>>> CreateVote(int id, AdminCreateVoteRequest request, CancellationToken ct)
    {
        await votes.AdminCreateAsync(id, request.EntryId, request.UserId, User.ToCurrentUser(), ct);
        return Ok(await queries.VotesAsync(id, ct));
    }

    [HttpPut("{id:int}/votes/{voteId:int}")]
    public async Task<ActionResult<List<AdminVoteDto>>> ChangeVote(int id, int voteId, AdminChangeVoteRequest request, CancellationToken ct)
    {
        await votes.AdminChangeAsync(id, voteId, request.EntryId, User.ToCurrentUser(), ct);
        return Ok(await queries.VotesAsync(id, ct));
    }

    [HttpDelete("{id:int}/votes/{voteId:int}")]
    public async Task<IActionResult> DeleteVote(int id, int voteId, CancellationToken ct)
    {
        await votes.AdminDeleteAsync(id, voteId, User.ToCurrentUser(), ct);
        return NoContent();
    }

    // Audit

    [HttpGet("{id:int}/audit")]
    public async Task<ActionResult<List<AuditLogDto>>> Audit(int id, CancellationToken ct) =>
        Ok(await queries.AuditAsync(id, ct));
}
