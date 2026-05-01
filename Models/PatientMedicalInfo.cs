using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("patient_medical_info")]
    public class PatientMedicalInfo : BaseModel
    {
        [PrimaryKey("patient_id", false)]
        public string PatientId { get; set; } = string.Empty;

        [Column("blood_type")]
        public string? BloodType { get; set; }

        [Column("height")]
        public decimal? Height { get; set; }

        [Column("weight")]
        public decimal? Weight { get; set; }

        [Column("is_smoker")]
        public bool IsSmoker { get; set; }

        [Column("allergies")]
        public string? AllergiesJson { get; set; }

        [Column("medications")]
        public string? MedicationsJson { get; set; }

        [Column("history")]
        public string? HistoryJson { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
