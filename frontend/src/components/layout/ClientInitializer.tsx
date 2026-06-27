"use client";

import { useEffect } from "react";

export function ClientInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          if (!init) {
            init = {};
          }
          if (!init.headers) {
            init.headers = {};
          }
          
          if (init.headers instanceof Headers) {
            if (init.headers.get("Authorization") === "Bearer dev-bypass-token") {
              init.headers.set("Authorization", `Bearer ${storedToken}`);
            }
          } else if (Array.isArray(init.headers)) {
            for (let i = 0; i < init.headers.length; i++) {
              if (init.headers[i][0] === "Authorization" && init.headers[i][1] === "Bearer dev-bypass-token") {
                init.headers[i][1] = `Bearer ${storedToken}`;
              }
            }
          } else {
            const headers = init.headers as Record<string, string>;
            if (headers["Authorization"] === "Bearer dev-bypass-token" || !headers["Authorization"]) {
              headers["Authorization"] = `Bearer ${storedToken}`;
            }
          }
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  return null;
}
