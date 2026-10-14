using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Domain;

namespace Voticus.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<User>(options)
{
    public DbSet<Competition> Competitions => Set<Competition>();
    public DbSet<Entry> Entries => Set<Entry>();
    public DbSet<EntryImage> EntryImages => Set<EntryImage>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Competition>(b =>
        {
            b.Property(c => c.Title).HasMaxLength(Competition.TitleMax).IsRequired();
            b.Property(c => c.Description).HasMaxLength(Competition.DescriptionMax);
            b.Property(c => c.CreatedByUserId).IsRequired();
            b.HasIndex(c => c.EndsAtUtc);

            b.HasMany(c => c.Entries)
                .WithOne(e => e.Competition)
                .HasForeignKey(e => e.CompetitionId)
                .OnDelete(DeleteBehavior.Cascade);

            // Votes are removed through their entry. Hard delete is only allowed with no entries anyway.
            b.HasMany(c => c.Votes)
                .WithOne(v => v.Competition)
                .HasForeignKey(v => v.CompetitionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Entry>(b =>
        {
            b.Property(e => e.Title).HasMaxLength(Domain.Entry.TitleMax).IsRequired();
            b.Property(e => e.Description).HasMaxLength(Domain.Entry.DescriptionMax).IsRequired();

            // One entry per user per competition. Null owners (deleted accounts) are not constrained.
            b.HasIndex(e => new { e.CompetitionId, e.UserId }).IsUnique();

            b.HasOne(e => e.User)
                .WithMany(u => u.Entries)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasMany(e => e.Images)
                .WithOne(i => i.Entry)
                .HasForeignKey(i => i.EntryId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasMany(e => e.Votes)
                .WithOne(v => v.Entry)
                .HasForeignKey(v => v.EntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EntryImage>(b =>
        {
            b.Property(i => i.StorageKey).HasMaxLength(64).IsRequired();
            b.Property(i => i.ThumbnailKey).HasMaxLength(64).IsRequired();
            b.Property(i => i.ContentType).HasMaxLength(64).IsRequired();
            b.Property(i => i.AltText).HasMaxLength(EntryImage.AltTextMax).IsRequired();
            b.HasIndex(i => new { i.EntryId, i.Position }).IsUnique();
        });

        modelBuilder.Entity<Vote>(b =>
        {
            // One vote per user per competition.
            b.HasIndex(v => new { v.CompetitionId, v.UserId }).IsUnique();

            b.HasOne(v => v.User)
                .WithMany(u => u.Votes)
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuditLog>(b =>
        {
            b.Property(a => a.Action).HasMaxLength(64).IsRequired();
            b.Property(a => a.EntityType).HasMaxLength(64).IsRequired();
            b.Property(a => a.ActorEmail).HasMaxLength(256).IsRequired();
            b.HasIndex(a => a.CompetitionId);
        });
    }
}
