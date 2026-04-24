---
description: Appointment Lifecycle & Front-Desk Workflow Refactor
---

Phase 1A: The Booking (Initiation)
The journey begins when a slot is reserved.

Selection: A patient (via Guest Mode or Login) selects a service, doctor, and time slot.

Record Creation: \* Status: Pending (Slot is blocked).

Email Status: pending_link.

Verification: The system sends an automated email.

Email Status: Moves to sent.

User Action: Patient clicks the link in their inbox.

Email Status: Becomes confirmed.

Status: Automatically flips to Confirmed (Green on the calendar).

Phase 1B: The Waitlist Procedure
The Waitlist is for patients who want a slot on a day that is already fully booked.

The Workflow
Entry: When a patient tries to book a full day, they can choose to "Join Waitlist."

Status: Waitlisted.

The Trigger: A slot becomes available because another patient Reschedules or Cancels.

The Notification: The system automatically emails the first person on the waitlist: "A slot has opened! Click here to claim it within 15 minutes."

Promotion: \* If they click: They are promoted to Pending and follow the standard Email Confirmation flow.

If they ignore: The system offers the slot to the next person on the list.

Phase 2: The Physical Arrival (Check-In)
This occurs on the day of the appointment and is managed by the Receptionist.

Discovery: The Receptionist uses the Calendar View to see the day's list. They can search by patient name to find the specific slot.

Check-In: When the patient walks in, the Receptionist clicks "Mark as Arrived."

Status: Flips to Arrived (Yellow).

SignalR Event: The Doctor’s dashboard updates instantly, showing the patient is in the waiting room.

Waiting Room: The system tracks the "Wait Time" from the moment the status changed to Arrived.

Phase 3: Clinical Treatment (The Doctor's Domain)
The Doctor takes over once the patient enters the dental chair.

Treatment: The Doctor performs the dental service (e.g., Cleaning, Filling, Extraction).

Invoicing: Before the patient leaves the chair, the Doctor opens the Invoice Action.

They select the services performed.

They add any additional materials or fees.

They click "Send Invoice."

State Check: The status remains Arrived (Yellow) because the patient has not yet settled the bill at the front desk.

Phase 4: Administrative Checkout (The Finalization)
The patient returns to the Receptionist to finalize the visit.

Transaction Verification: The Receptionist opens the Transaction Page.

Payment Check: They see the invoice sent by the Doctor. Once the patient pays (via cash, card, or HMO), the Receptionist verifies the amount.

Completion: The Receptionist clicks "Mark Completed."

Status: Flips to Completed (Blue).

Records: The appointment is archived in the patient's history, and the revenue is logged in the Reports.

Phase 5: Post-Treatment (Rescheduling & Follow-up)
If the patient needs to return, the workflow loops back.

Scenario A (Follow-up): After marking Completed, the Receptionist asks if they want to book their next cleaning. A new Pending appointment is created.

Scenario B (Reschedule): If a patient calls to move a future Confirmed date:

Receptionist finds the appointment on the Calendar.

Clicks "Reschedule."

Old Appointment: Status becomes Cancelled.

New Appointment: Created for the new date, triggering a new Email Verification cycle.

Role-Specific Responsibilities Summary

Phase,Responsible Role,Key Action,Status Change
Booking,Patient / Guest,Email Confirmation,Pending → Confirmed
Check-In,Receptionist / Admin,Mark as Arrived,Confirmed → Arrived
Treatment,Doctor / Admin,Generate Invoice,No Change (Stays Arrived)
Checkout,Receptionist / Admin,Mark Completed,Arrived → Completed

Automated Email Notifications
These are "Set and Forget" rules that your .NET Background Worker handles.

Notification Types & Triggers
Notification,Trigger Time,Purpose
Reminder,24 Hours before Appointment,"Reduce ""No-Shows."" Includes a ""Confirm"" or ""Reschedule"" button."
Status Change,Immediate (on status update),"If a Receptionist moves an appointment, the patient gets a ""Your appointment has been updated"" alert."
Final Follow-up,1 Hour after Completed,"Sends the invoice PDF and a ""Thank You/Review Us"" link."
Urgent Alert,Immediate (on Cancelled),Confirms the cancellation and offers a link to book a new date.
