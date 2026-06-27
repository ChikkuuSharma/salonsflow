# Adversarial Security & Deployment Audit — SalonFlow PRD

This adversarial audit evaluates the gaps between the SalonFlow PRD, the physical NestJS/Next.js codebase implementation, and production launch requirements.

---

## 1. Mismatches Between PRD & Current Codebase
*   **Disabled Auth Guards**: The PRD specifies strict Clerk authorization guards (`ClerkAuthGuard`) for all dashboard endpoints. However, in the codebase layout (`layout.tsx`), the guards were bypassed with static local mock tokens. This represents a direct violation of the security requirements.
*   **Non-existent Field Crash**: The analytics reporting controller queried a non-existent database field (`createdAt` instead of `timestamp` on the `Message` model), making the analytics endpoint crash immediately. The PRD lacks a schema traceability matrix to catch model naming drift.
*   **Hollow Placeholders**: The PRD lists "timeline scheduler" and "customer directory" as completed MVP features. In reality, the bookings calendar and conversations views are static visual mockups with "Coming Soon" placeholders, showing a mismatch between PRD statements and actual code capabilities.

---

## 2. Missing Security Requirements
*   **Input Sanitization Gateways**: The PRD completely omits input validation requirements. The NestJS API lacks a global `ValidationPipe` setup, exposing database endpoints to schema injection.
*   **API Rate Limiting**: There are no rate-limiting guidelines for incoming webhooks. A simple loop script flooding `/api/v1/webhooks/whatsapp` would crash the database connection pool or exhaust OpenAI key budgets.
*   **OpenAI Cost Caps**: The PRD lacks operational constraints for AI tokens, leaving the salon vulnerable to runaway billing from spam loops.

---

## 3. WhatsApp Production & Meta API Requirements
*   **Webhook Signature Bypass Vulnerability**: The codebase comments out the signature check return guard. An attacker can send unauthenticated payloads directly to the booking webhook.
*   **Meta Onboarding Credentials**: The PRD does not define how permanent Meta Business Access Tokens, verified Phone IDs, and webhook handshake parameters are secure-stored and mapped.

---

## 4. Deployment & Pilot Onboarding Gaps
*   **Docker devTools Hoisting**: The production Dockerfile hoists devDependencies, increasing image size by ~400MB and introducing package vulnerabilities.
*   **Connection Pooling**: Serverless Next.js functions risk exhausting PostgreSQL connections. The PRD does not specify pooled proxy requirements (e.g. Supabase, Neon).
*   **Pilot Shadow Period Rules**: The PRD lacks onboarding guidelines. There are no rules for pre-launch dry-runs (testing prompts with dummy bookings) before routing live client queries to the AI receptionist.
