// ── Services/AppointmentService.cs ───────────────────────────────────────────
using Resend;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class AppointmentService
    {
       private readonly Supabase.Client _supabase;
        private readonly string _supabaseUrl;
        private readonly string _serviceRoleKey;
        private readonly IResend _resend;
        private readonly string _appBaseUrl;

         private const string FROM = "Samson Dental Center <onboarding@resend.dev>";


        public static readonly string[] ALL_SLOTS =
        {
            "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
            "1:00 PM",  "2:00 PM",  "3:00 PM",  "4:00 PM",  "5:00 PM"
        };

        public AppointmentService(
            Supabase.Client supabase,
            string serviceRoleKey,
            string supabaseUrl,
            IResend resend,
            string appBaseUrl)
        {
            _supabase       = supabase;
            _serviceRoleKey = serviceRoleKey;
            _supabaseUrl    = supabaseUrl;
            _resend         = resend;
            _appBaseUrl     = appBaseUrl.TrimEnd('/');
        }

        // ── Get doctors ───────────────────────────────────────────────────────
        public async Task<List<Doctor>> GetDoctors()
        {
            try
            {
                var res = await _supabase.From<Doctor>()
                    .Where(d => d.IsActive == true)
                    .Get();
                return res.Models ?? new();
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
        public async Task<List<string>> GetBookedSlots(string doctorId, DateTime date)
        {
            try
            {
               var res = await _supabase.From<Appointment>()
                  .Where(a => a.DoctorId  == doctorId)
                  .Where(a => a.Status    != "cancelled")   // ← was a.EmailStatus
                  .Where(a => a.IsWaitlist == false)
                  .Get();

              var dateStr = date.ToString("yyyy-MM-dd");
              return res.Models
                  .Where(a => a.AppointmentDate.ToString("yyyy-MM-dd") == dateStr)
                  .Select(a => a.AppointmentTime)
                  .ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetBookedSlots] {ex.Message}");
                return new();
            }
        }

        // ── Availability per service + date ───────────────────────────────────
        public async Task<Dictionary<string, object>> GetAvailability(string category, DateTime date)
        {
            var doctors = await GetDoctorsForService(category);
            var result  = new Dictionary<string, object>();

            foreach (var slot in ALL_SLOTS)
            {
                var availableDoctorIds = new List<string>();
                foreach (var doc in doctors)
                {
                    // FIX Bug 1: pass serviceId so slots are scoped per service
                    var booked = await GetBookedSlots(doc.Id, date);
                    if (!booked.Contains(slot))
                        availableDoctorIds.Add(doc.Id);
                }

                result[slot] = new
                {
                    available   = availableDoctorIds.Count > 0,
                    doctorCount = availableDoctorIds.Count
                };
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
        var res = await _supabase.From<Appointment>()
            .Where(a => a.PatientId == patientId)
            .Where(a => a.IsForOther == false)
            .Where(a => a.EmailStatus != "cancelled")
            .Get();

        return res.Models.Any(a => a.AppointmentDate.Date == date.Date);
    }
    catch { return false; }
}

        // ── FIX Bug 4: Correct status logic ──────────────────────────────────
        // Logged-in patients  → "confirmed"  (they're authenticated, trust them)
        // Guests              → "pending"    (needs email confirmation)
        // Waitlist            → "waitlist"   (regardless of login state)
       private static string DetermineStatus(AppointmentPayload p)
{
    if (p.IsWaitlist) return "waitlist";
    
    // If you want EVERY successfull booking to start as pending:
    return "pending"; 
}

        // ── Create appointment ────────────────────────────────────────────────
        public async Task<Appointment> Create(AppointmentPayload p)
        {
            var emailStatus = DetermineStatus(p);
    
    // FIX THE DATE BUG: Strip time and offset to keep it on the selected day
    var fixedDate = DateTime.SpecifyKind(p.AppointmentDate.Date, DateTimeKind.Unspecified);
    
            var token  = (p.IsGuest && !p.IsWaitlist)
                ? Guid.NewGuid().ToString("N")
                : null;

            var appt = new Appointment
            {
                Id              = Guid.NewGuid().ToString(),
                PatientId       = p.PatientId,
                PatientName     = p.PatientName,
                PatientEmail    = p.PatientEmail,
                PatientPhone    = p.PatientPhone,
                PatientSex      = p.PatientSex,
                PatientDob      = p.PatientDob,
                IsGuest         = p.IsGuest,
                IsForOther      = p.IsForOther,
                OtherName       = p.OtherName,
                OtherSex        = p.OtherSex,
                OtherDob        = p.OtherDob,
                ServiceId       = p.ServiceId,
                ServiceName     = p.ServiceName,
                DoctorId        = p.DoctorId,
                DoctorName      = p.DoctorName,
                AppointmentDate = fixedDate,
                AppointmentTime = p.AppointmentTime,
                IsWaitlist      = p.IsWaitlist,
                Status          = "pending",
                EmailStatus          = emailStatus,
                Notes           = p.Notes,
                CreatedAt       = DateTime.UtcNow,
                ConfirmationToken = token
            };

            var res     = await _supabase.From<Appointment>().Insert(appt);
            var created = res.Models.First();

            // Send email for guest non-waitlist bookings
            if (p.IsGuest && !p.IsWaitlist)
                await SendGuestConfirmationEmail(created);

            Console.WriteLine($"[Appointment] Created {created.Id} emailstatus={emailStatus} guest={p.IsGuest} waitlist={p.IsWaitlist}");
            return created;
        }

        // ── Confirm guest via token ───────────────────────────────────────────
        public async Task<Appointment?> ConfirmByToken(string token)
        {
            try
            {
                var res  = await _supabase.From<Appointment>()
                    .Where(a => a.ConfirmationToken == token)
                    .Get();
                var appt = res.Models.FirstOrDefault();
                if (appt == null) return null;

                appt.EmailStatus      = "confirmed";
                appt.Status           = "confirmed";
                appt.ConfirmedAt = DateTime.UtcNow;
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
            var res  = await _supabase.From<Appointment>().Where(a => a.Id == id).Get();
            var appt = res.Models.FirstOrDefault() ?? throw new Exception("Not found.");

            appt.EmailStatus = "cancelled";
            appt.Status      = "cancelled";
            await _supabase.From<Appointment>().Upsert(appt);

            await SendCancellationEmail(appt);
            await PromoteWaitlist(appt.ServiceId, appt.DoctorId, appt.AppointmentDate, appt.AppointmentTime);
        }

        private async Task PromoteWaitlist(string serviceId, string? doctorId, DateTime date, string time)
        {
            try
            {
                var dateStr = date.ToString("yyyy-MM-dd");
                var res     = await _supabase.From<Appointment>()
                    .Where(a => a.ServiceId  == serviceId)
                    .Where(a => a.IsWaitlist == true)
                    .Where(a => a.EmailStatus == "waitlist")
                    .Get();

                var next = res.Models
                    .Where(a => a.AppointmentDate.ToString("yyyy-MM-dd") == dateStr)
                    .OrderBy(a => a.WaitlistPosition ?? int.MaxValue)
                    .ThenBy(a => a.CreatedAt)
                    .FirstOrDefault();

                if (next == null) return;

                next.IsWaitlist      = false;
                next.EmailStatus     = next.IsGuest ? "pending" : "confirmed";
                next.AppointmentTime = time;
                next.DoctorId        = doctorId;
                await _supabase.From<Appointment>().Upsert(next);

                await SendWaitlistPromotionEmail(next);
                Console.WriteLine($"[Waitlist] Promoted {next.Id} to slot {time}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PromoteWaitlist] {ex.Message}");
            }
        }

        // ── Admin-only: update status field ───────────────────────────────────
        public async Task UpdateStatus(string id, string emailStatus, string? doctorId = null)
        {
            var res  = await _supabase.From<Appointment>().Where(a => a.Id == id).Get();
            var appt = res.Models.FirstOrDefault() ?? throw new Exception("Appointment not found.");

            appt.EmailStatus = emailStatus;
            appt.Status      = emailStatus;
            
            if (!string.IsNullOrEmpty(doctorId))
            {
                appt.DoctorId = doctorId;
                // Fetch doctor name
                var docRes = await _supabase.From<Doctor>().Where(d => d.Id == doctorId).Get();
                var doc = docRes.Models.FirstOrDefault();
                if (doc != null)
                {
                    appt.DoctorName = doc.DoctorName;
                }
            }

            if (emailStatus == "confirmed") appt.ConfirmedAt = DateTime.UtcNow;

            await _supabase.From<Appointment>().Upsert(appt);

            // Notify patient of manual confirmation
            if (emailStatus == "confirmed")
                await SendBookingConfirmationEmail(appt);
        }
 
        public async Task Delete(string id)
        {
            await _supabase.From<Appointment>().Where(a => a.Id == id).Delete();
        }

// ── Reschedule ────────────────────────────────────────────────────────────────
public async Task Reschedule(string id, DateTime newDate, string newTime, string? doctorId)
{
    var res = await _supabase.From<Appointment>().Where(a => a.Id == id).Get();
    var appt = res.Models.FirstOrDefault() ?? throw new Exception("Not found");

    appt.AppointmentDate = newDate;
    appt.AppointmentTime = newTime;
    
    if (doctorId != null) 
    {
        appt.DoctorId = doctorId;
        
        // --- ADD THIS TO FETCH THE NAME ---
        var docRes = await _supabase.From<Doctor>().Where(d => d.Id == doctorId).Get();
        var doc = docRes.Models.FirstOrDefault();
        if (doc != null) {
            appt.DoctorName = doc.DoctorName; // Save the actual name string
        }
    }
 appt.EmailStatus = "confirmed";
            await _supabase.From<Appointment>().Upsert(appt);

    await SendRescheduleEmail(appt);
}

  public async Task<List<Appointment>> GetAllAsync()
        {
            try
            {
                var res = await _supabase.From<Appointment>()
                    .Order("appointment_date", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();
                return res.Models ?? new();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetAllAsync] {ex.Message}");
                return new();
            }
        }

        // ── Get appointments for a patient ────────────────────────────────────
        public async Task<List<Appointment>> GetByPatient(string patientId)
        {
            try
            {
                var res = await _supabase.From<Appointment>()
                    .Where(a => a.PatientId == patientId)
                    .Order("appointment_date", Supabase.Postgrest.Constants.Ordering.Descending)
                    .Get();
                return res.Models ?? new();
            }
            catch { return new(); }
        }

        // ── Get appointment by ID ─────────────────────────────────────────────
        public async Task<Appointment?> GetById(string id)
        {
            try
            {
                var res = await _supabase.From<Appointment>()
                    .Where(a => a.Id == id)
                    .Get();
                return res.Models.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetById] {ex.Message}");
                return null;
            }
        }

  // ── 1. Guest booking — requires email confirmation to finalize ─────────
        private async Task SendGuestConfirmationEmail(Appointment appt)
        {
            try
            {
                var confirmUrl = $"{_appBaseUrl}/appointments/confirm?token={appt.ConfirmationToken}";
                var formattedDate = appt.AppointmentDate.ToString("MMMM dd, yyyy");

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

                        <!-- Body -->
                        <div style="padding:28px 32px;">
                          <p style="color:#1e293b;font-size:15px;margin:0 0 8px;">
                            Hi <strong>{appt.PatientName}</strong>,
                          </p>
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
                              {(appt.DoctorName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.DoctorName}</td>
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
                          <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 24px;">
                            Your appointment has been confirmed. We look forward to seeing you!
                          </p>

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
                              {(appt.DoctorName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.DoctorName}</td>
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
                              {(appt.DoctorName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.DoctorName}</td>
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
                              {(appt.DoctorName != null ? $"""
                              <tr>
                                <td style="color:#64748b;padding:5px 0;">Doctor</td>
                                <td style="color:#0f172a;font-weight:600;text-align:right;">{appt.DoctorName}</td>
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
    }

    // ── DTO ───────────────────────────────────────────────────────────────────
    public class AppointmentPayload
    {
        public string?   PatientId       { get; set; }
        public string    PatientName     { get; set; } = string.Empty;
        public string    PatientEmail    { get; set; } = string.Empty;
        public string    PatientPhone    { get; set; } = string.Empty;
        public string?   PatientSex      { get; set; }
        public DateTime? PatientDob      { get; set; }
        public bool      IsGuest         { get; set; }
        public bool      IsForOther      { get; set; }
        public string?   OtherName       { get; set; }
        public string?   OtherSex        { get; set; }
        public DateTime? OtherDob        { get; set; }
        public string    ServiceId       { get; set; } = string.Empty;
        public string    ServiceName     { get; set; } = string.Empty;
        public string?   DoctorId        { get; set; }
        public string?   DoctorName      { get; set; }
        public DateTime  AppointmentDate { get; set; }
        public string    AppointmentTime { get; set; } = string.Empty;
        public bool      IsWaitlist      { get; set; }
        public string Status { get; set; } = "pending"; // Add this line
        public string?   Notes           { get; set; }
    }
}

