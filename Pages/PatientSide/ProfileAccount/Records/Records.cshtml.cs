using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.Patient;

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
        try 
        {
            var userId =
                User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("[Records] No userId found in claims. Redirecting to signin.");
                return RedirectToPage("/Authentication/Signin");
            }

            Patient = await _profileService.GetProfileById(userId);
            if (Patient == null)
            {
                _logger.LogError($"[Records] Profile not found for userId: {userId}. Redirecting to home.");
                return RedirectToPage("/Index");
            }

            if (Patient.Role?.ToLower() != "patient")
            {
                _logger.LogWarning($"[Records] User {userId} has role '{Patient.Role}', not 'patient'. Redirecting to home.");
                return RedirectToPage("/Index");
            }

            // Parallel fetch for clinical data
            try 
            {
                var medicalTask = _recordService.GetMedicalInfoAsync(userId);
                var treatmentsTask = _recordService.GetTreatmentsByPatientAsync(userId);
                var toothChartTask = _recordService.GetToothChartAsync(userId);

                await Task.WhenAll(medicalTask, treatmentsTask, toothChartTask);

                MedicalInfo = await medicalTask;
                Treatments = await treatmentsTask;
                ToothChart = await toothChartTask;

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
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[Records] Error deserializing medical info JSON.");
                    }
                }

                foreach (var ts in ToothChart)
                {
                    ToothStatusMap[ts.ToothNumber] = ts.Status;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Records] Critical error fetching clinical data. Showing page with empty records.");
                // We continue to show the page even if clinical data fails, 
                // so the user can at least see their profile context.
            }

            return Page();
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "[Records] Fatal error in OnGetAsync.");
            return RedirectToPage("/Index");
        }
    }
}
