using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.ReceptionistSide.Dashboard;

public class DashboardModel : AdminPageModel
{
    private readonly ILogger<DashboardModel> _logger;
    private readonly AppointmentService _appointmentService;
    private readonly InvoiceService _invoiceService;
    private readonly ActivityLogService _logService;
    private readonly StaffLeaveService _leaveService;

    public DashboardModel(
        ILogger<DashboardModel> logger, 
        ProfileService profileService,
        AppointmentService appointmentService,
        InvoiceService invoiceService,
        ActivityLogService logService,
        StaffLeaveService leaveService)
        : base(profileService)
    {
        _logger = logger;
        _appointmentService = appointmentService;
        _invoiceService = invoiceService;
        _logService = logService;
        _leaveService = leaveService;
    }

    public List<Appointment> TodayAppointments { get; set; } = new();
    public List<Invoice> RecentInvoices { get; set; } = new();
    public List<ActivityLogDto> RecentLogs { get; set; } = new();
    public List<StaffLeave> MyLeaves { get; set; } = new();

    public int PendingAppointmentsCount { get; set; }
    public int ConfirmedTodayCount { get; set; }
    public int ArrivedTodayCount { get; set; }
    public int TotalPatients { get; set; }
    public int ActiveDoctorsCount { get; set; }
    public decimal MonthlyRevenue { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        try
        {
            var appointments = await _appointmentService.GetAllAsync();
            var today = DateTime.Today;

            TodayAppointments = appointments
                .Where(a => a.AppointmentDate.Date == today)
                .OrderBy(a => a.AppointmentTime)
                .ToList();

            PendingAppointmentsCount = appointments.Count(a => a.Status == "pending");
            ConfirmedTodayCount = TodayAppointments.Count(a => a.Status == "confirmed");
            ArrivedTodayCount = TodayAppointments.Count(a => a.Status == "arrived");
            TotalPatients = appointments.Select(a => a.PatientId).Distinct().Count();

            var allInvoices = await _invoiceService.GetAllInvoicesAsync();
            RecentInvoices = allInvoices.OrderByDescending(i => i.CreatedAt).Take(5).ToList();
            MonthlyRevenue = allInvoices.Where(i => i.CreatedAt.Month == today.Month && i.CreatedAt.Year == today.Year && i.Status == "paid").Sum(i => i.FinalAmount);

            var doctors = await HttpContext.RequestServices.GetRequiredService<DoctorService>().GetAllWithProfilesAsync();
            ActiveDoctorsCount = doctors.Count(d => d.IsActive);

            RecentLogs = await _logService.GetAllLogsAsync();
            RecentLogs = RecentLogs.Take(10).ToList();

            MyLeaves = await _leaveService.GetLeavesByProfileIdAsync(CurrentUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading receptionist dashboard");
        }

        return Page();
    }
}
