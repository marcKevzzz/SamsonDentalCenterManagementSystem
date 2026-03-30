using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminDoctorsModel : PageModel
{
    private readonly ILogger<AdminDoctorsModel> _logger;

    public AdminDoctorsModel(ILogger<AdminDoctorsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
