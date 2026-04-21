using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize]
[ApiController]
[Route("api/admin/users")]
[IgnoreAntiforgeryToken]
public class AdminUsersController : ControllerBase
{
    private readonly ProfileService _profileService;
    private readonly Supabase.Client _supabase;

    private readonly string _serviceRoleKey;
private readonly string _supabaseUrl;

    public AdminUsersController(ProfileService profileService, Supabase.Client supabase, string serviceRoleKey, string supabaseUrl)
    {
        _profileService = profileService;
        _supabase = supabase;
         _serviceRoleKey = serviceRoleKey;
        _supabaseUrl = supabaseUrl;
    }

    // ── POST /api/admin/users — Create user ───────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] Profile p)
    {
        if (string.IsNullOrWhiteSpace(p.Email) || string.IsNullOrWhiteSpace(p.Password))
            return BadRequest(new { ok = false, error = "Email and password are required." });

        try
        {
            var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    { "id",           p.Id          ?? "" },
                    { "first_name",   p.FirstName   ?? "" },
                    { "last_name",    p.LastName    ?? "" },
                    { "date_of_birth",p.DateOfBirth?.ToString() ?? "" },
                    { "sex",          p.Sex         ?? "" },
                    { "phone_number", p.PhoneNumber ?? "" },
                    { "address",      p.Address     ?? "" },
                    { "role",         p.Role        ?? "patient" },
                    { "avatar_url",   p.AvatarUrl   ?? "" },
                    { "email",        p.Email       ?? "" }
                }
            };

            var session = await _supabase.Auth.SignUp(p.Email!, p.Password, options);

            if (session?.User?.Id == null)
                return BadRequest(new { ok = false, error = "Sign-up failed." });

            return Ok(new { ok = true, id = session.User.Id });
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
