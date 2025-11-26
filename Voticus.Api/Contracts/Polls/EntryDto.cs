namespace Voticus.Api.Contracts.Polls
{
    public record EntryDto(
        int Id,
        int PollId,
        string Description,
        string? ImageUrl,
        int VoteCount
    );
}
