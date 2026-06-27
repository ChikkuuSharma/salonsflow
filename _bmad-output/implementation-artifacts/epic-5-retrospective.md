# BMad Retrospective Report: Epic 5 - Bulk Marketing Campaigns & Broadcasts

*   **Project**: SalonFlow
*   **Facilitator**: Amelia (Senior Software Engineer)
*   **Project Lead**: Devender Sharma
*   **Date**: 2026-06-02

---

## 1. Epic Review & Delivery Metrics

### Delivery Status
*   **Total Stories**: 2 / 2 (100% completed)
    *   `[STORY-5.1]` Target Segmenting and Filtered Listings: **✅ Completed**
    *   `[STORY-5.2]` WhatsApp Template Campaigns Scheduling and Broadcasts: **✅ Completed**
*   **Quality Metrics**:
    *   **Test Success**: 67 / 67 Jest unit & integration tests passing successfully (100% green status).
    *   **Build Compilation**: Succeeded with `0 errors` across NestJS backend and Next.js frontend.

---

## 2. Technical Review & Lessons Learned

### Successes: What Went Well
*   **Dynamic activity filters**: Built-in `lastVisit` and `totalVisits` filter constraints are mapped directly to database Prisma filters, avoiding heavy table joins.
*   **Timezone-Robust Segmenting**: Calculated cutoff dates using UTC base logic (`new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)`) preventing timezone offsets from corrupting campaign metrics.
*   **Key-Collision Safety**: Replaced unsafe spread queries with robust dynamic `AND` nested search criteria list mappings, preventing parameter overrides during multi-filters.
*   **Parallel Broadcast Dispatches**: Refactored campaigns template broadcasts to use `Promise.all` concurrent execution, speeding up dispatches by orders of magnitude and resolving HTTP timeout risks.

### Challenges: Root Cause Analysis
*   **Sequential Dispatch Bottleneck**: Initial campaign scheduler design executed `await sendMessage` sequentially inside a loop. This would cause HTTP request handlers to hang under large marketing campaigns. Parallelizing execution using concurrent promises mitigates this.
*   **Omission of Inactive Accounts**: Standard `lastVisit <= cutoff` queries failed to capture accounts that had never made a visit (which are technically inactive). Expanding the query to check `lastVisit IS NULL AND createdAt <= cutoff` ensures inactive signups receive promotions.

---

## 3. Next Epic Preparation & Action Items

To prepare for Epic 6: Stripe Premium Subscription Billing, the team has agreed on the following preparation actions:

| ID | Action Item | Priority | Owner | Target Workflow |
|----|-------------|----------|-------|-----------------|
| **ACT-1** | Setup Mock Stripe Webhook Listeners in Dev Mode to prevent online gateway dependencies from blocking offline test validations. | **High** | Amelia (Dev) | Local Development Setup |
| **ACT-2** | Register Stripe Webhook endpoints and create subscription plan sync models/enums (`FREE`, `BASIC`, `PRO`). | **High** | Winston (Arch) | Solutioning / Design |
| **ACT-3** | Implement Middleware Gating constraints mapping campaign and AI scheduling counts to active subscriber plans. | **Medium** | Alice (PO) | Requirements Definition |
