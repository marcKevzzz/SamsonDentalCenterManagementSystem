using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;
using Microsoft.AspNetCore.Authorization;

namespace SamsonDentalCenterManagementSystem.Controllers
{
    [ApiController]
    [Route("api/services")]
    [IgnoreAntiforgeryToken]
    public class ServicesController : ControllerBase
    {
        private readonly DentalServiceService _svcService;

         private readonly ProfileService _profileService;

        public ServicesController(DentalServiceService svcService, ProfileService profileService)
        {
            _svcService = svcService;
            _profileService = profileService;
        }

        // GET: api/services
        // [HttpGet]
        // public async Task<ActionResult<List<DentalService>>> GetServices()
        // {
        //     return await Task.FromResult(ServiceRepository.Services);
        // }

        

        // GET /api/services — public, active only
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var services = await _svcService.GetAll(activeOnly: true);
            return Ok(services.Select(ToDto));
        }

        // GET /api/services/all — admin, includes inactive
        [HttpGet("all")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> GetAllAdmin()
        {
            var services = await _svcService.GetAll(activeOnly: false);
            return Ok(services.Select(ToDto));
        }

        // GET /api/services/{slug}
        [HttpGet("{slug}")]
        public async Task<IActionResult> GetOne(string slug)
        {
            var svc = await _svcService.GetBySlug(slug);
            if (svc == null) return NotFound(new { ok = false, error = "Service not found." });
            return Ok(ToDto(svc));
        }

        // POST /api/services — admin only
        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Create([FromBody] ServicePayload p)
        {
            if (string.IsNullOrWhiteSpace(p.Name) || string.IsNullOrWhiteSpace(p.Category))
                return BadRequest(new { ok = false, error = "Name and category are required." });

            // Auto-generate slug from name if not provided
            if (string.IsNullOrWhiteSpace(p.Slug))
                p.Slug = p.Name!.ToLower().Replace(" ", "-").Replace("/", "-");

            try
            {
                var svc = await _svcService.Create(p);
                return Ok(new { ok = true, id = svc.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ServicesController.Create] {ex.Message}");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        // PUT /api/services/{id}
        [HttpPut("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Update(string id, [FromBody] ServicePayload p)
        {
            try
            {
                await _svcService.Update(id, p);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ServicesController.Update] {ex.Message}");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        // DELETE /api/services/{id}
        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                await _svcService.Delete(id);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ServicesController.Delete] {ex.Message}");
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpPost("upload-service-hero")]
public async Task<IActionResult> UploadServiceHero(IFormFile file, [FromQuery] string serviceId)
{
    var userId = User.FindFirst("sub")?.Value;
    if (string.IsNullOrEmpty(userId))
        return Unauthorized(new { ok = false, error = "Not authenticated." });

    if (file == null || file.Length == 0)
        return BadRequest(new { ok = false, error = "No file provided." });

    if (file.Length > 10 * 1024 * 1024)
        return BadRequest(new { ok = false, error = "File exceeds 10MB limit." });

    try
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();
        var ext   = Path.GetExtension(file.FileName);
        var path  = $"service-heroes/{serviceId}{ext}";

        await _profileService.UploadFileToStorage("heroes", path, bytes, file.ContentType);

        var publicUrl = _profileService.GetPublicUrl("heroes", path);
        return Ok(new { ok = true, url = publicUrl });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[UploadServiceHero] Error: {ex.Message}");
        return StatusCode(500, new { ok = false, error = ex.Message });
    }
}

        // ── Map to safe DTO ───────────────────────────────────────────────────────
        private static object ToDto(DentalService s) => new
        {
            id = s.Id,
            slug = s.Slug,
            category = s.Category,
            name = s.Name,
            tagline = s.Tagline,
            hero = s.Hero,
            icon = s.Icon,
            summary = s.Summary,
            duration = s.Duration,
            recovery = s.Recovery,
            price = s.Price,
            benefits = s.Benefits,
            steps = s.Steps,
            faqs = s.Faqs,
            isActive = s.IsActive
        };
    }
}