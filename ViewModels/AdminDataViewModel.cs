using System.Text.Json.Serialization;
using SamsonDentalCenterManagementSystem.Models;

namespace SamsonDentalCenterManagementSystem.ViewModels;

public class AdminDataViewModel
{
    [JsonPropertyName("appointments")]
    public List<Appointment> Appointments { get; set; } = new();

    [JsonPropertyName("doctors")]
    public List<Doctor> Doctors { get; set; } = new();

    [JsonPropertyName("receptionists")]
    public List<Receptionist> Receptionists { get; set; } = new();

    [JsonPropertyName("services")]
    public List<DentalService> Services { get; set; } = new();

    [JsonPropertyName("patients")]
    public List<Profile> Patients { get; set; } = new();

    [JsonPropertyName("invoices")]
    public List<Invoice> Invoices { get; set; } = new();

    [JsonPropertyName("inquiries")]
    public List<Inquiry> Inquiries { get; set; } = new();

    [JsonPropertyName("users")]
    public List<Profile> Users { get; set; } = new();

    [JsonPropertyName("stats")]
    public AdminStats Stats { get; set; } = new();

    [JsonPropertyName("settings")]
    public ClinicSettings? Settings { get; set; }
}

public class AdminStats
{
    [JsonPropertyName("totalPatients")]
    public int TotalPatients { get; set; }

    [JsonPropertyName("activeDoctors")]
    public int ActiveDoctors { get; set; }

    [JsonPropertyName("todayAppointments")]
    public int TodayAppointments { get; set; }

    [JsonPropertyName("monthlyRevenue")]
    public decimal MonthlyRevenue { get; set; }

    [JsonPropertyName("weeklyVisits")]
    public Dictionary<string, int> WeeklyVisits { get; set; } = new();

    [JsonPropertyName("monthlyVisits")]
    public Dictionary<string, int> MonthlyVisits { get; set; } = new();

    [JsonPropertyName("departmentLoad")]
    public Dictionary<string, int> DepartmentLoad { get; set; } = new();

    [JsonPropertyName("monthlyRevenueTrend")]
    public Dictionary<string, decimal> MonthlyRevenueTrend { get; set; } = new();

    [JsonPropertyName("keyMetrics")]
    public Dictionary<string, double> KeyMetrics { get; set; } = new();
}

public class AdminReportsDto
{
    [JsonPropertyName("totalBookings")]
    public int TotalBookings { get; set; }

    [JsonPropertyName("completionRate")]
    public double CompletionRate { get; set; }

    [JsonPropertyName("peakHours")]
    public string PeakHours { get; set; } = "N/A";

    [JsonPropertyName("statusDistribution")]
    public Dictionary<string, int> StatusDistribution { get; set; } = new();

    [JsonPropertyName("providerUtilization")]
    public List<ProviderUtilizationDto> ProviderUtilization { get; set; } = new();

    [JsonPropertyName("demographics")]
    public DemographicsDto Demographics { get; set; } = new();

    [JsonPropertyName("pulseGrid")]
    public PulseGridDto PulseGrid { get; set; } = new();
}

public class ProviderUtilizationDto
{
    [JsonPropertyName("doctorName")]
    public string DoctorName { get; set; } = string.Empty;

    [JsonPropertyName("totalHoursBooked")]
    public double TotalHoursBooked { get; set; }

    [JsonPropertyName("avgApptsPerDay")]
    public double AvgApptsPerDay { get; set; }
}

public class DemographicsDto
{
    [JsonPropertyName("firstTime")]
    public int FirstTime { get; set; }

    [JsonPropertyName("returning")]
    public int Returning { get; set; }

    [JsonPropertyName("heatmap")]
    public Dictionary<string, int> Heatmap { get; set; } = new();
}

public class PulseGridDto
{
    [JsonPropertyName("noShowRate")]
    public double NoShowRate { get; set; }

    [JsonPropertyName("busyDay")]
    public string BusyDay { get; set; } = "N/A";

    [JsonPropertyName("topService")]
    public string TopService { get; set; } = "N/A";

    [JsonPropertyName("timeLeakPercentage")]
    public double TimeLeakPercentage { get; set; }
}
