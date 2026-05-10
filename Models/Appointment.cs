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

        [Column("booker_id")]
        public string? BookerId { get; set; }

        [Reference(typeof(Profile), foreignKey: "appointments_patient_id_fkey")]
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Profile? PatientProfile { get; set; }

        [Reference(typeof(Profile), foreignKey: "appointments_booker_id_fkey")]
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public Profile? BookerProfile { get; set; }

        private string? _patientFirstName;
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientFirstName 
        { 
            get => PatientProfile?.FirstName ?? _patientFirstName ?? "Unknown"; 
            set { _patientFirstName = value; if (PatientProfile != null) PatientProfile.FirstName = value; } 
        }

        private string? _patientLastName;
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientLastName 
        { 
            get => PatientProfile?.LastName ?? _patientLastName ?? "Patient"; 
            set { _patientLastName = value; if (PatientProfile != null) PatientProfile.LastName = value; } 
        }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientName => $"{PatientFirstName} {PatientLastName}".Trim();

        private string? _patientEmail;
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientEmail 
        { 
            get => PatientProfile?.Email ?? _patientEmail ?? string.Empty; 
            set { _patientEmail = value; if (PatientProfile != null) PatientProfile.Email = value; } 
        }

        private string? _patientPhone;
        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string PatientPhone 
        { 
            get => PatientProfile?.PhoneNumber ?? _patientPhone ?? string.Empty; 
            set { _patientPhone = value; if (PatientProfile != null) PatientProfile.PhoneNumber = value; } 
        }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public bool IsForOther 
        { 
            get => _isForOther || (!string.IsNullOrEmpty(BookerId) && !string.IsNullOrEmpty(PatientId) && BookerId != PatientId); 
            set => _isForOther = value; 
        }
        private bool _isForOther;

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public bool IsGuest { get; set; }

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public string? PatientSex 
        { 
            get => PatientProfile?.Sex ?? _patientSex; 
            set { _patientSex = value; if (PatientProfile != null) PatientProfile.Sex = value; } 
        }
        private string? _patientSex;

        [System.Text.Json.Serialization.JsonIgnore]
        [Newtonsoft.Json.JsonIgnore]
        public DateTime? PatientDob 
        { 
            get => PatientProfile?.DateOfBirth ?? _patientDob; 
            set { _patientDob = value; if (PatientProfile != null) PatientProfile.DateOfBirth = value; } 
        }
        private DateTime? _patientDob;

        public string? OtherFirstName { get; set; }
        public string? OtherLastName { get; set; }
        public string? OtherEmail { get; set; }
        public string? OtherPhone { get; set; }
        public string? OtherSex { get; set; }
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

        [Column("soft_lock_until")]
        public DateTime? SoftLockUntil { get; set; }

        // ── Navigation properties — populated only by direct HTTP joins ────────
        // NOT mapped as [Column] — these come from embedded PostgREST selects.
        // Use both JsonProperty and JsonPropertyName so both Newtonsoft and STJ
        // can deserialize them from the HTTP response.
        [Reference(typeof(Doctor))]
        public Doctor? Doctor { get; set; }

    }
}