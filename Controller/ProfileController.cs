using Microsoft.AspNetCore.Authorization;
using SamsonDentalCenterManagementSystem.Data;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using Microsoft.AspNetCore.Authentication;

[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfileController(AppDbContext db)
    {
        _db = db;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var profile = await GetCurrentProfileAsync();
        
        if (profile == null) return NotFound("Profile not found in database.");

        return Ok(profile);
    }

    [Authorize]
    [HttpGet("admin-check")]
    public async Task<IActionResult> AdminOnly()
    {
        var profile = await GetCurrentProfileAsync();

        if (profile == null) return NotFound();
        
        // Ensure this matches your 'app_role' enum value in Postgres
        if (profile.Role != "admin")
            return Forbid(); 

        return Ok(new { message = "Admin access granted", user = profile.FirstName });
    }

    // Helper to avoid repeating the Claim lookup and DB query
    private async Task<Profile?> GetCurrentProfileAsync()
    {
        // Supabase/JWT typically puts the UUID in the 'sub' or NameIdentifier claim
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId)) return null;

        // Use the string ID to find the profile
        return await _db.Profiles.FindAsync(userId);
    }

    

       
}