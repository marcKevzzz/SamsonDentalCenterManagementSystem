using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers; // ← Add this line if not already present
using SamsonDentalCenterManagementSystem.Models; // Ensure your Profile model is here
using SamsonDentalCenterManagementSystem.Services; // ← Add this line

namespace SamsonDentalCenterManagementSystem.Pages.Authentication;

public class SigninModel : PageModel
{
    private readonly Supabase.Client _supabase;
    private readonly ProfileService _profileService;
    private readonly ReviewService _reviewService;

    public SigninModel(
        Supabase.Client supabase,
        ProfileService profileService,
        ReviewService reviewService
    )
    {
        _supabase = supabase;
        _profileService = profileService;
        _reviewService = reviewService;
    }

    [BindProperty]
    public Profile Input { get; set; } = new();

    public async Task<IActionResult> OnGetAsync()
    {
        var stats = await _reviewService.GetReviewStatsAsync();
        ViewData["ReviewAvg"] = stats.average.ToString("0.0");
        ViewData["ReviewCount"] = stats.count.ToString("N0");

        // 1. Check if the "Remember Me" or Session cookie exists
        var token = Request.Cookies["sb-access-token"];
        if (!string.IsNullOrEmpty(token))
        {
            try
            {
                var user = await _supabase.Auth.GetUser(token);
                if (user != null)
                {
                    var profile = await _profileService.GetProfileById(user.Id!);
                    var role = profile?.Role?.ToLower() ?? "patient";

                    if (role == "admin") return Redirect("/Admin/Dashboard");
                    if (role == "doctor") return Redirect("/Doctor/Dashboard");
                    if (role == "receptionist") return Redirect("/Receptionist/Dashboard");
                }
            }
            catch { /* Token might be invalid or expired, proceed to sign-in page */ }
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        // 1. Manually pull the rememberMe value from the Form collection
        // This avoids the "Multiple Handlers" conflict
        bool rememberMe = Request.Form["rememberMe"] == "true";
        
        if (!string.IsNullOrEmpty(Input.Email))
            Input.Email = Input.Email.Trim().ToLower();

        if (string.IsNullOrEmpty(Input.Email) || string.IsNullOrEmpty(Input.Password))
        {
            return new JsonResult(
                new { ok = false, errors = new[] { "Please enter your credentials." } }
            );
        }

        try
        {
            bool emailExists = await _profileService.CheckEmailExists(Input.Email);
            if (!emailExists)
            {
                return new JsonResult(
                    new
                    {
                        ok = false,
                        error_type = "email_not_found",
                        errors = new[] { "This email is not registered." },
                    }
                );
            }

            var session = await _supabase.Auth.SignIn(Input.Email, Input.Password);

            if (session != null && !string.IsNullOrEmpty(session.AccessToken))
            {
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false, // Highly recommended
                    SameSite = SameSiteMode.Lax,
                    Path = "/",
                    Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : null, // Session cookie if not remembered
                };

                // Store both tokens
                Response.Cookies.Append("sb-access-token", session.AccessToken, cookieOptions);

                if (!string.IsNullOrEmpty(session.RefreshToken))
                {
                    Response.Cookies.Append(
                        "sb-refresh-token",
                        session.RefreshToken,
                        cookieOptions
                    );
                }
                try
                {
                    var user = session.User;
                    if (user != null)
                    {
                        var firstName =
                            user.UserMetadata?.ContainsKey("first_name") == true
                                ? user.UserMetadata["first_name"]?.ToString()
                                : "User";

                        var lastName =
                            user.UserMetadata?.ContainsKey("last_name") == true
                                ? user.UserMetadata["last_name"]?.ToString()
                                : "";
                        var profile = await _profileService.GetProfileById(user.Id!, user.Email);

                        if (profile != null && !profile.IsActive)
                        {
                            Response.Cookies.Delete("sb-access-token");
                            Response.Cookies.Delete("sb-refresh-token");
                            return new JsonResult(
                                new
                                {
                                    ok = false,
                                    error_type = "account_deactivated",
                                    userId = user.Id,
                                    errors = new[]
                                    {
                                        "Your account is deactivated. Please contact support or request reactivation below.",
                                    },
                                }
                            );
                        }

                        var avatarUrl = profile?.AvatarUrl ?? "";
                        var role = profile?.Role ?? "";

                        return new JsonResult(
                            new
                            {
                                ok = true,
                                user = new
                                {
                                    firstName = profile?.FirstName ?? firstName,
                                    lastName = profile?.LastName ?? lastName,
                                    email = user.Email,
                                    initials = (
                                        (profile?.FirstName ?? firstName)?.FirstOrDefault().ToString()
                                        + ((profile?.LastName ?? lastName)?.Length > 0 ? (profile?.LastName ?? lastName)[0].ToString() : "")
                                    ).ToUpper(),
                                    id = user.Id,
                                    avatarUrl,
                                    role,
                                },
                            }
                        );
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Metadata Warning]: {ex.Message}");
                }
            }
            return new JsonResult(new { ok = false, errors = new[] { "Login failed." } });
        }
        catch (Exception ex)
        {
            // This will catch "Invalid login credentials" from Supabase
            Console.WriteLine($"[Supabase Error] Connection failed: {ex.Message}");

            string errorMsg = "Login failed.";
            if (
                ex.Message.Contains("invalid_credentials")
                || ex.Message.Contains("Invalid login credentials")
            )
            {
                errorMsg = "Incorrect password.";
            }
            else if (ex.Message.Contains("Email not confirmed"))
            {
                errorMsg = "Please confirm your email address before signing in.";
            }
            else if (ex.InnerException != null)
            {
                Console.WriteLine($"[Inner Error] {ex.InnerException.Message}");
                errorMsg = "A connection error occurred. Please try again.";
            }

            return new JsonResult(new { ok = false, errors = new[] { errorMsg } });
        }
    }
}
