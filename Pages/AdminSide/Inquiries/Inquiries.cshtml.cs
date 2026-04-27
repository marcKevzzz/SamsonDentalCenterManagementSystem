using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide
{
    public class AdminInquiriesModel : AdminPageModel
    {
        private readonly InquiryService _inquiryService;

        public AdminInquiriesModel(ProfileService profileService, InquiryService inquiryService)
            : base(profileService)
        {
            _inquiryService = inquiryService;
        }

        public List<Inquiry> Inquiries { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            Inquiries = await _inquiryService.GetAllInquiriesAsync();
            return Page();
        }
    }
}
