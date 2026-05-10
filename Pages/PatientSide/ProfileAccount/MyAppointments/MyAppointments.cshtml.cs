using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Security.Claims;

namespace SamsonDentalCenterManagementSystem.Pages.Patient;

public class MyAppointmentsModel : PageModel
{
    private readonly AppointmentService _appointmentService;
    private readonly ReviewService _reviewService;

    public MyAppointmentsModel(AppointmentService appointmentService, ReviewService reviewService)
    {
        _appointmentService = appointmentService;
        _reviewService = reviewService;
    }

    public List<Appointment> Appointments { get; set; } = new();
    
    // Stats for the UI
    public int TotalCount => Appointments.Count;
    public int UpcomingCount => Appointments.Count(a => (a.Status == "confirmed" || a.Status == "pending") && a.AppointmentDate.Date >= DateTime.Today);
    public int CompletedCount => Appointments.Count(a => a.Status == "completed");
    public string AverageRating { get; set; } = "0.0";
    public int ReviewCount { get; set; }

    public async Task OnGetAsync()
    {
        // 1. Get the Patient ID from the logged-in user's claims
        var patientId = User.FindFirstValue("sub"); 

        if (!string.IsNullOrEmpty(patientId))
        {
            // 2. Fetch both appointments and review stats in parallel
            var apptsTask = _appointmentService.GetByPatient(patientId);
            var statsTask = _reviewService.GetPatientReviewStatsAsync(patientId);

            await Task.WhenAll(apptsTask, statsTask);

            Appointments = await apptsTask;
            var stats = await statsTask;

            if (stats.count > 0)
            {
                AverageRating = stats.average.ToString("F1");
                ReviewCount = stats.count;
            }
            else
            {
                AverageRating = "No reviews yet";
            }
        }
    }
}