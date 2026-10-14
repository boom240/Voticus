using System.Net.Http.Headers;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using Voticus.Api.Data;
using Voticus.Api.Domain;
using Voticus.Api.Services;
using Voticus.Api.Services.Images;

namespace Voticus.Api.Tests.Infrastructure;

// Shared helpers for building data and authenticated clients. Each test class gets its own database.
public abstract class ApiTestBase : IClassFixture<VoticusApiFactory>
{
    protected readonly VoticusApiFactory Factory;
    private static int _userCounter;

    protected ApiTestBase(VoticusApiFactory factory)
    {
        Factory = factory;
        Factory.MigrateDatabase();
    }

    protected DateTime Now => Factory.Clock.GetUtcNow().UtcDateTime;

    protected HttpClient Anonymous() => Factory.CreateClient();

    protected async Task<HttpClient> ClientFor(User user)
    {
        using var scope = Factory.Services.CreateScope();
        var token = scope.ServiceProvider.GetRequiredService<TokenService>().CreateToken(user);
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    protected static string NextEmail() => $"user{Interlocked.Increment(ref _userCounter)}@test.local";

    protected async Task<User> CreateUserAsync(string email, params string[] roles)
    {
        using var scope = Factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var user = new User { UserName = email, Email = email, EmailConfirmed = true, CreatedAtUtc = Now };
        var result = await users.CreateAsync(user, "Passw0rd!");
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        }
        if (roles.Length > 0)
        {
            await users.AddToRolesAsync(user, roles);
        }
        return user;
    }

    protected Task<User> CreateMemberAsync() => CreateUserAsync(NextEmail());
    protected Task<User> CreateApprovedAsync() => CreateUserAsync(NextEmail(), Roles.Approved);
    protected Task<User> CreateAdminAsync() => CreateUserAsync(NextEmail(), Roles.Admin, Roles.Approved);

    protected async Task<Competition> CreateCompetitionAsync(
        CompetitionStatus status = CompetitionStatus.Open,
        string title = "Test competition",
        bool archived = false)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var competition = new Competition
        {
            Title = title,
            Description = "Description",
            CreatedAtUtc = Now.AddDays(-10),
            UpdatedAtUtc = Now.AddDays(-10),
            CreatedByUserId = "seed",
            ArchivedAtUtc = archived ? Now.AddDays(-1) : null,
        };
        switch (status)
        {
            case CompetitionStatus.Draft:
                competition.StartsAtUtc = Now.AddDays(1);
                competition.EndsAtUtc = Now.AddDays(8);
                break;
            case CompetitionStatus.Upcoming:
                competition.StartsAtUtc = Now.AddDays(1);
                competition.EndsAtUtc = Now.AddDays(8);
                competition.PublishedAtUtc = Now.AddDays(-1);
                break;
            case CompetitionStatus.Open:
                competition.StartsAtUtc = Now.AddDays(-1);
                competition.EndsAtUtc = Now.AddDays(6);
                competition.PublishedAtUtc = Now.AddDays(-2);
                break;
            case CompetitionStatus.Closed:
                competition.StartsAtUtc = Now.AddDays(-10);
                competition.EndsAtUtc = Now.AddDays(-1);
                competition.PublishedAtUtc = Now.AddDays(-11);
                break;
        }
        db.Competitions.Add(competition);
        await db.SaveChangesAsync();
        return competition;
    }

    protected async Task<Entry> CreateEntryAsync(Competition competition, User owner, int imageCount = 1, string title = "An entry")
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var processor = scope.ServiceProvider.GetRequiredService<IImageProcessor>();
        var storage = scope.ServiceProvider.GetRequiredService<IFileStorage>();

        var entry = new Entry
        {
            CompetitionId = competition.Id,
            UserId = owner.Id,
            Title = title,
            Description = "Entry description",
            CreatedAtUtc = Now.AddHours(-1),
            UpdatedAtUtc = Now.AddHours(-1),
        };
        for (var i = 0; i < imageCount; i++)
        {
            using var source = new MemoryStream(TestImages.Jpeg(64, 48));
            var processed = await processor.ProcessAsync(source);
            var (full, thumb) = StorageKeys.NewPair(processed.Extension);
            await storage.SaveAsync(full, processed.Full);
            await storage.SaveAsync(thumb, processed.Thumbnail);
            entry.Images.Add(new EntryImage
            {
                Position = i,
                StorageKey = full,
                ThumbnailKey = thumb,
                PlaceholderDataUrl = processed.PlaceholderDataUrl,
                ContentType = processed.ContentType,
                SizeBytes = processed.Full.Length,
                Width = processed.Width,
                Height = processed.Height,
                AltText = title,
            });
        }
        db.Entries.Add(entry);
        await db.SaveChangesAsync();
        return entry;
    }

    protected async Task<Vote> CreateVoteAsync(Competition competition, Entry entry, User voter, DateTime? at = null)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var vote = new Vote { CompetitionId = competition.Id, EntryId = entry.Id, UserId = voter.Id, CreatedAtUtc = at ?? Now };
        db.Votes.Add(vote);
        await db.SaveChangesAsync();
        return vote;
    }

    protected async Task<T> WithDb<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Factory.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}

public static class TestImages
{
    public static byte[] Jpeg(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(120, 80, 200));
        using var ms = new MemoryStream();
        image.Save(ms, new JpegEncoder());
        return ms.ToArray();
    }

    public static byte[] Png(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(20, 180, 90));
        using var ms = new MemoryStream();
        image.Save(ms, new PngEncoder());
        return ms.ToArray();
    }

    // A JPEG with an APP1 EXIF segment spliced in after the SOI marker.
    public static byte[] JpegWithExif(int width, int height)
    {
        var plain = Jpeg(width, height);
        var exifPayload = new byte[]
        {
            0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header, little endian
            0x01, 0x00, // one IFD entry
            0x0F, 0x01, 0x02, 0x00, 0x06, 0x00, 0x00, 0x00, 0x1A, 0x00, 0x00, 0x00, // Make, ASCII, 6 bytes at offset 26
            0x00, 0x00, 0x00, 0x00, // next IFD
            0x56, 0x6F, 0x74, 0x69, 0x63, 0x00, // "Votic\0"
        };
        var length = (ushort)(exifPayload.Length + 2);
        var segment = new byte[2 + 2 + exifPayload.Length];
        segment[0] = 0xFF;
        segment[1] = 0xE1;
        segment[2] = (byte)(length >> 8);
        segment[3] = (byte)(length & 0xFF);
        exifPayload.CopyTo(segment, 4);

        var result = new byte[plain.Length + segment.Length];
        result[0] = plain[0];
        result[1] = plain[1];
        segment.CopyTo(result, 2);
        plain.AsSpan(2).CopyTo(result.AsSpan(2 + segment.Length));
        return result;
    }

    public static bool HasExifSegment(byte[] jpeg)
    {
        for (var i = 2; i + 3 < jpeg.Length;)
        {
            if (jpeg[i] != 0xFF) return false;
            var marker = jpeg[i + 1];
            if (marker == 0xDA) return false; // start of scan, no more headers
            var length = (jpeg[i + 2] << 8) | jpeg[i + 3];
            if (marker == 0xE1 && i + 10 < jpeg.Length && jpeg[i + 4] == 0x45 && jpeg[i + 5] == 0x78) return true;
            i += 2 + length;
        }
        return false;
    }
}
