using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide.Patients;

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
        if (string.IsNullOrEmpty(id)) return RedirectToPage("./Patients");

        Patient = await _profileService.GetProfileById(id);
        if (Patient == null) return NotFound();

        // 1. Appointments
        Appointments = await _appointmentService.GetByPatient(id);
        NextAppointment = Appointments
            .Where(a => a.AppointmentDate >= DateTime.Today && (a.Status == "confirmed" || a.Status == "pending"))
            .OrderBy(a => a.AppointmentDate)
            .FirstOrDefault();

        // 2. Invoices & Balance
        // We use GetAllInvoicesAsync and filter for now as InvoiceService doesn't have GetByPatient
        // Actually, let's assume we can fetch them or add a method.
        // For now, let's fetch all and filter to be safe, or check if we can optimize.
        var allInvoices = await _invoiceService.GetAllInvoicesAsync();
        Invoices = allInvoices.Where(i => i.PatientId == id).ToList();
        OutstandingBalance = Invoices.Where(i => i.Status != "paid" && i.Status != "cancelled").Sum(i => i.FinalAmount);

        // 3. Clinical Timeline (Treatments)
        // Treatments are linked to invoices. 
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
