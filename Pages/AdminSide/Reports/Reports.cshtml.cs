using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminReportsModel : AdminPageModel
{
    private readonly ILogger<AdminReportsModel> _logger;

    public AdminReportsModel(ILogger<AdminReportsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
