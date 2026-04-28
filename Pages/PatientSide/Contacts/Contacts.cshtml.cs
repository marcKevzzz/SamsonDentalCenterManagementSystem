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
    private readonly ClinicService _clinicService;

    public ContactsModel(SessionHelper session, ProfileService profile, InquiryService inquiryService, ClinicService clinicService)
    {
        _session = session;
        _profile = profile;
        _inquiryService = inquiryService;
        _clinicService = clinicService;
    }

    public string? CurrentPatientId { get; set; }
    public Inquiry? ActiveInquiry { get; set; }
    public ClinicSettings ClinicSettings { get; set; } = new();

    public async Task OnGetAsync()
    {
        ClinicSettings = await _clinicService.GetSettingsAsync();
        CurrentPatientId = User.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(CurrentPatientId))
        {
            Console.WriteLine(CurrentPatientId);
            var inquiries = await _inquiryService.GetInquiriesByPatientIdAsync(CurrentPatientId);
            ActiveInquiry = inquiries.FirstOrDefault();
        }
    }
}
