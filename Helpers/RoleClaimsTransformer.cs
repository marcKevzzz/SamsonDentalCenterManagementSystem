using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace SamsonDentalCenterManagementSystem.Helpers
{
    /// <summary>
    /// Reads the app-level role from the `profiles` table and injects it as a
    /// claim so ASP.NET Core authorization policies can match on it.
    /// Supabase JWTs only carry role = "authenticated"; the real app role
    /// (admin / doctor / receptionist / patient) lives in the database.
    /// </summary>
    public class RoleClaimsTransformer : IClaimsTransformation
    {
        private readonly ProfileService _profileService;

        public RoleClaimsTransformer(ProfileService profileService)
        {
            _profileService = profileService;
        }

        public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
        {
            // Already transformed during this request? Skip.
            if (principal.HasClaim(c => c.Type == "app_role"))
                return principal;

            var userId = principal.FindFirst("sub")?.Value
                      ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return principal;

            try
            {
                var profile = await _profileService.GetProfileById(userId);
                var role = profile?.Role ?? "patient"; // default to patient

                var identity = principal.Identity as ClaimsIdentity;
                if (identity != null)
                {
                    // Add the app role claim used by authorization policies
                    identity.AddClaim(new Claim("app_role", role));

                    // Add a "role" claim to match RoleClaimType in Program.cs
                    identity.AddClaim(new Claim("role", role));

                    // Also add as a standard Role claim so [Authorize(Roles = "...")]
                    // and RequireRole() policies work out-of-the-box
                    identity.AddClaim(new Claim(ClaimTypes.Role, role));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RoleClaimsTransformer] Error: {ex.Message}");
            }

            return principal;
        }
    }
}
