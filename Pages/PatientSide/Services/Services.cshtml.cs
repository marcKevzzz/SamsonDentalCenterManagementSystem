using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages;

public class ServicesModel : PageModel
{
   

   public List<DentalService> Services { get; set; } = [];

    public void OnGet()
    {
        Services = ServiceRepository.Services;
    }

}
