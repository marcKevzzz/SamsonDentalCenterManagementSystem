using SamsonDentalCenterManagementSystem.Services;
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
        try 
        {
            var userId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst("email")?.Value;

            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("[Settings] No userId found. Redirecting to home.");
                return RedirectToPage("/Index");
            }

            UserProfile = await _profileService.GetProfileById(userId, email);

            if (UserProfile == null)
            {
                _logger.LogError($"[Settings] Failed to load/repair profile for {userId}. Redirecting to home.");
                return RedirectToPage("/Index");
            }

            return Page();
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "[Settings] Fatal error in OnGetAsync.");
            return RedirectToPage("/Index");
        }
    }
}
