using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Domain;

namespace Voticus.Api.Data;

public static class DbInitializer
{
    // Roles are part of the schema in all but name. Safe to run on every start.
    public static async Task EnsureRolesAsync(IServiceProvider services)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in Roles.All)
        {
            if (!await roles.RoleExistsAsync(role))
            {
                await roles.CreateAsync(new IdentityRole(role));
            }
        }
    }

    public static async Task MigrateAsync(IServiceProvider services)
    {
        await services.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }
}
