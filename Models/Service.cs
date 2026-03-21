namespace SamsonDentalCenterManagementSystem.Models
{
    public class ServiceFaq
    {
        public required string Q { get; set; }
        public required string A { get; set; }
    }

    public class ServiceStep
    {
        public string? Title { get; set; }
        public  string? Body { get; set; }
    }

    public class DentalService
    {
        public required string Slug { get; set; }
        public required string Category { get; set; }
        public required string Name { get; set; }
        public required string Tagline { get; set; }
        public required string Hero { get; set; }
        public string? Icon { get; set; }
        public string? Summary { get; set; }
        public string? Duration { get; set; }
        public string? Recovery { get; set; }
        public required string Price { get; set; }

        public List<string> Benefits { get; set; } = new();
        public List<ServiceStep> Steps { get; set; } = new();
        public List<ServiceFaq> Faqs { get; set; } = new();
    }
}