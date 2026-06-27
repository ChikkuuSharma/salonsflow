---
baseline_commit: NO_VCS
---

# Story 6.1: Stripe Billing Setup and Plans Sync

Status: done

## Story

As a Salon Owner,
I want my subscription plan changes in Stripe to synchronize automatically with SalonFlow,
so that my operational limits are dynamically updated in the dashboard.

## Acceptance Criteria

1. **Stripe Webhook Endpoint**:
   - Create a NestJS controller endpoint `POST /api/v1/webhooks/stripe`.
   - Validate incoming payloads against the `stripe-signature` header using the official `stripe` SDK and `STRIPE_WEBHOOK_SECRET` environment variable.
   - Reject missing or mismatched signatures with `400 Bad Request`.
   - Access the raw request body buffer to verify signatures correctly (standard NestJS request parsing adjustment).

2. **Database Syncing Logic**:
   - Parse Stripe subscription events: `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
   - Extract `salonId` from subscription metadata (`subscription.metadata.salonId`).
   - Upsert/update the `Subscription` table record mapping:
     - `plan`: Map price/product ID from Stripe metadata or price mappings to `SubscriptionPlan` enum (`FREE`, `BASIC`, `PRO`).
     - `status`: Map Stripe status (`active`, `trialing` -> `ACTIVE`; `canceled`, `unpaid` -> `CANCELED`; `past_due` -> `PAST_DUE`).
     - `stripeCustomerId` and `currentPeriodEnd`.

3. **Offline Local Bypass / Mock Mode**:
   - If `STRIPE_WEBHOOK_SECRET` is not configured, fallback to log warning and bypass signature checks for easier local operator testing.

4. **Automated Testing**:
   - Create `stripe-webhook.controller.spec.ts` to assert signature validation failures, correct parsing of subscription objects, and database synchronization behavior.

## Tasks / Subtasks

- [x] Task 1: Setup Stripe Library & Webhook Controller (AC: 1, 3)
  - [x] Install the `stripe` npm dependency in the NestJS backend.
  - [x] Configure NestJS main.ts to expose the raw request body buffer for Stripe verification.
  - [x] Create `StripeWebhookController` under `POST /api/v1/webhooks/stripe`.
  - [x] Implement signature validation using `stripe.webhooks.constructEvent`.
- [x] Task 2: Implement Subscription Database Sync (AC: 2)
  - [x] Create `StripeWebhookService` to handle webhook event payloads.
  - [x] Map Stripe events to `Subscription` prisma upsert queries.
  - [x] Handle price-ID to plan-enum resolution logic.
- [x] Task 3: Implement Unit and Integration Tests (AC: 4)
  - [x] Create `stripe-webhook.controller.spec.ts` testing validations and event routing.
  - [x] Verify full test suite execution passes.
  - [x] Ensure backend compilations build with zero warnings/errors.

## Dev Notes

- **Stripe Package**: Install `stripe` package: `npm install stripe` in backend.
- **NestJS Raw Body**: Ensure the NestJS server is configured to capture the raw body for the webhook route:
  ```typescript
  // Example in main.ts
  const app = await NestFactory.create(AppModule, { rawBody: true });
  ```
- **References**:
  - [Source: schema.prisma (Subscription model)](file:///c:/Users/Devender%20Sharma/AppData/Local/Temp/antigravity-scratch/salonflow/backend/prisma/schema.prisma#L64-L75)
  - [PRD Requirements: Epic 6 (Stripe Premium Subscription)](file:///c:/Users/Devender%20Sharma/AppData/Local/Temp/antigravity-scratch/salonflow/_bmad-output/planning-artifacts/prd.md#epic-6-stripe-premium-subscription-billing)
