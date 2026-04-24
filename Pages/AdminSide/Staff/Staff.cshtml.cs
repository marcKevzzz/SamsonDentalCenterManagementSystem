// ── Pages/Admin/Staff.cshtml.cs ────────────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.Admin;

[IgnoreAntiforgeryToken]
public class AdminStaffModel : AdminPageModel
{
    private readonly DoctorService _doctorService;
    private readonly ReceptionistService _receptionistService;
    private readonly ILogger<AdminStaffModel> _logger;

    public AdminStaffModel(DoctorService doctorService, ReceptionistService receptionistService, ILogger<AdminStaffModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _doctorService = doctorService;
        _receptionistService = receptionistService;
        _logger        = logger;
    }

    public List<DoctorDto> Doctors { get; set; } = new();
    public List<ReceptionistDto> Receptionists { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        try
        {
            Doctors = await _doctorService.GetAllWithProfilesAsync();
            Receptionists = await _receptionistService.GetAllWithProfilesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load staff");
        }

        return Page();
    }
}