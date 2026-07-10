"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Lock, Users, AlertTriangle, CheckCircle2, RefreshCw, Send, Calendar } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  content: string;
  targetSegment: string;
  sentCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lists and stats
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [targetSegment, setTargetSegment] = useState("inactive_30_days");
  const [content, setContent] = useState("");

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function loadData() {
    try {
      // 1. Fetch subscription details
      const subRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!subRes.ok) throw new Error("Failed to load salon subscription data");
      const salonData = await subRes.json();
      setSubscription(salonData.subscription || { plan: "FREE", status: "ACTIVE" });

      // 2. Fetch campaign history
      const campRes = await fetch(`${apiUrl}/api/v1/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!campRes.ok) throw new Error("Failed to load campaigns history");
      const campaignList = await campRes.json();
      setCampaigns(campaignList);
    } catch (err: any) {
      console.error(err);
      setError("Error loading campaigns. Please verify backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSending(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          content: content.trim(),
          targetSegment,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to launch campaign");
      }

      setSuccess("Campaign broadcast dispatched successfully!");
      setName("");
      setContent("");
      
      // Reload campaigns
      await loadData();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error launching campaign.");
    } finally {
      setSending(false);
    }
  };

  const getSegmentLabel = (val: string) => {
    switch (val) {
      case "all_customers":
        return "All Customers";
      case "inactive_30_days":
        return "Inactive (30+ Days)";
      case "frequent_visitors":
        return "Frequent Visitors";
      default:
        return val;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading campaigns panel...</p>
      </div>
    );
  }

  const isPremium = subscription?.plan === "BASIC" || subscription?.plan === "PRO";
  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Marketing Campaigns</h2>
          <p className="text-muted-foreground">Launch targeted WhatsApp promotions to your customer base.</p>
        </div>

        {/* Plan indicator */}
        <div className={`flex items-center gap-2 border px-4 py-2 rounded-full font-semibold text-sm shadow-sm ${
          isPremium && isActive
            ? "bg-purple-50 border-purple-200 text-purple-800"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <Megaphone className="h-4 w-4" />
          <span>Plan: {subscription?.plan} ({isActive ? "Active" : "Inactive"})</span>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg shadow-sm">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaign Builder Card */}
        <Card className="lg:col-span-1 relative overflow-hidden h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-600" />
              <span>Launch Campaign</span>
              {!isPremium && <Lock className="h-4 w-4 text-amber-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g., June Keratin Discount"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isPremium || !isActive}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Segment</label>
                <select
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  disabled={!isPremium || !isActive}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="inactive_30_days">Inactive (30+ Days)</option>
                  <option value="frequent_visitors">Frequent Visitors</option>
                  <option value="all_customers">All Customers</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content</label>
                <textarea
                  rows={5}
                  placeholder="Type your WhatsApp message template here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={!isPremium || !isActive}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  required
                />
                <span className="text-[10px] text-muted-foreground block">
                  Keep templates clear and provide an opt-out instructions if needed.
                </span>
              </div>

              <button
                type="submit"
                disabled={sending || !isPremium || !isActive}
                className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-md py-2.5 font-medium transition-colors cursor-pointer disabled:bg-purple-400"
              >
                <Send className="h-4 w-4" />
                {sending ? "Broadcasting..." : "Dispatch Campaign"}
              </button>
            </form>

            {/* FREE plan lock overlay */}
            {(!isPremium || !isActive) && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-[1.5px] flex flex-col items-center justify-center text-center p-6">
                <div className="h-12 w-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mb-3 shadow-md animate-pulse">
                  <Lock className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-gray-900">Campaigns Module Locked</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-2 px-2 leading-relaxed">
                  Bulk broadcasts and customer segments are locked on the FREE subscription plan. Upgrade to BASIC or PRO to launch automated campaigns.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign History Log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span>Broadcast Log & Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Megaphone className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium">No campaigns created yet</p>
                <p className="text-xs mt-1">Once you launch marketing templates, dispatch statistics will list here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="border rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900">{camp.name}</h4>
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          Dispatched on: {new Date(camp.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Segment: {getSegmentLabel(camp.targetSegment)}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-600 mt-1 font-semibold">
                          <Users className="h-3 w-3" /> Sent to: {camp.sentCount}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white border rounded p-2.5 text-xs text-gray-700 leading-relaxed font-mono">
                      {camp.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

