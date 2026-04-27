using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("reviews")]
    public class Review : BaseModel
    {
        [PrimaryKey("id", false)]
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [Column("author_name")]
        [JsonPropertyName("author_name")]
        public string AuthorName { get; set; } = "";

        [Column("author_avatar")]
        [JsonPropertyName("author_avatar")]
        public string? AuthorAvatar { get; set; }

        [Column("rating")]
        [JsonPropertyName("rating")]
        public int Rating { get; set; } = 5;

        [Column("review_text")]
        [JsonPropertyName("review_text")]
        public string ReviewText { get; set; } = "";

        [Column("platform")]
        [JsonPropertyName("platform")]
        public string Platform { get; set; } = "Manual";

        [Column("platform_review_id")]
        [JsonPropertyName("platform_review_id")]
        public string? PlatformReviewId { get; set; }

        [Column("external_link")]
        [JsonPropertyName("external_link")]
        public string? ExternalLink { get; set; }

        [Column("is_visible")]
        [JsonPropertyName("is_visible")]
        public bool IsVisible { get; set; } = false;

        [Column("review_date")]
        [JsonPropertyName("review_date")]
        public DateTime? ReviewDate { get; set; }

        [Column("created_at")]
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
