using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Domain;

namespace Voticus.Api.Infrastructure;

// Turns a DomainException into an RFC 7807 problem details response.
public class DomainExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not DomainException domain)
        {
            return false;
        }

        httpContext.Response.StatusCode = domain.StatusCode;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = domain.StatusCode,
            Title = ReasonPhrase(domain.StatusCode),
            Detail = domain.Message,
            Instance = httpContext.Request.Path,
        }, cancellationToken);
        return true;
    }

    private static string ReasonPhrase(int status) => status switch
    {
        400 => "Bad request",
        403 => "Forbidden",
        404 => "Not found",
        409 => "Conflict",
        _ => "Error",
    };
}
