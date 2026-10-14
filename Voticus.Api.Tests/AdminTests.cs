using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Voticus.Api.Domain;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class AdminTests(VoticusApiFactory factory) : ApiTestBase(factory)
{
    private object Upsert(string title = "New competition", double startDays = 1, double endDays = 8) => new
    {
        title,
        description = "Desc",
        startsAtUtc = Now.AddDays(startDays),
        endsAtUtc = Now.AddDays(endDays),
    };

    [Fact]
    public async Task Non_admins_get_403_from_admin_endpoints()
    {
        var approved = await ClientFor(await CreateApprovedAsync());
        Assert.Equal(HttpStatusCode.Forbidden, (await approved.GetAsync("/api/admin/competitions")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await approved.GetAsync("/api/admin/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Anonymous().GetAsync("/api/admin/competitions")).StatusCode);
    }

    // AC-D1
    [Fact]
    public async Task Admin_can_create_edit_publish_close_archive_and_delete_competitions()
    {
        var client = await ClientFor(await CreateAdminAsync());

        var create = await client.PostAsJsonAsync("/api/admin/competitions", Upsert("Draft one"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();
        Assert.Equal("Draft", created.GetProperty("status").GetString());
        Assert.True(created.GetProperty("canDelete").GetBoolean());

        var edit = await client.PutAsJsonAsync($"/api/admin/competitions/{id}", Upsert("Renamed", 2, 9));
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal("Renamed", (await edit.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());

        var publish = await client.PostAsync($"/api/admin/competitions/{id}/publish", null);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        Assert.Equal("Upcoming", (await publish.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());

        // Published competitions cannot be hard deleted.
        Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/admin/competitions/{id}")).StatusCode);

        // Move the clock into the window, then force close.
        Factory.Clock.Advance(TimeSpan.FromDays(3));
        var close = await client.PostAsync($"/api/admin/competitions/{id}/close", null);
        Assert.Equal(HttpStatusCode.OK, close.StatusCode);
        Assert.Equal("Closed", (await close.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());

        var archive = await client.PostAsync($"/api/admin/competitions/{id}/archive", null);
        Assert.Equal(HttpStatusCode.OK, archive.StatusCode);
        Assert.NotEqual(JsonValueKind.Null, (await archive.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("archivedAtUtc").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await Anonymous().GetAsync($"/api/competitions/{id}")).StatusCode);

        // A fresh draft with no entries can be deleted.
        var draft = await (await client.PostAsJsonAsync("/api/admin/competitions", Upsert("Throwaway"))).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/admin/competitions/{draft.GetProperty("id").GetInt32()}")).StatusCode);

        Factory.Clock.Advance(TimeSpan.FromDays(-3));
    }

    [Fact]
    public async Task Draft_with_entries_cannot_be_deleted()
    {
        var admin = await CreateAdminAsync();
        var client = await ClientFor(admin);
        var competition = await CreateCompetitionAsync(CompetitionStatus.Open);
        await CreateEntryAsync(competition, await CreateApprovedAsync());

        // Not a draft and has entries, both reasons block deletion.
        Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/admin/competitions/{competition.Id}")).StatusCode);
    }

    // AC-D2
    [Fact]
    public async Task Admin_can_list_create_on_behalf_edit_and_delete_entries()
    {
        var admin = await CreateAdminAsync();
        var client = await ClientFor(admin);
        var member = await CreateApprovedAsync();
        var competition = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var existing = await CreateEntryAsync(competition, await CreateApprovedAsync(), title: "Existing");

        using var form = new MultipartFormDataContent
        {
            { new StringContent(member.Id), "userId" },
            { new StringContent("On behalf"), "title" },
            { new StringContent("Added by admin"), "description" },
        };
        var file = new ByteArrayContent(TestImages.Jpeg(40, 30));
        file.Headers.ContentType = new("image/jpeg");
        form.Add(file, "images", "a.jpg");
        var create = await client.PostAsync($"/api/admin/competitions/{competition.Id}/entries", form);
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var createdId = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();

        var list = await client.GetFromJsonAsync<JsonElement>($"/api/admin/competitions/{competition.Id}/entries");
        var rows = list.EnumerateArray().ToList();
        Assert.Equal(2, rows.Count);
        Assert.Equal(member.Email, rows.Single(r => r.GetProperty("id").GetInt32() == createdId).GetProperty("ownerEmail").GetString());

        // Admins edit and delete any entry, even on a closed competition.
        var edit = await client.PutAsJsonAsync($"/api/competitions/{competition.Id}/entries/{existing.Id}", new { title = "Edited by admin", description = "x" });
        Assert.Equal(HttpStatusCode.OK, edit.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/competitions/{competition.Id}/entries/{existing.Id}")).StatusCode);

        var audit = await client.GetFromJsonAsync<JsonElement>($"/api/admin/competitions/{competition.Id}/audit");
        var actions = audit.EnumerateArray().Select(a => a.GetProperty("action").GetString()).ToList();
        Assert.Contains("EntryCreated", actions);
        Assert.Contains("EntryUpdated", actions);
        Assert.Contains("EntryDeleted", actions);
    }

    // AC-D3 and AC-D6
    [Fact]
    public async Task Admin_can_manage_votes_with_rules_applied_and_changes_logged()
    {
        var admin = await CreateAdminAsync();
        var client = await ClientFor(admin);
        var competition = await CreateCompetitionAsync(CompetitionStatus.Closed);
        var ownerA = await CreateApprovedAsync();
        var ownerB = await CreateApprovedAsync();
        var a = await CreateEntryAsync(competition, ownerA, title: "A");
        var b = await CreateEntryAsync(competition, ownerB, title: "B");
        var voter = await CreateApprovedAsync();
        var url = $"/api/admin/competitions/{competition.Id}/votes";

        // Self vote still blocked for admins.
        var selfVote = await client.PostAsJsonAsync(url, new { userId = ownerA.Id, entryId = a.Id });
        Assert.Equal(HttpStatusCode.BadRequest, selfVote.StatusCode);

        var create = await client.PostAsJsonAsync(url, new { userId = voter.Id, entryId = a.Id });
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);
        var voteId = (await create.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().Single().GetProperty("id").GetInt32();

        // One vote per user still applies.
        var second = await client.PostAsJsonAsync(url, new { userId = voter.Id, entryId = b.Id });
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);

        var change = await client.PutAsJsonAsync($"{url}/{voteId}", new { entryId = b.Id });
        Assert.Equal(HttpStatusCode.OK, change.StatusCode);
        var changed = (await change.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().Single();
        Assert.Equal(b.Id, changed.GetProperty("entryId").GetInt32());
        Assert.Equal(voter.Email, changed.GetProperty("voterEmail").GetString());

        // Changing to the voter's own entry is blocked too.
        var ownEntry = await CreateEntryAsync(competition, voter, title: "Voter's own");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"{url}/{voteId}", new { entryId = ownEntry.Id })).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{url}/{voteId}")).StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<JsonElement>(url)).EnumerateArray());

        // AC-D6: the change is logged with old and new entry ids.
        var audit = await client.GetFromJsonAsync<JsonElement>($"/api/admin/competitions/{competition.Id}/audit");
        var changeLog = audit.EnumerateArray().Single(e => e.GetProperty("action").GetString() == "VoteChanged");
        Assert.Contains($"\"entryId\":{a.Id}", changeLog.GetProperty("oldValue").GetString());
        Assert.Contains($"\"entryId\":{b.Id}", changeLog.GetProperty("newValue").GetString());
        Assert.Equal(admin.Email, changeLog.GetProperty("actorEmail").GetString());
        Assert.Contains(audit.EnumerateArray(), e => e.GetProperty("action").GetString() == "VoteCreated");
        Assert.Contains(audit.EnumerateArray(), e => e.GetProperty("action").GetString() == "VoteDeleted");
    }

    // AC-D4
    [Fact]
    public async Task Admin_can_approve_revoke_and_change_admin_role()
    {
        var admin = await CreateAdminAsync();
        var client = await ClientFor(admin);
        var member = await CreateMemberAsync();
        var memberClient = await ClientFor(member);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/admin/users/{member.Id}/approve", null)).StatusCode);
        var me = await memberClient.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Contains("Approved", me.GetProperty("roles").EnumerateArray().Select(r => r.GetString()));

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/admin/users/{member.Id}/grant-admin", null)).StatusCode);
        var users = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        var row = users.EnumerateArray().Single(u => u.GetProperty("id").GetString() == member.Id);
        Assert.True(row.GetProperty("isAdmin").GetBoolean());
        Assert.True(row.GetProperty("isApproved").GetBoolean());

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/admin/users/{member.Id}/revoke-admin", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"/api/admin/users/{member.Id}/revoke-approval", null)).StatusCode);
        me = await memberClient.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Empty(me.GetProperty("roles").EnumerateArray());
    }

    // AC-D5
    [Fact]
    public async Task Admin_cannot_remove_their_own_admin_role()
    {
        var admin = await CreateAdminAsync();
        var client = await ClientFor(admin);

        var response = await client.PostAsync($"/api/admin/users/{admin.Id}/revoke-admin", null);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Contains("Admin", me.GetProperty("roles").EnumerateArray().Select(r => r.GetString()));
    }
}
