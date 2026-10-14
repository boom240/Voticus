using System.Text.Json;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Infrastructure;

namespace Voticus.Api.Services;

// Writes one row per admin change. Old and new values are JSON snapshots.
public class AuditService(AppDbContext db, TimeProvider clock)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task LogAsync(
        CurrentUser actor,
        string action,
        string entityType,
        int entityId,
        int? competitionId,
        object? oldValue,
        object? newValue,
        CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actor.RequireId(),
            ActorEmail = actor.Email ?? "",
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            CompetitionId = competitionId,
            OldValue = oldValue is null ? null : JsonSerializer.Serialize(oldValue, JsonOptions),
            NewValue = newValue is null ? null : JsonSerializer.Serialize(newValue, JsonOptions),
            CreatedAtUtc = clock.GetUtcNow().UtcDateTime,
        });
        await db.SaveChangesAsync(ct);
    }
}
