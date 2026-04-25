using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("treatments")]
    public class Treatment : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("invoice_id")]
        public string InvoiceId { get; set; } = string.Empty;

        [Column("service_id")]
        public string? ServiceId { get; set; }

        [Column("service_name")]
        public string ServiceName { get; set; } = string.Empty;

        [Column("tooth_numbers")]
        public string? ToothNumbers { get; set; }

        [Column("procedure_details")]
        public string? ProcedureDetails { get; set; }

        [Column("diagnosis")]
        public string? Diagnosis { get; set; }

        [Column("status")]
        public string Status { get; set; } = "completed"; // completed, in-progress, planned

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
