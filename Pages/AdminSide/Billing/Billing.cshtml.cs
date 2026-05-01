using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminBillingModel : AdminPageModel
{
    private readonly InvoiceService _invoiceService;

    public AdminBillingModel(ProfileService profileService, InvoiceService invoiceService)
        : base(profileService)
    {
        _invoiceService = invoiceService;
    }

    public List<Invoice> Invoices { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        Invoices = await _invoiceService.GetAllInvoicesAsync();
        return Page();
    }
}
