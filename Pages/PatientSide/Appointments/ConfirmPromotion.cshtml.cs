using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.PatientSide.Appointments
{
    public class ConfirmPromotionModel : PageModel
    {
        private readonly AppointmentService _apptService;
        private readonly DentalServiceService _serviceService;

        public ConfirmPromotionModel(AppointmentService apptService, DentalServiceService serviceService)
        {
            _apptService = apptService;
            _serviceService = serviceService;
        }

        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        public Appointment? Appointment { get; set; }
        public DentalService? Service { get; set; }

        public string ErrorMessage { get; set; } = string.Empty;

        public async Task<IActionResult> OnGetAsync()
        {
            if (string.IsNullOrEmpty(Id))
            {
                return RedirectToPage("/Index");
            }

            Appointment = await _apptService.GetById(Id);

            if (Appointment == null)
            {
                ErrorMessage = "Appointment not found.";
                return Page();
            }

            // Must be pending and NOT already a waitlist item (it was promoted to pending)
            // Actually, promoted items have is_waitlist = true? 
            // Wait, AppointmentService.PromoteSpecific sets is_waitlist = false.
            if (Appointment.Status != "pending" || Appointment.IsWaitlist)
            {
                ErrorMessage = "This appointment is not eligible for promotion or has already been confirmed.";
                return Page();
            }

            // Check lock
            if (Appointment.SoftLockUntil != null && Appointment.SoftLockUntil < DateTime.UtcNow)
            {
                ErrorMessage = "Your promotion window has expired. Please contact the clinic or book again.";
                return Page();
            }

            Service = await _serviceService.GetById(Appointment.ServiceId);

            return Page();
        }
    }
}
