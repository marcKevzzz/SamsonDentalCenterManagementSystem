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
        // Log the raw Input object to see what reached the server
        Console.WriteLine($"[Signup Debug] FN: {Input.FirstName}, LN: {Input.LastName}, Email: {Input.Email}, DOB: {Input.DateOfBirth}, address: {Input.Address}, password length: {Input.Password?.Length ?? 0}, Consent: {Input.Consent}");

        // 1. Check for specific missing fields
        var missingFields = new List<string>();
        if (string.IsNullOrWhiteSpace(Input.FirstName)) missingFields.Add("First Name");
        if (string.IsNullOrWhiteSpace(Input.LastName)) missingFields.Add("Last Name");
        if (string.IsNullOrWhiteSpace(Input.Email)) missingFields.Add("Email");
        if (string.IsNullOrWhiteSpace(Input.Password)) missingFields.Add("Password");
        if (Input.DateOfBirth == null) missingFields.Add("Date of Birth");

        if (missingFields.Any())
        {
            return Json(false, [$"Required fields missing: {string.Join(", ", missingFields)}"]);
        }

        // 2. Standard Logic
        if (Input.Password != Input.ConfirmPassword)
            return Json(false, ["Passwords do not match."]);

        if (!Input.Consent)
            return Json(false, ["You must agree to the terms."]);

        try
        {
            // 1. Prepare Metadata for the Database Trigger
           var options = new SignUpOptions
            {
                Data = new Dictionary<string, object>
                {
                    { "first_name", Input.FirstName },
                    { "last_name", Input.LastName },
                    { "date_of_birth", Input.DateOfBirth?.ToString("yyyy-MM-dd") ?? "" }, 
                    { "sex", Input.Sex ?? "unspecified" }, 
                    { "phone_number", Input.PhoneNumber ?? "" },
                    { "address", Input.Address ?? "" },
                    { "patient_type", Input.PatientType ?? "New Patient" },
                    { "role", "patient" } 
                }
            };

            // 2. Just sign up. The DB TRIGGER handles the 'profiles' table insertion.
            var session = await _supabase.Auth.SignUp(Input.Email, Input.Password, options);

            if (session?.User?.Id == null)
            {
                return Json(false, ["Sign-up failed. Please check your email/connection."]);
            }

            // SUCCESS: Do NOT call _supabase.From<Profile>().Insert(Input) here anymore!
            return Json(true, []);
        }
        catch (Exception ex)
        {
            return Json(false, [ex.Message]);
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private JsonResult Json(bool ok, string[] errors) =>
        new(new { ok, errors });

    private List<string> GetModelErrors() =>
        ModelState.Values
                  .SelectMany(v => v.Errors)
                  .Select(e => e.ErrorMessage)
                  .ToList();
}