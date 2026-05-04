using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class ResetPasswordModel : PageModel
    {
        private readonly Supabase.Client _supabase;
        private readonly SamsonDentalCenterManagementSystem.Services.ProfileService _profiles;

        public ResetPasswordModel(Supabase.Client supabase, SamsonDentalCenterManagementSystem.Services.ProfileService profiles)
        {
            _supabase = supabase;
            _profiles = profiles;
        }

        [BindProperty]
        public string NewPassword { get; set; } = string.Empty;

        [BindProperty]
        public string ConfirmPassword { get; set; } = string.Empty;

        [BindProperty]
        public string AccessToken { get; set; } = string.Empty;

        [BindProperty]
        public string RefreshToken { get; set; } = string.Empty;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrWhiteSpace(NewPassword) || NewPassword.Length < 8)
            {
                TempData["Error"] = "Password must be at least 8 characters.";
                return Page();
            }

            if (NewPassword != ConfirmPassword)
            {
                TempData["Error"] = "Passwords do not match.";
                return Page();
            }

            if (string.IsNullOrWhiteSpace(AccessToken))
            {
                TempData["Error"] = "Session expired or invalid token. Please request a new link.";
                return Page();
            }

            try
            {
                // SetSession requires a non-empty refreshToken — use the one from the URL hash.
                var refreshToken = string.IsNullOrWhiteSpace(RefreshToken) ? AccessToken : RefreshToken;
                var session = await _supabase.Auth.SetSession(AccessToken, refreshToken);

                var attrs = new Supabase.Gotrue.UserAttributes { Password = NewPassword };
                await _supabase.Auth.Update(attrs);

                // Activate the user profile (handles shadow profiles or admin-created users)
                if (session?.User?.Id != null)
                {
                    await _profiles.ToggleUserActive(session.User.Id, true);
                }

                TempData["Success"] = "Password updated successfully!";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ResetPassword] Error: {ex.Message}");
                TempData["Error"] = "Failed to update password. The link may have expired — please request a new one.";
            }

            return Page();
        }
    }
}
