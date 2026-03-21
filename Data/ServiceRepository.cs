using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Services
{
    public static class ServiceRepository
    {
        public static List<DentalService> Services =
        [
            /* ─────────────────────────────────────────────────────────
               GENERAL DENTISTRY
            ───────────────────────────────────────────────────────── */
            new DentalService
            {
                Slug = "dental-checkup",
                Category = "General Dentistry",
                Name = "Dental Checkup",
                Tagline = "Prevention starts with a thorough look.",
                Hero = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRwFEu23mxQGBqTTCXIyRpI322ZtL5eXyo5OQ&s",
                Icon = "fa-solid fa-magnifying-glass",
                Summary = "A comprehensive dental checkup is the cornerstone of a healthy smile. Our experienced dentists perform a full oral examination to detect early signs of decay, gum disease, and other concerns before they become serious problems.",
                Duration = "45–60 min",
                Recovery = "None required",
                Price = "From ₱500",
                Benefits = new() { "Early detection of cavities and decay", "Gum health assessment", "Oral cancer screening", "X-ray review and analysis", "Personalized oral care plan" },
                Steps = new() {
                    new ServiceStep { Title = "Consultation & History Review", Body = "Your dentist reviews your dental and medical history and asks about any concerns or symptoms you have noticed." },
                    new ServiceStep { Title = "Full Oral Examination", Body = "A thorough visual and tactile examination of all teeth, gums, jaw, and oral tissues is performed." },
                    new ServiceStep { Title = "Digital X-Rays (if needed)", Body = "Low-radiation digital X-rays are taken to detect issues not visible to the naked eye." },
                    new ServiceStep { Title = "Treatment Plan & Recommendations", Body = "Your dentist discusses findings and recommends a personalized prevention or treatment plan." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "How often should I get a dental checkup?", A = "We recommend a checkup every 6 months for most patients. Those with gum disease or higher risk factors may need more frequent visits." },
                    new ServiceFaq { Q = "Is the checkup painful?", A = "Not at all. A standard checkup is completely non-invasive. We use gentle techniques and will always inform you before any procedure." }
                }
            },

            new DentalService
            {
                Slug = "teeth-cleaning",
                Category = "General Dentistry",
                Name = "Teeth Cleaning",
                Tagline = "Professional-grade clean you can feel.",
                Hero = "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=1200&q=80",
                Icon = "sparkles",
                Summary = "Professional teeth cleaning (prophylaxis) goes beyond what brushing and flossing can achieve at home.",
                Duration = "30–60 min",
                Recovery = "None required",
                Price = "From ₱800",
                Benefits = new() { "Removal of tartar and plaque buildup", "Polishing to remove surface stains", "Freshens breath significantly", "Reduces risk of gum disease", "Smooth enamel surface finish" },
                Steps = new() {
                    new ServiceStep { Title = "Plaque & Tartar Removal", Body = "Using ultrasonic scalers and hand instruments, we remove hardened deposits." },
                    new ServiceStep { Title = "Polishing", Body = "A professional polishing paste removes surface stains and leaves teeth feeling smooth." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Will cleaning whiten my teeth?", A = "Cleaning removes surface stains, which can brighten your smile. For deeper whitening, we recommend our teeth whitening service." }
                }
            },

            new DentalService
            {
                Slug = "tooth-filling",
                Category = "General Dentistry",
                Name = "Tooth Filling",
                Tagline = "Restore, protect, and get back to normal.",
                Hero = "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1200&q=80",
                Icon = "shield",
                Summary = "Tooth fillings restore teeth damaged by cavities or minor fractures using tooth-colored composite materials.",
                Duration = "30–60 min",
                Recovery = "None — return to normal same day",
                Price = "From ₱1,200",
                Benefits = new() { "Stops cavity progression immediately", "Tooth-colored composite options", "Restores full bite function", "Long-lasting and durable" },
                Steps = new() {
                    new ServiceStep { Title = "Numbing & Preparation", Body = "Local anesthesia is applied. The decayed portion is carefully removed." },
                    new ServiceStep { Title = "Composite Application", Body = "Tooth-colored resin is applied in layers and hardened with a curing light." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "How long do fillings last?", A = "Composite fillings typically last 7–10 years with proper care." }
                }
            },

            new DentalService
            {
                Slug = "fluoride-treatment",
                Category = "General Dentistry",
                Name = "Fluoride Treatment",
                Tagline = "Strengthen enamel. Prevent cavities.",
                Hero = "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=1200&q=80",
                Icon = "zap",
                Summary = "A fast, painless preventive procedure that strengthens tooth enamel and helps prevent cavities.",
                Duration = "10–15 min",
                Recovery = "Avoid eating/drinking for 30 min",
                Price = "From ₱400",
                Benefits = new() { "Strengthens and remineralizes enamel", "Reduces cavity risk by up to 40%", "Ideal for children and adults" },
                Steps = new() {
                    new ServiceStep { Title = "Fluoride Application", Body = "High-concentration fluoride gel or varnish is applied directly to the teeth." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Is fluoride safe?", A = "Yes. Professional treatments use a carefully measured dose that is safe for all ages." }
                }
            },

            /* ─────────────────────────────────────────────────────────
               COSMETIC
            ───────────────────────────────────────────────────────── */
            new DentalService
            {
                Slug = "teeth-whitening",
                Category = "Cosmetic",
                Name = "Teeth Whitening",
                Tagline = "Brighten your smile in just one visit.",
                Hero = "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80",
                Icon = "sun",
                Summary = "Professional in-office whitening using advanced agents and LED activation for dramatic results.",
                Duration = "60–90 min",
                Recovery = "Avoid staining foods for 48 hrs",
                Price = "From ₱3,500",
                Benefits = new() { "Up to 8 shades lighter in one visit", "Safe, dentist-supervised procedure", "Long-lasting results" },
                Steps = new() {
                    new ServiceStep { Title = "Whitening Gel & Activation", Body = "Hydrogen peroxide gel is applied and activated with an LED light." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Will whitening cause sensitivity?", A = "Some experience temporary sensitivity for 24–48 hours; we use desensitizing agents to minimize this." }
                }
            },

            new DentalService
            {
                Slug = "dental-veneers",
                Category = "Cosmetic",
                Name = "Dental Veneers",
                Tagline = "A flawless smile, custom-crafted for you.",
                Hero = "https://images.unsplash.com/photo-1598256989530-31e46cbc0a0e?w=1200&q=80",
                Icon = "star",
                Summary = "Ultra-thin porcelain or composite shells bonded to the front surface of teeth.",
                Duration = "2–3 visits over 2 weeks",
                Recovery = "Minimal — normal diet in 24 hrs",
                Price = "From ₱8,000 per tooth",
                Benefits = new() { "Covers chips, cracks, and stains", "Natural-looking porcelain finish", "Resistant to staining" },
                Steps = new() {
                    new ServiceStep { Title = "Tooth Preparation", Body = "A thin layer of enamel is removed to make room for the veneer." },
                    new ServiceStep { Title = "Bonding & Finishing", Body = "Permanent veneers are carefully bonded and polished." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Are veneers permanent?", A = "Veneers are a long-term commitment as enamel is removed. They last 10–15 years." }
                }
            },

            new DentalService
            {
                Slug = "smile-makeover",
                Category = "Cosmetic",
                Name = "Smile Makeover",
                Tagline = "A comprehensive transformation designed around you.",
                Hero = "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200&q=80",
                Icon = "refresh",
                Summary = "A personalized combination of procedures to completely transform your smile.",
                Duration = "Varies by plan",
                Recovery = "Depends on procedures",
                Price = "From ₱15,000",
                Benefits = new() { "Fully customized plan", "Combines multiple procedures", "Digital smile preview" },
                Steps = new() {
                    new ServiceStep { Title = "Digital Smile Design", Body = "We create a preview of your expected results for your approval." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "What does it include?", A = "Commonly includes whitening, veneers, bonding, and/or orthodontics." }
                }
            },

            new DentalService
            {
                Slug = "composite-bonding",
                Category = "Cosmetic",
                Name = "Composite Bonding",
                Tagline = "Fix imperfections in a single appointment.",
                Hero = "https://images.unsplash.com/photo-1629909615184-74f495363b67?w=1200&q=80",
                Icon = "tool",
                Summary = "Using tooth-colored resin to repair minor chips, gaps, or discoloration.",
                Duration = "30–60 min per tooth",
                Recovery = "None — immediate results",
                Price = "From ₱2,500 per tooth",
                Benefits = new() { "No removal of tooth structure", "One visit completion", "Reversible and affordable" },
                Steps = new() {
                    new ServiceStep { Title = "Resin Application", Body = "Composite resin is sculpted directly onto the tooth and shaped." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "How long does it last?", A = "With good care, bonding lasts 5–10 years." }
                }
            },

            /* ─────────────────────────────────────────────────────────
               SPECIALIZED
            ───────────────────────────────────────────────────────── */
            new DentalService
            {
                Slug = "root-canal",
                Category = "Specialized",
                Name = "Root Canal",
                Tagline = "Save your tooth. Eliminate the pain.",
                Hero = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1200&q=80",
                Icon = "activity",
                Summary = "Removes infected pulp from inside a tooth to eliminate pain and save the tooth.",
                Duration = "60–90 min",
                Recovery = "Mild soreness for 2–3 days",
                Price = "From ₱5,000",
                Benefits = new() { "Eliminates pain", "Saves natural tooth", "Prevents infection spread" },
                Steps = new() {
                    new ServiceStep { Title = "Cleaning & Shaping", Body = "Canals are cleaned, disinfected, and shaped for filling." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Is it painful?", A = "Performed under local anesthesia, it feels similar to a regular filling." }
                }
            },

            new DentalService
            {
                Slug = "braces-and-aligners",
                Category = "Specialized",
                Name = "Braces & Aligners",
                Tagline = "Straighten your smile on your terms.",
                Hero = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&q=80",
                Icon = "smile",
                Summary = "Traditional metal braces or clear aligner systems like Invisalign.",
                Duration = "12–24 months",
                Recovery = "Adjustment soreness (1–3 days)",
                Price = "From ₱25,000",
                Benefits = new() { "Corrects bite issues", "Suitable for all ages", "Post-treatment retainer included" },
                Steps = new() {
                    new ServiceStep { Title = "Progress Adjustments", Body = "Regular visits every 4–8 weeks to adjust or change aligners." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "Will I need a retainer?", A = "Yes, retainers are essential to maintaining your new alignment." }
                }
            },

            new DentalService
            {
                Slug = "dental-implants",
                Category = "Specialized",
                Name = "Dental Implants",
                Tagline = "The permanent solution for missing teeth.",
                Hero = "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80",
                Icon = "anchor",
                Summary = "Titanium posts surgically placed into the jawbone to serve as artificial roots.",
                Duration = "3–6 months",
                Recovery = "3–5 days tenderness",
                Price = "From ₱35,000 per implant",
                Benefits = new() { "Lifetime solution", "Preserves jawbone density", "Looks/feels natural" },
                Steps = new() {
                    new ServiceStep { Title = "Implant Surgery", Body = "Titanium post is surgically placed under local anesthesia." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "How long do they last?", A = "The post can last a lifetime; the crown lasts 10–15 years." }
                }
            },

            new DentalService
            {
                Slug = "oral-surgery",
                Category = "Specialized",
                Name = "Oral Surgery",
                Tagline = "Expert surgical care in a comfortable setting.",
                Hero = "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1200&q=80",
                Icon = "scissors",
                Summary = "Covers extractions, wisdom teeth removal, and bone grafting.",
                Duration = "30–90 min",
                Recovery = "2–5 days",
                Price = "From ₱2,500",
                Benefits = new() { "Wisdom tooth extraction", "Bone grafting", "IV sedation available" },
                Steps = new() {
                    new ServiceStep { Title = "Surgical Procedure", Body = "Performed with precision by our chief surgeon." }
                },
                Faqs = new() {
                    new ServiceFaq { Q = "How long is recovery?", A = "Most patients recover in 3–5 days." }
                }
            }
        ];

        public static DentalService? GetBySlug(string slug)
        {
            return Services.FirstOrDefault(s => s.Slug == slug);
        }
    }
}