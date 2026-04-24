using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SamsonDentalCenterManagementSystem.Helpers
{
    /// <summary>
    /// Base PageModel for all Admin-side pages.
    /// Validates on every request that the user is staff (admin / doctor / receptionist).
    /// Exposes CurrentUserRole and CurrentUserId for use in derived pages and views.
    /// </summary>
    public class AdminPageModel : PageModel
    {
        private readonly ProfileService _profileService;

        /// <summary>The app-level role of the currently signed-in user.</summary>
        public string CurrentUserRole { get; private set; } = "";

        /// <summary>The Supabase user ID (sub claim) of the current user.</summary>
        public string CurrentUserId { get; private set; } = "";

        /// <summary>Display name of the current user.</summary>
        public string CurrentUserName { get; private set; } = "";

        /// <summary>Initials for avatar fallback.</summary>
        public string CurrentUserInitials { get; private set; } = "";

        public AdminPageModel(ProfileService profileService)
        {
            _profileService = profileService;
        }

        public override async Task OnPageHandlerExecutionAsync(
            PageHandlerExecutingContext context,
            PageHandlerExecutionDelegate next)
        {
            var userId = User.FindFirst("sub")?.Value
                      ?? User.Identity?.Name;

            if (string.IsNullOrEmpty(userId))
            {
                context.Result = new RedirectResult("/sign-in");
                return;
            }

            try
            {
                var profile = await _profileService.GetProfileById(userId);
                var role = profile?.Role?.ToLower() ?? "patient";

                var staffRoles = new[] { "admin", "doctor", "receptionist" };
                if (!staffRoles.Contains(role))
                {
                    // Patients are not allowed on admin pages
                    context.Result = new RedirectResult("/");
                    return;
                }

                CurrentUserId = userId;
                CurrentUserRole = role;
                CurrentUserName = profile != null
                    ? $"{profile.FirstName} {profile.LastName}".Trim()
                    : "Staff";
                CurrentUserInitials = profile != null
                    ? $"{(profile.FirstName?.Length > 0 ? profile.FirstName[0] : ' ')}{(profile.LastName?.Length > 0 ? profile.LastName[0] : ' ')}".Trim().ToUpper()
                    : "S";

                // Make available to Razor views via ViewData
                ViewData["UserRole"] = CurrentUserRole;
                ViewData["UserId"] = CurrentUserId;
                ViewData["UserName"] = CurrentUserName;
                ViewData["UserInitials"] = CurrentUserInitials;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AdminPageModel] Auth guard error: {ex.Message}");
                context.Result = new RedirectResult("/sign-in");
                return;
            }

            await next();
        }
    }
}
