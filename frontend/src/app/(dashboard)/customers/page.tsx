"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Loader2, 
  UserPlus, 
  X, 
  Calendar, 
  DollarSign, 
  Scissors, 
  Users,
  Check,
  AlertCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  source: string | null;
  totalVisits: number;
  lastVisit: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Add offline customer form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    visitDate: new Date().toISOString().split("T")[0],
    serviceId: "",
    amountPaid: "",
    staffId: "",
    source: "WALK_IN",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Select options from backend
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

  const fetchCustomers = async (search = "") => {
    try {
      setLoading(true);
      setError(null);
      let url = `${apiUrl}/api/v1/customers`;
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load customer list: ${response.statusText}`);
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFormMetadata = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/services`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/v1/appointments/staff`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (staffRes.ok) setStaff(await staffRes.json());
    } catch (err) {
      console.error("Error loading form metadata:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchFormMetadata();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      setFormError("Client name and phone number are required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const response = await fetch(`${apiUrl}/api/v1/customers/offline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          gender: formData.gender || undefined,
          dateOfBirth: formData.dateOfBirth || undefined,
          visitDate: formData.visitDate || undefined,
          serviceId: formData.serviceId || undefined,
          amountPaid: formData.amountPaid ? Number(formData.amountPaid) : undefined,
          staffId: formData.staffId || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to add offline walk-in details.");
      }

      setShowAddModal(false);
      setToast({ message: "Offline visit registered successfully!", type: "success" });
      
      // Reset form
      setFormData({
        name: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        visitDate: new Date().toISOString().split("T")[0],
        serviceId: "",
        amountPaid: "",
        staffId: "",
        source: "WALK_IN",
        notes: "",
      });
      fetchCustomers(searchTerm);
    } catch (err: any) {
      setFormError(err.message || "Failed to add offline customer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-xs font-semibold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 font-display">Smart Client Database</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Unified profile console tracking visit history, loyalty tiers, and automated WhatsApp campaign tags.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 duration-200 border-0 cursor-pointer font-sans"
        >
          <UserPlus className="h-4.5 w-4.5" /> Add Offline Customer
        </button>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-55/40 bg-slate-50">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search clients by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/25 transition-all duration-200 font-semibold"
            />
          </div>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all bg-white font-semibold cursor-pointer">
            <Filter className="h-4 w-4 text-slate-400" /> Filter
          </button>
        </div>
        
        <CardContent className="p-0 overflow-x-auto">
          {error && (
            <div className="p-8 text-center text-red-500 font-medium">
              Error: {error}
            </div>
          )}

          {loading && customers.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
              <span className="text-slate-500 text-sm font-semibold">Synchronizing profiles...</span>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-display">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">Name</th>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">WhatsApp Number</th>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">Source</th>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">Total Visits</th>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">Last Visit</th>
                  <th className="px-6 py-4 font-bold text-slate-655 text-slate-600">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {customers.map((customer) => {
                  const isVIP = customer.totalVisits >= 5;
                  const status = isVIP ? 'VIP' : 'Active';
                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <Link href={`/customers/${customer.id}`} className="text-purple-600 hover:text-purple-700 hover:underline transition-colors">
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{customer.phone}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                          ${customer.source === 'WHATSAPP' || !customer.source 
                            ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                            : 'bg-blue-50 text-blue-650 border border-blue-105 border-blue-100'}`}>
                          {customer.source?.replace('_', ' ') || "WHATSAPP"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{customer.totalVisits}</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">
                        {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border
                          ${status === 'VIP' 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-205 border-slate-200'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-0 cursor-pointer">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {customers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-full text-slate-400 shadow-inner">
                          <Users className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-700 text-base font-display">No client records found</h3>
                          <p className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                            Registered client details and simulated WhatsApp booking data will synchronize dynamically here to fuel automated campaign lists.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add Offline Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-250">
            <div className="bg-slate-50 border-b border-slate-200 text-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-650" />
                <h3 className="font-bold text-lg font-display text-slate-800">Log Offline Walk-In</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-white custom-scrollbar text-slate-850 text-slate-800">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="">-- Select Gender --</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-semibold"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-xs font-extrabold uppercase text-purple-650 tracking-wider mb-3">Add Visit Details (Optional)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Visit Date</label>
                    <input
                      type="date"
                      value={formData.visitDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Service Received</label>
                    <select
                      value={formData.serviceId}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-semibold"
                    >
                      <option value="">-- Select Service --</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} - ₹{s.price}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Amount Paid (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter billing amount"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Assigned Stylist</label>
                    <select
                      value={formData.staffId}
                      onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 font-semibold"
                    >
                      <option value="">-- Choose Stylist --</option>
                      {staff.map((st) => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1 mt-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Stylist Remarks & Notes</label>
                  <textarea
                    placeholder="Log client hair details, skin texture remarks or general preferences..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 h-20 focus:outline-none focus:border-purple-500 resize-none font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer border-0"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  Register Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
