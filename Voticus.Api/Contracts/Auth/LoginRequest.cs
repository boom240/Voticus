using System.ComponentModel.DataAnnotations;

namespace Voticus.Api.Contracts.Auth;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);
