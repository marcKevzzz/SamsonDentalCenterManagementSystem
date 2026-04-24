using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Invoices
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

        public async Task<IActionResult> OnGetAsync()
        {
            if (CurrentUserRole == "doctor")
            {
                var doctorRecord = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
                if (doctorRecord != null)
                {
                    Invoices = await _invoiceService.GetInvoicesByDoctorIdAsync(doctorRecord.Id);
                }
            }
            else if (CurrentUserRole == "admin")
            {
                Invoices = await _invoiceService.GetAllInvoicesAsync();
            }
            else
            {
                return RedirectToPage("/AdminSide/Index");
            }

            return Page();
        }
    }
}
