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
    public class AppointmentReminderService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AppointmentReminderService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(1);

        public AppointmentReminderService(IServiceProvider serviceProvider, ILogger<AppointmentReminderService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Appointment Reminder Service is starting.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessRemindersAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing appointment reminders.");
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Appointment Reminder Service is stopping.");
        }

        private async Task ProcessRemindersAsync()
        {
            using var scope = _serviceProvider.CreateScope();
            var supabase = scope.ServiceProvider.GetRequiredService<Supabase.Client>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            // Find appointments for tomorrow (between 24 and 48 hours from now)
            // that haven't had a reminder sent yet and are confirmed.
            var tomorrow = DateTime.UtcNow.AddDays(1).Date;
            
            var response = await supabase.From<Appointment>()
                .Where(x => x.AppointmentDate == tomorrow)
                .Where(x => x.Status == "confirmed")
                .Where(x => x.ReminderSent == false)
                .Get();

            var appointments = response.Models;

            if (!appointments.Any())
            {
                return;
            }

            _logger.LogInformation("Sending {Count} appointment reminders for {Date}.", appointments.Count, tomorrow.ToShortDateString());

            foreach (var appt in appointments)
            {
                try
                {
                    await emailService.SendAppointmentReminderAsync(
                        appt.PatientEmail,
                        appt.PatientName,
                        appt.ServiceName,
                        appt.AppointmentDate.ToString("MMMM dd, yyyy"),
                        appt.AppointmentTime
                    );

                    // Mark as sent
                    appt.ReminderSent = true;
                    await supabase.From<Appointment>().Update(appt);
                    
                    _logger.LogInformation("Reminder sent to {Email} for appointment {Id}.", appt.PatientEmail, appt.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send reminder for appointment {Id}.", appt.Id);
                }
            }
        }
    }
}
