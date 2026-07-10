"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  Calendar, 
  UserCheck, 
  Loader2, 
  X, 
  Check, 
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  UserPlus
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
}

interface Staff {
  id: string;
  name: string;
}

interface WaitingListEntry {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string | null;
  requestedStartTime: string;
  priority: number;
  status: "WAITING" | "NOTIFIED" | "BOOKED" | "EXPIRED";
  createdAt: string;
  customer: Customer;
  service: Service;
  staff: Staff | null;
}

export default function WaitingListPage() {
  const [waitlist, setWaitlist] = useState<WaitingListEntry[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    serviceId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    time: "12:00",
    priority: 1,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [waitlistRes, customersRes, servicesRes, staffRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/appointments/waiting-list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/services`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/appointments/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (waitlistRes.ok) setWaitlist(await waitlistRes.json());
      if (customersRes.ok) setCustomerList(await customersRes.json());
      if (servicesRes.ok) setServiceList(await servicesRes.json());
      if (staffRes.ok) setStaffList(await staffRes.json());
    } catch (err) {
      console.error("Error loading waitlist data:", err);
      setToast({ message: "Failed to load dashboard data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.serviceId || !formData.date || !formData.time) {
      setFormError("Please fill out all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const requestedStartTime = new Date(`${formData.date}T${formData.time}:00`);

      const response = await fetch(`${apiUrl}/api/v1/appointments/waiting-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          serviceId: formData.serviceId,
          staffId: formData.staffId || null,
          requestedStartTime: requestedStartTime.toISOString(),
          priority: Number(formData.priority)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to add customer to waiting list.");
      }

      setShowAddModal(false);
      setToast({ message: "Customer added to priority waitlist!", type: "success" });
      fetchAllData();
    } catch (err: any) {
      setFormError(err.message || "Failed to create waitlist entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteEntry = async (entry: WaitingListEntry) => {
    if (!confirm(`Are you sure you want to promote ${entry.customer.name} to a confirmed booking?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/appointments/waiting-list/${entry.id}/promote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to promote customer.");
      }

      setToast({ message: `${entry.customer.name} has been promoted to a confirmed booking!`, type: "success" });
      fetchAllData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to promote entry.", type: "error" });
    }
  };

  const handleRemoveEntry = async (entry: WaitingListEntry) => {
    if (!confirm(`Are you sure you want to remove ${entry.customer.name} from the waiting list?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/appointments/waiting-list/${entry.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to remove waitlist entry.");
      }

      setToast({ message: "Waitlist entry removed successfully.", type: "success" });
      fetchAllData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete entry.", type: "error" });
    }
  };

  const filteredWaitlist = waitlist.filter((entry) => {
    const matchesSearch = 
      entry.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.customer.phone.includes(searchTerm) ||
      entry.service.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || entry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 relative max-w-[1400px] mx-auto pb-12 text-zinc-100">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-950 text-emerald-400 border-emerald-900/40" : "bg-rose-950 text-rose-400 border-rose-900/40"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <span className="text-xs font-semibold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">Priority Waiting List</h2>
          <p className="text-zinc-400 text-xs mt-1">Manage customers waiting for occupied slots. Expired or cancelled bookings automatically trigger waitlist recoveries.</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              customerId: customerList[0]?.id || "",
              serviceId: serviceList[0]?.id || "",
              staffId: "",
              date: new Date().toISOString().split("T")[0],
              time: "12:00",
              priority: 1,
            });
            setFormError(null);
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="h-4.5 w-4.5 text-zinc-950" /> Add to Waitlist
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/60 p-4 rounded-3xl border border-zinc-800 shadow-sm backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by client name, phone or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-zinc-100 placeholder-zinc-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-zinc-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="ALL" className="bg-zinc-950">All Entries</option>
            <option value="WAITING" className="bg-zinc-950">Waiting</option>
            <option value="NOTIFIED" className="bg-zinc-950">Notified (Held)</option>
            <option value="BOOKED" className="bg-zinc-950">Booked</option>
            <option value="EXPIRED" className="bg-zinc-950">Expired</option>
          </select>
        </div>
      </div>

      {/* Waitlist List/Table */}
      {loading && waitlist.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-24 gap-3 bg-zinc-900/40 border border-zinc-800 rounded-3xl shadow-sm">
          <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
          <span className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Loading waiting list...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredWaitlist.map((entry) => {
            const requestedDate = new Date(entry.requestedStartTime);
            const formattedDate = requestedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            const formattedTime = requestedDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <Card key={entry.id} className="overflow-hidden border border-zinc-800 shadow-sm hover-scale transition-all duration-305 rounded-3xl bg-zinc-900/60 flex flex-col justify-between backdrop-blur-md">
                <CardContent className="p-6 space-y-4">
                  {/* Top Bar (Priority & Status) */}
                  <div className="flex items-center justify-between">
                    <div>
                      {entry.priority === 2 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase">
                          <Sparkles className="h-3 w-3 fill-amber-400 text-amber-400" /> VIP
                        </span>
                      ) : (
                        <span className="inline-flex items-center bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase">
                          Regular
                        </span>
                      )}
                    </div>
                    
                    <div>
                      {entry.status === "WAITING" && (
                        <span className="inline-flex bg-blue-950/40 text-blue-400 border border-blue-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                          Waiting
                        </span>
                      )}
                      {entry.status === "NOTIFIED" && (
                        <span className="inline-flex bg-amber-950/40 text-amber-400 border border-amber-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                          Notified (Held)
                        </span>
                      )}
                      {entry.status === "BOOKED" && (
                        <span className="inline-flex bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                          Booked
                        </span>
                      )}
                      {entry.status === "EXPIRED" && (
                        <span className="inline-flex bg-zinc-950 text-zinc-500 border border-zinc-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-950/40 text-emerald-400 p-3 rounded-2xl border border-emerald-900/30 shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-100 text-sm font-display">{entry.customer.name}</h4>
                      <p className="text-xs text-zinc-400 font-medium">{entry.customer.phone}</p>
                    </div>
                  </div>

                  {/* Details (Service & Staff) */}
                  <div className="space-y-2 text-xs text-zinc-300 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">Service:</span>
                      <span className="font-bold text-zinc-200">{entry.service.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">Stylist:</span>
                      <span className="font-bold text-zinc-200">{entry.staff ? entry.staff.name : "Any Stylist"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-zinc-500">Requested window:</span>
                      <span className="font-bold text-zinc-200 font-mono">{formattedDate} at {formattedTime}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    {entry.status === "WAITING" || entry.status === "NOTIFIED" ? (
                      <button
                        onClick={() => handlePromoteEntry(entry)}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer border-0"
                      >
                        <UserCheck className="h-4 w-4" /> Book/Promote
                      </button>
                    ) : (
                      <div className="flex-1 text-center py-2.5 text-xs font-bold text-zinc-500 italic bg-zinc-950 border border-zinc-800 rounded-xl">
                        {entry.status === "BOOKED" ? "Already Booked" : "Hold Expired"}
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleRemoveEntry(entry)}
                      className="p-2.5 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer shadow-sm bg-transparent"
                      title="Remove Entry"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredWaitlist.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-zinc-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30 text-zinc-500" />
              <p className="text-xs font-bold uppercase tracking-wider">No waitlist entries found.</p>
            </div>
          )}
        </div>
      )}

      {/* Add to Waitlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-zinc-100 font-display text-sm">Add to Waitlist</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-900/40 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Customer Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Select Client *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="" disabled className="bg-zinc-950">-- Choose Client --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-950">{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {/* Service Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Select Service *</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="" disabled className="bg-zinc-950">-- Choose Service --</option>
                  {serviceList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950">{s.name} (₹{s.price})</option>
                  ))}
                </select>
              </div>

              {/* Stylist Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Select Stylist (Optional)</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="" className="bg-zinc-950">Any Available Stylist</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id} className="bg-zinc-950">{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Priority Level</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={1} className="bg-zinc-950">Regular Priority (1)</option>
                  <option value={2} className="bg-zinc-950">VIP Priority (2)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer border-0"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
                  Add to List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

