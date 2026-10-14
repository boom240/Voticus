namespace Voticus.Api.Domain;

public class Vote
{
    public int Id { get; set; }

    // Stored here as well as on the entry so the one vote per competition index needs no join.
    public int CompetitionId { get; set; }
    public Competition Competition { get; set; } = default!;

    public int EntryId { get; set; }
    public Entry Entry { get; set; } = default!;

    public string UserId { get; set; } = "";
    public User User { get; set; } = default!;

    public DateTime CreatedAtUtc { get; set; }
}
