using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;

namespace SamsonDentalCenterManagementSystem.Controllers.Staff
{
    [Authorize(Policy = "StaffOnly")]
    [ApiController]
    [Route("api/staff/leave")]
    [IgnoreAntiforgeryToken]
    public class StaffLeaveController : ControllerBase
    {
        private readonly StaffLeaveService _leaveService;

        public StaffLeaveController(StaffLeaveService leaveService)
        {
            _leaveService = leaveService;
        }

        [HttpGet("my-leaves")]
        public async Task<IActionResult> GetMyLeaves()
        {
            var profileId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(profileId)) return Unauthorized();

            var data = await _leaveService.GetLeavesByProfileIdAsync(profileId);
            return Ok(new { ok = true, data = data });
        }

        [HttpPost("apply")]
        public async Task<IActionResult> Apply([FromBody] StaffLeave leave)
        {
            var profileId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(profileId)) return Unauthorized();

            leave.ProfileId = profileId;
            leave.Status = "pending";
            
            try 
            {
                var created = await _leaveService.CreateLeaveAsync(leave);
                return Ok(new { ok = true, data = created });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllLeaves()
        {
            var data = await _leaveService.GetAllLeavesAsync();
            return Ok(new { ok = true, data = data });
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost("update-status")]
        public async Task<IActionResult> UpdateStatus([FromBody] UpdateStatusRequest req)
        {
            var adminId = User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(adminId)) return Unauthorized();

            try
            {
                await _leaveService.UpdateStatusAsync(req.Id, req.Status, adminId);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }
        }

        public class UpdateStatusRequest
        {
            public string Id { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
        }
    }
}
