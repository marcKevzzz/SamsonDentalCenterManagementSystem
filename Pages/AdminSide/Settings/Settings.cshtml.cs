using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide
{
    public class AdminSettingsModel : AdminPageModel
    {
        private readonly ClinicService _clinicService;

        public AdminSettingsModel(ProfileService profileService, ClinicService clinicService)
            : base(profileService)
        {
            _clinicService = clinicService;
        }

        [BindProperty]
        public ClinicSettings Settings { get; set; } = new();

        public async Task<IActionResult> OnGetAsync()
        {
            // Initial data fetching is handled by AdminStore on the client side.
            // We keep the Settings object initialized for the form's Tag Helpers.
            Settings = await _clinicService.GetSettingsAsync();
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            try
            {
                await _clinicService.UpdateSettingsAsync(Settings);
                TempData["Toast"] = "Settings updated successfully!";
                TempData["ToastType"] = "success";
            }
            catch (Exception ex)
            {
                TempData["Toast"] = ex.Message;
                TempData["ToastType"] = "danger";
            }
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostUploadPhotoAsync(IFormFile file)
        {
            if (file == null || file.Length == 0) return new JsonResult(new { ok = false, error = "No file selected" });

            try
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var url = await _clinicService.UploadPhotoAsync(file.FileName, ms.ToArray(), file.ContentType);
                return new JsonResult(new { ok = true, url });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { ok = false, error = ex.Message });
            }
        }

        public async Task<IActionResult> OnPostDeletePhotoAsync(string url)
        {
            if (string.IsNullOrEmpty(url)) return new JsonResult(new { ok = false });

            await _clinicService.DeletePhotoAsync(url);
            return new JsonResult(new { ok = true });
        }
    }
}
