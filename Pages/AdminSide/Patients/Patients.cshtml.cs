using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminPatientsModel : PageModel
{
    private readonly ILogger<AdminPatientsModel> _logger;

    public AdminPatientsModel(ILogger<AdminPatientsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
