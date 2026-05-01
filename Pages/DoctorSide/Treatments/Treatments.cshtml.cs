using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Text.Json;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Treatments
{
    public class TreatmentsModel : AdminPageModel
    {
        private readonly InvoiceService _invoiceService;
        private readonly DoctorService _doctorService;
        private readonly AppointmentService _appointmentService;
        private readonly DentalServiceService _dentalServiceService;

        public TreatmentsModel(
            ProfileService profileService,
            InvoiceService invoiceService,
            DoctorService doctorService,
            AppointmentService appointmentService,
            DentalServiceService dentalServiceService)
            : base(profileService)
        {
            _invoiceService = invoiceService;
            _doctorService = doctorService;
            _appointmentService = appointmentService;
            _dentalServiceService = dentalServiceService;
        }

        public List<Invoice> Invoices { get; set; } = new();

        /// <summary>Appointments with status "arrived" assigned to this doctor — ready for invoicing.</summary>
        public List<Appointment> ArrivedAppointments { get; set; } = new();

        /// <summary>All active dental services for the service picker.</summary>
        public List<DentalService> Services { get; set; } = new();

        /// <summary>The doctor record ID (from the doctors table, not the profile ID).</summary>
        public string DoctorRecordId { get; set; } = "";

        public async Task<IActionResult> OnGetAsync()
        {
            // Load services for the invoice modal
            Services = await _dentalServiceService.GetAll(activeOnly: true);

            if (CurrentUserRole == "doctor")
            {
                var doctorRecord = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
                if (doctorRecord != null)
                {
                    DoctorRecordId = doctorRecord.Id;
                    Invoices = await _invoiceService.GetInvoicesByDoctorIdAsync(doctorRecord.Id);

                    // Get arrived appointments for this doctor
                    var allAppts = await _appointmentService.GetAllAsync();
                    ArrivedAppointments = allAppts
                        .Where(a => a.DoctorId == doctorRecord.Id && a.Status == "arrived")
                        .ToList();
                }
            }
            else if (CurrentUserRole == "admin")
            {
                Invoices = await _invoiceService.GetAllInvoicesAsync();

                // Admin can invoice any arrived appointment
                var allAppts = await _appointmentService.GetAllAsync();
                ArrivedAppointments = allAppts
                    .Where(a => a.Status == "arrived")
                    .ToList();
                    Console.WriteLine("Arrived Appointments:");
                    foreach (var appt in ArrivedAppointments) 
            { 
                // This replaces appt.ToJson()
                Console.WriteLine(JsonSerializer.Serialize(appt)); 
            }
            }
            else
            {
                return RedirectToPage("/AdminSide/Index");
            }

            return Page();
        }
    }
}
