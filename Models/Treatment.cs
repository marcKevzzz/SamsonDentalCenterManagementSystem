using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    public class XrayImage
    {
        [System.Text.Json.Serialization.JsonPropertyName("url")]
        public string? Url { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("type")]
        public string? Type { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

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

        [Column("tooth_data")]
        public string? ToothData { get; set; }

        [Column("xray_data")]
        public string? XrayData { get; set; }

        [Column("xray_url")]
        public string? XrayUrl { get; set; }

        [Column("xray_type")]
        public string? XrayType { get; set; }

        [Column("xray_notes")]
        public string? XrayNotes { get; set; }

        [Column("xray_images")]
        public object? XrayImagesRaw { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public List<XrayImage> XrayImages
        {
            get
            {
                if (XrayImagesRaw == null) return new();
                if (XrayImagesRaw is List<XrayImage> list) return list;
                var json = XrayImagesRaw.ToString();
                if (string.IsNullOrWhiteSpace(json) || json == "[]") return new();
                try
                {
                    return System.Text.Json.JsonSerializer.Deserialize<List<XrayImage>>(json,
                        new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                }
                catch { return new(); }
            }
        }
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

        [Newtonsoft.Json.JsonProperty("invoice")]
        [System.Text.Json.Serialization.JsonPropertyName("invoice")]
        public Invoice? Invoice { get; set; }
    }
}
