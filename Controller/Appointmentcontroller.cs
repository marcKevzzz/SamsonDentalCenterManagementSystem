// ── Controllers/AppointmentsController.cs ────────────────────────────────────
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/appointments")]
[IgnoreAntiforgeryToken]
public class AppointmentsController : ControllerBase
{
    private readonly AppointmentService _apptService;
    private readonly BlockedDateService _blockedDates;

    public AppointmentsController(AppointmentService apptService, BlockedDateService blockedDates)
    {
        _apptService = apptService;
        _blockedDates = blockedDates;
    }

    // GET /api/appointments/check-date?date=yyyy-MM-dd
    // Used by patient-side calendar to mark blocked dates
    [HttpGet("check-date")]
    public async Task<IActionResult> CheckDate([FromQuery] string date)
    {
        if (!DateTime.TryParse(date, out var d))
            return BadRequest(new { ok = false, error = "Invalid date." });
        var blocked = await _blockedDates.IsDateBlockedAsync(d);
        return Ok(new { ok = true, blocked });
    }

    // GET /api/appointments/blocked-dates
    [HttpGet("blocked-dates")]
    public async Task<IActionResult> GetBlockedDates()
    {
        var dates = await _blockedDates.GetBlockedDateStringsAsync();
        return Ok(dates);
    }

    // GET /api/appointments/doctors?category=Cosmetic
    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors([FromQuery] string? category)
    {
        var doctors = string.IsNullOrEmpty(category)
            ? await _apptService.GetDoctors()
            : await _apptService.GetDoctorsForService(category);

        return Ok(doctors.Select(d => new
        {
            id          = d.Id,
            doctorName  = d.Profile != null ? $"{d.Title} {d.Profile.FirstName} {d.Profile.LastName}" : "Unknown",
            title       = d.Title,
            specialties = d.Specialties,
            bio         = d.Bio
        }));
    }

    // GET /api/appointments/availability?serviceId=xxx&category=Cosmetic&date=2026-04-20
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] string category,
        [FromQuery] string date,
        [FromQuery] string? serviceId = null)
    {

        if (!DateTime.TryParse(date, out var parsedDate))
            return BadRequest(new { ok = false, error = "Invalid date format." });

        var availability = await _apptService.GetAvailability(category, parsedDate, serviceId);
        return Ok(availability);
    }

    // POST /api/appointments
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AppointmentPayload p)
    {
        // Basic validation
        if (string.IsNullOrWhiteSpace(p.PatientFirstName) ||
            string.IsNullOrWhiteSpace(p.PatientLastName) ||
            string.IsNullOrWhiteSpace(p.PatientEmail) ||
            string.IsNullOrWhiteSpace(p.PatientPhone))
            return BadRequest(new { ok = false, error = "Patient first name, last name, email, and phone are required." });

        if (!p.IsWaitlist && string.IsNullOrWhiteSpace(p.AppointmentTime))
            return BadRequest(new { ok = false, error = "Appointment time is required." });

        // Guard: blocked date
        if (!p.IsWaitlist)
        {
            if (DateTime.TryParse(p.AppointmentDate, out var parsedDate))
            {
                var isBlocked = await _blockedDates.IsDateBlockedAsync(parsedDate.Date);
                if (isBlocked)
                    return Conflict(new { ok = false, error = "This date has been blocked by the clinic. Please choose another date." });
            }
        }


        try
        {
            var appt = await _apptService.Create(p);

            // FIX Bug 4: surface the actual status to the client
            return Ok(new
            {
                ok                = true,
                id                = appt.Id,
                emailStatus            = appt.EmailStatus,   // "confirmed" | "pending" | "waitlist"
                status            = appt.Status,   // "confirmed" | "pending" | "waitlist"
                isGuest           = appt.IsGuest,
                isWaitlist        = appt.IsWaitlist,
                needsConfirmation = appt.EmailStatus == "pending" && !appt.IsWaitlist,  // only pending non-waitlist needs confirm
                token             = appt.ConfirmationToken,
                refNumber         = $"SDC-{appt.Id[..8].ToUpper()}"
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Appointments.Create] {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // GET /appointments/confirm?token=xxx  — guest email confirmation link
    [HttpGet("/appointments/confirm")]
    public async Task<IActionResult> ConfirmGuest([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Redirect("/appointments/invalid-token");

        var appt = await _apptService.ConfirmByToken(token);
        if (appt == null)
            return Redirect("/appointments/invalid-token");

        return Redirect($"/appointments/confirmed?id={appt.Id}");
    }

    // DELETE /api/appointments/{id}/cancel
    [HttpDelete("{id}/cancel")]
    [Authorize]
    public async Task<IActionResult> Cancel(string id)
    {
        try
        {
            await _apptService.Cancel(id);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // GET /api/appointments/my
    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMine()
    {
        var patientId = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(patientId)) return Unauthorized();

        var appts = await _apptService.GetByPatient(patientId);
        return Ok(appts.Select(a => new
        {
            id          = a.Id,
            serviceName = a.ServiceName,
            doctorName  = a.Doctor?.Profile != null ? $"{a.Doctor.Title} {a.Doctor.Profile.FirstName} {a.Doctor.Profile.LastName}" : null,
            date        = a.AppointmentDate.ToString("yyyy-MM-dd"),
            time        = a.AppointmentTime,
            emailStatus      = a.EmailStatus,
            status      = a.Status,
            isWaitlist  = a.IsWaitlist,
            isForOther  = a.IsForOther,
            otherFirstName   = a.OtherFirstName,
            otherLastName   = a.OtherLastName,
            otherPhone   = a.OtherPhone,
            otherEmail   = a.OtherEmail,
            patientFirstName = a.PatientFirstName,
            patientLastName = a.PatientLastName,
            patientName = a.PatientName
        }));
    }

    // GET /api/appointments/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var appt = await _apptService.GetById(id);
        if (appt == null) return NotFound(new { ok = false, error = "Appointment not found." });
        return Ok(new
        {
            ok = true,
            appointment = new
            {
                id          = appt.Id,
                serviceName = appt.ServiceName,
                doctorName  = appt.Doctor?.Profile != null ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}" : null,
                date        = appt.AppointmentDate.ToString("yyyy-MM-dd"),
                time        = appt.AppointmentTime,
                emailStatus      = appt.EmailStatus,
                status      = appt.Status,
                isWaitlist  = appt.IsWaitlist,
                isForOther  = appt.IsForOther,
                otherFirstName   = appt.OtherFirstName,
                otherLastName   = appt.OtherLastName,
                otherPhone   = appt.OtherPhone,
                otherEmail   = appt.OtherEmail,
                patientFirstName = appt.PatientFirstName,
                patientLastName = appt.PatientLastName,
                patientName = appt.PatientName,
                patientEmail = appt.PatientEmail,
                refNumber   = $"SDC-{appt.Id[..8].ToUpper()}"
            }
        });
    }
}