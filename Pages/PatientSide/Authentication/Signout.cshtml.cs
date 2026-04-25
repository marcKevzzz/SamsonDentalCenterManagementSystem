using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

// namespace SamsonDentalCenterManagementSystem.Pages.Patientside.Authentication;
public class SignoutModel : PageModel
{
    private readonly Supabase.Client _supabase;

    public SignoutModel(Supabase.Client supabase)
    {
        _supabase = supabase;
    }

    // This handles typing "/signout" in the URL bar
    public async Task<IActionResult> OnGet()
    {
        return await PerformSignOut();
    }

    // This handles the POST from your button click
    public async Task<IActionResult> OnPostAsync()
    {
        return await PerformSignOut();
    }
    public async Task<IActionResult> PerformSignOut()
    {
        try { await _supabase.Auth.SignOut(); } catch { }

        // Options MUST match exactly how the cookie was created in SigninModel
        var cookieOptions = new CookieOptions
        {
            Path = "/",
            Secure = false,
            HttpOnly = true,
            SameSite = SameSiteMode.Lax
        };

        Response.Cookies.Delete("sb-access-token", cookieOptions);
        Response.Cookies.Delete("sb-refresh-token", cookieOptions);

        // Return the page so JS can clear localStorage before redirecting
        return Page();
    }
}