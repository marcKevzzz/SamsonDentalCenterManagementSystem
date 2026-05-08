using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Models;

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
    private readonly RecordService _recordService;
    private readonly ReviewService _reviewService;

    public PatientDataController(
        ProfileService profileService,
        AppointmentService appointmentService,
        NotificationService notificationService,
        InvoiceService invoiceService,
        RecordService recordService,
        ReviewService reviewService)
    {
        _profileService = profileService;
        _appointmentService = appointmentService;
        _notificationService = notificationService;
        _invoiceService = invoiceService;
        _recordService = recordService;
        _reviewService = reviewService;
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
            var treatments = await _recordService.GetTreatmentsByPatientAsync(userId);

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

    [HttpPost("submit-review")]
    public async Task<IActionResult> SubmitReview([FromBody] ReviewPayload payload)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var profile = await _profileService.GetProfileById(userId);
            var authorName = profile != null ? $"{profile.FirstName} {profile.LastName}" : "Patient";

            var review = new Review
            {
                AuthorName = authorName,
                PatientId = userId,
                AuthorAvatar = profile?.AvatarUrl,
                Rating = payload.Rating,
                ReviewText = payload.ReviewText,
                Platform = "Patient Portal",
                IsVisible = false, // Admin must approve
                ReviewDate = DateTime.UtcNow
            };

            await _reviewService.AddReviewAsync(review);

            return Ok(new { ok = true, message = "Thank you for your feedback! Your review has been submitted for approval." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    public class ReviewPayload
    {
        public int Rating { get; set; }
        public string ReviewText { get; set; } = string.Empty;
    }

}
