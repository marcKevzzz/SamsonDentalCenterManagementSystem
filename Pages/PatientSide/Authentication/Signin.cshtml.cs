    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.Mvc.RazorPages;
    using SamsonDentalCenterManagementSystem.Models; // Ensure your Profile model is here

    namespace SamsonDentalCenterManagementSystem.Pages;

    public class SigninModel : PageModel
    {
        private readonly Supabase.Client _supabase;
        private readonly ProfileService _profileService;

        public SigninModel(Supabase.Client supabase, ProfileService profileService)
        {
            _supabase = supabase;
            _profileService = profileService;
        }

        [BindProperty]
        public Profile Input { get; set; } = new();

        public IActionResult OnGet()
        {
            // 1. Check if the "Remember Me" or Session cookie exists
            var token = Request.Cookies["sb-access-token"];

            if (!string.IsNullOrEmpty(token))
            {
                // 2. If the user is already logged in, redirect them to the Index (Dashboard)
                return RedirectToPage("/Index");
            }

            // 3. Otherwise, show the sign-in page as usual
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            // 1. Manually pull the rememberMe value from the Form collection
            // This avoids the "Multiple Handlers" conflict
            bool rememberMe = Request.Form["rememberMe"] == "true";
            // Log for debugging - ensures the Model Binder is working
            Console.WriteLine($"[Signin Debug] Email: {Input.Email}, Password Length: {Input.Password?.Length ?? 0}");

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
    var cookieOptions = new CookieOptions
    {
        HttpOnly = true,
        Secure = false, // Highly recommended
        SameSite = SameSiteMode.Lax,
        Path = "/",
        Expires = rememberMe ? DateTime.UtcNow.AddDays(30) : null // Session cookie if not remembered
    };

    // Store both tokens
    Response.Cookies.Append("sb-access-token", session.AccessToken, cookieOptions);
    
    if ( !string.IsNullOrEmpty(session.RefreshToken))
    {
        Response.Cookies.Append("sb-refresh-token", session.RefreshToken, cookieOptions);
    }
                    try
                    {
                        var user = session.User;
                        if (user != null)
                        {
                            var firstName = user.UserMetadata?.ContainsKey("first_name") == true
                                            ? user.UserMetadata["first_name"]?.ToString()
                                            : "User";

                            var lastName = user.UserMetadata?.ContainsKey("last_name") == true
                                        ? user.UserMetadata["last_name"]?.ToString()
                                        : "";
                        var profile = await _profileService.GetProfileById(user.Id!, user.Email);
                            var avatarUrl = profile?.AvatarUrl ?? "";
                            var role = profile?.Role ?? "";

                            return new JsonResult(new
                            {
                                ok = true,
                                user = new
                                {
                                    firstName,
                                    lastName,
                                    email = user.Email,
                                    initials = (firstName?.FirstOrDefault().ToString() + (lastName?.Length > 0 ? lastName[0].ToString() : "")).ToUpper(),
                                    id = user.Id,
                                    avatarUrl,
                                    role
                                }
                            });
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
                if (ex.Message.Contains("invalid_credentials") || ex.Message.Contains("Invalid login credentials"))
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