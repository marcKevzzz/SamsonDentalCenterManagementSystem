using Microsoft.AspNetCore.Mvc;
using SamsonDentalCenterManagementSystem.Models;
using SamsonDentalCenterManagementSystem.Services;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Controllers
{
    [ApiController]
    [Route("api/inquiry")]
    [IgnoreAntiforgeryToken]
    public class InquiryController : ControllerBase
    {
        private readonly InquiryService _inquiryService;

        public InquiryController(InquiryService inquiryService)
        {
            _inquiryService = inquiryService;
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateInquiryRequest req)
        {
            if (string.IsNullOrEmpty(req.Message))
                return BadRequest(new { ok = false, error = "Message is required." });

            try
            {
                var inquiry = new Inquiry
                {
                    PatientId = req.PatientId,
                    Subject = req.Subject ?? "General Inquiry",
                    GuestEmail = req.GuestEmail,
                    GuestFirstName = req.GuestFirstName,
                    GuestLastName = req.GuestLastName,
                    GuestPhone = req.GuestPhone
                };

                var created = await _inquiryService.CreateInquiryAsync(inquiry, req.Message);
                return Ok(new { ok = true, inquiryId = created.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpPost("message")]
        public async Task<IActionResult> AddMessage([FromBody] AddMessageRequest req)
        {
            if (string.IsNullOrEmpty(req.InquiryId) || string.IsNullOrEmpty(req.Message))
                return BadRequest(new { ok = false, error = "Inquiry ID and message are required." });

            try
            {
                await _inquiryService.AddMessageAsync(req.InquiryId, req.SenderId, req.Message, req.IsFromStaff);
                return Ok(new { ok = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpGet("messages/{inquiryId}")]
        public async Task<IActionResult> GetMessages(string inquiryId)
        {
            try
            {
                var messages = await _inquiryService.GetInquiryMessagesAsync(inquiryId);
                // Project to avoid serializing Supabase BaseModel internal properties
                var projected = messages.Select(m => new {
                    id = m.Id,
                    inquiry_id = m.InquiryId,
                    sender_id = m.SenderId,
                    message = m.Message,
                    is_from_staff = m.IsFromStaff,
                    created_at = m.CreatedAt,
                    sender_name = m.Sender?.FullName ?? (m.IsFromStaff ? "Staff" : "Patient")
                });
                return Ok(new { ok = true, messages = projected });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        [HttpGet("status/{inquiryId}")]
        public async Task<IActionResult> GetStatus(string inquiryId)
        {
            try
            {
                // Simple status check
                var res = await _inquiryService.GetInquiryMessagesAsync(inquiryId);
                return Ok(new { ok = true, hasReply = res.Any(m => m.IsFromStaff) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { ok = false, error = ex.Message });
            }
        }

        public class CreateInquiryRequest
        {
            [JsonPropertyName("patientId")]
            public string? PatientId { get; set; }

            [JsonPropertyName("subject")]
            public string? Subject { get; set; }

            [JsonPropertyName("message")]
            public string Message { get; set; } = "";

            [JsonPropertyName("guestEmail")]
            public string? GuestEmail { get; set; }

            [JsonPropertyName("guestFirstName")]
            public string? GuestFirstName { get; set; }

            [JsonPropertyName("guestLastName")]
            public string? GuestLastName { get; set; }

            [JsonPropertyName("guestPhone")]
            public string? GuestPhone { get; set; }
        }

        public class AddMessageRequest
        {
            [JsonPropertyName("inquiryId")]
            public string InquiryId { get; set; } = "";

            [JsonPropertyName("senderId")]
            public string? SenderId { get; set; }

            [JsonPropertyName("message")]
            public string Message { get; set; } = "";

            [JsonPropertyName("isFromStaff")]
            public bool IsFromStaff { get; set; } = false;
        }
    }
}
