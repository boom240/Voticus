namespace Voticus.Api.Domain;

public class EntryImage
{
    public const int AltTextMax = 200;

    public int Id { get; set; }
    public int EntryId { get; set; }
    public Entry Entry { get; set; } = default!;

    // 0 to 9. Unique per entry.
    public int Position { get; set; }

    public string StorageKey { get; set; } = "";
    public string ThumbnailKey { get; set; } = "";

    // Tiny blurred preview as a data URL, shown while the real image loads.
    public string PlaceholderDataUrl { get; set; } = "";

    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public string AltText { get; set; } = "";
}
