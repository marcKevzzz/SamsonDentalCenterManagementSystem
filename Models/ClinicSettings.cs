using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("clinic_settings")]
    public class ClinicSettings : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = "00000000-0000-0000-0000-000000000001";

        [Column("clinic_name")]
        [JsonPropertyName("clinic_name")]
        [Newtonsoft.Json.JsonProperty("clinic_name")]
        public string ClinicName { get; set; } = "Samson Dental Center";

        [Column("logo_url")]
        [JsonPropertyName("logo_url")]
        public string? LogoUrl { get; set; }

        [Column("about_text")]
        [JsonPropertyName("about_text")]
        public string? AboutText { get; set; }

        [Column("location_address")]
        [JsonPropertyName("location_address")]
        public string? LocationAddress { get; set; }

        [Column("maps_url")]
        [JsonPropertyName("maps_url")]
        public string? MapsUrl { get; set; }

        [Column("contact_email")]
        [JsonPropertyName("contact_email")]
        public string? ContactEmail { get; set; }

        [Column("contact_phone")]
        [JsonPropertyName("contact_phone")]
        public string? ContactPhone { get; set; }

        [Column("landline")]
        [JsonPropertyName("landline")]
        public string? Landline { get; set; }

        [Column("facebook_url")]
        [JsonPropertyName("facebook_url")]
        public string? FacebookUrl { get; set; }

        [Column("instagram_url")]
        [JsonPropertyName("instagram_url")]
        public string? InstagramUrl { get; set; }

        [Column("clinical_hours")]
        [JsonPropertyName("clinical_hours")]
        [Newtonsoft.Json.JsonProperty("clinical_hours")]
        public List<ClinicHour> ClinicalHours { get; set; } = new();

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public object? ClinicalHoursRaw { get => ClinicalHours; set { if (value is string s) ClinicalHoursJson = s; } }

        [Column("is_automated_status")]
        [JsonPropertyName("is_automated_status")]
        [Newtonsoft.Json.JsonProperty("is_automated_status")]
        public bool IsAutomatedStatus { get; set; } = true;

        [Column("manual_status")]
        [JsonPropertyName("manual_status")]
        [Newtonsoft.Json.JsonProperty("manual_status")]
        public string ManualStatus { get; set; } = "open";

        [Column("faqs")]
        [JsonPropertyName("faqs")]
        [Newtonsoft.Json.JsonProperty("faqs")]
        public List<ClinicFaq> Faqs { get; set; } = new();

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public object? FaqsRaw { get => Faqs; set { if (value is string s) FaqsJson = s; } }

        [Column("clinic_photos")]
        [JsonPropertyName("clinic_photos")]
        [Newtonsoft.Json.JsonProperty("clinic_photos")]
        public List<string> ClinicPhotos { get; set; } = new();

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public object? ClinicPhotosRaw { get => ClinicPhotos; set { if (value is string s) ClinicPhotosJson = s; } }

        [Column("is_chatbot_enabled")]
        [JsonPropertyName("is_chatbot_enabled")]
        [Newtonsoft.Json.JsonProperty("is_chatbot_enabled")]
        public bool IsChatbotEnabled { get; set; } = true;

        [Column("chatbot_name")]
        [JsonPropertyName("chatbot_name")]
        public string ChatbotName { get; set; } = "SDC Assistant";

        [Column("chatbot_welcome_message")]
        [JsonPropertyName("chatbot_welcome_message")]
        public string ChatbotWelcomeMessage { get; set; } = "Hi there! 👋 Welcome to **Samson Dental Center**.\n\nI'm your virtual assistant — here to help with services, schedules, pricing, and anything about our clinic. What can I help you with today?";

        [Column("ceo_name")]
        [JsonPropertyName("ceo_name")]
        public string CeoName { get; set; } = "Dr. Marcus Rivera";

        [Column("admin_name")]
        [JsonPropertyName("admin_name")]
        public string AdminName { get; set; } = "Samson Admin";

        [Column("system_integrity_info")]
        [JsonPropertyName("system_integrity_info")]
        public string SystemIntegrityInfo { get; set; } = "Our system employs end-to-end encryption for patient data, HIPAA-compliant storage via Supabase, and real-time audit logging to ensure maximum security and privacy.";

        [Column("updated_at")]
        [JsonPropertyName("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ── Helpers for UI (not mapped to DB) ───────────────────────────────
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string ClinicalHoursJson
        {
            get => ClinicalHours == null ? "[]" : System.Text.Json.JsonSerializer.Serialize(ClinicalHours);
            set => ClinicalHours = string.IsNullOrWhiteSpace(value) || value.Contains("ValueKind") ? new() : System.Text.Json.JsonSerializer.Deserialize<List<ClinicHour>>(value) ?? new();
        }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string FaqsJson
        {
            get => Faqs == null ? "[]" : System.Text.Json.JsonSerializer.Serialize(Faqs);
            set => Faqs = string.IsNullOrWhiteSpace(value) || value.Contains("ValueKind") ? new() : System.Text.Json.JsonSerializer.Deserialize<List<ClinicFaq>>(value) ?? new();
        }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string ClinicPhotosJson
        {
            get => System.Text.Json.JsonSerializer.Serialize(ClinicPhotos ?? new());
            set => ClinicPhotos = string.IsNullOrWhiteSpace(value) ? new() : (System.Text.Json.JsonSerializer.Deserialize<List<string>>(value) ?? new());
        }
    }

    public class ClinicHour
    {
        [JsonPropertyName("day")]
        public string Day { get; set; } = "";
        [JsonPropertyName("open")]
        public string Open { get; set; } = "08:00";
        [JsonPropertyName("close")]
        public string Close { get; set; } = "17:00";
        [JsonPropertyName("noonStart")]
        public string? NoonStart { get; set; }
        [JsonPropertyName("noonEnd")]
        public string? NoonEnd { get; set; }
        [JsonPropertyName("closed")]
        public bool Closed { get; set; } = false;
    }

    public class ClinicFaq
    {
        [JsonPropertyName("question")]
        public string Question { get; set; } = "";
        [JsonPropertyName("answer")]
        public string Answer { get; set; } = "";
    }
}
