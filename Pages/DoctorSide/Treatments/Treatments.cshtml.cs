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
        private readonly ClinicService _settingsService;

        public TreatmentsModel(
            ProfileService profileService,
            InvoiceService invoiceService,
            DoctorService doctorService,
            AppointmentService appointmentService,
            DentalServiceService dentalServiceService,
            ClinicService settingsService)
            : base(profileService)
        {
            _invoiceService = invoiceService;
            _doctorService = doctorService;
            _appointmentService = appointmentService;
            _dentalServiceService = dentalServiceService;
            _settingsService = settingsService;
        }

        public ClinicSettings Settings { get; set; } = new();

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
            Settings = await _settingsService.GetSettingsAsync() ?? new();

            if (CurrentUserRole == "doctor" || CurrentUserRole == "admin")
            {
                var doctorRecord = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
                if (doctorRecord != null)
                {
                    DoctorRecordId = doctorRecord.Id;
                }
            }

            if (CurrentUserRole == "doctor")
            {
                if (!string.IsNullOrEmpty(DoctorRecordId))
                {
                    Invoices = await _invoiceService.GetInvoicesByDoctorIdAsync(DoctorRecordId);

                    // Get arrived appointments for this doctor
                    var allAppts = await _appointmentService.GetAllAsync();
                    ArrivedAppointments = allAppts
                        .Where(a => a.DoctorId == DoctorRecordId && a.Status == "arrived")
                        .ToList();
                }
            }
            else if (CurrentUserRole == "admin")
            {
                Invoices = await _invoiceService.GetAllInvoicesAsync();

                // Admin can invoice any arrived appointment? 
                // User said: "dont show the create invoice card on admin if its not for him. only show to the asssigned doctor."
                // So even for Admin, we should filter ArrivedAppointments to their doctorId if they have one.
                var allAppts = await _appointmentService.GetAllAsync();
                if (!string.IsNullOrEmpty(DoctorRecordId))
                {
                    ArrivedAppointments = allAppts
                        .Where(a => a.DoctorId == DoctorRecordId && a.Status == "arrived")
                        .ToList();
                }
                else
                {
                    ArrivedAppointments = new List<Appointment>();
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
