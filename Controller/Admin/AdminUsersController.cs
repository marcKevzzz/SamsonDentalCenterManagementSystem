using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/users")]
[IgnoreAntiforgeryToken]
public class AdminUsersController : ControllerBase
{
    private readonly ProfileService _profileService;
    private readonly Supabase.Client _supabase;

    private readonly ActivityLogService _logs;
    private readonly IEmailService _emailService;
    private readonly OtpService _otpService;
    private readonly DoctorService _doctorService;
    private readonly ReceptionistService _receptionistService;
    private readonly string _serviceRoleKey;
    private readonly string _supabaseUrl;
    private readonly string _appBaseUrl;
    private readonly ILogger<AdminUsersController> _logger;
    private static readonly HttpClient _http = new HttpClient();

    public AdminUsersController(
        ProfileService profileService,
        Supabase.Client supabase,
        ActivityLogService logs,
        IEmailService emailService,
        OtpService otpService,
        DoctorService doctorService,
        ReceptionistService receptionistService,
        IConfiguration config,
        ILogger<AdminUsersController> logger
    )
    {
        _profileService = profileService;
        _supabase = supabase;
        _logs = logs;
        _emailService = emailService;
        _otpService = otpService;
        _doctorService = doctorService;
        _receptionistService = receptionistService;
        _serviceRoleKey =
            config["Supabase:ServiceKey"] ?? throw new Exception("Supabase:ServiceKey is missing");
        _supabaseUrl = config["Supabase:Url"] ?? throw new Exception("Supabase:Url is missing");
        _appBaseUrl = (config["App:BaseUrl"] ?? "").TrimEnd('/');
        _logger = logger;
    }

    // ── POST /api/admin/users — Create user ───────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] UserPayload p)
    {
        if (string.IsNullOrWhiteSpace(p.Email))
            return BadRequest(new { ok = false, error = "Email is required." });

        try
        {
            // 0. Check if user already exists
            var existingId = await _profileService.GetUserIdByEmail(p.Email);
            string id = "";

            if (!string.IsNullOrEmpty(existingId))
            {
                id = existingId;
                // Update profile role to match requested staff role
                await _profileService.UpdateProfilePartial(id, new Dictionary<string, object> { { "role", p.Role?.ToLower() ?? "patient" } });
            }
            else
            {
                // 1. Create Auth User with random password
                var tempPassword = Guid.NewGuid().ToString() + "A1!";

                _http.DefaultRequestHeaders.Clear();
                _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
                _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

                var authPayload = new
                {
                    email = p.Email,
                    password = tempPassword,
                    email_confirm = true,
                    user_metadata = new
                    {
                        first_name = p.FirstName,
                        last_name = p.LastName,
                        role = p.Role?.ToLower() ?? "patient",
                    },
                };

                var res = await _http.PostAsync(
                    $"{_supabaseUrl}/auth/v1/admin/users",
                    new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(authPayload),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    )
                );

                if (!res.IsSuccessStatusCode)
                {
                    var error = await res.Content.ReadAsStringAsync();
                    return BadRequest(new { ok = false, error = $"Auth creation failed: {error}" });
                }

                var resStr = await res.Content.ReadAsStringAsync();
                var json = System.Text.Json.JsonDocument.Parse(resStr);
                id = json.RootElement.GetProperty("id").GetString()!;

                // 2. Trigger Recovery Email (Invitation)
                await _http.PostAsync(
                    $"{_supabaseUrl}/auth/v1/recover",
                    new StringContent(
                        System.Text.Json.JsonSerializer.Serialize(new { email = p.Email }),
                        System.Text.Encoding.UTF8,
                        "application/json"
                    )
                );

                // 3. Create Profile Record (Only if new)
                p.Id = id;
                await _profileService.CreateProfile(p);
            }

            // 4. Handle Staff Logic (Bio / Availability)
            if (p.Role?.ToLower() == "doctor")
            {
                try
                {
                    _logger.LogInformation("[DEBUG] Attempting to create doctor record for profile {Id}", id);
                    // Check if doctor record already exists for this profile
                    var existing = await _doctorService.GetDoctorByProfileIdAsync(id);
                    if (existing == null)
                    {
                        var doc = await _doctorService.CreateAsync(
                            id,
                            p.Title ?? "Dr.",
                            p.Specialties ?? Array.Empty<string>(),
                            p.Bio,
                            p.YearsOfExperience,
                            p.IsActive ?? true
                        );

                        if (doc != null)
                        {
                            _logger.LogInformation("[DEBUG] Doctor record created successfully: {DocId}", doc.Id);
                            if (p.Availability != null && p.Availability.Any())
                            {
                                var slots = p.Availability.Select(av => new AvailabilityDto
                                {
                                    DayOfWeek = av.DayOfWeek,
                                    StartTime = av.StartTime,
                                    EndTime = av.EndTime,
                                    IsActive = true
                                }).ToList();
                                await _doctorService.SetAvailabilityAsync(doc.Id, slots);
                            }
                            _doctorService.InvalidateCache();
                        }
                        else
                        {
                            _logger.LogWarning("[DEBUG] DoctorService.CreateAsync returned null for profile {Id}", id);
                        }
                    }
                    else
                    {
                        _logger.LogInformation("[DEBUG] Doctor record already exists for profile {Id}", id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DEBUG] Failed to create doctor record for profile {Id}", id);
                }
            }
            else if (p.Role?.ToLower() == "receptionist")
            {
                try
                {
                    _logger.LogInformation("[DEBUG] Attempting to create receptionist record for profile {Id}", id);
                    var existing = await _receptionistService.GetReceptionistByProfileIdAsync(id);
                    if (existing == null)
                    {
                        var rec = await _receptionistService.CreateAsync(
                            id,
                            p.DeskLocation,
                            p.IsActive ?? true
                        );

                        if (rec != null)
                        {
                            _logger.LogInformation("[DEBUG] Receptionist record created successfully: {RecId}", rec.Id);
                            if (p.Availability != null && p.Availability.Any())
                            {
                                var slots = p.Availability.Select(av => new AvailabilityDto
                                {
                                    DayOfWeek = av.DayOfWeek,
                                    StartTime = av.StartTime,
                                    EndTime = av.EndTime,
                                    IsActive = true
                                }).ToList();
                                await _receptionistService.SetAvailabilityAsync(rec.Id, slots);
                            }
                        }
                        else
                        {
                            _logger.LogWarning("[DEBUG] ReceptionistService.CreateAsync returned null for profile {Id}", id);
                        }
                    }
                    else
                    {
                        _logger.LogInformation("[DEBUG] Receptionist record already exists for profile {Id}", id);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DEBUG] Failed to create receptionist record for profile {Id}", id);
                }
            }

            // 4. Send Welcome Email (OTP flow)
            try
            {
                var otp = await _otpService.GenerateOtp(p.Email, "invitation");
                await _emailService.SendEmailAsync(
                    p.Email,
                    $"{p.FirstName} {p.LastName}",
                    "Welcome to Samson Dental Center",
                    "OtpNotification",
                    new
                    {
                        Name = p.FirstName,
                        Action = "setting up your account",
                        Code = otp,
                        Link = (string?)null
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CreateUser] Welcome email failed: {ex.Message}");
            }

            return Ok(new { ok = true, id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── PUT /api/admin/users/{id} — Update user ───────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UserPayload p)
    {
        try
        {
            await _profileService.UpdateProfile(id, p);

            // ── Handle Staff Secondary Tables ─────────────────────────────
            var role = p.Role?.ToLower();
            if (role == "doctor")
            {
                var doc = await _doctorService.GetDoctorByProfileIdAsync(id);
                if (doc != null)
                {
                    await _doctorService.UpdateAsync(
                        doc.Id,
                        p.Title ?? doc.Title,
                        p.Specialties ?? doc.Specialties,
                        p.Bio ?? doc.Bio,
                        p.YearsOfExperience ?? doc.YearsOfExperience,
                        p.IsActive ?? doc.IsActive
                    );
                    _doctorService.InvalidateCache();
                }
            }
            else if (role == "receptionist")
            {
                var rec = await _receptionistService.GetReceptionistByProfileIdAsync(id);
                if (rec != null)
                {
                    await _receptionistService.UpdateAsync(
                        rec.Id,
                        p.DeskLocation ?? rec.DeskLocation,
                        p.Bio ?? rec.Bio,
                        p.IsActive ?? rec.IsActive
                    );
                }
            }

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UpdateUser failed for {Id}", id);
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── DELETE /api/admin/users/{id} — Delete user ────────────────────────────
    [HttpDelete("{id}")]
    public async Task DeleteProfile(string id)
    {
        // 1. Delete auth user FIRST (important)
        _http.DefaultRequestHeaders.Clear();
        _http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
        _http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

        var res = await _http.DeleteAsync($"{_supabaseUrl}/auth/v1/admin/users/{id}");

        if (!res.IsSuccessStatusCode)
        {
            var error = await res.Content.ReadAsStringAsync();
            Console.WriteLine($"[DeleteProfile] Auth delete failed: {error}");
            throw new Exception("Failed to delete auth user.");
        }

        // 2. Delete profile AFTER
        await _supabase.From<Profile>().Select("*").Where(x => x.Id == id).Delete();

        Console.WriteLine($"[DeleteProfile] User {id} fully deleted.");
    }

    // ── POST /api/admin/users/{id}/avatar — Upload avatar ────────────────────
    [HttpPost("{id}/avatar")]
    public async Task<IActionResult> UploadAvatar(string id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { ok = false, error = "No file uploaded." });

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();
            var ext = Path.GetExtension(file.FileName);
            var contentType = file.ContentType;

            var url = await _profileService.UploadAvatar(id, bytes, ext, contentType);
            return Ok(new { ok = true, url });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── POST /api/admin/users/{id}/toggle-active ──────────────────────────────
    [HttpPost("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(string id, [FromBody] bool isActive)
    {
        try
        {
            await _profileService.ToggleUserActive(id, isActive);

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ToggleActive] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpPost("{id}/resend-invite")]
    public async Task<IActionResult> ResendInvite(string id)
    {
        try
        {
            var profile = await _profileService.GetProfileById(id);
            if (profile == null)
                return NotFound();

            var otp = await _otpService.GenerateOtp(profile.Email, "invitation");
            await _emailService.SendEmailAsync(
                profile.Email,
                profile.FullName,
                "Invitation to Samson Dental Center Portal",
                "OtpNotification",
                new
                {
                    Name = profile.FirstName,
                    Action = "setting up your account",
                    Code = otp,
                    Link = (string?)null
                }
            );

            string rolePath =
                profile.Role?.ToLower() == "patient" ? "/Admin/Patients" : "/Admin/Staff/Doctors";
            await _logs.LogActionAsync(
                id,
                "resent invitation",
                $"User: {profile.FullName}",
                null,
                "Admin",
                rolePath
            );
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }
}
