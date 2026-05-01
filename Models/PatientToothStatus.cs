using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("patient_tooth_status")]
    public class PatientToothStatus : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("patient_id")]
        public string PatientId { get; set; } = string.Empty;

        [Column("tooth_number")]
        public int ToothNumber { get; set; }

        [Column("status")]
        public string Status { get; set; } = "healthy";

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
