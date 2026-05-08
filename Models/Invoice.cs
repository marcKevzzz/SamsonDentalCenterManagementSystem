using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("invoices")]
    public class Invoice : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("appointment_id")]
        [JsonPropertyName("appointment_id")]
        public string? AppointmentId { get; set; }

        [Column("patient_id")]
        [JsonPropertyName("patient_id")]
        public string? PatientId { get; set; }

        [Column("doctor_id")]
        [JsonPropertyName("doctor_id")]
        public string? DoctorId { get; set; }

        [Column("total_amount")]
        [JsonPropertyName("total_amount")]
        public decimal TotalAmount { get; set; }

        [Column("discount_amount")]
        [JsonPropertyName("discount_amount")]
        public decimal DiscountAmount { get; set; }

        [Column("final_amount")]
        [JsonPropertyName("final_amount")]
        public decimal FinalAmount { get; set; }

        [Column("status")]
        [JsonPropertyName("status")]
        public string Status { get; set; } = "pending";

        [Column("notes")]
        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ── Relations — use STJ attributes so direct HTTP deserialization works ──

        // Matches the "patient:profiles!patient_id" alias in the query
        [JsonPropertyName("patient")]
        [JsonProperty("patient")]
        public Profile? Patient { get; set; }

        // Matches the "doctor:doctors!doctor_id" alias in the query  
        [JsonPropertyName("doctor")]
        [JsonProperty("doctor")]
        public Doctor? Doctor { get; set; }

        // Matches "invoice_items(*)" — remove [JsonIgnore], it was killing this
        [JsonPropertyName("invoice_items")]
        [JsonProperty("invoice_items")]
        public List<InvoiceItem>? Items { get; set; }
        
        [JsonPropertyName("payments")]
        [JsonProperty("payments")]
        public List<Payment>? Payments { get; set; }
    }

    [Table("invoice_items")]
    public class InvoiceItem : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("invoice_id")]
        [JsonPropertyName("invoice_id")]
        public string? InvoiceId { get; set; }

        [Column("service_id")]
        [JsonPropertyName("service_id")]
        public string? ServiceId { get; set; }

        [Column("description")]
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [Column("unit_price")]
        [JsonPropertyName("unit_price")]
        public decimal UnitPrice { get; set; }

        [Column("quantity")]
        [JsonPropertyName("quantity")]
        public int Quantity { get; set; } = 1;

        [Column("total_price")]
        [JsonPropertyName("total_price")]
        public decimal TotalPrice { get; set; }
    }
}
