namespace Voticus.Api.Domain;

// Raised by services when a rule is broken. Mapped to problem details by DomainExceptionHandler.
public class DomainException : Exception
{
    public int StatusCode { get; }

    public DomainException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }

    public static DomainException BadRequest(string message) => new(StatusCodes.Status400BadRequest, message);
    public static DomainException Forbidden(string message) => new(StatusCodes.Status403Forbidden, message);
    public static DomainException NotFound(string message) => new(StatusCodes.Status404NotFound, message);
    public static DomainException Conflict(string message) => new(StatusCodes.Status409Conflict, message);
}
