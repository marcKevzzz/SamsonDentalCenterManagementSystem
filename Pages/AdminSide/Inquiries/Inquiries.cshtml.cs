using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminInquiriesModel : PageModel
{
    private readonly ILogger<AdminInquiriesModel> _logger;

    public AdminInquiriesModel(ILogger<AdminInquiriesModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
