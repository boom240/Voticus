namespace Voticus.Api.Contracts.Polls
{
    public record CreatePollRequest(
    string Title,
    string? Description,
    string? ImageUrl,
    DateTime? FinishAtUtc
    );
}
