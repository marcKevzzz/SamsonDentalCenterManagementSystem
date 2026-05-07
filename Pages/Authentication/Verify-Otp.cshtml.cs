using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class VerifyOtpModel : PageModel
    {
        private readonly ProfileService _profileService;
        private readonly OtpService _otpService;

        public VerifyOtpModel(ProfileService profileService, OtpService otpService)
        {
            _profileService = profileService;
            _otpService = otpService;
        }

        [BindProperty(SupportsGet = true)]
        public string Email { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public string Type { get; set; } = string.Empty; // signup, invitation, appointment, password_reset

        [BindProperty]
        public string Code { get; set; } = string.Empty;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrWhiteSpace(Code) || Code.Length != 6)
            {
                TempData["Error"] = "Please enter a valid 6-digit code.";
                return Page();
            }

            bool isValid = await _otpService.VerifyOtp(Email, Code, Type);
            if (!isValid)
            {
                TempData["Error"] = "Invalid or expired code. Please try again.";
                return Page();
            }

            // Success logic based on Type
            if (Type == "signup")
            {
                var profile = await _profileService.GetProfileByEmail(Email);
                if (profile != null)
                {
                    await _profileService.ToggleUserActive(profile.Id, true);
                }
                TempData["Success"] = "Email verified successfully! You can now sign in.";
                return RedirectToPage("/Authentication/Signin");
            }
            else if (Type == "invitation")
            {
                // For invitation, they need to set their password next
                return RedirectToPage("/Authentication/ResetPassword", new { email = Email, otp = Code, verified = true });
            }
            else if (Type == "password_reset")
            {
                 return RedirectToPage("/Authentication/ResetPassword", new { email = Email, otp = Code, verified = true });
            }
            else if (Type == "appointment")
            {
                // This would be handled by a separate controller or logic for guests
                // But we can redirect to a success page
                return Redirect($"/appointments/confirmed?email={Email}&otp={Code}");
            }

            return Page();
        }
    }
}
