using Microsoft.AspNetCore.Mvc;
 
namespace SamsonDentalCenterManagementSystem.Controllers;
 
[ApiController]
[Route("api/auth")]
[IgnoreAntiforgeryToken]
public class AuthController : ControllerBase
{
    private readonly Supabase.Client _supabase;
 
    public AuthController(Supabase.Client supabase)
    {
        _supabase = supabase;
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
            // Exchange the access token to get the user
            var user = await _supabase.Auth.GetUser(req.AccessToken);
 
            if (user == null)
                return BadRequest(new { ok = false, error = "Invalid or expired token." });
 
            // Set the access token cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure   = false,
                SameSite = SameSiteMode.Lax,
                Path     = "/",
                Expires  = DateTime.UtcNow.AddHours(1)
            };
            Response.Cookies.Append("sb-access-token", req.AccessToken, cookieOptions);
 
            // Build user payload for localStorage
            var firstName = user.UserMetadata?.ContainsKey("first_name") == true
                ? user.UserMetadata["first_name"]?.ToString() ?? ""
                : "";
            var lastName = user.UserMetadata?.ContainsKey("last_name") == true
                ? user.UserMetadata["last_name"]?.ToString() ?? ""
                : "";
 
            var initials = (firstName.Length > 0 ? firstName[0].ToString() : "") +
                           (lastName.Length  > 0 ? lastName[0].ToString()  : "");
 
            Console.WriteLine($"[ConfirmEmail] User confirmed: {user.Email}");
 
            return Ok(new
            {
                ok   = true,
                user = new
                {
                    id        = user.Id,
                    firstName,
                    lastName,
                    email     = user.Email,
                    avatarUrl = (string?)null,
                    initials  = initials.ToUpper(),
                    role      = "patient"
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ConfirmEmail] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }
}