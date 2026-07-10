"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark for regular accounts
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      const isDemo = token === "dev-bypass-token-demo" || (token && token.startsWith("dev-bypass-token-user-")) || token === "dev-bypass-token";
      if (isDemo) {
        setIsDarkMode(false); // Light theme for demo sandbox
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden dark">
        <div className="flex-1 p-6 flex items-center justify-center">
          <span className="text-sm font-semibold">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden transition-colors duration-250",
      isDarkMode ? "bg-zinc-950 text-zinc-100 dark" : "bg-slate-50 text-slate-900"
    )}>
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar transition-colors duration-250",
          isDarkMode ? "bg-zinc-950" : "bg-slate-50"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
