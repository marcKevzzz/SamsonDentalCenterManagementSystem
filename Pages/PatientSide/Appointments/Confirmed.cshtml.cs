using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Threading.Tasks;

namespace SamsonDentalCenterManagementSystem.Pages.PatientSide.Appointments
{
    public class ConfirmedModel : PageModel
    {
        private readonly AppointmentService _apptService;

        public Appointment? AppointmentDetails { get; set; }

        public ConfirmedModel(AppointmentService apptService)
        {
            _apptService = apptService;
        }

        public async Task<IActionResult> OnGetAsync([FromQuery] string id)
        {
            if (!string.IsNullOrEmpty(id))
            {
                AppointmentDetails = await _apptService.GetById(id);
            }

            return Page();
        }
    }
}
