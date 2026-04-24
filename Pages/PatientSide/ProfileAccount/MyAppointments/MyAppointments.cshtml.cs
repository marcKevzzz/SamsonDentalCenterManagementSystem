using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Security.Claims;

namespace SamsonDentalCenterManagementSystem.Pages;

public class MyAppointmentsModel : PageModel
{
    private readonly AppointmentService _appointmentService;

    public MyAppointmentsModel(AppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    public List<Appointment> Appointments { get; set; } = new();
    
    // Stats for the UI
    public int TotalCount => Appointments.Count;
    public int UpcomingCount => Appointments.Count(a => (a.Status == "confirmed" || a.Status == "pending") && a.AppointmentDate.Date >= DateTime.Today);
    public int CompletedCount => Appointments.Count(a => a.Status == "completed" || (a.Status == "confirmed" && a.AppointmentDate.Date < DateTime.Today));

    public async Task OnGetAsync()
    {
        // 1. Get the Patient ID from the logged-in user's claims
        var patientId = User.FindFirstValue("sub"); 

        if (!string.IsNullOrEmpty(patientId))
        {
            // 2. Fetch from Supabase via our service
            Appointments = await _appointmentService.GetByPatient(patientId);
        }
    }
}