using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide.Reviews
{
    public class ReviewsModel : AdminPageModel
    {
        private readonly ReviewService _reviewService;

       public ReviewsModel(ReviewService reviewService, ProfileService profileService) 
            : base(profileService) 
        {
            _reviewService = reviewService;
        }

        public List<Review> AllReviews { get; set; } = new();

        public async Task OnGetAsync()
        {
            AllReviews = await _reviewService.GetAllReviewsAsync();
        }

        public async Task<IActionResult> OnPostToggleVisibilityAsync(string id, bool visible)
        {
            await _reviewService.ToggleVisibilityAsync(id, visible);
            return new JsonResult(new { ok = true });
        }

        public async Task<IActionResult> OnPostAddReviewAsync([FromBody] Review review)
        {
            if (string.IsNullOrWhiteSpace(review.AuthorName) || string.IsNullOrWhiteSpace(review.ReviewText))
            {
                return new JsonResult(new { ok = false, error = "Name and text required" });
            }
            await _reviewService.AddReviewAsync(review);
            return new JsonResult(new { ok = true });
        }
        public async Task<IActionResult> OnPostSyncReviewsAsync()
        {
            await _reviewService.SyncApifyReviewsAsync("Samson Dental Center", "Baguio City");
            return new JsonResult(new { ok = true });
        }

        public async Task<IActionResult> OnPostImportLocalAsync()
        {
            await _reviewService.ImportLocalReviewsAsync();
            return new JsonResult(new { ok = true });
        }
    }
}
