using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.Services
{
    public class SlugModel : PageModel
    {
        public required DentalService Service { get; set; }

        public IActionResult OnGet(string slug)
        {
            Service = ServiceRepository.GetBySlug(slug);

            if (Service == null)
                return NotFound();

            return Page();
        }
    }
}