using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Controllers
{
    [ApiController]
    [Route("api/services")]
    public class ServicesController : ControllerBase
    {
        // GET: api/services
        [HttpGet]
        public ActionResult<List<DentalService>> GetServices()
        {
            return ServiceRepository.Services;
        }

        // GET: api/services/dental-checkup
        [HttpGet("{slug}")]
        public ActionResult<DentalService> GetService(string slug)
        {
            var service = ServiceRepository.Services
                .FirstOrDefault(s => s.Slug == slug);

            if (service == null)
                return NotFound();

            return service;
        }
    }
}