using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AppointmentModel : PageModel
{
    private readonly ILogger<AppointmentModel> _logger;

    public AppointmentModel(ILogger<AppointmentModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
