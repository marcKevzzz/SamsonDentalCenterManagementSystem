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
            var appointmentService = HttpContext.RequestServices.GetRequiredService<AppointmentService>();
            var dentalService = HttpContext.RequestServices.GetRequiredService<DentalServiceService>();
            
            Services = await dentalService.GetAll();
            var allAppts = await appointmentService.GetAllAsync();
            ArrivedAppointments = allAppts.Where(a => a.Status == "arrived").ToList();

            if (CurrentUserRole == "doctor")
            {
                var doctorRecord = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
                if (doctorRecord != null)
                {
                    DoctorRecordId = doctorRecord.Id;
                    Invoices = await _invoiceService.GetInvoicesByDoctorIdAsync(doctorRecord.Id);
                    // Filter arrived patients to only this doctor's
                    ArrivedAppointments = ArrivedAppointments.Where(a => a.DoctorId == doctorRecord.Id).ToList();
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
