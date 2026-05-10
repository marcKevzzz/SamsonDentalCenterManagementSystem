using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("patients")]
    public class Patient : BaseModel
    {
        [PrimaryKey("profile_id", false)]
        public string ProfileId { get; set; } = string.Empty;

        [Column("date_of_birth")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime? DateOfBirth { get; set; }

        [Column("sex")]
        public string? Sex { get; set; }

        [Column("address")]
        public string? Address { get; set; }

        [Column("emergency_contact")]
        public string? EmergencyContact { get; set; }

        [Column("relationship")]
        public string? Relationship { get; set; }

        [Column("invite_code")]
        public string? InviteCode { get; set; }

        [Column("invite_expires_at")]
        public DateTime? InviteExpiresAt { get; set; }

        [Column("is_claimed")]
        public bool IsClaimed { get; set; }

        [Column("created_by_id")]
        public string? CreatedById { get; set; }

        [Reference(typeof(Profile), foreignKey: "patients_profile_id_fkey")]
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Profile? Profile { get; set; }

        [Reference(typeof(Profile), foreignKey: "patients_created_by_id_fkey")]
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Profile? CreatedBy { get; set; }
    }
}
