using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Data
{
    public static class ServiceRepository
    {
        public static List<Service> Services =
        [
            new Service
            {
                Slug = "dental-checkup",
                Title = "Dental Checkup",
                Category = "General Dentistry",
                Description = "Prevention starts with a thorough look.",
                Duration = "45–60 min",
                Recovery = "None required",
                Price = "From ₱500",
                HeroImage = "https://images.unsplash.com/photo-1588776814546-1ffedba25ce3?w=1200&q=80",

                Overview = "A comprehensive dental checkup is the cornerstone of a healthy smile. Dentists examine teeth and gums to detect early problems.",

                Benefits = new()
                {
                    "Early detection of cavities",
                    "Gum health assessment",
                    "Oral cancer screening",
                    "X-ray analysis",
                    "Personalized oral care plan"
                }
            },

            new Service
            {
                Slug = "teeth-cleaning",
                Title = "Teeth Cleaning",
                Category = "General Dentistry",
                Description = "Professional cleaning for healthier teeth.",
                Duration = "30–45 min",
                Recovery = "None",
                Price = "From ₱800",
                HeroImage = "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1200&q=80",

                Overview = "Professional teeth cleaning removes plaque and tartar buildup that brushing alone cannot remove.",

                Benefits = new()
                {
                    "Removes plaque and tartar",
                    "Prevents gum disease",
                    "Fresh breath",
                    "Brighter smile"
                }
            }
        ];

        public static Service GetService(string slug)
        {
            return Services.FirstOrDefault(s => s.Slug == slug);
        }
    }
}