using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SamsonDentalCenterManagementSystem.Models;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class AppointmentLockWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AppointmentLockWorker> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);

        public AppointmentLockWorker(IServiceProvider serviceProvider, ILogger<AppointmentLockWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Appointment Lock Worker is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredLocksAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing expired appointment locks.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Appointment Lock Worker is stopping.");
        }

        private async Task ProcessExpiredLocksAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var supabase = scope.ServiceProvider.GetRequiredService<Supabase.Client>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            var now = DateTime.UtcNow;

            // Find pending appointments where the soft lock has expired
            var response = await supabase.From<Appointment>()
                .Select("*, patient:patient_id(*)")
                .Where(x => x.Status == "pending")
                .Where(x => x.SoftLockUntil <= now)
                .Get();

            var expired = response.Models;

            if (!expired.Any()) return;

            _logger.LogInformation("Cleaning up {Count} expired appointment locks.", expired.Count);

            foreach (var appt in expired)
            {
                try
                {
                    // Determine if this was a waitlist promotion (no time selected yet)
                    var isWaitlistPromotion = string.IsNullOrEmpty(appt.AppointmentTime) || appt.AppointmentTime == "—";
                    var subject = isWaitlistPromotion ? "Waitlist Promotion Expired" : "Appointment Cancelled - Verification Expired";
                    var reason = isWaitlistPromotion 
                        ? "The priority window to select a time for your waitlist promotion has expired. The slot has been released to the next patient."
                        : "The appointment verification period has expired. Please book again if you still wish to visit.";

                    // Mark as cancelled
                    appt.Status = "cancelled";
                    appt.Notes = (appt.Notes ?? "") + $"\n[System] Cancelled due to expired soft lock. (Waitlist: {isWaitlistPromotion})";
                    
                    await supabase.From<Appointment>().Update(appt);
                    
                    // Notify patient of cancellation
                    await emailService.SendEmailAsync(
                        appt.PatientEmail,
                        appt.PatientName,
                        subject,
                        "Cancellation",
                        new
                        {
                            Name = appt.PatientName,
                            Date = appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                            Time = appt.AppointmentTime,
                            Reason = reason,
                        }
                    );

                    _logger.LogInformation("Expired lock cancelled for {Email}, appointment {Id}.", appt.PatientEmail, appt.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to cancel expired lock for appointment {Id}.", appt.Id);
                }
            }
        }
    }
}
