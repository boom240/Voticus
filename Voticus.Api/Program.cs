using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;
using Voticus.Api.Options;
using Voticus.Api.Services;
using Voticus.Api.Services.Images;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<CompetitionQueries>();
builder.Services.AddScoped<EntryService>();
builder.Services.AddScoped<VoteService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<CompetitionService>();
builder.Services.AddScoped<UserAdminService>();
builder.Services.AddScoped<AdminQueries>();
builder.Services.AddScoped<ResultsService>();
builder.Services.AddScoped<DevSeeder>();
builder.Services.AddSingleton<IImageProcessor, ImageSharpProcessor>();
builder.Services.AddSingleton<IFileStorage, LocalDiskFileStorage>();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.Section));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.Section));
builder.Services.Configure<RateLimitOptions>(builder.Configuration.GetSection(RateLimitOptions.Section));
builder.Services.Configure<SeedOptions>(builder.Configuration.GetSection(SeedOptions.Section));

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"), sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery));
});

builder.Services.AddIdentity<User, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

// The key lives in user secrets (development) or the Jwt__Key environment variable. See README.
var jwt = builder.Configuration.GetSection(JwtOptions.Section).Get<JwtOptions>() ?? new JwtOptions();
if (string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key is missing or shorter than 32 characters. Set it with 'dotnet user-secrets set Jwt:Key <value>' or the Jwt__Key environment variable.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwt.Issuer,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
        ClockSkew = TimeSpan.FromMinutes(1),
    };
    // Roles are loaded from the database on every request so approval and revocation apply at once.
    // A deleted account fails validation, which gives a 401 rather than a 403.
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var users = context.HttpContext.RequestServices.GetRequiredService<UserManager<User>>();
            var userId = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            var user = userId is null ? null : await users.FindByIdAsync(userId);
            if (user is null)
            {
                context.Fail("Account no longer exists.");
                return;
            }
            var identity = (ClaimsIdentity)context.Principal!.Identity!;
            foreach (var role in await users.GetRolesAsync(user))
            {
                identity.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        },
    };
});
builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var rateLimits = builder.Configuration.GetSection(RateLimitOptions.Section).Get<RateLimitOptions>() ?? new RateLimitOptions();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            status = 429,
            title = "Too many requests",
            detail = "Please wait a minute and try again.",
        }, options: null, contentType: "application/problem+json", cancellationToken: token);
    };

    // Login and register are limited per client address.
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rateLimits.Auth.PermitLimit,
            Window = TimeSpan.FromSeconds(rateLimits.Auth.WindowSeconds),
        }));

    // Voting is limited per user.
    options.AddPolicy("vote", context => RateLimitPartition.GetFixedWindowLimiter(
        context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rateLimits.Vote.PermitLimit,
            Window = TimeSpan.FromSeconds(rateLimits.Vote.WindowSeconds),
        }));
});

builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");

var app = builder.Build();

// Development applies migrations and seeds on start. Hosted environments migrate as a deploy step.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    if (app.Environment.IsDevelopment())
    {
        await DbInitializer.MigrateAsync(scope.ServiceProvider);
    }
    await DbInitializer.EnsureRolesAsync(scope.ServiceProvider);
    if (app.Environment.IsDevelopment())
    {
        await scope.ServiceProvider.GetRequiredService<DevSeeder>().SeedAsync();
    }
}

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

// Lets the test project reference the entry point through WebApplicationFactory.
public partial class Program;
