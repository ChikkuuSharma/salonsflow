"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldAlert,
  BarChart3,
  Users2,
  Settings,
  LogOut,
  Building2,
  Layers,
  RefreshCw,
  Menu,
  X
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_auth_token") : null;

        if (storedToken && storedToken.startsWith("dev-bypass-token-impersonate-") && adminToken) {
          localStorage.setItem("auth_token", adminToken);
          localStorage.removeItem("admin_auth_token");
          localStorage.removeItem("impersonated_salon_name");
          window.location.reload();
          return;
        }

        if (!storedToken) {
          router.replace("/login");
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/v1/salons/me/user`, {
          headers: { Authorization: `Bearer dev-bypass-token` }
        });

        if (response.ok) {
          const user = await response.json();
          if (user.role === "SUPER_ADMIN") {
            setAuthorized(true);
          } else {
            console.warn("Unauthorized access attempt. Required SUPER_ADMIN, got:", user.role);
            router.replace("/login");
          }
        } else {
          router.replace("/login");
        }
      } catch (err) {
        console.error("Admin verification check failed:", err);
        router.replace("/login");
      } finally {
        setVerifying(false);
      }
    };

    checkAdminAuth();
  }, [router]);

  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-purple-600 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
        <span className="text-sm font-semibold tracking-wide">Verifying Administration Authorization...</span>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  const navItems = [
    {
      name: "Platform Overview",
      href: "/admin/dashboard",
      icon: BarChart3
    },
    {
      name: "Salon Vendors",
      href: "/admin/vendors",
      icon: Building2
    },
    {
      name: "Outreach Leads",
      href: "/admin/leads",
      icon: Users2
    }
  ];

  const SidebarContent = (
    <>
      {/* Logo Brand */}
      <div className="p-6 border-b border-purple-950/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-gradient-to-tr from-purple-650 to-pink-550 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-purple-900/40">
            SF
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">
              Salons<span className="text-purple-400">Flow</span>
            </span>
            <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-1.5 py-0.5 mt-1 inline-block">
              SUPER ADMIN
            </span>
          </div>
        </div>
        <button 
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-purple-300 hover:text-white p-1 hover:bg-purple-950/40 rounded-lg cursor-pointer"
          title="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                  : "text-purple-300/60 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-purple-400" : "text-purple-300/65"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-purple-950/40 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 text-purple-300/40 hover:text-white rounded-xl text-xs font-semibold transition-all hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
          Exit Platform Admin
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-purple-950/40 bg-[#0c0822] flex flex-col h-screen shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile Admin Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setMobileOpen(false)} 
          />
          {/* Drawer Panel */}
          <aside className="relative w-64 bg-[#0c0822] border-r border-purple-950/40 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-250">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
            <button 
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-800 p-2 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Layers className="h-4 w-4 text-purple-500 hidden sm:block" />
            <span>Platform Operations Center</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-slate-600">
              Dev Session Mode
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
