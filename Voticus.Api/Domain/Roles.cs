namespace Voticus.Api.Domain;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Approved = "Approved";

    public static readonly string[] All = [Admin, Approved];
}
