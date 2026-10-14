using System.Net;
using Voticus.Api.Tests.Infrastructure;

namespace Voticus.Api.Tests;

public class HealthTests : IClassFixture<VoticusApiFactory>
{
    private readonly VoticusApiFactory _factory;

    public HealthTests(VoticusApiFactory factory)
    {
        _factory = factory;
        _factory.MigrateDatabase();
    }

    [Fact]
    public async Task Health_returns_200_when_database_is_reachable()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
