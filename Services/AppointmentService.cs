using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class AppointmentService
    {
        public readonly Supabase.Client _supabase;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IEmailService _emailService;
        private readonly string _appBaseUrl;
        private readonly HttpClient _http;
        private readonly ActivityLogService _logs;
        private readonly NotificationService _notifs;
        private readonly ClinicService _clinic;
        private readonly BlockedDateService _blockedDates;
        private readonly IHubContext<AdminHub> _hubContext;
        private readonly ProfileService _profiles;
        private readonly RecordService _recordService;
        private readonly OtpService _otpService;
        private readonly IDistributedCache _cache;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        };

        public static readonly string[] ALL_SLOTS =
        {
            "9:00 AM",
            "10:00 AM",
            "11:00 AM",
            "1:00 PM",
            "2:00 PM",
            "3:00 PM",
            "4:00 PM",
            "5:00 PM",
        };

        public AppointmentService(
            Supabase.Client supabase,
            string serviceRoleKey,
            string supabaseUrl,
            IEmailService emailService,
            string appBaseUrl,
            HttpClient http,
            ActivityLogService logs,
            NotificationService notifs,
            IHubContext<AdminHub> hubContext,
            ClinicService clinic,
            BlockedDateService blockedDates,
            ProfileService profiles,
            RecordService recordService,
            IDistributedCache cache,
            OtpService otpService
        )
        {
            _supabase = supabase;
            _serviceRoleKey = serviceRoleKey;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _emailService = emailService;
            _appBaseUrl = appBaseUrl.TrimEnd('/');
            _http = http;
            _logs = logs;
            _notifs = notifs;
            _hubContext = hubContext;
            _clinic = clinic;
            _blockedDates = blockedDates;
            _profiles = profiles;
            _recordService = recordService;
            _cache = cache;
            _otpService = otpService;
        }

        private HttpRequestMessage BuildRequest(HttpMethod method, string path)
        {
            var req = new HttpRequestMessage(method, $"{_supabaseUrl}/rest/v1{path}");
            req.Headers.Add("apikey", _serviceRoleKey);
            req.Headers.Add("Authorization", $"Bearer {_serviceRoleKey}");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return req;
        }

        // ── Get doctors ───────────────────────────────────────────────────────
        public async Task<List<Doctor>> GetDoctors()
        {
            try
            {
                var path =
                    "/doctors?select=*,profile:profiles!profile_id(*)&is_active=eq.true&order=title.asc";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var dtos = JsonSerializer.Deserialize<List<DoctorDto>>(json, _jsonOptions) ?? new();

                return dtos.Select(d => new Doctor
                    {
                        Id = d.Id,
                        ProfileId = d.ProfileId,
                        Title = d.Title,
                        Specialties = d.Specialties,
                        Bio = d.Bio,
                        IsActive = d.IsActive,
                        YearsOfExperience = d.YearsOfExperience,
                        Profile =
                            d.Profile != null
                                ? new Profile
                                {
                                    Id = d.Profile.Id,
                                    FirstName = d.Profile.FirstName,
                                    LastName = d.Profile.LastName,
                                    Email = d.Profile.Email,
                                    AvatarUrl = d.Profile.AvatarUrl,
                                    PhoneNumber = d.Profile.PhoneNumber,
                                    Role = d.Profile.Role,
                                    Sex = d.Profile.Sex,
                                    DateOfBirth = d.Profile.DateOfBirth,
                                    Address = d.Profile.Address,
                                }
                                : null,
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetDoctors] {ex.Message}");
                return new();
            }
        }

        public async Task<List<Doctor>> GetDoctorsForService(string category)
        {
            var all = await GetDoctors();
            return all.Where(d => d.Specialties.Contains(category)).ToList();
        }

        // ── FIX Bug 1: Get booked slots scoped to service + doctor + date ────
        // Previously only filtered by doctor+date, allowing cross-service conflicts.
        public async Task<List<Appointment>> GetBookedAppointments(string doctorId, DateTime date)
        {
            try
            {
                var dateStr = date.Date.ToString("yyyy-MM-dd");
                var path =
                    $"/appointments?select=*,service:dental_services!service_id(*)&doctor_id=eq.{doctorId}&appointment_date=eq.{dateStr}&status=in.(confirmed,arrived)";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<List<Appointment>>(json, _jsonOptions) ?? new();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetBookedAppointments] {ex.Message}");
                return new();
            }
        }

        public async Task<List<Doctor>> GetAvailableDoctorsForSlot(
            string category,
            DateTime date,
            string time,
            int durationMinutes = 60,
            int bufferMinutes = 15
        )
        {
            var doctors = await GetDoctorsForService(category);
            var available = new List<Doctor>();

            if (!DateTime.TryParse(time, out var apptTimeDt))
                return new();
            var apptTime = apptTimeDt.TimeOfDay;
            var apptEnd = apptTime.Add(TimeSpan.FromMinutes(durationMinutes));

            foreach (var doc in doctors)
            {
                var booked = await GetBookedAppointments(doc.Id, date);
                bool isBusy = false;
                foreach (var b in booked)
                {
                    if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                    {
                        var bStart = bStartDt.TimeOfDay;
                        var bBuffer = b.Service?.BufferMinutes ?? 15;
                        var bEnd = bStart.Add(TimeSpan.FromMinutes(b.DurationMinutes + bBuffer));

                        // Overlap check with buffers
                        if (
                            apptTime < bEnd
                            && apptEnd.Add(TimeSpan.FromMinutes(bufferMinutes)) > bStart
                        )
                        {
                            isBusy = true;
                            break;
                        }
                    }
                }
                if (!isBusy)
                    available.Add(doc);
            }
            return available;
        }

        // ── Availability per service + date ───────────────────────────────────
        public async Task<Dictionary<string, object>> GetAvailability(
            string category,
            DateTime date,
            string? serviceId = null
        )
        {
            // 0. Check if date is blocked
            if (await _blockedDates.IsDateBlockedAsync(date))
                return new();

            var settings = await _clinic.GetSettingsAsync();
            var dayName = date.DayOfWeek.ToString();
            var hours = settings.ClinicalHours.FirstOrDefault(h =>
                h.Day.Equals(dayName, StringComparison.OrdinalIgnoreCase)
            );

            if (hours == null || hours.Closed)
                return new();

            // 1. Get Service Duration and Buffer
            int duration = 60;
            int buffer = 15;
            if (!string.IsNullOrEmpty(serviceId))
            {
                var svcRes = await _supabase
                    .From<DentalService>()
                    .Where(s => s.Id == serviceId)
                    .Get();
                var svc = svcRes.Models.FirstOrDefault();
                if (svc != null)
                {
                    duration = svc.DurationMinutes;
                    buffer = svc.BufferMinutes;
                }
            }

            int totalBlock = duration + buffer;

            // 2. Parse Clinic Hours
            if (
                !DateTime.TryParse(hours.Open, out var openDt)
                || !DateTime.TryParse(hours.Close, out var closeDt)
            )
                return new();

            var openTime = openDt.TimeOfDay;
            var closeTime = closeDt.TimeOfDay;

            TimeSpan? noonStart = null;
            TimeSpan? noonEnd = null;
            if (DateTime.TryParse(hours.NoonStart, out var ns))
                noonStart = ns.TimeOfDay;
            if (DateTime.TryParse(hours.NoonEnd, out var ne))
                noonEnd = ne.TimeOfDay;

            var doctors = await GetDoctorsForService(category);
            var bookedMap = new Dictionary<string, List<Appointment>>();
            var staffSchedMap = new Dictionary<string, List<AvailabilityDto>>();
            var onLeaveProfileIds = new HashSet<string>();

            if (doctors.Any())
            {
                var doctorIds = string.Join(",", doctors.Select(d => d.Id));
                var profileIds = string.Join(",", doctors.Select(d => d.ProfileId));
                var dateStr = date.Date.ToString("yyyy-MM-dd");
                var dayOfWeek = (int)date.DayOfWeek;

                // 1. Fetch Appointments
                var batchPath =
                    $"/appointments?select=*,service:dental_services!service_id(*)&doctor_id=in.({doctorIds})&appointment_date=eq.{dateStr}&status=in.(confirmed,arrived)";

                // 2. Fetch Staff Availability
                var availPath =
                    $"/staff_availability?staff_id=in.({doctorIds})&day_of_week=eq.{dayOfWeek}&is_active=eq.true";

                // 3. Fetch Staff Leaves
                var leavePath =
                    $"/staff_leaves?status=eq.approved&start_date=lte.{dateStr}&end_date=gte.{dateStr}";
                if (!string.IsNullOrEmpty(profileIds))
                {
                    leavePath += $"&profile_id=in.({profileIds})";
                }

                try
                {
                    // Appointments
                    var apptReq = BuildRequest(HttpMethod.Get, batchPath);
                    var apptRes = await _http.SendAsync(apptReq);
                    if (apptRes.IsSuccessStatusCode)
                    {
                        var json = await apptRes.Content.ReadAsStringAsync();
                        var allAppts =
                            JsonSerializer.Deserialize<List<Appointment>>(json, _jsonOptions)
                            ?? new();
                        foreach (var doc in doctors)
                            bookedMap[doc.Id] = allAppts.Where(a => a.DoctorId == doc.Id).ToList();
                    }

                    // Staff Availability
                    var availReq = BuildRequest(HttpMethod.Get, availPath);
                    var availRes = await _http.SendAsync(availReq);
                    if (availRes.IsSuccessStatusCode)
                    {
                        var json = await availRes.Content.ReadAsStringAsync();
                        var allAvail =
                            JsonSerializer.Deserialize<List<AvailabilityDto>>(json, _jsonOptions)
                            ?? new();
                        foreach (var doc in doctors)
                            staffSchedMap[doc.Id] = allAvail
                                .Where(v => v.StaffId == doc.Id)
                                .ToList();
                    }

                    // Staff Leaves
                    var leaveReq = BuildRequest(HttpMethod.Get, leavePath);
                    var leaveRes = await _http.SendAsync(leaveReq);
                    if (leaveRes.IsSuccessStatusCode)
                    {
                        var json = await leaveRes.Content.ReadAsStringAsync();
                        var allLeaves =
                            JsonSerializer.Deserialize<List<StaffLeave>>(json, _jsonOptions)
                            ?? new();
                        foreach (var l in allLeaves)
                        {
                            if (!string.IsNullOrEmpty(l.ProfileId))
                            {
                                onLeaveProfileIds.Add(l.ProfileId.Trim().ToLower());
                                Console.WriteLine($"[GetAvailability.Batch] Found approved leave for ProfileId: {l.ProfileId} on {dateStr}");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[GetAvailability.Batch] {ex.Message}");
                    foreach (var doc in doctors)
                    {
                        bookedMap[doc.Id] = new();
                        staffSchedMap[doc.Id] = new();
                    }
                }
            }

            if (!doctors.Any()) return new();

            var result = new Dictionary<string, object>();
            var currentTime = openTime;
            var nowTime = DateTime.Now.TimeOfDay;
            bool isToday = date.Date == DateTime.Today;
            int step = totalBlock;

            while (currentTime.Add(TimeSpan.FromMinutes(duration)) <= closeTime)
            {
                // Skip if it's today and the time has already passed
                if (isToday && currentTime <= nowTime)
                {
                    currentTime = currentTime.Add(TimeSpan.FromMinutes(step));
                    continue;
                }

                var slotEnd = currentTime.Add(TimeSpan.FromMinutes(duration));
                var slotLabel = DateTime.Today.Add(currentTime).ToString("h:mm tt");

                // Check if slot overlaps with noon break
                bool overlapsNoon = false;
                if (noonStart.HasValue && noonEnd.HasValue)
                {
                    if (currentTime < noonEnd.Value && slotEnd > noonStart.Value)
                        overlapsNoon = true;
                }

                if (!overlapsNoon)
                {
                    var availableDoctorIds = new List<string>();
                    bool anyDoctorScheduled = false;

                    foreach (var doc in doctors)
                    {
                        var dProfId = doc.ProfileId?.Trim().ToLower();
                        if (!string.IsNullOrEmpty(dProfId) && onLeaveProfileIds.Any(lp => lp.Trim().ToLower() == dProfId))
                        {
                            Console.WriteLine($"[GetAvailability.Batch] Skipping doctor {doc.Id} (Profile: {doc.ProfileId}) - ON LEAVE");
                            continue;
                        }

                        var scheds = staffSchedMap.ContainsKey(doc.Id) ? staffSchedMap[doc.Id] : new();
                        bool worksThisTime = false;
                        foreach (var s in scheds)
                        {
                            if (DateTime.TryParse(s.StartTime, out var sStart) && DateTime.TryParse(s.EndTime, out var sEnd))
                            {
                                if (currentTime >= sStart.TimeOfDay && slotEnd <= sEnd.TimeOfDay)
                                {
                                    worksThisTime = true;
                                    anyDoctorScheduled = true;
                                    break;
                                }
                            }
                        }
                        if (!worksThisTime) continue;

                        // Check busy
                        var booked = bookedMap[doc.Id];
                        bool isBusy = false;
                        foreach (var b in booked)
                        {
                            if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                            {
                                var bStart = bStartDt.TimeOfDay;
                                var bBuffer = b.Service?.BufferMinutes ?? 15;
                                var bEnd = bStart.Add(TimeSpan.FromMinutes(b.DurationMinutes + bBuffer));
                                if (currentTime < bEnd && slotEnd.Add(TimeSpan.FromMinutes(buffer)) > bStart)
                                {
                                    isBusy = true;
                                    break;
                                }
                            }
                        }
                        if (!isBusy) availableDoctorIds.Add(doc.Id);
                    }

                    // Calculate available doctors
                    int finalCount = availableDoctorIds.Count;
                    bool isWaitlistEligible = finalCount == 0 && anyDoctorScheduled;

                    result[slotLabel] = new
                    {
                        available = finalCount > 0,
                        doctorCount = finalCount,
                        waitlistEligible = isWaitlistEligible,
                        time24 = currentTime.ToString(@"hh\:mm"),
                    };
                }

                currentTime = currentTime.Add(TimeSpan.FromMinutes(step));
            }

            return result;
        }

        public async Task<object> GetMonthAvailability(string category, int year, int month, string? serviceId = null)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);
            var fullyBookedDates = new List<string>();
            var unavailableDates = new List<string>();

            // 1. Batch Fetching
            var settings = await _clinic.GetSettingsAsync();
            var blockedDates = await _blockedDates.GetBlockedDateStringsAsync();
            var doctors = await GetDoctorsForService(category);
            Console.WriteLine($"[DEBUG] GetMonthAvailability - Category: {category}, Doctors Found: {doctors.Count}");
            if (!doctors.Any()) 
                return new { fullyBooked = fullyBookedDates, unavailable = unavailableDates };

            int duration = 60;
            int buffer = 15;
            if (!string.IsNullOrEmpty(serviceId))
            {
                var svcRes = await _supabase.From<DentalService>().Where(s => s.Id == serviceId).Get();
                var svc = svcRes.Models.FirstOrDefault();
                if (svc != null) { duration = svc.DurationMinutes; buffer = svc.BufferMinutes; }
            }

            var doctorIds = string.Join(",", doctors.Select(d => d.Id));
            var profileIds = string.Join(",", doctors.Select(d => d.ProfileId));
            var startStr = startDate.ToString("yyyy-MM-dd");
            var endStr = endDate.ToString("yyyy-MM-dd");

            // Appointments for the whole month
            var apptPath = $"/appointments?select=*,service:dental_services!service_id(*)&doctor_id=in.({doctorIds})&appointment_date=gte.{startStr}&appointment_date=lte.{endStr}&status=in.(confirmed,arrived)";
            var apptReq = BuildRequest(HttpMethod.Get, apptPath);
            var apptRes = await _http.SendAsync(apptReq);
            var allMonthAppts = apptRes.IsSuccessStatusCode 
                ? (JsonSerializer.Deserialize<List<Appointment>>(await apptRes.Content.ReadAsStringAsync(), _jsonOptions) ?? new())
                : new();

            // Staff Availability (Shifts)
            var availPath = $"/staff_availability?staff_id=in.({doctorIds})&is_active=eq.true";
            var availReq = BuildRequest(HttpMethod.Get, availPath);
            var availRes = await _http.SendAsync(availReq);
            var allMonthShifts = availRes.IsSuccessStatusCode
                ? (JsonSerializer.Deserialize<List<AvailabilityDto>>(await availRes.Content.ReadAsStringAsync(), _jsonOptions) ?? new())
                : new();

            // Staff Leaves
            var leavePath = $"/staff_leaves?status=eq.approved&start_date=lte.{endStr}&end_date=gte.{startStr}";
            if (!string.IsNullOrEmpty(profileIds)) leavePath += $"&profile_id=in.({profileIds})";
            var leaveReq = BuildRequest(HttpMethod.Get, leavePath);
            var leaveRes = await _http.SendAsync(leaveReq);
            var allMonthLeaves = leaveRes.IsSuccessStatusCode
                ? (JsonSerializer.Deserialize<List<StaffLeave>>(await leaveRes.Content.ReadAsStringAsync(), _jsonOptions) ?? new())
                : new();

            // 2. Process locally for each day
            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                if (date.DayOfWeek == DayOfWeek.Sunday || date.Date < DateTime.Today) continue;
                
                var dateStr = date.ToString("yyyy-MM-dd");
                if (blockedDates.Contains(dateStr)) { unavailableDates.Add(dateStr); continue; }

                var dayName = date.DayOfWeek.ToString();
                var hours = settings.ClinicalHours.FirstOrDefault(h => h.Day.Equals(dayName, StringComparison.OrdinalIgnoreCase));
                if (hours == null || hours.Closed) { unavailableDates.Add(dateStr); continue; }

                if (!DateTime.TryParse(hours.Open, out var openDt) || !DateTime.TryParse(hours.Close, out var closeDt)) { unavailableDates.Add(dateStr); continue; }
                var openTime = openDt.TimeOfDay;
                var closeTime = closeDt.TimeOfDay;

                TimeSpan? noonStart = DateTime.TryParse(hours.NoonStart, out var ns) ? ns.TimeOfDay : null;
                TimeSpan? noonEnd = DateTime.TryParse(hours.NoonEnd, out var ne) ? ne.TimeOfDay : null;

                var dayAppts = allMonthAppts.Where(a => a.AppointmentDate.Date == date.Date).ToList();
                var dayLeaves = allMonthLeaves.Where(l => !string.IsNullOrEmpty(l.ProfileId) && l.StartDate.Date <= date.Date && l.EndDate.Date >= date.Date).Select(l => l.ProfileId.ToLower()).ToHashSet();

                var currentTime = openTime;
                var nowTime = DateTime.Now.TimeOfDay;
                bool isToday = date.Date == DateTime.Today;
                
                bool hasAnyAvailable = false;
                bool hasAnyWaitlistEligible = false;

                // Check if any doctor works AT ALL on this day (regardless of service duration)
                bool anyDoctorHasShift = false;
                foreach (var doc in doctors)
                {
                    if (doc.ProfileId != null && dayLeaves.Contains(doc.ProfileId.ToLower())) continue;
                    if (allMonthShifts.Any(s => s.StaffId == doc.Id && s.DayOfWeek == (int)date.DayOfWeek))
                    {
                        anyDoctorHasShift = true;
                        break;
                    }
                }

                while (currentTime.Add(TimeSpan.FromMinutes(duration)) <= closeTime)
                {
                    if (isToday && currentTime <= nowTime) { currentTime = currentTime.Add(TimeSpan.FromMinutes(duration + buffer)); continue; }
                    
                    var slotEnd = currentTime.Add(TimeSpan.FromMinutes(duration));
                    if (noonStart.HasValue && noonEnd.HasValue && currentTime < noonEnd.Value && slotEnd > noonStart.Value) { currentTime = currentTime.Add(TimeSpan.FromMinutes(duration + buffer)); continue; }
                    int availDocCount = 0;
                    bool anyDocScheduled = false;

                    foreach (var doc in doctors)
                    {
                        if (doc.ProfileId != null && dayLeaves.Contains(doc.ProfileId.ToLower())) continue;
                        
                        var scheds = allMonthShifts.Where(s => s.StaffId == doc.Id && s.DayOfWeek == (int)date.DayOfWeek).ToList();
                        bool works = false;
                        foreach (var s in scheds)
                        {
                            if (DateTime.TryParse(s.StartTime, out var sStart) && DateTime.TryParse(s.EndTime, out var sEnd) && currentTime >= sStart.TimeOfDay && slotEnd <= sEnd.TimeOfDay) { works = true; break; }
                        }
                        if (!works) continue;
                        anyDocScheduled = true;

                        var booked = dayAppts.Where(a => a.DoctorId == doc.Id).ToList();
                        bool isBusy = false;
                        foreach (var b in booked)
                        {
                            if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                            {
                                var bStart = bStartDt.TimeOfDay;
                                var bEnd = bStart.Add(TimeSpan.FromMinutes(b.DurationMinutes + (b.Service?.BufferMinutes ?? 15)));
                                if (currentTime < bEnd && slotEnd.Add(TimeSpan.FromMinutes(buffer)) > bStart) { isBusy = true; break; }
                            }
                        }
                        if (!isBusy) availDocCount++;
                    }

                    if (availDocCount > 0) { hasAnyAvailable = true; break; }
                    if (anyDocScheduled) hasAnyWaitlistEligible = true;

                    // Move forward by a fixed granularity (30 mins) instead of full duration+buffer
                    // to ensure we don't skip potential valid slots that start at different offsets.
                    currentTime = currentTime.Add(TimeSpan.FromMinutes(30));
                }

                if (!hasAnyAvailable)
                {
                    // If no slots are available, but doctors are actually working, it's "Fully Booked" (Waitlist)
                    if (hasAnyWaitlistEligible || anyDoctorHasShift) 
                    {
                        Console.WriteLine($"[DEBUG] Date {dateStr}: Fully Booked (Waitlist). anyDoctorHasShift: {anyDoctorHasShift}");
                        fullyBookedDates.Add(dateStr);
                    }
                    else 
                    {
                        Console.WriteLine($"[DEBUG] Date {dateStr}: Unavailable. no doctors with category '{category}' have shifts today.");
                        unavailableDates.Add(dateStr);
                    }
                }
            }

            return new { fullyBooked = fullyBookedDates, unavailable = unavailableDates };
        }

        // ── FIX Bug 2: Double-booking check — only blocks same patient as PATIENT ─
        // If booking for someone else (isForOther=true), the logged-in user is
        // just the contact — a different person is the patient — so allow it.
        public async Task<bool> HasExistingBookingAsPatient(
            string patientId,
            DateTime date,
            TimeSpan startTime,
            TimeSpan endTime,
            bool isForOther,
            int buffer,
            string serviceId
        )
        {
            try
            {
                // Note: isForOther logic handled at identity level now (target patientId is passed)

                var res = await _supabase
                    .From<Appointment>()
                    .Where(a => a.PatientId == patientId)
                    .Where(a => a.Status != "cancelled")
                    .Where(a => a.Status != "no_show")
                    .Get();

                // 1. Simultaneous Limit (Global active appointments)
                var activeCount = res.Models.Count(a =>
                    a.Status == "pending" || a.Status == "confirmed" || a.Status == "arrived"
                );
                if (activeCount >= 3)
                    throw new Exception(
                        "Patient has reached the maximum of 3 active appointments."
                    );

                var sameDay = res.Models.Where(a => a.AppointmentDate.Date == date.Date).ToList();

                // 2. Same Service Same Day
                if (sameDay.Any(a => a.ServiceId == serviceId))
                    throw new Exception("The same service cannot be booked twice on the same day.");

                // 3. Check Overlaps
                foreach (var b in sameDay)
                {
                    if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                    {
                        var bStart = bStartDt.TimeOfDay;
                        var bBuffer = b.Service?.BufferMinutes ?? 15;
                        var bEnd = bStart.Add(TimeSpan.FromMinutes(b.DurationMinutes + bBuffer));

                        // Overlap check
                        if (startTime < bEnd && endTime.Add(TimeSpan.FromMinutes(buffer)) > bStart)
                            throw new Exception(
                                "Patient already has an appointment scheduled during this time."
                            );
                    }
                }

                return false;
            }
            catch (Exception ex)
                when (ex.Message.Contains("maximum")
                    || ex.Message.Contains("already has")
                    || ex.Message.Contains("same service")
                )
            {
                throw;
            }
            catch
            {
                return false;
            }
        }

        // ── FIX Bug 4: Correct status logic ──────────────────────────────────
        // Logged-in patients  → "confirmed"  (they're authenticated, trust them)
        // Guests              → "pending"    (needs email confirmation)
        // Waitlist            → "waitlist"   (regardless of login state)
        private (string Status, DateTime? LockUntil) DetermineStatusWithLock(AppointmentPayload p, DateTime appointmentDate, string? bookerId = null)
        {
            DateTime? lockUntil = null;
            string status = "pending";

            if (p.IsWaitlist)
            {
                status = "waitlist";
            }
            else if (!string.IsNullOrEmpty(bookerId))
            {
                // If the booker is authenticated, we trust the appointment.
                // This covers: 
                // 1. Authenticated user booking for themselves.
                // 2. Authenticated user booking for "Someone Else" (child/family).
                status = "confirmed";
            }
            else
            {
                // Staff-created appointments (Admin/Receptionist/Walk-in) are auto-confirmed if doctor is assigned
                var src = (p.Source ?? "").ToLower();
                if ((src == "admin" || src == "receptionist" || src == "walk_in") && !string.IsNullOrEmpty(p.DoctorId))
                {
                    status = "confirmed";
                }
            }

            // Apply Soft Lock to all 'pending' status
            if (status == "pending")
            {
                var isSameDay = appointmentDate.Date == DateTime.UtcNow.Date;
                lockUntil = DateTime.UtcNow.Add(isSameDay ? TimeSpan.FromMinutes(30) : TimeSpan.FromHours(24));
            }

            return (status, lockUntil);
        }

        // ── Create appointment ────────────────────────────────────────────────
        public async Task<Appointment> Create(AppointmentPayload p, string? userId = null)
        {
            if (!string.IsNullOrEmpty(p.PatientEmail))
                p.PatientEmail = p.PatientEmail.Trim().ToLower();
            if (!string.IsNullOrEmpty(p.OtherEmail))
                p.OtherEmail = p.OtherEmail.Trim().ToLower();

            // ── Date Parsing ────────────────────────────────────────────────
            Console.WriteLine(
                $"[DEBUG] AppointmentService.Create - Incoming AppointmentDate: '{p.AppointmentDate}'"
            );
            var parsedDate = DateTime.ParseExact(
                p.AppointmentDate,
                "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture
            );
            // Force UTC at midnight to ensure consistency across DB/Email
            var fixedDate = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);

            Console.WriteLine(
                $"[DEBUG] AppointmentService.Create - Normalized AppointmentDate (UTC): {fixedDate:yyyy-MM-dd HH:mm:ss} {fixedDate.Kind}"
            );

            // ── Validation ───────────────────────────────────────────────────
            if (!p.IsWaitlist)
            {
                // 1. Blocked Dates
                if (await _blockedDates.IsDateBlockedAsync(fixedDate))
                    throw new Exception("This date is blocked by the clinic.");

                // 2. Clinic Hours
                var settings = await _clinic.GetSettingsAsync();
                var dayName = fixedDate.DayOfWeek.ToString();
                var hours = settings.ClinicalHours.FirstOrDefault(h =>
                    h.Day.Equals(dayName, StringComparison.OrdinalIgnoreCase)
                );

                if (hours == null || hours.Closed)
                    throw new Exception($"The clinic is closed on {dayName}.");

                // Parse time (e.g. "9:00 AM") to compare
                if (DateTime.TryParse(p.AppointmentTime, out var apptTime))
                {
                    if (
                        DateTime.TryParse(hours.Open, out var openTime)
                        && DateTime.TryParse(hours.Close, out var closeTime)
                    )
                    {
                        var apptTimeSpan = apptTime.TimeOfDay;
                        if (
                            apptTimeSpan < openTime.TimeOfDay
                            || apptTimeSpan >= closeTime.TimeOfDay
                        )
                            throw new Exception(
                                $"Appointment time {p.AppointmentTime} is outside clinic hours ({hours.Open} - {hours.Close})."
                            );
                    }
                }

                // 3. Doctor Availability & Conflicts
                if (!string.IsNullOrEmpty(p.DoctorId))
                {
                    // Check conflicts (double-booking)
                    var booked = await GetBookedAppointments(p.DoctorId, fixedDate);

                    // Fetch service for duration and buffer
                    var svcRes = await _supabase
                        .From<DentalService>()
                        .Where(s => s.Id == p.ServiceId)
                        .Get();
                    var svc = svcRes.Models.FirstOrDefault();
                    int duration = svc?.DurationMinutes ?? 60;
                    int buffer = svc?.BufferMinutes ?? 15;

                    if (DateTime.TryParse(p.AppointmentTime, out var newStartDt))
                    {
                        var newStart = newStartDt.TimeOfDay;
                        var newEnd = newStart.Add(TimeSpan.FromMinutes(duration));

                        foreach (var b in booked)
                        {
                            if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                            {
                                var bStart = bStartDt.TimeOfDay;
                                var bBuffer = b.Service?.BufferMinutes ?? 15;
                                var bEnd = bStart.Add(
                                    TimeSpan.FromMinutes(b.DurationMinutes + bBuffer)
                                );

                                // Doctor overlap check
                                if (
                                    newStart < bEnd
                                    && newEnd.Add(TimeSpan.FromMinutes(buffer)) > bStart
                                )
                                    throw new Exception(
                                        "This time slot overlaps with an existing appointment for this specialist."
                                    );
                            }
                        }

                        // 4. Patient Double-Booking & Limit
                        if (!string.IsNullOrEmpty(p.PatientId))
                        {
                            await HasExistingBookingAsPatient(
                                p.PatientId,
                                fixedDate,
                                newStart,
                                newEnd,
                                p.IsForOther,
                                buffer,
                                p.ServiceId
                            );
                        }
                    }
                }

                // Check doctor's scheduled availability
                var dow = (int)fixedDate.DayOfWeek;
                var availPath =
                    $"/staff_availability?staff_id=eq.{p.DoctorId}&day_of_week=eq.{dow}&is_active=eq.true";
                var availReq = BuildRequest(HttpMethod.Get, availPath);
                var availRes = await _http.SendAsync(availReq);
                if (availRes.IsSuccessStatusCode)
                {
                    var availJson = await availRes.Content.ReadAsStringAsync();
                    var slots =
                        JsonSerializer.Deserialize<List<StaffAvailability>>(availJson, _jsonOptions)
                        ?? new();
                    if (!slots.Any())
                        throw new Exception("Specialist is not available on this day.");

                    // Optional: check specific time range if doctor has partial day availability
                    var matchingSlot = slots.FirstOrDefault(s =>
                    {
                        if (
                            DateTime.TryParse(s.StartTime, out var sStart)
                            && DateTime.TryParse(s.EndTime, out var sEnd)
                        )
                        {
                            var t = apptTime.TimeOfDay;
                            return t >= sStart.TimeOfDay && t < sEnd.TimeOfDay;
                        }
                        return true; // fallback if parse fails
                    });

                    if (matchingSlot == null)
                        throw new Exception(
                            $"Specialist is only available from {slots[0].StartTime} to {slots[0].EndTime}."
                        );
                }
            }

            // ── ACID Identity Resolution ─────────────────────────────────────
            string? bookerId = p.PatientId; // Current logged in user (if any)
            string? targetPatientId = p.PatientId;

            if (p.IsForOther)
            {
                // Booker is the logged-in user (p.PatientId), Patient is the 'Other' person
                var targetFirst = p.OtherFirstName ?? "";
                var targetLast = p.OtherLastName ?? "";
                var targetSex = p.OtherSex;
                var targetDob = p.OtherDob;

                var match = await _profiles.SmartMatchProfile(targetFirst, targetLast, "", ""); 
                if (match.Profile != null)
                {
                    targetPatientId = match.Profile.Id;
                }
                else
                {
                    targetPatientId = await _profiles.CreateShadowProfile(targetFirst, targetLast, "", "", targetSex, targetDob, null, match.RequiresReview);
                    await _profiles.CreatePatientRecord(targetPatientId, targetDob, targetSex, null, p.EmergencyContact, p.Relationship, bookerId); 
                }
            }
            else if (p.IsGuest && string.IsNullOrEmpty(targetPatientId))
            {
                // Guest booking: Booker and Patient are the same shadow profile
                var matchResult = await _profiles.SmartMatchProfile(p.PatientFirstName, p.PatientLastName, p.PatientEmail, p.PatientPhone);

                if (matchResult.Profile != null)
                {
                    targetPatientId = matchResult.Profile.Id;
                    bookerId = targetPatientId;
                }
                else if (p.IsGuestConfirmed) 
                {
                    targetPatientId = await _profiles.CreateShadowProfile(p.PatientFirstName, p.PatientLastName, p.PatientEmail, p.PatientPhone, p.PatientSex, p.PatientDob, p.PatientAddress, matchResult.RequiresReview);
                    bookerId = targetPatientId;
                }
            }

            p.PatientId = targetPatientId; 

            var (status, lockUntil) = DetermineStatusWithLock(p, fixedDate, userId);
            var emailStatus = (status == "confirmed" || status == "waitlist") ? status : "pending";
            if (p.IsGuestConfirmed)
            {
                emailStatus = "confirmed";
            }
            var token = (p.IsGuest && !p.IsWaitlist && !p.IsGuestConfirmed) ? Guid.NewGuid().ToString("N") : null;

            // ── PREVENT DOUBLE BOOKING ──────────────────────
            if (!p.IsWaitlist && !string.IsNullOrEmpty(p.PatientId))
            {
                var existingRes = await _supabase
                    .From<Appointment>()
                    .Where(a => a.PatientId == p.PatientId)
                    .Where(a => a.AppointmentDate == fixedDate)
                    .Where(a => a.AppointmentTime == p.AppointmentTime)
                    .Where(a => a.Status != "cancelled")
                    .Get();

                if (existingRes.Models.Any())
                {
                    throw new Exception("Patient already has an appointment scheduled for this date and time.");
                }
            }

            // ── DECOUPLE DATABASE FOR UNCONFIRMED GUESTS ──────────────────────
            // Skip OTP if:
            // 1. Not a guest (logged in)
            // 2. Waitlist
            // 3. Already confirmed
            // 4. Match found in database (Patient has an account/profile)
            if (
                p.IsGuest
                && !p.IsWaitlist
                && !p.IsGuestConfirmed
                && string.IsNullOrEmpty(p.PatientId)
            )
            {
                var cacheToken = Guid.NewGuid().ToString("N");
                var cacheJson = JsonSerializer.Serialize(p);
                await _cache.SetStringAsync(
                    cacheToken,
                    cacheJson,
                    new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24),
                    }
                );

                var mockAppt = new Appointment
                {
                    Id = Guid.NewGuid().ToString(),
                    Service = new DentalService { Name = p.ServiceName },
                    AppointmentDate = fixedDate,
                    AppointmentTime = p.AppointmentTime,
                    ConfirmationToken = cacheToken,
                    EmailStatus = "pending",
                    Status = "pending",
                    Notes = !string.IsNullOrEmpty(p.Notes)
                        ? System.Web.HttpUtility.HtmlEncode(
                            p.Notes.Length > 500 ? p.Notes[..500] : p.Notes
                        )
                        : null,
                };
                
                // We need names for the email template
                mockAppt.PatientProfile = new Profile { FirstName = p.PatientFirstName, LastName = p.PatientLastName, Email = p.PatientEmail };

                if (!string.IsNullOrEmpty(p.DoctorId))
                {
                    try
                    {
                        var docRes = await _supabase
                            .From<Doctor>()
                            .Where(d => d.Id == p.DoctorId)
                            .Get();
                        var doc = docRes.Models.FirstOrDefault();
                        if (doc != null)
                        {
                            var profRes = await _supabase
                                .From<Profile>()
                                .Select("*")
                                .Where(pr => pr.Id == doc.ProfileId)
                                .Get();
                            doc.Profile = profRes.Models.FirstOrDefault();
                            mockAppt.Doctor = doc;
                        }
                    }
                    catch { }
                }

                await SendGuestConfirmationEmail(mockAppt);
                Console.WriteLine(
                    $"[Appointment] Cached mock waiting for email confirmation. Token: {cacheToken}"
                );
                return mockAppt;
            }

            // --- Auto Assign Doctor ---
            if (string.IsNullOrEmpty(p.DoctorId))
            {
                try
                {
                    // 1. Try to assign previous doctor if patient is existing
                    if (!string.IsNullOrEmpty(p.PatientId))
                    {
                        var pastRes = await _supabase
                            .From<Appointment>()
                            .Select("doctor_id")
                            .Where(a => a.PatientId == p.PatientId)
                            .Order(
                                a => a.CreatedAt,
                                Supabase.Postgrest.Constants.Ordering.Descending
                            )
                            .Get();

                        var pastAppt = pastRes.Models.FirstOrDefault(a =>
                            !string.IsNullOrEmpty(a.DoctorId)
                        );
                        if (pastAppt != null)
                        {
                            p.DoctorId = pastAppt.DoctorId;
                        }
                    }

                    // 2. If still null (or not available), pick ANY available doctor for this slot
                    if (string.IsNullOrEmpty(p.DoctorId))
                    {
                        // Need service category for matching
                        var svcRes = await _supabase
                            .From<DentalService>()
                            .Where(s => s.Id == p.ServiceId)
                            .Get();
                        var svc = svcRes.Models.FirstOrDefault();
                        if (svc != null)
                        {
                            var available = await GetAvailableDoctorsForSlot(
                                svc.Category,
                                fixedDate,
                                p.AppointmentTime,
                                svc.DurationMinutes
                            );
                            if (available.Any())
                            {
                                p.DoctorId = available.First().Id;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AutoAssignDoctor] {ex.Message}");
                }
            }

            var appt = new Appointment
            {
                Id = Guid.NewGuid().ToString(),
                PatientId = p.PatientId,
                BookerId = bookerId,
                ServiceId = p.ServiceId,
                DoctorId = p.DoctorId,
                AppointmentDate = fixedDate,
                AppointmentTime = p.AppointmentTime,
                IsWaitlist = p.IsWaitlist,
                Status = status,
                EmailStatus = emailStatus,
                Notes = !string.IsNullOrEmpty(p.Notes)
                    ? System.Web.HttpUtility.HtmlEncode(
                        p.Notes.Length > 500 ? p.Notes[..500] : p.Notes
                    )
                    : null,
                Source = !string.IsNullOrEmpty(p.Source)
                    ? p.Source
                    : (p.IsGuest ? "guest" : "online"),
                CreatedAt = DateTime.UtcNow,
                ConfirmationToken = token,
                ConfirmedAt = status == "confirmed" ? DateTime.UtcNow : null,
                SoftLockUntil = lockUntil
            };

            // Capture duration and buffer at time of booking
            var dentalSvcRes = await _supabase
                .From<DentalService>()
                .Where(s => s.Id == p.ServiceId)
                .Get();
            var dentalSvc = dentalSvcRes.Models.FirstOrDefault();
            if (dentalSvc != null)
            {
                appt.DurationMinutes = dentalSvc.DurationMinutes;
            }

            var res = await _supabase.From<Appointment>().Insert(appt);
            var created = res.Models.First();

            // Hydrate patient details from payload for immediate use (since insert result won't have the joined Profile)
            created.PatientFirstName = p.PatientFirstName;
            created.PatientLastName = p.PatientLastName;
            created.PatientEmail = p.PatientEmail;

            created.Service = new DentalService { Id = p.ServiceId, Name = p.ServiceName };

            // Log action
            await _logs.LogActionAsync(
                appt.PatientId,
                "booked appointment",
                $"Service: {p.ServiceName}",
                null,
                "Appointment",
                $"/Admin/Appointments?id={created.Id}"
            );

            // Send notification to staff or patient if needed
            if (appt.PatientId != null)
            {
                await _notifs.CreateNotificationAsync(
                    appt.PatientId,
                    "Appointment Booked",
                    $"Your appointment for {p.ServiceName} is now pending confirmation."
                );
            }

            // Send email
            if (!p.IsWaitlist)
            {
                if (p.IsGuest && !p.IsGuestConfirmed)
                {
                    // Guest needs OTP verification first
                    await SendGuestConfirmationEmail(created);
                }
                else
                {
                    // For confirmed guests (post-OTP), logged-in users, or staff-created walk-ins
                    if (created.Status == "confirmed")
                    {
                        await SendBookingConfirmationEmail(created);
                    }
                    else
                    {
                        // It's pending review by staff
                        await SendBookingReceivedEmail(created);
                    }
                }
            }

            Console.WriteLine(
                $"[Appointment] Created {created.Id} emailstatus={emailStatus} guest={p.IsGuest} waitlist={p.IsWaitlist}"
            );

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync(
                "ReceiveAppointmentUpdate",
                new { action = "create", id = created.Id }
            );

            return created;
        }

        // ── Confirm guest via token ───────────────────────────────────────────
        public async Task<Appointment?> ConfirmByToken(string token)
        {
            try
            {
                // First check if it's a cached payload waiting to be saved
                var cachedJson = await _cache.GetStringAsync(token);
                if (!string.IsNullOrEmpty(cachedJson))
                {
                    var p = JsonSerializer.Deserialize<AppointmentPayload>(cachedJson);
                    if (p != null)
                    {
                        p.IsGuestConfirmed = true;
                        // Re-run the Create logic to actually insert
                        var createdAppt = await Create(p);
                        await _cache.RemoveAsync(token);

                        // Force email status to confirmed in the DB just in case DetermineStatus logic is weird
                        createdAppt.EmailStatus = "confirmed";
                        createdAppt.ConfirmedAt = DateTime.UtcNow;
                        await _supabase
                            .From<Appointment>()
                            .Where(x => x.Id == createdAppt.Id)
                            .Set(x => x.EmailStatus, "confirmed")
                            .Set(x => x.ConfirmedAt, DateTime.UtcNow)
                            .Update();

                        return createdAppt;
                    }
                }

                // Fallback for older appointments already in the DB with token
                var res = await _supabase
                    .From<Appointment>()
                    .Where(a => a.ConfirmationToken == token)
                    .Get();
                var appt = res.Models.FirstOrDefault();
                if (appt == null)
                    return null;

                // Only mark the EMAIL as confirmed — staff still needs to confirm the appointment
                appt.EmailStatus = "confirmed";
                appt.ConfirmedAt = DateTime.UtcNow;
                // appt.Status stays "pending" — don't touch it here
                await _supabase.From<Appointment>().Upsert(appt);

                // Send appropriate email based on status
                if (appt.Status == "confirmed")
                {
                    await SendBookingConfirmationEmail(appt);
                }
                else
                {
                    await SendBookingReceivedEmail(appt);
                }

                return appt;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ConfirmByToken] {ex.Message}");
                return null;
            }
        }

        public async Task<Appointment?> ConfirmPromotion(string id)
        {
            try
            {
                var appt = await GetById(id);
                if (appt == null || appt.Status != "pending" || appt.IsWaitlist) return null;

                // If lock is still valid
                if (appt.SoftLockUntil != null && appt.SoftLockUntil < DateTime.UtcNow)
                {
                    Console.WriteLine($"[Waitlist] Lock expired for {id} at {appt.SoftLockUntil}");
                    return null;
                }

                var payload = new Dictionary<string, object?>
                {
                    ["status"] = "confirmed",
                    ["email_status"] = "confirmed",
                    ["soft_lock_until"] = null, // Clear the lock
                    ["confirmed_at"] = DateTime.UtcNow
                };

                var patchReq = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{id}");
                patchReq.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                var res = await _http.SendAsync(patchReq);

                if (res.IsSuccessStatusCode)
                {
                    var updated = await GetById(id);
                    if (updated != null)
                    {
                        await SendBookingConfirmationEmail(updated);
                        await _hubContext.Clients.All.SendAsync("ReceiveAppointmentUpdate", new { action = "confirmed", id = id });
                        return updated;
                    }
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ConfirmPromotion] {ex.Message}");
                return null;
            }
        }

        public async Task PromoteSpecific(string id)
        {
            var appt = await GetById(id) ?? throw new Exception("Not found.");
            if (!appt.IsWaitlist) throw new Exception("Not a waitlist appointment.");

            // Force promote this specific entry
            var isSameDay = appt.AppointmentDate.Date == DateTime.UtcNow.Date;
            var lockDuration = isSameDay ? TimeSpan.FromMinutes(30) : TimeSpan.FromHours(4);
            var lockUntil = DateTime.UtcNow.Add(lockDuration);

            var payload = new Dictionary<string, object?>
            {
                ["is_waitlist"] = false,
                ["email_status"] = "pending",
                ["status"] = "pending",
                ["soft_lock_until"] = lockUntil,
                ["notes"] = $"[SYSTEM] Manually promoted. Respond needed by {lockUntil:HH:mm} UTC."
            };

            var patchReq = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{id}");
            patchReq.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            await _http.SendAsync(patchReq);

            var promoted = await GetById(id);
            if (promoted != null)
            {
                await SendWaitlistPromotionEmail(promoted);
                await _hubContext.Clients.All.SendAsync("ReceiveAppointmentUpdate", new { action = "promoted", id = id });
            }
        }

        //         // ── Cancel + promote waitlist ─────────────────────────────────────────
        public async Task Cancel(string id)
        {
            var appt = await GetById(id) ?? throw new Exception("Not found.");

            var payload = new Dictionary<string, object> { ["status"] = "cancelled" };

            var req = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{id}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync(
                "ReceiveAppointmentUpdate",
                new { action = "cancel", id = id }
            );

            await SendCancellationEmail(appt);
            await PromoteWaitlist(
                appt.ServiceId,
                appt.DoctorId,
                appt.AppointmentDate,
                appt.AppointmentTime
            );
        }

        public async Task PromoteWaitlist(
            string serviceId,
            string? doctorId,
            DateTime date,
            string time
        )
        {
            try
            {
                var dateStr = date.ToString("yyyy-MM-dd");
                var res = await _supabase
                    .From<Appointment>()
                    .Where(a => a.ServiceId == serviceId)
                    .Where(a => a.IsWaitlist == true)
                    .Where(a => a.Status == "pending")
                    .Get();

                var next = res
                    .Models.Where(a => a.AppointmentDate.ToString("yyyy-MM-dd") == dateStr)
                    .OrderBy(a => a.WaitlistPosition ?? int.MaxValue)
                    .ThenBy(a => a.CreatedAt)
                    .FirstOrDefault();

                if (next == null)
                    return;

                var isSameDay = date.Date == DateTime.UtcNow.Date;
                // Normal: 4 hours, Same Day: 30 minutes
                var lockDuration = isSameDay ? TimeSpan.FromMinutes(30) : TimeSpan.FromHours(4);
                var lockUntil = DateTime.UtcNow.Add(lockDuration);

                var payload = new Dictionary<string, object?>
                {
                    ["is_waitlist"] = false,
                    ["email_status"] = "pending", 
                    ["status"] = "pending",
                    ["appointment_time"] = time,
                    ["doctor_id"] = doctorId,
                    ["soft_lock_until"] = lockUntil,
                    ["notes"] = $"[SYSTEM] Promoted from waitlist. Responded needed by {lockUntil:HH:mm} UTC."
                };

                var patchReq = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{next.Id}");
                patchReq.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var patchRes = await _http.SendAsync(patchReq);
                patchRes.EnsureSuccessStatusCode();

                // Re-fetch with joins
                var promoted = await GetById(next.Id);
                if (promoted != null)
                {
                    await SendWaitlistPromotionEmail(promoted);
                    
                    // Notify via SignalR
                    await _hubContext.Clients.All.SendAsync("ReceiveAppointmentUpdate", new { action = "promoted", id = next.Id });
                    
                    Console.WriteLine($"[Waitlist] Promoted {next.Id} to slot {time}. Lock until: {lockUntil}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PromoteWaitlist] {ex.Message}");
            }
        }

        public async Task CleanupExpiredWaitlistLocks()
        {
            try
            {
                // Find appointments that were promoted but lock expired
                var path = $"/appointments?select=*&status=eq.pending&soft_lock_until=lt.{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss}Z&is_waitlist=eq.false";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode) return;

                var json = await res.Content.ReadAsStringAsync();
                var expired = JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();

                foreach (var appt in expired)
                {
                    Console.WriteLine($"[Waitlist Cleanup] Expiring lock for {appt.Id}...");
                    
                    // Move back to waitlist
                    var payload = new Dictionary<string, object?>
                    {
                        ["is_waitlist"] = true,
                        ["status"] = "pending",
                        ["soft_lock_until"] = null,
                        ["notes"] = "[SYSTEM] Promotion expired. Moved back to waitlist."
                    };

                    var patchReq = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{appt.Id}");
                    patchReq.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                    await _http.SendAsync(patchReq);

                    // Trigger promotion for the NEXT person
                    await PromoteWaitlist(appt.ServiceId, null, appt.AppointmentDate, appt.AppointmentTime);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CleanupExpiredWaitlistLocks] {ex.Message}");
            }
        }

        // ── Admin-only: update status field ───────────────────────────────────
        public async Task UpdateStatus(string id, string newStatus, string? doctorId = null)
        {
            // 1. Fetch current appointment using direct HttpClient to avoid mapping issues
            var path = $"/appointments?id=eq.{id}&select=*,dental_services(*)";
            var req = BuildRequest(HttpMethod.Get, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            var json = await res.Content.ReadAsStringAsync();
            var dtos = JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions);
            var dto = dtos?.FirstOrDefault() ?? throw new Exception("Appointment not found.");

            // 2. Prepare update payload
            var updateData = new Dictionary<string, object>();

            // Handle Waitlist specific logic
            if (newStatus == "waitlist")
            {
                updateData["is_waitlist"] = true;
                updateData["status"] = "pending"; // Default back to pending if moving to waitlist
            }
            else
            {
                updateData["status"] = newStatus;
                updateData["is_waitlist"] = false;
            }

            if (newStatus == "confirmed")
            {
                updateData["confirmed_at"] = DateTime.UtcNow;
                updateData["soft_lock_until"] = null;
            }

            if (!string.IsNullOrEmpty(doctorId) && doctorId != "any")
            {
                updateData["doctor_id"] = doctorId;
            }

            // 3. Send PATCH request
            var patchPath = $"/appointments?id=eq.{id}";
            var patchReq = BuildRequest(new HttpMethod("PATCH"), patchPath);
            patchReq.Content = new StringContent(
                JsonSerializer.Serialize(updateData),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var patchRes = await _http.SendAsync(patchReq);
            if (!patchRes.IsSuccessStatusCode)
            {
                var err = await patchRes.Content.ReadAsStringAsync();
                throw new Exception(
                    $"Appointment status update failed: {patchRes.StatusCode} - {err}"
                );
            }

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync(
                "ReceiveAppointmentUpdate",
                new
                {
                    action = "status_update",
                    id = id,
                    status = newStatus,
                }
            );

            await _logs.LogActionAsync(
                null,
                "updated appointment status",
                $"ID: {id}, New Status: {newStatus}",
                null,
                "Appointment",
                $"/Admin/Appointments?id={id}"
            );

            // 3.5 If status is 'arrived', promote guest or 'other' to a patient profile
            if (newStatus == "arrived")
            {
                var fullAppt = await GetById(id);
                if (fullAppt != null)
                {
                    await FindOrCreatePatientProfile(fullAppt);
                }
            }

            // 4. Notify patient of manual confirmation if applicable
            if (newStatus == "confirmed")
            {
                // We need the full model for the email
                var fullAppt = await GetById(id);
                if (fullAppt != null)
                {
                    await SendBookingConfirmationEmail(fullAppt);

                    // 5. AUTO-CANCEL: If no more doctors available for this specific slot, cancel other pendings
                    await CheckAndCancelOverflowPendings(fullAppt);
                }
            }
        }

        private async Task CheckAndCancelOverflowPendings(Appointment appt)
        {
            try
            {
                // 1. Get availability for this slot
                var availability = await GetAvailability(
                    appt.Service?.Category ?? "",
                    appt.AppointmentDate,
                    appt.ServiceId
                );

                var slotLabel = DateTime
                    .Today.Add(appt.AppointmentTimeAsTimeSpan)
                    .ToString("h:mm tt");
                if (availability.TryGetValue(slotLabel, out var slotObj))
                {
                    var slot = JsonSerializer.Deserialize<Dictionary<string, object>>(
                        JsonSerializer.Serialize(slotObj)
                    );
                    if (slot != null && slot.TryGetValue("doctorCount", out var countObj))
                    {
                        int availableCount = Convert.ToInt32(countObj.ToString());

                        if (availableCount == 0)
                        {
                            Console.WriteLine(
                                $"[AutoCancel] Slot {slotLabel} on {appt.AppointmentDate:yyyy-MM-dd} is now FULL. Cancelling other pendings."
                            );

                            // 2. Find all other PENDING appointments for this same date and time
                            var dateStr = appt.AppointmentDate.ToString("yyyy-MM-dd");
                            var path =
                                $"/appointments?status=eq.pending&appointment_date=eq.{dateStr}&appointment_time=eq.{appt.AppointmentTime}&id=neq.{appt.Id}&is_waitlist=eq.false";
                            var req = BuildRequest(HttpMethod.Get, path);
                            var res = await _http.SendAsync(req);
                            if (res.IsSuccessStatusCode)
                            {
                                var json = await res.Content.ReadAsStringAsync();
                                var pendings =
                                    JsonSerializer.Deserialize<List<Appointment>>(
                                        json,
                                        _jsonOptions
                                    ) ?? new();

                                foreach (var p in pendings)
                                {
                                    // Cancel them
                                    await UpdateStatus(p.Id, "cancelled");

                                    // Notify patient (Optional: add a specific email for "Slot Full / Cancelled")
                                    await _emailService.SendEmailAsync(
                                        p.PatientEmail,
                                        p.PatientName,
                                        "Appointment Update - Slot Full",
                                        "Cancellation",
                                        new
                                        {
                                            Name = p.PatientName,
                                            Date = p.AppointmentDate.ToString("MMMM dd, yyyy"),
                                            Time = p.AppointmentTime,
                                            Reason = "The requested time slot has reached maximum capacity.",
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CheckAndCancelOverflowPendings] Error: {ex.Message}");
            }
        }

        public async Task<Appointment?> GetById(string id)
        {
            try
            {
                var path =
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles!profile_id(*))&id=eq.{id}&limit=1";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                if (!res.IsSuccessStatusCode)
                    return null;

                var json = await res.Content.ReadAsStringAsync();
                var dtos =
                    JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();
                var dto = dtos.FirstOrDefault();
                return dto != null ? MapToModel(dto) : null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetById Error]: {ex.Message}");
                return null;
            }
        }

        public async Task Delete(string id)
        {
            var path = $"/appointments?id=eq.{id}";
            var req = BuildRequest(HttpMethod.Delete, path);
            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();
        }

        // ── Reschedule ────────────────────────────────────────────────────────────────
        public async Task Reschedule(string id, DateTime newDate, string newTime, string? doctorId)
        {
            // Step 1: Verify the appointment exists using the same reliable HTTP path
            // that GetById already uses successfully
            var existing = await GetById(id);
            if (existing == null)
                throw new Exception($"Appointment {id} not found.");

            // Step 2: Build a minimal PATCH payload — no ORM, no upsert
            // Force UTC midnight to prevent serialization shifts
            var fixedDate = new DateTime(
                newDate.Year,
                newDate.Month,
                newDate.Day,
                0,
                0,
                0,
                DateTimeKind.Utc
            );

            var payload = new Dictionary<string, object?>
            {
                ["appointment_date"] = fixedDate.ToString("yyyy-MM-dd"),
                ["appointment_time"] = newTime,
                ["status"] = "confirmed",
            };

            if (!string.IsNullOrEmpty(doctorId) && doctorId != "any")
                payload["doctor_id"] = doctorId;

            var req = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{id}");
            req.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var res = await _http.SendAsync(req);
            res.EnsureSuccessStatusCode();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync(
                "ReceiveAppointmentUpdate",
                new { action = "reschedule", id = id }
            );

            await _logs.LogActionAsync(
                null,
                "rescheduled appointment",
                $"ID: {id}, New Date: {fixedDate:yyyy-MM-dd}, New Time: {newTime}",
                null,
                "Appointment",
                $"/Admin/Appointments?id={id}"
            );

            // Step 3: Re-fetch with doctor join so the email has the doctor name
            var updated = await GetById(id) ?? existing;
            updated.AppointmentDate = fixedDate;
            updated.AppointmentTime = newTime;

            await SendRescheduleEmail(updated);
            Console.WriteLine($"[Reschedule] {id} → {fixedDate:yyyy-MM-dd} {newTime}");
        }

        public async Task<List<Appointment>> GetAllAsync()
        {
            try
            {
                var path =
                    "/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles!profile_id(*)),patient_profile:profiles!patient_id(*)&order=created_at.desc";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var dtos =
                    JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();

                return dtos.Select(MapToModel).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetAllAsync Error]: {ex.Message}");
                return new();
            }
        }

        public async Task<List<Appointment>> GetByPatient(string patientId)
        {
            try
            {
                var path =
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles!profile_id(*)),patient_profile:profiles!patient_id(*)&patient_id=eq.{patientId}&order=created_at.desc";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var dtos =
                    JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();

                return dtos.Select(MapToModel).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetByPatient Error]: {ex.Message}");
                return new();
            }
        }

        public async Task<int> GetPendingCountByPatientAsync(string patientId)
        {
            try
            {
                // Count pending, non-waitlist appointments for this patient
                var res = await _supabase.From<Appointment>()
                    .Where(a => a.PatientId == patientId)
                    .Where(a => a.Status == "pending")
                    .Where(a => a.IsWaitlist == false)
                    .Count(Supabase.Postgrest.Constants.CountType.Exact);

                return res;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetPendingCountByPatient Error]: {ex.Message}");
                return 0;
            }
        }

        public async Task<List<Appointment>> GetByDoctorIdAsync(string doctorId)
        {
            try
            {
                var path =
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles!profile_id(*)),patient_profile:profiles!patient_id(*)&doctor_id=eq.{doctorId}&order=created_at.desc";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var dtos =
                    JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();

                return dtos.Select(MapToModel).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetByDoctorIdAsync Error]: {ex.Message}");
                return new();
            }
        }

        private Appointment MapToModel(AppointmentDto dto)
        {
            return new Appointment
            {
                Id = dto.Id,
                PatientId = dto.PatientId,
                PatientFirstName = dto.PatientFirstName,
                PatientLastName = dto.PatientLastName,
                PatientEmail = dto.PatientEmail,
                PatientPhone = dto.PatientPhone,
                PatientSex = dto.PatientSex,
                PatientDob = dto.PatientDob.HasValue
                    ? DateTime.SpecifyKind(dto.PatientDob.Value.Date, DateTimeKind.Utc)
                    : null,
                IsGuest = dto.IsGuest,
                IsForOther = dto.IsForOther,
                OtherFirstName = dto.OtherFirstName,
                OtherLastName = dto.OtherLastName,
                OtherEmail = dto.OtherEmail,
                OtherPhone = dto.OtherPhone,
                OtherSex = dto.OtherSex,
                OtherDob = dto.OtherDob.HasValue
                    ? DateTime.SpecifyKind(dto.OtherDob.Value.Date, DateTimeKind.Utc)
                    : null,
                ServiceId = dto.ServiceId,
                DoctorId = dto.DoctorId,
                AppointmentDate = DateTime.SpecifyKind(dto.AppointmentDate.Date, DateTimeKind.Utc),
                AppointmentTime = dto.AppointmentTime,
                Status = dto.Status,
                EmailStatus = dto.EmailStatus,
                IsWaitlist = dto.IsWaitlist,
                WaitlistPosition = dto.WaitlistPosition,
                ConfirmationToken = dto.ConfirmationToken,
                ConfirmedAt = dto.ConfirmedAt,
                Notes = dto.Notes,
                CreatedAt = dto.CreatedAt,
                // Map the joined service
                Service =
                    dto.DentalService != null
                        ? new DentalService
                        {
                            Id = dto.DentalService.Id,
                            Name = dto.DentalService.Name,
                            Price = dto.DentalService.Price,
                            Category = dto.DentalService.Category ?? string.Empty,
                            Duration = dto.DentalService.Duration,
                            DurationMinutes = dto.DentalService.DurationMinutes,
                        }
                        : null,

                // Map the joined doctor
                Doctor =
                    dto.Doctor != null
                        ? new Doctor
                        {
                            Id = dto.Doctor.Id,
                            Title = dto.Doctor.Title,
                            Specialties = dto.Doctor.Specialties,
                            Bio = dto.Doctor.Bio,
                            IsActive = dto.Doctor.IsActive,
                            Profile =
                                dto.Doctor.Profile != null
                                    ? new Profile
                                    {
                                        Id = dto.Doctor.Profile.Id,
                                        FirstName = dto.Doctor.Profile.FirstName,
                                        LastName = dto.Doctor.Profile.LastName,
                                        Email = dto.Doctor.Profile.Email,
                                        AvatarUrl = dto.Doctor.Profile.AvatarUrl,
                                        PhoneNumber = dto.Doctor.Profile.PhoneNumber,
                                        Role = dto.Doctor.Profile.Role,
                                    }
                                    : null,
                        }
                        : null,
                PatientProfile = dto.PatientProfile,
            };
        }

        // ── Get appointment by ID ─────────────────────────────────────────────
        // public async Task<Appointment?> GetById(string id)
        // {
        //     try
        //     {
        //         var path = $"/appointments?select=*,doctors(*,profiles(*))&id=eq.{id}&limit=1";
        //         var req  = BuildRequest(HttpMethod.Get, path);
        //         var res  = await _http.SendAsync(req);
        //         res.EnsureSuccessStatusCode();

        //         var json = await res.Content.ReadAsStringAsync();
        //         var dtos = JsonSerializer.Deserialize<List<AppointmentDto>>(json, _jsonOptions) ?? new();

        //         return dtos.Select(MapToModel).FirstOrDefault();
        // }

        // ── Promotion Logic (Identity Bridge) ──────────────────────────────────
        private async Task FindOrCreatePatientProfile(Appointment appt)
        {
            try
            {
                string targetEmail = appt.IsForOther ? appt.OtherEmail! : appt.PatientEmail;
                string targetPhone = appt.IsForOther ? appt.OtherPhone! : appt.PatientPhone;
                string targetFirst = appt.IsForOther
                    ? appt.OtherFirstName!
                    : (
                        !string.IsNullOrEmpty(appt.PatientFirstName)
                            ? appt.PatientFirstName
                            : "Patient"
                    );
                string targetLast = appt.IsForOther
                    ? appt.OtherLastName!
                    : (appt.PatientLastName ?? "");
                string? targetSex = appt.IsForOther ? appt.OtherSex : appt.PatientSex;
                DateTime? targetDob = appt.IsForOther ? appt.OtherDob : appt.PatientDob;

                // 1. Smart Match via ProfileService
                var matchResult = await _profiles.SmartMatchProfile(
                    targetFirst,
                    targetLast,
                    targetEmail,
                    targetPhone
                );
                string newPatientId;

                if (matchResult.Profile != null)
                {
                    newPatientId = matchResult.Profile.Id;
                    Console.WriteLine(
                        $"[Promotion] Found existing profile {newPatientId} for {targetEmail}/{targetPhone}"
                    );
                }
                else
                {
                    // 2. Create Shadow Profile
                    newPatientId = await _profiles.CreateShadowProfile(
                        targetFirst,
                        targetLast,
                        targetEmail,
                        targetPhone,
                        targetSex,
                        targetDob,
                        null, // address
                        matchResult.RequiresReview
                    );
                    Console.WriteLine($"[Promotion] Created new Shadow Profile {newPatientId}");
                }

                // 3. Link appointment to this profile using raw HTTP to bypass ORM cache issues
                if (appt.PatientId != newPatientId)
                {
                    var linkPath = $"/appointments?id=eq.{appt.Id}";
                    var linkReq = BuildRequest(new HttpMethod("PATCH"), linkPath);
                    linkReq.Content = new StringContent(
                        JsonSerializer.Serialize(new { patient_id = newPatientId }),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    );
                    var linkRes = await _http.SendAsync(linkReq);
                    linkRes.EnsureSuccessStatusCode();

                    Console.WriteLine(
                        $"[Promotion] Linked appointment {appt.Id} to profile {newPatientId}"
                    );
                }

                // 4. Initialize Clinical Records (Medical Info etc.)
                await _recordService.InitializePatientRecords(newPatientId, "system");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FindOrCreatePatientProfile] Error: {ex.Message}");
            }
        }

        // ── 1. Guest booking — requires email confirmation to finalize ─────────
        private async Task SendGuestConfirmationEmail(Appointment appt)
        {
            try
            {
                var otp = await _otpService.GenerateOtp(appt.PatientEmail, "appointment");
                var link =
                    $"{_appBaseUrl}/Confirm-Guest?email={Uri.EscapeDataString(appt.PatientEmail)}";

                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    "Verify your Samson Dental Appointment",
                    "OtpNotification",
                    new
                    {
                        Name = appt.PatientName,
                        Action = "confirming your appointment booking",
                        Code = otp,
                        Link = link, // In case they want to click
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendGuestConfirmationEmail] {ex.Message}");
            }
        }

        public async Task<Appointment?> ConfirmByOtp(
            string email,
            string code,
            string? token = null
        )
        {
            email = email.Trim().ToLower();
            try
            {
                // If we have a token, it might be a cached guest booking
                if (!string.IsNullOrEmpty(token))
                {
                    var apptFromToken = await ConfirmByToken(token);
                    if (apptFromToken != null)
                        return apptFromToken;
                }

                // Find profiles with this email first
                var profileRes = await _supabase.From<Profile>().Where(p => p.Email == email).Get();
                var profileIds = profileRes.Models.Select(p => p.Id).ToList();
                if (!profileIds.Any()) return null;

                // Find pending appointment for these profiles in database
                var res = await _supabase
                    .From<Appointment>()
                    .Filter("patient_id", Supabase.Postgrest.Constants.Operator.In, profileIds)
                    .Where(x => x.EmailStatus == "pending")
                    .Order("created_at", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();

                var appt = res.Models.FirstOrDefault();
                if (appt == null)
                    return null;

                // Mark as confirmed
                appt.EmailStatus = "confirmed";
                appt.ConfirmedAt = DateTime.UtcNow;
                await _supabase.From<Appointment>().Upsert(appt);

                // Send appropriate email based on status
                if (appt.Status == "confirmed")
                {
                    await SendBookingConfirmationEmail(appt);
                }
                else
                {
                    await SendBookingReceivedEmail(appt);
                }

                return appt;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ConfirmByOtp] {ex.Message}");
                return null;
            }
        }

        // ── 2. Logged-in / admin booking — appointment is already confirmed ────
        private async Task SendBookingConfirmationEmail(Appointment appt)
        {
            try
            {
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    "Booking Confirmed - Samson Dental Center",
                    "BookingConfirmation",
                    new
                    {
                        Name = appt.PatientName,
                        Reference = $"APT-{(appt.Id?.Length >= 4 ? appt.Id[..4] : "0000").ToUpper()}",
                        Service = appt.ServiceName,
                        Doctor = docName,
                        Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        Time = appt.AppointmentTime.ToUpper(),
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendBookingConfirmationEmail] {ex.Message}");
            }
        }

        private async Task SendBookingReceivedEmail(Appointment appt)
        {
            try
            {
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    "Booking Received - Pending Confirmation",
                    "BookingReceived",
                    new
                    {
                        Name = appt.PatientName,
                        Reference = $"APT-{(appt.Id?.Length >= 4 ? appt.Id[..4] : "0000").ToUpper()}",
                        Service = appt.ServiceName,
                        Doctor = docName,
                        Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        Time = appt.AppointmentTime.ToUpper(),
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendBookingReceivedEmail] {ex.Message}");
            }
        }

        // ── 3. Cancellation notice ────────────────────────────────────────────
        private async Task SendCancellationEmail(Appointment appt)
        {
            try
            {
                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    $"Appointment Cancelled — {appt.ServiceName}",
                    "Cancellation",
                    new
                    {
                        Name = appt.PatientName,
                        Service = appt.ServiceName,
                        Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        Time = appt.AppointmentTime.ToUpper(),
                        RescheduleLink = $"{_appBaseUrl}/Appointments"
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendCancellationEmail] {ex.Message}");
            }
        }

        // ── 4. Reschedule notice ──────────────────────────────────────────────
        private async Task SendRescheduleEmail(Appointment appt)
        {
            try
            {
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    $"Appointment Rescheduled — {appt.ServiceName}",
                    "Reschedule",
                    new
                    {
                        Name = appt.PatientName,
                        Service = appt.ServiceName,
                        Doctor = docName,
                        Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        Time = appt.AppointmentTime.ToUpper(),
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendRescheduleEmail] {ex.Message}");
            }
        }

        // ── 5. Waitlist promotion ─────────────────────────────────────────────
        private async Task SendWaitlistPromotionEmail(Appointment appt)
        {
            try
            {
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                await _emailService.SendEmailAsync(
                    appt.PatientEmail,
                    appt.PatientName,
                    $"Good News — A Slot Just Opened for {appt.ServiceName}!",
                    "Promotion",
                    new
                    {
                        Name = appt.PatientName,
                        Service = appt.ServiceName,
                        Doctor = docName,
                        Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        Time = appt.AppointmentTime.ToUpper(),
                        ConfirmLink = $"{_appBaseUrl}/Confirm-Promotion?id={appt.Id}",
                        ExpirationTime = appt.SoftLockUntil?.AddHours(8).ToString("hh:mm tt")
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendWaitlistPromotionEmail] {ex.Message}");
            }
        }

        private static string DetermineEmailStatus(AppointmentPayload p)
        {
            if (!p.IsGuest)
                return "not_applicable"; // logged-in users don't need email confirmation
            if (p.IsWaitlist)
                return "not_applicable";
            return "pending"; // guest non-waitlist → needs email confirmation
        }
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────
    public class DentalServiceDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("price")]
        public decimal Price { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("duration")]
        public string? Duration { get; set; }

        [JsonPropertyName("duration_minutes")]
        public int DurationMinutes { get; set; } = 60;
    }

    public class AppointmentDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("patient_id")]
        public string? PatientId { get; set; }

        [JsonPropertyName("patient_first_name")]
        public string PatientFirstName { get; set; } = string.Empty;

        [JsonPropertyName("patient_last_name")]
        public string PatientLastName { get; set; } = string.Empty;

        [JsonPropertyName("patient_name")]
        public string PatientName => $"{PatientFirstName} {PatientLastName}".Trim();

        [JsonPropertyName("patient_email")]
        public string PatientEmail { get; set; } = string.Empty;

        [JsonPropertyName("patient_phone")]
        public string PatientPhone { get; set; } = string.Empty;

        [JsonPropertyName("patient_sex")]
        public string? PatientSex { get; set; }

        [JsonPropertyName("patient_dob")]
        public DateTime? PatientDob { get; set; }

        [JsonPropertyName("is_guest")]
        public bool IsGuest { get; set; }

        [JsonPropertyName("is_for_other")]
        public bool IsForOther { get; set; }

        [JsonPropertyName("other_first_name")]
        public string? OtherFirstName { get; set; }

        [JsonPropertyName("other_last_name")]
        public string? OtherLastName { get; set; }

        [JsonPropertyName("other_email")]
        public string? OtherEmail { get; set; }

        [JsonPropertyName("other_phone")]
        public string? OtherPhone { get; set; }

        [JsonPropertyName("other_sex")]
        public string? OtherSex { get; set; }

        [JsonPropertyName("other_dob")]
        public DateTime? OtherDob { get; set; }

        [JsonPropertyName("service_id")]
        public string ServiceId { get; set; } = string.Empty;

        [JsonPropertyName("dental_service")]
        public DentalServiceDto? DentalService { get; set; }

        [JsonPropertyName("doctor_id")]
        public string? DoctorId { get; set; }

        [JsonPropertyName("appointment_date")]
        public DateTime AppointmentDate { get; set; }

        [JsonPropertyName("appointment_time")]
        public string AppointmentTime { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("email_status")]
        public string EmailStatus { get; set; } = "pending";

        [JsonPropertyName("is_waitlist")]
        public bool IsWaitlist { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [JsonPropertyName("source")]
        public string Source { get; set; } = "online";

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("waitlist_position")]
        public int? WaitlistPosition { get; set; }

        [JsonPropertyName("confirmation_token")]
        public string? ConfirmationToken { get; set; }

        [JsonPropertyName("confirmed_at")]
        public DateTime? ConfirmedAt { get; set; }

        [JsonPropertyName("doctor")]
        public DoctorDto? Doctor { get; set; }

        [JsonPropertyName("patient_profile")]
        public Profile? PatientProfile { get; set; }
    }

    public class AppointmentPayload
    {
        public string? PatientId { get; set; }
        public string PatientFirstName { get; set; } = string.Empty;
        public string PatientLastName { get; set; } = string.Empty;
        public string PatientName => $"{PatientFirstName} {PatientLastName}".Trim();
        public string PatientEmail { get; set; } = string.Empty;
        public string PatientPhone { get; set; } = string.Empty;
        public string? PatientAddress { get; set; }
        public string? PatientSex { get; set; }
        public DateTime? PatientDob { get; set; }
        public bool IsGuest { get; set; }
        public bool IsGuestConfirmed { get; set; }
        public bool IsForOther { get; set; }
        public string? OtherFirstName { get; set; }
        public string? OtherLastName { get; set; }
        public string? OtherEmail { get; set; }
        public string? OtherPhone { get; set; }
        public string? OtherSex { get; set; }
        public DateTime? OtherDob { get; set; }
        public string ServiceId { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public string? DoctorId { get; set; }
        public string AppointmentDate { get; set; } = string.Empty;
        public string AppointmentTime { get; set; } = string.Empty;
        public bool IsWaitlist { get; set; }
        public string Status { get; set; } = "pending";
        public string? Notes { get; set; }
        public string Source { get; set; } = "online";
        public string? EmergencyContact { get; set; }
        public string? Relationship { get; set; }
    }
}
