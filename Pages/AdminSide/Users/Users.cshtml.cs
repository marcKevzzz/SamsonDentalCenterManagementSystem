using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Helpers;

namespace SamsonDentalCenterManagementSystem.Pages.AdminSide;

public class AdminUsersModel : AdminPageModel
{
    private readonly ProfileService _profileService;

    public List<Profile> Users { get; set; } = new();

    public AdminUsersModel(ProfileService profileService)
        : base(profileService)
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