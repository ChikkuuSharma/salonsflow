# Financial Projection: Cost of First 2 Months After Deployment

This document projects the total cost of ownership (TCO) for the first **two months** immediately following the deployment of the SalonFlow SaaS platform. Calculations are based on data compiled from:
*   [financial_analysis_report.md](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/financial_analysis_report.md) - Core financial cost structures.
*   [aws_cost_projections.md](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/aws_cost_projections.md) - Cloud scale hosting projections.
*   [cost_reduction_strategy.md](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/cost_reduction_strategy.md) - GPT-4o-mini prompt cache optimizations.
*   [pre_launch_audit.md](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/pre_launch_audit.md) - Audit matrix and onboarding parameters.

All monetary valuations are presented in both **Indian Rupees (INR)** and **US Dollars (USD)** at an assumed exchange rate of 1 USD = 83 INR.

---

## 1. Rollout Timeline Context

As mapped out in the [DEPLOYMENT_ROADMAP.md](file:///c:/Users/Devender%20Sharma/.gemini/antigravity/scratch/salonflow/docs/DEPLOYMENT_ROADMAP.md), the operational focus for the initial launch is divided into two distinct periods:

```
  Launch Date
       │
       ▼
┌────────────── Month 1 ──────────────┐   ┌────────────── Month 2 ──────────────┐
│  Phase 1: Setup & Configuration     │   │  Phase 3: Alpha Onboarding          │
│  Phase 2: Closed Shadow Verification│   │  - 10 Active Pilot Salons           │
│  - Sandbox/Dry-runs (Low API use)   │   │  - Live POS Checkouts Active        │
│  - No Customer Billing (0 Revenue)  │   │  - Regular API usage                │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

---

## 2. One-Time Launch Expenses (CapEx)

These non-recurring costs occur in Month 1 to transition the platform from local environments to production:
*   **Play Store & App Store Developer Accounts**: ₹10,500 ($126)
*   **Domain Registration & Wildcard SSL (2 Years)**: ₹3,500 ($42)
*   **Meta Business Verification & WhatsApp Setup**: ₹0
*   **Total Setup CapEx**: **₹14,000 ($168)**

*Note: Pre-existing engineering labor costs (₹5,66,000 / $6,819) have already been accounted for during development and are not included in these deployment cash-outflow calculations.*

---

## 3. Comparison of Infrastructure Host Stack Options

We model two deployment options based on system requirements and scale targets:

### Option A: Lightweight Web Deploy (Render Pro + Vercel Pro + AWS RDS PostgreSQL)
Designed for low-cost pilot hosting, grouping database states with standard web containers.

| Fixed Component | Monthly Spec | Cost (INR) | Cost (USD) |
| :--- | :--- | :---: | :---: |
| **Database** | AWS RDS PostgreSQL (db.t4g.medium) | ₹6,600 | $80 |
| **Backend API** | Render Pro Web Service | ₹1,250 | $15 |
| **Frontend UI** | Vercel Pro Team Plan | ₹1,660 | $20 |
| **Identity / Auth** | Clerk Auth Standard Plan | ₹2,080 | $25 |
| **Asset CDN** | AWS S3 / CloudFront | ₹830 | $10 |
| **Total Fixed Host Cost**| **Option A Stack** | **₹12,420** | **$150 / mo** |

### Option B: Enterprise Cloud Deploy (AWS ECS Fargate + RDS Aurora Serverless + Redis)
Highly resilient multi-AZ setup utilizing connection pooling and cost-mitigated private routing endpoints.

| Fixed Component | Monthly Spec | Cost (INR) | Cost (USD) |
| :--- | :--- | :---: | :---: |
| **Compute** | 2 AWS ECS Fargate Tasks (0.25 vCPU, 512MB RAM) | ₹1,328 | $16 |
| **Database** | RDS Aurora Serverless v2 (0.75 ACU average) | ₹6,640 | $80 |
| **Cache Store** | AWS ElastiCache Redis Serverless | ₹1,245 | $15 |
| **Routing / LB** | 1 Application Load Balancer (ALB) | ₹1,867 | $22.50 |
| **Network Gate** | 1 NAT Gateway & Bandwidth | ₹2,905 | $35 |
| **Secrets / Keys**| Secrets Manager & KMS | ₹415 | $5 |
| **Identity / Auth** | Clerk Auth Standard Plan | ₹2,080 | $25 |
| **Frontend UI** | Vercel Pro Team Plan | ₹1,660 | $20 |
| **Total Fixed Host Cost**| **Option B Stack** | **₹18,140** | **$218.50 / mo** |

---

## 4. Variable API & Conversational Costs

Variable costs scale dynamically based on real messaging volume and AI translations.

### Message & Webhook Rates:
1.  **WhatsApp Cloud API**: ₹0.29 / Service chat, ₹0.30 / Utility chat, ₹0.72 / Marketing campaign chat.
2.  **OpenAI GPT-4o-Mini**: ~₹0.015 per chat node.
3.  **OpenAI Whisper Voice Transcription**: ₹0.50 ($0.006) per minute.
4.  **Telco Missed Call Webhook**: ₹0.10 per webhook callback.

### Variable Cost Scenarios:
*   **Month 1 (Sandbox Shadowing & Dev Testing)**: Under closed verification, variable testing volume is limited. Total volume estimated at 2,500 total interactions under shadow simulation.
    *   *Meta WhatsApp API (Sandbox sandbox bypass)*: ₹450 ($5.50)
    *   *OpenAI GPT & Whisper Translations*: ₹450 ($5.50)
    *   *Telco Webhook Callbacks*: ₹100 ($1.00)
    *   **Month 1 Variable Total**: **₹1,000 ($12)**
*   **Month 2 (Alpha Onboarding - 10 Salons, 50 chats/day per salon)**: Full pilot activation running 15,000 conversation sessions total.
    *   *Meta WhatsApp API (12k Service, 2k Utility, 1k Marketing)*: ₹4,800 ($58)
    *   *OpenAI GPT completions & Whisper transcribe*: ₹2,580 ($31)
    *   *Telco Webhook Callbacks*: ₹400 ($5)
    *   **Month 2 Variable Total**: **₹7,780 ($94)**

---

## 5. First 2 Months Cost Breakdown

### Case 1: Total Cost Using Lightweight Stack (Option A)

```mermaid
graph TD
    subgraph Option A Month 1: ₹27,420
        M1FixedA[Fixed Hosting: ₹12,420]
        M1VarA[Variable API: ₹1,000]
        M1SetupA[One-Time Setup: ₹14,000]
    end
    subgraph Option A Month 2: ₹20,200
        M2FixedA[Fixed Hosting: ₹12,420]
        M2VarA[Variable API: ₹7,780]
    end
```

*   **Month 1 Outflow**:
    *   Fixed Hosting: ₹12,420 ($150)
    *   Variable Usage: ₹1,000 ($12)
    *   One-time CapEx Setup: ₹14,000 ($168)
    *   *Total Month 1 Cost*: **₹27,420 ($330)**
*   **Month 2 Outflow**:
    *   Fixed Hosting: ₹12,420 ($150)
    *   Variable Usage: ₹7,780 ($94)
    *   *Total Month 2 Cost*: **₹20,200 ($244)**

> [!TIP]
> **Total Option A 2-Month Outflow: ₹47,620 ($574)**

---

### Case 2: Total Cost Using Enterprise Stack (Option B)

```mermaid
graph TD
    subgraph Option B Month 1: ₹33,140
        M1FixedB[Fixed Hosting: ₹18,140]
        M1VarB[Variable API: ₹1,000]
        M1SetupB[One-Time Setup: ₹14,000]
    end
    subgraph Option B Month 2: ₹25,920
        M2FixedB[Fixed Hosting: ₹18,140]
        M2VarB[Variable API: ₹7,780]
    end
```

*   **Month 1 Outflow**:
    *   Fixed Hosting: ₹18,140 ($218.50)
    *   Variable Usage: ₹1,000 ($12)
    *   One-time CapEx Setup: ₹14,000 ($168)
    *   *Total Month 1 Cost*: **₹33,140 ($398.50)**
*   **Month 2 Outflow**:
    *   Fixed Hosting: ₹18,140 ($218.50)
    *   Variable Usage: ₹7,780 ($94)
    *   *Total Month 2 Cost*: **₹25,920 ($312.50)**

> [!TIP]
> **Total Option B 2-Month Outflow: ₹59,060 ($711)**

---

## 6. Financial Health & Net Margins (Month 2)

As the 10 pilot salons are onboarded in Month 2, the business launches active subscription billing:

| Subscription Price Point | Total Revenue (10 Salons) | Net Margin (Option A Stack) | Net Margin (Option B Stack) |
| :--- | :--- | :---: | :---: |
| **Basic Level** (@ ₹5,000 / mo) | ₹50,000 ($602) | **+₹29,800 (59.6%)** | **+₹24,080 (48.1%)** |
| **Standard Level** (@ ₹7,500 / mo) | ₹75,000 ($903) | **+₹54,800 (73.0%)** | **+₹49,080 (65.4%)** |
| **Premium Level** (@ ₹10,000 / mo) | ₹1,00,000 ($1,204) | **+₹79,800 (79.8%)** | **+₹74,080 (74.0%)** |

> [!IMPORTANT]
> **Profitability Inbound**
> Even under the enterprise AWS stack, onboarding just **10 pilot salons** at the ₹7,500/month subscription tier generates a healthy gross operating margin of **65.4%** in Month 2, covering the entire infrastructure cost of Month 1 (including setup CapEx).
