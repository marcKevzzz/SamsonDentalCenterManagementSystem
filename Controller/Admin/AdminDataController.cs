using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.ViewModels;

namespace SamsonDentalCenterManagementSystem.Controllers.Admin;

[Authorize(Policy = "StaffOnly")]
[ApiController]
[Route("api/admin/data")]
[IgnoreAntiforgeryToken]
public class AdminDataController : ControllerBase
{
    private readonly AppointmentService _appointmentService;
    private readonly ProfileService _profileService;
    private readonly InvoiceService _invoiceService;
    private readonly InquiryService _inquiryService;
    private readonly DentalServiceService _dentalService;
    private readonly DoctorService _doctorService;
    private readonly ReceptionistService _receptionistService;
    private readonly ClinicService _clinicService;
    private readonly ILogger<AdminDataController> _logger;


    public AdminDataController(
        AppointmentService appointmentService,
        ProfileService profileService,
        InvoiceService invoiceService,
        InquiryService inquiryService,
        DentalServiceService dentalService,
        DoctorService doctorService,
        ReceptionistService receptionistService,
        ClinicService clinicService,
        ILogger<AdminDataController> logger)
    {
        _appointmentService = appointmentService;
        _profileService = profileService;
        _invoiceService = invoiceService;
        _inquiryService = inquiryService;
        _dentalService = dentalService;
        _doctorService = doctorService;
        _receptionistService = receptionistService;
        _clinicService = clinicService;
        _logger = logger;
    }

    [HttpGet("appointments")]
    public async Task<IActionResult> GetAppointments()
    {
        try {
            var data = await _appointmentService.GetAllAsync();
            // Projecting to a simpler object to be 100% sure we don't leak Supabase internal props
            var dtos = data.Select(a => new {
                id = a.Id,
                patientId = a.PatientId,
                patientName = a.PatientName,
                patientEmail = a.PatientEmail,
                patientPhone = a.PatientPhone,
                serviceId = a.ServiceId,
                serviceName = a.Service?.Name,
                doctorId = a.DoctorId,
                doctorName = a.Doctor != null ? $"{a.Doctor.Title} {a.Doctor.Profile?.FirstName} {a.Doctor.Profile?.LastName}".Trim() : null,
                appointmentDate = a.AppointmentDate,
                appointmentTime = a.AppointmentTime,
                status = a.Status,
                isWaitlist = a.IsWaitlist,
                notes = a.Notes,
                createdAt = a.CreatedAt
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("patients")]
    public async Task<IActionResult> GetPatients()
    {
        try {
            var allProfiles = await _profileService.GetAllProfiles();
            var dtos = allProfiles.Where(p => p.Role == "patient").Select(p => new {
                id = p.Id,
                firstName = p.FirstName,
                lastName = p.LastName,
                email = p.Email,
                avatarUrl = p.AvatarUrl,
                phone = p.PhoneNumber,
                role = p.Role,
                dob = p.DateOfBirth,
                sex = p.Sex,
                address = p.Address,
                isActive = p.IsActive,
                reactivationRequested = p.ReactivationRequested
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices()
    {
        try {
            var data = await _invoiceService.GetAllInvoicesAsync();
            var dtos = data.Select(i => new {
                id = i.Id,
                appointmentId = i.AppointmentId,
                patientId = i.PatientId,
                patientName = i.Patient != null ? $"{i.Patient.FirstName} {i.Patient.LastName}" : "Unknown",
                doctorId = i.DoctorId,
                doctorName = i.Doctor != null ? $"{i.Doctor.Title} {i.Doctor.Profile?.FirstName} {i.Doctor.Profile?.LastName}".Trim() : "N/A",
                totalAmount = i.TotalAmount,
                discountAmount = i.DiscountAmount,
                finalAmount = i.FinalAmount,
                status = i.Status,
                createdAt = i.CreatedAt,
                items = i.Items?.Select(item => new {
                    id = item.Id,
                    description = item.Description,
                    unitPrice = item.UnitPrice,
                    quantity = item.Quantity,
                    totalPrice = item.TotalPrice
                }).ToList()
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("inquiries")]
    public async Task<IActionResult> GetInquiries()
    {
        try {
            var data = await _inquiryService.GetAllInquiriesAsync();
            var dtos = data.Select(i => new {
                id = i.Id,
                patientId = i.PatientId ?? i.Patient?.Id,
                patientName = i.Patient != null ? $"{i.Patient.FirstName} {i.Patient.LastName}" : $"{i.GuestFirstName} {i.GuestLastName}".Trim(),
                guestFirstName = i.GuestFirstName,
                guestLastName = i.GuestLastName,
                subject = i.Subject,
                status = i.Status,
                createdAt = i.CreatedAt,
                updatedAt = i.UpdatedAt,
                patient = i.Patient != null ? new {
                    firstName = i.Patient.FirstName,
                    lastName = i.Patient.LastName,
                    fullName = $"{i.Patient.FirstName} {i.Patient.LastName}",
                    avatarUrl = i.Patient.AvatarUrl,
                    isActive = i.Patient.IsActive
                } : null
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        try {
            var allProfiles = await _profileService.GetAllProfiles();
            var dtos = allProfiles.Select(p => new {
                id = p.Id,
                firstName = p.FirstName,
                lastName = p.LastName,
                email = p.Email,
                avatarUrl = p.AvatarUrl,
                phone = p.PhoneNumber,
                role = p.Role,
                dob = p.DateOfBirth,
                sex = p.Sex,
                address = p.Address,
                isActive = p.IsActive,
                reactivationRequested = p.ReactivationRequested
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        try {
            var s = await _clinicService.GetSettingsAsync();
            if (s == null) return NotFound();

            var dto = new {
                id = s.Id,
                clinicName = s.ClinicName,
                logoUrl = s.LogoUrl,
                aboutText = s.AboutText,
                locationAddress = s.LocationAddress,
                mapsUrl = s.MapsUrl,
                contactEmail = s.ContactEmail,
                contactPhone = s.ContactPhone,
                landline = s.Landline,
                facebookUrl = s.FacebookUrl,
                instagramUrl = s.InstagramUrl,
                clinicalHours = s.ClinicalHours,
                faqs = s.Faqs,
                clinicPhotos = s.ClinicPhotos,
                clinicalHoursJson = s.ClinicalHoursJson,
                faqsJson = s.FaqsJson,
                clinicPhotosJson = s.ClinicPhotosJson
            };
            return Ok(new { ok = true, data = dto });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try {
            var allProfiles = await _profileService.GetAllProfiles();
            var appointments = await _appointmentService.GetAllAsync();
            var invoices = await _invoiceService.GetAllInvoicesAsync();
            var doctors = await _doctorService.GetAllWithProfilesAsync();

            var stats = new AdminStats
            {
                TotalPatients = allProfiles.Count(p => p.Role == "patient"),
                ActiveDoctors = doctors.Count(d => d.IsActive),
                TodayAppointments = appointments.Count(a => a.AppointmentDate.Date == DateTime.Today),
                MonthlyRevenue = invoices
                    .Where(i => i.CreatedAt.Month == DateTime.Today.Month && i.CreatedAt.Year == DateTime.Today.Year && i.Status == "paid")
                    .Sum(i => i.FinalAmount)
            };

            return Ok(new { ok = true, data = stats });
        } catch (Exception ex) {
            _logger.LogError(ex, "Failed to fetch admin stats");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        try {
            var data = await _doctorService.GetAllWithProfilesAsync();
            var dtos = data.Select(d => new {
                id = d.Id,
                profileId = d.ProfileId,
                title = d.Title,
                specialties = d.Specialties,
                bio = d.Bio,
                isActive = d.IsActive,
                profile = d.Profile != null ? new {
                    firstName = d.Profile.FirstName,
                    lastName = d.Profile.LastName,
                    email = d.Profile.Email,
                    avatarUrl = d.Profile.AvatarUrl
                } : null,
                availability = d.Availability?.Select(a => new {
                    dayOfWeek = a.DayOfWeek,
                    startTime = a.StartTime,
                    endTime = a.EndTime
                }).ToList()
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpGet("receptionists")]
    public async Task<IActionResult> GetReceptionists()
    {
        try {
            var data = await _receptionistService.GetAllWithProfilesAsync();
            var dtos = data.Select(r => new {
                id = r.Id,
                profileId = r.ProfileId,
                deskLocation = r.DeskLocation,
                isActive = r.IsActive,
                profile = r.Profile != null ? new {
                    firstName = r.Profile.FirstName,
                    lastName = r.Profile.LastName,
                    email = r.Profile.Email,
                    avatarUrl = r.Profile.AvatarUrl
                } : null
            }).ToList();
            return Ok(new { ok = true, data = dtos });
        } catch (Exception ex) {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}
