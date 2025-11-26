using Microsoft.AspNetCore.Identity;

namespace Voticus.Api.Domain

{
    public class User : IdentityUser
    {
         public string DisplayName { get; set; } = default!;
    }
}
