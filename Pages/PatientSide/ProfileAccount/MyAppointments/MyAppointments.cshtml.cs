using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Security.Claims;

namespace SamsonDentalCenterManagementSystem.Pages;

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
            // 2. Fetch from Supabase via our service
            Appointments = await _appointmentService.GetByPatient(patientId);

            // 3. Fetch review stats
            var stats = await _reviewService.GetPatientReviewStatsAsync(patientId);
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