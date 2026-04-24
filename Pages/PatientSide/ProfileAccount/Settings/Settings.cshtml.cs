using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;

namespace SamsonDentalCenterManagementSystem.Pages;

[Authorize]
public class SettingsModel : PageModel
{
    private readonly ILogger<SettingsModel> _logger;
    private readonly ProfileService _profileService;

    public Profile? UserProfile { get; set; }

    public SettingsModel(ILogger<SettingsModel> logger, ProfileService profileService)
    {
        _logger = logger;
        _profileService = profileService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        var userId = User.FindFirst("sub")?.Value;
        var email = User.FindFirst("email")?.Value;  // ← from JWT claims

       

        if (string.IsNullOrEmpty(userId))
            return RedirectToPage("/Index");

        UserProfile = await _profileService.GetProfileById(userId, email);

        if (UserProfile == null)
            return RedirectToPage("/Index");

        return Page();
    }
}