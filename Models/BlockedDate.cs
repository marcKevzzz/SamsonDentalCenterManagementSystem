using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("blocked_dates")]
    public class BlockedDate : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("blocked_date")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime Date { get; set; }

        [Column("reason")]
        public string? Reason { get; set; }

        [Column("blocked_by")]
        public string? BlockedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // Navigation property (read-only, not mapped for insert)
        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public Profile? BlockedByProfile { get; set; }
    }
}
