using Microsoft.EntityFrameworkCore;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Profile> Profiles { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Suppress Supabase BaseModel internals that EF tries to map
            modelBuilder.Ignore<Supabase.Postgrest.ClientOptions>();

            modelBuilder.Entity<Profile>(entity =>
            {
                entity.ToTable("profiles");
                entity.HasKey(p => p.Id);

                entity.Property(p => p.Id).HasColumnName("id");
                entity.Property(p => p.FirstName).HasColumnName("first_name");
                entity.Property(p => p.LastName).HasColumnName("last_name");
                entity.Property(p => p.DateOfBirth).HasColumnName("date_of_birth");
                entity.Property(p => p.Sex).HasColumnName("sex");
                entity.Property(p => p.PhoneNumber).HasColumnName("phone_number");
                entity.Property(p => p.Address).HasColumnName("address");
                entity.Property(p => p.Role).HasColumnName("role");  
                entity.Property(p => p.AvatarUrl).HasColumnName("avatar_url");  
                entity.Property(p => p.CreatedAt).HasColumnName("created_at");

                // Exclude UI-only fields — these have no DB columns
                entity.Ignore(p => p.Email);
                entity.Ignore(p => p.Password);
                entity.Ignore(p => p.ConfirmPassword);
                entity.Ignore(p => p.Consent);
            });
        }
    }
}