using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Text.Json;

namespace SamsonDentalCenterManagementSystem.Controller.Staff
{
    [ApiController]
    [Route("api/doctor")]
    [Authorize(Roles = "admin,doctor")]
    public class DoctorController : ControllerBase
    {
        private readonly ProfileService _profileService;
        private readonly RecordService _recordService;

        public DoctorController(ProfileService profileService, RecordService recordService)
        {
            _profileService = profileService;
            _recordService = recordService;
        }

        [HttpGet("medical-info/{patientId}")]
        public async Task<IActionResult> GetMedicalInfo(string patientId)
        {
            var info = await _recordService.GetMedicalInfoAsync(patientId);
            return Ok(new { ok = true, exists = info != null, data = info });
        }

        [HttpPost("save-medical-info")]
        public async Task<IActionResult> SaveMedicalInfo([FromBody] PatientMedicalInfo info)
        {
            try
            {
                var actorId = User.FindFirst("sub")?.Value ?? "";
                await _recordService.UpsertMedicalInfoAsync(info, actorId);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }
        }

        [HttpPost("evaluate-oral-health")]
        public async Task<IActionResult> EvaluateOralHealth([FromBody] OralHealthEvaluationRequest req)
        {
            try
            {
                var summary = new
                {
                    gumHealth = req.GumHealth,
                    cavityRisk = req.CavityRisk,
                    enamelStatus = req.EnamelStatus,
                    plaqueLevel = req.PlaqueLevel,
                    notes = req.Notes,
                    evaluatedAt = DateTime.UtcNow
                };

                var payload = new Dictionary<string, object>
                {
                    { "oral_health_score", req.Score },
                    { "oral_health_summary", JsonSerializer.Serialize(summary) }
                };

                await _profileService.UpdateProfilePartial(req.PatientId, payload);

                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }
        }
    }

    public class OralHealthEvaluationRequest
    {
        public string PatientId { get; set; } = string.Empty;
        public int Score { get; set; }
        public string GumHealth { get; set; } = string.Empty;
        public string CavityRisk { get; set; } = string.Empty;
        public string EnamelStatus { get; set; } = string.Empty;
        public string PlaqueLevel { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }
}
