using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Voticus.Api.Domain;
using Voticus.Api.Options;

namespace Voticus.Api.Services;

// Single place that issues tokens. A Discord login would call this after the external sign-in.
public class TokenService(IOptions<JwtOptions> options, TimeProvider clock)
{
    private readonly JwtOptions _options = options.Value;

    public string CreateToken(User user)
    {
        // Roles are not in the token. RoleClaimsTransformation loads them per request.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.Email!),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var now = clock.GetUtcNow().UtcDateTime;
        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            claims: claims,
            notBefore: now,
            expires: now.AddDays(_options.LifetimeDays),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }
}
