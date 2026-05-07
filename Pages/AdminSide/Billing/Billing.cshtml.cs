using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminBillingModel : AdminPageModel
{
    private readonly InvoiceService _invoiceService;
    private readonly ClinicService _settingsService;

    public AdminBillingModel(ProfileService profileService, InvoiceService invoiceService, ClinicService settingsService)
        : base(profileService)
    {
        _invoiceService = invoiceService;
        _settingsService = settingsService;
    }

    public List<Invoice> Invoices { get; set; } = new();
    public ClinicSettings Settings { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        Invoices = await _invoiceService.GetAllInvoicesAsync();
        Settings = await _settingsService.GetSettingsAsync() ?? new();
        return Page();
    }
}
