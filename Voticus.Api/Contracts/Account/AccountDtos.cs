using System.ComponentModel.DataAnnotations;

namespace Voticus.Api.Contracts.Account;

public record MyEntryDto(
    int EntryId,
    int CompetitionId,
    string CompetitionTitle,
    string CompetitionStatus,
    string Title,
    DateTime CreatedAtUtc,
    // Only once the competition is closed.
    int? VotesReceived);

public record MyVoteDto(
    int VoteId,
    int CompetitionId,
    string CompetitionTitle,
    string CompetitionStatus,
    int EntryId,
    string EntryTitle,
    DateTime CreatedAtUtc);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, MinLength(6), MaxLength(128)] string NewPassword);

public record DeleteAccountRequest([Required] string Password);
