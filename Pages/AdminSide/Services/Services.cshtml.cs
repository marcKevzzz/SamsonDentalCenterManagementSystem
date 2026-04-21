using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;

using SamsonDentalCenterManagementSystem.Services;
namespace SamsonDentalCenterManagementSystem.Pages.AdminSide;

[Authorize]
public class AdminServicesModel : PageModel
{
    private readonly DentalServiceService _svcService;

    public List<DentalService> Services { get; set; } = new();

    public AdminServicesModel(DentalServiceService svcService)
    {
        _svcService = svcService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        Services = await _svcService.GetAll(activeOnly: false);
        return Page();
    }
}