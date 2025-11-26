namespace Voticus.Api.Models
{
    public record EntryDto(
        int Id,
        int PollId,
        string Description,
        string? ImageUrl,
        int VoteCount
    );
}
