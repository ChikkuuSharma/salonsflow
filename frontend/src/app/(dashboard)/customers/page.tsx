"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, MoreHorizontal, Loader2, UserPlus, X, Calendar, DollarSign, Scissors, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: string | null;
  source: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface Staff {
  id: string;
  name: string;
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    visitDate: "",
    serviceId: "",
    amountPaid: "",
    staffId: "",
    source: "WALK_IN",
    notes: "",
  });

  const fetchCustomers = async (search = "") => {
    try {
      setLoading(true);
      setError(null);
      const token = "dev-bypass-token";
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const queryParam = search ? `?search=${encodeURIComponent(search)}` : "";
      
      const response = await fetch(`${apiUrl}/api/v1/customers${queryParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load customers: ${response.statusText}`);
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchTerm);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Load services and staff when modal opens
  useEffect(() => {
    if (showAddModal) {
      // Set default date to current local time formatted for datetime-local input
      const localNow = new Date();
      const offsetMs = localNow.getTimezoneOffset() * 60 * 1000;
      const localISOTime = new Date(localNow.getTime() - offsetMs).toISOString().slice(0, 16);
      
      setFormData(prev => ({
        ...prev,
        visitDate: localISOTime
      }));

      const loadModalData = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const token = "dev-bypass-token";

          const [servicesRes, staffRes] = await Promise.all([
            fetch(`${apiUrl}/api/v1/rebookings/services`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/api/v1/appointments/staff`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          if (servicesRes.ok) {
            const data = await servicesRes.json();
            setServices(data);
          }
          if (staffRes.ok) {
            const data = await staffRes.json();
            setStaffList(data);
          }
        } catch (err) {
          console.error("Failed to load modal details", err);
        }
      };
      loadModalData();
    }
  }, [showAddModal]);

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find((s) => s.id === serviceId);
    setFormData((prev) => ({
      ...prev,
      serviceId,
      amountPaid: selectedService ? selectedService.price.toString() : "",
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.serviceId || !formData.source) {
      setFormError("Please fill in all required fields (Name, Phone, Service, Source).");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = "dev-bypass-token";

      const payload = {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
        visitDate: new Date(formData.visitDate).toISOString(),
        serviceId: formData.serviceId,
        amountPaid: formData.amountPaid ? parseFloat(formData.amountPaid) : undefined,
        staffId: formData.staffId || undefined,
        source: formData.source,
        notes: formData.notes || undefined,
      };

      const response = await fetch(`${apiUrl}/api/v1/customers/offline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to add offline customer.");
      }

      setShowAddModal(false);
      // Reset form fields
      setFormData({
        name: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        visitDate: "",
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
    <div className="space-y-6 text-zinc-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">Smart Client Database</h2>
          <p className="text-sm text-zinc-400 font-medium">Unified profile console tracking visit history, loyalty tiers, and automated WhatsApp campaign tags.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 duration-200 border-0 cursor-pointer font-sans"
        >
          <UserPlus className="h-4.5 w-4.5" /> Add Offline Customer
        </button>
      </div>

      <Card className="bg-zinc-900/60 border-zinc-800 shadow-sm overflow-hidden rounded-3xl backdrop-blur-md">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950/40">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search clients by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200 font-semibold"
            />
          </div>
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-all bg-zinc-900 font-semibold cursor-pointer">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
        
        <CardContent className="p-0 overflow-x-auto">
          {error && (
            <div className="p-8 text-center text-red-400 font-medium">
              Error: {error}
            </div>
          )}

          {loading && customers.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <span className="text-zinc-400 text-sm font-semibold">Synchronizing profiles...</span>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-display">
                <tr>
                  <th className="px-6 py-4 font-bold text-zinc-300">Name</th>
                  <th className="px-6 py-4 font-bold text-zinc-300">WhatsApp Number</th>
                  <th className="px-6 py-4 font-bold text-zinc-300">Source</th>
                  <th className="px-6 py-4 font-bold text-zinc-300">Total Visits</th>
                  <th className="px-6 py-4 font-bold text-zinc-300">Last Visit</th>
                  <th className="px-6 py-4 font-bold text-zinc-300">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                {customers.map((customer) => {
                  const isVIP = customer.totalVisits >= 5;
                  const status = isVIP ? 'VIP' : 'Active';
                  return (
                    <tr key={customer.id} className="hover:bg-zinc-900/30 transition-colors border-b border-zinc-800/50">
                      <td className="px-6 py-4 font-bold text-zinc-100">
                        <Link href={`/customers/${customer.id}`} className="text-emerald-400 hover:text-emerald-350 hover:underline transition-colors">
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-semibold">{customer.phone}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                          ${customer.source === 'WHATSAPP' || !customer.source 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                            : 'bg-blue-950/40 text-blue-400 border border-blue-900/30'}`}>
                          {customer.source?.replace('_', ' ') || "WHATSAPP"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-semibold">{customer.totalVisits}</td>
                      <td className="px-6 py-4 text-zinc-300 font-semibold">
                        {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                          ${status === 'VIP' 
                            ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' 
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-zinc-500 hover:text-zinc-300 transition-colors bg-transparent border-0 cursor-pointer">
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
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-550 shadow-inner">
                          <Users className="h-7 w-7" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-200 text-base font-display">No client records found</h3>
                          <p className="text-xs text-zinc-400 mt-1 font-semibold leading-relaxed">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-zinc-800 animate-in fade-in zoom-in-95 duration-250">
            <div className="bg-zinc-950 border-b border-zinc-800 text-zinc-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg font-display">Log Offline Walk-In</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-zinc-900 custom-scrollbar">
              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-900/40 rounded-xl text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arjun Mehta"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +919812345678"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-zinc-955 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="" className="bg-zinc-950">Select Gender</option>
                    <option value="MALE" className="bg-zinc-950">Male</option>
                    <option value="FEMALE" className="bg-zinc-950">Female</option>
                    <option value="NON_BINARY" className="bg-zinc-950">Non-binary</option>
                    <option value="PREFER_NOT_TO_SAY" className="bg-zinc-950">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-4 my-2">
                <p className="text-xs font-bold text-emerald-450 text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Log Visit Details
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Visit Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.visitDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
                      className="w-full bg-zinc-955 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Client Source *</label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="WALK_IN" className="bg-zinc-950">Walk-in</option>
                      <option value="PHONE" className="bg-zinc-950">Phone Call</option>
                      <option value="REFERRAL" className="bg-zinc-950">Referral</option>
                      <option value="INSTAGRAM" className="bg-zinc-950">Instagram</option>
                      <option value="FACEBOOK" className="bg-zinc-950">Facebook</option>
                      <option value="GOOGLE" className="bg-zinc-950">Google Maps / Search</option>
                      <option value="OTHER" className="bg-zinc-950">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <Scissors className="h-3.5 w-3.5 text-zinc-500" /> Service Taken *
                  </label>
                  <select
                    required
                    value={formData.serviceId}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="" className="bg-zinc-950">Select Service</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id} className="bg-zinc-950">
                        {svc.name} (₹{svc.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-zinc-500" /> Price Paid (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual amount paid"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-805 border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-zinc-500" /> Stylist / Staff
                </label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="" className="bg-zinc-950">Select Stylist (Optional)</option>
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id} className="bg-zinc-950">
                      {stf.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Stylist Notes</label>
                <textarea
                  placeholder="Allergies, styling notes, haircut specifications..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-805 border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 h-20 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer border-0"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
                  Save & Log Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
