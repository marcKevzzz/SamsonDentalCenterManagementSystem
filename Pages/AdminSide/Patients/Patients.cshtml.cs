using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide.Patients;

public class AdminPatientsModel : AdminPageModel
{
    private readonly ILogger<AdminPatientsModel> _logger;
    private readonly ProfileService _profileService;

    public AdminPatientsModel(ILogger<AdminPatientsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
        _profileService = profileService;
    }

    public List<Profile> Patients { get; set; } = new();
    public Dictionary<string, Appointment?> LastAppointments { get; set; } = new();

    public async Task OnGetAsync()
    {
        // No data fetching here; handled by AdminStore on the client side.
    }
}
