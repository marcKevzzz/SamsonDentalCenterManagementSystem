---
description: The RBAC Workflow (Identity & Permissions) This layer handles authentication and restricts UI elements based on the user's role. It doesn't care about the appointment status; it only cares about the logged-in user.
---

1. Patient Role
   Focus: Personal booking and health history.

Access: Limited strictly to the PatientSide portal.

Actions:

Book new appointments (via Guest or Registered mode).

Confirm appointments through Email Verification.

View profile details, personal treatment history and upcoming schedules.

Update personal contact information.

2. Doctor Role
   Focus: Clinical treatment and service reporting.

Access: Doctor Dashboard, Manage Availability and Patient Clinical Records.

Actions:

View a list of Arrived patients for the day.

Manage personal availability and schedule blocks.

Access and update clinical notes for assigned patients.

Trigger Invoices: Add services rendered and additional fees to a patient's visit.

Restriction: Cannot modify the physical appointment status (Arrived/Completed) or view clinic-wide financial reports.

3. Receptionist Role
   Focus: Daily operations, scheduling, and billing verification.

Access: Daily Calendar View, Transaction Page, Inquiries, and Audit Logs.

Actions:

Search and manage all appointments for all doctors.

Add/Edit patient records.

Mark as Arrived: Change status from Confirmed to Arrived upon patient entry.

Verify Doctor-sent invoices and process check-outs.

Appoint a reschedule for a patient for post-treatment.

Mark as Completed: Finalize the appointment lifecycle after payment verification.

View operational reports and system logs for troubleshooting.

4. Admin Role
   Focus: System-wide oversight and configuration.

Access: Full System Access (Global Dashboard).

Actions:
All permissions granted to Receptionists and Doctors.
User Management: Create, update, or deactivate user accounts (Doctors, Staff).
Modify system-wide settings (Service lists, Pricing, Clinic hours).
Access sensitive financial and performance Reports.
Perform database maintenance or manual status overrides if necessary.

The admin can also be a doctor.
