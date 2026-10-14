using Microsoft.AspNetCore.Identity;

namespace Voticus.Api.Domain;

public class User : IdentityUser
{
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Entry> Entries { get; set; } = new List<Entry>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
}
