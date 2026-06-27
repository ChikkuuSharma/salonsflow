"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneMissed, Calendar, CheckCircle2, RefreshCw, AlertTriangle, PhoneCall, TrendingUp, Search } from "lucide-react";

interface MissedCall {
  id: string;
  phone: string;
  source: string;
  status: "PENDING" | "CONVERSATION_STARTED" | "BOOKED" | string;
  createdAt: string;
}

export default function MissedCallsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [metrics, setMetrics] = useState({
    totalMissedCalls: 0,
    missedCallConversionRate: 0,
    missedCallBookings: 0,
  });

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function loadData() {
    try {
      setError(null);
      
      // 1. Fetch metrics
      const metricsRes = await fetch(`${apiUrl}/api/v1/analytics/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!metricsRes.ok) throw new Error("Failed to load analytics metrics");
      const metricsData = await metricsRes.json();
      setMetrics({
        totalMissedCalls: metricsData.totalMissedCalls || 0,
        missedCallConversionRate: metricsData.missedCallConversionRate || 0,
        missedCallBookings: metricsData.missedCallBookings || 0,
      });

      // 2. Fetch missed calls
      const callsRes = await fetch(`${apiUrl}/api/v1/webhooks/missed-call`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!callsRes.ok) throw new Error("Failed to load missed calls log");
      const callsList = await callsRes.json();
      setMissedCalls(callsList);
    } catch (err: any) {
      console.error(err);
      setError("Error loading missed call data. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">Welcome Sent</span>;
      case "CONVERSATION_STARTED":
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">In Conversation</span>;
      case "BOOKED":
        return <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">Booked 🎉</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const filteredCalls = missedCalls.filter(call => 
    call.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    call.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading missed calls panel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Missed Call Booking</h2>
          <p className="text-muted-foreground">Monitor inbound missed calls, chatbot conversions, and customer interactions.</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Log
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Missed Calls</CardTitle>
            <PhoneMissed className="h-4 w-4 text-rose-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.totalMissedCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Total inbound telco hits</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed Call Bookings</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.missedCallBookings}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully scheduled via chatbot</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.missedCallConversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Calls converted into appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Logs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Inbound Callback Log</CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <PhoneCall className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No missed calls recorded</p>
              <p className="text-xs mt-1">When customers trigger the missed call booking number, they will appear here.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">Phone Number</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Detection Date</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Source</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Funnel Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="bg-white hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900">{call.phone}</td>
                      <td className="px-6 py-4 text-gray-600">{new Date(call.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 border text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold">
                          {call.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(call.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
