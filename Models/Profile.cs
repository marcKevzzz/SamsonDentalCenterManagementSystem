using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("profiles")]
    public class Profile : BaseModel
    {
        // internal object? Models;

        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("first_name")]
        [JsonPropertyName("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [Column("last_name")]
        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [Column("phone_number")]
        [JsonPropertyName("phone_number")]
        public string? PhoneNumber { get; set; }

        [Column("email")]
        public string? Email { get; set; }

        [Column("role")]
        [JsonPropertyName("role")]
        [Newtonsoft.Json.JsonProperty("role")]
        public string? Role { get; set; }

        [Reference(typeof(Patient), foreignKey: "patients_profile_id_fkey")]
        [JsonPropertyName("patients")]
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Patient? Patient { get; set; }

        private DateTime? _dob;
        [Column("date_of_birth")]
        [JsonPropertyName("date_of_birth")]
        public DateTime? DateOfBirth 
        { 
            get => Patient?.DateOfBirth ?? _dob; 
            set { _dob = value; if (Patient != null) Patient.DateOfBirth = value; } 
        }

        private string? _sex;
        [Column("sex")]
        [JsonPropertyName("sex")]
        public string? Sex 
        { 
            get => Patient?.Sex ?? _sex; 
            set { _sex = value; if (Patient != null) Patient.Sex = value; } 
        }

        private string? _address;
        [Column("address")]
        [JsonPropertyName("address")]
        public string? Address 
        { 
            get => Patient?.Address ?? _address; 
            set { _address = value; if (Patient != null) Patient.Address = value; } 
        }

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
