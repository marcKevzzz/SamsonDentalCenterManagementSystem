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
        // Data handled by AdminStore on the client side
        return Page();
    }
}
