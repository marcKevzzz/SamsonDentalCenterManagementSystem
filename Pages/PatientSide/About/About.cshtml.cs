using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AboutModel : PageModel
{
    private readonly ClinicService _clinicService;

    public AboutModel(ClinicService clinicService)
    {
        _clinicService = clinicService;
    }

    public ClinicSettings ClinicSettings { get; set; } = new();

    public async Task OnGetAsync()
    {
        ClinicSettings = await _clinicService.GetSettingsAsync();
    }
}
