using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide.Patients;

public class PatientDetailsModel : AdminPageModel
{
    private readonly RecordService _recordService;
    private readonly ProfileService _profileService;
    private readonly AppointmentService _appointmentService;
    private readonly InvoiceService _invoiceService;

    public PatientDetailsModel(
        ProfileService profileService,
        AppointmentService appointmentService,
        InvoiceService invoiceService,
        RecordService recordService
    )
        : base(profileService)
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
    public PatientMedicalInfo? MedicalInfo { get; set; }
    public Dictionary<int, string> ToothStatusMap { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(string id)
    {
        if (string.IsNullOrEmpty(id))
            return RedirectToPage("./Patients");

        Patient = await _profileService.GetProfileById(id);
        if (Patient == null)
            return NotFound();

        // 1. Appointments
        Appointments = await _appointmentService.GetByPatient(id);
        NextAppointment = Appointments
            .Where(a =>
                a.AppointmentDate >= DateTime.Today
                && (a.Status == "confirmed" || a.Status == "pending")
            )
            .OrderBy(a => a.AppointmentDate)
            .FirstOrDefault();

        // 2. Invoices & Balance
        Invoices = await _invoiceService.GetInvoicesByPatientIdAsync(id);
        OutstandingBalance = Invoices
            .Where(i => i.Status != "paid" && i.Status != "cancelled")
            .Sum(i => i.FinalAmount);

        // 3. Clinical Timeline (Treatments)
        ClinicalTimeline = await _recordService.GetTreatmentsByPatientAsync(id);
        LastTreatmentDate = ClinicalTimeline.FirstOrDefault()?.CreatedAt;

        // 4. Medical Info & Tooth Chart
        MedicalInfo = await _recordService.GetMedicalInfoAsync(id);
        var toothStatuses = await _recordService.GetToothChartAsync(id);
        ToothStatusMap = toothStatuses.ToDictionary(ts => ts.ToothNumber, ts => ts.Status);

        return Page();
    }
}
