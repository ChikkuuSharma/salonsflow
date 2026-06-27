---
baseline_commit: NO_VCS
---

# Story 5.2: WhatsApp Template Campaigns Scheduling and Broadcasts

Status: done

## Story

As a Salon Owner,
I want to schedule and broadcast message templates to selected customer segments,
so that I can reach out to multiple clients simultaneously over WhatsApp with marketing promotions.

## Acceptance Criteria

1. **API Endpoints Setup**:
   - Create `POST /api/v1/campaigns` to schedule/dispatch campaigns.
   - Create `GET /api/v1/campaigns` to list historical campaigns for the salon.
   - Enforce authentication via `@UseGuards(ClerkAuthGuard)` and guarantee tenant containment using `salonId`.

2. **Campaign Broadcasting Logic**:
   - Validate input payload: `name` (non-empty string), `content` (non-empty string), `targetSegment` (valid segment: `all_customers`, `inactive_30_days`, `frequent_visitors`).
   - Query targeted customers for the salon matching the selected segment using `CustomersService.findAll`.
   - Dispatch messages to all matching customers via `WhatsappService.sendMessage`.
   - Save the `Campaign` record in the database with `name`, `content`, `targetSegment`, and the total `sentCount` corresponding to the number of targeted customers.

3. **Automated Testing**:
   - Write unit tests in `campaigns.service.spec.ts` to verify campaign saving, correct segment customer lookup, and `WhatsappService` invocations.
   - Write integration tests in `campaigns.controller.spec.ts` to assert that invalid payloads return `400 Bad Request` and authentication guards are applied.

## Tasks / Subtasks

- [x] Task 1: Create Campaigns Module, Service, & Controller (AC: 1, 2)
  - [x] Implement `CampaignsService.create` to look up segment customers, send WhatsApp messages, and save the campaign.
  - [x] Implement `CampaignsService.findAll` to retrieve campaigns by `salonId`.
  - [x] Set up `CampaignsController` with authentication and tenant context guards.
  - [x] Register `CampaignsModule` in `app.module.ts`.
- [x] Task 2: Implement Unit and Integration Tests (AC: 3)
  - [x] Create `campaigns.service.spec.ts` to mock Prisma/Whatsapp and assert dispatch logic.
  - [x] Create `campaigns.controller.spec.ts` to test input validation and guards.
- [x] Task 3: Build & Validation
  - [x] Run `npm run test` and verify 100% green status.
  - [x] Run `npm run build` on the backend and ensure compilation compiles with zero errors.

### Review Findings

- [x] [Review][Patch] Sequential await blocks campaign creation [backend/src/campaigns/campaigns.service.ts:50]

## Dev Notes

- **Target Table**: Save campaign logs in the `Campaign` table.
- **WhatsApp Dispatch**: Inject and invoke `WhatsappService.sendMessage(phone, content)` from `WhatsappService`.
- **References**:
  - [Source: schema.prisma (Campaign model)](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/prisma/schema.prisma#L187-L198)
  - [PRD Requirements: Epic 5 (Bulk Marketing Campaigns)](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/_bmad-output/planning-artifacts/prd.md#epic-5-bulk-marketing-campaigns--broadcasts)

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

- None.

### Completion Notes List

- Implemented `CampaignsService` mapping templates and broadcasts.
- Implemented `CampaignsController` with route guards and validation.
- Created `campaigns.service.spec.ts` testing DB states, lookup scopes, and dispatch.
- Created `campaigns.controller.spec.ts` verifying input bounds.
- Registered `CampaignsModule` in `app.module.ts`.

### File List

- `backend/src/campaigns/campaigns.service.ts` (New)
- `backend/src/campaigns/campaigns.controller.ts` (New)
- `backend/src/campaigns/campaigns.module.ts` (New)
- `backend/src/campaigns/campaigns.service.spec.ts` (New)
- `backend/src/campaigns/campaigns.controller.spec.ts` (New)
- `backend/src/app.module.ts` (Modified)
