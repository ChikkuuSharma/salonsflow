# Architecture Guide: SalonFlow SaaS Platform

This document outlines the system architecture, core services, data flow, AI receptionist pipeline, and WhatsApp messaging flow for SalonFlow.

---

## 1. System Topology

```mermaid
graph TD
    %% Clients
    User([Salon Client]) -->|WhatsApp Chat/Voice| WA_Gateway[WhatsApp Business API Gateway]
    Owner([Salon Owner/Staff]) -->|Dashboard| FE[Next.js Dashboard Client]

    %% Network Routing / Entry
    WA_Gateway -->|Webhooks| BE[NestJS Backend API]
    FE -->|GraphQL/REST| BE

    %% Third Party Integrations
    BE -->|Completion / Whisper| OpenAI[OpenAI API]
    BE -->|Checkout Sync| Stripe[Stripe Billing Gateway]
    BE -->|Outbound SMS/WA| WA_Gateway

    %% Database & Cache
    BE -->|Prisma ORM| DB[(PostgreSQL Database)]
```

---

## 2. Core Service Modules (NestJS Backend)

### 📞 MissedCallController & Webhooks
*   **Path**: `backend/src/webhooks/missed-call.controller.ts`
*   **Role**: Ingests missed call callback events, registers them inside PostgreSQL, initiates new customer profiles if new, and triggers welcome templates.

### 🤖 AiService (Intent Classifier & Translation)
*   **Path**: `backend/src/ai/ai.service.ts`
*   **Role**: Handles intent classification (`BOOKING`, `FAQ`, `HUMAN_TAKEOVER`), extracts dates/times using OpenAI GPT function calls, transcribes voice notes via Whisper, and implements a regex-based local fallback parser.

### 🔄 RebookingsService (Recurrence Rules)
*   **Path**: `backend/src/rebookings/rebookings.service.ts`
*   **Role**: Evaluates completed appointments against recurrence interval rules (e.g. *Hair Spa -> 30 days*), queues rebooking recommendations, and handles auto-send cron schedules.

### ⭐ ReviewsService (Collect Reviews)
*   **Path**: `backend/src/reviews/reviews.service.ts`
*   **Role**: Scans completed bookings past the configured delay (e.g., 60 mins), constructs personalized request strings using AI, and routes them via WhatsApp.

---

## 3. WhatsApp Messaging Data Flow

The diagram below maps the sequence of an inbound voice note or text message from a customer:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Meta as Meta WhatsApp Gateway
    participant BE as NestJS Backend
    participant Whisper as OpenAI Whisper API
    participant AI as OpenAI Intent Engine
    participant DB as PostgreSQL DB

    Customer->>Meta: Sends WhatsApp Audio Message
    Meta->>BE: Webhook Inbound Payload (Audio Attachment ID)
    BE->>Meta: Fetch Audio File Binary
    BE->>Whisper: Send Audio Binary for Transcription
    Whisper-->>BE: Returns Transcribed Text (Hinglish/English)
    BE->>AI: Determine Intent & Details (Date/Time/Service)
    AI-->>BE: Returns Intent = BOOKING (Haircut, Tomorrow 3 PM)
    BE->>DB: Check Availability & Lock Slot (Advisory Lock)
    DB-->>BE: Slot Available
    BE->>DB: Create Appointment (Status: PENDING)
    BE->>Meta: Outbound Confirmation: "Booked haircut for tomorrow at 3 PM!"
```
