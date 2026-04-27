using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages;

public class AdminDashboardModel : AdminPageModel
{
    private readonly ILogger<AdminDashboardModel> _logger;
    private readonly AppointmentService _appointmentService;
    private readonly InvoiceService _invoiceService;
    private readonly ProfileService _profileService;

    public AdminDashboardModel(
        ILogger<AdminDashboardModel> logger, 
        ProfileService profileService,
        AppointmentService appointmentService,
        InvoiceService invoiceService)
        : base(profileService)
    {
        _logger = logger;
        _appointmentService = appointmentService;
        _invoiceService = invoiceService;
        _profileService = profileService;
    }

    public List<Invoice> RecentInvoices { get; set; } = new();
    public List<Appointment> UpcomingAppointments { get; set; } = new();
    
    public int TotalPatientsCount { get; set; }
    public int DoctorsCount { get; set; }
    public int TodayAppointmentsCount { get; set; }
    public decimal MonthlyRevenue { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        // 1. Fetch Stats
        var allProfiles = await _profileService.GetAllProfiles();
        TotalPatientsCount = allProfiles.Count(p => p.Role == "patient");
        
        var doctorService = HttpContext.RequestServices.GetRequiredService<DoctorService>();
        var allDoctors = await doctorService.GetAllWithProfilesAsync();
        DoctorsCount = allDoctors.Count(d => d.IsActive);

        var allAppts = await _appointmentService.GetAllAsync();
        TodayAppointmentsCount = allAppts.Count(a => a.AppointmentDate.Date == DateTime.Today);
        UpcomingAppointments = allAppts
            .Where(a => a.AppointmentDate.Date >= DateTime.Today && a.Status != "cancelled" && a.Status != "arrived")
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.AppointmentTime)
            .Take(5)
            .ToList();


        // 2. Fetch Invoices
        var allInvoices = await _invoiceService.GetAllInvoicesAsync();
        RecentInvoices = allInvoices.Take(5).ToList();
        
        MonthlyRevenue = allInvoices
            .Where(i => i.CreatedAt.Month == DateTime.Today.Month && i.CreatedAt.Year == DateTime.Today.Year && i.Status == "paid")
            .Sum(i => i.FinalAmount);

        return Page();
    }
}
