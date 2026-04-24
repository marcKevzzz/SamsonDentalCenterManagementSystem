// Pages/Appointments.cshtml.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AppointmentModel : PageModel
{
    private readonly ProfileService _profileService;
    private readonly ILogger<AppointmentModel> _logger;

    // Null when guest, populated when logged in
    public Profile? CurrentUser { get; set; }
    public bool IsLoggedIn => CurrentUser != null;

    public AppointmentModel(ProfileService profileService, ILogger<AppointmentModel> logger)
    {
        _profileService = profileService;
        _logger         = logger;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        // Try to get user from JWT claims — works for both logged-in and guest
        var userId = User.FindFirst("sub")?.Value;
        var email  = User.FindFirst("email")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            CurrentUser = await _profileService.GetProfileById(userId, email);
            Console.WriteLine(CurrentUser);
        }

        return Page();
    }
}