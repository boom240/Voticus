using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using Voticus.Api.Domain;
using Voticus.Api.Options;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Data;

// Development only. Creates accounts, two competitions, entries with generated images and votes.
public class DevSeeder(
    AppDbContext db,
    UserManager<User> users,
    IImageProcessor images,
    IFileStorage storage,
    IOptions<SeedOptions> options,
    TimeProvider clock,
    ILogger<DevSeeder> logger)
{
    public const string AdminEmail = "admin@voticus.local";
    public const string PendingEmail = "pending@voticus.local";
    public static readonly string[] MemberEmails = ["member1@voticus.local", "member2@voticus.local", "member3@voticus.local"];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var settings = options.Value;
        if (!settings.Enabled)
        {
            return;
        }
        if (await db.Competitions.AnyAsync(ct))
        {
            logger.LogInformation("Seed skipped: database already has competitions.");
            return;
        }
        if (string.IsNullOrWhiteSpace(settings.AdminPassword) || string.IsNullOrWhiteSpace(settings.MemberPassword))
        {
            logger.LogWarning("Seed skipped: set Seed:AdminPassword and Seed:MemberPassword in user secrets. See README.");
            return;
        }

        var now = clock.GetUtcNow().UtcDateTime;

        var admin = await CreateUser(AdminEmail, settings.AdminPassword, [Roles.Admin, Roles.Approved], now);
        var members = new List<User>();
        foreach (var email in MemberEmails)
        {
            members.Add(await CreateUser(email, settings.MemberPassword, [Roles.Approved], now));
        }
        await CreateUser(PendingEmail, settings.MemberPassword, [], now);

        var open = new Competition
        {
            Title = "Autumn light",
            Description = "Show us the best of the season. One entry each, up to ten images. Voting closes in a week.",
            StartsAtUtc = now.AddDays(-2),
            EndsAtUtc = now.AddDays(7),
            PublishedAtUtc = now.AddDays(-3),
            CreatedAtUtc = now.AddDays(-3),
            UpdatedAtUtc = now.AddDays(-3),
            CreatedByUserId = admin.Id,
        };
        var closed = new Competition
        {
            Title = "Summer skies",
            Description = "Clouds, sunsets and everything above the horizon. This one has finished, so results are up.",
            StartsAtUtc = now.AddDays(-30),
            EndsAtUtc = now.AddDays(-3),
            PublishedAtUtc = now.AddDays(-31),
            ApprovedMembersAtClose = members.Count + 1,
            CreatedAtUtc = now.AddDays(-31),
            UpdatedAtUtc = now.AddDays(-31),
            CreatedByUserId = admin.Id,
        };
        db.Competitions.AddRange(open, closed);
        await db.SaveChangesAsync(ct);

        var entrants = new List<User> { members[0], members[1], members[2], admin };
        var openTitles = new[] { "Golden hour on the canal", "Leaves on the towpath", "Mist over the allotments" };
        var closedTitles = new[] { "Storm front", "Pink evening", "Clear blue", "Contrails" };

        var openEntries = await CreateEntries(open, entrants.Take(3).ToList(), openTitles, now.AddDays(-1), ct);
        var closedEntries = await CreateEntries(closed, entrants, closedTitles, now.AddDays(-20), ct);

        // Votes on the open competition: two members have voted so far.
        db.Votes.Add(new Vote { CompetitionId = open.Id, EntryId = openEntries[1].Id, UserId = members[0].Id, CreatedAtUtc = now.AddHours(-20) });
        db.Votes.Add(new Vote { CompetitionId = open.Id, EntryId = openEntries[0].Id, UserId = members[2].Id, CreatedAtUtc = now.AddHours(-5) });

        // Votes on the closed competition, with a clear winner and a joint second.
        db.Votes.Add(new Vote { CompetitionId = closed.Id, EntryId = closedEntries[1].Id, UserId = members[0].Id, CreatedAtUtc = now.AddDays(-10) });
        db.Votes.Add(new Vote { CompetitionId = closed.Id, EntryId = closedEntries[1].Id, UserId = members[2].Id, CreatedAtUtc = now.AddDays(-8) });
        db.Votes.Add(new Vote { CompetitionId = closed.Id, EntryId = closedEntries[0].Id, UserId = members[1].Id, CreatedAtUtc = now.AddDays(-6) });
        db.Votes.Add(new Vote { CompetitionId = closed.Id, EntryId = closedEntries[2].Id, UserId = admin.Id, CreatedAtUtc = now.AddDays(-4) });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Seeded development data: {Users} users, 2 competitions, {Entries} entries.",
            MemberEmails.Length + 2, openEntries.Count + closedEntries.Count);
    }

    // Reuses an account if the email already exists, so an old database can still be seeded.
    private async Task<User> CreateUser(string email, string password, string[] roles, DateTime now)
    {
        var existing = await users.FindByEmailAsync(email);
        if (existing is not null)
        {
            foreach (var role in roles)
            {
                if (!await users.IsInRoleAsync(existing, role)) await users.AddToRoleAsync(existing, role);
            }
            return existing;
        }

        var user = new User { UserName = email, Email = email, EmailConfirmed = true, CreatedAtUtc = now };
        var result = await users.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Seed could not create {email}: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }
        if (roles.Length > 0)
        {
            await users.AddToRolesAsync(user, roles);
        }
        return user;
    }

    private async Task<List<Entry>> CreateEntries(Competition competition, List<User> owners, string[] titles, DateTime from, CancellationToken ct)
    {
        var entries = new List<Entry>();
        for (var i = 0; i < owners.Count; i++)
        {
            var entry = new Entry
            {
                CompetitionId = competition.Id,
                UserId = owners[i].Id,
                Title = titles[i],
                Description = $"{titles[i]}. Taken on a walk near home with a phone camera. A short note about the light and the moment.",
                CreatedAtUtc = from.AddHours(i * 3),
                UpdatedAtUtc = from.AddHours(i * 3),
            };
            var imageCount = 2 + (i % 3);
            for (var p = 0; p < imageCount; p++)
            {
                entry.Images.Add(await CreateImage(entry.Title, p, seed: competition.Id * 100 + i * 10 + p, ct));
            }
            db.Entries.Add(entry);
            entries.Add(entry);
        }
        await db.SaveChangesAsync(ct);
        return entries;
    }

    private async Task<EntryImage> CreateImage(string title, int position, int seed, CancellationToken ct)
    {
        using var source = GenerateImage(seed);
        var processed = await images.ProcessAsync(source, ct);
        var (fullKey, thumbKey) = StorageKeys.NewPair(processed.Extension);
        await storage.SaveAsync(fullKey, processed.Full, ct);
        await storage.SaveAsync(thumbKey, processed.Thumbnail, ct);

        return new EntryImage
        {
            Position = position,
            StorageKey = fullKey,
            ThumbnailKey = thumbKey,
            PlaceholderDataUrl = processed.PlaceholderDataUrl,
            ContentType = processed.ContentType,
            SizeBytes = processed.Full.Length,
            Width = processed.Width,
            Height = processed.Height,
            AltText = position == 0 ? title : $"{title}, image {position + 1}",
        };
    }

    // A soft two-tone gradient with a lighter band, different per seed. Keeps binary assets out of the repo.
    private static MemoryStream GenerateImage(int seed)
    {
        var rng = new Random(seed);
        var width = 1200;
        var height = rng.Next(3) == 0 ? 1200 : 900;
        var a = new Rgba32((byte)rng.Next(40, 200), (byte)rng.Next(40, 200), (byte)rng.Next(40, 200));
        var b = new Rgba32((byte)rng.Next(60, 240), (byte)rng.Next(60, 240), (byte)rng.Next(60, 240));
        var bandY = rng.Next(height / 4, height * 3 / 4);

        using var image = new Image<Rgba32>(width, height);
        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < accessor.Height; y++)
            {
                var row = accessor.GetRowSpan(y);
                var t = (float)y / accessor.Height;
                var lift = Math.Abs(y - bandY) < 40 ? 35 : 0;
                for (var x = 0; x < row.Length; x++)
                {
                    var tx = (float)x / row.Length;
                    var mix = (t * 0.7f) + (tx * 0.3f);
                    row[x] = new Rgba32(
                        (byte)Math.Min(255, a.R + (b.R - a.R) * mix + lift),
                        (byte)Math.Min(255, a.G + (b.G - a.G) * mix + lift),
                        (byte)Math.Min(255, a.B + (b.B - a.B) * mix + lift));
                }
            }
        });

        var stream = new MemoryStream();
        image.Save(stream, new JpegEncoder { Quality = 90 });
        stream.Position = 0;
        return stream;
    }
}
