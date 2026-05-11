using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("patients")]
    public class Patient : BaseModel
    {
        [Column("profile_id")]
        [PrimaryKey("profile_id", false)]
        [JsonPropertyName("profile_id")]
        [Newtonsoft.Json.JsonProperty("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [Column("date_of_birth")]
        [JsonPropertyName("date_of_birth")]
        [Newtonsoft.Json.JsonProperty("date_of_birth")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime? DateOfBirth { get; set; }

        [Column("sex")]
        [JsonPropertyName("sex")]
        [Newtonsoft.Json.JsonProperty("sex")]
        public string? Sex { get; set; }

        [Column("address")]
        [JsonPropertyName("address")]
        [Newtonsoft.Json.JsonProperty("address")]
        public string? Address { get; set; }

        [Column("emergency_contact")]
        [JsonPropertyName("emergency_contact")]
        [Newtonsoft.Json.JsonProperty("emergency_contact")]
        public string? EmergencyContact { get; set; }

        [Column("relationship")]
        [JsonPropertyName("relationship")]
        [Newtonsoft.Json.JsonProperty("relationship")]
        public string? Relationship { get; set; }

        [Column("invite_code")]
        [JsonPropertyName("invite_code")]
        [Newtonsoft.Json.JsonProperty("invite_code")]
        public string? InviteCode { get; set; }

        [Column("invite_expires_at")]
        [JsonPropertyName("invite_expires_at")]
        [Newtonsoft.Json.JsonProperty("invite_expires_at")]
        public DateTime? InviteExpiresAt { get; set; }

        [Column("is_claimed")]
        [JsonPropertyName("is_claimed")]
        [Newtonsoft.Json.JsonProperty("is_claimed")]
        public bool IsClaimed { get; set; }

        [Column("created_by_id")]
        [JsonPropertyName("created_by_id")]
        [Newtonsoft.Json.JsonProperty("created_by_id")]
        public string? CreatedById { get; set; }
    }
}
