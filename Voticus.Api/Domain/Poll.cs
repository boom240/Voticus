namespace Voticus.Api.Domain;

public class Poll
{
    public int Id { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? FinishAtUtc { get; set; }
    public ICollection<Entry> Entries { get; set; } = new List<Entry>();
}
