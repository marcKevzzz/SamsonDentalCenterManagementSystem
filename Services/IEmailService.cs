using System.Threading.Tasks;

namespace SamsonDentalCenterManagementSystem.Services
{
    public interface IEmailService
    {
        Task SendConfirmationEmailAsync(string toEmail, string toName, string confirmationLink);
        Task SendAppointmentReminderAsync(string toEmail, string toName, string serviceName, string date, string time);
        Task SendInvitationEmailAsync(string toEmail, string toName, string invitationLink);
        Task SendEmailAsync(string toEmail, string toName, string subject, string templateName, object model);
    }
}
