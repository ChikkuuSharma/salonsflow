# Feature Status Dashboard: SalonFlow

This dashboard tracks the status of all product features, cataloging them from ideation to production rollout.

---

## 1. Feature Status Summary Table

| Feature Name | Module | Current Status | Release Stage | Plan Level |
| :--- | :--- | :---: | :---: | :---: |
| **Multi-Tenancy Scoping** | Core DB | **Completed** | Deployed | FREE |
| **Clerk Auth Sync Webhook** | Infrastructure | **Completed** | Deployed | FREE |
| **Daily Metrics Charts** | Dashboard UI | **Completed** | Deployed | FREE |
| **Missed Call booking** | Telephony | **Completed** | Deployed | BASIC |
| **AI Reviews Collection** | Retention | **Completed** | Deployed | BASIC |
| **Rebooking Rules & Queue** | Retention | **Completed** | Deployed | PRO |
| **Hinglish Intent Engine** | NLP Receptionist | **Completed** | Deployed | BASIC |
| **Voice Note Whisper Transcripts** | NLP Receptionist | **Completed** | Deployed | PRO |
| **Stripe Plans Subscription** | Billing | **Completed** | Deployed | FREE |
| **Multi-staff automatic allocation** | Scheduling | *Planned* | Backlog | PRO |
| **WhatsApp Direct Payment Link** | Payment | *Planned* | Backlog | PRO |

---

## 2. Status Definitions

*   **Planned**: Feature specified in PRD but not yet in development.
*   **In Progress**: Actively being coded.
*   **Testing**: Implementation complete; undergoing unit, E2E, and regression verification.
*   **Completed**: All verification passed; ready for production deployment.
*   **Deployed**: Active in the production environment.
*   **Deprecated**: Obsolete features removed from codebase.

---

## 3. Active Staging & Staged Features Details

### Completed & Deployed
All core MVP (Epic 1-6) and Phase-2 Growth (Epic 7) features are fully compiled, verified via Jest, and deployed:
*   *Missed Call Webhook handler & logs page* (Telephony)
*   *Reviews redirection redirector & configuration panel* (Reviews)
*   *Rebooking Rules upsert & recommendations queue* (Rebooking)
*   *Whisper transcription pipeline & audio logs panel* (Voice Notes)

### Planned (Roadmap Backlog)
*   *Multi-staff split allocation*: Automatic load balancing of overlapping bookings across free service providers.
*   *In-chat payment checkout link*: Generates Stripe checkout link inside WhatsApp chat right after slot confirmation.
