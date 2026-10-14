using System.ComponentModel.DataAnnotations;

namespace Voticus.Api.Contracts.Competitions;

// Multipart form: title, description, images[] and matching altTexts[].
public class CreateEntryForm
{
    [Required, MinLength(3), MaxLength(100)]
    public string Title { get; set; } = "";

    [Required, MaxLength(1000)]
    public string Description { get; set; } = "";

    public List<IFormFile> Images { get; set; } = [];

    public List<string> AltTexts { get; set; } = [];
}

public record UpdateEntryRequest(
    [Required, MinLength(3), MaxLength(100)] string Title,
    [Required, MaxLength(1000)] string Description);

public class AddImagesForm
{
    public List<IFormFile> Images { get; set; } = [];
    public List<string> AltTexts { get; set; } = [];
}

public record ReorderImagesRequest([Required] List<int> ImageIds);

public record UpdateImageRequest([Required, MaxLength(200)] string AltText);

public record CastVoteRequest([Required] int EntryId);
