using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminTransactionsModel : PageModel
{
    private readonly ILogger<AdminTransactionsModel> _logger;

    public AdminTransactionsModel(ILogger<AdminTransactionsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
