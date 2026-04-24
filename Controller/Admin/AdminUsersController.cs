using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using Supabase.Gotrue;
using Microsoft.Extensions.Configuration;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize(Policy = "AdminOnly")]
[ApiController]
[Route("api/admin/users")]
[IgnoreAntiforgeryToken]
public class AdminUsersController : ControllerBase
{
    private readonly ProfileService _profileService;
    private readonly Supabase.Client _supabase;

    private readonly string _serviceRoleKey;
    private readonly string _supabaseUrl;

    public AdminUsersController(ProfileService profileService, Supabase.Client supabase, IConfiguration config)
    {
        _profileService = profileService;
        _supabase = supabase;
        _serviceRoleKey = config["Supabase:ServiceKey"] ?? throw new Exception("Supabase:ServiceKey is missing");
        _supabaseUrl = config["Supabase:Url"] ?? throw new Exception("Supabase:Url is missing");
    }

    // ── POST /api/admin/users — Create user ───────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] Profile p)
    {
        if (string.IsNullOrWhiteSpace(p.Email))
            return BadRequest(new { ok = false, error = "Email is required." });

        try
        {
            var data = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(p.FirstName)) data["first_name"] = p.FirstName;
            if (!string.IsNullOrWhiteSpace(p.LastName)) data["last_name"] = p.LastName;
            if (p.DateOfBirth.HasValue) data["date_of_birth"] = p.DateOfBirth.Value.ToString("yyyy-MM-dd");
            if (!string.IsNullOrWhiteSpace(p.Sex)) data["sex"] = p.Sex;
            if (!string.IsNullOrWhiteSpace(p.PhoneNumber)) data["phone_number"] = p.PhoneNumber;
            if (!string.IsNullOrWhiteSpace(p.Address)) data["address"] = p.Address;
            data["role"] = string.IsNullOrWhiteSpace(p.Role) ? "patient" : p.Role.ToLower();
            if (!string.IsNullOrWhiteSpace(p.AvatarUrl)) data["avatar_url"] = p.AvatarUrl;
            if (!string.IsNullOrWhiteSpace(p.Email)) data["email"] = p.Email;

            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
            http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");
            
            var payload = new

            {

                email = p.Email,

                password = "Password123!",

                email_confirm = true,

                user_metadata = data

            };

            

            var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

            var res = await http.PostAsync($"{_supabaseUrl}/auth/v1/admin/users", content);
            
            if (!res.IsSuccessStatusCode)
            {
                var error = await res.Content.ReadAsStringAsync();
                return BadRequest(new { ok = false, error = $"Invite failed: {error}" });
            }
            
            var resStr = await res.Content.ReadAsStringAsync();
            var json = System.Text.Json.JsonDocument.Parse(resStr);
            var id = json.RootElement.GetProperty("id").GetString();
            
            return Ok(new { ok = true, id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    // ── PUT /api/admin/users/{id} — Update user ───────────────────────────────
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] Profile p)
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
        using var http = new HttpClient();

        http.DefaultRequestHeaders.Add("apikey", _serviceRoleKey);
        http.DefaultRequestHeaders.Add("Authorization", $"Bearer {_serviceRoleKey}");

        var res = await http.DeleteAsync($"{_supabaseUrl}/auth/v1/admin/users/{id}");

        if (!res.IsSuccessStatusCode)
        {
            var error = await res.Content.ReadAsStringAsync();
            Console.WriteLine($"[DeleteProfile] Auth delete failed: {error}");
            throw new Exception("Failed to delete auth user.");
        }

        // 2. Delete profile AFTER
        await _supabase
            .From<Profile>()
            .Where(x => x.Id == id)
            .Delete();

        Console.WriteLine($"[DeleteProfile] User {id} fully deleted.");
    }
}
