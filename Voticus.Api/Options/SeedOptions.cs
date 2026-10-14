namespace Voticus.Api.Options;

public class SeedOptions
{
    public const string Section = "Seed";

    public bool Enabled { get; set; }
    // Both come from user secrets. The seed skips with a warning if either is missing.
    public string? AdminPassword { get; set; }
    public string? MemberPassword { get; set; }
}
