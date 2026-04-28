using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc;

namespace SamsonDentalCenterManagementSystem.Pages;

public class IndexModel : PageModel
{
    private readonly ReviewService _reviewService;
    private readonly ClinicService _clinicService;

    public IndexModel(ReviewService reviewService, ClinicService clinicService)
    {
        _reviewService = reviewService;
        _clinicService = clinicService;
    }

    public List<Review> Reviews { get; set; } = new();
    public ClinicSettings ClinicSettings { get; set; } = new();
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        ClinicSettings = await _clinicService.GetSettingsAsync();
        
        if (User.Identity?.IsAuthenticated == true)
        {
            var role = User.Claims.FirstOrDefault(c => c.Type == "app_role" || c.Type == "role")?.Value?.ToLower();
            if (role == "admin") return Redirect("/Admin/Dashboard");
            if (role == "doctor") return Redirect("/Doctor/Dashboard");
            if (role == "receptionist") return Redirect("/Receptionist/Dashboard");
        }

        Reviews = await _reviewService.GetVisibleReviewsAsync();
        var stats = await _reviewService.GetReviewStatsAsync();
        AverageRating = stats.average;
        TotalReviews = stats.count;

        return Page();
    }
}
