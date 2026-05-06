using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Distributed;
using Resend;
using SamsonDentalCenterManagementSystem.Hubs;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class AppointmentService
    {
        public readonly Supabase.Client _supabase;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IResend _resend;
        private readonly string _appBaseUrl;
        private readonly HttpClient _http;
        private readonly ActivityLogService _logs;
        private readonly NotificationService _notifs;
        private readonly ClinicService _clinic;
        private readonly BlockedDateService _blockedDates;
        private readonly IHubContext<AdminHub> _hubContext;
        private readonly ProfileService _profiles;
        private readonly RecordService _recordService;
        private readonly IDistributedCache _cache;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        private const string FROM = "Samson Dental Center <onboarding@resend.dev>";

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
            IResend resend,
            string appBaseUrl,
            HttpClient http,
            ActivityLogService logs,
            NotificationService notifs,
            IHubContext<AdminHub> hubContext,
            ClinicService clinic,
            BlockedDateService blockedDates,
            ProfileService profiles,
            RecordService recordService,
            IDistributedCache cache
        )
        {
            _supabase = supabase;
            _serviceRoleKey = serviceRoleKey;
            _supabaseUrl = supabaseUrl.TrimEnd('/');
            _resend = resend;
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
                    "/doctors?select=*,profile:profiles(*)&is_active=eq.true&order=title.asc";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var dtos = JsonSerializer.Deserialize<List<DoctorDto>>(json, _jsonOptions) ?? new();

                return dtos.Select(d => new Doctor
                    {
                        Id = d.Id,
                        Title = d.Title,
                        Specialties = d.Specialties,
                        Bio = d.Bio,
                        IsActive = d.IsActive,
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
                var path =
                    $"/appointments?select=*,Service:dental_services!service_id(*)&doctor_id=eq.{doctorId}&status=neq.cancelled&is_waitlist=eq.false";
                var req = BuildRequest(HttpMethod.Get, path);
                var res = await _http.SendAsync(req);
                res.EnsureSuccessStatusCode();

                var json = await res.Content.ReadAsStringAsync();
                var all =
                    JsonSerializer.Deserialize<List<Appointment>>(json, _jsonOptions) ?? new();

                var dateStr = date.ToString("yyyy-MM-dd");
                return all.Where(a => a.AppointmentDate.ToString("yyyy-MM-dd") == dateStr).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetBookedAppointments] {ex.Message}");
                return new();
            }
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
            foreach (var doc in doctors)
            {
                bookedMap[doc.Id] = await GetBookedAppointments(doc.Id, date);
            }

            var result = new Dictionary<string, object>();
            var currentTime = openTime;

            // Past time check for TODAY
            var nowTime = DateTime.Now.TimeOfDay;
            bool isToday = date.Date == DateTime.Today;

            // SPACING: The user wants the slots to reflect duration + buffer
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
                    foreach (var doc in doctors)
                    {
                        var booked = bookedMap[doc.Id];
                        bool isBusy = false;
                        foreach (var b in booked)
                        {
                            if (DateTime.TryParse(b.AppointmentTime, out var bStartDt))
                            {
                                var bStart = bStartDt.TimeOfDay;
                                var bBuffer = b.Service?.BufferMinutes ?? 15;
                                var bEnd = bStart.Add(
                                    TimeSpan.FromMinutes(b.DurationMinutes + bBuffer)
                                );

                                // Overlap check: (StartA < EndB) AND (EndA > StartB)
                                if (
                                    currentTime < bEnd
                                    && slotEnd.Add(TimeSpan.FromMinutes(buffer)) > bStart
                                )
                                {
                                    isBusy = true;
                                    break;
                                }
                            }
                        }

                        if (!isBusy)
                            availableDoctorIds.Add(doc.Id);
                    }

                    result[slotLabel] = new
                    {
                        available = availableDoctorIds.Count > 0,
                        doctorCount = availableDoctorIds.Count,
                        time24 = currentTime.ToString(@"hh\:mm"),
                    };
                }

                currentTime = currentTime.Add(TimeSpan.FromMinutes(step));
            }

            return result;
        }

        // ── FIX Bug 2: Double-booking check — only blocks same patient as PATIENT ─
        // If booking for someone else (isForOther=true), the logged-in user is
        // just the contact — a different person is the patient — so allow it.
        public async Task<bool> HasExistingBookingAsPatient(string patientId, DateTime date)
        {
            try
            {
                var res = await _supabase
                    .From<Appointment>()
                    .Where(a => a.PatientId == patientId)
                    .Where(a => a.IsForOther == false)
                    .Where(a => a.Status != "cancelled")
                    .Get();

                return res.Models.Any(a => a.AppointmentDate.Date == date.Date);
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
        private static string DetermineStatus(AppointmentPayload p)
        {
            if (p.IsWaitlist)
                return "waitlist";

            // Staff-created appointments (Admin/Receptionist/Walk-in) are auto-confirmed if doctor is assigned
            var src = (p.Source ?? "").ToLower();
            if (
                (src == "admin" || src == "receptionist" || src == "walk_in")
                && !string.IsNullOrEmpty(p.DoctorId)
            )
                return "confirmed";

            return "pending";
        }

        // ── Create appointment ────────────────────────────────────────────────
        public async Task<Appointment> Create(AppointmentPayload p)
        {
            // ── Validation ───────────────────────────────────────────────────
            if (!p.IsWaitlist)
            {
                // 1. Blocked Dates
                if (await _blockedDates.IsDateBlockedAsync(p.AppointmentDate))
                    throw new Exception("This date is blocked by the clinic.");

                // 2. Clinic Hours
                var settings = await _clinic.GetSettingsAsync();
                var dayName = p.AppointmentDate.DayOfWeek.ToString();
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
                    var booked = await GetBookedAppointments(p.DoctorId, p.AppointmentDate);

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

                                // Overlap check: (StartA < EndB) AND (EndA > StartB)
                                if (
                                    newStart < bEnd
                                    && newEnd.Add(TimeSpan.FromMinutes(buffer)) > bStart
                                )
                                    throw new Exception(
                                        "This time slot overlaps with an existing appointment for this specialist."
                                    );
                            }
                        }
                    }

                    // Check doctor's scheduled availability
                    var dow = (int)p.AppointmentDate.DayOfWeek;
                    var availPath =
                        $"/staff_availability?staff_id=eq.{p.DoctorId}&day_of_week=eq.{dow}&is_active=eq.true";
                    var availReq = BuildRequest(HttpMethod.Get, availPath);
                    var availRes = await _http.SendAsync(availReq);
                    if (availRes.IsSuccessStatusCode)
                    {
                        var availJson = await availRes.Content.ReadAsStringAsync();
                        var slots =
                            JsonSerializer.Deserialize<List<StaffAvailability>>(
                                availJson,
                                _jsonOptions
                            ) ?? new();
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
            }

            var status = DetermineStatus(p);
            var emailStatus = (status == "confirmed" || status == "waitlist") ? status : "pending";
            if (p.IsGuestConfirmed)
                emailStatus = "confirmed";

            // FIX THE DATE BUG: Strip time and offset to keep it on the selected day
            var fixedDate = DateTime.SpecifyKind(p.AppointmentDate.Date, DateTimeKind.Unspecified);

            var token = (p.IsGuest && !p.IsWaitlist) ? Guid.NewGuid().ToString("N") : null;

            // ── DECOUPLE DATABASE FOR UNCONFIRMED GUESTS ──────────────────────
            if (p.IsGuest && !p.IsWaitlist && !p.IsGuestConfirmed)
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
                    PatientFirstName = p.PatientFirstName,
                    PatientLastName = p.PatientLastName,
                    PatientEmail = p.PatientEmail,
                    Service = new DentalService { Name = p.ServiceName },
                    AppointmentDate = fixedDate,
                    AppointmentTime = p.AppointmentTime,
                    ConfirmationToken = cacheToken,
                    EmailStatus = "pending",
                    Status = "pending",
                    IsGuest = true,
                    IsWaitlist = false,
                };

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

            // --- Smart Matching & Shadow Profiles ---
            if (p.IsGuest && string.IsNullOrEmpty(p.PatientId))
            {
                var firstName = p.PatientFirstName;
                var lastName = p.PatientLastName;

                var matchResult = await _profiles.SmartMatchProfile(
                    firstName,
                    lastName,
                    p.PatientEmail,
                    p.PatientPhone
                );

                if (matchResult.Profile != null)
                {
                    // Strong Match found -> Auto link
                    p.PatientId = matchResult.Profile.Id;
                }
                // If no match is found, we leave PatientId as null.
                // Identity Bridge: The profile is only created when marked 'Arrived'.
            }

            // --- Auto Assign Previous Doctor ---
            if (string.IsNullOrEmpty(p.DoctorId) && !string.IsNullOrEmpty(p.PatientId))
            {
                try
                {
                    var pastRes = await _supabase
                        .From<Appointment>()
                        .Select("doctor_id")
                        .Where(a => a.PatientId == p.PatientId)
                        .Order(a => a.CreatedAt, Supabase.Postgrest.Constants.Ordering.Descending)
                        .Get();

                    var pastAppt = pastRes.Models.FirstOrDefault(a =>
                        !string.IsNullOrEmpty(a.DoctorId)
                    );
                    if (pastAppt != null && !string.IsNullOrEmpty(pastAppt.DoctorId))
                    {
                        p.DoctorId = pastAppt.DoctorId;
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
                PatientFirstName = p.PatientFirstName,
                PatientLastName = p.PatientLastName,
                PatientEmail = p.PatientEmail,
                PatientPhone = p.PatientPhone,
                PatientSex = p.PatientSex,
                PatientDob = p.PatientDob,
                IsGuest = p.IsGuest,
                IsForOther = p.IsForOther,
                OtherFirstName = p.OtherFirstName,
                OtherLastName = p.OtherLastName,
                OtherEmail = p.OtherEmail,
                OtherPhone = p.OtherPhone,
                OtherSex = p.OtherSex,
                OtherDob = p.OtherDob,
                ServiceId = p.ServiceId,
                DoctorId = p.DoctorId,
                AppointmentDate = fixedDate,
                AppointmentTime = p.AppointmentTime,
                IsWaitlist = p.IsWaitlist,
                Status = status,
                EmailStatus = emailStatus,
                Notes = p.Notes,
                Source = !string.IsNullOrEmpty(p.Source)
                    ? p.Source
                    : (p.IsGuest ? "guest" : "online"),
                CreatedAt = DateTime.UtcNow,
                ConfirmationToken = token,
                ConfirmedAt = status == "confirmed" ? DateTime.UtcNow : null,
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

            // Send email for guest non-waitlist bookings
            if (p.IsGuest && !p.IsWaitlist)
                await SendGuestConfirmationEmail(created);

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
                return appt;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ConfirmByToken] {ex.Message}");
                return null;
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

        private async Task PromoteWaitlist(
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

                var payload = new Dictionary<string, object?>
                {
                    ["is_waitlist"] = false,
                    ["email_status"] = next.IsGuest ? "pending" : "confirmed",
                    ["appointment_time"] = time,
                    ["doctor_id"] = doctorId,
                };

                var patchReq = BuildRequest(HttpMethod.Patch, $"/appointments?id=eq.{next.Id}");
                patchReq.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var patchRes = await _http.SendAsync(patchReq);
                patchRes.EnsureSuccessStatusCode();

                // Re-fetch with joins so ServiceName and Doctor are populated for the email
                var promoted = await GetById(next.Id);
                if (promoted != null)
                {
                    await SendWaitlistPromotionEmail(promoted);
                    Console.WriteLine($"[Waitlist] Promoted {next.Id} to slot {time}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PromoteWaitlist] {ex.Message}");
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
            }

            if (doctorId != null)
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
                    await SendBookingConfirmationEmail(fullAppt);
            }
        }

        public async Task<Appointment?> GetById(string id)
        {
            try
            {
                var path =
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles(*))&id=eq.{id}&limit=1";
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
            var fixedDate = DateTime.SpecifyKind(newDate.Date, DateTimeKind.Unspecified);

            var payload = new Dictionary<string, object?>
            {
                ["appointment_date"] = fixedDate.ToString("yyyy-MM-dd"),
                ["appointment_time"] = newTime,
                ["status"] = "confirmed",
            };

            if (doctorId != null)
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
                    "/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles(*)),patient_profile:profiles!patient_id(*)&order=appointment_date.desc";
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
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles(*)),patient_profile:profiles!patient_id(*)&patient_id=eq.{patientId}&order=appointment_date.desc";
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

        public async Task<List<Appointment>> GetByDoctorIdAsync(string doctorId)
        {
            try
            {
                var path =
                    $"/appointments?select=*,dental_service:dental_services!service_id(*),doctor:doctors(*,profile:profiles(*)),patient_profile:profiles!patient_id(*)&doctor_id=eq.{doctorId}&order=appointment_date.desc";
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
                PatientDob = dto.PatientDob,
                IsGuest = dto.IsGuest,
                IsForOther = dto.IsForOther,
                OtherFirstName = dto.OtherFirstName,
                OtherLastName = dto.OtherLastName,
                OtherEmail = dto.OtherEmail,
                OtherPhone = dto.OtherPhone,
                OtherSex = dto.OtherSex,
                OtherDob = dto.OtherDob,
                ServiceId = dto.ServiceId,
                DoctorId = dto.DoctorId,
                AppointmentDate = dto.AppointmentDate,
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
                var confirmUrl =
                    $"{_appBaseUrl}/appointments/confirm?token={appt.ConfirmationToken}";
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                var msg = new EmailMessage();
                msg.From = FROM;
                msg.To.Add(appt.PatientEmail);
                msg.Subject = $"Confirm Your Appointment — {appt.ServiceName}";
                msg.HtmlBody = $"""
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 0;">
                      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;
                                  border:1px solid #e2e8f0;overflow:hidden;">

                        <!-- Header -->
                        <div style="background:#0f5bcc;padding:28px 32px;">
                          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">
                            Samson Dental Center
                          </h1>
                          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">
                            Appointment Confirmation Required
                          </p>
                        </div>

                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
                          ${(appt.IsForOther ? $"""
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
                            You are receiving this because you booked an appointment for <strong>{appt.OtherFirstName} {appt.OtherLastName}</strong>.
                          </p>
                          """ : "")}
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            You have a pending appointment. Please click the button below to
                            confirm it — the link expires in <strong>24 hours</strong>.
                          </p>

                          <!-- Appointment card -->
                          <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Service</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.ServiceName}</td>
                              </tr>
                              {(docName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{docName}</td>
                              </tr>
                              """ : "")}
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Date</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{formattedDate}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Time</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.AppointmentTime}</td>
                              </tr>
                            </table>
                          </div>

                          <!-- CTA -->
                          <div style="text-align:center;margin-bottom:24px;">
                            <a href="{confirmUrl}"
                               style="display:inline-block;background:#0f5bcc;color:#fff;font-size:14px;
                                      font-weight:700;padding:14px 32px;border-radius:12px;
                                      text-decoration:none;letter-spacing:.3px;">
                              Confirm Appointment
                            </a>
                          </div>

                          <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
                            If you did not book this appointment, you can safely ignore this email.
                          </p>
                        </div>

                        <!-- Footer -->
                        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;
                                    background:#f8fafc;text-align:center;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;">
                            © {DateTime.UtcNow.Year} Samson Dental Center · All rights reserved
                          </p>
                        </div>

                      </div>
                    </body>
                    </html>
                    """;

                // Temporary log for manual confirmation without Resend subdomain
                Console.WriteLine("\n=======================================================");
                Console.WriteLine($"[MANUAL CONFIRMATION LINK] FOR {appt.PatientEmail}:");
                Console.WriteLine(confirmUrl);
                Console.WriteLine("=======================================================\n");

                await _resend.EmailSendAsync(msg);
                Console.WriteLine($"[Email] Guest confirmation sent → {appt.PatientEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendGuestConfirmationEmail] {ex.Message}");
            }
        }

        // ── 2. Logged-in / admin booking — appointment is already confirmed ────
        private async Task SendBookingConfirmationEmail(Appointment appt)
        {
            try
            {
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                var msg = new EmailMessage();
                msg.From = FROM;
                msg.To.Add(appt.PatientEmail);
                msg.Subject = $"Appointment Confirmed — {appt.ServiceName} on {formattedDate}";
                msg.HtmlBody = $"""
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 0;">
                      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;
                                  border:1px solid #e2e8f0;overflow:hidden;">

                        <div style="background:#0f5bcc;padding:28px 32px;">
                          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">
                            Samson Dental Center
                          </h1>
                          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">
                            Your Appointment is Confirmed ✓
                          </p>
                        </div>

                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
                          ${(appt.IsForOther ? $"""
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 16px;">
                            Your appointment for <strong>{appt.OtherFirstName} {appt.OtherLastName}</strong> has been confirmed.
                          </p>
                          """ : $"""
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            Your appointment has been confirmed. We look forward to seeing you!
                          </p>
                          """)}

                          <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Reference</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;letter-spacing:1px;">
                                  #APT-{(appt.Id?.Length >= 4 ? appt.Id[..4] : "0000").ToUpper()}
                                </td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Service</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.ServiceName}</td>
                              </tr>
                              {(docName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{docName}</td>
                              </tr>
                              """ : "")}
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Date</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{formattedDate}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Time</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.AppointmentTime}</td>
                              </tr>
                            </table>
                          </div>

                          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">
                            Please arrive 10 minutes before your scheduled time. If you need to
                            reschedule or cancel, contact us as soon as possible.
                          </p>
                        </div>

                        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;
                                    background:#f8fafc;text-align:center;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;">
                            © {DateTime.UtcNow.Year} Samson Dental Center · All rights reserved
                          </p>
                        </div>

                      </div>
                    </body>
                    </html>
                    """;

                await _resend.EmailSendAsync(msg);
                Console.WriteLine($"[Email] Booking confirmation sent → {appt.PatientEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SendBookingConfirmationEmail] {ex.Message}");
            }
        }

        // ── 3. Cancellation notice ────────────────────────────────────────────
        private async Task SendCancellationEmail(Appointment appt)
        {
            try
            {
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");

                var msg = new EmailMessage();
                msg.From = FROM;
                msg.To.Add(appt.PatientEmail);
                msg.Subject = $"Appointment Cancelled — {appt.ServiceName} on {formattedDate}";
                msg.HtmlBody = $"""
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 0;">
                      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;
                                  border:1px solid #e2e8f0;overflow:hidden;">

                        <div style="background:#dc2626;padding:28px 32px;">
                          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">
                            Samson Dental Center
                          </h1>
                          <p style="margin:4px 0 0;color:#fecaca;font-size:13px;">
                            Appointment Cancelled
                          </p>
                        </div>

                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            Your appointment has been cancelled. If you did not request this,
                            please contact us immediately.
                          </p>

                          <div style="background:#fef2f2;border-radius:12px;padding:16px 20px;margin-bottom:24px;
                                      border:1px solid #fecaca;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Service</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.ServiceName}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Date</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{formattedDate}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Time</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.AppointmentTime}</td>
                              </tr>
                            </table>
                          </div>

                          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">
                            To book a new appointment, visit our website or contact the clinic directly.
                          </p>
                        </div>

                        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;
                                    background:#f8fafc;text-align:center;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;">
                            © {DateTime.UtcNow.Year} Samson Dental Center · All rights reserved
                          </p>
                        </div>

                      </div>
                    </body>
                    </html>
                    """;

                await _resend.EmailSendAsync(msg);
                Console.WriteLine($"[Email] Cancellation sent → {appt.PatientEmail}");
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
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                var msg = new EmailMessage();
                msg.From = FROM;
                msg.To.Add(appt.PatientEmail);
                msg.Subject = $"Appointment Rescheduled — {appt.ServiceName}";
                msg.HtmlBody = $"""
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 0;">
                      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;
                                  border:1px solid #e2e8f0;overflow:hidden;">

                        <div style="background:#0f5bcc;padding:28px 32px;">
                          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">
                            Samson Dental Center
                          </h1>
                          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">
                            Your Appointment Has Been Rescheduled
                          </p>
                        </div>

                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            Your appointment has been rescheduled. Here are your updated details:
                          </p>

                          <div style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Service</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.ServiceName}</td>
                              </tr>
                              {(docName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{docName}</td>
                              </tr>
                              """ : "")}
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">New Date</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{formattedDate}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">New Time</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.AppointmentTime}</td>
                              </tr>
                            </table>
                          </div>

                          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">
                            Please arrive 10 minutes before your scheduled time.
                            Contact us if you have any questions.
                          </p>
                        </div>

                        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;
                                    background:#f8fafc;text-align:center;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;">
                            © {DateTime.UtcNow.Year} Samson Dental Center · All rights reserved
                          </p>
                        </div>

                      </div>
                    </body>
                    </html>
                    """;

                await _resend.EmailSendAsync(msg);
                Console.WriteLine($"[Email] Reschedule notice sent → {appt.PatientEmail}");
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
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");
                var docName =
                    appt.Doctor?.Profile != null
                        ? $"{appt.Doctor.Title} {appt.Doctor.Profile.FirstName} {appt.Doctor.Profile.LastName}".Trim()
                        : null;

                var msg = new EmailMessage();
                msg.From = FROM;
                msg.To.Add(appt.PatientEmail);
                msg.Subject = $"Good News — A Slot Just Opened for {appt.ServiceName}!";
                msg.HtmlBody = $"""
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family:sans-serif;background:#f8fafc;margin:0;padding:32px 0;">
                      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;
                                  border:1px solid #e2e8f0;overflow:hidden;">

                        <div style="background:#059669;padding:28px 32px;">
                          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">
                            Samson Dental Center
                          </h1>
                          <p style="margin:4px 0 0;color:#a7f3d0;font-size:13px;">
                            You've Been Moved Off the Waitlist 🎉
                          </p>
                        </div>

                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            Great news! A slot opened up and you've been automatically booked.
                            Here are your appointment details:
                          </p>

                          <div style="background:#ecfdf5;border-radius:12px;padding:16px 20px;margin-bottom:24px;
                                      border:1px solid #a7f3d0;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Service</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.ServiceName}</td>
                              </tr>
                              {(docName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{docName}</td>
                              </tr>
                              """ : "")}
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Date</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{formattedDate}</td>
                              </tr>
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Time</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.AppointmentTime}</td>
                              </tr>
                            </table>
                          </div>

                          <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;">
                            Please arrive 10 minutes before your scheduled time.
                            If you can no longer attend, please let us know as soon as possible
                            so we can offer the slot to another patient.
                          </p>
                        </div>

                        <div style="border-top:1px solid #e2e8f0;padding:16px 32px;
                                    background:#f8fafc;text-align:center;">
                          <p style="margin:0;color:#94a3b8;font-size:11px;">
                            © {DateTime.UtcNow.Year} Samson Dental Center · All rights reserved
                          </p>
                        </div>

                      </div>
                    </body>
                    </html>
                    """;

                await _resend.EmailSendAsync(msg);
                Console.WriteLine($"[Email] Waitlist promotion sent → {appt.PatientEmail}");
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
        public DateTime AppointmentDate { get; set; }
        public string AppointmentTime { get; set; } = string.Empty;
        public bool IsWaitlist { get; set; }
        public string Status { get; set; } = "pending";
        public string? Notes { get; set; }
        public string Source { get; set; } = "online";
    }
}
