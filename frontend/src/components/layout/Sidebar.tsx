"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Clock,
  Users, 
  MessageSquare, 
  Megaphone,
  Settings,
  PhoneMissed,
  Star,
  RefreshCw,
  Mic,
  Receipt,
  Calculator,
  Scissors,
  Briefcase,
  Sparkles,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bookings", href: "/bookings", icon: Calendar },
  { name: "Waiting List", href: "/waiting-list", icon: Clock },
  { name: "POS Billing", href: "/pos", icon: Receipt },
  { name: "Services Menu", href: "/services", icon: Scissors },
  { name: "Staff Management", href: "/staff", icon: Briefcase },
  { name: "Smart Database", href: "/customers", icon: Users },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Marketing Campaigns", href: "/campaigns", icon: Megaphone },
  { name: "Missed Call Logs", href: "/missed-calls", icon: PhoneMissed },
  { name: "Google Reviews", href: "/reviews", icon: Star },
  { name: "Daily WA Reports", href: "/reports", icon: BarChart3 },
  { name: "AI Rebooking", href: "/rebooking", icon: RefreshCw },
  { name: "Voice Booking Logs", href: "/voice-notes", icon: Mic },
  { name: "Commissions Ledger", href: "/commissions", icon: Calculator },
  { name: "Setup Wizard", href: "/onboarding?force=true", icon: Sparkles },
  { name: "AI Agent Settings", href: "/settings/ai", icon: Settings },
];

import { X } from "lucide-react";

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  const SidebarContent = (
    <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-900 shrink-0">
        <div className="flex items-center gap-2.5 text-left">
          <img src="/logo.png" alt="SalonsFlow Logo" className="h-8 w-8 rounded-lg object-contain shadow-md bg-zinc-900 border border-zinc-800 p-0.5" />
          <div className="flex flex-col">
            <span className="font-display font-black text-base tracking-tight text-white leading-none">
              Salons<span className="text-emerald-400">Flow</span>
            </span>
            <span className="text-[9px] font-bold text-emerald-500/70 tracking-wider uppercase mt-1">
              Grow While You Style
            </span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="lg:hidden text-zinc-400 hover:text-white p-1 hover:bg-zinc-900 rounded-lg cursor-pointer"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar bg-zinc-950">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose?.()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 border border-transparent",
                isActive 
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40 shadow-sm font-bold" 
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-100"
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-emerald-400" : "text-zinc-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-zinc-900 bg-zinc-950 shrink-0">
        <div className="relative overflow-hidden bg-gradient-to-tr from-zinc-900 to-zinc-950 rounded-2xl p-3.5 border border-zinc-800 text-center shadow-md">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 bg-emerald-500/10 rounded-full blur-xl"></div>
          <h4 className="text-xs font-bold text-white">Upgrade to Premium</h4>
          <p className="text-[10px] text-zinc-400 mt-1 leading-normal">Get unlimited bookings & advanced AI capabilities.</p>
          <button className="w-full mt-3 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-[10px] font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer">
            Go Premium
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-900 bg-zinc-950 h-screen flex flex-col shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300" 
            onClick={onClose} 
          />
          {/* Drawer Panel */}
          <aside className="relative w-64 bg-zinc-950 border-r border-zinc-900 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-250">
            {SidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
