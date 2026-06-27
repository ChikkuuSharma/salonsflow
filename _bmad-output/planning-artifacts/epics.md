---
stepsCompleted: ["step-1"]
inputDocuments: ["prd.md", "project-context.md", "mvp_readiness_assessment.md", "qa_audit_report.md"]
---

# salonflow - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for salonflow, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

*   **FR1 (IDOR Containment check)**: All controller endpoints mutating data (e.g. manual scheduling creation) must verify that provided `customerId`, `serviceId`, and optional `staffId` match the authenticated `salonId` of the tenant.
*   **FR2 (Webhook Signature Verification)**: WhatsApp webhook handler must enforce signature validation checks matching calculated HMAC-SHA256 headers, rejecting missing or invalid signatures with `401 Unauthorized`.
*   **FR3 (TOCTOU Concurrency Lock)**: Shunt slot availability query checks inside the Prisma atomic transaction callback block (`tx.appointment.findMany`) to prevent concurrent double-booking race conditions.
*   **FR4 (Docker Pruning)**: Refactor backend `Dockerfile` to leverage multi-stage builds and execute `npm prune --production` to minimize deployment image footprint.
*   **FR5 (Connection Pooling)**: Configure backend Prisma connections to target PG pool proxies (e.g. Neon connection pooler) to avoid serverless connection exhaustion.
*   **FR6 (Service Health Check)**: Provide an active health check endpoint `/api/v1/health` returning `200 OK`.
*   **FR7 (Automatic Seeding)**: Automatically seed a default set of services and a default staff member when a new salon signs up.
*   **FR8 (Pilot Shadow dry-run)**: Require a 10-message test booking dry-run using a dummy chatbot number before routing live client queries to the AI receptionist.
*   **FR9 (Service-Layer Filtering)**: All customer, appointment, conversation, campaign, analytics, and audit-log queries must enforce `salonId` filtering at the service layer, not only at the controller layer.
*   **FR10 (Concurrency Double-Lock)**: Appointment creation must be protected against duplicate concurrent booking requests by enforcing database-level uniqueness or transactional locking mechanisms in addition to application-level validation.

### NonFunctional Requirements

*   **NFR1 (Security - Tenant Separation)**: Zero cross-tenant data visibility or modification is allowed.
*   **NFR2 (Security - Payload Sanitization)**: Set up global NestJS `ValidationPipe` interceptors using class-validator decorators to reject unvalidated payloads.
*   **NFR3 (Security - Rate Limiting)**: Set up API throttlers using `nestjs-throttler` to prevent webhook flood DDoS attacks.
*   **NFR4 (Operational - OpenAI Cost Caps)**: Implement usage limits and monthly caps on the OpenAI API keys.
*   **NFR5 (Security Event Logging)**: All security-relevant events (failed authentication, invalid webhook signatures, unauthorized tenant access attempts, and booking conflicts) must be logged with structured audit records for future monitoring and incident investigation.

### Additional Requirements

*   **AR1 (Prisma 7 Compatibility)**: Integrate PostgreSQL driver adapter dependencies (`@prisma/adapter-pg`, `pg`) to prevent Prisma 7 library-engine crashes.
*   **AR2 (Clerk Middleware Sync)**: Align frontend Clerk keys and middleware to FAPI domains to resolve script-loading errors in Next.js.

### UX Design Requirements

*   *None (No visual layout changes required for these security and infrastructure hardening steps)*

### FR Coverage Map

*   **FR1 (IDOR Containment check)**: Epic 4 - Story 4.1
*   **FR2 (Webhook Signature Verification)**: Epic 4 - Story 4.2
*   **FR3 (TOCTOU Concurrency Lock)**: Epic 3 - Story 3.3, Epic 4 - Story 4.3
*   **FR4 (Docker Pruning)**: Epic 4 - Story 4.4 (Deployment/Infra)
*   **FR5 (Connection Pooling)**: Epic 1 - Story 1.1 (Infra setup)
*   **FR6 (Service Health Check)**: Epic 1 - Story 1.1 (Infra health)
*   **FR7 (Automatic Seeding)**: Epic 1 - Story 1.2
*   **FR8 (Pilot Shadow dry-run)**: Epic 3 - Story 3.2
*   **FR9 (Service-Layer Filtering)**: Epic 1 - Story 1.1, Story 1-1 (refinement)
*   **FR10 (Concurrency Double-Lock)**: Epic 4 - Story 4.3, Story 1-2 (refinement)

## Epic List

### Epic 1: Multi-Tenant Architecture & Auth Provisioning
Establish the core PostgreSQL schema with tenant isolation, Clerk auth sync on signups, and route validation guards.
*   **Story 1.1**: Core Database Multi-Tenancy
*   **Story 1.2**: Clerk Webhook Signup Provisioner
*   **Story 1.3**: JWT Authentication Guard

### Epic 2: Operations Dashboard & Analytics
Build dashboard screens rendering revenue metrics, active booking stats, customer listings, and scheduling calendar.
*   **Story 2.1**: Premium Metrics and Revenue Charts
*   **Story 2.2**: Dynamic Customers Directory and Profile Views

### Epic 3: AI WhatsApp Receptionist
Integrate Meta WhatsApp Cloud API webhooks with OpenAI GPT-4o intent classification and transactional Prisma booking checkouts.
*   **Story 3.1**: Meta WhatsApp Webhook Callback Handler
*   **Story 3.2**: Dual-Engine NLP and Local Fallback Service
*   **Story 3.3**: Transactional Booking Conflict Guard

### Epic 4: Quality Hardening & Security Remediation
Enforce strict IDOR cross-tenant access checks, HMAC signature validation on Meta payloads, and database-level pessimistic advisory locks.
*   **Story 4.1**: Cross-Tenant IDOR Protection
*   **Story 4.2**: WhatsApp Webhook Signature Enforcement
*   **Story 4.3**: Concurrency Booking Double-Lock
*   **Story 4.4**: Interactive Chatbot Simulator and Tester Console

### Epic 5: Bulk Marketing Campaigns & Broadcasts
Allow salon owners to target inactive or frequent customer segments and broadcast customized marketing campaign templates via WhatsApp.
*   **Story 5.1**: Target Segmenting and Filtered Listings
*   **Story 5.2**: WhatsApp Template Campaigns Scheduling and Broadcasts

### Epic 6: Stripe Premium Subscription Billing
Integrate Stripe subscription enums, webhook listeners, plans metadata mapping, and dashboard feature limits gating.
*   **Story 6.1**: Stripe Billing Setup and Plans Sync
*   **Story 6.2**: Premium Feature Gate Constraints Gating
