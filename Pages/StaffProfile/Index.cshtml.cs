using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.StaffProfile;

[Authorize]
public class IndexModel : AdminPageModel
{
    private readonly ProfileService _profileService;

    public Profile? UserProfile { get; set; }

    public IndexModel(ProfileService profileService)
        : base(profileService)
    {
        _profileService = profileService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        if (string.IsNullOrEmpty(CurrentUserId))
            return RedirectToPage("/Authentication/Signin");

        var email = User.FindFirst("email")?.Value;

        UserProfile = await _profileService.GetProfileById(CurrentUserId, email);

        if (UserProfile == null)
            return RedirectToPage("/Authentication/Signin");

        return Page();
    }
}
