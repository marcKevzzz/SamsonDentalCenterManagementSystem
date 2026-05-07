using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class ForgotPasswordModel : PageModel
    {
        private readonly ProfileService _profileService;
        private readonly string _appBaseUrl;

        public ForgotPasswordModel(ProfileService profileService, IConfiguration config)
        {
            _profileService = profileService;
            _appBaseUrl = (config["App:BaseUrl"] ?? "").TrimEnd('/');
        }

        [BindProperty]
        public string Email { get; set; } = string.Empty;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrWhiteSpace(Email))
            {
                TempData["Error"] = "Please enter your email address.";
                return Page();
            }

            try
            {
                // Call the service method
                await _profileService.ResetPasswordForEmail(Email, _appBaseUrl);

                TempData["Success"] = "Verification code sent to your email.";
                return RedirectToPage("/Authentication/Verify-Otp", new { email = Email, type = "password_reset" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ForgotPassword] Error: {ex.Message}");
                TempData["Error"] = "An error occurred. Please try again later.";
            }

            return Page();
        }
    }
}

