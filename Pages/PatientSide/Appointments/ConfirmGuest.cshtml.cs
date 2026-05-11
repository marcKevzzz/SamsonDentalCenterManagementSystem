using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.PatientSide.Appointments
{
    public class ConfirmGuestModel : PageModel
    {
        private readonly AppointmentService _apptService;
        private readonly OtpService _otpService;

        public ConfirmGuestModel(AppointmentService apptService, OtpService otpService)
        {
            _apptService = apptService;
            _otpService = otpService;
        }

        [BindProperty(SupportsGet = true)]
        public string Email { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public string Token { get; set; } = string.Empty;

        [BindProperty]
        public string Code { get; set; } = string.Empty;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!string.IsNullOrEmpty(Email)) Email = Email.Trim().ToLower();
            if (string.IsNullOrWhiteSpace(Code) || Code.Length != 6)
            {
                TempData["Error"] = "Please enter a valid 6-digit code.";
                return Page();
            }

            bool isValid = await _otpService.VerifyOtp(Email, Code, "appointment", false); // Don't mark used yet
            if (!isValid)
            {
                TempData["Error"] = "Invalid or expired code.";
                return Page();
            }

            // Confirm appointment
            var appt = await _apptService.ConfirmByOtp(Email, Code, Token);
            if (appt == null)
            {
                TempData["Error"] = "Could not find appointment to confirm.";
                return Page();
            }

            // ONLY mark as used if confirmation succeeded
            await _otpService.MarkOtpAsUsed(Email, Code, "appointment");

            return Redirect($"/appointments/confirmed?id={appt.Id}");
        }
    }
}
