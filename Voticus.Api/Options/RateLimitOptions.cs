namespace Voticus.Api.Options;

public class RateLimitOptions
{
    public const string Section = "RateLimiting";

    public RateLimitPolicy Auth { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };
    public RateLimitPolicy Vote { get; set; } = new() { PermitLimit = 10, WindowSeconds = 60 };
}

public class RateLimitPolicy
{
    public int PermitLimit { get; set; }
    public int WindowSeconds { get; set; }
}
