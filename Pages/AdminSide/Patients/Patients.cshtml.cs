using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminPatientsModel : AdminPageModel
{
    private readonly ILogger<AdminPatientsModel> _logger;

    public AdminPatientsModel(ILogger<AdminPatientsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
