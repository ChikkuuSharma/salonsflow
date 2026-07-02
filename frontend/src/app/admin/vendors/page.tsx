"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Sparkles,
  CalendarDays,
  Users2,
  RefreshCw,
  Search,
  Edit3,
  Sliders,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  User,
  Coins,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface SalonSubscription {
  plan: "FREE" | "BASIC" | "PRO";
  status: "TRIAL" | "ACTIVE" | "GRACE_PERIOD" | "SUSPENDED" | "EXPIRED" | "CANCELED";
  currentPeriodEnd: string | null;
}

interface SalonCosts {
  openaiUsageCost: number;
  whatsappUsageCost: number;
  estimatedMonthlyCost: number;
  estimatedProfit: number;
}

interface SalonMetrics {
  totalCustomers: number;
  totalAppointments: number;
  totalUsers: number;
}

interface SalonVendor {
  id: string;
  name: string;
  whatsappNumber: string;
  address: string | null;
  createdAt: string;
  
  // Owner profile details
  ownerName: string | null;
  ownerMobile: string | null;
  ownerAlternateMobile: string | null;
  ownerEmail: string | null;
  ownerAddress: string | null;
  ownerCity: string | null;
  ownerState: string | null;
  ownerCountry: string | null;
  gstNumber: string | null;
  businessCategory: string | null;

  subscription: SalonSubscription;
  costs: SalonCosts;
  metrics: SalonMetrics;
}

export default function AdminVendorsPage() {
  const [salons, setSalons] = useState<SalonVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Expanded salon row ID for inspecting profile
  const [expandedSalonId, setExpandedSalonId] = useState<string | null>(null);

  // Modals state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<SalonVendor | null>(null);

  // Subscription action form state
  const [subAction, setSubAction] = useState<"UPGRADE" | "DOWNGRADE" | "EXTEND" | "ADD_TRIAL_DAYS" | "SUSPEND" | "REACTIVATE">("UPGRADE");
  const [subActionPlan, setSubActionPlan] = useState<"FREE" | "BASIC" | "PRO">("BASIC");
  const [subActionDays, setSubActionDays] = useState<number>(30);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  // Profile edit form state
  const [profileName, setProfileName] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileOwnerName, setProfileOwnerName] = useState("");
  const [profileOwnerMobile, setProfileOwnerMobile] = useState("");
  const [profileOwnerAltMobile, setProfileOwnerAltMobile] = useState("");
  const [profileOwnerEmail, setProfileOwnerEmail] = useState("");
  const [profileOwnerAddress, setProfileOwnerAddress] = useState("");
  const [profileOwnerCity, setProfileOwnerCity] = useState("");
  const [profileOwnerState, setProfileOwnerState] = useState("");
  const [profileOwnerCountry, setProfileOwnerCountry] = useState("");
  const [profileGst, setProfileGst] = useState("");
  const [profileCategory, setProfileCategory] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadSalons = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/salons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to retrieve salon vendors data.");
      setSalons(await res.json());
    } catch (err: any) {
      console.error(err);
      setError("Error accessing vendors list. Verify database connectivity and backend server status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalons();
  }, [apiUrl]);

  const handleOpenActionModal = (salon: SalonVendor) => {
    setSelectedSalon(salon);
    setSubAction("UPGRADE");
    setSubActionPlan(salon.subscription.plan);
    setSubActionDays(30);
    setActionSuccess(false);
    setActionModalOpen(true);
  };

  const handleOpenProfileModal = (salon: SalonVendor) => {
    setSelectedSalon(salon);
    setProfileName(salon.name || "");
    setProfileWhatsapp(salon.whatsappNumber || "");
    setProfileAddress(salon.address || "");
    setProfileOwnerName(salon.ownerName || "");
    setProfileOwnerMobile(salon.ownerMobile || "");
    setProfileOwnerAltMobile(salon.ownerAlternateMobile || "");
    setProfileOwnerEmail(salon.ownerEmail || "");
    setProfileOwnerAddress(salon.ownerAddress || "");
    setProfileOwnerCity(salon.ownerCity || "");
    setProfileOwnerState(salon.ownerState || "");
    setProfileOwnerCountry(salon.ownerCountry || "India");
    setProfileGst(salon.gstNumber || "");
    setProfileCategory(salon.businessCategory || "HAIR_SALON");
    setProfileSuccess(false);
    setProfileModalOpen(true);
  };

  const handleSubscriptionActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;

    setActionSubmitting(true);
    setError(null);

    try {
      const body = {
        action: subAction,
        plan: ["UPGRADE", "DOWNGRADE"].includes(subAction) ? subActionPlan : undefined,
        days: ["EXTEND", "ADD_TRIAL_DAYS"].includes(subAction) ? subActionDays : undefined
      };

      const res = await fetch(`${apiUrl}/api/v1/admin/salons/${selectedSalon.id}/subscription/action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to process subscription action override.");

      setActionSuccess(true);
      await loadSalons();
      setTimeout(() => {
        setActionModalOpen(false);
        setSelectedSalon(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Action execution failed.");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;

    setProfileSubmitting(true);
    setError(null);

    try {
      const body = {
        name: profileName,
        whatsappNumber: profileWhatsapp,
        address: profileAddress,
        ownerName: profileOwnerName,
        ownerMobile: profileOwnerMobile,
        ownerAlternateMobile: profileOwnerAltMobile,
        ownerEmail: profileOwnerEmail,
        ownerAddress: profileOwnerAddress,
        ownerCity: profileOwnerCity,
        ownerState: profileOwnerState,
        ownerCountry: profileOwnerCountry,
        gstNumber: profileGst,
        businessCategory: profileCategory
      };

      const res = await fetch(`${apiUrl}/api/v1/admin/salons/${selectedSalon.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to update salon profile.");

      setProfileSuccess(true);
      await loadSalons();
      setTimeout(() => {
        setProfileModalOpen(false);
        setSelectedSalon(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const toggleExpandSalon = (id: string) => {
    if (expandedSalonId === id) {
      setExpandedSalonId(null);
    } else {
      setExpandedSalonId(id);
    }
  };

  const handleImpersonate = (salon: SalonVendor) => {
    const currentToken = localStorage.getItem("auth_token") || "dev-bypass-token-superadmin-admin";
    localStorage.setItem("admin_auth_token", currentToken);
    localStorage.setItem("auth_token", `dev-bypass-token-impersonate-${salon.id}`);
    localStorage.setItem("impersonated_salon_name", salon.name);
    window.location.href = "/dashboard";
  };

  // Filter list
  const filteredSalons = salons.filter(
    (salon) =>
      salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salon.whatsappNumber.includes(searchQuery) ||
      (salon.ownerName && salon.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Total aggregator counters
  const totalSalons = salons.length;
  const totalPaying = salons.filter(s => ["BASIC", "PRO"].includes(s.subscription.plan) && s.subscription.status === "ACTIVE").length;
  const totalSuspended = salons.filter(s => s.subscription.status === "SUSPENDED").length;

  const getPlanBadgeStyles = (plan: string) => {
    switch (plan) {
      case "PRO":
        return "bg-purple-50 text-purple-700 border border-purple-200/50 shadow-sm";
      case "BASIC":
        return "bg-pink-50 text-pink-700 border border-pink-200/50";
      default:
        return "bg-slate-100 text-slate-550 border border-slate-200";
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-purple-105 text-purple-750 border border-purple-200";
      case "TRIAL":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "GRACE_PERIOD":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "SUSPENDED":
        return "bg-red-50 text-red-700 border border-red-200 animate-pulse";
      default:
        return "bg-slate-50 text-slate-500 border border-slate-200";
    }
  };

  if (loading && salons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-650" />
        <span className="text-sm font-semibold">Retrieving platform vendors registry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Salon Control Center</h1>
          <p className="text-slate-500 text-sm">Onboard, suspend, profile, and audit costs/revenues for all active salon partitions.</p>
        </div>
        <button
          onClick={loadSalons}
          className="self-start md:self-auto flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all font-semibold text-xs text-slate-700 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync Registry
        </button>
      </div>

      {/* Aggregate metrics */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 pointer-events-none transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Onboarded</CardTitle>
            <Building2 className="h-4.5 w-4.5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black mb-1 text-slate-900">{totalSalons}</div>
            <p className="text-[10px] text-slate-400 font-medium">Active platform vendor partitions</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden group hover:border-pink-350 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-3xl rounded-full group-hover:bg-pink-500/10 pointer-events-none transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paying Subscriptions</CardTitle>
            <Sparkles className="h-4.5 w-4.5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black mb-1 text-slate-900">{totalPaying}</div>
            <p className="text-[10px] text-slate-400 font-medium">ACTIVE status on BASIC / PRO plans</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden group hover:border-red-350 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-3xl rounded-full group-hover:bg-red-500/10 pointer-events-none transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspended partitions</CardTitle>
            <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black mb-1 text-slate-900">{totalSuspended}</div>
            <p className="text-[10px] text-slate-400 font-medium">Suspended partitions due to non-payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Vendor Directory */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800">Registered Salon Entities</CardTitle>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, whatsapp, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors text-slate-800"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0 overflow-x-auto">
          {filteredSalons.length === 0 ? (
            <div className="p-12 text-center text-slate-450 text-xs font-semibold">
              No matching salons found in registry.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Salon Vendor</th>
                  <th className="px-6 py-4">Status & Plan</th>
                  <th className="px-6 py-4">Renewal Limit</th>
                  <th className="px-6 py-4 text-center">Cost Tracking (Estimates)</th>
                  <th className="px-6 py-4 text-center">Estimated Profit</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSalons.map((salon) => {
                  const isExpanded = expandedSalonId === salon.id;
                  
                  return (
                    <React.Fragment key={salon.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors text-xs font-medium text-slate-700">
                        {/* Column 1: Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpandSalon(salon.id)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-450 hover:text-slate-800"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{salon.name}</div>
                              <div className="text-[10px] text-slate-450 font-mono">
                                Owner: {salon.ownerName || "Unspecified"} ({salon.whatsappNumber})
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Status */}
                        <td className="px-6 py-4 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${getPlanBadgeStyles(salon.subscription.plan)}`}>
                              {salon.subscription.plan}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${getStatusBadgeStyles(salon.subscription.status)}`}>
                              {salon.subscription.status}
                            </span>
                          </div>
                        </td>

                        {/* Column 3: Renewal date */}
                        <td className="px-6 py-4 text-slate-500 text-[11px] font-mono">
                          {salon.subscription.currentPeriodEnd
                            ? new Date(salon.subscription.currentPeriodEnd).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                              })
                            : "Unlimited / Manual"}
                        </td>

                        {/* Column 4: Cost audit */}
                        <td className="px-6 py-4 text-center">
                          <div className="inline-block text-left text-[11px] font-semibold font-mono space-y-0.5">
                            <div><span className="text-slate-400 font-medium">OpenAI:</span> ₹{salon.costs.openaiUsageCost.toFixed(2)}</div>
                            <div><span className="text-slate-400 font-medium">WhatsApp:</span> ₹{salon.costs.whatsappUsageCost.toFixed(2)}</div>
                            <div className="text-slate-600 pt-0.5 border-t border-slate-100">
                              <span className="text-slate-400 font-medium">Total:</span> ₹{salon.costs.estimatedMonthlyCost.toFixed(2)}
                            </div>
                          </div>
                        </td>

                        {/* Column 5: Estimated Profit */}
                        <td className="px-6 py-4 text-center">
                          <span className={`font-mono font-extrabold text-sm ${salon.costs.estimatedProfit >= 0 ? "text-emerald-650" : "text-red-600"}`}>
                            ₹{salon.costs.estimatedProfit.toFixed(0)}
                          </span>
                        </td>

                        {/* Column 6: Actions */}
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleImpersonate(salon)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold transition-all text-[11px]"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Access Console
                          </button>
                          <button
                            onClick={() => handleOpenProfileModal(salon)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-pink-650 hover:text-pink-500 font-bold transition-all text-[11px]"
                          >
                            <User className="h-3 w-3" />
                            Profile
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(salon)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold transition-all text-[11px]"
                          >
                            <Sliders className="h-3 w-3" />
                            Actions
                          </button>
                        </td>
                      </tr>

                      {/* Expandable profile inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="px-8 py-6 border-y border-slate-250/50">
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                              
                              {/* Partition: Owner Contact */}
                              <div className="space-y-2.5">
                                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-1">Owner Contact Details</h4>
                                <div className="text-xs space-y-1.5 text-slate-700">
                                  <div><span className="text-slate-400 font-semibold block">Full Name</span> {salon.ownerName || "Not configured"}</div>
                                  <div><span className="text-slate-400 font-semibold block">Mobile Number</span> {salon.ownerMobile || "Not configured"}</div>
                                  <div><span className="text-slate-400 font-semibold block">Alternate Mobile</span> {salon.ownerAlternateMobile || "Not configured"}</div>
                                  <div><span className="text-slate-400 font-semibold block">Email Address</span> {salon.ownerEmail || "Not configured"}</div>
                                </div>
                              </div>

                              {/* Partition: Business details */}
                              <div className="space-y-2.5">
                                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-1">Business Registration Details</h4>
                                <div className="text-xs space-y-1.5 text-slate-700">
                                  <div><span className="text-slate-400 font-semibold block">GST Identification (GSTIN)</span> {salon.gstNumber || "Not configured"}</div>
                                  <div><span className="text-slate-400 font-semibold block">Service Category</span> <span className="font-mono text-[10px] text-pink-600">{salon.businessCategory || "Unspecified"}</span></div>
                                  <div><span className="text-slate-400 font-semibold block">Address Location</span> {salon.ownerAddress || salon.address || "Not configured"}</div>
                                  <div>
                                    <span className="text-slate-400 font-semibold block">City / State</span> 
                                    {salon.ownerCity || "City"}, {salon.ownerState || "State"} ({salon.ownerCountry || "Country"})
                                  </div>
                                </div>
                              </div>

                              {/* Partition: Partition Database stats */}
                              <div className="space-y-2.5">
                                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-1">Operational Partition metrics</h4>
                                <div className="text-xs space-y-2">
                                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                    <span className="text-slate-500">Total Customers:</span>
                                    <span className="font-black text-slate-800">{salon.metrics.totalCustomers}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                    <span className="text-slate-500">Total Bookings:</span>
                                    <span className="font-black text-slate-800">{salon.metrics.totalAppointments}</span>
                                  </div>
                                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                    <span className="text-slate-500">Employee Accounts:</span>
                                    <span className="font-black text-slate-800">{salon.metrics.totalUsers}</span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Upgraded Subscription Action Dialog Modal */}
      {actionModalOpen && selectedSalon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => setActionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase block mb-1">Billing Control overrides</span>
              <h3 className="text-lg font-black text-slate-900">{selectedSalon.name}</h3>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">Current Plan: {selectedSalon.subscription.plan} ({selectedSalon.subscription.status})</p>
            </div>

            {actionSuccess && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-250 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-purple-600 animate-pulse shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Action Completed</span>
                  <span className="text-[10px] text-slate-500">Prisma database transaction synchronized.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubscriptionActionSubmit} className="space-y-4">
              
              {/* Select overriding action */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Command Action</label>
                <select
                  value={subAction}
                  onChange={(e) => setSubAction(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer block"
                >
                  <option value="UPGRADE">Upgrade Subscription plan</option>
                  <option value="DOWNGRADE">Downgrade Subscription plan</option>
                  <option value="EXTEND">Extend period renewal date</option>
                  <option value="ADD_TRIAL_DAYS">Add complimentary Trial days</option>
                  <option value="SUSPEND">Suspend database access</option>
                  <option value="REACTIVATE">Reactivate database access</option>
                </select>
              </div>

              {/* Conditionally render plan tier for Upgrade/Downgrade */}
              {["UPGRADE", "DOWNGRADE"].includes(subAction) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Target Plan</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["FREE", "BASIC", "PRO"] as const).map((plan) => {
                      const active = subActionPlan === plan;
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => setSubActionPlan(plan)}
                          className={`py-2 px-1.5 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            active
                              ? "bg-purple-50 border-purple-500 text-purple-700"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          }`}
                        >
                          <span>{plan}</span>
                          <span className="text-[8px] opacity-60">
                            {plan === "PRO" ? "₹5k/mo" : plan === "BASIC" ? "₹3k/mo" : "Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Conditionally render days input for Extend/Add Trial */}
              {["EXTEND", "ADD_TRIAL_DAYS"].includes(subAction) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Number of Days</label>
                  <input
                    type="number"
                    value={subActionDays}
                    onChange={(e) => setSubActionDays(parseInt(e.target.value) || 0)}
                    placeholder="E.g. 30"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block"
                  />
                </div>
              )}

              {/* Actions details warning */}
              {subAction === "SUSPEND" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-red-600 leading-normal">
                    <strong>WARNING:</strong> Suspending this salon instantly disables the AI Receptionist, WhatsApp message routing, and campaign broadcasts. Dashboard warnings are activated.
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-250/50">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting || actionSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionSubmitting ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      Commit Command
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Editor Dialog Modal */}
      {profileModalOpen && selectedSalon && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-pink-650 uppercase block mb-1">Owner profile profile manager</span>
              <h3 className="text-lg font-black text-slate-900">{selectedSalon.name}</h3>
              <p className="text-slate-500 text-xs font-semibold mt-0.5">Edit contact and business registration files.</p>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-250 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-purple-600 animate-pulse shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Profile Saved</span>
                  <span className="text-[10px] text-slate-500">Audit logs and profile fields updated.</span>
                </div>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Basic Details */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Salon Business Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Number</label>
                  <input
                    type="text"
                    value={profileWhatsapp}
                    onChange={(e) => setProfileWhatsapp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block font-mono"
                  />
                </div>

                {/* Owner details */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Owner Name</label>
                  <input
                    type="text"
                    value={profileOwnerName}
                    onChange={(e) => setProfileOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Owner Mobile</label>
                  <input
                    type="text"
                    value={profileOwnerMobile}
                    onChange={(e) => setProfileOwnerMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Owner Alternate Mobile</label>
                  <input
                    type="text"
                    value={profileOwnerAltMobile}
                    onChange={(e) => setProfileOwnerAltMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Owner Email</label>
                  <input
                    type="email"
                    value={profileOwnerEmail}
                    onChange={(e) => setProfileOwnerEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>

                {/* Locations */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billing Address</label>
                  <input
                    type="text"
                    value={profileOwnerAddress}
                    onChange={(e) => setProfileOwnerAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City</label>
                  <input
                    type="text"
                    value={profileOwnerCity}
                    onChange={(e) => setProfileOwnerCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">State</label>
                  <input
                    type="text"
                    value={profileOwnerState}
                    onChange={(e) => setProfileOwnerState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block"
                  />
                </div>

                {/* Identifiers */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">GSTIN Number</label>
                  <input
                    type="text"
                    value={profileGst}
                    onChange={(e) => setProfileGst(e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Business Category</label>
                  <select
                    value={profileCategory}
                    onChange={(e) => setProfileCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-pink-500 block cursor-pointer"
                  >
                    <option value="HAIR_SALON">Hair Salon</option>
                    <option value="SPA_WELLNESS">Spa & Wellness Center</option>
                    <option value="NAIL_BAR">Nail Boutique</option>
                    <option value="UNISEX_SALON">Unisex Salon</option>
                    <option value="BARBER_SHOP">Barbershop</option>
                  </select>
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex gap-3 pt-6 border-t border-slate-250/50">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSubmitting || profileSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-pink-650 hover:bg-pink-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {profileSubmitting ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Details
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
