using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Voticus.Api.Domain;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class ResultsTests(VoticusApiFactory factory) : ApiTestBase(factory)
{
    // AC-R1
    [Fact]
    public async Task Results_are_only_available_once_closed()
    {
        var owner = await CreateApprovedAsync();
        var open = await CreateCompetitionAsync(CompetitionStatus.Open);
        var entry = await CreateEntryAsync(open, owner);
        await CreateVoteAsync(open, entry, await CreateApprovedAsync());

        var client = Anonymous();
        var before = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{open.Id}/results");
        Assert.False(before.GetProperty("available").GetBoolean());
        Assert.Equal("Open", before.GetProperty("status").GetString());
        Assert.Empty(before.GetProperty("entries").EnumerateArray());
        Assert.Equal(0, before.GetProperty("totalVotes").GetInt32());

        Factory.Clock.Advance(TimeSpan.FromDays(10));
        var after = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{open.Id}/results");
        Assert.True(after.GetProperty("available").GetBoolean());
        Assert.Equal(1, after.GetProperty("totalVotes").GetInt32());
        Factory.Clock.Advance(TimeSpan.FromDays(-10));
    }

    // AC-R2
    [Fact]
    public async Task Tied_entries_are_all_winners()
    {
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var a = await CreateEntryAsync(closed, await CreateApprovedAsync(), title: "A");
        var b = await CreateEntryAsync(closed, await CreateApprovedAsync(), title: "B");
        var c = await CreateEntryAsync(closed, await CreateApprovedAsync(), title: "C");
        await CreateVoteAsync(closed, a, await CreateApprovedAsync());
        await CreateVoteAsync(closed, a, await CreateApprovedAsync());
        await CreateVoteAsync(closed, b, await CreateApprovedAsync());
        await CreateVoteAsync(closed, b, await CreateApprovedAsync());
        await CreateVoteAsync(closed, c, await CreateApprovedAsync());

        var results = await Anonymous().GetFromJsonAsync<JsonElement>($"/api/competitions/{closed.Id}/results");

        var winners = results.GetProperty("winners").EnumerateArray().Select(w => w.GetProperty("title").GetString()).ToList();
        Assert.Equal(["A", "B"], winners);
        var entries = results.GetProperty("entries").EnumerateArray().ToList();
        Assert.True(entries[0].GetProperty("isWinner").GetBoolean());
        Assert.True(entries[1].GetProperty("isWinner").GetBoolean());
        Assert.False(entries[2].GetProperty("isWinner").GetBoolean());
    }

    // AC-R3: the numbers all derive from the same vote rows.
    [Fact]
    public async Task Shares_turnout_and_timeline_match_the_votes()
    {
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var a = await CreateEntryAsync(closed, await CreateApprovedAsync(), title: "A");
        var b = await CreateEntryAsync(closed, await CreateApprovedAsync(), title: "B");
        await CreateVoteAsync(closed, a, await CreateApprovedAsync(), Now.AddDays(-5));
        await CreateVoteAsync(closed, a, await CreateApprovedAsync(), Now.AddDays(-4));
        await CreateVoteAsync(closed, a, await CreateApprovedAsync(), Now.AddDays(-3));
        await CreateVoteAsync(closed, b, await CreateApprovedAsync(), Now.AddDays(-2));

        var results = await Anonymous().GetFromJsonAsync<JsonElement>($"/api/competitions/{closed.Id}/results");

        Assert.Equal(4, results.GetProperty("totalVotes").GetInt32());
        var entries = results.GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(3, entries[0].GetProperty("votes").GetInt32());
        Assert.Equal(75.0, entries[0].GetProperty("sharePercent").GetDouble());
        Assert.Equal(25.0, entries[1].GetProperty("sharePercent").GetDouble());
        Assert.Equal(100.0, entries.Sum(e => e.GetProperty("sharePercent").GetDouble()));

        var approved = results.GetProperty("approvedMembers").GetInt32();
        Assert.True(approved >= 6, "all approved users created in this test count towards turnout");
        Assert.Equal(Math.Round(100.0 * 4 / approved, 1), results.GetProperty("turnoutPercent").GetDouble());

        var timeline = results.GetProperty("timeline").EnumerateArray().Select(p => p.GetProperty("cumulativeVotes").GetInt32()).ToList();
        Assert.Equal([1, 2, 3, 4], timeline);
    }

    [Fact]
    public async Task No_votes_means_no_winner()
    {
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        await CreateEntryAsync(closed, await CreateApprovedAsync());

        var results = await Anonymous().GetFromJsonAsync<JsonElement>($"/api/competitions/{closed.Id}/results");

        Assert.Empty(results.GetProperty("winners").EnumerateArray());
        Assert.Equal(0.0, results.GetProperty("entries").EnumerateArray().Single().GetProperty("sharePercent").GetDouble());
    }

    [Fact]
    public async Task Results_for_a_draft_are_not_public()
    {
        var draft = await CreateCompetitionAsync(CompetitionStatus.Draft);
        Assert.Equal(HttpStatusCode.NotFound, (await Anonymous().GetAsync($"/api/competitions/{draft.Id}/results")).StatusCode);
    }
}
