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
    private readonly string _serviceRoleKey;
    private readonly string _supabaseUrl;
    private static readonly HttpClient _http = new HttpClient();

    public AdminUsersController(
        ProfileService profileService,
        Supabase.Client supabase,
        ActivityLogService logs,
        IEmailService emailService,
        IConfiguration config
    )
    {
        _profileService = profileService;
        _supabase = supabase;
        _logs = logs;
        _emailService = emailService;
        _serviceRoleKey =
            config["Supabase:ServiceKey"] ?? throw new Exception("Supabase:ServiceKey is missing");
        _supabaseUrl = config["Supabase:Url"] ?? throw new Exception("Supabase:Url is missing");
    }

    // ── POST /api/admin/users — Create user ───────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] UserPayload p)
    {
        if (string.IsNullOrWhiteSpace(p.Email))
            return BadRequest(new { ok = false, error = "Email is required." });

        try
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
                email_confirm = true, // Still true so they don't have to verify email separately
                user_metadata = new { 
                    first_name = p.FirstName, 
                    last_name = p.LastName,
                    role = p.Role?.ToLower() ?? "patient"
                }
            };

            var res = await _http.PostAsync($"{_supabaseUrl}/auth/v1/admin/users", 
                new StringContent(System.Text.Json.JsonSerializer.Serialize(authPayload), System.Text.Encoding.UTF8, "application/json"));

            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                return BadRequest(new { ok = false, error = $"Auth creation failed: {error}" });
            }

            var resStr = await res.Content.ReadAsStringAsync();
            var json = System.Text.Json.JsonDocument.Parse(resStr);
            var id = json.RootElement.GetProperty("id").GetString()!;

            // 2. Trigger Recovery Email (Invitation)
            // Headers already set above on line 51-53
            await _http.PostAsync($"{_supabaseUrl}/auth/v1/recover",
                new StringContent(System.Text.Json.JsonSerializer.Serialize(new { email = p.Email }), System.Text.Encoding.UTF8, "application/json"));

            // 2. Create Profile Record
            p.Id = id;
            await _profileService.CreateProfile(p);

            // 3. Handle Staff Logic (Bio / Availability)
            if (p.Role?.ToLower() == "doctor")
            {
                var doc = new Doctor { 
                    Id = Guid.NewGuid().ToString(),
                    ProfileId = id,
                    Title = p.Title ?? "Dr.",
                    Specialties = p.Specialties ?? Array.Empty<string>(),
                    Bio = p.Bio,
                    IsActive = p.IsActive ?? true,
                    CreatedAt = DateTime.UtcNow
                };
                await _supabase.From<Doctor>().Insert(doc);
                
                if (p.Availability != null && p.Availability.Any())
                {
                    foreach(var av in p.Availability) {
                        av.Id = Guid.NewGuid().ToString();
                        av.StaffId = doc.Id;
                        av.StaffType = "doctor";
                    }
                    await _supabase.From<StaffAvailability>().Insert(p.Availability);
                }
            }
            else if (p.Role?.ToLower() == "receptionist")
            {
                var rec = new Receptionist {
                    Id = Guid.NewGuid().ToString(),
                    ProfileId = id,
                    DeskLocation = p.DeskLocation,
                    Bio = p.Bio,
                    IsActive = p.IsActive ?? true,
                    CreatedAt = DateTime.UtcNow
                };
                await _supabase.From<Receptionist>().Insert(rec);

                if (p.Availability != null && p.Availability.Any())
                {
                    foreach(var av in p.Availability) {
                        av.Id = Guid.NewGuid().ToString();
                        av.StaffId = rec.Id;
                        av.StaffType = "receptionist";
                    }
                    await _supabase.From<StaffAvailability>().Insert(p.Availability);
                }
            }

            // 4. Send Welcome Email (Invitation flow)
            try {
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var link = await _profileService.GenerateLink("recovery", p.Email, $"{baseUrl}/reset-password");
                if (link != null)
                {
                    await _emailService.SendEmailAsync(p.Email, $"{p.FirstName} {p.LastName}", "Welcome to Samson Dental Center", "Invitation", new { Name = p.FirstName, Link = link });
                }
            } catch (Exception ex) {
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
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
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
        await _supabase.From<Profile>().Where(x => x.Id == id).Delete();

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
            if (profile == null) return NotFound();

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var link = await _profileService.GenerateLink("recovery", profile.Email, $"{baseUrl}/reset-password");
            
            if (link == null)
            {
                return BadRequest(new { ok = false, error = "Failed to generate invitation link." });
            }

            await _emailService.SendEmailAsync(profile.Email, profile.FullName, "Invitation to Samson Dental Center Portal", "Invitation", new { Name = profile.FirstName, Link = link });

            string rolePath = profile.Role?.ToLower() == "patient" ? "/Admin/Patients" : "/Admin/Staff/Doctors";
            await _logs.LogActionAsync(id, "resent invitation", $"User: {profile.FullName}", null, "Admin", rolePath);
            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { ok = false, error = ex.Message });
        }
    }
}
