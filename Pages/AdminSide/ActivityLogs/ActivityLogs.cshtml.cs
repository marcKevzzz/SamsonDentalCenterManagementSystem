using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminActivityLogsModel : AdminPageModel
{
    private readonly ILogger<AdminActivityLogsModel> _logger;

    public AdminActivityLogsModel(ILogger<AdminActivityLogsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
