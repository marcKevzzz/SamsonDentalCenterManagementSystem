using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Services;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.Authentication
{
    public class VerifyOtpModel : PageModel
    {
        public class SignupData
        {
            public string? ClaimId { get; set; }
            public string? FirstName { get; set; }
            public string? LastName { get; set; }
            public string? Email { get; set; }
            public string? Password { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Sex { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Address { get; set; }
        }

        private readonly ProfileService _profileService;
        private readonly OtpService _otpService;
        private readonly IDistributedCache _cache;

        public VerifyOtpModel(ProfileService profileService, OtpService otpService, IDistributedCache cache)
        {
            _profileService = profileService;
            _otpService = otpService;
            _cache = cache;
        }

        [BindProperty(SupportsGet = true)]
        public string Email { get; set; } = string.Empty;

        [BindProperty(SupportsGet = true)]
        public string Type { get; set; } = string.Empty; // signup, invitation, appointment, password_reset

        [BindProperty]
        public string Code { get; set; } = string.Empty;

        public void OnGet() { }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!string.IsNullOrEmpty(Email)) Email = Email.Trim().ToLower();
            if (string.IsNullOrWhiteSpace(Code) || Code.Length != 6)
            {
                TempData["Error"] = "Please enter a valid 6-digit code.";
                return Page();
            }

            bool isValid = await _otpService.VerifyOtp(Email, Code, Type);
            if (!isValid)
            {
                TempData["Error"] = "Invalid or expired code. Please try again.";
                return Page();
            }

            // Success logic based on Type
            if (Type == "signup")
            {
                var cacheKey = $"signup_{Email}";
                var cachedJson = await _cache.GetStringAsync(cacheKey);
                
                if (string.IsNullOrEmpty(cachedJson))
                {
                    // Fallback: check if user was already created (older flow or double submission)
                    var existingProfile = await _profileService.GetProfileByEmail(Email);
                    if (existingProfile != null)
                    {
                        await _profileService.ToggleUserActive(existingProfile.Id, true);
                        TempData["Success"] = "Email verified successfully! You can now sign in.";
                        return RedirectToPage("/Authentication/Signin");
                    }
                    
                    TempData["Error"] = "Signup session expired. Please sign up again.";
                    return RedirectToPage("/Authentication/Signup");
                }

                var input = JsonSerializer.Deserialize<SignupData>(cachedJson);
                if (input == null)
                {
                    TempData["Error"] = "Invalid signup data. Please try again.";
                    return RedirectToPage("/Authentication/Signup");
                }

                try 
                {
                    string userId;
                    if (!string.IsNullOrEmpty(input.ClaimId))
                    {
                        // Claiming existing record
                        userId = await _profileService.CreateUserWithId(
                            input.ClaimId, 
                            input.Email!, 
                            input.Password!, 
                            new { 
                                first_name = input.FirstName, 
                                last_name = input.LastName,
                                role = "patient"
                            }
                        ) ?? throw new Exception("Failed to create user for claim.");
                    }
                    else
                    {
                        // New user
                        userId = Guid.NewGuid().ToString();
                        await _profileService.CreateUserWithId(
                            userId,
                            input.Email!,
                            input.Password!,
                            new { 
                                first_name = input.FirstName, 
                                last_name = input.LastName,
                                role = "patient"
                            }
                        );
                    }

                    // Update/Create Profile
                    await _profileService.UpdateProfile(userId, new UserPayload {
                        FirstName = input.FirstName,
                        LastName = input.LastName,
                        Email = input.Email,
                        Sex = input.Sex,
                        DateOfBirth = input.DateOfBirth,
                        PhoneNumber = input.PhoneNumber,
                        Address = input.Address,
                        IsActive = true
                    });

                    // Clear cache
                    await _cache.RemoveAsync(cacheKey);

                    TempData["Success"] = "Account verified and created successfully! You can now sign in.";
                    return RedirectToPage("/Authentication/Signin");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[VerifyOtp] Signup Error: {ex.Message}");
                    TempData["Error"] = $"Error creating account: {ex.Message}";
                    return Page();
                }
            }
            else if (Type == "invitation")
            {
                // For invitation, they need to set their password next
                return RedirectToPage("/Authentication/ResetPassword", new { email = Email, otp = Code, verified = true });
            }
            else if (Type == "password_reset")
            {
                 return RedirectToPage("/Authentication/ResetPassword", new { email = Email, otp = Code, verified = true });
            }
            else if (Type == "appointment")
            {
                // This would be handled by a separate controller or logic for guests
                // But we can redirect to a success page
                return Redirect($"/appointments/confirmed?email={Email}&otp={Code}");
            }

            return Page();
        }
    }
}
