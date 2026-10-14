namespace Voticus.Api.Services.Images;

// Validates an upload, re-encodes it (which drops EXIF and other metadata) and builds the thumbnail and placeholder.
public interface IImageProcessor
{
    Task<ProcessedImage> ProcessAsync(Stream input, CancellationToken cancellationToken = default);
}

public record ProcessedImage(
    byte[] Full,
    byte[] Thumbnail,
    string PlaceholderDataUrl,
    int Width,
    int Height,
    string ContentType,
    string Extension);
