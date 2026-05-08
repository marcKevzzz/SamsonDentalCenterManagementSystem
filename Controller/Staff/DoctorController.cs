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

        [HttpGet("tooth-chart/{patientId}")]
        public async Task<IActionResult> GetToothChart(string patientId)
        {
            try
            {
                var chart = await _recordService.GetToothChartAsync(patientId);
                var dtos = chart.Select(ts => new
                {
                    toothNumber = ts.ToothNumber,
                    status = ts.Status,
                    notes = ts.Notes,
                    updatedAt = ts.UpdatedAt
                }).ToList();

                return Ok(new { ok = true, data = dtos });
            }
            catch (Exception ex)
            {
                return BadRequest(new { ok = false, error = ex.Message });
            }
        }

    }
}
