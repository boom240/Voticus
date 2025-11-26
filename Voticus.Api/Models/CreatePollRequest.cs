namespace Voticus.Api.Models
{
    public record CreatePollRequest(
    string Title,
    string? Description,
    string? ImageUrl,
    DateTime? FinishAtUtc
    );
}
