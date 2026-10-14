using Microsoft.Extensions.Diagnostics.HealthChecks;
using Voticus.Api.Data;

namespace Voticus.Api.Infrastructure;

public class DatabaseHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        return await db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("Database unreachable");
    }
}
