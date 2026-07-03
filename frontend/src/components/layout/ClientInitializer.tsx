"use client";

import { useEffect } from "react";

export function ClientInitializer() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        let finalInput = input;
        const currentHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
        
        if (currentHostname !== "localhost") {
          if (typeof input === "string" && input.includes("localhost:3001")) {
            finalInput = input.replace("localhost:3001", `${currentHostname}:3001`);
          } else if (input instanceof URL && input.href.includes("localhost:3001")) {
            finalInput = new URL(input.href.replace("localhost:3001", `${currentHostname}:3001`));
          } else if (input && typeof input === "object" && "url" in input) {
            try {
              const reqObj = input as any;
              if (reqObj.url && reqObj.url.includes("localhost:3001")) {
                const newUrl = reqObj.url.replace("localhost:3001", `${currentHostname}:3001`);
                finalInput = new Request(newUrl, reqObj);
              }
            } catch (e) {}
          }
        }

        const url = typeof finalInput === "string"
          ? finalInput
          : (finalInput instanceof URL ? finalInput.href : (finalInput as any).url || "");

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
        return originalFetch(finalInput, init);
      };
    }
  }, []);

  return null;
}
