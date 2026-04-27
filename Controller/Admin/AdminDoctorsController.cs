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
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorRequest d)
    {
        if (string.IsNullOrWhiteSpace(d.ProfileId))
            return BadRequest(new { ok = false, error = "User profile must be selected." });

        try
        {
            var result = await _doctorService.CreateAsync(
                d.ProfileId, d.Title ?? "Dr.", d.Specialties, d.Bio, d.IsActive);
            return Ok(new { ok = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateDoctor failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── PUT /api/admin/doctors/{id} ───────────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDoctor(string id, [FromBody] UpdateDoctorRequest d)
    {
        try
        {
            var result = await _doctorService.UpdateAsync(
                id, d.Title ?? "Dr.", d.Specialties, d.Bio, d.IsActive);
            return Ok(new { ok = true, data = result });
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
            await _doctorService.SoftDeleteAsync(id);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteDoctor {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("{id}/availability")]
    public async Task<IActionResult> SetAvailability(
        string id, [FromBody] List<DoctorAvailability> slots)
    {
        try
        {
            await _doctorService.SetAvailabilityAsync(id, slots);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SetAvailability for {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateDoctorRequest(
    string ProfileId, string? Title, string[]? Specialties, string? Bio, bool IsActive = true);
public record UpdateDoctorRequest(
    string? Title, string[]? Specialties, string? Bio, bool IsActive = true);