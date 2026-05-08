using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System.Text.Json.Serialization;

namespace SamsonDentalCenterManagementSystem.Models
{
    [Table("chatbot_conversations")]
    public class ChatbotConversation : BaseModel
    {
        [PrimaryKey("id", false)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("session_id")]
        [JsonPropertyName("session_id")]
        public string SessionId { get; set; } = string.Empty;

        [Column("user_id")]
        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }

        [Column("message")]
        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [Column("is_bot")]
        [JsonPropertyName("is_bot")]
        public bool IsBot { get; set; }

        [Column("created_at")]
        [JsonPropertyName("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
