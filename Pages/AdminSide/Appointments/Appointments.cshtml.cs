using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminAppointmentsModel : PageModel
{
    private readonly ILogger<AdminAppointmentsModel> _logger;

    public AdminAppointmentsModel(ILogger<AdminAppointmentsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
