# PRD Quality Review — SalonFlow MVP

## Overall verdict
The SalonFlow PRD successfully covers the core database multi-tenancy, AI booking engine, and transactional safety parameters of the application. However, it exhibits major functional gaps regarding production operations (live chat manual takeover, marketing campaigns, settings provisioning, and subscription billing) which are already present as database models or UI placeholders in the codebase. It also completely omits deployment architecture, pilot salon onboarding guidelines, and API hardening standards required for launch.

## 1. Decision-readiness — adequate
The PRD states key requirements for tenant separation, webhook validation, and transaction locks. However, critical decisions around billing, human takeover, and rate-limiting limits are missing or left as implicit assumptions rather than documented trade-offs.

### Findings
*   **[high]** Missing Multi-Tenant Verification Details (§ Section 3) — The IDOR containment requirement specifies that data leaks must not exist, but fails to define the controller-level behavior when cross-tenant resource IDs are injected. *Fix:* Specify that controllers must perform pre-query validation checks on all referenced customer, service, and staff IDs, rejecting invalid IDs with `400 Bad Request`.
*   **[medium]** Lack of Error Handling Decisions (§ Section 2) — The PRD does not define how AI parsing exceptions or database transaction rollbacks should behave from a user experience standpoint. *Fix:* Specify that transaction conflicts return user-friendly slots-busy errors to WhatsApp clients.

## 2. Substance over theater — strong
The requirements avoid "persona theater" and generic fluff. The focus remains on functional engineering requirements (e.g. database transactions, Clerk token validation, and OpenAI tools).

## 3. Strategic coherence — adequate
The thesis of using an AI receptionist to resolve booking overhead is well reflected in Epic 3. However, the connection between the AI webhook receptionist and the operational dashboard console (manual takeover, calendar, and analytics) is loosely defined, weakening the unified strategic arc.

### Findings
*   **[high]** Absence of Live Operations & Takeover Requirements (§ Section 2) — The PRD defines the AI booking loop, but omits requirements for the "HUMAN_TAKEOVER" transition, leaving the live conversation dashboard console without a specification. *Fix:* Add functional requirements for staff to visually inspect chat logs and toggle the AI receptionist ON/OFF.

## 4. Done-ness clarity — thin
Several requirements rely on vague outcomes (e.g. "secure database structure," "verifying uniqueness," "graceful fallbacks") rather than testable conditions.

### Findings
*   **[critical]** Vague Validation & Checksum Rules (§ Section 3) — The HMAC check specifies verification of signatures but lacks the exact actions when signature mismatches occur. *Fix:* Define that invalid signatures must immediately terminate processing and return `401 Unauthorized` to the client.
*   **[high]** No Performance or Boundary Thresholds (§ Section 3) = Vague "concurrency locking" statement lacks specifications for rollback mechanisms. *Fix:* Specify that overlapping bookings must rollback the entire transaction and emit conflict warning logs.

## 5. Scope honesty — thin
The PRD contains no "Non-Goals" section, creating ambiguity around what is excluded from the MVP (e.g. Stripe payment capture, multi-staff calendar allocation).

### Findings
*   **[high]** Missing Non-Goals for MVP (§ Section 1) — Out of scope modules are not declared, leading to misalignment on whether campaign broadcasts and premium subscriptions are launch blockers. *Fix:* Add an explicit "Non-Goals for MVP" subsection identifying Stripe integration and automated follow-ups as post-pilot enhancements.

## 6. Downstream usability — adequate
Globally numbered stable IDs are used (e.g., Epic 1, Epic 2). However, there is no formal glossary, leading to slight naming deviations between the PRD (e.g., "timeline scheduler") and the implementation (e.g., "bookings calendar").

## 7. Shape fit — adequate
The PRD is structured as a SaaS product. However, as a brownfield project, it fails to reference existing schema tables (`Campaign`, `Subscription`, `Reminder`) and does not align its requirements with the actual implemented code structures.

### Findings
*   **[high]** Mismatch between DB Schema and PRD Scope (§ Section 2) — The Prisma schema implements campaign broadcasting and cron-based reminders, but the PRD contains no functional requirements for these modules. *Fix:* Add an operational campaigns section mapping inactive customer segments to template broadcast workflows.

## Mechanical notes
*   No glossary is present to unify definitions of "Tenant," "Customer," "Booking," and "User."
*   No Assumptions Index is provided.
