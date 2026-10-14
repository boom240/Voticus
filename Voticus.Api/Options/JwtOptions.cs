namespace Voticus.Api.Options;

public class JwtOptions
{
    public const string Section = "Jwt";

    // Set via user secrets or the Jwt__Key environment variable. Never in appsettings.
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "Voticus";
    public int LifetimeDays { get; set; } = 7;
}
