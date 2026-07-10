"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, AlertTriangle, Menu } from "lucide-react";

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isSuspended, setIsSuspended] = useState(false);
  const [salonName, setSalonName] = useState("Elegance Barber & Spa");
  const [ownerName, setOwnerName] = useState("Devender");
  const [ownerRole, setOwnerRole] = useState("Owner");
  const [isDemo, setIsDemo] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = "dev-bypass-token";

  const handleExitImpersonation = () => {
    const adminToken = localStorage.getItem("admin_auth_token") || "dev-bypass-token-superadmin-admin";
    localStorage.setItem("auth_token", adminToken);
    localStorage.removeItem("admin_auth_token");
    localStorage.removeItem("impersonated_salon_name");
    window.location.href = "/admin/vendors";
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const activeToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        if (activeToken && activeToken.startsWith("dev-bypass-token-demo")) {
          setIsDemo(true);
        }
        if (activeToken && activeToken.startsWith("dev-bypass-token-impersonate-")) {
          setIsImpersonating(true);
        }

        const res = await fetch(`${apiUrl}/api/v1/salons/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.subscription?.status === "SUSPENDED") {
            setIsSuspended(true);
          }
          if (data?.name) {
            setSalonName(data.name);
          }
        }

        // Fetch active user details
        const userRes = await fetch(`${apiUrl}/api/v1/salons/me/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData?.name) {
            setOwnerName(userData.name.split(" ")[0]);
          }
          if (userData?.role) {
            setOwnerRole(userData.role);
          }
        }
      } catch (err) {
        console.error("Error checking subscription status:", err);
      }
    };
    checkStatus();
  }, [apiUrl]);

  const handleResetDemoData = async () => {
    setResettingDemo(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/demo/reset`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Demo sandbox data reset and seeded successfully!");
        window.location.reload();
      } else {
        alert("Failed to reset demo data.");
      }
    } catch (err) {
      console.error("Failed to reset demo data:", err);
      alert("Error calling reset demo data endpoint.");
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="flex flex-col w-full z-30">
      {isImpersonating && (
        <div className="bg-indigo-950/90 border-b border-indigo-900 text-indigo-200 px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md animate-in slide-in-from-top duration-350 z-50">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              <strong>SUPER ADMIN ACCESS:</strong> You are control-accessing the dashboard of <span className="text-emerald-400 font-extrabold">{salonName}</span>.
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            Exit Impersonation
          </button>
        </div>
      )}
      {isDemo && (
        <div className="bg-amber-950/90 border-b border-amber-900 text-amber-250 text-amber-200 px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              <strong>DEMO WORKSPACE:</strong> You are exploring a simulated pilot sandbox. Any changes are local and will not affect production databases.
            </span>
          </div>
          <button
            onClick={handleResetDemoData}
            disabled={resettingDemo}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            {resettingDemo ? (
              <span className="h-3 w-3 border-2 border-zinc-700 border-t-zinc-100 rounded-full animate-spin"></span>
            ) : "Reset Sandbox Data"}
          </button>
        </div>
      )}
      {isSuspended && (
        <div className="bg-rose-950/90 border-b border-rose-900/40 text-rose-200 px-6 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 animate-in slide-in-from-top duration-350 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-450 text-rose-450 text-rose-400 shrink-0 animate-pulse" />
            <span>
              <strong>SUBSCRIPTION SUSPENDED:</strong> Your automated operations (WhatsApp AI, Campaigns, and bookings) are disabled. Please contact billing support.
            </span>
          </div>
        </div>
      )}
      <header className="h-16 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 w-full gap-4 shrink-0">
        {onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="lg:hidden text-zinc-450 text-zinc-400 hover:text-white p-2 hover:bg-zinc-900 rounded-lg shrink-0 cursor-pointer"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden md:flex flex-col">
          <h1 className="text-sm lg:text-base font-bold text-zinc-105 text-zinc-100 tracking-tight leading-tight">
            Welcome back, <span className="text-emerald-400 font-extrabold">{ownerName}</span>!
          </h1>
          <p className="text-[10px] lg:text-xs text-zinc-455 text-zinc-400 font-semibold mt-0.5">
            Here's what's happening at <span className="text-emerald-400 font-bold">{salonName}</span> today.
          </p>
        </div>
        
        <div className="flex-1 max-w-sm flex items-center gap-3 ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search clients, bookings, reports..." 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-9.5 pr-4 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-zinc-900 transition-all"
            />
          </div>
          
          <button 
            title="Quick Action"
            className="h-8 w-8 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-lg flex items-center justify-center shadow-md transition-colors cursor-pointer shrink-0 font-bold text-lg leading-none shadow-emerald-950/20"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-4 border-l border-zinc-900 pl-4 shrink-0">
          <button className="text-zinc-400 hover:text-white p-1.5 rounded-lg transition-colors relative bg-zinc-900/50 border border-zinc-800 shadow-sm cursor-pointer">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-500 text-[8px] font-bold text-zinc-950 flex items-center justify-center leading-none">3</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-zinc-950 font-bold text-sm shadow-md">
              {ownerName.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-zinc-300 leading-none">{ownerName} Sharma</span>
              <span className="text-[9px] font-bold text-emerald-450 text-emerald-400 mt-1 uppercase tracking-wider">{ownerRole}</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
