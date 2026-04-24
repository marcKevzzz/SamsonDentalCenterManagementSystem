using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("invoices")]
    public class Invoice : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("appointment_id")]
        public string? AppointmentId { get; set; }

        [Column("patient_id")]
        public string? PatientId { get; set; }

        [Column("doctor_id")]
        public string? DoctorId { get; set; }

        [Column("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("discount_amount")]
        public decimal DiscountAmount { get; set; }

        [Column("final_amount")]
        public decimal FinalAmount { get; set; }

        [Column("status")]
        public string Status { get; set; } = "pending"; // pending, paid, cancelled

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ── Relations ────────────────────────────────────────────────────────
        [Reference(typeof(Appointment))]
        public Appointment? Appointment { get; set; }

        [Reference(typeof(Profile))]
        public Profile? Patient { get; set; }

        [Reference(typeof(Doctor))]
        public Doctor? Doctor { get; set; }

        [JsonProperty("invoice_items")]
        public List<InvoiceItem>? Items { get; set; }
    }

    [Table("invoice_items")]
    public class InvoiceItem : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("invoice_id")]
        public string? InvoiceId { get; set; }

        [Column("service_id")]
        public string? ServiceId { get; set; }

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("unit_price")]
        public decimal UnitPrice { get; set; }

        [Column("quantity")]
        public int Quantity { get; set; } = 1;

        [Column("total_price")]
        public decimal TotalPrice { get; set; }
    }
}
