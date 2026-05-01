using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.Admin;

[IgnoreAntiforgeryToken]
public class BlockedDatesModel : AdminPageModel
{
    private readonly SessionHelper _sessionHelper;

    public BlockedDatesModel(ProfileService profileService, SessionHelper sessionHelper)
        : base(profileService)
    {
        _sessionHelper = sessionHelper;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        var token = await _sessionHelper.GetValidTokenAsync();
        if (token == null) return RedirectToPage("/Sign-in");
        return Page();
    }
}
