# Security Documentation: SalonFlow Platform

This guide documents the security architecture, authentication guards, data separation rules, signature verifications, and concurrency locks in SalonFlow.

---

## 1. Multi-Tenant Isolation (Logical Database Separation)

*   **Shared Database Architecture**: SalonFlow uses a single PostgreSQL database. Multi-tenant isolation is enforced logically.
*   **Service-Layer Scoping**: Every Prisma query must append the `salonId` filter context.
    ```typescript
    where: { salonId }
    ```
*   **Audit Logging**: Every tenant mutation logs an entry in `AuditLog` containing the tenant `salonId`, the acting `userId` (if dashboard-initiated), the action code, and transaction details.

---

## 2. Authentication and Authorization Guardrails

*   **Clerk Auth Guard**: The backend API blocks incoming HTTP requests using `ClerkAuthGuard` which verifies Clerk JWT signatures.
*   **Role-Based Access Control (RBAC)**: Salon users are bound to a `Role` (`OWNER`, `MANAGER`, `RECEPTIONIST`). Highly sensitive billing operations are restricted to `OWNER` roles.
*   **Local Developer Bypass**: For sandbox development and offline testing, the system permits bypass headers if the Authorization token matches `dev-bypass-token`. This bypass maps requests to a seed salon profile.

---

## 3. Webhook Cryptographic Signatures

### Meta WhatsApp Webhook Validation
Inbound WhatsApp messages at `POST /api/v1/webhooks/whatsapp` are validated using Meta's `x-hub-signature-256` header.
*   **Mechanism**: The backend computes the HMAC SHA256 checksum of the raw JSON body using the configured `WHATSAPP_APP_SECRET`.
*   **Rejection**: Payloads failing signature equality or missing signature headers are rejected immediately with `401 Unauthorized`.

### Telephony Missed Call Signature Validation
Missed calls at `POST /api/v1/webhooks/missed-call` are protected using custom signature tokens.
*   **Mechanism**: Telco requests must provide a signature token in the `x-signature` header matching the environment `MISSED_CALL_SECRET`.

---

## 4. Insecure Direct Object Reference (IDOR) Protection

Before compiling mutations or booking schedules, controllers validate that all referenced foreign IDs belong to the tenant:
*   `AppointmentsController`: Inspects `customerId`, `serviceId`, and `staffId` in the request body. If any referenced record maps to a different `salonId`, the request is rejected with `BadRequestException('Invalid ID')`.
*   This prevents malicious tenants from rescheduling appointments belonging to other salons.

---

## 5. Booking Concurrency Protection (Double-Booking Prevention)

To prevent Time-of-Check to Time-of-Use (TOCTOU) race conditions:
*   **Advisory Locks**: The slot reservation query executes inside a `prisma.$transaction` block.
*   **Pessimistic Locking**: An advisory lock is acquired on the slot range. Overlapping checks and insertion transactions block concurrent executions, guaranteeing that slot confirmations are serialized.
