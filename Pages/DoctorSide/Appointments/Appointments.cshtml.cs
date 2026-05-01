using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;
using Microsoft.AspNetCore.Authorization;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide.Appointments;

[IgnoreAntiforgeryToken]
public class AppointmentsModel : AdminPageModel
{
    private readonly AppointmentService _appointments;
    private readonly DoctorService _doctorService;
    private readonly DentalServiceService _services;
    private readonly ILogger<AppointmentsModel> _logger;
    private readonly SessionHelper _sessionHelper;

    public AppointmentsModel(
        AppointmentService appointments,
        DoctorService doctorService,
        DentalServiceService services,
        ILogger<AppointmentsModel> logger,
        SessionHelper sessionHelper,
        ProfileService profileService)
        : base(profileService)
    {
        _appointments = appointments;
        _doctorService = doctorService;
        _services     = services;
        _logger       = logger;
        _sessionHelper = sessionHelper;
    }

    public List<Appointment>    Appointments { get; set; } = new();
    public List<DentalService>  Services     { get; set; } = new();

    public int CountConfirmed => Appointments.Count(a => string.Equals(a.Status, "confirmed", StringComparison.OrdinalIgnoreCase));
    public int CountPending   => Appointments.Count(a => string.Equals(a.Status, "pending", StringComparison.OrdinalIgnoreCase));
    public int CountCancelled => Appointments.Count(a => string.Equals(a.Status, "cancelled", StringComparison.OrdinalIgnoreCase));
    public int CountWaitlist  => Appointments.Count(a => string.Equals(a.Status, "waitlist", StringComparison.OrdinalIgnoreCase));

    public async Task<IActionResult> OnGetAsync()
    {
        var token = await _sessionHelper.GetValidTokenAsync();
        
        if (token == null || (CurrentUserRole != "doctor" && CurrentUserRole != "admin"))
        {
            return RedirectToPage("/Sign-in");
        }

        try
        {
            var doc = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
            if (doc != null)
            {
                var res = await _appointments.GetByDoctorIdAsync(doc.Id);
                Appointments = res.OrderByDescending(a => a.AppointmentDate).ToList();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load doctor appointments");
        }

        try { Services = await _services.GetAll(); }
        catch (Exception ex) { _logger.LogError(ex, "Failed to load services"); }
        return Page();
    }

    public async Task<IActionResult> OnPostBookAsync([FromBody] AppointmentPayload payload)
    {
        try
        {
            if (payload == null) return new JsonResult(new { ok = false, error = "Invalid data" });
            var appt = await _appointments.Create(payload);
            return new JsonResult(new { ok = true, id = appt.Id });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to book appointment");
            return new JsonResult(new { ok = false, error = ex.Message }) { StatusCode = 500 };
        }
    }

    public async Task<IActionResult> OnPostUpdateStatusAsync([FromBody] UpdateStatusRequest req)
    {
        try
        {
            await _appointments.UpdateStatus(req.Id, req.Status, req.DoctorId);
            return new JsonResult(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status");
            return new JsonResult(new { ok = false, error = ex.Message }) { StatusCode = 500 };
        }
    }

    public async Task<IActionResult> OnPostRescheduleAsync([FromBody] RescheduleRequest req)
    {
        try
        {
            await _appointments.Reschedule(req.Id, req.NewDate, req.NewTime, req.DoctorId);
            return new JsonResult(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reschedule");
            return new JsonResult(new { ok = false, error = ex.Message }) { StatusCode = 500 };
        }
    }

    public async Task<IActionResult> OnPostDeleteAsync([FromBody] DeleteRequest req)
    {
        try
        {
            await _appointments.Delete(req.Id);
            return new JsonResult(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete appointment");
            return new JsonResult(new { ok = false, error = ex.Message }) { StatusCode = 500 };
        }
    }

    public async Task<IActionResult> OnPostGetSlotsAsync([FromBody] SlotRequest req)
    {
        try
        {
            if (!DateTime.TryParse(req.Date, out var date))
            {
                return new JsonResult(new { ok = false, error = "Invalid date format" });
            }
            var avail = await _appointments.GetAvailability(req.Category, date);
            return new JsonResult(new { ok = true, slots = avail });
        }
        catch (Exception ex)
        {
            return new JsonResult(new { ok = false, error = ex.Message }) { StatusCode = 500 };
        }
    }

    public record UpdateStatusRequest(string Id, string Status, string? DoctorId = null);
    public record RescheduleRequest(string Id, DateTime NewDate, string NewTime, string? DoctorId);
    public record SlotRequest(string ServiceId, string Category, string Date);
    public record DeleteRequest(string Id);
}
