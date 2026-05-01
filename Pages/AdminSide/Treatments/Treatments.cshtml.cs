using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide
{
    public class TreatmentsModel : AdminPageModel
    {
        private readonly InvoiceService _invoiceService;
        private readonly DoctorService _doctorService;

        public TreatmentsModel(ProfileService profileService, InvoiceService invoiceService, DoctorService doctorService)
            : base(profileService)
        {
            _invoiceService = invoiceService;
            _doctorService = doctorService;
        }

        public List<Invoice> Invoices { get; set; } = new();
        public List<Appointment> ArrivedAppointments { get; set; } = new();
        public List<DentalService> Services { get; set; } = new();
        public string DoctorRecordId { get; set; } = "";

        public async Task<IActionResult> OnGetAsync()
        {
            if (!string.IsNullOrEmpty(CurrentUserId) && CurrentUserRole == "doctor")
            {
                var doctor = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
                if (doctor != null)
                {
                    DoctorRecordId = doctor.Id;
                }
            }
            // Data handled by AdminStore on the client side
            return Page();
        }
    }
}
