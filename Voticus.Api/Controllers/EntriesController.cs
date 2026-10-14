using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Contracts.Competitions;
using Voticus.Api.Infrastructure;
using Voticus.Api.Services;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/competitions/{competitionId:int}/entries")]
[Authorize]
public class EntriesController(EntryService entries, CompetitionQueries queries) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(ImageRules.MaxBytes * 11)]
    public async Task<ActionResult<EntryDetailDto>> Create(int competitionId, [FromForm] CreateEntryForm form, CancellationToken ct)
    {
        var actor = User.ToCurrentUser();
        var entry = await entries.CreateAsync(
            competitionId, actor, actor.RequireId(), form.Title, form.Description, ToNewImages(form.Images, form.AltTexts), ct);
        var dto = await queries.GetEntryAsync(competitionId, entry.Id, actor, ct);
        return CreatedAtAction("GetEntry", "Competitions", new { id = competitionId, entryId = entry.Id }, dto);
    }

    [HttpPut("{entryId:int}")]
    public async Task<ActionResult<EntryDetailDto>> Update(int competitionId, int entryId, UpdateEntryRequest request, CancellationToken ct)
    {
        var actor = User.ToCurrentUser();
        await entries.UpdateAsync(competitionId, entryId, actor, request, ct);
        return Ok(await queries.GetEntryAsync(competitionId, entryId, actor, ct));
    }

    [HttpDelete("{entryId:int}")]
    public async Task<IActionResult> Delete(int competitionId, int entryId, CancellationToken ct)
    {
        await entries.DeleteAsync(competitionId, entryId, User.ToCurrentUser(), ct);
        return NoContent();
    }

    [HttpPost("{entryId:int}/images")]
    [RequestSizeLimit(ImageRules.MaxBytes * 11)]
    public async Task<ActionResult<List<ImageDto>>> AddImages(int competitionId, int entryId, [FromForm] AddImagesForm form, CancellationToken ct)
    {
        var added = await entries.AddImagesAsync(competitionId, entryId, User.ToCurrentUser(), ToNewImages(form.Images, form.AltTexts), ct);
        return Ok(added.Select(CompetitionQueries.ToImageDto).ToList());
    }

    [HttpDelete("{entryId:int}/images/{imageId:int}")]
    public async Task<IActionResult> RemoveImage(int competitionId, int entryId, int imageId, CancellationToken ct)
    {
        await entries.RemoveImageAsync(competitionId, entryId, imageId, User.ToCurrentUser(), ct);
        return NoContent();
    }

    [HttpPut("{entryId:int}/images/order")]
    public async Task<ActionResult<List<ImageDto>>> Reorder(int competitionId, int entryId, ReorderImagesRequest request, CancellationToken ct)
    {
        var ordered = await entries.ReorderAsync(competitionId, entryId, request.ImageIds.ToArray(), User.ToCurrentUser(), ct);
        return Ok(ordered.Select(CompetitionQueries.ToImageDto).ToList());
    }

    [HttpPut("{entryId:int}/images/{imageId:int}")]
    public async Task<ActionResult<ImageDto>> UpdateImage(int competitionId, int entryId, int imageId, UpdateImageRequest request, CancellationToken ct)
    {
        var image = await entries.UpdateImageAsync(competitionId, entryId, imageId, request.AltText, User.ToCurrentUser(), ct);
        return Ok(CompetitionQueries.ToImageDto(image));
    }

    internal static List<EntryService.NewImage> ToNewImages(List<IFormFile> files, List<string> altTexts)
    {
        // Checked before the service so an oversize file never gets buffered twice.
        foreach (var file in files)
        {
            if (file.Length > ImageRules.MaxBytes)
            {
                throw Domain.DomainException.BadRequest($"\"{file.FileName}\" is over 5 MB. Each image must be 5 MB or smaller.");
            }
        }
        return files.Select((f, i) => new EntryService.NewImage(f.OpenReadStream(), i < altTexts.Count ? altTexts[i] : null)).ToList();
    }
}
