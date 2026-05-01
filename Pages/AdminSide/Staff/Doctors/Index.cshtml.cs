// ── Pages/Admin/Doctors/Index.cshtml.cs ────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.Admin.Staff.Doctors;

[IgnoreAntiforgeryToken]
public class DoctorsModel : AdminPageModel
{
    private readonly DoctorService _doctorService;
    private readonly ILogger<DoctorsModel> _logger;

    public DoctorsModel(DoctorService doctorService, ILogger<DoctorsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _doctorService = doctorService;
        _logger        = logger;
    }

    public List<DoctorDto> Doctors { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        // Data handled by AdminStore on the client
        return Page();
    }
}