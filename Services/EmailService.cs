using FluentEmail.Core;
using System.IO;
using System.Threading.Tasks;

namespace SamsonDentalCenterManagementSystem.Services
{
    public class EmailService : IEmailService
    {
        private readonly IFluentEmail _fluentEmail;
        private readonly Microsoft.Extensions.Logging.ILogger<EmailService> _logger;

        public EmailService(IFluentEmail fluentEmail, Microsoft.Extensions.Logging.ILogger<EmailService> logger)
        {
            _fluentEmail = fluentEmail;
            _logger = logger;
        }

        public async Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmationLink)
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Views", "Emails", "Confirmation.cshtml");
            var response = await _fluentEmail
                .To(toEmail, toName)
                .Subject("Confirm your Samson Dental Center Account")
                .UsingTemplateFromFile(templatePath, new { Name = toName, Link = confirmationLink })
                .SendAsync();

            if (!response.Successful)
            {
                _logger.LogError("Failed to send confirmation email to {Email}: {Errors}", toEmail, string.Join(", ", response.ErrorMessages));
            }
        }

        public async Task SendAppointmentReminderAsync(string toEmail, string toName, string serviceName, string date, string time)
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Views", "Emails", "Reminder.cshtml");
            var response = await _fluentEmail
                .To(toEmail, toName)
                .Subject("Upcoming Appointment Reminder - Samson Dental Center")
                .UsingTemplateFromFile(templatePath, new { Name = toName, Service = serviceName, Date = date, Time = time })
                .SendAsync();

            if (!response.Successful)
            {
                _logger.LogError("Failed to send reminder email to {Email}: {Errors}", toEmail, string.Join(", ", response.ErrorMessages));
            }
        }

        public async Task SendInvitationEmailAsync(string toEmail, string toName, string invitationLink)
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Views", "Emails", "Invitation.cshtml");
            var response = await _fluentEmail
                .To(toEmail, toName)
                .Subject("Set up your Samson Dental Center Account")
                .UsingTemplateFromFile(templatePath, new { Name = toName, Link = invitationLink })
                .SendAsync();

            if (!response.Successful)
            {
                _logger.LogError("Failed to send invitation email to {Email}: {Errors}", toEmail, string.Join(", ", response.ErrorMessages));
            }
        }

        public async Task SendEmailAsync(string toEmail, string toName, string subject, string templateName, object model)
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "Views", "Emails", $"{templateName}.cshtml");
            
            if (!File.Exists(templatePath))
            {
                _logger.LogError("Email template not found: {Path}", templatePath);
                return;
            }

            var response = await _fluentEmail
                .To(toEmail, toName)
                .Subject(subject)
                .UsingTemplateFromFile(templatePath, model)
                .SendAsync();

            if (!response.Successful)
            {
                _logger.LogError("Failed to send email {Template} to {Email}: {Errors}", templateName, toEmail, string.Join(", ", response.ErrorMessages));
            }
            else
            {
                _logger.LogInformation("Successfully sent email {Template} to {Email}", templateName, toEmail);
            }
        }
    }
}
