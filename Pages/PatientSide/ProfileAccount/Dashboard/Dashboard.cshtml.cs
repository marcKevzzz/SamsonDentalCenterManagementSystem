using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Security.Claims;

namespace SamsonDentalCenterManagementSystem.Pages;

public class DashboardModel : PageModel
{
    private readonly AppointmentService _appointmentService;

    public DashboardModel(AppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    public List<Appointment> Appointments { get; set; } = new();
    public Appointment? NextAppointment { get; set; }
    
    public int TotalCount => Appointments.Count;
    public int UpcomingCount => Appointments.Count(a => (a.Status == "confirmed" || a.Status == "pending") && a.AppointmentDate.Date >= DateTime.Today);
    public int CompletedCount => Appointments.Count(a => a.Status == "completed" || (a.Status == "confirmed" && a.AppointmentDate.Date < DateTime.Today));

    public string PatientName { get; set; } = "Patient";

    public async Task OnGetAsync([FromQuery] string? uid)
    {
        var patientId = uid ?? User.FindFirstValue("sub"); 

        if (!string.IsNullOrEmpty(patientId))
        {
            Appointments = await _appointmentService.GetByPatient(patientId);
            
            // Sort to find the next one
            NextAppointment = Appointments
                .Where(a => (a.Status == "confirmed" || a.Status == "pending") && a.AppointmentDate.Date >= DateTime.Today)
                .OrderBy(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .FirstOrDefault();

            if (Appointments.Any())
            {
                PatientName = Appointments.First().PatientName;
            }
        }
    }
}
