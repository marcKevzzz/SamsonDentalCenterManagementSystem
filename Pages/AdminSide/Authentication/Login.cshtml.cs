using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide;

public class StaffLoginModel : PageModel
{
    private readonly Supabase.Client _supabase;
    private readonly ProfileService _profileService;

    public StaffLoginModel(Supabase.Client supabase, ProfileService profileService)
    {
        _supabase = supabase;
        _profileService = profileService;
    }

    [BindProperty]
    public Profile Input { get; set; } = new();

    public IActionResult OnGet()
    {
        var token = Request.Cookies["sb-access-token"];
        if (!string.IsNullOrEmpty(token))
        {
            return RedirectToPage("/AdminSide/Index");
        }
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        bool rememberMe = Request.Form["rememberMe"] == "true";

        if (string.IsNullOrEmpty(Input.Email) || string.IsNullOrEmpty(Input.Password))
        {
            return new JsonResult(new { ok = false, errors = new[] { "Please enter your credentials." } });
        }

        try
        {
            bool emailExists = await _profileService.CheckEmailExists(Input.Email);
            if (!emailExists)
            {
                return new JsonResult(new { ok = false, error_type = "email_not_found", errors = new[] { "This email is not registered." } });
            }

            var session = await _supabase.Auth.SignIn(Input.Email, Input.Password);

            if (session != null && !string.IsNullOrEmpty(session.AccessToken))
            {
                // Get the profile to check the role
                var user = session.User;
                var profile = user != null ? await _profileService.GetProfileById(user.Id!, user.Email) : null;
                var role = profile?.Role?.ToLower() ?? "patient";

                // Block patients from staff login
                var staffRoles = new[] { "admin", "doctor", "receptionist" };
                if (!staffRoles.Contains(role))
                {
                    return new JsonResult(new { ok = false, errors = new[] { "You do not have staff access. Please use the patient portal." } });
                }

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false,
                    SameSite = SameSiteMode.Lax,
                    Path = "/",
                    Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : null
                };

                Response.Cookies.Append("sb-access-token", session.AccessToken, cookieOptions);

                if (!string.IsNullOrEmpty(session.RefreshToken))
                {
                    Response.Cookies.Append("sb-refresh-token", session.RefreshToken, cookieOptions);
                }

                var firstName = user?.UserMetadata?.ContainsKey("first_name") == true
                    ? user.UserMetadata["first_name"]?.ToString() : "Staff";
                var lastName = user?.UserMetadata?.ContainsKey("last_name") == true
                    ? user.UserMetadata["last_name"]?.ToString() : "";
                var avatarUrl = profile?.AvatarUrl ?? "";

                return new JsonResult(new
                {
                    ok = true,
                    user = new
                    {
                        firstName,
                        lastName,
                        email = user?.Email,
                        initials = ((firstName?.Length > 0 ? firstName[0].ToString() : "") +
                                   (lastName?.Length > 0 ? lastName[0].ToString() : "")).ToUpper(),
                        id = user?.Id,
                        avatarUrl,
                        role
                    }
                });
            }
            return new JsonResult(new { ok = false, errors = new[] { "Login failed." } });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Staff Login Error] {ex.Message}");

            string errorMsg = "Login failed.";
            if (ex.Message.Contains("invalid_credentials") || ex.Message.Contains("Invalid login credentials"))
            {
                errorMsg = "Incorrect password.";
            }
            else if (ex.Message.Contains("Email not confirmed"))
            {
                errorMsg = "Please confirm your email address before signing in.";
            }

            return new JsonResult(new { ok = false, errors = new[] { errorMsg } });
        }
    }
}
