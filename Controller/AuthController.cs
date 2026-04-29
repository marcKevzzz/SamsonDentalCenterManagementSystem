using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Controllers;

[ApiController]
[Route("api/auth")]
[IgnoreAntiforgeryToken]
public class AuthController : ControllerBase
{
    private readonly Supabase.Client _supabase;
    private readonly ProfileService _profileService;

    public AuthController(Supabase.Client supabase, ProfileService profileService)
    {
        _supabase = supabase;
        _profileService = profileService;
    }

    public class ConfirmEmailRequest
    {
        public string? AccessToken { get; set; }
    }

    [HttpPost("confirm-email")]
    public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.AccessToken))
            return BadRequest(new { ok = false, error = "No access token provided." });

        try
        {
            // 1. Exchange the access token to get the user
            var user = await _supabase.Auth.GetUser(req.AccessToken);

            if (user == null)
                return BadRequest(new { ok = false, error = "Invalid or expired token." });

            // 2. Fetch Profile to get real role and data
            var profile = await _profileService.GetProfileById(user.Id!, user.Email);
            var role = profile?.Role ?? "patient";
            var avatarUrl = profile?.AvatarUrl;

            // 3. Set the access token cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Lax,
                Path = "/",
                Expires = DateTime.UtcNow.AddHours(1),
            };
            Response.Cookies.Append("sb-access-token", req.AccessToken, cookieOptions);

            // 4. Build user payload for localStorage
            var firstName =
                profile?.FirstName ?? user.UserMetadata?["first_name"]?.ToString() ?? "";
            var lastName = profile?.LastName ?? user.UserMetadata?["last_name"]?.ToString() ?? "";

            var initials =
                (firstName.Length > 0 ? firstName[0].ToString() : "")
                + (lastName.Length > 0 ? lastName[0].ToString() : "");

            Console.WriteLine($"[ConfirmEmail] User confirmed: {user.Email} as {role}");

            return Ok(
                new
                {
                    ok = true,
                    user = new
                    {
                        id = user.Id,
                        firstName,
                        lastName,
                        email = user.Email,
                        avatarUrl,
                        initials = initials.ToUpper(),
                        role,
                    },
                }
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfirmEmail] Error: {ex.Message}");
            return StatusCode(
                500,
                new
                {
                    ok = false,
                    error = "Confirmation failed. Please try again or contact support.",
                }
            );
        }
    }

    public class ReactivationRequest
    {
        public string? UserId { get; set; }
    }

    [HttpPost("request-reactivation")]
    public async Task<IActionResult> RequestReactivation([FromBody] ReactivationRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.UserId))
            return BadRequest(new { ok = false, error = "User ID is required." });

        try
        {
            await _supabase
                .From<Profile>()
                .Where(x => x.Id == req.UserId)
                .Set(x => x.ReactivationRequested, true)
                .Update();

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RequestReactivation] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = "Failed to submit request." });
        }
    }
}
