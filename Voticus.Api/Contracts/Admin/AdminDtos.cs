using System.ComponentModel.DataAnnotations;

namespace Voticus.Api.Contracts.Admin;

public record CompetitionUpsertRequest(
    [Required, MinLength(3), MaxLength(100)] string Title,
    [MaxLength(2000)] string? Description,
    [Required] DateTime StartsAtUtc,
    [Required] DateTime EndsAtUtc);

public record AdminCompetitionDto(
    int Id,
    string Title,
    string? Description,
    string Status,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    DateTime? PublishedAtUtc,
    DateTime? ArchivedAtUtc,
    int? ApprovedMembersAtClose,
    int EntryCount,
    int VoteCount,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    bool CanDelete);

public record AdminEntryDto(
    int Id,
    string Title,
    string Description,
    string? OwnerUserId,
    string OwnerEmail,
    string OwnerLabel,
    int ImageCount,
    int VoteCount,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public class AdminCreateEntryForm
{
    [Required] public string UserId { get; set; } = "";
    [Required, MinLength(3), MaxLength(100)] public string Title { get; set; } = "";
    [Required, MaxLength(1000)] public string Description { get; set; } = "";
    public List<IFormFile> Images { get; set; } = [];
    public List<string> AltTexts { get; set; } = [];
}

public record AdminVoteDto(
    int Id,
    string UserId,
    string VoterEmail,
    int EntryId,
    string EntryTitle,
    DateTime CreatedAtUtc);

public record AdminCreateVoteRequest([Required] string UserId, [Required] int EntryId);

public record AdminChangeVoteRequest([Required] int EntryId);

public record AuditLogDto(
    int Id,
    string ActorEmail,
    string Action,
    string EntityType,
    int EntityId,
    string? OldValue,
    string? NewValue,
    DateTime CreatedAtUtc);

public record AdminUserDto(
    string Id,
    string Email,
    bool IsApproved,
    bool IsAdmin,
    // Null for accounts that predate the CreatedAtUtc column.
    DateTime? CreatedAtUtc,
    int EntryCount,
    int VoteCount);
