// ViewModels/AppointmentViewModel.cs
// ─────────────────────────────────────────────────────────
// Single view model passed across all appointment steps.
// Stored in TempData (serialized as JSON) between requests.

using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace SamsonDental.ViewModels
{
    public class AppointmentViewModel
    {
        // ── Current step ──────────────────────────────────
        public int CurrentStep { get; set; } = 1;
        public bool IsWaitlist { get; set; } = false;

        // ── Step 1: Service ───────────────────────────────
        public string? SelectedServiceSlug     { get; set; }
        public string? SelectedServiceName     { get; set; }
        public string? SelectedServiceCategory { get; set; }
        public string? SelectedServiceTagline  { get; set; }
        public string? SelectedServicePrice    { get; set; }
        public string? SelectedServiceDuration { get; set; }
        public string? SelectedServiceRecovery { get; set; }
        public string? SelectedServiceSummary  { get; set; }
        public List<string> SelectedServiceBenefits { get; set; } = new();

        // ── Step 2: Schedule ──────────────────────────────
        public string? SelectedDate { get; set; }   // "YYYY-MM-DD"
        public string? SelectedTime { get; set; }   // "9:00 AM"

        // ── Step 3: Patient details ───────────────────────
        [Required(ErrorMessage = "First name is required.")]
        [Display(Name = "First Name")]
        public string FirstName { get; set; } = "";

        [Required(ErrorMessage = "Last name is required.")]
        [Display(Name = "Last Name")]
        public string LastName { get; set; } = "";

        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [Display(Name = "Email Address")]
        public string Email { get; set; } = "";

        [Required(ErrorMessage = "Phone number is required.")]
        [Display(Name = "Phone Number")]
        public string Phone { get; set; } = "";

      

        [Display(Name = "Additional Notes")]
        public string? Notes { get; set; }

        public bool ConsentGiven { get; set; } = false;

        // ── Step 4: Confirmation ──────────────────────────
        public string? ReferenceNumber { get; set; }

        // ── Validation helper ─────────────────────────────
        public bool HasServiceSelected => !string.IsNullOrEmpty(SelectedServiceSlug);
        public bool HasScheduleSelected => !string.IsNullOrEmpty(SelectedDate) &&
                                           (!string.IsNullOrEmpty(SelectedTime) || IsWaitlist);
    }

    // ── Static service data (mirrors services.js) ─────────
    public class ServiceItem
    {
        public string Slug     { get; set; } = "";
        public string Category { get; set; } = "";
        public string Name     { get; set; } = "";
        public string Tagline  { get; set; } = "";
        public string Summary  { get; set; } = "";
        public string Duration { get; set; } = "";
        public string Recovery { get; set; } = "";
        public string Price    { get; set; } = "";
        public List<string> Benefits { get; set; } = new();
    }

    public static class ServicesData
    {
        public static readonly List<string> Categories = new()
        {
            "General Dentistry", "Cosmetic", "Specialized"
        };

        public static readonly List<ServiceItem> All = new()
        {
            // General Dentistry
            new() { Slug="dental-checkup",    Category="General Dentistry", Name="Dental Checkup",      Tagline="Prevention starts with a thorough look.",        Price="From ₱500",    Duration="45–60 min",                  Recovery="None required",                   Summary="A comprehensive dental checkup is the cornerstone of a healthy smile. Our experienced dentists perform a full oral examination to detect early signs of decay, gum disease, and other concerns before they become serious problems.", Benefits=new(){"Early detection of cavities and decay","Gum health assessment","Oral cancer screening","X-ray review and analysis","Personalized oral care plan"} },
            new() { Slug="teeth-cleaning",    Category="General Dentistry", Name="Teeth Cleaning",      Tagline="Professional-grade clean you can feel.",         Price="From ₱800",    Duration="30–60 min",                  Recovery="None required",                   Summary="Professional teeth cleaning (prophylaxis) goes beyond what brushing and flossing can achieve at home. Our dental hygienists remove hardened plaque and surface stains, leaving your teeth cleaner, healthier, and brighter.", Benefits=new(){"Removal of tartar and plaque buildup","Polishing to remove surface stains","Freshens breath significantly","Reduces risk of gum disease","Smooth enamel surface finish"} },
            new() { Slug="tooth-filling",     Category="General Dentistry", Name="Tooth Filling",       Tagline="Restore, protect, and get back to normal.",       Price="From ₱1,200", Duration="30–60 min",                  Recovery="None — return to normal same day",Summary="Tooth fillings restore teeth damaged by cavities or minor fractures. We offer tooth-colored composite fillings that blend seamlessly with your natural teeth, giving you a strong and natural-looking result.",              Benefits=new(){"Stops cavity progression immediately","Tooth-colored composite options","Restores full bite function","Completed in a single visit","Long-lasting and durable"} },
            new() { Slug="fluoride-treatment",Category="General Dentistry", Name="Fluoride Treatment",  Tagline="Strengthen enamel. Prevent cavities.",            Price="From ₱400",    Duration="10–15 min",                  Recovery="Avoid eating/drinking for 30 min",Summary="Fluoride treatment is a fast, painless preventive procedure that strengthens tooth enamel and helps prevent cavities. Particularly beneficial for children and cavity-prone adults.",                                             Benefits=new(){"Strengthens and remineralizes enamel","Reduces cavity risk by up to 40%","Painless and quick application","Ideal for children and adults","Can reverse early-stage decay"} },
            // Cosmetic
            new() { Slug="teeth-whitening",   Category="Cosmetic",           Name="Teeth Whitening",     Tagline="Brighten your smile in just one visit.",          Price="From ₱3,500", Duration="60–90 min",                  Recovery="Avoid staining foods for 48 hrs", Summary="Our professional in-office teeth whitening treatment delivers results dramatically more effective than over-the-counter products. Using advanced whitening agents and LED activation, we can lighten your teeth by several shades.", Benefits=new(){"Up to 8 shades lighter in one visit","Safe, dentist-supervised procedure","Long-lasting results (1–3 years)","Even whitening across all teeth","Take-home kit option available"} },
            new() { Slug="dental-veneers",    Category="Cosmetic",           Name="Dental Veneers",      Tagline="A flawless smile, custom-crafted for you.",       Price="From ₱8,000/tooth",Duration="2–3 visits over 2 weeks",  Recovery="Minimal — normal diet in 24 hrs", Summary="Dental veneers are ultra-thin porcelain shells bonded to the front surface of teeth to transform their color, shape, size, and alignment. They're the preferred solution for patients seeking a dramatic smile transformation.", Benefits=new(){"Covers chips, cracks, and stains","Natural-looking porcelain finish","Resistant to future staining","Minimally invasive preparation","Transforms smile in 2–3 visits"} },
            new() { Slug="smile-makeover",    Category="Cosmetic",           Name="Smile Makeover",      Tagline="A comprehensive transformation designed around you.",Price="From ₱15,000",Duration="Varies (weeks to months)",   Recovery="Depends on procedures selected",  Summary="A smile makeover is a personalized combination of cosmetic and restorative procedures designed to completely transform your smile. We create a custom plan that achieves your ideal smile.",                                     Benefits=new(){"Fully customized treatment plan","Combines multiple procedures","Digital smile preview before treatment","Staged payment options available","Dramatic, life-changing results"} },
            new() { Slug="composite-bonding", Category="Cosmetic",           Name="Composite Bonding",   Tagline="Fix imperfections in a single appointment.",      Price="From ₱2,500/tooth",Duration="30–60 min per tooth",    Recovery="None — immediate results",        Summary="Composite bonding uses tooth-colored resin to repair chipped, cracked, gapped, or discolored teeth. It's one of the most affordable and minimally invasive cosmetic treatments available.",                                   Benefits=new(){"No removal of tooth structure","Completed in one visit","Natural tooth-color match","Repairs chips, gaps, and cracks","Reversible and affordable"} },
            // Specialized
            new() { Slug="root-canal",        Category="Specialized",        Name="Root Canal",          Tagline="Save your tooth. Eliminate the pain.",            Price="From ₱5,000", Duration="60–90 min (1–2 visits)",     Recovery="Mild soreness for 2–3 days",      Summary="Root canal treatment removes infected or damaged pulp from inside a tooth, eliminating pain and saving the natural tooth from extraction. With modern techniques and anesthesia, the procedure is far more comfortable than its reputation suggests.", Benefits=new(){"Eliminates tooth pain and infection","Saves the natural tooth","Prevents spread of infection","Restores full chewing function","Virtually painless with anesthesia"} },
            new() { Slug="braces-and-aligners",Category="Specialized",       Name="Braces & Aligners",   Tagline="Straighten your smile on your terms.",           Price="From ₱25,000", Duration="12–24 months typical",        Recovery="Adjustment soreness 1–3 days",    Summary="We offer both traditional metal braces and clear aligner systems (including Invisalign) to straighten teeth and correct bite issues. Our orthodontic team recommends the best option based on your specific case.", Benefits=new(){"Corrects crowding, gaps, and bite issues","Clear aligner options available","Suitable for teens and adults","Regular progress monitoring","Post-treatment retainer included"} },
            new() { Slug="dental-implants",   Category="Specialized",        Name="Dental Implants",     Tagline="The permanent solution for missing teeth.",       Price="From ₱35,000/implant",Duration="3–6 months",          Recovery="3–5 days post-surgery tenderness",Summary="Dental implants are titanium posts surgically placed into the jawbone to serve as artificial tooth roots. Topped with a custom crown, they look, feel, and function exactly like natural teeth.",                             Benefits=new(){"Permanent, lifetime solution","Looks and feels like natural teeth","Preserves jawbone density","No impact on adjacent teeth","Easy maintenance — brush & floss normally"} },
            new() { Slug="oral-surgery",      Category="Specialized",        Name="Oral Surgery",        Tagline="Expert surgical care in a comfortable setting.", Price="From ₱2,500", Duration="30–90 min depending on procedure",Recovery="2–5 days (varies by procedure)", Summary="Our oral surgery services cover tooth extractions (including wisdom teeth), surgical treatment of jaw conditions, bone grafting, and more. Our chief oral surgeon brings 16+ years of experience.",                        Benefits=new(){"Wisdom tooth extractions","Complex tooth removal","Bone grafting for implants","Cyst and lesion removal","IV sedation option available"} },
        };

        public static ServiceItem? FindBySlug(string slug) =>
            All.FirstOrDefault(s => s.Slug == slug);

        public static List<ServiceItem> ByCategory(string category) =>
            All.Where(s => s.Category == category).ToList();

        // Simulated booked slots — in a real app this comes from your DB
        public static readonly Dictionary<string, List<string>> BookedSlots = new()
        {
            { DateTime.Today.AddDays(1).ToString("yyyy-MM-dd"), new() { "9:00 AM","10:00 AM","2:00 PM" } },
            { DateTime.Today.AddDays(2).ToString("yyyy-MM-dd"), new() { "9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM" } }, // fully booked
            { DateTime.Today.AddDays(5).ToString("yyyy-MM-dd"), new() { "11:00 AM","3:00 PM" } },
        };

        public static readonly List<string> AllTimeSlots = new()
        {
            "9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"
        };

        public static bool IsFullyBooked(string dateStr) =>
            BookedSlots.TryGetValue(dateStr, out var booked) &&
            AllTimeSlots.All(t => booked.Contains(t));
    }
}