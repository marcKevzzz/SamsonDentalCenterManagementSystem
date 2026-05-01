using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers.Admin;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/blocked-dates")]
[IgnoreAntiforgeryToken]
public class AdminBlockedDatesController : ControllerBase
{
    private readonly BlockedDateService _blocked;
    private readonly AppointmentService _appointments;
    private readonly ILogger<AdminBlockedDatesController> _logger;

    public AdminBlockedDatesController(
        BlockedDateService blocked,
        AppointmentService appointments,
        ILogger<AdminBlockedDatesController> logger)
    {
        _blocked = blocked;
        _appointments = appointments;
        _logger = logger;
    }

    // GET /api/admin/blocked-dates
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var dates = await _blocked.GetAllAsync();
            var dtos = dates.Select(b => new
            {
                id = b.Id,
                blockedDate = b.Date.ToString("yyyy-MM-dd"),
                reason = b.Reason,
                createdAt = b.CreatedAt,
            });
            return Ok(new { ok = true, data = dtos });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // GET /api/admin/blocked-dates/strings — for calendar/patient booking check
    [HttpGet("strings")]
    [AllowAnonymous]
    public async Task<IActionResult> GetStrings()
    {
        try
        {
            var dates = await _blocked.GetBlockedDateStringsAsync();
            return Ok(new { ok = true, data = dates });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // POST /api/admin/blocked-dates
    // Body: { date: "yyyy-MM-dd", reason: "..." }
    // Returns: blocked entry + list of conflicting appointments on that day
    [HttpPost]
    public async Task<IActionResult> Block([FromBody] BlockDateRequest req)
    {
        try
        {
            if (!DateTime.TryParse(req.Date, out var date))
                return BadRequest(new { ok = false, error = "Invalid date format." });

            // Check if already blocked
            if (await _blocked.IsDateBlockedAsync(date))
                return Conflict(new { ok = false, error = "Date is already blocked." });

            // Find existing appointments on this date
            var all = await _appointments.GetAllAsync();
            var conflicts = all
                .Where(a => a.AppointmentDate.Date == date.Date
                    && a.Status != "cancelled"
                    && a.Status != "completed"
                    && a.Status != "no_show")
                .Select(a => new
                {
                    id = a.Id,
                    patientName = a.PatientName,
                    patientEmail = a.PatientEmail,
                    patientPhone = a.PatientPhone,
                    appointmentTime = a.AppointmentTime,
                    serviceName = a.Service?.Name,
                    status = a.Status,
                })
                .ToList();

            var profileId = User.FindFirst("sub")?.Value;
            var entry = await _blocked.BlockDateAsync(date, req.Reason, profileId);

            return Ok(new
            {
                ok = true,
                data = new
                {
                    id = entry.Id,
                    blockedDate = entry.Date.ToString("yyyy-MM-dd"),
                    reason = entry.Reason,
                    conflicts,
                    conflictCount = conflicts.Count,
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Block date failed");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // DELETE /api/admin/blocked-dates/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Unblock(string id)
    {
        try
        {
            await _blocked.UnblockDateAsync(id);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}

public record BlockDateRequest(string Date, string? Reason);
