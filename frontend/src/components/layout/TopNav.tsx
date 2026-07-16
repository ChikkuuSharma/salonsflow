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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "info" as const,
      title: "Welcome to SalonsFlow",
      description: "AI Receptionist is online and ready to receive bookings.",
      time: "Just now",
      read: false
    },
    {
      id: "2",
      type: "success" as const,
      title: "WhatsApp Gateway Connected",
      description: "Live session initialized successfully for WhatsApp automation.",
      time: "10m ago",
      read: false
    },
    {
      id: "3",
      type: "warning" as const,
      title: "Smart Waitlist Alert",
      description: "Waitlist has active entries. Click to promote to open slots.",
      time: "20m ago",
      read: false
    }
  ]);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

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

  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notifications-dropdown-container")) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [showNotifications]);

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
        <div className="bg-amber-950/90 border-b border-amber-900 text-amber-200 px-6 py-2 text-xs font-semibold flex items-center justify-between shadow-lg backdrop-blur-md">
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
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse" />
            <span>
              <strong>SUBSCRIPTION SUSPENDED:</strong> Your automated operations (WhatsApp AI, Campaigns, and bookings) are disabled. Please contact billing support.
            </span>
          </div>
        </div>
      )}
      <header className="h-16 border-b border-slate-200 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 w-full gap-4 shrink-0">
        {onMenuClick && (
          <button 
            onClick={onMenuClick} 
            className="lg:hidden text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg shrink-0 cursor-pointer"
            title="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden md:flex flex-col">
          <h1 className="text-sm lg:text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">
            Welcome back, <span className="text-purple-600 dark:text-purple-400 font-extrabold">{ownerName}</span>!
          </h1>
          <p className="text-[10px] lg:text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
            Here's what's happening at <span className="text-purple-600 dark:text-purple-400 font-bold">{salonName}</span> today.
          </p>
        </div>
        
        <div className="flex-1 max-w-sm flex items-center gap-3 ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search clients, bookings, reports..." 
              className="w-full bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9.5 pr-4 py-1.5 text-xs text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
            />
          </div>
          
          <button 
            title="Quick Action"
            className="h-8 w-8 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-lg flex items-center justify-center shadow-md transition-colors cursor-pointer shrink-0 font-bold text-lg leading-none shadow-purple-950/20 border-0"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-200 dark:border-zinc-900 pl-4 shrink-0">
          <div className="relative notifications-dropdown-container">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg transition-colors relative bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 shadow-sm cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-purple-600 text-[8px] font-bold text-white flex items-center justify-center leading-none animate-bounce">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="p-3 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                  <span className="text-[10px] font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">Notifications</span>
                  {notifications.some(n => !n.read) && (
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-500 cursor-pointer border-0 bg-transparent p-0"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        onClick={() => setNotifications(notifications.map(item => item.id === n.id ? { ...item, read: true } : item))}
                        className={`p-3 text-left cursor-pointer transition-colors relative flex gap-2.5 items-start ${
                          n.read ? "bg-white dark:bg-zinc-900 opacity-60" : "bg-purple-50/20 dark:bg-purple-950/5 hover:bg-slate-50 dark:hover:bg-zinc-800/30"
                        }`}
                      >
                        {/* Dot indicator */}
                        {!n.read && (
                          <span className="absolute left-1.5 top-[18px] h-1.5 w-1.5 rounded-full bg-purple-600"></span>
                        )}

                        {/* Icon column */}
                        <div className="mt-0.5">
                          <span className={`inline-flex h-6 w-6 rounded-lg items-center justify-center text-[10px] font-bold ${
                            n.type === "success" 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" 
                              : n.type === "warning"
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                                : "bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400"
                          }`}>
                            {n.type === "success" ? "✓" : n.type === "warning" ? "!" : "i"}
                          </span>
                        </div>

                        {/* Text columns */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{n.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">{n.description}</p>
                          <span className="text-[8px] text-slate-400 dark:text-zinc-500 font-medium block mt-1 font-mono">{n.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="p-2 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col gap-1.5 text-center">
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => setNotifications([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300 cursor-pointer border-0 bg-transparent py-1 w-full"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-[8px] text-slate-400 dark:text-zinc-500 leading-normal border-t border-slate-100 dark:border-zinc-800/80 pt-1.5">
                    Usecase: Real-time warnings, waitlist promotions, and AI handover requests.
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {ownerName.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-300 leading-none">{ownerName} Sharma</span>
              <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 mt-1 uppercase tracking-wider">{ownerRole}</span>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

