using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/public")]
public class PublicDataController : ControllerBase
{
    private readonly ClinicService _clinicService;
    private readonly DentalServiceService _dentalService;
    private readonly DoctorService _doctorService;
    private readonly AppointmentService _appointmentService;

    public PublicDataController(ClinicService clinicService, DentalServiceService dentalService, DoctorService doctorService, AppointmentService appointmentService)
    {
        _clinicService = clinicService;
        _dentalService = dentalService;
        _doctorService = doctorService;
        _appointmentService = appointmentService;
    }

    [HttpGet("init")]
    public async Task<IActionResult> GetInitData()
    {
        var settings = await _clinicService.GetSettingsAsync();
        var services = await _dentalService.GetAll(activeOnly: true);
        var doctors = await _doctorService.GetActiveWithProfilesAsync();

        return Ok(new
        {
            settings = new
            {
                name = settings.ClinicName,
                address = settings.LocationAddress,
                phone = settings.ContactPhone,
                email = settings.ContactEmail,
                hours = settings.ClinicalHours,
                faqs = settings.Faqs,
                chatbot = new
                {
                    enabled = settings.IsChatbotEnabled,
                    name = settings.ChatbotName,
                    welcome = settings.ChatbotWelcomeMessage
                },
                leadership = new
                {
                    ceo = settings.CeoName,
                    admin = settings.AdminName
                },
                integrity = settings.SystemIntegrityInfo,
                photos = settings.ClinicPhotos
            },
            services = services.Select(s => new
            {
                name = s.Name,
                category = s.Category,
                price = s.Price,
                duration = s.DurationMinutes,
                benefits = s.Benefits,
                steps = s.Steps
            }),
            doctors = doctors.Select(d => new
            {
                name = $"Dr. {d.Profile?.FirstName} {d.Profile?.LastName}",
                specialties = d.Specialties
            })
        });
    }

    [HttpPost("chatbot/save")]
    public async Task<IActionResult> SaveChatbotMessage([FromBody] ChatbotConversation msg)
    {
        if (string.IsNullOrWhiteSpace(msg.Message) || string.IsNullOrWhiteSpace(msg.SessionId))
            return BadRequest();

        try
        {
            await _clinicService.SaveChatbotConversationAsync(msg);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SaveChatbotMessage] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message, detail = ex.InnerException?.Message });
        }
    }

    [HttpGet("chatbot/history")]
    public async Task<IActionResult> GetChatbotHistory([FromQuery] string sessionId, [FromQuery] string? userId = null)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
            return BadRequest();

        var history = await _clinicService.GetChatbotHistoryAsync(sessionId, userId);
        
        // Project to a clean object to avoid serializing internal Supabase/BaseModel properties
        // which cause "System.NotSupportedException: The type 'PrimaryKeyAttribute' is not a supported dictionary key"
        var dtos = history.Select(h => new {
            id = h.Id,
            session_id = h.SessionId,
            user_id = h.UserId,
            message = h.Message,
            is_bot = h.IsBot,
            created_at = h.CreatedAt
        });

        return Ok(new { ok = true, data = dtos });
    }

    [HttpGet("confirm-promotion")]
    public async Task<IActionResult> ConfirmPromotion([FromQuery] string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return BadRequest();
        var appt = await _appointmentService.ConfirmPromotion(id);
        if (appt != null) return Redirect($"/appointments/confirmed?id={appt.Id}");
        return Redirect("/Appointments?error=expired");
    }

    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability([FromQuery] string date)
    {
        if (!DateTime.TryParse(date, out var parsedDate))
            return BadRequest(new { error = "Invalid date format." });

        await _appointmentService.CleanupExpiredWaitlistLocks();
        var fixedDate = parsedDate.Date;
        var settings = await _clinicService.GetSettingsAsync();
        
        // 1. Check if blocked
        var blockedDateService = HttpContext.RequestServices.GetRequiredService<BlockedDateService>();
        if (await blockedDateService.IsDateBlockedAsync(fixedDate))
        {
            return Ok(new { status = "blocked", reason = "Scheduled clinic event" });
        }

        // 2. Check clinic hours
        var dayName = fixedDate.DayOfWeek.ToString();
        var hours = settings.ClinicalHours.FirstOrDefault(h => h.Day.Equals(dayName, StringComparison.OrdinalIgnoreCase));
        if (hours == null || hours.Closed)
        {
            return Ok(new { status = "closed", day = dayName });
        }

        // 3. Fetch occupied slots (simplified for chatbot)
        var appointmentService = HttpContext.RequestServices.GetRequiredService<AppointmentService>();
        var busySlots = await appointmentService.GetBookedAppointments(null, fixedDate); 
        
        return Ok(new
        {
            status = "open",
            date = fixedDate.ToString("yyyy-MM-dd"),
            day = dayName,
            hours = new { open = hours.Open, close = hours.Close },
            busy_count = busySlots.Count
        });
    }

    [HttpPost("chatbot/upload-clinic-photo")]
    public async Task<IActionResult> UploadClinicPhoto(IFormFile file, [FromForm] string? bucket = "clinic-photos")
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { ok = false, error = "No file provided." });

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var targetBucket = string.IsNullOrWhiteSpace(bucket) ? "clinic-photos" : bucket;
            var url = await _clinicService.UploadPhotoAsync(file.FileName, bytes, file.ContentType, targetBucket);

            return Ok(new { ok = true, url = url });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UploadClinicPhoto] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}
