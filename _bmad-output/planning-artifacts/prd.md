# SalonFlow Product Requirements Document (PRD)

---
title: SalonFlow Product Requirements Document (PRD)
status: final
created: 2026-05-31
updated: 2026-06-02
---

## 1. Product Overview & Vision
SalonFlow is an AI-first SaaS operations platform designed to automate client scheduling and FAQ handling for spa and beauty salons. By pairing an **AI WhatsApp Receptionist** with a robust **Multi-Tenant Operations Dashboard**, SalonFlow completely eliminates the overhead of manual booking management, missed calls, and double-bookings.

---

## 2. Core MVP Functional Requirements

### Epic 1: Multi-Tenant Architecture & Auth Provisioning
* **Requirement 1.1 (Multi-Tenancy)**: Implement a secure database structure isolating Salons, Customers, Services, Staff, and Appointments under strict `salonId` tenant containment.
* **Requirement 1.2 (Clerk Signup Sync)**: Integrate an atomic webhook `/api/v1/webhooks/clerk` that triggers on Clerk `user.created` signup events, automatically provisioning the new `Salon` and registering the registering user as the `Role.OWNER` in a single database transaction. 
  * *Collision Guard:* Resolve phone collisions on signup by querying if the WhatsApp number is unique before binding; fall back to unique placeholder generation if a collision occurs.
* **Requirement 1.3 (Security Guard)**: Restrict all dashboard controllers (customers, appointments, analytics) behind a unified, robust `ClerkAuthGuard` validating JSON Web Tokens (JWT). Include secure developer local bypass tokens to seed a mock salon during offline development.

### Epic 2: Operations Dashboard & Analytics
* **Requirement 2.1 (Performance Metrics)**: Provide a premium dashboard screen rendering daily revenue totals, active booking stats, AI automated counts, and new customer registrations fetched from `/api/v1/analytics/metrics`.
* **Requirement 2.2 (Customer Directory)**: Implement paginated, debounced search customer tables and highly detailed client profile pages showing spending averages, appointment logs, and historical chat logs fetched from `/api/v1/customers`.
* **Requirement 2.3 (Scheduling Calendar)**: Render a timeline scheduler and calendar view displaying live appointments loaded from `/api/v1/appointments`.

### Epic 3: AI WhatsApp Receptionist (Chatbot Webhook & Live Takeover)
* **Requirement 3.1 (Meta Webhook)**: Implement `POST /api/v1/webhooks/whatsapp` to parse incoming messaging payloads from Meta's WhatsApp Cloud API.
* **Requirement 3.2 (Dual-Engine Intent Analysis)**: Classify customer messages into `BOOKING`, `FAQ`, `HUMAN_TAKEOVER`, or `OTHER` intents using OpenAI GPT-4o with an active smart regex/keyword parser fallback for offline testing.
* **Requirement 3.3 (Date/Time Extraction)**: Parse relative scheduling requests (e.g., *"tomorrow at 4 PM"*) into strict ISO coordinates.
* **Requirement 3.4 (Transactional Booking)**: Commit validated appointments to PostgreSQL inside `prisma.$transaction`, enforcing staff availability constraints and creating comprehensive `AuditLog` records.
* **Requirement 3.5 (Live Chat Takeover & Transcripts)**: Provide a dual-pane messaging interface showing live WhatsApp conversations. Staff must be able to view real-time chat transcripts and manually toggle the AI receptionist ON/OFF to take over messaging.

### Epic 4: Quality Hardening & Security Remediation
* **Requirement 4.1 (Cross-Tenant IDOR Guard)**: All CRUD and creation endpoints verify that foreign reference IDs (e.g. `customerId`, `serviceId`, `staffId`) match the authenticated `salonId` before executing actions, preventing cross-salon injections.
* **Requirement 4.2 (WhatsApp Webhook Signature Enforcement)**: Webhook `POST /api/v1/webhooks/whatsapp` strictly validates `x-hub-signature-256` payload checksums against the configured `WHATSAPP_APP_SECRET`.
* **Requirement 4.3 (Concurrency Booking Double-Lock)**: Execute all slot availability checking queries *inside* the Postgres transaction block (`tx.appointment.findMany`), ensuring concurrent transactions for the same slot rollback safely instead of double-booking.
* **Requirement 4.4 (Interactive Chatbot Simulator)**: Provide a visual chat console simulating WhatsApp Cloud API payloads to let operators test NLP, date extraction, and transactional booking locally without active webhook routing.

### Epic 5: Bulk Marketing Campaigns & Broadcasts
* **Requirement 5.1 (Target Segmenting)**: Allow salon owners to select pre-filtered customer lists based on visit activity (e.g. "inactive_30_days", "frequent_visitors").
* **Requirement 5.2 (Message Template Scheduling)**: Provide a broadcast scheduling form to write custom text templates and dispatch them via WhatsApp Cloud API to the selected customer segments, recording `sentCount` for each campaign.

### Epic 6: Stripe Premium Subscription Billing
* **Requirement 6.1 (Subscription Plans)**: Map billing parameters to subscription enums (`SubscriptionPlan` - FREE, BASIC, PRO; `SubscriptionStatus` - ACTIVE, CANCELED, PAST_DUE).
* **Requirement 6.2 (Feature Limiting)**: Lock advanced dashboard elements (such as marketing broadcasts or AI-agent parameters) behind BASIC or PRO plan verification checks.

### Epic 7: Advanced Booking Operations & In-Chat Monetization
* **Requirement 7.1 (Stripe Checkout Links)**: Generate Stripe payment checkout links dynamically inside the WhatsApp booking confirmation flow.
* **Requirement 7.2 (Multi-Staff Load Balancing)**: Implement automatic scheduling allocation logic to load-balance appointments across multiple available staff members during concurrent bookings. Explicit customer preferences for a specific stylist bypass the automatic load-balancer completely, and load balancing only applies to unspecified assignments.

---

## 3. Non-Functional & Security Acceptance Criteria
* **Vulnerability Guard**: Under no circumstances must cross-tenant data leaks (IDOR) exist. Controllers must enforce strict pre-query validation constraints.
* **HMAC Signature Check**: Webhook endpoints must verify incoming signature headers (`x-hub-signature-256` or equivalent tokens) using HMAC SHA256 checks, rejecting mismatched or unsigned requests immediately with `401 Unauthorized`.
* **Concurrency Locking**: The database booking engine must utilize transaction-safe concurrency checks to guarantee that two simultaneous bookings for the exact same staff time slot result in an elegant validation rollback rather than double-bookings.
* **Input Validation Interceptor**: Set up global validation pipes (`ValidationPipe` with `class-validator`) to reject unstructured JSON payloads.
* **API Rate Limiting**: Integrate api rate limiting rules (`nestjs-throttler`) to throttle incoming request rates on sensitive webhook and metric endpoints.
* **AI Cost Safeguard**: Establish a token-counting logger and Monthly usage limits on the OpenAI API console to prevent runway costs from automated spam loops.
* **WhatsApp Conversation Fee Guard**: Enforce daily session limiters (maximum of 5 AI responses per day for non-booking chat pings) to mitigate conversation cost runs from user spam.
* **Whisper Audio Cost Cap**: Reject OpenAI Whisper audio transcription on incoming voice notes longer than 45 seconds and filter duplicate webhook pings to prevent redundant API token charges.

---

## 4. Production Deployment & Infrastructure Requirements
* **Connection Pooling**: Use PostgreSQL connection pooling (e.g. Neon connection pooling or Supabase PgBouncer) to prevent serverless connection exhaustion.
* **Docker Multi-Stage Optimization**: The production `Dockerfile` must utilize multi-stage builds and prune all developer dependencies (`npm prune --production`) before packaging to keep image size minimized.
* **Active Health Checks**: Provide `/api/v1/health` endpoint returning `200 OK` to assist container monitoring.

---

## 5. Pilot Salon Onboarding & Activation Requirements
* **Setup Seeding**: Automatically seed a default set of services (Haircut, Spa Massage) and a default staff member when a new salon signs up.
* **AI Prompt Personalization**: Ensure the `Salon.aiPrompt` database field captures specific salon branding rules, price points, and address coordinates.
* **Pilot Dry-Run Testing**: Require a 10-message shadow chat test with dummy bookings to verify prompt accuracy and transactional integrity before mapping to a live customer WhatsApp number.

---

## 6. Non-Goals for MVP
* **Native Mobile Apps**: Providing separate iOS and Android native apps for client booking (web & WhatsApp are the only channels).
* **Voice Call Receptionist**: Automated phone calls via Twilio/VAPI (Whisper voice note transcription on WhatsApp remains in-scope, but real-time telephone voice agents are out of scope).
