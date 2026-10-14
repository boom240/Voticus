using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Voticus.Api.Data;

// Lets dotnet ef build the context without starting the host, so no secrets are needed for migrations.
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=voticus.db")
            .Options;
        return new AppDbContext(options);
    }
}
