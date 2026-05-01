using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Patients;

public class PatientDetailsModel : AdminPageModel
{
    private readonly AppointmentService _appointmentService;
    private readonly InvoiceService _invoiceService;
    private readonly ProfileService _profileService;

    public PatientDetailsModel(
        ProfileService profileService,
        AppointmentService appointmentService,
        InvoiceService invoiceService) : base(profileService)
    {
        _profileService = profileService;
        _appointmentService = appointmentService;
        _invoiceService = invoiceService;
    }

    public Profile? Patient { get; set; }
    public List<Appointment> Appointments { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Treatment> ClinicalTimeline { get; set; } = new();

    public Appointment? NextAppointment { get; set; }
    public decimal OutstandingBalance { get; set; }
    public DateTime? LastTreatmentDate { get; set; }

    public async Task<IActionResult> OnGetAsync(string id)
    {
        if (string.IsNullOrEmpty(id)) return RedirectToPage("./Index");

        Patient = await _profileService.GetProfileById(id);
        if (Patient == null) return NotFound();

        // 1. Appointments
        Appointments = await _appointmentService.GetByPatient(id);
        
        // For Doctors, maybe only show their own appointments? 
        // User said: "the patient only shows only the user doctor handles"
        // But for details, showing full history is usually better.
        // Let's stick to full history for now as per "just like in the admin".

        NextAppointment = Appointments
            .Where(a => a.AppointmentDate >= DateTime.Today && (a.Status == "confirmed" || a.Status == "pending"))
            .OrderBy(a => a.AppointmentDate)
            .FirstOrDefault();

        // 2. Invoices & Balance
        var allInvoices = await _invoiceService.GetAllInvoicesAsync();
        Invoices = allInvoices.Where(i => i.PatientId == id).ToList();
        OutstandingBalance = Invoices.Where(i => i.Status != "paid" && i.Status != "cancelled").Sum(i => i.FinalAmount);

        // 3. Clinical Timeline (Treatments)
        if (Invoices.Any())
        {
            var invoiceIds = Invoices.Select(i => i.Id).ToList();
            var treatmentsRes = await _invoiceService._supabase.From<Treatment>()
                .Where(t => invoiceIds.Contains(t.InvoiceId))
                .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                .Get();
            
            ClinicalTimeline = treatmentsRes.Models;
            LastTreatmentDate = ClinicalTimeline.FirstOrDefault()?.CreatedAt;
        }

        return Page();
    }
}
