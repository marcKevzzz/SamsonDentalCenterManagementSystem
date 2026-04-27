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
        var all = await _profileService.GetAllProfiles();
        Patients = all.Where(p => p.Role == "patient").ToList();

          var apptService = HttpContext.RequestServices.GetRequiredService<AppointmentService>();
    var appts = await apptService.GetAllAsync();
    
    LastAppointments = Patients.ToDictionary(
        p => p.Id,
        p => appts
            .Where(a => a.PatientId == p.Id && a.Status == "arrived")
            .OrderByDescending(a => a.AppointmentDate)
            .FirstOrDefault()
    );
    }
}
