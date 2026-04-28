using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("inquiries")]
    public class Inquiry : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = "";

        [Column("patient_id")]
        [JsonPropertyName("patient_id")]
        public string? PatientId { get; set; }

        [Column("subject")]
        public string Subject { get; set; } = "";

        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("guest_email")]
        [JsonPropertyName("guest_email")]
        public string? GuestEmail { get; set; }

        [Column("guest_first_name")]
        [JsonPropertyName("guest_first_name")]
        public string? GuestFirstName { get; set; }

        [Column("guest_last_name")]
        [JsonPropertyName("guest_last_name")]
        public string? GuestLastName { get; set; }

        [Column("guest_phone")]
        [JsonPropertyName("guest_phone")]
        public string? GuestPhone { get; set; }

        [Reference(typeof(Profile))]
        [JsonPropertyName("patient")]
        public Profile? Patient { get; set; }

        public List<InquiryMessage> Messages { get; set; } = new();
    }

    [Table("inquiry_messages")]
    public class InquiryMessage : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = "";

        [Column("inquiry_id")]
        public string InquiryId { get; set; } = "";

        [Column("sender_id")]
        public string? SenderId { get; set; }

        [Column("message")]
        public string Message { get; set; } = "";

        [Column("is_from_staff")]
        [JsonPropertyName("is_from_staff")]
        public bool IsFromStaff { get; set; } = false;

        [Column("created_at")]
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Reference(typeof(Profile))]
        [JsonPropertyName("sender")]
        public Profile? Sender { get; set; }
    }
    
}
