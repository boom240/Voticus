using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Domain;

namespace Voticus.Api.Data;

public class AppDbContext : IdentityDbContext<User>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<Entry> Entries => Set<Entry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Poll>()
            .HasMany(p => p.Entries)
            .WithOne(e => e.Poll)
            .HasForeignKey(e => e.PollId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
