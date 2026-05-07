using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Helpers;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using Supabase.Gotrue;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication;

public class SignupModel : PageModel
{
    private readonly ReviewService _reviewService;
    private readonly Supabase.Client _supabase;
    private readonly ProfileService _profileService;
    private readonly IEmailService _emailService;

    public SignupModel(Supabase.Client supabase, ReviewService reviewService, ProfileService profileService, IEmailService emailService)
    {
        _reviewService = reviewService;
        _supabase = supabase;
        _profileService = profileService;
        _emailService = emailService;
    }

    [BindProperty]
    public Profile Input { get; set; } = new();

    public async Task OnGetAsync()
    {
        var stats = await _reviewService.GetReviewStatsAsync();

        ViewData["ReviewAvg"] = stats.average.ToString("0.0");
        ViewData["ReviewCount"] = stats.count.ToString("N0");
    }

    public async Task<IActionResult> OnPostAsync()
    {
        // ── Validation ────────────────────────────────────────────────────────
        var missingFields = new List<string>();
        if (string.IsNullOrWhiteSpace(Input.FirstName))
            missingFields.Add("First Name");
        if (string.IsNullOrWhiteSpace(Input.LastName))
            missingFields.Add("Last Name");
        if (string.IsNullOrWhiteSpace(Input.Email))
            missingFields.Add("Email");
        if (string.IsNullOrWhiteSpace(Input.Password))
            missingFields.Add("Password");
        if (Input.DateOfBirth == null)
            missingFields.Add("Date of Birth");

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
            // ── Pre-check for existing account by Email ───────────────────────
            bool emailExists = await _profileService.CheckEmailExists(Input.Email!);
            if (emailExists)
            {
                return Fail("An account with this email already exists.");
            }

            // ── Identity Claim Check ──────────────────────────────────────────
            if (string.IsNullOrEmpty(Input.ClaimId))
            {
                var existing = await _profileService.FindExistingPatientRecord(Input.FirstName!, Input.LastName!, Input.DateOfBirth, Input.PhoneNumber);
                if (existing != null)
                {
                    return new JsonResult(new { 
                        ok = true, 
                        recordFound = true, 
                        patientId = existing.Id,
                        message = "We found an existing patient record matching your information. Would you like to claim this record?"
                    });
                }
            }

            // ── Sign up flow ──────────────────────────────────────────────────
            string userId;
            bool needsConfirmation = true;

            if (!string.IsNullOrEmpty(Input.ClaimId))
            {
                // Claim Existing Record: Create user with existing ID
                userId = await _profileService.CreateUserWithId(
                    Input.ClaimId, 
                    Input.Email!, 
                    Input.Password!, 
                    new { 
                        first_name = Input.FirstName!, 
                        last_name = Input.LastName!,
                        role = "patient"
                    }
                ) ?? throw new Exception("Failed to create user for claim.");
                
                // Since we created via Admin API with email_confirm: true, we don't NEED confirmation,
                // but for security we might want them to verify. 
                // Let's set email_confirm: false in CreateUserWithId if we want that.
                // Actually, the user said "it needs to verify the email to make a password".
                // If they are claiming, they just set a password now.
                needsConfirmation = false;
            }
            else
            {
                // New User: Use regular signup or Admin API + link
                // To bypass Supabase's built-in email limits/domain issues, use Admin API + FluentEmail
                userId = Guid.NewGuid().ToString();
                await _profileService.CreateUserWithId(
                    userId,
                    Input.Email!,
                    Input.Password!,
                    new { 
                        first_name = Input.FirstName!, 
                        last_name = Input.LastName!,
                        role = "patient"
                    }
                );
                
                // Generate signup link
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var link = await _profileService.GenerateLink("signup", Input.Email!, $"{baseUrl}/email-confirmed");
                
                if (link != null)
                {
                    await _emailService.SendConfirmationEmailAsync(Input.Email!, Input.FirstName!, link);
                }
                else
                {
                    // Fallback or error
                    Console.WriteLine("[Signup] Failed to generate signup link.");
                }
            }

            // ── Update Profile ───────────────────────────────────────────────
            // Even if it's a claim, we update the profile with the new email/details
            await _profileService.UpdateProfile(userId, new UserPayload {
                FirstName = Input.FirstName,
                LastName = Input.LastName,
                Email = Input.Email,
                Sex = Input.Sex,
                DateOfBirth = Input.DateOfBirth,
                PhoneNumber = Input.PhoneNumber,
                Address = Input.Address,
                IsActive = !needsConfirmation
            });

            // ── Success Flow ───────────────────────────────────────────────
            return new JsonResult(new {
                ok = true,
                needsConfirmation = needsConfirmation,
                message = needsConfirmation 
                    ? "A confirmation email has been sent. Please verify your email before signing in."
                    : "Account set up successfully! You can now sign in.",
                errors = Array.Empty<string>(),
                user = needsConfirmation ? null : new {
                    id = userId,
                    firstName = Input.FirstName,
                    lastName = Input.LastName,
                    email = Input.Email,
                    initials = (Input.FirstName![0].ToString() + (Input.LastName!.Length > 0 ? Input.LastName[0].ToString() : "")).ToUpper(),
                    role = "patient",
                },
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Signup] Error: {ex.Message}");
            var msg = ex.Message.Contains("already registered")
                ? "An account with this email already exists."
                : ex.Message;
            return Fail(msg);
        }
    }

    private JsonResult Fail(string error) =>
        new(
            new
            {
                ok = false,
                needsConfirmation = false,
                errors = new[] { error },
            }
        );
}
