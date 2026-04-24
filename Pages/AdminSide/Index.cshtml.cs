using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminDashboardModel : AdminPageModel
{
    private readonly ILogger<AdminDashboardModel> _logger;

    public AdminDashboardModel(ILogger<AdminDashboardModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public IActionResult OnGet()
    {
       
        return Page();
    }
}
