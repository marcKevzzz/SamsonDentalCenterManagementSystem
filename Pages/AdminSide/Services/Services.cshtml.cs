using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminServicesModel : PageModel
{
    private readonly ILogger<AdminServicesModel> _logger;

    public AdminServicesModel(ILogger<AdminServicesModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
