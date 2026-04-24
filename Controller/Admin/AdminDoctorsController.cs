// ── Controllers/AdminDoctorsController.cs ────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/doctors")]
[IgnoreAntiforgeryToken]
public class AdminDoctorsController : ControllerBase
{
    private readonly Supabase.Client _supabase;
    private readonly DoctorService _doctorService;
    private readonly ILogger<AdminDoctorsController> _logger;

    public AdminDoctorsController(
        Supabase.Client supabase,
        DoctorService doctorService,
        ILogger<AdminDoctorsController> logger)
    {
        _supabase      = supabase;
        _doctorService = doctorService;
        _logger        = logger;
    }

    // ── GET /api/admin/doctors ────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetDoctors()
    {
        try
        {
            var doctors = await _doctorService.GetAllWithProfilesAsync();
            return Ok(new { ok = true, data = doctors });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetDoctors failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── GET /api/admin/doctors/available-users ────────────────────────────────
    [HttpGet("available-users")]
    public async Task<IActionResult> GetAvailableUsers()
    {
        try
        {
            var profiles = await _doctorService.GetAvailableProfilesAsync();
            return Ok(new { ok = true, data = profiles });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetAvailableUsers failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/doctors ───────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateDoctor([FromBody] Doctor d)
    {
        if (string.IsNullOrWhiteSpace(d.ProfileId))
            return BadRequest(new { ok = false, error = "User profile must be selected." });

        try
        {
            var res = await _supabase.From<Doctor>().Insert(d);
            return Ok(new { ok = true, data = res.Models.FirstOrDefault() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateDoctor failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── PUT /api/admin/doctors/{id} ───────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDoctor(string id, [FromBody] Doctor d)
    {
        try
        {
            var res = await _supabase
                .From<Doctor>()
                .Where(x => x.Id == id)
                .Set(x => x.Title,       d.Title)
                .Set(x => x.Specialties, d.Specialties)
                .Set(x => x.Bio,         d.Bio)
                .Set(x => x.IsActive,    d.IsActive)
                .Update();

            return Ok(new { ok = true, data = res.Models.FirstOrDefault() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateDoctor {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── DELETE /api/admin/doctors/{id} — soft delete ──────────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDoctor(string id)
    {
        try
        {
            await _supabase
                .From<Doctor>()
                .Where(x => x.Id == id)
                .Set(x => x.IsActive, false)
                .Update();

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteDoctor {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/doctors/{id}/availability ─────────────────────────────
    [HttpPost("{id}/availability")]
    public async Task<IActionResult> SetAvailability(
        string id, [FromBody] List<DoctorAvailability> slots)
    {
        try
        {
            await _supabase
                .From<DoctorAvailability>()
                .Where(a => a.DoctorId == id)
                .Delete();

            if (slots.Any())
            {
                foreach (var s in slots)
                {
                    s.Id       = Guid.NewGuid().ToString();
                    s.DoctorId = id;
                }
                await _supabase.From<DoctorAvailability>().Insert(slots);
            }

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SetAvailability for {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}