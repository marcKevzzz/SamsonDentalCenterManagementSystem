using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using SamsonDentalCenterManagementSystem.Services;

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
        private readonly IServiceProvider _serviceProvider;

        public RoleClaimsTransformer(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
        {
            // Already transformed during this request? Skip.
            if (principal.HasClaim(c => c.Type == "app_role"))
                return principal;

            var userId =
                principal.FindFirst("sub")?.Value
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return principal;

            try
            {
                // 1. Try to read from existing claims (e.g. role_app or role)
                // This allows Supabase custom claims or hooks to bypass DB lookup
                var role = principal.FindFirst("role_app")?.Value 
                        ?? principal.FindFirst("app_role")?.Value
                        ?? principal.FindFirst("role")?.Value;

                // If role is "authenticated" (default Supabase role) or empty, we MUST use DB lookup
                if (string.IsNullOrEmpty(role) || role == "authenticated")
                {
                    using var scope = _serviceProvider.CreateScope();
                    var profileService = scope.ServiceProvider.GetRequiredService<ProfileService>();
                    
                    var email = principal.FindFirst("email")?.Value ?? principal.FindFirst(ClaimTypes.Email)?.Value;
                    var profile = await profileService.GetProfileById(userId, email);
                    role = profile?.Role ?? "patient"; // default to patient
                }

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
