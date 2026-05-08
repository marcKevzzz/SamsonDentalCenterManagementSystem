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

        public async Task<IActionResult> OnPostAsync(string section)
        {
            if (!ModelState.IsValid)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    return new JsonResult(new { ok = false, error = "Invalid model state" });
                return Page();
            }

            try
            {
                var existing = await _clinicService.GetSettingsAsync();

                if (section == "Identity")
                {
                    existing.ClinicName = Settings.ClinicName;
                    existing.AboutText = Settings.AboutText;
                    existing.FacebookUrl = Settings.FacebookUrl;
                    existing.InstagramUrl = Settings.InstagramUrl;
                    existing.LocationAddress = Settings.LocationAddress;
                    existing.MapsUrl = Settings.MapsUrl;
                    existing.ContactEmail = Settings.ContactEmail;
                    existing.ContactPhone = Settings.ContactPhone;
                    existing.Landline = Settings.Landline;
                    existing.LogoUrl = Settings.LogoUrl;
                }
                else if (section == "Availability")
                {
                    existing.IsAutomatedStatus = Settings.IsAutomatedStatus;
                    existing.ManualStatus = Settings.ManualStatus;
                    existing.ClinicalHoursJson = Settings.ClinicalHoursJson;
                }
                else if (section == "Chatbot")
                {
                    existing.IsChatbotEnabled = Settings.IsChatbotEnabled;
                    existing.ChatbotName = Settings.ChatbotName;
                    existing.ChatbotWelcomeMessage = Settings.ChatbotWelcomeMessage;
                    existing.FaqsJson = Settings.FaqsJson;
                }
                else if (section == "Photos")
                {
                    existing.ClinicPhotosJson = Settings.ClinicPhotosJson;
                }

                await _clinicService.UpdateSettingsAsync(existing);
                
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    return new JsonResult(new { ok = true, message = $"{section} updated successfully!" });

                TempData["Toast"] = $"{section} updated successfully!";
                TempData["ToastType"] = "success";
            }
            catch (Exception ex)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    return new JsonResult(new { ok = false, error = ex.Message });

                TempData["Toast"] = ex.Message;
                TempData["ToastType"] = "danger";
            }
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostUploadPhotoAsync(List<IFormFile> files)
        {
            if (files == null || files.Count == 0) return new JsonResult(new { ok = false, error = "No files selected" });

            try
            {
                var urls = new List<string>();
                foreach (var file in files)
                {
                    if (file.Length == 0) continue;
                    using var ms = new MemoryStream();
                    await file.CopyToAsync(ms);
                    var url = await _clinicService.UploadPhotoAsync(file.FileName, ms.ToArray(), file.ContentType);
                    urls.Add(url);
                }
                return new JsonResult(new { 
                    ok = true, 
                    urls = urls, 
                    url = urls.FirstOrDefault() 
                });
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
