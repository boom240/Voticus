namespace Voticus.Api.Contracts.Polls
{
    public record PollDto(
        int Id,
        string Title,
        string? Description = null,
        string? ImageUrl = null,
        DateTime? FinishAtUtc = null,
        List<EntryDto>? Entries = null
    );
}
