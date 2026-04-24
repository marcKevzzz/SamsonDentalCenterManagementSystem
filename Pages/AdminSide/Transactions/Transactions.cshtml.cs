using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminTransactionsModel : AdminPageModel
{
    private readonly ILogger<AdminTransactionsModel> _logger;

    public AdminTransactionsModel(ILogger<AdminTransactionsModel> logger, ProfileService profileService)
        : base(profileService)
    {
        _logger = logger;
    }

    public void OnGet()
    {
    }
}
