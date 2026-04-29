using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("activity_logs")]
    public class ActivityLog : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("profile_id")]
        public string? ProfileId { get; set; }

        [Column("action")]
        public string Action { get; set; } = string.Empty;

        [Column("details")]
        public string? Details { get; set; }

        [Column("category")]
        public string? Category { get; set; }

        [Column("link")]
        public string? Link { get; set; }

        [Column("ip_address")]
        public string? IpAddress { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Reference(typeof(Profile))]
        public Profile? Profile { get; set; }
    }
}
