namespace Voticus.Api.Contracts.Competitions;

public record CompetitionSummaryDto(
    int Id,
    string Title,
    string? Description,
    string Status,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int EntryCount);

public record ImageDto(
    int Id,
    int Position,
    string Key,
    string ThumbnailKey,
    string Placeholder,
    string AltText,
    int Width,
    int Height,
    string ContentType);

public record EntryCardDto(
    int Id,
    string Title,
    string Excerpt,
    string OwnerLabel,
    bool IsMine,
    ImageDto? CoverImage,
    int ImageCount,
    // Only present once the competition is closed.
    int? VoteCount);

public record CompetitionDetailDto(
    int Id,
    string Title,
    string? Description,
    string Status,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int EntryCount,
    List<EntryCardDto> Entries,
    int? MyEntryId,
    int? MyVoteEntryId,
    bool CanEnter,
    bool CanVote,
    bool ResultsAvailable);

public record EntryDetailDto(
    int Id,
    int CompetitionId,
    string CompetitionTitle,
    string CompetitionStatus,
    string Title,
    string Description,
    string OwnerLabel,
    bool IsMine,
    bool CanEdit,
    bool CanVote,
    int? MyVoteEntryId,
    DateTime CreatedAtUtc,
    List<ImageDto> Images,
    int? VoteCount);
