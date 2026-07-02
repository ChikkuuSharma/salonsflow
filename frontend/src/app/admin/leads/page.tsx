"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Calendar,
  X,
  Plus,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";

interface Lead {
  id: string;
  leadName: string;
  salonName: string | null;
  phone: string;
  city: string | null;
  interestedPlan: "FREE" | "BASIC" | "PRO";
  demoStatus: string | null; // e.g. "NONE", "SCHEDULED", "COMPLETED"
  status: "NEW" | "CONTACTED" | "DEMO_SCHEDULED" | "DEMO_DONE" | "NEGOTIATION" | "CONVERTED" | "LOST";
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"demo" | "advisor">("demo");

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Create form state
  const [formLeadName, setFormLeadName] = useState("");
  const [formSalonName, setFormSalonName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formInterestedPlan, setFormInterestedPlan] = useState<"FREE" | "BASIC" | "PRO">("FREE");
  const [formDemoStatus, setFormDemoStatus] = useState("NONE");
  const [formStatus, setFormStatus] = useState<Lead["status"]>("NEW");
  const [formFollowUpDate, setFormFollowUpDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load prospect leads.");
      setLeads(await res.json());
    } catch (err: any) {
      console.error(err);
      setError("Error accessing leads logs. Verify that the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [apiUrl]);

  const handleOpenCreateModal = () => {
    setFormLeadName("");
    setFormSalonName("");
    setFormPhone("");
    setFormCity("");
    setFormInterestedPlan("FREE");
    setFormDemoStatus("NONE");
    setFormStatus("NEW");
    setFormFollowUpDate("");
    setFormNotes("");
    setSuccess(false);
    setCreateModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setSelectedLead(lead);
    setFormLeadName(lead.leadName);
    setFormSalonName(lead.salonName || "");
    setFormPhone(lead.phone);
    setFormCity(lead.city || "");
    setFormInterestedPlan(lead.interestedPlan);
    setFormDemoStatus(lead.demoStatus || "NONE");
    setFormStatus(lead.status);
    
    if (lead.followUpDate) {
      try {
        setFormFollowUpDate(new Date(lead.followUpDate).toISOString().split("T")[0]);
      } catch {
        setFormFollowUpDate("");
      }
    } else {
      setFormFollowUpDate("");
    }
    setFormNotes(lead.notes || "");
    setSuccess(false);
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeadName || !formPhone) {
      alert("Name and Phone number are required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        leadName: formLeadName,
        salonName: formSalonName || undefined,
        phone: formPhone,
        city: formCity || undefined,
        interestedPlan: formInterestedPlan,
        demoStatus: formDemoStatus,
        status: formStatus,
        followUpDate: formFollowUpDate ? new Date(formFollowUpDate).toISOString() : undefined,
        notes: formNotes || undefined
      };

      const res = await fetch(`${apiUrl}/api/v1/admin/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to register lead.");

      setSuccess(true);
      await loadLeads();
      setTimeout(() => {
        setCreateModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create lead.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setSubmitting(true);
    setError(null);

    try {
      const body = {
        leadName: formLeadName,
        salonName: formSalonName || undefined,
        phone: formPhone,
        city: formCity || undefined,
        interestedPlan: formInterestedPlan,
        demoStatus: formDemoStatus,
        status: formStatus,
        followUpDate: formFollowUpDate ? new Date(formFollowUpDate).toISOString() : null,
        notes: formNotes || undefined
      };

      const res = await fetch(`${apiUrl}/api/v1/admin/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error("Failed to update lead prospect.");

      setSuccess(true);
      await loadLeads();
      setTimeout(() => {
        setEditModalOpen(false);
        setSelectedLead(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Update execution failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prospect lead?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/leads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadLeads();
      } else {
        alert("Failed to delete lead.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting lead.");
    }
  };

  const filteredLeads = leads.filter(
    (lead) => {
      const isAdvisor = lead.demoStatus === "AI_STYLE_LAB";
      const matchesTab = activeTab === "advisor" ? isAdvisor : !isAdvisor;
      const matchesSearch =
        lead.leadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.salonName && lead.salonName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.phone.includes(searchQuery);
      return matchesTab && matchesSearch;
    }
  );

  const getStatusBadgeColor = (status: Lead["status"]) => {
    switch (status) {
      case "CONVERTED":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "NEGOTIATION":
        return "bg-indigo-50 text-indigo-750 border border-indigo-200";
      case "DEMO_DONE":
        return "bg-pink-100 text-pink-800 border border-pink-200";
      case "DEMO_SCHEDULED":
        return "bg-blue-50 text-blue-750 border border-blue-200";
      case "CONTACTED":
        return "bg-amber-50 text-amber-705 border border-amber-200";
      case "LOST":
        return "bg-red-50 text-red-700 border border-red-200";
      default:
        return "bg-slate-100 text-slate-500 border border-slate-200";
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-650" />
        <span className="text-sm font-semibold">Retrieving sales pipelines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900">Lead Pipeline</h1>
          <p className="text-slate-500 text-sm">Log physical salon outreach prospects, schedule live platform demos, and trace conversion milestones.</p>
        </div>
        <div className="flex gap-3 self-start sm:self-auto">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all font-bold text-xs text-white shadow-lg shadow-purple-200/50"
          >
            <Plus className="h-4 w-4" />
            Add Prospect Lead
          </button>
          <button
            onClick={loadLeads}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all font-semibold text-xs text-slate-700 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Pipeline
          </button>
        </div>
      </div>

      {/* Aggregate pipeline metrics */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pipeline Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{leads.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demos Executed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-pink-600">
              {leads.filter(l => l.demoStatus === "COMPLETED" || l.status === "DEMO_DONE").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Negotiations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-indigo-650">
              {leads.filter(l => l.status === "NEGOTIATION").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl relative overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Converted Salons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-purple-650 flex items-center gap-1">
              {leads.filter(l => l.status === "CONVERTED").length}
              <Sparkles className="h-4.5 w-4.5 text-purple-600 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Leads Board */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <CardTitle className="text-sm font-bold text-slate-800 mr-2">Outreach Pipelines</CardTitle>
            
            {/* Tabs for Demo Leads vs AI Style Lab Leads */}
            <div className="bg-slate-100 p-0.5 rounded-xl inline-flex items-center border border-slate-200">
              <button
                onClick={() => setActiveTab("demo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "demo"
                    ? "bg-white text-purple-650 shadow-sm"
                    : "text-slate-500 hover:text-slate-850"
                }`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />
                Software Demo Leads
              </button>
              <button
                onClick={() => setActiveTab("advisor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "advisor"
                    ? "bg-white text-purple-650 shadow-sm"
                    : "text-slate-500 hover:text-slate-855"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-purple-600 animate-pulse" />
                AI Haircut Advisor Leads
              </button>
            </div>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors text-slate-800"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center text-slate-450 text-xs font-semibold">
              No leads currently logged in the pipeline directory.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Lead Contact</th>
                  <th className="px-6 py-4">Salon Name</th>
                  <th className="px-6 py-4">Phone / City</th>
                  <th className="px-6 py-4">Pipeline Status</th>
                  <th className="px-6 py-4">Follow-Up Date</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {lead.leadName}
                    </td>
                    <td className="px-6 py-4">
                      {lead.salonName || <span className="text-slate-450">Unspecified</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-slate-800">{lead.phone}</div>
                      <div className="text-[10px] text-slate-450 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {lead.city || "Unspecified"}
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-tight ${getStatusBadgeColor(lead.status)}`}>
                          {lead.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-450 font-bold uppercase tracking-tight">
                        Demo: {lead.demoStatus || "NONE"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {lead.followUpDate ? (
                        <span className="flex items-center gap-1.5 text-amber-600 font-bold">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(lead.followUpDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">No date set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-[11px] text-slate-500 font-normal">
                      {lead.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(lead)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-purple-650 hover:text-purple-500 font-bold transition-all text-[11px]"
                      >
                        <Sliders className="h-3 w-3" />
                        Update
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="inline-flex items-center p-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add Lead Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase block mb-1">Outreach registries</span>
              <h3 className="text-lg font-black text-slate-900">Log Prospect Lead</h3>
            </div>

            {success && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-250 rounded-xl flex items-center gap-3 animate-pulse">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-bold text-slate-900">Lead registered successfully.</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lead Contact Name</label>
                  <input
                    type="text"
                    required
                    value={formLeadName}
                    onChange={(e) => setFormLeadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Salon Entity Name</label>
                  <input
                    type="text"
                    value={formSalonName}
                    onChange={(e) => setFormSalonName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone / Mobile</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">City Location</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interested Plan</label>
                  <select
                    value={formInterestedPlan}
                    onChange={(e) => setFormInterestedPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-850 focus:outline-none focus:border-purple-500 block"
                  >
                    <option value="FREE">FREE Trial Tier</option>
                    <option value="BASIC">BASIC SaaS Tier</option>
                    <option value="PRO">PRO enterprise Tier</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Follow-Up Date</label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={(e) => setFormFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block cursor-pointer"
                    style={{ colorScheme: "light" }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outreach Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Logging..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <button
              onClick={() => {
                setEditModalOpen(false);
                setSelectedLead(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-slate-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-purple-600 uppercase block mb-1">Outreach action overrides</span>
              <h3 className="text-lg font-black text-slate-900">{selectedLead.leadName}</h3>
            </div>

            {success && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-250 rounded-xl flex items-center gap-3 animate-pulse">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                <span className="text-xs font-bold text-slate-900">Lead details updated.</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block cursor-pointer"
                  >
                    <option value="NEW">New Lead</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                    <option value="DEMO_DONE">Demo Done</option>
                    <option value="NEGOTIATION">Negotiations</option>
                    <option value="CONVERTED">CONVERTED (SaaS Salon)</option>
                    <option value="LOST">Lost / Rejected</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Demo Session Status</label>
                  <select
                    value={formDemoStatus}
                    onChange={(e) => setFormDemoStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block cursor-pointer"
                  >
                    <option value="NONE">No demo yet</option>
                    <option value="SCHEDULED">Demo Scheduled</option>
                    <option value="COMPLETED">Demo Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Follow-Up Date</label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={(e) => setFormFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block cursor-pointer"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interested Plan</label>
                  <select
                    value={formInterestedPlan}
                    onChange={(e) => setFormInterestedPlan(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block cursor-pointer"
                  >
                    <option value="FREE">FREE Trial</option>
                    <option value="BASIC">BASIC Plan</option>
                    <option value="PRO">PRO Plan</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outreach Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500 block h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedLead(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || success}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Updating..." : "Commit Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
