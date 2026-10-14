using System.ComponentModel.DataAnnotations;

namespace Voticus.Api.Contracts.Auth;

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(6), MaxLength(128)] string Password);
