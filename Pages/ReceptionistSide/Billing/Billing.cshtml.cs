using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.Billing;

public class BillingModel : AdminPageModel
{
    private readonly ILogger<BillingModel> _logger;
    private readonly ClinicService _settingsService;

    public BillingModel(ILogger<BillingModel> logger, ProfileService profileService, ClinicService settingsService)
        : base(profileService)
    {
        _logger = logger;
        _settingsService = settingsService;
    }

    public ClinicSettings Settings { get; set; } = new();

    public async Task OnGetAsync()
    {
        Settings = await _settingsService.GetSettingsAsync() ?? new();
    }
}

