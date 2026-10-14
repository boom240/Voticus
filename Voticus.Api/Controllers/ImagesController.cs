using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/images")]
public class ImagesController(IFileStorage storage) : ControllerBase
{
    // Keys are random and immutable, so the response can be cached for a long time.
    [HttpGet("{key}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 31536000, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> Get(string key, CancellationToken ct)
    {
        if (!StorageKeys.IsValid(key))
        {
            return NotFound();
        }

        var stream = await storage.OpenReadAsync(key, ct);
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(stream, ImageRules.ContentTypeForExtension(StorageKeys.Extension(key)));
    }
}
