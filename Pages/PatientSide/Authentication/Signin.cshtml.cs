using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class SigninModel : PageModel
{
    private readonly ILogger<SigninModel> _logger;

    public SigninModel(ILogger<SigninModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
