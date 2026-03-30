using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminActivityLogsModel : PageModel
{
    private readonly ILogger<AdminActivityLogsModel> _logger;

    public AdminActivityLogsModel(ILogger<AdminActivityLogsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
