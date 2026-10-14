namespace Voticus.Api.Domain;

public class Entry
{
    public const int TitleMin = 3;
    public const int TitleMax = 100;
    public const int DescriptionMax = 1000;
    public const int MinImages = 1;
    public const int MaxImages = 10;

    public int Id { get; set; }
    public int CompetitionId { get; set; }
    public Competition Competition { get; set; } = default!;

    // Null once the owner has deleted their account on a closed competition.
    public string? UserId { get; set; }
    public User? User { get; set; }

    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<EntryImage> Images { get; set; } = new List<EntryImage>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
