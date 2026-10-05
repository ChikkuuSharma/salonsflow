"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light to match homepage
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        router.replace("/login");
      } else {
        setAuthorized(true);
      }
    }
  }, [router]);

  if (!mounted || !authorized) {
    return (
      <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
        <div className="flex-1 p-6 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-500">Loading workspace...</span>
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
