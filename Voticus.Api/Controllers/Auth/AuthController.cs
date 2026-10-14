using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Voticus.Api.Contracts.Auth;
using Voticus.Api.Domain;
using Voticus.Api.Services;

namespace Voticus.Api.Controllers.Auth;

[ApiController]
[Route("api/[controller]")]
public class AuthController(UserManager<User> userManager, TokenService tokens) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new User { UserName = request.Email, Email = request.Email };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            // Identity errors are returned as field errors on Password or Email.
            var errors = new Dictionary<string, string[]>();
            foreach (var error in result.Errors)
            {
                var field = error.Code.Contains("Password", StringComparison.OrdinalIgnoreCase) ? "password" : "email";
                errors[field] = [.. errors.GetValueOrDefault(field, []), error.Description];
            }
            return ValidationProblem(new ValidationProblemDetails(errors) { Title = "Registration failed" });
        }

        // New registrations are plain members until an admin approves them.
        return NoContent();
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Login failed", detail: "Invalid email or password.");
        }

        return Ok(new LoginResponse(tokens.CreateToken(user)));
    }

    [HttpGet("me")]
    [Authorize]
    public ActionResult<CurrentUserDto> Me()
    {
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
        return Ok(new CurrentUserDto(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!,
            User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "",
            roles));
    }
}
