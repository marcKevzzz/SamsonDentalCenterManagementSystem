// ── Pages/Admin/Receptionists/Index.cshtml.cs ────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.Admin.Staff.Receptionists;

[IgnoreAntiforgeryToken]
public class ReceptionistsModel : AdminPageModel
{
    private readonly ReceptionistService _receptionistService;
    private readonly ILogger<ReceptionistsModel> _logger;

    public ReceptionistsModel(ReceptionistService receptionistService, ILogger<ReceptionistsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _receptionistService = receptionistService;
        _logger        = logger;
    }

    public List<ReceptionistDto> Receptionists { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        // Data handled by AdminStore on the client
        return Page();
    }
}