using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
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
    private readonly OtpService _otpService;
    private readonly string _appBaseUrl;
    private readonly ILogger<SignupModel> _logger;
    private readonly IDistributedCache _cache;

    public SignupModel(
        Supabase.Client supabase,
        ReviewService reviewService,
        ProfileService profileService,
        IEmailService emailService,
        OtpService otpService,
        IConfiguration config,
        ILogger<SignupModel> logger,
        IDistributedCache cache
    )
    {
        _reviewService = reviewService;
        _supabase = supabase;
        _profileService = profileService;
        _emailService = emailService;
        _otpService = otpService;
        _appBaseUrl = (config["App:BaseUrl"] ?? "").TrimEnd('/');
        _logger = logger;
        _cache = cache;
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
        if (!string.IsNullOrEmpty(Input.Email))
            Input.Email = Input.Email.Trim().ToLower();

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
        else if (Input.DateOfBirth > DateTime.Today.AddMonths(-6))
            return Fail("Patient must be at least 6 months old.");

        if (string.IsNullOrWhiteSpace(Input.PhoneNumber))
            missingFields.Add("Phone Number");
        else if (!System.Text.RegularExpressions.Regex.IsMatch(Input.PhoneNumber, "^09[0-9]{9}$"))
            return Fail("Please enter a valid 11-digit phone number (e.g., 09XXXXXXXXX).");

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
            // ── Check if Account exists (Auth or Profile) ───────────────────
            var authUserId = await _profileService.GetUserIdByEmail(Input.Email!);
            if (authUserId != null)
            {
                // Account exists. Check if it's an active profile.
                var profile = await _profileService.GetProfileById(authUserId);
                if (profile != null && profile.IsActive)
                {
                    return Fail("An account with this email already exists. Please sign in.");
                }
                
                // If profile doesn't exist or is not active, set as ClaimId
                Input.ClaimId = authUserId;
                _logger.LogInformation($"[Signup] Account found for {Input.Email} (ID: {authUserId}). Setting as ClaimId.");
            }

            // ── Identity Claim Check (By Name/Phone/DOB) ──────────────────────
            if (string.IsNullOrEmpty(Input.ClaimId))
            {
                var existing = await _profileService.FindExistingPatientRecord(
                    Input.FirstName!,
                    Input.LastName!,
                    Input.DateOfBirth,
                    Input.PhoneNumber,
                    Input.Email
                );
                if (existing != null)
                {
                    return new JsonResult(
                        new
                        {
                            ok = true,
                            recordFound = true,
                            patientId = existing.Id,
                            message = "We found an existing patient record matching your information. Would you like to claim this record?",
                        }
                    );
                }
            }

            // ── Sign up flow (DECOUPLED - Save to Cache) ──────────────────────
            // We do NOT save to DB yet. We cache the payload and send OTP.

            // Generate OTP
            var otp = await _otpService.GenerateOtp(Input.Email!, "signup");

            // Cache the signup data for 1 hour
            var cacheKey = $"signup_{Input.Email}";
            var signupData = new
            {
                ClaimId = Input.ClaimId,
                FirstName = Input.FirstName,
                LastName = Input.LastName,
                Email = Input.Email,
                Password = Input.Password,
                PhoneNumber = Input.PhoneNumber,
                Sex = Input.Sex,
                DateOfBirth = Input.DateOfBirth,
                Address = Input.Address,
                Consent = Input.Consent
            };
            var cacheJson = JsonSerializer.Serialize(signupData);
            await _cache.SetStringAsync(
                cacheKey,
                cacheJson,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1),
                }
            );

            await _emailService.SendEmailAsync(
                Input.Email!,
                Input.FirstName!,
                "Verify your Samson Dental Account",
                "OtpNotification",
                new
                {
                    Name = Input.FirstName,
                    Action = "creating your account",
                    Code = otp,
                    Link = (string?)null,
                }
            );

            // ── Success Flow ───────────────────────────────────────────────
            return new JsonResult(
                new
                {
                    ok = true,
                    needsConfirmation = true,
                    message = "A verification code has been sent to your email. Please enter it to continue.",
                    redirectUrl = $"/Verify-Otp?email={Uri.EscapeDataString(Input.Email!)}&type=signup",
                    errors = Array.Empty<string>(),
                }
            );
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
