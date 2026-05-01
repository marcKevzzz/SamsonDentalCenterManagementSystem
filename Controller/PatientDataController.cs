using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers.Patient;

[Authorize]
[ApiController]
[Route("api/patient/data")]
[IgnoreAntiforgeryToken]
public class PatientDataController : ControllerBase
{
    private readonly ProfileService _profileService;
    private readonly AppointmentService _appointmentService;
    private readonly NotificationService _notificationService;
    private readonly InvoiceService _invoiceService;

    public PatientDataController(
        ProfileService profileService,
        AppointmentService appointmentService,
        NotificationService notificationService,
        InvoiceService invoiceService)
    {
        _profileService = profileService;
        _appointmentService = appointmentService;
        _notificationService = notificationService;
        _invoiceService = invoiceService;
    }

    [HttpGet("check-shadow")]
    public async Task<IActionResult> CheckShadowProfiles()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email))
                return Unauthorized();

            var shadowProfiles = await _profileService.GetShadowProfilesForEmail(email, userId);
            
            return Ok(new { ok = true, hasShadowProfiles = shadowProfiles.Any(), count = shadowProfiles.Count, profiles = shadowProfiles });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("claim-records")]
    public async Task<IActionResult> ClaimRecords()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(email))
                return Unauthorized();

            var shadowProfiles = await _profileService.GetShadowProfilesForEmail(email, userId);
            
            if (!shadowProfiles.Any())
                return BadRequest(new { ok = false, error = "No records to claim." });

            foreach (var shadow in shadowProfiles)
            {
                await _profileService.MergeProfile(shadow.Id, userId);
            }

            return Ok(new { ok = true, message = "Records successfully claimed and linked to your account." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("counts")]
    public async Task<IActionResult> GetCounts()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var appointments = await _appointmentService.GetByPatient(userId);
            var unreadNotifs = await _notificationService.GetUnreadCountAsync(userId);
            var invoices = await _invoiceService.GetInvoicesByPatientIdAsync(userId);

            return Ok(new {
                ok = true,
                data = new {
                    pendingAppointments = appointments.Count(a => a.Status.ToLower() == "pending"),
                    unreadNotifications = unreadNotifs,
                    totalRecords = invoices.Count
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            return Ok(new { ok = true, data = notifications });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("notifications/read/{id}")]
    public async Task<IActionResult> MarkRead(string id)
    {
        try
        {
            await _notificationService.MarkAsReadAsync(id);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}
