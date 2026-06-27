---
baseline_commit: NO_VCS
---

# Story 5.1: Target Segmenting and Filtered Listings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Salon Owner,
I want to segment my customers using predefined activity filters,
so that I can target bulk WhatsApp campaigns to specific customer groups (like frequent visitors or inactive clients).

## Acceptance Criteria

1. **Query Parameter Enhancement**:
   - Update `GET /api/v1/customers` endpoint to support an optional `segment` query parameter.
   - Allowed values: `all_customers`, `inactive_30_days`, `frequent_visitors`.
   - If `segment` is not provided, default behavior must list all customers (same as `all_customers`).
   - If an invalid segment value is supplied, reject the request with `400 BadRequestException` returning the message `"Invalid segment value. Choose from: all_customers, inactive_30_days, frequent_visitors"`.

2. **Database Query Filtering Mapping**:
   - **`all_customers`**: Returns all customers for the salon.
   - **`inactive_30_days`**: Returns customers whose `lastVisit` date is older than 30 days relative to the query timestamp (e.g. `lastVisit <= NOW - 30 days`).
   - **`frequent_visitors`**: Returns customers whose `totalVisits` is equal to or greater than `5` (`totalVisits >= 5`).

3. **Query Combination & Scoping**:
   - Segments filtering must combine cleanly with the existing search parameters (`search`). The search term should match the customer's name or phone number case-insensitively within the selected segment.
   - Ensure the segment filtering strictly respects the authenticated `salonId` tenant containment.

4. **Automated Testing**:
   - Write comprehensive unit tests for `CustomersService.findAll` verifying segment and search parameter mapping inside a new file `customers.service.spec.ts`.
   - Update `customers.controller.spec.ts` with integration test assertions verifying that invalid segment values return `400 Bad Request`.

## Tasks / Subtasks

- [x] Task 1: Update Customers Service & Controller Logic (AC: 1, 2, 3)
  - [x] Modify `CustomersService.findAll` to accept `segment?: string` parameter.
  - [x] Implement Prisma query condition mappings for the three segment types.
  - [x] Validate and throw `BadRequestException` for invalid segment query parameters inside the `CustomersController.findAll` controller.
- [x] Task 2: Implement Unit and Integration Tests (AC: 4)
  - [x] Create `customers.service.spec.ts` adjacent to the service to mock Prisma and verify segment query boundaries.
  - [x] Update `customers.controller.spec.ts` to test segment controller validation logic.
- [x] Task 3: Build & Validation
  - [x] Run `npm run test` and verify 100% green status.
  - [x] Run `npm run build` on the backend and ensure compilation compiles with zero errors.

### Review Findings

- [x] [Review][Patch] Inactive customers with no visits are omitted [backend/src/customers/customers.service.ts:19]
- [x] [Review][Patch] Missing unit test for 'all_customers' segment [backend/src/customers/customers.service.spec.ts:38]

## Dev Notes

- **Date Cutoff Calculation**: To calculate the 30-day cutoff, use `new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)`.
- **Pre-existing patterns**: Follow the established tenant scoping validation using `req.user.salonId` helper mappings inside the controller.

### Project Structure Notes

- Files to modify:
  - [customers.service.ts](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/src/customers/customers.service.ts)
  - [customers.controller.ts](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/src/customers/customers.controller.ts)
  - [customers.controller.spec.ts](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/src/customers/customers.controller.spec.ts)
- Files to create:
  - [customers.service.spec.ts](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/src/customers/customers.service.spec.ts)

### References

- [Source: prisma.schema (Customer model)](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/backend/prisma/schema.prisma#L91-L106)
- [PRD Requirements: Epic 5 (Bulk Marketing Campaigns)](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/_bmad-output/planning-artifacts/prd.md#epic-5-bulk-marketing-campaigns--broadcasts)

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

- Jest argument count discrepancy resolved by updating controller mock assertions to include `undefined` third parameter in non-segmented test cases.

### Completion Notes List

- Updated `CustomersService.findAll` to parse `segment?: string` query parameters.
- Implemented date cutoff calculations (`lte: 30 days ago`) for `inactive_30_days` segment filters.
- Implemented visitation counts threshold checks (`gte: 5 visits`) for `frequent_visitors` segment filters.
- Enforced segment validations inside the `CustomersController.findAll` route handler, rejecting invalid queries with `BadRequestException`.
- Created comprehensive `customers.service.spec.ts` unit tests and appended validation mock checks in `customers.controller.spec.ts`.

### File List

- `backend/src/customers/customers.service.ts` (Modified)
- `backend/src/customers/customers.controller.ts` (Modified)
- `backend/src/customers/customers.controller.spec.ts` (Modified)
- `backend/src/customers/customers.service.spec.ts` (New)
