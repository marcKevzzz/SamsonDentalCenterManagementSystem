using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminDashboardModel : PageModel
{
    private readonly ILogger<AdminDashboardModel> _logger;

    public AdminDashboardModel(ILogger<AdminDashboardModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
