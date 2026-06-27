# Epics & Stories: SalonFlow Platform

This guide tracks the development status of all epics and user stories across the SalonFlow ecosystem, including the MVP and Phase-2 growth features.

---

## Epic 1: Multi-Tenant Architecture & Auth Provisioning
*   **Status**: `done`
*   **Story 1.1: Core Database Multi-Tenancy**
    *   *Acceptance Criteria*: PostgreSQL schema with `salonId` tenant containment on all primary entities; Prisma client global caching.
*   **Story 1.2: Clerk Webhook Signup Provisioner**
    *   *Acceptance Criteria*: Clerk `user.created` webhook provisions `Salon` and creates user record as `Role.OWNER` inside a transaction.
*   **Story 1.3: JWT Authentication Guard**
    *   *Acceptance Criteria*: Restrict NestJS controllers behind `ClerkAuthGuard` validating JSON Web Tokens (JWT).

## Epic 2: Operations Dashboard & Analytics
*   **Status**: `done`
*   **Story 2.1: Premium Metrics and Revenue Charts**
    *   *Acceptance Criteria*: Revenue charts and stats fetched from `/api/v1/analytics/metrics` showing revenue, bookings, and customer counts.
*   **Story 2.2: Dynamic Customers Directory**
    *   *Acceptance Criteria*: Searchable customer directory with detail view for visit records and messaging transcripts.

## Epic 3: AI WhatsApp Receptionist (Core Chatbot)
*   **Status**: `done`
*   **Story 3.1: Meta WhatsApp Webhook Callback Handler**
    *   *Acceptance Criteria*: Parse inbound WhatsApp JSON text messages from Meta Cloud API.
*   **Story 3.2: Dual-Engine NLP Classifier**
    *   *Acceptance Criteria*: Classify messages into `BOOKING`, `FAQ`, `HUMAN_TAKEOVER` using OpenAI GPT-4o with regex keyword fallback.
*   **Story 3.3: Transactional Booking Conflict Guard**
    *   *Acceptance Criteria*: Transaction-safe checks to prevent double-booking slot conflicts.

## Epic 4: Quality Hardening & Security Remediation
*   **Status**: `done`
*   **Story 4.1: Cross-Tenant IDOR Protection**
    *   *Acceptance Criteria*: Validate all cross-references (`customerId`, `serviceId`, etc.) match request `salonId`.
*   **Story 4.2: Webhook Signature Enforcement**
    *   *Acceptance Criteria*: Validate `x-hub-signature-256` checksums using configured App Secret.
*   **Story 4.3: Concurrency Booking Double-Lock**
    *   *Acceptance Criteria*: DB advisory lock execution in postgres to block concurrent slot bookings.

## Epic 5: Bulk Marketing Campaigns
*   **Status**: `done`
*   **Story 5.1: Target Segmenting**
    *   *Acceptance Criteria*: Segment filters for "inactive_30_days", "frequent_visitors".
*   **Story 5.2: WhatsApp Broadcasts**
    *   *Acceptance Criteria*: Bulk campaign template creation and scheduling.

## Epic 6: Stripe Billing Subscription
*   **Status**: `done`
*   **Story 6.1: Stripe Plans Sync**
    *   *Acceptance Criteria*: Ingest Stripe checkout webhooks and sync subscription plans.
*   **Story 6.2: Premium Feature Gate Constraints**
    *   *Acceptance Criteria*: Gate campaigns and custom receptionist parameters behind BASIC/PRO subscriptions.

## Epic 7: Phase-2 Market Growth Features
*   **Status**: `done`
*   **Story 7.1: Missed Call Booking Integration**
    *   *Acceptance Criteria*: Telco webhook `/api/v1/webhooks/missed-call` captures missed calls, creates user profile, dispatches WhatsApp welcome message, and logs funnel metrics.
*   **Story 7.2: Automated Review Collection**
    *   *Acceptance Criteria*: Cron scanner finds completed appointments, prompts AI for personalized templates, tracks click redirects through `/api/v1/webhooks/review-click/:campaignId`, and updates stats.
*   **Story 7.3: AI Rebooking Engine**
    *   *Acceptance Criteria*: Upsert recurrence rules (Service -> Interval Days), generate recommendations, expose manual approval dashboard ("Approve & Send"), and support auto-send toggle.
*   **Story 7.4: Multilingual Hinglish & Voice Notes**
    *   *Acceptance Criteria*: Upgraded Hinglish regex chatbot fallback rules; Whisper speech-to-text transcription of WhatsApp voice attachments.
