namespace Voticus.Api.Domain;

public class Entry
{
    public int Id { get; set; }
    public int PollId { get; set; }
    public Poll Poll { get; set; } = default!;
    public string Description { get; set; } = default!;
    public string? ImageUrl { get; set; }
    public int VoteCount { get; set; }
}
