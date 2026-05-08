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

        [BindProperty(SupportsGet = true)]
        public string Email { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public string Otp { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public bool Verified { get; set; } = false;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!string.IsNullOrEmpty(Email)) Email = Email.Trim().ToLower();
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

            if (!Verified)
            {
                // If not pre-verified (e.g. directly hit this page), check OTP again
                bool isValid = await _profiles.VerifyOtp(Email, Otp, "password_reset");
                if (!isValid)
                {
                    // Also check for invitation type just in case
                    isValid = await _profiles.VerifyOtp(Email, Otp, "invitation");
                }

                if (!isValid)
                {
                    TempData["Error"] = "Invalid or expired verification session. Please try again.";
                    return Page();
                }
            }

            try
            {
                var userId = await _profiles.GetUserIdByEmail(Email);
                if (string.IsNullOrEmpty(userId))
                {
                    TempData["Error"] = "User not found.";
                    return Page();
                }

                await _profiles.UpdateUserPassword(userId, NewPassword);
                await _profiles.ToggleUserActive(userId, true);

                TempData["Success"] = "Password updated successfully! You can now sign in.";
                return RedirectToPage("/Authentication/Signin");
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
