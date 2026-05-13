using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Patients;

public class PatientDetailsModel : AdminPageModel
{
    private readonly RecordService _recordService;
    private readonly InvoiceService _invoiceService;
    private readonly ProfileService _profileService;
    private readonly AppointmentService _appointmentService;

    public PatientDetailsModel(
        ProfileService profileService,
        AppointmentService appointmentService,
        InvoiceService invoiceService,
        RecordService recordService) : base(profileService)
    {
        _profileService = profileService;
        _appointmentService = appointmentService;
        _invoiceService = invoiceService;
        _recordService = recordService;
    }

    public Profile? Patient { get; set; }
    public List<Appointment> Appointments { get; set; } = new();
    public List<Invoice> Invoices { get; set; } = new();
    public List<Treatment> ClinicalTimeline { get; set; } = new();

    public Appointment? NextAppointment { get; set; }
    public decimal OutstandingBalance { get; set; }
    public DateTime? LastTreatmentDate { get; set; }
    public DateTime? LastChartUpdate { get; set; }
    public PatientMedicalInfo? MedicalInfo { get; set; }
    public Dictionary<int, string> ToothStatusMap { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(string id)
    {
        if (string.IsNullOrEmpty(id)) return RedirectToPage("./Index");

        Patient = await _profileService.GetProfileById(id);
        if (Patient == null) return NotFound();

        // Fetch exact email from auth.users
        var authEmail = await _profileService.GetAuthUserEmail(id);
        if (!string.IsNullOrEmpty(authEmail)) {
            Patient.Email = authEmail;
        }

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
        ClinicalTimeline = await _recordService.GetTreatmentsByPatientAsync(id);
        LastTreatmentDate = ClinicalTimeline.FirstOrDefault()?.CreatedAt;

        // 4. Medical Info & Tooth Chart
        MedicalInfo = await _recordService.GetMedicalInfoAsync(id);
        var toothStatuses = await _recordService.GetToothChartAsync(id);
        ToothStatusMap = toothStatuses.ToDictionary(ts => ts.ToothNumber, ts => ts.Status);
        LastChartUpdate = toothStatuses.Any() ? toothStatuses.Max(ts => ts.UpdatedAt) : null;

        return Page();
    }
}
