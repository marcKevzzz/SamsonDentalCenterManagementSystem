using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("profiles")]
    public class Profile : BaseModel
    {
        // internal object? Models;

        [PrimaryKey("id", true)]
        public string Id { get; set; } = string.Empty;

        [Column("first_name")]
        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [Column("last_name")]
        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [Column("date_of_birth")]
        [JsonPropertyName("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("sex")]
        [JsonPropertyName("sex")]
        public string? Sex { get; set; }

        [Column("phone_number")]
        [JsonPropertyName("phone_number")]
        public string? PhoneNumber { get; set; }

        [Column("email")]
        public string? Email { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("role")]
        public string? Role { get; set; }

        [Column("avatar_url")]
        [JsonPropertyName("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("reactivation_requested")]
        public bool ReactivationRequested { get; set; } = false;

        [Column("requires_merge_review")]
        public bool RequiresMergeReview { get; set; } = false;

        [JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string FullName => $"{FirstName} {LastName}";

        // --- UI / Auth fields — excluded from Supabase insert ---
        [JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string Password { get; set; } = string.Empty;

        [JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string ConfirmPassword { get; set; } = string.Empty;

        [JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public bool Consent { get; set; }

        [JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string? ClaimId { get; set; }
    }
}
