using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;
using Microsoft.AspNetCore.Authorization;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Patients;

public class IndexModel : AdminPageModel
{
    private readonly ProfileService _profiles;
    private readonly DoctorService _doctorService;
    private readonly ILogger<IndexModel> _logger;

    public IndexModel(
        ProfileService profiles,
        DoctorService doctorService,
        ILogger<IndexModel> logger)
        : base(profiles)
    {
        _profiles = profiles;
        _doctorService = doctorService;
        _logger = logger;
    }

    public List<Profile> Patients { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        if (CurrentUserRole != "doctor" && CurrentUserRole != "admin")
        {
            return RedirectToPage("/Sign-in");
        }

        try
        {
            var doc = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
            if (doc != null)
            {
                Patients = await _profiles.GetMyPatients(doc.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load doctor patients");
        }

        return Page();
    }
}
