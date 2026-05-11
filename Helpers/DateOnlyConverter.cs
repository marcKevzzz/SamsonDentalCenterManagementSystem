using Newtonsoft.Json;
using System;
using System.Globalization;

namespace SamsonDentalCenterManagementSystem.Helpers
{
    public class DateOnlyConverter : JsonConverter
    {
        private const string DateFormat = "yyyy-MM-dd";

        public override bool CanConvert(Type objectType)
        {
            return objectType == typeof(DateTime) || objectType == typeof(DateTime?);
        }

        public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
        {
            if (value is DateTime dt)
            {
                writer.WriteValue(dt.ToString(DateFormat));
            }
            else
            {
                writer.WriteNull();
            }
        }

        public override object? ReadJson(JsonReader reader, Type objectType, object? existingValue, JsonSerializer serializer)
        {
            if (reader.Value == null) return null;

            var s = reader.Value.ToString();
            if (string.IsNullOrWhiteSpace(s)) return null;

            // Try exact format first to avoid timezone shifts
            if (DateTime.TryParseExact(s, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
            }

            // Fallback to standard parsing but strip time
            if (DateTime.TryParse(s, out var dt2))
            {
                return DateTime.SpecifyKind(dt2.Date, DateTimeKind.Utc);
            }

            return null;
        }
    }
}
