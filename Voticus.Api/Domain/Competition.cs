namespace Voticus.Api.Domain;

public class Competition
{
    public const int TitleMin = 3;
    public const int TitleMax = 100;
    public const int DescriptionMax = 2000;

    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }

    // Null means Draft. Set when an admin publishes.
    public DateTime? PublishedAtUtc { get; set; }

    // Archived competitions are hidden from the public but kept for records.
    public DateTime? ArchivedAtUtc { get; set; }

    // Turnout denominator, captured at close or on the first results read after it.
    public int? ApprovedMembersAtClose { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public string CreatedByUserId { get; set; } = "";
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<Entry> Entries { get; set; } = new List<Entry>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();

    public bool IsArchived => ArchivedAtUtc is not null;

    public CompetitionStatus GetStatus(DateTime nowUtc)
    {
        if (PublishedAtUtc is null) return CompetitionStatus.Draft;
        if (nowUtc < StartsAtUtc) return CompetitionStatus.Upcoming;
        if (nowUtc < EndsAtUtc) return CompetitionStatus.Open;
        return CompetitionStatus.Closed;
    }

    public bool IsOpen(DateTime nowUtc) => GetStatus(nowUtc) == CompetitionStatus.Open;
    public bool IsClosed(DateTime nowUtc) => GetStatus(nowUtc) == CompetitionStatus.Closed;
    public bool HasStarted(DateTime nowUtc) => PublishedAtUtc is not null && nowUtc >= StartsAtUtc;
}
