using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide;

[Authorize]
public class AdminUsersModel : PageModel
{
    private readonly ProfileService _profileService;

    public List<Profile> Users { get; set; } = new();

    public AdminUsersModel(ProfileService profileService)
    {
        _profileService = profileService;
    }

    public async Task<IActionResult> OnGetAsync()
    {
        var id = User.FindFirst("sub")?.Value;
        Users = await _profileService.GetAllProfilesExceptSelf(id!);
        return Page();
    }
}