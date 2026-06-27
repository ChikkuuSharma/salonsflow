# Customer Success Guide: SalonFlow

This guide documents the customer success processes, onboarding checklists, user training workflows, and support handling guidelines.

---

## 1. Salon Client Onboarding Workflow

### Phase 1: Registration & Account Setup
1.  **Clerk Provisioning**: Help the owner register at the dashboard.
2.  **Profile Entry**: Ensure salon business name, phone number, and physical address are entered accurately.
3.  **Seed Catalog**: Import initial list of services (pricing and duration) and staff members.

### Phase 2: Messenger & System Integration
1.  **Meta WhatsApp Setup**: Assist in configuring the Meta Business manager number and hook webhook URL.
2.  **Review Redirections**: Map the salon's Google Maps review link to `googleReviewLink` and set the delay to 60 mins.
3.  **Rebooking Recurrence Rules**: Add initial rules mapping core services to rebooking intervals (e.g. *Haircut -> 30 days*, *Facial -> 45 days*).

### Phase 3: Training & Launch
1.  **Staff Training**: Train receptionists on using the live takeover view.
2.  **Dry Run**: Execute 5 test bookings using text and voice notes.
3.  **Launch**: Promote the WhatsApp booking number to their client base via store signage.

---

## 2. Staff Training Checklist

### Receptionists Training Module
*   *Live Takeover*: How to view the conversations dashboard, read live transcripts, and toggle the AI Receptionist switch to `OFF` for manual chat takeover.
*   *Calendar Booking*: How to view the daily timeline, reschedule blocks, and manually override bookings.
*   *Voice Note Logs*: How to review voice note transcripts and verify their status.

### Managers & Owners Training Module
*   *Rebooking Approvals*: How to check the AI Rebooking Queue weekly and hit "Approve & Send" for pending follow-ups.
*   *Service & Staff Config*: How to add new services, adjust price points, and set staff availability flags.
*   *Analytics interpretation*: Understanding total missed calls, missed call conversion rates, and rebooking revenue recovered.

---

## 3. Support Procedures & FAQs

### WhatsApp Webhook Offline / Chatbot Not Responding
1.  Verify the backend server is running.
2.  Verify the Meta WhatsApp Cloud webhook token configuration.
3.  Check if the AI takeover switch for that specific customer is toggled to `OFF` (which stops automated responses).

### AI Booking Incorrect Slots
1.  Navigate to the calendar and locate the booking.
2.  Edit the appointment details manually to resolve the error.
3.  Adjust the custom `Salon.aiPrompt` to clarify specific slot restrictions.
