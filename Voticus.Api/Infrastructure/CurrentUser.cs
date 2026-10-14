using System.Security.Claims;
using Voticus.Api.Domain;

namespace Voticus.Api.Infrastructure;

// What the request knows about the caller. Id is null for anonymous requests.
public record CurrentUser(string? Id, string? Email, bool IsApproved, bool IsAdmin)
{
    public static readonly CurrentUser Anonymous = new(null, null, false, false);

    public bool IsAuthenticated => Id is not null;

    public string RequireId() => Id ?? throw DomainException.Forbidden("You must be logged in.");
}

public static class ClaimsPrincipalExtensions
{
    public static CurrentUser ToCurrentUser(this ClaimsPrincipal principal)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null)
        {
            return CurrentUser.Anonymous;
        }
        return new CurrentUser(
            id,
            principal.FindFirstValue(ClaimTypes.Email) ?? principal.Identity?.Name,
            principal.IsInRole(Roles.Approved),
            principal.IsInRole(Roles.Admin));
    }
}
