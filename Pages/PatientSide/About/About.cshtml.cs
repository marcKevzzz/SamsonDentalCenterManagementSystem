using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AboutModel : PageModel
{
    private readonly ClinicService _clinicService;
    private readonly DoctorService _doctorService;

    public AboutModel(ClinicService clinicService, DoctorService doctorService)
    {
        _clinicService = clinicService;
        _doctorService = doctorService;
    }

    public ClinicSettings ClinicSettings { get; set; } = new();
    public List<DoctorDto> Doctors { get; set; } = new();

    public async Task OnGetAsync()
    {
        ClinicSettings = await _clinicService.GetSettingsAsync();
        Doctors = await _doctorService.GetActiveWithProfilesAsync();
    }
}
