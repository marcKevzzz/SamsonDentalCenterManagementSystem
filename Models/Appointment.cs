// ── Models/Appointment.cs ─────────────────────────────────────────────────────
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("appointments")]
    public class Appointment : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("patient_id")]
        public string? PatientId { get; set; }

        [Column("patient_name")]
        public string PatientName { get; set; } = string.Empty;

        [Column("patient_email")]
        public string PatientEmail { get; set; } = string.Empty;

        [Column("patient_phone")]
        public string PatientPhone { get; set; } = string.Empty;

        [Column("patient_sex")]
        public string? PatientSex { get; set; }

        [Column("patient_dob")]
        public DateTime? PatientDob { get; set; }


        [Column("is_guest")]
        public bool IsGuest { get; set; }

        [Column("is_for_other")]
        public bool IsForOther { get; set; }

        [Column("other_name")]
        public string? OtherName { get; set; }

        [Column("other_sex")]
        public string? OtherSex { get; set; }

        [Column("other_dob")]
        public DateTime? OtherDob { get; set; }

        [Column("service_id")]
        public string ServiceId { get; set; } = string.Empty;

        [Column("service_name")]
        public string ServiceName { get; set; } = string.Empty;

        [Column("doctor_id")]
        public string? DoctorId { get; set; }

        [Column("doctor_name")]
        public string? DoctorName { get; set; }

        [Column("appointment_date")]
        public DateTime AppointmentDate { get; set; }

        [Column("appointment_time")]
        public string AppointmentTime { get; set; } = string.Empty;

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

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    [Table("doctors")]
    public class Doctor : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = string.Empty;

        [Column("doctor_name")]
        public string DoctorName { get; set; } = string.Empty;

        [Column("title")]
        public string Title { get; set; } = "Dr.";

        [Column("specialties")]
        public string[] Specialties { get; set; } = Array.Empty<string>();

        [Column("bio")]
        public string? Bio { get; set; }

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}