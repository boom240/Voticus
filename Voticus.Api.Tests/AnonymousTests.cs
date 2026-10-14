using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Voticus.Api.Domain;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class AnonymousTests(VoticusApiFactory factory) : ApiTestBase(factory)
{
    // AC-A1
    [Fact]
    public async Task Anonymous_can_list_competitions_and_view_detail()
    {
        var competition = await CreateCompetitionAsync(title: "Visible to all");
        var client = Anonymous();

        var list = await client.GetFromJsonAsync<JsonElement>("/api/competitions");
        Assert.Contains(list.EnumerateArray(), c => c.GetProperty("id").GetInt32() == competition.Id);

        var detail = await client.GetAsync($"/api/competitions/{competition.Id}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        var body = await detail.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Visible to all", body.GetProperty("title").GetString());
        Assert.Equal("Open", body.GetProperty("status").GetString());
    }

    // AC-A1: drafts and archived competitions are not public
    [Fact]
    public async Task Anonymous_cannot_see_draft_or_archived_competitions()
    {
        var draft = await CreateCompetitionAsync(CompetitionStatus.Draft);
        var archived = await CreateCompetitionAsync(CompetitionStatus.Closed, archived: true);
        var client = Anonymous();

        var list = await client.GetFromJsonAsync<JsonElement>("/api/competitions");
        var ids = list.EnumerateArray().Select(c => c.GetProperty("id").GetInt32()).ToList();
        Assert.DoesNotContain(draft.Id, ids);
        Assert.DoesNotContain(archived.Id, ids);

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/competitions/{draft.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/competitions/{archived.Id}")).StatusCode);
    }

    // AC-A2
    [Fact]
    public async Task Anonymous_can_see_entries_and_their_images()
    {
        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var entry = await CreateEntryAsync(competition, owner, imageCount: 2);
        var client = Anonymous();

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{competition.Id}");
        var card = detail.GetProperty("entries").EnumerateArray().Single();
        Assert.Equal(entry.Id, card.GetProperty("id").GetInt32());
        Assert.Equal(2, card.GetProperty("imageCount").GetInt32());
        var coverKey = card.GetProperty("coverImage").GetProperty("thumbnailKey").GetString();

        var image = await client.GetAsync($"/api/images/{coverKey}");
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/jpeg", image.Content.Headers.ContentType?.MediaType);

        var entryDetail = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{competition.Id}/entries/{entry.Id}");
        Assert.Equal(2, entryDetail.GetProperty("images").GetArrayLength());
        Assert.Equal("Entrant 1", entryDetail.GetProperty("ownerLabel").GetString());
    }

    // AC-A3 is covered by the client test EntryCard.test.tsx. The API side reports canVote false.
    [Fact]
    public async Task Anonymous_detail_reports_cannot_vote_or_enter()
    {
        var competition = await CreateCompetitionAsync();
        var detail = await Anonymous().GetFromJsonAsync<JsonElement>($"/api/competitions/{competition.Id}");

        Assert.False(detail.GetProperty("canVote").GetBoolean());
        Assert.False(detail.GetProperty("canEnter").GetBoolean());
    }

    // AC-A4
    [Fact]
    public async Task Anonymous_gets_401_from_entry_and_vote_endpoints()
    {
        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var entry = await CreateEntryAsync(competition, owner);
        var client = Anonymous();

        using var form = new MultipartFormDataContent { { new StringContent("Title"), "title" } };
        var createEntry = await client.PostAsync($"/api/competitions/{competition.Id}/entries", form);
        Assert.Equal(HttpStatusCode.Unauthorized, createEntry.StatusCode);

        var vote = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = entry.Id });
        Assert.Equal(HttpStatusCode.Unauthorized, vote.StatusCode);
    }

    // AC-A5
    [Fact]
    public async Task Vote_counts_are_hidden_while_open_and_shown_once_closed()
    {
        var owner = await CreateApprovedAsync();
        var voter = await CreateApprovedAsync();

        var open = await CreateCompetitionAsync(CompetitionStatus.Open);
        var openEntry = await CreateEntryAsync(open, owner);
        await CreateVoteAsync(open, openEntry, voter);

        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var closedEntry = await CreateEntryAsync(closed, owner);
        await CreateVoteAsync(closed, closedEntry, voter);

        var client = Anonymous();
        var openDetail = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{open.Id}");
        var openCard = openDetail.GetProperty("entries").EnumerateArray().Single();
        Assert.Equal(JsonValueKind.Null, openCard.GetProperty("voteCount").ValueKind);

        var closedDetail = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{closed.Id}");
        var closedCard = closedDetail.GetProperty("entries").EnumerateArray().Single();
        Assert.Equal(1, closedCard.GetProperty("voteCount").GetInt32());
    }
}
