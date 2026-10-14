namespace Voticus.Api.Contracts.Auth;

public record CurrentUserDto(string Id, string Email, string[] Roles);
