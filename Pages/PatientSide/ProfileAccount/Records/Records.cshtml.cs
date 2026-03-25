using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class RecordsModel : PageModel
{
    private readonly ILogger<RecordsModel> _logger;

    public RecordsModel(ILogger<RecordsModel> logger)
    {
        _logger = logger;
    }

    public void OnGet()
    {

    }
}
