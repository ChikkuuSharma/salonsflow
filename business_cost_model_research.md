# SaaS Business Cost Model Research: SalonFlow

This document outlines all costs associated with launching, operating, scaling, and managing the SalonFlow SaaS platform for business modeling and financial planning.

---

## 1. Classification of SaaS Costs

To model the business, costs are divided into four main categories:

```
                          ┌───────────────────────────┐
                          │     SaaS Total Costs      │
                          └─────────────┬─────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
    ┌───────────────────────┐                       ┌───────────────────────┐
    │  Capital Exp (CapEx)  │                       │  Operating Exp (OpEx) │
    └───────────┬───────────┘                       └───────────┬───────────┘
                │                                               │
        ┌───────┴───────┐                               ┌───────┴───────┐
        ▼               ▼                               ▼               ▼
  ┌───────────┐   ┌───────────┐                   ┌───────────┐   ┌───────────┐
  │Engineering│   │Licenses/  │                   │Fixed OpEx │   │Variable   │
  │Labor Cost │   │Regulatory │                   │(Hosting)  │   │Usage APIs │
  └───────────┘   └───────────┘                   └───────────┘   └───────────┘
```

---

## 2. One-Time Setup Costs (CapEx)
These are non-recurring development and launch expenses required to make the platform live.

### A. Engineering Labor Costs (Completed & Backlog)
*   **System Architecture Design**: ₹2,00,000 ($2,410) — Scoping data flow, advisory locks, DB relations.
*   **Full-Stack Coding & Implementation**: ₹2,52,000 ($3,036) — Core SaaS controllers, WhatsApp webhook routing, Next.js dashboard, Jest specs.
*   **UX/UI Custom Visualizations**: ₹90,000 ($1,084) — Flow charts, dashboard graphs, simulator pages.
*   **Product Management & PRD Scoping**: ₹60,000 ($723) — MVP and growth milestones.
*   **Total Dev Labor**: **₹6,02,000 ($7,253)**

### B. Regulatory, Registration & Developer Licenses
*   **Google Play Store Developer account**: ₹2,080 ($25) — One-time fee.
*   **Apple App Store Developer account (Annual)**: ₹8,300 ($99) — Recurring annually.
*   **Domain Purchase & Multi-year Wildcard SSL**: ₹3,500 ($42) — Renewed every 2 years.
*   **Total Licenses**: **₹13,880 ($166)**

**Total Capital Expenditures (CapEx): ₹6,15,880 ($7,419)**

---

## 3. Ongoing Fixed Operating Costs (OpEx - Monthly)
These are static infrastructure hosting expenses that do not fluctuate based on the volume of customer bookings or messages.

| Component | Provider / Spec | Monthly Cost (INR) | Annual Cost (INR) | Role in System |
| :--- | :--- | :---: | :---: | :--- |
| **Relational Database** | AWS RDS Postgres (db.t4g.medium) | ₹6,600 | ₹79,200 | Multi-tenant backend state database. |
| **Application Hosting** | Render Pro (Backend Web Service) | ₹1,250 | ₹15,000 | Core NestJS backend router. |
| **Frontend Hosting** | Vercel Pro (Team Level) | ₹1,660 | ₹19,920 | Dashboard pages and static assets routing. |
| **Authentication** | Clerk Auth Standard tier | ₹2,080 | ₹24,960 | Handles user accounts login security. |
| **Backups & Asset CDN** | AWS S3 / CloudFront | ₹830 | ₹9,960 | Stores media audio files and DB dumps. |
| **Total Fixed Hosting** | | **₹12,420** | **₹1,49,040** | **Flat infrastructure overhead** |

---

## 4. Ongoing Variable Operating Costs (OpEx - Usage-Based)
These costs scale dynamically with the number of conversations, appointments booked, and AI requests made.

### Cost Per Message Node / Transaction:

#### A. WhatsApp Cloud API (Meta conversation window charges for India):
*   **Service Conversation (Inbound + AI Chatbot)**: **₹0.29** per 24-hr session.
*   **Utility Conversation (Outbound confirmations/alerts)**: **₹0.30** per 24-hr session.
*   **Marketing Conversation (Broadcast campaigns)**: **₹0.72** per 24-hr session.

#### B. NLP & AI Engine APIs (OpenAI):
*   **GPT-4o-mini completions**: ~₹0.015 per conversation node.
*   **Whisper Speech-to-Text**: **₹0.50 ($0.006) per minute** of voice audio.

#### C. Inbound Telephony (Telco Missed Call Webhook):
*   **Webhook Callback Ping**: **₹0.10** per missed call detection.

---

## 5. Sales, Transaction & Marketing Costs

These are commercial and administrative costs required to run a transactional business.

### A. Payment Gateway Transaction Fees (Stripe India)
*   **Domestic Cards (India)**: 2.0% per transaction.
*   **UPI Payments**: 0.0% to 2.0% depending on route.
*   **International Cards**: 3.0% per transaction + ₹3.
*   *Note: These fees are deducted automatically from customer subscriptions before payouts reach the bank.*

### B. Customer Acquisition Cost (CAC) & Ad-Spend
*   To acquire a salon partner (B2B SaaS model):
    *   **Meta Ads (Lead Gen)**: Projected Cost Per Lead (CPL) of ₹150–₹300.
    *   **Sales Representative Commission**: Standard 10% on Year 1 subscription value.
    *   **Target CAC**: ₹2,500 per paying salon.

---

## 6. Financial Projection Matrix

To analyze profitability, we model three volume tiers across **10 active salons**:

| Metric | Tier 1: Low Volume (50 chats/day) | Tier 2: Mid Volume (100 chats/day) | Tier 3: High Volume (200 chats/day) |
| :--- | :---: | :---: | :---: |
| **Conversations / Month** | 15,000 | 30,000 | 60,000 |
| **Fixed Hosting Cost** | ₹12,420 | ₹12,420 | ₹12,420 |
| **Variable API Cost** | ₹7,780 | ₹15,560 | ₹31,120 |
| **Total Monthly OpEx** | **₹20,200 ($244)** | **₹27,980 ($337)** | **₹43,540 ($525)** |
| **Cost per Salon (OpEx)** | **₹2,020 ($24)** | **₹2,798 ($34)** | **₹4,354 ($52)** |
| **Total Revenue (@₹7,500/mo)** | ₹75,000 ($903) | ₹75,000 ($903) | ₹75,000 ($903) |
| **Gross Profit Margin** | **73.0%** | **62.7%** | **41.9%** |
| **Total Revenue (@₹10,000/mo)** | ₹1,00,000 ($1,204) | ₹1,00,000 ($1,204) | ₹1,00,000 ($1,204) |
| **Gross Profit Margin** | **79.8%** | **72.0%** | **56.5%** |
