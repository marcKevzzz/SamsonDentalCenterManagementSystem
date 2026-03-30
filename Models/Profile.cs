using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("profiles")]
    public class Profile : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("first_name")]
        public string FirstName { get; set; } = string.Empty;

        [Column("last_name")]
        public string LastName { get; set; } = string.Empty;

        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("sex")]
        public string? Sex { get; set; }

        [Column("phone_number")]
        public string? PhoneNumber { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("role")]
        public string Role { get; set; } = "patient";

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("patient_type")]
        public string? PatientType { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // --- UI / Auth fields — excluded from Supabase insert ---
        [JsonIgnore] public string Email { get; set; } = string.Empty;
        [JsonIgnore] public string Password { get; set; } = string.Empty;
        [JsonIgnore] public string ConfirmPassword { get; set; } = string.Empty;
        [JsonIgnore] public bool Consent { get; set; }
    }
}