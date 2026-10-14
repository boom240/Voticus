using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Voticus.Api.Data;

namespace Voticus.Api.Tests.Infrastructure;

// Boots the API against a fresh in-memory SQLite database with migrations applied.
public class VoticusApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly string _storagePath = Path.Combine(Path.GetTempPath(), "voticus-tests", Guid.NewGuid().ToString("N"));

    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 10, 13, 12, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Key", "test-signing-key-test-signing-key-1234567890");
        builder.UseSetting("Storage:LocalPath", _storagePath);
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "5");
        builder.UseSetting("RateLimiting:Auth:WindowSeconds", "60");
        builder.UseSetting("RateLimiting:Vote:PermitLimit", "5");
        builder.UseSetting("RateLimiting:Vote:WindowSeconds", "60");
        builder.UseSetting("Seed:Enabled", "false");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            _connection.Open();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection, sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
        });
    }

    public void MigrateDatabase()
    {
        using var scope = Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
        DbInitializer.EnsureRolesAsync(scope.ServiceProvider).GetAwaiter().GetResult();
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
            if (Directory.Exists(_storagePath))
            {
                Directory.Delete(_storagePath, recursive: true);
            }
        }
    }
}
