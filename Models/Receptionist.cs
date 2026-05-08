using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("receptionists")]
    public class Receptionist : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("desk_location")]
        public string? DeskLocation { get; set; }

        [Column("bio")]
        public string? Bio { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("profile_id")]
        public string ProfileId { get; set; } = string.Empty;

        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public Profile? Profile { get; set; }

        // Uses unified staff_availability table
        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public List<StaffAvailability>? Availability { get; set; }
    }
}
