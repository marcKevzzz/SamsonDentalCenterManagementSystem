// using Supabase.Postgrest.Attributes;
// using Supabase.Postgrest.Models;
// using System.Text.Json;

// namespace SamsonDentalCenterManagementSystem.Models
// {
//     public class ServiceFaq
//     {
//         public string Q { get; set; } = string.Empty;
//         public string A { get; set; } = string.Empty;
//     }

//     public class ServiceStep
//     {
//         public string? Title { get; set; }
//         public string? Body  { get; set; }
//     }

//     [Table("dental_services")]
//     public class DentalService : BaseModel
//     {
//         [PrimaryKey("id", false)]
//         public string Id { get; set; } = Guid.NewGuid().ToString();

//         [Column("slug")]
//         public string Slug { get; set; } = string.Empty;

//         [Column("category")]
//         public string Category { get; set; } = string.Empty;

//         [Column("name")]
//         public string Name { get; set; } = string.Empty;

//         [Column("tagline")]
//         public string Tagline { get; set; } = string.Empty;

//         [Column("hero")]
//         public string Hero { get; set; } = string.Empty;

//         [Column("icon")]
//         public string? Icon { get; set; }

//         [Column("summary")]
//         public string? Summary { get; set; }

//         [Column("duration")]
//         public string? Duration { get; set; }

//         [Column("recovery")]
//         public string? Recovery { get; set; }

//         [Column("price")]
//         public string Price { get; set; } = string.Empty;

//         [Column("benefits")]
//         public object? BenefitsRaw { get; set; }

//         [Column("steps")]
//         public string StepsJson { get; set; } = "[]";

//         [Column("faqs")]
//         public string FaqsJson { get; set; } = "[]";

//         [Column("is_active")]
//         public bool IsActive { get; set; } = true;

//         [Column("created_at")]
//         public DateTime CreatedAt { get; set; }

//         // ── Deserialized helpers (not mapped to DB) ───────────────────────────
//         public List<string> Benefits =>
//             string.IsNullOrWhiteSpace(BenefitsJson)
//                 ? new()
//                 : JsonSerializer.Deserialize<List<string>>(BenefitsJson) ?? new();

//         public List<ServiceStep> Steps =>
//             string.IsNullOrWhiteSpace(StepsJson)
//                 ? new()
//                 : JsonSerializer.Deserialize<List<ServiceStep>>(StepsJson) ?? new();

//         public List<ServiceFaq> Faqs =>
//             string.IsNullOrWhiteSpace(FaqsJson)
//                 ? new()
//                 : JsonSerializer.Deserialize<List<ServiceFaq>>(FaqsJson) ?? new();
//     }
// }

using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{

    public class ServiceFaq
    {
        public string Q { get; set; } = string.Empty;
        public string A { get; set; } = string.Empty;
    }

    public class ServiceStep
    {
        public string? Title { get; set; }
        public string? Body  { get; set; }
    }
    [Table("dental_services")]
    public class DentalService : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("slug")]
        public string Slug { get; set; } = string.Empty;

        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("tagline")]
        public string Tagline { get; set; } = string.Empty;

        [Column("hero")]
        public string Hero { get; set; } = string.Empty;

        [Column("icon")]
        public string? Icon { get; set; }

        [Column("summary")]
        public string? Summary { get; set; }

        [Column("duration")]
        public string? Duration { get; set; }

        [Column("recovery")]
        public string? Recovery { get; set; }

        [Column("price")]
        public decimal Price { get; set; }

        // ← Store as object to let the Supabase client handle JSONB natively
        [Column("benefits")]
        public object? BenefitsRaw { get; set; }

        [Column("steps")]
        public object? StepsRaw { get; set; }

        [Column("faqs")]
        public object? FaqsRaw { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        // ── Safe deserialized accessors ───────────────────────────────────────
       // In DentalService.cs — add both JsonIgnore attributes to computed properties
[System.Text.Json.Serialization.JsonIgnore]
[Newtonsoft.Json.JsonIgnore]
public List<string> Benefits => DeserializeList<string>(BenefitsRaw);

[System.Text.Json.Serialization.JsonIgnore]
[Newtonsoft.Json.JsonIgnore]
public List<ServiceStep> Steps => DeserializeList<ServiceStep>(StepsRaw);

[System.Text.Json.Serialization.JsonIgnore]
[Newtonsoft.Json.JsonIgnore]
public List<ServiceFaq> Faqs => DeserializeList<ServiceFaq>(FaqsRaw);

        private static List<T> DeserializeList<T>(object? raw)
        {
            if (raw == null) return new();

            // Already a List<T> (Supabase deserialized it)
            if (raw is List<T> list) return list;

            // Raw JSON string
            var json = raw.ToString();
            if (string.IsNullOrWhiteSpace(json) || json == "[]") return new();

            try
            {
                return JsonSerializer.Deserialize<List<T>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                    ?? new();
            }
            catch
            {
                return new();
            }
        }
    }
}