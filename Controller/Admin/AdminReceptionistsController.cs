// ── Controllers/AdminReceptionistsController.cs ──────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/receptionists")]
[IgnoreAntiforgeryToken]
public class AdminReceptionistsController : ControllerBase
{
    private readonly ReceptionistService _svc;
    private readonly ILogger<AdminReceptionistsController> _logger;

    public AdminReceptionistsController(
        ReceptionistService svc,
        ILogger<AdminReceptionistsController> logger)
    {
        _svc    = svc;
        _logger = logger;
    }

    // ── GET /api/admin/receptionists ──────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetReceptionists()
    {
        try
        {
            var data = await _svc.GetAllWithProfilesAsync();
            return Ok(new { ok = true, data = data });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetReceptionists failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── GET /api/admin/receptionists/available-users ──────────────────────────
    [HttpGet("available-users")]
    public async Task<IActionResult> GetAvailableUsers()
    {
        try
        {
            var profiles = await _svc.GetAvailableProfilesAsync();
            return Ok(new { ok = true, data = profiles });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GetAvailableReceptionistUsers failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/receptionists ─────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateReceptionist([FromBody] CreateReceptionistRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.ProfileId))
            return BadRequest(new { ok = false, error = "User profile must be selected." });

        try
        {
            var result = await _svc.CreateAsync(r.ProfileId, r.DeskLocation, r.IsActive);
            return Ok(new { ok = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CreateReceptionist failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── PUT /api/admin/receptionists/{id} ─────────────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateReceptionist(string id, [FromBody] UpdateReceptionistRequest r)
    {
        try
        {
            var result = await _svc.UpdateAsync(id, r.DeskLocation, r.IsActive);
            return Ok(new { ok = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateReceptionist {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── DELETE /api/admin/receptionists/{id} — soft delete ────────────────────
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteReceptionist(string id)
    {
        try
        {
            await _svc.SoftDeleteAsync(id);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DeleteReceptionist {Id} failed", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────
public record CreateReceptionistRequest(string ProfileId, string? DeskLocation, bool IsActive = true);
public record UpdateReceptionistRequest(string? DeskLocation, bool IsActive = true);
