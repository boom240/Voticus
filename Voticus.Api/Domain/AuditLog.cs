namespace Voticus.Api.Domain;

// Who did what, when, with the before and after values as JSON.
public class AuditLog
{
    public int Id { get; set; }
    public string ActorUserId { get; set; } = "";
    public string ActorEmail { get; set; } = "";
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public int EntityId { get; set; }
    public int? CompetitionId { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
