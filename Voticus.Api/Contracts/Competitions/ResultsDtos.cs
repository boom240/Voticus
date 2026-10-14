namespace Voticus.Api.Contracts.Competitions;

public record ResultEntryDto(
    int EntryId,
    string Title,
    string OwnerLabel,
    ImageDto? CoverImage,
    int Votes,
    // Share of all votes, 0 to 100 with one decimal.
    double SharePercent,
    bool IsWinner);

public record TimelinePointDto(DateTime AtUtc, int CumulativeVotes);

public record ResultsDto(
    int CompetitionId,
    string Title,
    string Status,
    DateTime EndsAtUtc,
    bool Available,
    int TotalVotes,
    int EntryCount,
    int? ApprovedMembers,
    double? TurnoutPercent,
    List<ResultEntryDto> Winners,
    List<ResultEntryDto> Entries,
    List<TimelinePointDto> Timeline);
