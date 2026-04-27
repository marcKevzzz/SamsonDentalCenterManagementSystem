using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class ContactsModel : PageModel
{
    private readonly SessionHelper _session;
    private readonly ProfileService _profile;
    private readonly InquiryService _inquiryService;

    public ContactsModel(SessionHelper session, ProfileService profile, InquiryService inquiryService)
    {
        _session = session;
        _profile = profile;
        _inquiryService = inquiryService;
    }

    public string? CurrentPatientId { get; set; }
    public Inquiry? ActiveInquiry { get; set; }

    public async Task OnGetAsync()
    {
        CurrentPatientId = User.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(CurrentPatientId))
        {
            var inquiries = await _inquiryService.GetInquiriesByPatientIdAsync(CurrentPatientId);
            ActiveInquiry = inquiries.FirstOrDefault();
        }
    }
}
