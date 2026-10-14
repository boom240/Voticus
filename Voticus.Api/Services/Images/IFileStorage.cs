using System.Text.RegularExpressions;

namespace Voticus.Api.Services.Images;

// Local disk in development, blob storage later. Keys are flat file names, never paths.
public interface IFileStorage
{
    Task SaveAsync(string key, byte[] content, CancellationToken cancellationToken = default);
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
}

public static partial class StorageKeys
{
    [GeneratedRegex("^[a-f0-9]{32}(_t)?\\.(jpg|png|webp|gif)$")]
    private static partial Regex KeyPattern();

    public static bool IsValid(string key) => KeyPattern().IsMatch(key);

    public static (string Full, string Thumbnail) NewPair(string extension)
    {
        var id = Guid.NewGuid().ToString("N");
        return ($"{id}.{extension}", $"{id}_t.{extension}");
    }

    public static string Extension(string key) => key[(key.LastIndexOf('.') + 1)..];
}
