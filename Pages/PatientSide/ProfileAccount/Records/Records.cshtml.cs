using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class RecordsModel : PageModel
{
    private readonly RecordService _recordService;
    private readonly ProfileService _profileService;
    private readonly SessionHelper _session;
    private readonly ILogger<RecordsModel> _logger;

    public Profile? Patient { get; set; }
    public PatientMedicalInfo? MedicalInfo { get; set; }
    public List<Treatment> Treatments { get; set; } = new();
    public List<PatientToothStatus> ToothChart { get; set; } = new();

    // Deserialized data
    public List<string> Allergies { get; set; } = new();
    public List<string> Medications { get; set; } = new();
    public Dictionary<string, string> History { get; set; } = new();

    public Dictionary<int, string> ToothStatusMap { get; set; } = new();

    public RecordsModel(
        RecordService recordService,
        ProfileService profileService,
        SessionHelper session,
        ILogger<RecordsModel> logger
    )
    {
        _recordService = recordService;
        _profileService = profileService;
        _session = session;
        _logger = logger;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        var userId =
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return RedirectToPage("/Authentication/Signin");

        Patient = await _profileService.GetProfileById(userId);
        if (Patient == null || Patient.Role?.ToLower() != "patient")
            return RedirectToPage("/Index");

        MedicalInfo = await _recordService.GetMedicalInfoAsync(userId);
        if (MedicalInfo != null)
        {
            try
            {
                Allergies =
                    JsonSerializer.Deserialize<List<string>>(MedicalInfo.AllergiesJson ?? "[]")
                    ?? new();
                Medications =
                    JsonSerializer.Deserialize<List<string>>(MedicalInfo.MedicationsJson ?? "[]")
                    ?? new();
                History =
                    JsonSerializer.Deserialize<Dictionary<string, string>>(
                        MedicalInfo.HistoryJson ?? "{}"
                    ) ?? new();
            }
            catch { }
        }

        Treatments = await _recordService.GetTreatmentsByPatientAsync(userId);
        ToothChart = await _recordService.GetToothChartAsync(userId);

        foreach (var ts in ToothChart)
        {
            ToothStatusMap[ts.ToothNumber] = ts.Status;
        }

        return Page();
    }
}
