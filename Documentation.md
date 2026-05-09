# Samson Dental Center Management System Documentation

This document provides a technical overview of the system architecture, security implementation, and core technologies used in the Samson Dental Center Management System.

## 🚀 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | .NET 9 (ASP.NET Core Web Application) |
| **Frontend** | Razor Pages (Server-side rendering) |
| **Database** | PostgreSQL (Supabase Managed) |
| **ORM** | Entity Framework Core (Local Context) & Supabase-csharp |
| **Real-time** | ASP.NET Core SignalR |
| **Identity/Auth** | Supabase Auth (JWT Bearer) |
| **Email** | FluentEmail (Razor Templates) |
| **Caching** | MemoryCache & DistributedMemoryCache |

---

## 🏛️ System Architecture

The application follows a **Modular Monolith** structure using a Service-oriented approach.

### Core Components:
- **Portals**: Separate UI sections for Admin, Doctor, Receptionist, and Patient.
- **Service Layer**: Business logic is encapsulated in `Services/` (e.g., `AppointmentService`, `ProfileService`).
- **Real-time Hub (`AdminHub`)**: Handles live updates for appointments, notifications, and activity logs.
- **Hosted Services**: `AppointmentReminderService` handles background tasks like automated email reminders.

---

## 🔐 Security & Identity

### Authentication
- **Provider**: Supabase Auth.
- **Method**: JWT (JSON Web Token) Bearer authentication.
- **Persistence**: Auth tokens are stored in **Secure, HTTP-only cookies** (`sb-access-token` and `sb-refresh-token`).
- **Middleware**: Custom authentication logic in `Program.cs` intercepts cookie tokens and maps them to `ClaimsPrincipal`.

### Row Level Security (RLS)
- The database uses PostgreSQL RLS to protect data at the table level.
- **Service Role**: The backend uses a "Service Role" client for administrative queries to bypass RLS when necessary.
- **Anon Client**: Used for public operations like Sign-in and OTP verification.

---

## 👤 Role-Based Access Control (RBAC)

RBAC is implemented via a custom **Claims Transformer** that injects roles from the database into the user's security context.

### Roles:
- `admin`: Full system access.
- `doctor`: Access to medical records, schedules, and assigned appointments.
- `receptionist`: Access to booking, patient registration, and inquiries.
- `patient`: Access to personal records, history, and booking.

### Policies:
| Policy Name | Permitted Roles |
| :--- | :--- |
| `AdminOnly` | Admin |
| `DoctorOrAdmin` | Doctor, Admin |
| `ReceptionistOrAdmin` | Receptionist, Admin |
| `StaffOnly` | Admin, Doctor, Receptionist |

---

## 🗄️ Database Strategy

- **Source of Truth**: `Blueprint/schema.sql` contains the definitive database schema.
- **Supabase Integration**: Direct REST API calls via `Supabase-csharp` for high-performance data operations.
- **EF Core**: Used for complex relational mappings and local database context (`AppDbContext`).
- **Migrations**: Database changes are tracked via sequential SQL scripts in `Backend/Migrations/`.

---

## 🛠️ Middleware Pipeline

The application uses the following standard and custom middlewares:
1. **CORS**: Enforces cross-origin policies ("AllowVanilla").
2. **Authentication**: Validates JWT tokens from cookies.
3. **Session**: Manages server-side session state for temporary data.
4. **Authorization**: Enforces role-based policies on pages and API endpoints.
5. **Static Assets**: Optimized mapping for static files and frontend resources.

---

## ⚙️ Version Control

- **Branching Strategy**: Feature-based branching.
- **Workflow**: 
    - Changes in models are synchronized across API and Razor Pages.
    - Database changes require an atomic migration script.
    - `projectState.md` is updated after every significant feature or fix to maintain continuity.
