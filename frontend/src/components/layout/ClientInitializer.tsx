"use client";

import { useEffect } from "react";

export function ClientInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === "string"
          ? input
          : (input instanceof URL ? input.href : (input as any).url || "");

        // Only intercept backend API requests to prevent polluting external requests (like Clerk)
        if (url.includes("/api/v1/")) {
          const storedToken = localStorage.getItem("auth_token");
          if (storedToken) {
            if (!init) {
              init = {};
            }
            if (!init.headers) {
              init.headers = {};
            }
            
            if (init.headers instanceof Headers) {
              const authHeader = init.headers.get("Authorization");
              if (authHeader === "Bearer dev-bypass-token" || !authHeader) {
                init.headers.set("Authorization", `Bearer ${storedToken}`);
              }
            } else if (Array.isArray(init.headers)) {
              let hasAuth = false;
              for (let i = 0; i < init.headers.length; i++) {
                if (init.headers[i][0] === "Authorization") {
                  hasAuth = true;
                  if (init.headers[i][1] === "Bearer dev-bypass-token") {
                    init.headers[i][1] = `Bearer ${storedToken}`;
                  }
                }
              }
              if (!hasAuth) {
                init.headers.push(["Authorization", `Bearer ${storedToken}`]);
              }
            } else {
              const headers = init.headers as Record<string, string>;
              if (headers["Authorization"] === "Bearer dev-bypass-token" || !headers["Authorization"]) {
                headers["Authorization"] = `Bearer ${storedToken}`;
              }
            }
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return null;
}
