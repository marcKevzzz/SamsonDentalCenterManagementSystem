using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    public class AvailabilityDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("staff_id")]
        public string StaffId { get; set; } = string.Empty;

        [JsonPropertyName("staff_type")]
        public string StaffType { get; set; } = string.Empty;

        [JsonPropertyName("day_of_week")]
        public int DayOfWeek { get; set; }

        [JsonPropertyName("start_time")]
        public string StartTime { get; set; } = string.Empty;

        [JsonPropertyName("end_time")]
        public string EndTime { get; set; } = string.Empty;

        [JsonPropertyName("is_active")]
        public bool IsActive { get; set; }
    }
}
