namespace Voticus.Api.Domain;

// Derived from the clock and the published flag. Never stored.
public enum CompetitionStatus
{
    Draft,
    Upcoming,
    Open,
    Closed,
}
