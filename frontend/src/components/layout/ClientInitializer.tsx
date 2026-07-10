"use client";

import { useEffect } from "react";
import { getInitialMockDb } from "./mockData";

export function ClientInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Ensure database is initialized in localStorage
      if (!localStorage.getItem("mock_db")) {
        localStorage.setItem("mock_db", JSON.stringify(getInitialMockDb()));
      }

      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        let finalInput = input;
        const currentHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
        
        if (currentHostname !== "localhost" && currentHostname !== "127.0.0.1") {
          const targetBackend = "https://api.salonsflow.in";
          if (typeof input === "string" && input.includes("localhost:3001")) {
            finalInput = input.replace("http://localhost:3001", targetBackend).replace("localhost:3001", targetBackend);
          } else if (input instanceof URL && input.href.includes("localhost:3001")) {
            finalInput = new URL(input.href.replace("http://localhost:3001", targetBackend).replace("localhost:3001", targetBackend));
          } else if (input && typeof input === "object" && "url" in input) {
            try {
              const reqObj = input as any;
              if (reqObj.url && reqObj.url.includes("localhost:3001")) {
                const newUrl = reqObj.url.replace("http://localhost:3001", targetBackend).replace("localhost:3001", targetBackend);
                finalInput = new Request(newUrl, reqObj);
              }
            } catch (e) {}
          }
        }

        const url = typeof finalInput === "string"
          ? finalInput
          : (finalInput instanceof URL ? finalInput.href : (finalInput as any).url || "");

        // Mock Database handler
        const handleMockDatabase = (reqUrl: string, method: string, reqBody?: any): Response | null => {
          try {
            const dbStr = localStorage.getItem("mock_db") || JSON.stringify(getInitialMockDb());
            const db = JSON.parse(dbStr);

            // 1. Auth Demo Login
            if (reqUrl.includes("/api/v1/auth/demo/login")) {
              return new Response(JSON.stringify({ token: "dev-bypass-token-demo" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 2. Auth Demo Reset
            if (reqUrl.includes("/api/v1/auth/demo/reset")) {
              const freshDb = getInitialMockDb();
              localStorage.setItem("mock_db", JSON.stringify(freshDb));
              return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 3. Salons Me User
            if (reqUrl.includes("/api/v1/salons/me/user")) {
              return new Response(JSON.stringify(db.user), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }



            // 5. Analytics Metrics
            if (reqUrl.includes("/api/v1/analytics/metrics")) {
              return new Response(JSON.stringify(db.metrics), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 6. Analytics UCIS
            if (reqUrl.includes("/api/v1/analytics/ucis")) {
              return new Response(JSON.stringify(db.ucis), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 7. Analytics Staff Utilization
            if (reqUrl.includes("/api/v1/analytics/staff-utilization")) {
              return new Response(JSON.stringify(db.staffUtilization), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 8. Analytics Recovery Metrics
            if (reqUrl.includes("/api/v1/analytics/recovery-metrics")) {
              return new Response(JSON.stringify(db.recoveryMetrics), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 9. Appointments Staff
            if (reqUrl.includes("/api/v1/appointments/staff")) {
              return new Response(JSON.stringify(db.staff), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 10. Appointments Waiting List
            if (reqUrl.includes("/api/v1/appointments/waiting-list")) {
              if (method === "POST" && reqBody) {
                const bodyObj = typeof reqBody === "string" ? JSON.parse(reqBody) : reqBody;
                const newEntry = { id: "w_" + Date.now(), ...bodyObj };
                db.waitingList.push(newEntry);
                db.metrics.waitlistCount = db.waitingList.length;
                localStorage.setItem("mock_db", JSON.stringify(db));
                return new Response(JSON.stringify(newEntry), { status: 201, headers: { "Content-Type": "application/json" } });
              }
              return new Response(JSON.stringify(db.waitingList), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 11. Appointments
            if (reqUrl.includes("/api/v1/appointments")) {
              return new Response(JSON.stringify(db.appointments), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 12. Unified Customer Lookup
            if (reqUrl.includes("/api/v1/customers/unified/")) {
              const parts = reqUrl.split("/");
              const customerId = parts[parts.length - 1];
              const cust = db.customers.find((c: any) => c.id === customerId) || db.customers[0];
              
              const profile = {
                id: cust.id,
                name: cust.name,
                phone: cust.phone,
                gender: "Male",
                dateOfBirth: "1995-08-15",
                notes: "Regular client. Prefers weekend slots.",
                source: "WhatsApp AI",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                appointments: [
                  {
                    id: "ap_mock_1",
                    startTime: new Date().toISOString(),
                    service: { name: "Premium Haircut", price: 500 },
                    staff: { name: "Amit Verma" },
                    bookingSource: "WhatsApp AI",
                    amountPaid: 500,
                    status: "Completed"
                  }
                ],
                conversations: [
                  {
                    id: "conv_mock_1",
                    messages: [
                      { id: "msg_1", content: "Hi, need a haircut.", direction: "INBOUND", timestamp: new Date().toISOString() },
                      { id: "msg_2", content: "Sure, I have Amit Verma free at 5 PM today.", direction: "OUTBOUND", timestamp: new Date().toISOString() }
                    ]
                  }
                ],
                metrics: {
                  totalVisits: cust.visits || 5,
                  totalRevenue: cust.totalSpend || 2500,
                  lastVisit: cust.lastVisit || new Date().toISOString(),
                  preferredServices: ["Premium Haircut"],
                  preferredStaff: ["Amit Verma"],
                  lifetimeValue: cust.totalSpend || 2500,
                  bookingFrequencyDays: 28,
                  onlineRatio: 80,
                  offlineRatio: 20
                }
              };
              return new Response(JSON.stringify(profile), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 13. Customers
            if (reqUrl.includes("/api/v1/customers")) {
              return new Response(JSON.stringify(db.customers), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 14. Services
            if (reqUrl.includes("/api/v1/services")) {
              if (method === "POST" && reqBody) {
                const bodyObj = typeof reqBody === "string" ? JSON.parse(reqBody) : reqBody;
                const newServ = { id: "s_" + Date.now(), ...bodyObj };
                db.services.push(newServ);
                localStorage.setItem("mock_db", JSON.stringify(db));
                return new Response(JSON.stringify(newServ), { status: 201, headers: { "Content-Type": "application/json" } });
              }
              return new Response(JSON.stringify(db.services), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 15. Voice Notes
            if (reqUrl.includes("/api/v1/voice-notes")) {
              return new Response(JSON.stringify(db.voiceNotes), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 16. Reviews
            if (reqUrl.includes("/api/v1/reviews/campaigns")) {
              return new Response(JSON.stringify(db.reviews), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 17. Rebookings Rules
            if (reqUrl.includes("/api/v1/rebookings/rules")) {
              return new Response(JSON.stringify(db.rebookingRules), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 18. Rebookings Recommendations
            if (reqUrl.includes("/api/v1/rebookings/recommendations")) {
              return new Response(JSON.stringify(db.rebookingRecommendations), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 19. Rebookings Services
            if (reqUrl.includes("/api/v1/rebookings/services")) {
              return new Response(JSON.stringify(db.services), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 20. POS Drawer Summary
            if (reqUrl.includes("/api/v1/pos/drawer-summary")) {
              return new Response(JSON.stringify({ active: true, balance: 2500, salesToday: 1850 }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 21. POS Checkout
            if (reqUrl.includes("/api/v1/pos/checkout")) {
              return new Response(JSON.stringify({ success: true, invoiceId: "inv_mock_1" }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 22. POS Invoice
            if (reqUrl.includes("/api/v1/pos/invoice")) {
              return new Response(JSON.stringify({
                invoiceId: "inv_mock_1",
                customerName: "Walk-in Customer",
                date: new Date().toISOString(),
                items: [
                  { name: "Premium Haircut", price: 500, quantity: 1 }
                ],
                tax: 90,
                discount: 0,
                total: 590,
                paymentMethod: "CASH"
              }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 23. Conversations
            if (reqUrl.includes("/api/v1/conversations")) {
              return new Response(JSON.stringify(db.conversations), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 24. Commissions
            if (reqUrl.includes("/api/v1/commissions")) {
              return new Response(JSON.stringify(db.commissions), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }

            // 25. Reports
            if (reqUrl.includes("/api/v1/reports")) {
              return new Response(JSON.stringify(db.reports), {
                status: 200,
                headers: { "Content-Type": "application/json" }
              });
            }



          } catch(e) {
            console.error("Local database error:", e);
          }
          return null;
        };

        // Check if we should directly intercept (e.g. demo token/login)
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const isDemoToken = storedToken === "dev-bypass-token-demo" || (storedToken && storedToken.startsWith("dev-bypass-token-user-"));
        const isDemoLoginAttempt = url.includes("/api/v1/auth/demo/login");

        if (url.includes("/api/v1/")) {
          // If authorization header doesn't exist, inject token
          if (storedToken) {
            if (!init) {
              init = {};
            }
            if (!init.headers) {
              init.headers = {};
            }
            if (init.headers instanceof Headers) {
              if (!init.headers.has("Authorization")) {
                init.headers.set("Authorization", `Bearer ${storedToken}`);
              }
            } else if (Array.isArray(init.headers)) {
              let hasAuth = false;
              for (let i = 0; i < init.headers.length; i++) {
                if (init.headers[i][0] === "Authorization") hasAuth = true;
              }
              if (!hasAuth) {
                init.headers.push(["Authorization", `Bearer ${storedToken}`]);
              }
            } else {
              const headers = init.headers as Record<string, string>;
              if (!headers["Authorization"]) {
                headers["Authorization"] = `Bearer ${storedToken}`;
              }
            }
          }

          // Force local mock if we are in demo user session
          if (isDemoToken || isDemoLoginAttempt || storedToken === "dev-bypass-token") {
            const mockRes = handleMockDatabase(url, init?.method || "GET", init?.body);
            if (mockRes) return mockRes;
          }

          // Fallback to local mock on server failures (CORS, 502 Bad Gateway)
          try {
            const actualRes = await originalFetch(finalInput, init);
            if (actualRes.status >= 502) {
              const mockRes = handleMockDatabase(url, init?.method || "GET", init?.body);
              if (mockRes) {
                console.warn("Backend returned server error. Falling back to local offline mock database.");
                return mockRes;
              }
            }
            return actualRes;
          } catch (fetchErr) {
            const mockRes = handleMockDatabase(url, init?.method || "GET", init?.body);
            if (mockRes) {
              console.warn("Connection to backend failed. Falling back to local offline mock database.");
              return mockRes;
            }
            throw fetchErr;
          }
        }

        return originalFetch(finalInput, init);
      };
    }
  }, []);

  return null;
}
