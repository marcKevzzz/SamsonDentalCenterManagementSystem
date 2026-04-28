using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide
{
    public class InvoicesModel : AdminPageModel
    {
        private readonly InvoiceService _invoiceService;
        private readonly DoctorService _doctorService;

        public InvoicesModel(ProfileService profileService, InvoiceService invoiceService, DoctorService doctorService)
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
            // Data handled by AdminStore on the client side
            return Page();
        }
    }
}
