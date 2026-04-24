using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Pages.DoctorSide;

public class DoctorDashboardModel : AdminPageModel
{
    private readonly AppointmentService _appointmentService;
    private readonly DoctorService _doctorService;
    private readonly DentalServiceService _dentalService;

    public DoctorDashboardModel(
        ProfileService profileService, 
        AppointmentService appointmentService, 
        DoctorService doctorService,
        DentalServiceService dentalService)
        : base(profileService)
    {
        _appointmentService = appointmentService;
        _doctorService = doctorService;
        _dentalService = dentalService;
    }

    public List<Appointment> MyAppointments { get; set; } = new();
    public List<Appointment> ArrivedPatients { get; set; } = new();
    public List<DentalService> AllServices { get; set; } = new();
    public List<Invoice> RecentInvoices { get; set; } = new();
    
    public int TodayAppointmentsCount { get; set; }
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
        
        // 3. Filter by this doctor's ID
        var doctorId = doctorRecord?.Id;

        if (doctorId != null)
        {
            var myToday = allAppointments
                .Where(a => a.DoctorId == doctorId && a.AppointmentDate.Date == DateTime.Today)
                .ToList();

            ArrivedPatients = myToday.Where(a => a.Status == "arrived").ToList();
            MyAppointments = myToday.OrderBy(a => a.AppointmentTime).Take(10).ToList();

            TodayAppointmentsCount = myToday.Count;
            PendingReviewsCount = allAppointments.Count(a => a.DoctorId == doctorId && a.Status == "pending");

            var myInvoices = await invoiceService.GetInvoicesByDoctorIdAsync(doctorId);
            RecentInvoices = myInvoices.Take(5).ToList();
            TotalInvoicesCount = myInvoices.Count;
        }
        else if (CurrentUserRole == "admin")
        {
            ArrivedPatients = allAppointments.Where(a => a.Status == "arrived").ToList();
            MyAppointments = allAppointments
                .Where(a => a.AppointmentDate.Date == DateTime.Today)
                .OrderBy(a => a.AppointmentTime)
                .Take(10)
                .ToList();
            
            TodayAppointmentsCount = MyAppointments.Count;
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
