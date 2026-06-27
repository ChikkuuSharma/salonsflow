# QA Tracker & Bug Log: SalonFlow Platform

This tracker logs identified bugs, security vulnerabilities, UX issues, their severity, and verification/closure status.

---

## 1. Active & Resolved Logs

| ID | Issue Title | Severity | Component | Status | Resolution / Validation |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **BUG-001** | Unhandled Review loop exceptions | Medium | reviews.service.ts | **Resolved** | Wrapped inner loop inside a `try/catch` block to protect other salons/appointments from a single AI error. |
| **BUG-002** | Unhandled Rebooking loop exceptions | Medium | rebookings.service.ts | **Resolved** | Wrapped salon loops in `try/catch` inside `processRebookingEngine()` for fault isolation. |
| **BUG-003** | Empty service dropdown list state | Low | rebooking/page.tsx | **Resolved** | Rendered fallback `<option>` showing "No services configured" if list length is empty. |
| **BUG-004** | Double booking slot race conditions | High | appointments.service.ts | **Resolved** | Enforced Postgres advisory locking inside `$transaction` blocks to serialize concurrent slot checks. |
| **BUG-005** | Stripe signature verification bypass | High | stripe-webhook.controller.ts | **Resolved** | Configured raw-body parsing parsing rules and signature checks for Stripe webhooks. |
| **BUG-006** | IDOR Cross-Tenant slot creation | High | appointments.controller.ts | **Resolved** | Added checks validating that reference IDs match the requester's authenticated `salonId` before booking. |

---

## 2. Test Execution Regression History

All regression testing is verified by Jest mock suites.

### Verification Run Log (2026-06-03)
*   **Total Test Suites**: 19
*   **Total Test Cases**: 119
*   **Failed Cases**: 0
*   **Outcome**: **100% Pass**

### Coverage Standards
*   Every new controller and service file must be accompanied by a `.spec.ts` unit test.
*   Mock Prisma dependencies using Jest mock definitions to prevent database connection pollution.
