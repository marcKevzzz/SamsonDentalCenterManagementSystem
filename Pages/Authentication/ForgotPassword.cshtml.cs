using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class ForgotPasswordModel : PageModel
    {
        private readonly ProfileService _profileService;

        public ForgotPasswordModel(ProfileService profileService)
        {
            _profileService = profileService;
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
                // Build the base URL here to pass to the service
                var baseUrl = $"{Request.Scheme}://{Request.Host}";

                // Call the service method we just fixed
                await _profileService.ResetPasswordForEmail(Email, baseUrl);

                TempData["Success"] =
                    "If an account exists for this email, you will receive a reset link shortly.";
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
