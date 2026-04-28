using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class ResetPasswordModel : PageModel
    {
        private readonly Supabase.Client _supabase;

        public ResetPasswordModel(Supabase.Client supabase)
        {
            _supabase = supabase;
        }

        [BindProperty]
        public string NewPassword { get; set; } = string.Empty;

        [BindProperty]
        public string ConfirmPassword { get; set; } = string.Empty;

        [BindProperty]
        public string AccessToken { get; set; } = string.Empty;

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
                // 1. First, tell the Supabase client to use the AccessToken
                // This sets the session so the Update call is authorized.
                await _supabase.Auth.SetSession(AccessToken, "");

                // 2. Call Update with the new password
                var attrs = new Supabase.Gotrue.UserAttributes { Password = NewPassword };
                await _supabase.Auth.Update(attrs);

                TempData["Success"] = "Password updated successfully!";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ResetPassword] Error: {ex.Message}");
                TempData["Error"] = "Failed to update password. Link may have expired.";
            }

            return Page();
        }
    }
}
