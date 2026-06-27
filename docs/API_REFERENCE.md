# API Reference Guide: SalonFlow

All core API endpoints are structured under `/api/v1/` prefix.

---

## 🔒 Authentication & Tenancy Headers
Protected endpoints require authentication using a Clerk JSON Web Token (JWT) sent via the HTTP Authorization header:
```http
Authorization: Bearer <clerk-jwt-token>
```
During development, a bypass authorization token is mapped:
```http
Authorization: Bearer dev-bypass-token
```
The authenticated tenant ID (`salonId`) is derived securely from the Clerk JWT token payload on the server.

---

## 📁 Endpoints Listing

### 📞 1. Missed Call webhook & Log

#### Record Inbound Missed Call
*   **Method**: `POST`
*   **Path**: `/api/v1/webhooks/missed-call`
*   **Auth**: Public (HMAC Verified via header `x-signature`)
*   **Request Body**:
    ```json
    {
      "phone": "+919999999999",
      "salonId": "salon-uuid-123"
    }
    ```
*   **Response**: `202 Accepted`
    ```json
    { "message": "Missed call received" }
    ```

#### Get Missed Call Log
*   **Method**: `GET`
*   **Path**: `/api/v1/webhooks/missed-call`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": "mc-uuid-abc",
        "phone": "+919999999999",
        "source": "TELCO",
        "status": "CONVERSATION_STARTED",
        "createdAt": "2026-06-03T20:00:00.000Z"
      }
    ]
    ```

---

### ⭐ 2. Automated Reviews

#### Track Review Link Clicks
*   **Method**: `GET`
*   **Path**: `/api/v1/webhooks/review-click/:campaignId`
*   **Auth**: Public
*   **Response**: `302 Found` (Redirects user to `Salon.googleReviewLink` or `https://google.com`)

#### List Review Campaigns
*   **Method**: `GET`
*   **Path**: `/api/v1/reviews/campaigns`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": "rc-uuid-xyz",
        "sentAt": "2026-06-03T18:00:00Z",
        "clickedAt": "2026-06-03T18:05:00Z",
        "completed": true,
        "message": "Hi John, please review Rajesh Salon...",
        "customer": { "name": "John Doe", "phone": "+919999999999" },
        "appointment": {
          "startTime": "2026-06-03T17:00:00Z",
          "service": { "name": "Haircut" }
        }
      }
    ]
    ```

---

### 🔄 3. Rebooking Engine

#### List Rebooking Rules
*   **Method**: `GET`
*   **Path**: `/api/v1/rebookings/rules`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": "rule-uuid-1",
        "serviceId": "srv-uuid-haircut",
        "intervalDays": 30,
        "service": { "name": "Haircut" }
      }
    ]
    ```

#### Upsert Rebooking Rule
*   **Method**: `POST`
*   **Path**: `/api/v1/rebookings/rules`
*   **Auth**: Protected
*   **Request Body**:
    ```json
    {
      "serviceId": "srv-uuid-haircut",
      "intervalDays": 45
    }
    ```
*   **Response**: `201 Created`

#### List Recommendations
*   **Method**: `GET`
*   **Path**: `/api/v1/rebookings/recommendations`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": "rec-uuid-9",
        "dueDate": "2026-07-03T00:00:00Z",
        "status": "PENDING",
        "customer": { "name": "Alice", "phone": "+918888888888" },
        "service": { "name": "Facial", "price": 1200 }
      }
    ]
    ```

#### Approve Recommendation
*   **Method**: `POST`
*   **Path**: `/api/v1/rebookings/recommendations/:id/approve`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    { "success": true }
    ```

---

### 🎙️ 4. Voice Note Logs

#### Get Voice Note Transcripts
*   **Method**: `GET`
*   **Path**: `/api/v1/voice-notes`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    [
      {
        "id": "vn-uuid-1",
        "transcript": "Hello I want to book a haircut for tomorrow evening",
        "durationSecs": 5,
        "mimeType": "audio/ogg",
        "fileSize": 12400,
        "createdAt": "2026-06-03T19:30:00.000Z",
        "message": {
          "conversation": {
            "customer": { "name": "Rahul", "phone": "+917777777777" }
          }
        }
      }
    ]
    ```

---

### 📊 5. Analytics Metrics

#### Fetch Dashboard Growth Stats
*   **Method**: `GET`
*   **Path**: `/api/v1/analytics/metrics`
*   **Auth**: Protected
*   **Response**: `200 OK`
    ```json
    {
      "todayRevenue": 4500,
      "appointmentsToday": 3,
      "aiHandledChats": 24,
      "newCustomers": 2,
      "totalMissedCalls": 15,
      "missedCallConversionRate": 20,
      "missedCallBookings": 3,
      "reviewRequestsSent": 45,
      "reviewLinkClicks": 25,
      "estimatedReviewsGenerated": 10,
      "rebookingsGenerated": 4,
      "rebookingRevenueRecovered": 4800,
      "customersDueForRebooking": 7
    }
    ```
