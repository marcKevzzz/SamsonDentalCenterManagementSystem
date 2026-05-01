using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.ActivityLogs;

public class ActivityLogsModel : AdminPageModel
{
    private readonly ILogger<ActivityLogsModel> _logger;

    public ActivityLogsModel(ILogger<ActivityLogsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
