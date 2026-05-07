using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("otps")]
    public class Otp : BaseModel
    {
        [PrimaryKey("id", false)]
        public string? Id { get; set; }

        [Column("email")]
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [Column("code")]
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [Column("type")]
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty; // signup, appointment, password_reset, invitation

        [Column("expires_at")]
        [JsonPropertyName("expires_at")]
        public DateTime ExpiresAt { get; set; }

        [Column("is_used")]
        [JsonPropertyName("is_used")]
        public bool IsUsed { get; set; } = false;

        [Column("created_at")]
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
