using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.PatientSide.Services
{
    public class SlugModel : PageModel
    {
        private readonly DentalServiceService _svcService;

        public DentalService? Service { get; set; }  // ← singular, nullable

        public SlugModel(DentalServiceService svcService)
        {
            _svcService = svcService;
        }

        public async Task<IActionResult> OnGetAsync(string slug)
        {
            Service = await _svcService.GetBySlug(slug);

            if (Service == null)
                return NotFound();

            return Page();
        }
    }
}