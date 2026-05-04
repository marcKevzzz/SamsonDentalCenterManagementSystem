using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide;

public class DashboardModel : AdminPageModel
{
    private readonly AppointmentService _appointmentService;
    private readonly DoctorService _doctorService;
    private readonly DentalServiceService _dentalService;
    private readonly StaffLeaveService _leaveService;

    public DashboardModel(
        ProfileService profileService, 
        AppointmentService appointmentService, 
        DoctorService doctorService,
        DentalServiceService dentalService,
        StaffLeaveService leaveService)
        : base(profileService)
    {
        _appointmentService = appointmentService;
        _doctorService = doctorService;
        _dentalService = dentalService;
        _leaveService = leaveService;
    }

    public string DoctorName { get; set; } = string.Empty;
    public List<Appointment> UpcomingAppointments { get; set; } = new();
    public List<Appointment> ArrivedPatients { get; set; } = new();
    public List<DentalService> AllServices { get; set; } = new();
    public List<Invoice> RecentInvoices { get; set; } = new();
    public List<StaffLeave> MyLeaves { get; set; } = new();
    
    public int TodayAppointments { get; set; }
    public int TotalPatients { get; set; }
    public int MonthlyTreatments { get; set; }
    public int PendingReviewsCount { get; set; }
    public int TotalInvoicesCount { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        // Extra check: only doctors should be here
        if (CurrentUserRole != "doctor" && CurrentUserRole != "admin")
        {
            return RedirectToPage("/AdminSide/Index");
        }

        var invoiceService = HttpContext.RequestServices.GetRequiredService<InvoiceService>();

        // 1. Get the current doctor record for this profile
        var doctorRecord = await _doctorService.GetDoctorByProfileIdAsync(CurrentUserId);
        
        // 2. Fetch all appointments & services
        var allAppointments = await _appointmentService.GetAllAsync();
        AllServices = await _dentalService.GetAll();

        // Auto mark no_show for past appointments (> 24 hours of said date)
        var now = DateTime.Now;
        foreach(var appt in allAppointments) {
            if ((appt.Status == "confirmed" || appt.Status == "pending") && appt.AppointmentDate.Date.AddDays(1) < now.Date) {
                await _appointmentService.UpdateStatus(appt.Id, "no_show");
                appt.Status = "no_show";
            }
        }
        
        // 3. Filter by this doctor's ID
        var doctorId = doctorRecord?.Id;
        DoctorName = doctorRecord?.Profile?.LastName ?? "Staff";

        if (doctorId != null)
        {
            var myToday = allAppointments
                .Where(a => a.DoctorId == doctorId && a.AppointmentDate.Date == DateTime.Today)
                .ToList();

            ArrivedPatients = myToday.Where(a => a.Status == "arrived").ToList();
            
            // Upcoming: confirmed and within 24 hours (Today and Tomorrow)
            UpcomingAppointments = allAppointments
                .Where(a => a.DoctorId == doctorId && a.Status == "confirmed" && a.AppointmentDate.Date >= DateTime.Today && a.AppointmentDate.Date <= DateTime.Today.AddDays(1))
                .OrderBy(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .Take(10).ToList();

            TodayAppointments = myToday.Count;
            TotalPatients = allAppointments.Where(a => a.DoctorId == doctorId).Select(a => a.PatientId).Distinct().Count();
            MonthlyTreatments = allAppointments.Count(a => a.DoctorId == doctorId && a.AppointmentDate.Month == DateTime.Today.Month && a.AppointmentDate.Year == DateTime.Today.Year);
            PendingReviewsCount = allAppointments.Count(a => a.DoctorId == doctorId && a.Status == "pending");

            var myInvoices = await invoiceService.GetInvoicesByDoctorIdAsync(doctorId);
            RecentInvoices = myInvoices.Take(5).ToList();
            TotalInvoicesCount = myInvoices.Count;

            MyLeaves = await _leaveService.GetLeavesByProfileIdAsync(CurrentUserId);
        }
        else if (CurrentUserRole == "admin")
        {
            ArrivedPatients = allAppointments.Where(a => a.Status == "arrived").ToList();
            UpcomingAppointments = allAppointments
                .Where(a => a.Status == "confirmed" && a.AppointmentDate.Date >= DateTime.Today && a.AppointmentDate.Date <= DateTime.Today.AddDays(1))
                .OrderBy(a => a.AppointmentDate)
                .ThenBy(a => a.AppointmentTime)
                .Take(10)
                .ToList();
            
            TodayAppointments = UpcomingAppointments.Count;
            TotalPatients = allAppointments.Select(a => a.PatientId).Distinct().Count();
            MonthlyTreatments = allAppointments.Count(a => a.AppointmentDate.Month == DateTime.Today.Month && a.AppointmentDate.Year == DateTime.Today.Year);
            PendingReviewsCount = allAppointments.Count(a => a.Status == "pending");

            var allInvoices = await invoiceService.GetAllInvoicesAsync();
            RecentInvoices = allInvoices.Take(5).ToList();
            TotalInvoicesCount = allInvoices.Count;
        }

        return Page();
    }

    public async Task<IActionResult> OnPostGenerateInvoiceAsync([FromBody] InvoicePayload payload)
    {
        try
        {
            if (payload == null || string.IsNullOrEmpty(payload.AppointmentId))
                return new JsonResult(new { ok = false, error = "Invalid payload" });

            var invoice = new Invoice
            {
                AppointmentId = payload.AppointmentId,
                PatientId = payload.PatientId,
                DoctorId = payload.DoctorId,
                TotalAmount = payload.TotalAmount,
                DiscountAmount = payload.DiscountAmount,
                FinalAmount = payload.FinalAmount,
                Notes = payload.Notes,
                Status = "pending"
            };

            var items = payload.Items.Select(i => new InvoiceItem
            {
                ServiceId = i.ServiceId,
                Description = i.Description,
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity,
                TotalPrice = i.TotalPrice
            }).ToList();

            var invoiceService = HttpContext.RequestServices.GetRequiredService<InvoiceService>();
            await invoiceService.CreateInvoiceAsync(invoice, items);

            return new JsonResult(new { ok = true });
        }
        catch (Exception ex)
        {
            return new JsonResult(new { ok = false, error = ex.Message });
        }
    }

    public class InvoicePayload
    {
        public string AppointmentId { get; set; } = string.Empty;
        public string PatientId { get; set; } = string.Empty;
        public string DoctorId { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public string? Notes { get; set; }
        public List<InvoiceItemPayload> Items { get; set; } = new();
    }

    public class InvoiceItemPayload
    {
        public string? ServiceId { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public decimal TotalPrice { get; set; }
    }
}
