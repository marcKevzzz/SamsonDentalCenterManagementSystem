using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Controllers;

[Authorize]
[ApiController]
[Route("api/settings")]
[IgnoreAntiforgeryToken]
public class SettingsController : ControllerBase
{
    private readonly ProfileService _profileService;

    public SettingsController(ProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { ok = false, error = "Not authenticated." });

        if (file == null || file.Length == 0)
            return BadRequest(new { ok = false, error = "No file provided." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { ok = false, error = "File exceeds 5MB limit." });

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            var ext = Path.GetExtension(file.FileName);
            var publicUrl = await _profileService.UploadAvatar(userId, bytes, ext, file.ContentType);

            return Ok(new { ok = true, url = publicUrl });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UploadAvatar] Error: {ex.Message}");
            if (ex.InnerException != null)
                Console.WriteLine($"[UploadAvatar] Inner: {ex.InnerException.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpDelete("remove-avatar")]
    public Task<IActionResult> RemoveAvatar()
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Task.FromResult<IActionResult>(Unauthorized(new { ok = false, error = "Not authenticated." }));

        try
        {
            _profileService.RemoveAvatar(userId);
            return Task.FromResult<IActionResult>(Ok(new { ok = true }));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RemoveAvatar] Error: {ex.Message}");
            return Task.FromResult<IActionResult>(StatusCode(500, new { ok = false, error = ex.Message }));
        }
    }

    [HttpPut("update-profile")]
    public async Task<IActionResult> SavePersonal([FromBody] Profile p)
    {
        var userId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { ok = false, error = "Not authenticated." });

        try
        {
            await _profileService.UpdateProfile(userId, p);

            // ← was calling UpdateProfile twice, should be UpdateUserEmail
            if (!string.IsNullOrWhiteSpace(p.Email))
                await _profileService.UpdateUserEmail(userId, p.Email);

            return Ok(new { ok = true });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SavePersonal] Error: {ex.Message}");
            return StatusCode(500, new { ok = false, error = ex.Message });
        }
    }

    [HttpPut("update-password")]
public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordRequest req)
{
    var userId = User.FindFirst("sub")?.Value;
    if (string.IsNullOrEmpty(userId))
        return Unauthorized(new { ok = false, error = "Not authenticated." });

    if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
        return BadRequest(new { ok = false, error = "Password must be at least 8 characters." });

    if (req.NewPassword != req.ConfirmPassword)
        return BadRequest(new { ok = false, error = "Passwords do not match." });

    try
    {
        await _profileService.UpdateUserPassword(userId, req.NewPassword);
        return Ok(new { ok = true });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SavePassword] Error: {ex.Message}");
        return StatusCode(500, new { ok = false, error = ex.Message });
    }
}

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { ok = true, message = "controller is alive" });

    [HttpPut("test-put")]
    public IActionResult TestPut() => Ok(new { ok = true, method = "PUT works" });
}

public class UpdatePasswordRequest
{
    public string? NewPassword     { get; set; }
    public string? ConfirmPassword { get; set; }
}