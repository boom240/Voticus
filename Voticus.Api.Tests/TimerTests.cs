using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Voticus.Api.Domain;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class TimerTests(VoticusApiFactory factory) : ApiTestBase(factory)
{
    private object Upsert(DateTime starts, DateTime ends) => new { title = "Timed", description = "d", startsAtUtc = starts, endsAtUtc = ends };

    private static async Task<string> Detail(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("detail").GetString() ?? "";

    // AC-T1
    [Fact]
    public async Task End_at_or_before_start_is_rejected_on_create_and_edit()
    {
        var client = await ClientFor(await CreateAdminAsync());
        var start = Now.AddDays(1);

        var equal = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start));
        Assert.Equal(HttpStatusCode.BadRequest, equal.StatusCode);
        Assert.Contains("after the start", await Detail(equal));

        var before = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start.AddHours(-1)));
        Assert.Equal(HttpStatusCode.BadRequest, before.StatusCode);

        var draft = await CreateCompetitionAsync(CompetitionStatus.Draft);
        var edit = await client.PutAsJsonAsync($"/api/admin/competitions/{draft.Id}", Upsert(start, start.AddMinutes(-5)));
        Assert.Equal(HttpStatusCode.BadRequest, edit.StatusCode);
    }

    // AC-T2
    [Fact]
    public async Task Duration_under_one_hour_or_over_ninety_days_is_rejected()
    {
        var client = await ClientFor(await CreateAdminAsync());
        var start = Now.AddDays(1);

        var tooShort = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start.AddMinutes(59)));
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
        Assert.Contains("at least 1 hour", await Detail(tooShort));

        var tooLong = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start.AddDays(90).AddMinutes(1)));
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.Contains("at most 90 days", await Detail(tooLong));

        var exactlyOneHour = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start.AddHours(1)));
        Assert.Equal(HttpStatusCode.Created, exactlyOneHour.StatusCode);
        var ninetyDays = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(start, start.AddDays(90)));
        Assert.Equal(HttpStatusCode.Created, ninetyDays.StatusCode);
    }

    // AC-T3
    [Fact]
    public async Task Start_in_the_past_is_rejected_at_creation()
    {
        var client = await ClientFor(await CreateAdminAsync());

        var response = await client.PostAsJsonAsync("/api/admin/competitions", Upsert(Now.AddMinutes(-1), Now.AddDays(1)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("cannot be in the past", await Detail(response));
    }

    // Section 6: once started only the end can move, and only later.
    [Fact]
    public async Task Started_competition_only_allows_extending_the_end()
    {
        var client = await ClientFor(await CreateAdminAsync());
        var open = await CreateCompetitionAsync(CompetitionStatus.Open);

        var moveStart = await client.PutAsJsonAsync($"/api/admin/competitions/{open.Id}", Upsert(open.StartsAtUtc.AddHours(1), open.EndsAtUtc));
        Assert.Equal(HttpStatusCode.BadRequest, moveStart.StatusCode);

        var shorten = await client.PutAsJsonAsync($"/api/admin/competitions/{open.Id}", Upsert(open.StartsAtUtc, open.EndsAtUtc.AddHours(-1)));
        Assert.Equal(HttpStatusCode.BadRequest, shorten.StatusCode);

        var extend = await client.PutAsJsonAsync($"/api/admin/competitions/{open.Id}", Upsert(open.StartsAtUtc, open.EndsAtUtc.AddDays(1)));
        Assert.Equal(HttpStatusCode.OK, extend.StatusCode);
    }

    // AC-T4
    [Fact]
    public async Task Entries_and_votes_are_rejected_outside_the_open_window()
    {
        var owner = await CreateApprovedAsync();
        var member = await CreateApprovedAsync();
        var client = await ClientFor(member);

        var upcoming = await CreateCompetitionAsync(CompetitionStatus.Upcoming);
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var closedEntry = await CreateEntryAsync(closed, owner);

        using var form = new MultipartFormDataContent
        {
            { new StringContent("Early"), "title" },
            { new StringContent("d"), "description" },
        };
        var file = new ByteArrayContent(TestImages.Jpeg(20, 20));
        file.Headers.ContentType = new("image/jpeg");
        form.Add(file, "images", "a.jpg");
        var earlyEntry = await client.PostAsync($"/api/competitions/{upcoming.Id}/entries", form);
        Assert.Equal(HttpStatusCode.Conflict, earlyEntry.StatusCode);

        var lateVote = await client.PostAsJsonAsync($"/api/competitions/{closed.Id}/votes", new { entryId = closedEntry.Id });
        Assert.Equal(HttpStatusCode.Conflict, lateVote.StatusCode);

        // The server clock decides. Move time forward and the upcoming one opens.
        Factory.Clock.Advance(TimeSpan.FromDays(2));
        using var form2 = new MultipartFormDataContent
        {
            { new StringContent("On time"), "title" },
            { new StringContent("d"), "description" },
        };
        var file2 = new ByteArrayContent(TestImages.Jpeg(20, 20));
        file2.Headers.ContentType = new("image/jpeg");
        form2.Add(file2, "images", "a.jpg");
        var onTime = await client.PostAsync($"/api/competitions/{upcoming.Id}/entries", form2);
        Assert.Equal(HttpStatusCode.Created, onTime.StatusCode);
        Factory.Clock.Advance(TimeSpan.FromDays(-2));
    }

    // Status derives from the clock, including the exact boundaries.
    [Fact]
    public void Status_is_derived_from_the_clock()
    {
        var competition = new Competition
        {
            StartsAtUtc = new DateTime(2026, 10, 20, 12, 0, 0, DateTimeKind.Utc),
            EndsAtUtc = new DateTime(2026, 10, 27, 12, 0, 0, DateTimeKind.Utc),
        };
        Assert.Equal(CompetitionStatus.Draft, competition.GetStatus(competition.StartsAtUtc));

        competition.PublishedAtUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
        Assert.Equal(CompetitionStatus.Upcoming, competition.GetStatus(competition.StartsAtUtc.AddSeconds(-1)));
        Assert.Equal(CompetitionStatus.Open, competition.GetStatus(competition.StartsAtUtc));
        Assert.Equal(CompetitionStatus.Open, competition.GetStatus(competition.EndsAtUtc.AddSeconds(-1)));
        Assert.Equal(CompetitionStatus.Closed, competition.GetStatus(competition.EndsAtUtc));
    }
}
