using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class MyAppointmentsModel : PageModel
{
    private readonly ILogger<MyAppointmentsModel> _logger;

    public MyAppointmentsModel(ILogger<MyAppointmentsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
