using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages;

public class ServicesModel : PageModel
{
    private readonly DentalServiceService _svcService;

    public List<DentalService> Services { get; set; } = [];

    public ServicesModel(DentalServiceService svcService)
    {
        _svcService = svcService;
    }

    public async Task OnGetAsync()
    {
        Services = await _svcService.GetAll(activeOnly: true);
    }
}