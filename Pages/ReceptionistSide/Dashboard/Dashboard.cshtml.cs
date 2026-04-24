using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace SamsonDentalCenterManagementSystem.Pages;

public class ReceptionistDashboardModel : AdminPageModel
{
    private readonly ILogger<ReceptionistDashboardModel> _logger;

    public ReceptionistDashboardModel(ILogger<ReceptionistDashboardModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public IActionResult OnGet()
    {
      
        return Page();
    }
}
