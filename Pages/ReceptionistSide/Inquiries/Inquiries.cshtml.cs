using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.Inquiries;

public class InquiriesModel : AdminPageModel
{
    private readonly ILogger<InquiriesModel> _logger;

    public InquiriesModel(ILogger<InquiriesModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
