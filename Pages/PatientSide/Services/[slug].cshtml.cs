using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Data;

namespace SamsonDentalCenterManagementSystem.Pages.Services
{
    public class SlugModel : PageModel
    {
        public required Service Service { get; set; }

        public IActionResult OnGet(string slug)
        {
            Service = ServiceRepository.GetService(slug);

            if (Service == null)
                return NotFound();

            return Page();
        }
    }
}