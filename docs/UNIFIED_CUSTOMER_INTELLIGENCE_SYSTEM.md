# 📊 Unified Customer Intelligence System (UCIS) Specification

This document provides the complete product, architectural, database, API, and business specification for the **Unified Customer Intelligence System (UCIS)** for the SalonFlow platform.

---

## 1. Product Requirements Document (PRD)

### 1.1 Product Vision & Objective
Most traditional salon management platforms isolate digital bookings (WhatsApp, Web) from manual walk-in or telephone bookings, forcing salon owners to bridge the data gap manually. UCIS positions SalonFlow as the **single source of truth** by allowing seamless entry of offline clients, auto-merging profiles, and performing cross-channel analytics.

### 1.2 Functional Requirements

#### Feature 1: Offline Customer Entry Module
*   **FR-1.1 (Access Control)**: Salon staff can access a manual entry screen under `Dashboard > Customers > Add Offline Customer`.
*   **FR-1.2 (Fields Captured)**:
    *   *Name*: Text (Required)
    *   *Mobile Number*: Text/Phone format (Required)
    *   *Gender*: Dropdown (Male, Female, Non-binary, Prefer Not to Say)
    *   *Date of Birth*: Date picker (Optional)
    *   *Visit Date*: Date & Time picker (Default to current time)
    *   *Services Taken*: Multi-select service dropdown (linked to `Service` model)
    *   *Amount Paid*: Numeric input (Defaults to sum of selected service prices, editable for custom discounts)
    *   *Staff Member*: Dropdown (linked to `Staff` model)
    *   *Notes*: Textarea (Optional)
    *   *Customer Source*: Dropdown (Walk-in, Phone Call, Referral, Instagram, Facebook, Google, WhatsApp, Existing Customer, Other)

#### Feature 2: Unified Customer Profile
*   **FR-2.1 (Profile Merging)**: If an offline customer is added with a phone number that matches an existing online (WhatsApp/AI) customer, the platform merges their transaction histories into a single profile.
*   **FR-2.2 (Profile Metrics Dashboard)**: The customer profile page displays:
    *   *Total Visits*: Sum of all online and offline appointments.
    *   *Total Revenue*: Sum of all payments.
    *   *Last Visit*: Timestamp of the most recent visit.
    *   *Preferred Services*: Top 3 most frequently booked service types.
    *   *Preferred Staff*: Top 2 most frequently assigned stylists.
    *   *Lifetime Value (LTV)*: Cumulative revenue generated.
    *   *Booking Frequency*: Average days between appointments.
    *   *Online vs. Offline Ratio*: Visual percentage split of online bookings vs. offline manual entries.

#### Feature 3: Advanced Business Dashboard
*   **FR-3.1 (Multi-Channel Analytics)**: Dashboard widgets displaying:
    *   *Revenue Breakdown*: Online Revenue vs. Offline Revenue.
    *   *Customer Acquisition Source*: Walk-in, Referral, Instagram, Facebook, Google, WhatsApp, Other.
    *   *Engagement Metrics*: Repeat Customer %, Customer Retention Rate %, Average Ticket Size, and Customer LTV.

#### Feature 4: Downloadable Reports
*   **FR-4.1 (Format Support)**: Export data to CSV, Excel (`.xlsx`), and PDF formats.
*   **FR-4.2 (Time Filters)**: Supports Daily, Weekly, Monthly, Quarterly, and Yearly aggregation parameters.

#### Feature 5: AI Business Insights
*   **FR-5.1 (Automated Insights Engine)**: The dashboard displays AI-curated performance tips:
    *   *"65% of your revenue comes from walk-in customers."*
    *   *"Hair Spa customers have 2.3x higher retention."*
    *   *"Google leads convert 40% better than Instagram."*

#### Feature 6: Customer Segmentation Engine
*   **FR-6.1 (Dynamic Segments)**: Automate categorization of customers into:
    *   *High Value / VIP*: Top 10% spending tier.
    *   *Repeat*: Customers with $\ge 3$ visits.
    *   *Lost*: No visits in the last 60 days.
    *   *New*: First visit in the last 14 days.
    *   *Walk-in Only* vs. *WhatsApp Only*.

#### Feature 7: AI Marketing Integration
*   **FR-7.1 (WhatsApp Targeting)**: Enable salon owners to select a segment (e.g. *Lost Customers*) and dispatch pre-approved WhatsApp templates containing scheduling triggers directly from the dashboard.

---

## 2. Database Schema Changes (Prisma Schema)

To avoid creating redundant tables, the existing `Customer` and `Appointment` models are extended to support offline characteristics.

```prisma
// --- prisma/schema.prisma Updates ---

// 1. Extend Customer model
model Customer {
  id          String   @id @default(uuid())
  salonId     String
  name        String
  phone       String
  totalVisits Int      @default(0)
  lastVisit   DateTime?
  
  // New UCIS Fields
  gender      String?  // MALE, FEMALE, NON_BINARY, PREFER_NOT_TO_SAY
  dateOfBirth DateTime?
  notes       String?
  source      String   @default("WHATSAPP") // WALK_IN, PHONE, REFERRAL, INSTAGRAM, FACEBOOK, GOOGLE, WHATSAPP, OTHER
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  salon       Salon    @relation(fields: [salonId], references: [id], onDelete: Cascade)
  appointments Appointment[]
  // ... other relations
}

// 2. Extend Appointment model to support offline logs & custom pricing
model Appointment {
  id            String            @id @default(uuid())
  salonId       String
  customerId    String
  serviceId     String
  staffId       String?
  startTime     DateTime
  endTime       DateTime
  status        AppointmentStatus @default(PENDING)
  
  // New UCIS Fields
  bookingSource String            @default("ONLINE_WHATSAPP") // ONLINE_WHATSAPP, ONLINE_AI, OFFLINE_WALKIN, OFFLINE_PHONE, OFFLINE_DESK, OFFLINE_OTHER
  amountPaid    Float?            // Actual money paid (stores final discounted price)
  notes         String?
  createdById   String?           // Staff/User who recorded this offline entry (Optional)
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  
  salon         Salon             @relation(fields: [salonId], references: [id], onDelete: Cascade)
  customer      Customer          @relation(fields: [customerId], references: [id], onDelete: Cascade)
  service       Service           @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  staff         Staff?            @relation(fields: [staffId], references: [id], onDelete: SetNull)
  // ... other relations
}
```

---

## 3. API Design

All endpoints are secured behind the unified `ClerkAuthGuard` and enforce tenant scoping via the request-bound `salonId`.

### 3.1 Create Offline Customer & Record Visit
*   **Endpoint**: `POST /api/v1/customers/offline`
*   **Request Headers**: `Authorization: Bearer <token>`
*   **Request Payload**:
    ```json
    {
      "name": "Arjun Mehta",
      "phone": "+919812345678",
      "gender": "MALE",
      "dateOfBirth": "1994-08-15T00:00:00.000Z",
      "visitDate": "2026-06-10T05:30:00.000Z",
      "serviceId": "svc_haircut_123",
      "amountPaid": 450.00,
      "staffId": "stf_rahul_456",
      "source": "WALK_IN",
      "notes": "Prefers scissors over trimmers."
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "customerId": "cust_arjun_789",
      "appointmentId": "apt_visit_999",
      "merged": false
    }
    ```

### 3.2 Fetch Unified Customer Profile
*   **Endpoint**: `GET /api/v1/customers/unified/:id`
*   **Response (200 OK)**:
    ```json
    {
      "id": "cust_arjun_789",
      "name": "Arjun Mehta",
      "phone": "+919812345678",
      "gender": "MALE",
      "source": "WALK_IN",
      "metrics": {
        "totalVisits": 5,
        "totalRevenue": 2450.00,
        "lastVisit": "2026-06-10T05:30:00.000Z",
        "preferredServices": ["Premium Haircut", "Head Massage"],
        "preferredStaff": ["Rahul Stylist"],
        "lifetimeValue": 2450.00,
        "bookingFrequencyDays": 22,
        "onlineRatio": 20.0,
        "offlineRatio": 80.0
      }
    }
    ```

### 3.3 Fetch UCIS Analytics Dashboard
*   **Endpoint**: `GET /api/v1/analytics/ucis`
*   **Response (200 OK)**:
    ```json
    {
      "revenue": {
        "online": 12450.00,
        "offline": 23500.00,
        "ratio": { "online": 34.6, "offline": 65.4 }
      },
      "acquisition": {
        "walk_in": 45,
        "whatsapp": 20,
        "google": 15,
        "instagram": 12,
        "referral": 8
      },
      "averages": {
        "ticketSize": 680.00,
        "repeatCustomerRate": 58.3,
        "retentionRate": 72.1
      }
    }
    ```

---

## 4. Dashboard Wireframe

### 4.1 "Add Offline Customer" Form Modal
```text
+-------------------------------------------------------------+
| Add Offline Customer                                    [X] |
+-------------------------------------------------------------+
|  Name:           [ Arjun Mehta                            ] |
|  Mobile:         [ +919812345678                          ] |
|  Gender:         (o) Male   ( ) Female   ( ) Other          |
|  Date of Birth:  [ 15 / 08 / 1994 ]                         |
|  Source:         [ Walk-in                    [V] ]         |
|  Visit Date:     [ 10 / 06 / 2026 ]  Time: [ 11:00 AM ]     |
|  Service Taken:  [ Premium Haircut            [V] ]         |
|  Amount Paid:    [ 450.00 ]  (Base Price: 500.00)           |
|  Stylist:        [ Rahul Stylist              [V] ]         |
|  Notes:          [ Prefers scissors over trimmers         ] |
+-------------------------------------------------------------+
|                      [ Cancel ]  [ Save & Log Transaction ] |
+-------------------------------------------------------------+
```

### 4.2 "Unified Customer Profile" Page Layout
```text
+---------------------------------------------------------------------------------+
| Arjun Mehta | LTV: ₹2,450.00 | Visits: 5 | Last: 10 June 2026                   |
+---------------------------------------------------------------------------------+
|  [ Profile Details ]                 |  [ Channel Split ]                       |
|  - Phone: +919812345678              |  ======================                  |
|  - DOB: 15 Aug 1994                  |  Offline: 80% (████████░░)               |
|  - Source: Walk-in                   |  Online:  20% (██░░░░░░░░)               |
|  - Preferred Stylist: Rahul Stylist  |                                          |
+---------------------------------------------------------------------------------+
|  [ Appointment History ]                                                        |
|  Date         Service             Stylist       Source      Paid      Status    |
|  10 Jun 2026  Premium Haircut     Rahul S.      Walk-in     ₹450      COMPLETED |
|  18 May 2026  Head Massage        Amit K.       WhatsApp    ₹300      COMPLETED |
+---------------------------------------------------------------------------------+
```

---

## 5. Revenue Impact Analysis

UCIS expands the SalonFlow value model to capture offline revenue streams:
*   **Transactional Split Monetization**: SalonFlow can charge a processing fee (e.g. 0.5%) on offline transactions logged in the system, or lock it behind the PRO subscription tier.
*   **Churn Mitigation**: By capturing walk-ins, the AI Rebooking engine targets 100% of the customer base instead of only the 30% booking online, resulting in an estimated **15-20% increase in repeat bookings**.
*   **Higher Tier Conversion**: Positioning AI Insights and Customer Segmentation as PRO features drives BASIC tier salons to upgrade to unlock automated WhatsApp outreach workflows.

---

## 6. Competitor Comparison

| Feature | SalonFlow (UCIS) | Fresha | Zenoti | Vagaro |
| :--- | :--- | :--- | :--- | :--- |
| **Online/Offline Unity** | Yes (WhatsApp + POS) | Basic POS | Complete ERP | Basic POS |
| **Acquisition Tracking** | WhatsApp & Manual | Manual only | Custom Analytics | Manual only |
| **Conversational Moat** | AI WhatsApp Booking | None (App-only) | SMS reminders only| SMS reminders only|
| **AI Insights** | Tailored Tier 2/3 tips| Static metrics | Enterprise only | None |

---

## 7. Plan Classification & Feature Gating

1.  **BASIC Plan (₹2,500/mo)**
    *   Manual offline customer module.
    *   Unified database isolation.
    *   Static multi-channel reports.
2.  **AI PRO Plan (₹7,500/mo)**
    *   Dynamic customer segmentation.
    *   AI-generated insights panel.
    *   AI Rebooking engine outreach integration.
3.  **ENTERPRISE Plan (Custom Quote)**
    *   Multi-branch franchise data consolidation.
    *   Cross-location customer search.

---

## 8. Development Roadmap & Sprint Breakdown

### Sprint 1: Database Setup & API Foundations (Backend)
- Add schema migrations for `Customer` and `Appointment` models.
- Build `POST /api/v1/customers/offline` and `GET /api/v1/customers/unified/:id` controllers.
- Write Jest service checks confirming zero cross-tenant leaks.

### Sprint 2: Frontend Offline Entry Module & Layouts
- Build "Add Offline Customer" modal form with React validation hook.
- Implement unified profiles rendering page layouts.

### Sprint 3: Advanced Dashboard Charts & Reports Export
- Build multi-channel revenue and customer segmentation widgets using Recharts.
- Build CSV, Excel, and PDF export worker scripts on backend.

### Sprint 4: AI Insights Panel & WhatsApp Outbound outreach
- Wire OpenAI GPT-4o analytics engine to evaluate monthly sales and generate insights.
- Connect WhatsApp templates campaign manager to customer segmentation lists.

---

## 9. Risk Assessment

*   **Risk 1: Profile Duplication**: Staff might add an offline customer using a typo-ridden number (e.g. missing `+91`), causing duplicate profile logs.
    *   *Mitigation*: Implement phone number normalization filters (e.g., removing spaces and forcing standard country prefixes) before checking database keys.
*   **Risk 2: AI Token Costs on Large Datasets**: Processing historical tables through OpenAI prompts will incur massive API bills.
    *   *Mitigation*: Store pre-aggregated daily/weekly analytics in cache, sending only clean JSON metrics to the LLM instead of raw transaction lines.
