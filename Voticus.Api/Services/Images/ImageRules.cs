namespace Voticus.Api.Services.Images;

public static class ImageRules
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public const int MaxDimension = 8000;
    public const int ThumbnailWidth = 400;
    public const int PlaceholderWidth = 20;

    public static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    public static string ContentTypeForExtension(string extension) => extension switch
    {
        "jpg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    };
}
