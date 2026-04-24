using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide;

public class AdminInquiriesModel : AdminPageModel
{
    private readonly ILogger<AdminInquiriesModel> _logger;

    public AdminInquiriesModel(ILogger<AdminInquiriesModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
