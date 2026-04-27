---
description: The "Identity Bridge" (Account/Guest/Linked Profiles)
---

1. The Data Capture (Booking Phase)
   When any user (Guest or Account Holder) fills out the booking form, the system captures a "Snapshot" of the person in the chair.
   Fields: PatientName, PatientEmail, PatientPhone, IsForOther, OtherName, OtherEmail, OtherPhone.
   Storage: These are saved directly in the appointments row. This ensures that even if a profile is deleted later, the clinical record of who was in the chair remains.
2. The "Arrived" Trigger (Promotion Logic)
   When the staff marks an appointment as "Arrived", the system runs a Deduplication Check before creating data.
   The Logic Sequence:
   Identity Match: The system searches the profiles table for a match using:
   Primary Match: Email OR Phone.
   Secondary Match: FirstName + LastName + CreatedBy (The ID of the person who booked).
   The Decision:
   Match Found: The system links the appointment.patient_id to that existing Profile UUID.
   No Match: \* Create a new entry in profiles.
   Set role = 'patient'.
   Set created_by = [Booker_ID] (or NULL if they were a guest).
   Populate profiles with the phone/email provided in the appointment.
   Link: Update the appointments.patient_id with this new UUID.
3. Handling the "Friend vs. Child" Scenario
   By using created_by, the system handles relationships without needing a "Family" table:
   Friend: Linked via created_by, but has their own unique phone/email.
   Child: Linked via created_by, but might share the phone/email of the parent.
   Identification: The system treats them as unique patients because their Names differ, even if the contact info is shared.

4. Admin Dashboard Updates
   A. The "Patient Details" Page
   Header: Displays the patient’s info.
   Relationship Badge: If created_by is not null, show a badge: "Managed by: [Account Holder Name]".
   History: Pulls all treatments and invoices where the patient_id matches this specific profile.
   B. The "Create Invoice" Auto-Fill
   When clicking "Create Invoice" from the Patient Dashboard, the system carries over the PatientId.
   It pulls the unit price from dental_services but allows the admin to override it (storing the final unit_price in invoice_items).

Technical Mapping for Anti-Gravity Implementation
Event,Database Action,C# Logic / Trigger
Guest Books,INSERT appointments,"Set is_guest = true, patient_id = null."
User Books for Friend,INSERT appointments,"Set is_for_other = true, patient_id = [User_ID]."
Mark Arrived,UPSERT profiles,"Check phone/email. If new, INSERT then UPDATE appointments.patient_id."
View Dashboard,SELECT FROM profiles,Join appointments where status = 'arrived'.
