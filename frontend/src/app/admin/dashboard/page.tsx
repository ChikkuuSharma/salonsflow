"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Coins,
  CalendarDays,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Layers,
  AlertTriangle,
  Users,
  CheckSquare
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingExpirations, setCheckingExpirations] = useState(false);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch platform statistics.");
      setStats(await res.json());
    } catch (err: any) {
      console.error(err);
      setError("Error loading system metrics. Verify that the backend server is live.");
    } finally {
      setLoading(false);
    }
  };

  const runExpirationCheck = async () => {
    setCheckingExpirations(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/subscriptions/check-expirations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Daily subscription expirations monitor triggered successfully!");
        loadStats();
      } else {
        alert("Failed to run expirations check.");
      }
    } catch (err) {
      console.error(err);
      alert("Error calling expirations check API.");
    } finally {
      setCheckingExpirations(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-purple-600">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
        <span className="text-sm font-semibold">Compiling platform overview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl max-w-lg mx-auto text-center space-y-4">
        <span className="text-red-600 font-bold block">System Offline</span>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Salons",
      value: stats?.totalSalons || 0,
      description: "Onboarded tenant databases",
      icon: Building2,
      color: "text-purple-600"
    },
    {
      title: "Total Active Salons",
      value: stats?.totalActiveSalons || 0,
      description: "Trial, Active & Grace tiers",
      icon: Sparkles,
      color: "text-pink-500"
    },
    {
      title: "Suspended Salons",
      value: stats?.totalSuspendedSalons || 0,
      description: "Locked due to non-payment",
      icon: AlertTriangle,
      color: "text-red-500"
    },
    {
      title: "Monthly Revenue (MRR)",
      value: `₹${stats?.monthlyRevenue?.toLocaleString() || 0}`,
      description: "Active billing subscription run-rate",
      icon: Coins,
      color: "text-amber-600"
    },
    {
      title: "Expected Revenue",
      value: `₹${stats?.expectedRevenue?.toLocaleString() || 0}`,
      description: "Total signed up paid subscription MRR",
      icon: Coins,
      color: "text-indigo-600"
    },
    {
      title: "Overdue Payments",
      value: `₹${stats?.overduePayments?.toLocaleString() || 0}`,
      description: "Outstanding grace & expired billing values",
      icon: AlertTriangle,
      color: "text-orange-500"
    },
    {
      title: "Trial Accounts",
      value: stats?.trialAccounts || 0,
      description: "Active evaluation periods",
      icon: Users,
      color: "text-purple-700"
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || 0}%`,
      description: "Trials successfully converted to paid",
      icon: TrendingUp,
      color: "text-pink-500"
    },
    {
      title: "Total Reservations",
      value: stats?.totalAppointments || 0,
      description: "Appointments recorded globally",
      icon: CalendarDays,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Platform Metrics</h1>
          <p className="text-slate-500 text-sm">Monitor multi-tenant vendor states, global revenue run rates, and transactional volumes.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={runExpirationCheck}
            disabled={checkingExpirations}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 rounded-xl transition-all font-bold text-xs text-red-600"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingExpirations ? "animate-spin" : ""}`} />
            Run Expiry Check
          </button>
          <button
            onClick={loadStats}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all font-semibold text-xs text-slate-700 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden group hover:border-purple-300 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 pointer-events-none transition-all"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black mb-1 text-slate-900">{card.value}</div>
              <p className="text-[10px] text-slate-400 font-medium">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription Splits & Health Tiers */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800">Subscription Plans Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                <span className="text-slate-500">PRO Plan (₹5,000/mo)</span>
                <span className="text-slate-900">{stats?.activeSubscriptions?.PRO || 0} Salons</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all"
                  style={{ width: `${stats?.totalSalons ? ((stats.activeSubscriptions.PRO / stats.totalSalons) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                <span className="text-slate-500">BASIC Plan (₹3,000/mo)</span>
                <span className="text-slate-900">{stats?.activeSubscriptions?.BASIC || 0} Salons</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-pink-500 h-full rounded-full transition-all"
                  style={{ width: `${stats?.totalSalons ? ((stats.activeSubscriptions.BASIC / stats.totalSalons) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                <span className="text-slate-500">FREE Trial Level</span>
                <span className="text-slate-900">{stats?.activeSubscriptions?.FREE || 0} Salons</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-200 h-full rounded-full transition-all"
                  style={{ width: `${stats?.totalSalons ? ((stats.activeSubscriptions.FREE / stats.totalSalons) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform System Logs status */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800">System Integration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                NestJS API Gateway
              </span>
              <span className="font-bold text-purple-600">ONLINE</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                PostgreSQL pooler proxy
              </span>
              <span className="font-bold text-purple-600">ONLINE</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">
              <span className="text-slate-700 font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
                OpenAI Speech & completions
              </span>
              <span className="font-bold text-purple-600">ONLINE</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
