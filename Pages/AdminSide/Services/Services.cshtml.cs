using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide;

public class AdminServicesModel : AdminPageModel
{
    private readonly DentalServiceService _svcService;

    public List<DentalService> Services { get; set; } = new();

    public AdminServicesModel(DentalServiceService svcService, ProfileService profileService)
        : base(profileService)
    {
        _svcService = svcService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        Services = await _svcService.GetAll(activeOnly: false);
        return Page();
    }
}