using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Pages;

public class SignupModel : PageModel
{
    private readonly Supabase.Client _supabase;

    public SignupModel(Supabase.Client supabase)
    {
        _supabase = supabase;
    }

    [BindProperty] public Profile Input { get; set; } = new();

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync()
    {
        Console.WriteLine($"[Signup] FN: {Input.FirstName}, LN: {Input.LastName}, Email: {Input.Email}");

        // ── Validation ────────────────────────────────────────────────────────
        var missingFields = new List<string>();
        if (string.IsNullOrWhiteSpace(Input.FirstName))  missingFields.Add("First Name");
        if (string.IsNullOrWhiteSpace(Input.LastName))   missingFields.Add("Last Name");
        if (string.IsNullOrWhiteSpace(Input.Email))      missingFields.Add("Email");
        if (string.IsNullOrWhiteSpace(Input.Password))   missingFields.Add("Password");
        if (Input.DateOfBirth == null)                   missingFields.Add("Date of Birth");

        if (missingFields.Any())
            return Fail($"Required fields missing: {string.Join(", ", missingFields)}");

        if (Input.Password != Input.ConfirmPassword)
            return Fail("Passwords do not match.");

        if (!Input.Consent)
            return Fail("You must agree to the terms.");

        if (Input.Password!.Length < 8)
            return Fail("Password must be at least 8 characters.");

        try
        {
            // ── Sign up — trigger handles profiles insert ─────────────────────
            var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    { "first_name",   Input.FirstName! },
                    { "last_name",    Input.LastName! },
                    { "date_of_birth",Input.DateOfBirth?.ToString("yyyy-MM-dd") ?? "" },
                    { "sex",          Input.Sex          ?? "unspecified" },
                    { "phone_number", Input.PhoneNumber  ?? "" },
                    { "address",      Input.Address      ?? "" },
                    { "role",         "patient" }
                },
                // ← tells Supabase to send a confirmation email
                // EmailRedirectTo = $"{Request.Scheme}://{Request.Host}/email-confirmed"
            };

            var session = await _supabase.Auth.SignUp(Input.Email!, Input.Password, options);

            if (session?.User == null)
                return Fail("Sign-up failed. Please try again.");

            // ── Email confirmation flow ────────────────────────────────────────
            // If email confirmation is enabled in Supabase, AccessToken is null
            // until the user confirms. We detect this and tell the client.
            bool needsConfirmation = string.IsNullOrEmpty(session.AccessToken);

            if (needsConfirmation)
            {
                // Do NOT set cookie — user isn't confirmed yet
                return new JsonResult(new
                {
                    ok               = true,
                    needsConfirmation = true,
                    message          = "A confirmation email has been sent. Please verify your email before signing in.",
                    errors           = Array.Empty<string>()
                });
            }

            // ── Auto-confirmed (email confirmation disabled in Supabase) ───────
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure   = false,
                SameSite = SameSiteMode.Lax,
                Path     = "/",
                Expires  = DateTime.UtcNow.AddHours(1)
            };
            Response.Cookies.Append("sb-access-token", session.AccessToken!, cookieOptions);

            var firstName = Input.FirstName!;
            var lastName  = Input.LastName!;

            return new JsonResult(new
            {
                ok               = true,
                needsConfirmation = false,
                errors           = Array.Empty<string>(),
                user = new
                {
                    id        = session.User.Id,
                    firstName,
                    lastName,
                    email     = Input.Email,
                    avatarUrl = (string?)null,
                    initials  = (firstName[0].ToString() + (lastName.Length > 0 ? lastName[0].ToString() : "")).ToUpper(),
                    role      = "patient"
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Signup] Error: {ex.Message}");

            // Supabase returns "User already registered" for duplicate emails
            var msg = ex.Message.Contains("already registered")
                ? "An account with this email already exists."
                : ex.Message;

            return Fail(msg);
        }
    }

    private JsonResult Fail(string error) =>
        new(new { ok = false, needsConfirmation = false, errors = new[] { error } });
}