// ── Controllers/AdminAppointmentsController.cs ───────────────────────────────
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/admin/appointments")]
public class AdminAppointmentsController : ControllerBase
{
    private readonly AppointmentService _appointments;
    private readonly ILogger<AdminAppointmentsController> _logger;

    public AdminAppointmentsController(
        AppointmentService appointments,
        ILogger<AdminAppointmentsController> logger)
    {
        _appointments = appointments;
        _logger       = logger;
    }

    // ── POST /api/admin/appointments/book ─────────────────────────────────────
    [HttpPost("book")]
    public async Task<IActionResult> Book([FromBody] AppointmentPayload payload)
    {
        try
        {
            var appt = await _appointments.Create(payload);
            return Ok(new { ok = true, id = appt.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to book appointment");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/appointments/status ───────────────────────────────────
    [HttpPost("status")]
    public async Task<IActionResult> UpdateStatus([FromBody] UpdateStatusRequest req)
    {
        try
        {
            await _appointments.UpdateStatus(req.Id, req.Status);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/appointments/reschedule ───────────────────────────────
    [HttpPost("reschedule")]
    public async Task<IActionResult> Reschedule([FromBody] RescheduleRequest req)
    {
        try
        {
            await _appointments.Reschedule(req.Id, req.NewDate, req.NewTime, req.DoctorId);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reschedule");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/appointments/slots ────────────────────────────────────
    [HttpPost("slots")]
    public async Task<IActionResult> GetSlots([FromBody] SlotRequest req)
    {
        try
        {
            var date  = DateTime.Parse(req.Date);
            var avail = await _appointments.GetAvailability(req.Category, date);
            return Ok(new { ok = true, slots = avail });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────
    public record UpdateStatusRequest(string Id, string Status);
    public record RescheduleRequest(string Id, DateTime NewDate, string NewTime, string? DoctorId);
    public record SlotRequest(string ServiceId, string Category, string Date);
}