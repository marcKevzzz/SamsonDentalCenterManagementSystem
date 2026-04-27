using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SamsonDentalCenterManagementSystem.Pages;

public class IndexModel : PageModel
{
    private readonly ReviewService _reviewService;

    public IndexModel(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    public List<Review> Reviews { get; set; } = new();
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }

    public async Task OnGetAsync()
    {
        Reviews = await _reviewService.GetVisibleReviewsAsync();
        var stats = await _reviewService.GetReviewStatsAsync();
        AverageRating = stats.average;
        TotalReviews = stats.count;
    }
}
