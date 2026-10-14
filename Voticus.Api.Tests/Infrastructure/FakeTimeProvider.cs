namespace Voticus.Api.Tests.Infrastructure;

// Fixed clock the tests can move. Registered in place of TimeProvider.System.
public class FakeTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset start)
    {
        _now = start;
    }

    public override DateTimeOffset GetUtcNow() => _now;

    public void SetUtcNow(DateTimeOffset value) => _now = value;

    public void Advance(TimeSpan by) => _now = _now.Add(by);
}
