// ── Models/Appointment.cs ─────────────────────────────────────────────────────
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using Newtonsoft.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("appointments")]
    public class Appointment : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("patient_id")]
        public string? PatientId { get; set; }

        [Column("patient_first_name")]
        public string PatientFirstName { get; set; } = string.Empty;

        [Column("patient_last_name")]
        public string PatientLastName { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientName => $"{PatientFirstName} {PatientLastName}".Trim();

        [Column("patient_email")]
        public string PatientEmail { get; set; } = string.Empty;

        [Column("patient_phone")]
        public string PatientPhone { get; set; } = string.Empty;

        [Column("patient_sex")]
        public string? PatientSex { get; set; }

        [Column("patient_dob")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime? PatientDob { get; set; }

        [Column("is_guest")]
        public bool IsGuest { get; set; }

        [Column("is_for_other")]
        public bool IsForOther { get; set; }

        [Column("other_first_name")]
        public string? OtherFirstName { get; set; }

        [Column("other_last_name")]
        public string? OtherLastName { get; set; }

        [Column("other_email")]
        public string? OtherEmail { get; set; }

        [Column("other_phone")]
        public string? OtherPhone { get; set; }

        [Column("other_sex")]
        public string? OtherSex { get; set; }

        [Column("other_dob")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime? OtherDob { get; set; }

        [Column("service_id")]
        public string ServiceId { get; set; } = string.Empty;

        [Reference(typeof(DentalService))]
        public DentalService? Service { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string ServiceName => Service?.Name ?? string.Empty;
    

        [Column("doctor_id")]
        public string? DoctorId { get; set; }

        [Column("appointment_date")]
        [Newtonsoft.Json.JsonConverter(typeof(SamsonDentalCenterManagementSystem.Helpers.DateOnlyConverter))]
        public DateTime AppointmentDate { get; set; }

        [Column("appointment_time")]
        public string AppointmentTime { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public TimeSpan AppointmentTimeAsTimeSpan => DateTime.TryParse(AppointmentTime, out var dt) ? dt.TimeOfDay : TimeSpan.Zero;

        [Column("duration_minutes")]
        public int DurationMinutes { get; set; } = 60;

        [Column("status")]
        public string Status { get; set; } = "pending";

        [Column("email_status")]
        public string EmailStatus { get; set; } = "pending";

        [Column("is_waitlist")]
        public bool IsWaitlist { get; set; }

        [Column("waitlist_position")]
        public int? WaitlistPosition { get; set; }

        [Column("confirmation_token")]
        public string? ConfirmationToken { get; set; }

        [Column("confirmed_at")]
        public DateTime? ConfirmedAt { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("source")]
        public string Source { get; set; } = "online";

        [Column("reminder_sent")]
        public bool ReminderSent { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // ── Navigation properties — populated only by direct HTTP joins ────────
        // NOT mapped as [Column] — these come from embedded PostgREST selects.
        // Use both JsonProperty and JsonPropertyName so both Newtonsoft and STJ
        // can deserialize them from the HTTP response.
        [Reference(typeof(Doctor))]
        public Doctor? Doctor { get; set; }

        [Reference(typeof(Profile))]
        public Profile? PatientProfile { get; set; }
    }
}