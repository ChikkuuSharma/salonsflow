---
baseline_commit: NO_VCS
---

# Story 1.2: Database-Level Concurrency Locking & Uniqueness

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Salon Owner,
I want the platform's booking engine to enforce database-level transactional locks or uniqueness constraints,
so that duplicate concurrent booking requests for the same time slot and staff member are physically blocked at the database layer.

## Acceptance Criteria

1. **Database-Level Concurrency Safeguards (FR10)**:
   - Implement database-level safety to prevent concurrent booking conflicts (overlapping time slots for the same staff member/salon).
   - This must be implemented via one of two techniques:
     - **Pessimistic Locking**: Acquire a transactional row lock (e.g., using a raw SQL advisory lock `pg_advisory_xact_lock` or `SELECT ... FOR UPDATE` on the Staff/Salon record) inside the transaction before checking availability.
     - **PostgreSQL Exclusion Constraints**: Add a native PostgreSQL exclusion constraint using the `gist` index type to prevent overlapping intervals (`tsrange(startTime, endTime)`).
   - Note: Because staffId is optional in the schema (`staffId String?`), the locking/constraint mechanism must handle null staff values gracefully (e.g. defaulting to a salon-wide slot lock or global tenant lock if no staff is specified).

2. **Transaction Rollback & Exception Translation**:
   - If a concurrent conflict is detected at the database layer (e.g., a unique constraint violation, exclusion constraint violation, or lock timeout), the transaction must roll back cleanly.
   - Catch the database exception (e.g., Prisma unique constraint error code `P2002` or exclusion violation error) and translate it into a NestJS standard `BadRequestException` with a user-friendly message (`"Requested time slot is no longer available."`).

3. **Security Audit Log for Booking Conflicts (NFR5)**:
   - When a concurrent booking collision occurs (caught by application validation or database constraint rollbacks), log a structured security event:
     - Record a database row in the `AuditLog` table with `action: 'BOOKING_CONFLICT'`.
     - Log a warning using the NestJS `Logger` containing `[SECURITY_AUDIT_FAIL]` to flag the collision.

4. **Testing Concurrency & Race Conditions**:
   - Write integration/E2E test scripts or Jest unit tests mocking concurrent promises (`Promise.all`) to verify that two overlapping booking transactions executed simultaneously result in exactly one success and one rollback/exception.

## Tasks / Subtasks

- [x] Task 1: Research and Choose Locking Mechanism (AC: 1)
  - [x] Evaluate implementing a Postgres advisory lock (e.g., hash of `salonId` and `staffId`) inside Prisma transactions.
  - [x] Draft a Prisma raw SQL execution call to acquire the transaction-level lock: `await tx.$executeRaw` with `SELECT pg_advisory_xact_lock(...)`.
- [x] Task 2: Refactor Appointments Service and Controller (AC: 2, 3)
  - [x] Update `AppointmentsService.createAppointment` and `createBookingTransaction` to acquire the database-level lock at the very beginning of the `$transaction` block.
  - [x] Add try-catch block wrapping the database write, intercepting locking/constraint errors and translating them to `BadRequestException`.
  - [x] Ensure any conflict triggers a structured `BOOKING_CONFLICT` security log via `PrismaService.logSecurityEvent`.
- [x] Task 3: Concurrency Testing (AC: 4)
  - [x] Write a test in `appointments.service.spec.ts` using `Promise.all` calling `createAppointment` concurrently to verify collision guard behavior.

### Review Findings

- [x] [Review][Patch] Unfiltered staffId in Overlap Queries [backend/src/appointments/appointments.service.ts:224]
- [x] [Review][Patch] Lock Key Mismatch Race Condition [backend/src/appointments/appointments.service.ts:220]

## Dev Notes

- **PostgreSQL Advisory Locks**: You can generate a 64-bit integer hash from strings using PostgreSQL's `hashtext()` function, or compute a CRC32/FNV hash in TypeScript to pass to `pg_advisory_xact_lock(bigint)`.
- **Database Rollbacks**: Advisory locks acquired with `pg_advisory_xact_lock` are transaction-scoped and automatically released when the transaction ends (on commit or rollback).

### Project Structure Notes

- Files to modify:
  - [appointments.service.ts](file:///c:/Users/Devender%20Sharma/backend/src/appointments/appointments.service.ts)
  - [appointments.service.spec.ts](file:///c:/Users/Devender%20Sharma/backend/src/appointments/appointments.service.spec.ts)

### References

- [Project Context: NestJS & Prisma Rules](file:///c:/Users/Devender%20Sharma/_bmad-output/project-context.md#nestjs--prisma-orm-backend)
- [PRD Requirements: Epic 4 (Concurrency Booking Double-Lock)](file:///c:/Users/Devender%20Sharma/_bmad-output/planning-artifacts/prd.md#epic-4-quality-hardening--security-remediation)

## Dev Agent Record

### Agent Model Used

gemini-2.5-pro

### Debug Log References

- Mock `tx.$executeRaw` error resolved by defining the mock function inside `mockPrismaService`.
- Replaced direct `auditLog.create` assertion with `logSecurityEvent` verification to align with refactored service-level security audit rules.

### Completion Notes List

- Implemented database-level pessimistic transaction advisory locks in `AppointmentsService.createAppointment` and `AppointmentsService.createBookingTransaction` using Postgres `pg_advisory_xact_lock`.
- Resolved optional `staffId` nullability by dynamically defaulting the advisory lock to the `salonId` hash to prevent global scheduling collisions when no staff provider is explicitly selected.
- Configured exception handlers to intercept lock collisions and database constraint errors, transactionally rolling back bookings and translating errors into user-friendly NestJS `BadRequestException` instances.
- Standardized security audit logs for conflicts: triggered `PrismaService.logSecurityEvent` to print warnings prefixed with `[SECURITY_AUDIT_FAIL]` and record persistent rows in `AuditLog`.
- Wrote concurrent promise verification integration tests using `Promise.all` in `appointments.service.spec.ts` to simulate lock serialization and confirm one-success-one-rollback behaviors.

### File List

- `backend/src/appointments/appointments.service.ts` (Modified)
- `backend/src/appointments/appointments.service.spec.ts` (Modified)
