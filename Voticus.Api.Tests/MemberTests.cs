using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Voticus.Api.Domain;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class MemberTests(VoticusApiFactory factory) : ApiTestBase(factory)
{
    private static MultipartFormDataContent EntryForm(string title, string description, params byte[][] images)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(title), "title" },
            { new StringContent(description), "description" },
        };
        foreach (var (bytes, i) in images.Select((b, i) => (b, i)))
        {
            var file = new ByteArrayContent(bytes);
            file.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
            form.Add(file, "images", $"image{i}.jpg");
            form.Add(new StringContent($"Alt {i}"), "altTexts");
        }
        return form;
    }

    private static async Task<string> Detail(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.TryGetProperty("detail", out var d) ? d.GetString() ?? "" : body.ToString();
    }

    // AC-M1
    [Fact]
    public async Task New_registration_is_a_member_who_cannot_enter_or_vote()
    {
        var client = Anonymous();
        var register = await client.PostAsJsonAsync("/api/auth/register", new { email = "new@test.local", password = "Passw0rd!" });
        Assert.Equal(HttpStatusCode.NoContent, register.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "new@test.local", password = "Passw0rd!" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var token = (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Empty(me.GetProperty("roles").EnumerateArray());

        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var entry = await CreateEntryAsync(competition, owner);

        var create = await client.PostAsync($"/api/competitions/{competition.Id}/entries", EntryForm("Mine", "Desc", TestImages.Jpeg(50, 50)));
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);

        var vote = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = entry.Id });
        Assert.Equal(HttpStatusCode.Forbidden, vote.StatusCode);
    }

    // AC-M2 is a client test (RegisterPage and CompetitionDetailPage show the pending message).

    // AC-M3
    [Fact]
    public async Task Approved_user_can_create_an_entry_with_title_description_and_images()
    {
        var competition = await CreateCompetitionAsync();
        var user = await CreateApprovedAsync();
        var client = await ClientFor(user);

        var response = await client.PostAsync(
            $"/api/competitions/{competition.Id}/entries",
            EntryForm("My entry", "A description", TestImages.Jpeg(640, 480), TestImages.Png(300, 300)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("My entry", body.GetProperty("title").GetString());
        Assert.True(body.GetProperty("isMine").GetBoolean());
        var images = body.GetProperty("images").EnumerateArray().ToList();
        Assert.Equal(2, images.Count);
        Assert.Equal("Alt 0", images[0].GetProperty("altText").GetString());
        Assert.Equal(640, images[0].GetProperty("width").GetInt32());
        Assert.StartsWith("data:image/jpeg;base64,", images[0].GetProperty("placeholder").GetString());

        var thumb = await Anonymous().GetAsync($"/api/images/{images[0].GetProperty("thumbnailKey").GetString()}");
        Assert.Equal(HttpStatusCode.OK, thumb.StatusCode);
    }

    [Fact]
    public async Task Entry_with_no_images_is_rejected()
    {
        var competition = await CreateCompetitionAsync();
        var client = await ClientFor(await CreateApprovedAsync());

        var response = await client.PostAsync($"/api/competitions/{competition.Id}/entries", EntryForm("My entry", "Desc"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("at least one image", await Detail(response));
    }

    // AC-M4
    [Fact]
    public async Task Second_entry_in_the_same_competition_is_rejected()
    {
        var competition = await CreateCompetitionAsync();
        var user = await CreateApprovedAsync();
        await CreateEntryAsync(competition, user);
        var client = await ClientFor(user);

        var response = await client.PostAsync($"/api/competitions/{competition.Id}/entries", EntryForm("Second", "Desc", TestImages.Jpeg(50, 50)));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("already have an entry", await Detail(response));
    }

    // AC-M5
    [Fact]
    public async Task Oversize_unsupported_and_too_many_images_are_rejected()
    {
        var competition = await CreateCompetitionAsync();
        var client = await ClientFor(await CreateApprovedAsync());
        var url = $"/api/competitions/{competition.Id}/entries";

        var tooBig = await client.PostAsync(url, EntryForm("Big", "Desc", new byte[5 * 1024 * 1024 + 1]));
        Assert.Equal(HttpStatusCode.BadRequest, tooBig.StatusCode);
        Assert.Contains("5 MB", await Detail(tooBig));

        var notAnImage = await client.PostAsync(url, EntryForm("Text", "Desc", "not an image at all"u8.ToArray()));
        Assert.Equal(HttpStatusCode.BadRequest, notAnImage.StatusCode);
        Assert.Contains("Unsupported image type", await Detail(notAnImage));

        var eleven = Enumerable.Range(0, 11).Select(_ => TestImages.Jpeg(20, 20)).ToArray();
        var tooMany = await client.PostAsync(url, EntryForm("Many", "Desc", eleven));
        Assert.Equal(HttpStatusCode.BadRequest, tooMany.StatusCode);
        Assert.Contains("at most 10 images", await Detail(tooMany));
    }

    // AC-M6
    [Fact]
    public async Task Approved_user_votes_once_and_the_vote_is_final()
    {
        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var a = await CreateEntryAsync(competition, owner, title: "A");
        var other = await CreateApprovedAsync();
        var b = await CreateEntryAsync(competition, other, title: "B");
        var voter = await CreateApprovedAsync();
        var client = await ClientFor(voter);

        var first = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = a.Id });
        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);

        var second = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = b.Id });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Contains("already voted", await Detail(second));

        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/competitions/{competition.Id}");
        Assert.Equal(a.Id, detail.GetProperty("myVoteEntryId").GetInt32());
        Assert.False(detail.GetProperty("canVote").GetBoolean());
    }

    // AC-M7
    [Fact]
    public async Task Voting_for_your_own_entry_is_rejected()
    {
        var competition = await CreateCompetitionAsync();
        var user = await CreateApprovedAsync();
        var mine = await CreateEntryAsync(competition, user);
        var client = await ClientFor(user);

        var response = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = mine.Id });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("own entry", await Detail(response));
    }

    // AC-M8 is a client test (EntryCard marks the chosen card and disables the rest).

    // AC-M9
    [Fact]
    public async Task Account_page_lists_entries_and_votes()
    {
        var user = await CreateApprovedAsync();
        var other = await CreateApprovedAsync();
        var open = await CreateCompetitionAsync(title: "Open one");
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed, title: "Closed one");
        var mineOpen = await CreateEntryAsync(open, user, title: "Mine open");
        var mineClosed = await CreateEntryAsync(closed, user, title: "Mine closed");
        var theirs = await CreateEntryAsync(open, other, title: "Theirs");
        await CreateVoteAsync(open, theirs, user);
        await CreateVoteAsync(closed, mineClosed, other);
        var client = await ClientFor(user);

        var entries = await client.GetFromJsonAsync<JsonElement>("/api/account/entries");
        var list = entries.EnumerateArray().ToList();
        Assert.Equal(2, list.Count);
        var closedRow = list.Single(e => e.GetProperty("entryId").GetInt32() == mineClosed.Id);
        Assert.Equal(1, closedRow.GetProperty("votesReceived").GetInt32());
        var openRow = list.Single(e => e.GetProperty("entryId").GetInt32() == mineOpen.Id);
        Assert.Equal(JsonValueKind.Null, openRow.GetProperty("votesReceived").ValueKind);

        var votes = await client.GetFromJsonAsync<JsonElement>("/api/account/votes");
        var vote = votes.EnumerateArray().Single();
        Assert.Equal("Open one", vote.GetProperty("competitionTitle").GetString());
        Assert.Equal("Theirs", vote.GetProperty("entryTitle").GetString());
    }

    // AC-M10
    [Fact]
    public async Task Owner_can_edit_and_delete_while_open_but_not_once_closed()
    {
        var user = await CreateApprovedAsync();
        var open = await CreateCompetitionAsync(CompetitionStatus.Open);
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var openEntry = await CreateEntryAsync(open, user);
        var closedEntry = await CreateEntryAsync(closed, user);
        var client = await ClientFor(user);

        var edit = await client.PutAsJsonAsync($"/api/competitions/{open.Id}/entries/{openEntry.Id}", new { title = "Renamed", description = "New text" });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal("Renamed", (await edit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());

        var editClosed = await client.PutAsJsonAsync($"/api/competitions/{closed.Id}/entries/{closedEntry.Id}", new { title = "Renamed", description = "New text" });
        Assert.Equal(HttpStatusCode.Conflict, editClosed.StatusCode);

        var deleteClosed = await client.DeleteAsync($"/api/competitions/{closed.Id}/entries/{closedEntry.Id}");
        Assert.Equal(HttpStatusCode.Conflict, deleteClosed.StatusCode);

        var deleteOpen = await client.DeleteAsync($"/api/competitions/{open.Id}/entries/{openEntry.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteOpen.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Anonymous().GetAsync($"/api/competitions/{open.Id}/entries/{openEntry.Id}")).StatusCode);
    }

    [Fact]
    public async Task Someone_else_cannot_edit_your_entry()
    {
        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var entry = await CreateEntryAsync(competition, owner);
        var client = await ClientFor(await CreateApprovedAsync());

        var edit = await client.PutAsJsonAsync($"/api/competitions/{competition.Id}/entries/{entry.Id}", new { title = "Hijack", description = "x" });

        Assert.Equal(HttpStatusCode.Forbidden, edit.StatusCode);
    }

    // Deleting an entry frees its voters to vote again while open.
    [Fact]
    public async Task Deleting_an_entry_removes_its_votes_so_voters_can_vote_again()
    {
        var competition = await CreateCompetitionAsync();
        var owner = await CreateApprovedAsync();
        var a = await CreateEntryAsync(competition, owner, title: "A");
        var other = await CreateApprovedAsync();
        var b = await CreateEntryAsync(competition, other, title: "B");
        var voter = await CreateApprovedAsync();
        await CreateVoteAsync(competition, a, voter);

        var ownerClient = await ClientFor(owner);
        Assert.Equal(HttpStatusCode.NoContent, (await ownerClient.DeleteAsync($"/api/competitions/{competition.Id}/entries/{a.Id}")).StatusCode);

        var voterClient = await ClientFor(voter);
        var revote = await voterClient.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = b.Id });
        Assert.Equal(HttpStatusCode.NoContent, revote.StatusCode);
    }

    // AC-P5
    [Fact]
    public async Task Uploaded_images_are_re_encoded_without_exif()
    {
        var competition = await CreateCompetitionAsync();
        var client = await ClientFor(await CreateApprovedAsync());
        var withExif = TestImages.JpegWithExif(120, 80);
        Assert.True(TestImages.HasExifSegment(withExif), "test image should carry EXIF before upload");

        var response = await client.PostAsync($"/api/competitions/{competition.Id}/entries", EntryForm("Exif", "Desc", withExif));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var key = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("images")[0].GetProperty("key").GetString();

        var stored = await Anonymous().GetByteArrayAsync($"/api/images/{key}");
        Assert.False(TestImages.HasExifSegment(stored), "stored image must not carry EXIF");
        Assert.NotEqual(withExif, stored);
    }

    // Account deletion per section 13.7
    [Fact]
    public async Task Deleting_an_account_removes_votes_and_open_entries_but_keeps_closed_entries()
    {
        var user = await CreateUserAsync("leaving@test.local", Roles.Approved);
        var other = await CreateApprovedAsync();
        var open = await CreateCompetitionAsync(CompetitionStatus.Open);
        var closed = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var openEntry = await CreateEntryAsync(open, user);
        var closedEntry = await CreateEntryAsync(closed, user);
        var theirs = await CreateEntryAsync(open, other);
        await CreateVoteAsync(open, theirs, user);
        var client = await ClientFor(user);

        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/account") { Content = JsonContent.Create(new { password = "Passw0rd!" }) };
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var anon = Anonymous();
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/competitions/{open.Id}/entries/{openEntry.Id}")).StatusCode);
        var kept = await anon.GetFromJsonAsync<JsonElement>($"/api/competitions/{closed.Id}/entries/{closedEntry.Id}");
        Assert.Equal("Deleted user", kept.GetProperty("ownerLabel").GetString());
        Assert.Equal(0, await WithDb(db => Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(db.Votes, v => v.UserId == user.Id)));

        // The old token no longer works.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }
}
