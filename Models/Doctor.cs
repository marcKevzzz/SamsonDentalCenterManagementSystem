// ── Models/Doctor.cs ──────────────────────────────────────────────────────────
using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("doctors")]
    public class Doctor : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("profile_id")]
        public string? ProfileId { get; set; }

        [Column("title")]
        public string Title { get; set; } = "Dr.";

        [Column("specialties")]
        public string[] Specialties { get; set; } = Array.Empty<string>();

        [Column("bio")]
        public string? Bio { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // ── Nested join — populated by .Select("*, profiles(*)") ─────────────
        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public Profile? Profile { get; set; }

        // ── Availability join ─────────────────────────────────────────────────────
        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public List<StaffAvailability>? Availability { get; set; }
    }

    // ── StaffAvailability model (unified) ───────────────────────────────────────
    [Table("staff_availability")]
    public class StaffAvailability : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("staff_id")]
        public string StaffId { get; set; } = string.Empty;

        [Column("staff_type")]
        public string StaffType { get; set; } = string.Empty;

        // 0 = Sunday … 6 = Saturday
        [Column("day_of_week")]
        public int DayOfWeek { get; set; }

        [Column("start_time")]
        public string StartTime { get; set; } = string.Empty;

        [Column("end_time")]
        public string EndTime { get; set; } = string.Empty;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public string DayAbbr => DayOfWeek switch
        {
            0 => "Sun", 1 => "Mon", 2 => "Tue", 3 => "Wed",
            4 => "Thu", 5 => "Fri", 6 => "Sat", _ => "?"
        };
    }
}