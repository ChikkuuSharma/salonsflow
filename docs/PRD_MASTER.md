# Product Requirements Document (PRD) Master: SalonFlow

## 1. Product Overview & Vision
SalonFlow is an AI-first operations and growth SaaS platform designed for spa and beauty salons. By pairing an **AI WhatsApp Receptionist** (handling text and voice notes in English, Hindi, and Hinglish) with an **Operations Dashboard**, it automates bookings, missed call follow-ups, rebookings, and review collection, helping salon owners maximize revenue and customer retention.

---

## 2. Core Modules & Feature Specifications

### Module 1: Telephony & Missed Call Booking
*   **F1.1 Detection Webhook**: An endpoint `/api/v1/webhooks/missed-call` to ingest inbound telco missed call pings.
*   **F1.2 Automatic WhatsApp Welcome**: Triggers a welcome message on missed call detection: *"Hello! We noticed you gave us a missed call. How can we help you book an appointment today?"*
*   **F1.3 Conversion Tracking**: Records call instances inside `MissedCall` with status tracking: `PENDING` -> `CONVERSATION_STARTED` -> `BOOKED`.

### Module 2: Automated Review Collection
*   **F2.1 Post-Visit Scanner**: A background scheduler scanning `COMPLETED` appointments after a salon-configured delay (e.g., 60 minutes).
*   **F2.2 Personalized AI Prompt**: Uses OpenAI to write a highly customized WhatsApp template referencing the customer's name and service.
*   **F2.3 Redirection Webhook**: Generates unique click-through links (`/api/v1/webhooks/review-click/:campaignId`) that track click metrics and issue a `302 Redirect` to the Google Review URL.

### Module 3: AI Rebooking Engine
*   **F3.1 Recurrence Rule Mapping**: Links service IDs to recurring intervals (e.g., *Hair Spa* -> *Every 30 days*).
*   **F3.2 Recommendation Queue**: Generates recommendations on appointment completions. Displays them in a dashboard queue.
*   **F3.3 Auto-Send & Approval Triggers**: Supports manual "Approve & Send" dispatching or automated cron-based dispatches via WhatsApp based on the salon's `rebookingAutoSend` toggle.

### Module 4: Multilingual Voice & NLP Booking
*   **F4.1 Hindi + Hinglish reception**: Upgraded system prompts matching keywords like `"kal"`, `"parso"`, `"kitne ka hai"`, `"cut"`, etc., in Hinglish/Hindi text queries.
*   **F4.2 Voice Note Transcription**: Extracts WhatsApp audio attachments, transcribes speech-to-text using Whisper (or mock for offline testing), and routes transcripts into the booking intent engine.

---

## 3. Non-Functional Requirements (NFR)

*   **Multi-Tenant Isolation**: No database query or mutation is permitted to execute without explicit tenant scoping filter `where: { salonId }`.
*   **Security Signature Checks**: Meta WhatsApp webhook payload signatures (`x-hub-signature-256`) and missed call telco callback signature tokens must be validated before processing.
*   **Concurrency Guard**: Transaction blocks wrap slot checks and updates to guarantee no duplicate slot bookings can occur concurrently ( Postgres Advisory lock pattern / `prisma.$transaction`).

---

## 4. Feature Status Dashboard

*   [x] Multi-Tenant Database Isolation
*   [x] Clerk Auth & Tenant Sign-Up Webhooks
*   [x] Scheduler Calendar and Customers Directory
*   [x] Inbound Missed Call Booking Webhook & Welcome
*   [x] AI Review Collection Scheduler & Redirection Webhook
*   [x] Rebooking Rule Editor & Approval Queue
*   [x] Hinglish / Hindi NLP Intent Classification
*   [x] Whisper Audio Note Transcription & Webhook Integration
*   [x] Stripe Subscription Gating Constraints
