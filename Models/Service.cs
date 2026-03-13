namespace SamsonDentalCenterManagementSystem.Models
{
    public class Service
    {
        public required string Slug { get; set; }
        public required string Title { get; set; }
        public required string Category { get; set; }
        public required string Description { get; set; }
        public required string Duration { get; set; }
        public required string Recovery { get; set; }
        public required string Price { get; set; }
        public required string Overview { get; set; }
        public required List<string> Benefits { get; set; }
        public required string HeroImage { get; set; }
    }
}