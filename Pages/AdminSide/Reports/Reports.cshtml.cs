using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminReportsModel : PageModel
{
    private readonly ILogger<AdminReportsModel> _logger;

    public AdminReportsModel(ILogger<AdminReportsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
