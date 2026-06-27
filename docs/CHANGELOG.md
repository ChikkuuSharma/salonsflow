# Changelog: SalonFlow Platform

All notable changes to the SalonFlow codebase are documented here.

---

## [Phase 2] - 2026-06-03

### Added
*   **Missed Call Webhook Controller**: Added `POST /api/v1/webhooks/missed-call` to capture telco pings and automate welcomed message triggers. Added listing log endpoint `GET /api/v1/webhooks/missed-call`.
*   **Reviews Module & Click Redirector**: Added `ReviewsService` to scan completed bookings. Added click tracker `GET /api/v1/webhooks/review-click/:campaignId` redirecting to Google Review urls. Registered `ReviewsController` for campaign listings `/api/v1/reviews/campaigns`.
*   **AI Rebooking Engine**: Created `RebookingsService` and `RebookingsController` linking services to interval days, queuing recommendations, and handling auto-send schedules.
*   **Voice Notes Log Controller**: Registered `VoiceNotesController` to expose transcription logs.
*   **Growth Dashboards Frontend Routes**: Added pages for `/missed-calls`, `/reviews`, `/rebooking`, and `/voice-notes` inside the Next.js App Router.
*   **Unit Tests**: Added 20 new tests mapping webhook and growth services.

### Changed
*   **Prisma Database Schema**: Added `MissedCall`, `ReviewCampaign`, `RebookingRule`, `RebookingRecommendation`, and `VoiceNote` entities.
*   **Salons Config Endpoint**: Updated `SalonsController.updateMe` to permit updating `googleReviewLink`, `reviewDelayMins`, and `rebookingAutoSend`.
*   **Sidebar Navigation**: Registered routing links to new growth dashboards.

---

## [MVP Release] - 2026-05-31

### Added
*   **Multi-Tenancy Database Separation**: Multi-tenant schema using strict `salonId` foreign key containment.
*   **Auth Signup Webhooks**: Ingestion of Clerk auth `user.created` webhook to provision new `Salon` records and register owners.
*   **AI WhatsApp Receptionist**: WhatsApp webhook parser combined with OpenAI intent classifier.
*   **Stripe billing plans integration**: Stripe webhook sync mapping checkout events to plan models.
