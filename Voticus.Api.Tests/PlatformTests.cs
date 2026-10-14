using System.Net;
using System.Net.Http.Json;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

// Rate limits are set to 5 per minute in VoticusApiFactory. Each test gets its own factory,
// so the limiter state does not leak between tests.
public class PlatformTests : ApiTestBase, IDisposable
{
    public PlatformTests() : base(new VoticusApiFactory())
    {
    }

    public void Dispose() => Factory.Dispose();

    // AC-P4: login
    [Fact]
    public async Task Login_is_rate_limited()
    {
        var client = Anonymous();
        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 7; i++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new { email = "nobody@test.local", password = "wrong" });
            statuses.Add(response.StatusCode);
        }

        Assert.Equal(5, statuses.Count(s => s == HttpStatusCode.Unauthorized));
        Assert.Equal(2, statuses.Count(s => s == HttpStatusCode.TooManyRequests));
    }

    // AC-P4: register
    [Fact]
    public async Task Register_is_rate_limited()
    {
        var client = Anonymous();
        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 7; i++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/register", new { email = $"burst{i}@test.local", password = "Passw0rd!" });
            statuses.Add(response.StatusCode);
        }

        Assert.Equal(5, statuses.Count(s => s == HttpStatusCode.NoContent));
        Assert.Equal(2, statuses.Count(s => s == HttpStatusCode.TooManyRequests));
    }

    // AC-P4: vote, per user
    [Fact]
    public async Task Vote_endpoint_is_rate_limited_per_user()
    {
        var competition = await CreateCompetitionAsync();
        var entry = await CreateEntryAsync(competition, await CreateApprovedAsync());
        var client = await ClientFor(await CreateApprovedAsync());

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 7; i++)
        {
            var response = await client.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = entry.Id });
            statuses.Add(response.StatusCode);
        }

        // First succeeds, next four hit the one vote rule, the rest are throttled.
        Assert.Equal(HttpStatusCode.NoContent, statuses[0]);
        Assert.Equal(4, statuses.Count(s => s == HttpStatusCode.Conflict));
        Assert.Equal(2, statuses.Count(s => s == HttpStatusCode.TooManyRequests));

        // Another user has their own allowance.
        var other = await ClientFor(await CreateApprovedAsync());
        var otherVote = await other.PostAsJsonAsync($"/api/competitions/{competition.Id}/votes", new { entryId = entry.Id });
        Assert.Equal(HttpStatusCode.NoContent, otherVote.StatusCode);
    }

    [Fact]
    public async Task Rate_limit_response_is_problem_details()
    {
        var client = Anonymous();
        HttpResponseMessage? last = null;
        for (var i = 0; i < 7; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login", new { email = "x@test.local", password = "wrong" });
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, last!.StatusCode);
        Assert.Equal("application/problem+json", last.Content.Headers.ContentType?.MediaType);
    }
}
