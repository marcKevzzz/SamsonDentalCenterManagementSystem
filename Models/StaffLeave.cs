using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    public class StaffLeave
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [JsonPropertyName("leave_type")]
        public string LeaveType { get; set; } = string.Empty;

        [JsonPropertyName("start_date")]
        public DateTime StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public DateTime EndDate { get; set; }

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [JsonPropertyName("approved_by")]
        public string? ApprovedBy { get; set; }

        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Joined Data
        [JsonPropertyName("staff_name")]
        public string? StaffName { get; set; }

        [JsonPropertyName("conflict_count")]
        public int ConflictCount { get; set; }
    }
}
