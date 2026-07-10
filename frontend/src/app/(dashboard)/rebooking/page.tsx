"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, AlertTriangle, CheckCircle2, Plus, Calendar, User, IndianRupee, Users, Send, Settings2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface RebookingRule {
  id: string;
  serviceId: string;
  intervalDays: number;
  service: {
    name: string;
  };
}

interface Recommendation {
  id: string;
  dueDate: string;
  status: "PENDING" | "APPROVED" | "SENT" | "BOOKED" | "IGNORED" | string;
  message: string | null;
  customer: {
    name: string;
    phone: string;
  };
  service: {
    name: string;
    price: number;
  };
}

export default function RebookingPage() {
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States
  const [services, setServices] = useState<Service[]>([]);
  const [rules, setRules] = useState<RebookingRule[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [rebookingAutoSend, setRebookingAutoSend] = useState(false);
  const [metrics, setMetrics] = useState({
    rebookingsGenerated: 0,
    rebookingRevenueRecovered: 0,
    customersDueForRebooking: 0,
  });

  // Form Inputs
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function loadData() {
    try {
      setError(null);

      // 1. Fetch salon me details for auto-send status
      const salonRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!salonRes.ok) throw new Error("Failed to load salon info");
      const salonData = await salonRes.json();
      setRebookingAutoSend(salonData.rebookingAutoSend || false);

      // 2. Fetch services list
      const servicesRes = await fetch(`${apiUrl}/api/v1/rebookings/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!servicesRes.ok) throw new Error("Failed to load salon services");
      const servicesList = await servicesRes.json();
      setServices(servicesList);
      if (servicesList.length > 0) {
        setSelectedServiceId(servicesList[0].id);
      }

      // 3. Fetch rebooking rules
      const rulesRes = await fetch(`${apiUrl}/api/v1/rebookings/rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!rulesRes.ok) throw new Error("Failed to load rebooking rules");
      const rulesList = await rulesRes.json();
      setRules(rulesList);

      // 4. Fetch metrics
      const metricsRes = await fetch(`${apiUrl}/api/v1/analytics/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!metricsRes.ok) throw new Error("Failed to load metrics");
      const metricsData = await metricsRes.json();
      setMetrics({
        rebookingsGenerated: metricsData.rebookingsGenerated || 0,
        rebookingRevenueRecovered: metricsData.rebookingRevenueRecovered || 0,
        customersDueForRebooking: metricsData.customersDueForRebooking || 0,
      });

      // 5. Fetch recommendations
      const recsRes = await fetch(`${apiUrl}/api/v1/rebookings/recommendations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!recsRes.ok) throw new Error("Failed to load recommendations");
      const recsList = await recsRes.json();
      setRecommendations(recsList);

    } catch (err: any) {
      console.error(err);
      setError("Error loading rebookings dashboard. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) return;

    setSavingRule(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/rebookings/rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          intervalDays: Number(intervalDays),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create rule");
      }

      setSuccess("Rebooking rule configured successfully!");
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error creating rebooking rule.");
    } finally {
      setSavingRule(false);
    }
  };

  const handleToggleAutoSend = async (checked: boolean) => {
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/salons/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rebookingAutoSend: checked,
        }),
      });

      if (!res.ok) throw new Error("Failed to update auto-send setting");
      
      setRebookingAutoSend(checked);
      setSuccess(checked ? "Auto-Send enabled for all recommendations!" : "Auto-Send disabled. Manual approval required.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to update Auto-Send settings.");
    }
  };

  const handleApproveRecommendation = async (id: string) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/rebookings/recommendations/${id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to dispatch recommendation");
      
      setSuccess("Recommendation approved and WhatsApp dispatch triggered!");
      await loadData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setError("Error approving and sending recommendation.");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">Awaiting Approval</span>;
      case "APPROVED":
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">Approved</span>;
      case "SENT":
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">Dispatched</span>;
      case "BOOKED":
        return <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">Booked 🎉</span>;
      case "IGNORED":
        return <span className="bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">Expired</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-muted-foreground font-medium">Loading AI Rebooking Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Rebooking Engine</h2>
          <p className="text-muted-foreground">Automate repeat revenue by messaging clients when they are due for recurrence.</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Sync recommendations
        </button>
      </div>

      {/* Alerts */}
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

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Rebooking Revenue Recovered</CardTitle>
            <IndianRupee className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">₹{metrics.rebookingRevenueRecovered}</div>
            <p className="text-xs text-muted-foreground mt-1">Value of bookings created via engine</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Rebookings Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.rebookingsGenerated} bookings</div>
            <p className="text-xs text-muted-foreground mt-1">Total conversions tracked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Clients Due</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.customersDueForRebooking} clients</div>
            <p className="text-xs text-muted-foreground mt-1">Currently past due or due today</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rules Builder Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Automation settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-green-600" />
                <span>Engine Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Auto-Send Campaigns</h4>
                  <p className="text-xs text-muted-foreground max-w-[180px] mt-0.5 leading-normal">
                    Dispatch WhatsApp follow-ups automatically without manual verification.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rebookingAutoSend}
                    onChange={(e) => handleToggleAutoSend(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Rules list */}
          <Card>
            <CardHeader>
              <CardTitle>Configure Recurrence Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Service</label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
                    required
                  >
                    {services.length === 0 ? (
                      <option value="">No services configured</option>
                    ) : (
                      services.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} (₹{svc.price})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex justify-between">
                    <span>Recurrence Interval</span>
                    <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">
                      {intervalDays} days
                    </span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Number(e.target.value))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingRule || services.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-md py-2.5 font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  {savingRule ? "Saving..." : "Configure Interval"}
                </button>
              </form>

              <div className="border-t pt-4">
                <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Active Rules</h4>
                {rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No rebooking rules set yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {rules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between border rounded p-2.5 bg-gray-50 text-xs shadow-sm">
                        <span className="font-semibold text-gray-800">{rule.service.name}</span>
                        <span className="bg-green-100 border border-green-200 text-green-800 px-2 py-0.5 rounded font-mono font-bold">
                          Every {rule.intervalDays} days
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Queue Column */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Rebooking Queue & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium">Rebooking queue is empty</p>
                <p className="text-xs mt-1">Recommendations populate automatically as appointments are marked completed.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((rec) => {
                  const isPending = rec.status === "PENDING";
                  return (
                    <div
                      key={rec.id}
                      className="border rounded-lg p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 flex items-center gap-1">
                            <User className="h-4 w-4 text-gray-500" /> {rec.customer.name}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">({rec.customer.phone})</span>
                          {getStatusBadge(rec.status)}
                        </div>

                        <div className="text-xs text-gray-600">
                          Due for <span className="font-semibold text-green-700">{rec.service.name}</span> (₹{rec.service.price}) on{" "}
                          <span className="font-semibold">{new Date(rec.dueDate).toLocaleDateString()}</span>
                        </div>

                        {rec.message && (
                          <div className="bg-white border rounded p-2 text-xs font-mono text-gray-600 leading-normal max-w-lg mt-1">
                            {rec.message}
                          </div>
                        )}
                      </div>

                      {isPending && !rebookingAutoSend && (
                        <button
                          onClick={() => handleApproveRecommendation(rec.id)}
                          disabled={actionLoading[rec.id]}
                          className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white rounded-md px-4 py-2 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:bg-green-400 shrink-0"
                        >
                          <Send className="h-3 w-3" />
                          {actionLoading[rec.id] ? "Sending..." : "Approve & Send"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

