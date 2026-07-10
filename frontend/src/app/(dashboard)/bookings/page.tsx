"use client";

import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  User, 
  Clock, 
  Scissors, 
  Trash2, 
  X, 
  Loader2, 
  Check,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Staff {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string | null;
  startTime: string;
  endTime: string;
  status: string;
  customer: Customer;
  service: Service;
  staff: Staff | null;
}

export default function BookingsPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<"day" | "week" | "staff">("staff");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    customerId: "",
    serviceId: "",
    staffId: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

  const loadData = async () => {
    try {
      setLoading(true);
      const formattedDate = currentDate.toISOString().split("T")[0];
      
      const [apptsRes, staffRes, servicesRes, customersRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/appointments?date=${formattedDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/appointments/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/services`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (apptsRes.ok) setAppointments(await apptsRes.json());
      if (staffRes.ok) setStaffList(await staffRes.json());
      if (servicesRes.ok) setServiceList(await servicesRes.json());
      if (customersRes.ok) setCustomerList(await customersRes.json());
    } catch (err) {
      console.error("Error loading calendar data:", err);
      setToast({ message: "Failed to load calendar data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    const nextDate = new Date(currentDate);
    if (direction === "today") {
      setCurrentDate(new Date());
    } else if (view === "week") {
      nextDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
      setCurrentDate(nextDate);
    } else {
      nextDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
      setCurrentDate(nextDate);
    }
  };

  const handleOpenAddModal = (initialStaffId?: string, initialTime?: string) => {
    setFormData({
      customerId: customerList[0]?.id || "",
      serviceId: serviceList[0]?.id || "",
      staffId: initialStaffId || "",
      date: currentDate.toISOString().split("T")[0],
      time: initialTime || "10:00",
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.serviceId || !formData.date || !formData.time) {
      setFormError("Please fill out all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      
      const startTime = new Date(`${formData.date}T${formData.time}:00`);

      const response = await fetch(`${apiUrl}/api/v1/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: formData.customerId,
          serviceId: formData.serviceId,
          staffId: formData.staffId || undefined,
          startTime: startTime.toISOString()
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Booking creation failed.");
      }

      setShowAddModal(false);
      setToast({ message: "Appointment booked successfully!", type: "success" });
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (apptId: string, status: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/appointments/${apptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setToast({ message: `Appointment status updated to ${status}!`, type: "success" });
      setSelectedAppt(null);
      loadData();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update status.", type: "error" });
    }
  };

  // Helper to format date label
  const getDateLabel = () => {
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  // Hours to show in calendar grids (e.g. 09:00 to 20:00)
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);

  return (
    <div className="space-y-6 relative max-w-[1400px] mx-auto pb-12 text-zinc-100">
      {/* Toast alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-950 text-emerald-400 border-emerald-900/40" : "bg-rose-950 text-rose-450 text-rose-400 border-rose-900/40"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">Appointments Calendar</h2>
          <p className="text-zinc-400 text-xs mt-1 font-medium">Schedule and manage customer bookings, stylist shifts, and slot distribution.</p>
        </div>
        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all self-start cursor-pointer font-sans"
        >
          <Plus className="h-4.5 w-4.5" /> Book Appointment
        </button>
      </div>

      {/* Controls Card */}
      <div className="bg-zinc-900/60 p-4 rounded-3xl border border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleNavigate("today")}
            className="border border-zinc-800 bg-zinc-900 rounded-xl px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center border border-zinc-800 bg-zinc-900 rounded-xl overflow-hidden">
            <button 
              onClick={() => handleNavigate("prev")}
              className="p-2.5 hover:bg-zinc-800 border-r border-zinc-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-400" />
            </button>
            <button 
              onClick={() => handleNavigate("next")}
              className="p-2.5 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">{getDateLabel()}</span>
        </div>

        <div className="flex items-center border border-zinc-800 rounded-xl p-0.5 bg-zinc-950">
          {(["staff", "day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                view === v ? "bg-zinc-900 text-zinc-100 shadow-sm" : "text-zinc-450 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v === "staff" ? "Stylist View" : `${v} view`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar View Container */}
      <Card className="border-zinc-800 rounded-3xl overflow-hidden bg-zinc-900/60 shadow-sm backdrop-blur-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-zinc-900/40">
              <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Fetching appointment metrics...</p>
            </div>
          ) : (
            <div>
              {/* STAFF DAY VIEW */}
              {view === "staff" && (
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[800px]">
                    {/* Header Columns */}
                    <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] border-b border-zinc-800 bg-zinc-950/60">
                      <div className="p-4 text-center font-bold text-xs text-zinc-400 uppercase tracking-wider border-r border-zinc-800 flex items-center justify-center font-mono">Time</div>
                      {staffList.map((staff) => (
                        <div key={staff.id} className="p-4 text-center border-r border-zinc-850 border-zinc-800">
                          <p className="font-extrabold text-xs text-zinc-100 uppercase tracking-wide font-display">{staff.name}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-bold mt-1.5 border ${
                            staff.isAvailable 
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30" 
                              : "bg-zinc-900 text-zinc-500 border-zinc-850 border-zinc-800"
                          }`}>
                            {staff.isAvailable ? "Available" : "Off Duty"}
                          </span>
                        </div>
                      ))}
                      {staffList.length === 0 && (
                        <div className="p-4 text-center text-xs text-zinc-500">No staff configured.</div>
                      )}
                    </div>

                    {/* Timeline Rows */}
                    <div className="divide-y divide-zinc-800/80 bg-zinc-900/20">
                      {hours.map((hour) => {
                        const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                        return (
                          <div key={hour} className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] min-h-[85px]">
                            {/* Time block */}
                            <div className="p-4 text-center text-[10px] font-bold text-zinc-400 border-r border-zinc-850 border-zinc-800 flex items-center justify-center bg-zinc-950/50 font-mono uppercase">
                              {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                            </div>
                            
                            {/* Stylist Columns */}
                            {staffList.map((staff) => {
                              // Find appointments for this hour/staff
                              const appts = appointments.filter((appt) => {
                                if (appt.staffId !== staff.id) return false;
                                const startTime = new Date(appt.startTime);
                                return startTime.getHours() === hour;
                              });

                              return (
                                <div 
                                  key={staff.id} 
                                  className="p-2 border-r border-zinc-850 border-zinc-800 relative group hover:bg-zinc-900/30 transition-colors min-h-[85px]"
                                >
                                  {appts.map((appt) => (
                                    <div
                                      key={appt.id}
                                      onClick={() => setSelectedAppt(appt)}
                                      className={`p-2 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] shadow-sm select-none absolute inset-x-2 top-2 z-10 ${
                                        appt.status === "COMPLETED" 
                                          ? "bg-indigo-950/50 border-indigo-900/40 text-indigo-300 font-semibold" 
                                          : appt.status === "CANCELLED" 
                                            ? "bg-rose-950/40 border-rose-900/30 text-rose-450 text-rose-400 line-through font-semibold" 
                                            : appt.status === "PENDING"
                                              ? "bg-amber-950/40 border-amber-900/40 border-dashed text-amber-400 font-bold animate-pulse"
                                              : "bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 font-semibold"
                                      }`}
                                    >
                                      <p className="font-extrabold text-xs truncate text-zinc-100">{appt.customer.name}</p>
                                      <p className="text-[9px] font-semibold opacity-90 mt-0.5 truncate text-zinc-300">{appt.service.name}</p>
                                      <div className="flex items-center gap-1 text-[9px] opacity-75 mt-1 font-mono">
                                        <Clock className="h-3 w-3" />
                                        <span>{new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    </div>
                                  ))}

                                  {appts.length === 0 && staff.isAvailable && (
                                    <button
                                      onClick={() => handleOpenAddModal(staff.id, hourStr)}
                                      className="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500/5 text-emerald-400 cursor-pointer"
                                    >
                                      <Plus className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* DAY VIEW (TIMELINE) */}
              {view === "day" && (
                <div className="p-6 divide-y divide-zinc-800 space-y-4 bg-zinc-900/20">
                  {appointments.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                      <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-semibold">No bookings scheduled for today.</p>
                    </div>
                  ) : (
                    appointments.map((appt) => (
                      <div 
                        key={appt.id} 
                        onClick={() => setSelectedAppt(appt)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-900/40 rounded-2xl border border-transparent hover:border-zinc-805 hover:border-zinc-800 transition-all cursor-pointer gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-emerald-950/40 text-emerald-400 p-3 rounded-xl flex-shrink-0 border border-emerald-900/30">
                            <Scissors className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-100">{appt.customer.name}</h4>
                            <p className="text-xs text-zinc-400 font-semibold">{appt.service.name} • ₹{appt.service.price} • {appt.service.durationMins} mins</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-2">
                              <span className="flex items-center gap-1 font-mono"><Clock className="h-3.5 w-3.5" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(appt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Stylist: {appt.staff?.name || "Unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            appt.status === "COMPLETED" 
                              ? "bg-indigo-950/50 border-indigo-900/40 text-indigo-300" 
                              : appt.status === "CANCELLED" 
                                ? "bg-rose-950/40 border-rose-900/30 text-rose-455 text-rose-400 line-through" 
                                : appt.status === "PENDING"
                                  ? "bg-amber-950/40 border-amber-900/40 text-amber-400"
                                  : "bg-emerald-950/60 border-emerald-900/40 text-emerald-400"
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* WEEK VIEW */}
              {view === "week" && (
                <div className="grid grid-cols-7 divide-x divide-zinc-800 bg-zinc-900/20">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + i);
                    
                    const dayName = startOfWeek.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = startOfWeek.getDate();
                    const formattedDate = startOfWeek.toISOString().split("T")[0];

                    // Find appointments for this specific date
                    const dailyAppts = appointments.filter((appt) => {
                      return appt.startTime.startsWith(formattedDate);
                    });

                    return (
                      <div key={i} className="min-h-[400px] p-3 flex flex-col gap-3">
                        <div className="text-center border-b border-zinc-800 pb-2">
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider font-mono">{dayName}</p>
                          <p className="text-lg font-black text-zinc-100 mt-0.5 font-display">{dayNum}</p>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px] custom-scrollbar">
                          {dailyAppts.map((appt) => (
                            <div
                              key={appt.id}
                              onClick={() => setSelectedAppt(appt)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:translate-y-[-1px] shadow-sm select-none ${
                                appt.status === "COMPLETED" 
                                  ? "bg-indigo-950/50 border-indigo-900/40 text-indigo-300 font-semibold" 
                                  : appt.status === "CANCELLED" 
                                    ? "bg-rose-950/40 border-rose-900/30 text-rose-455 text-rose-400 line-through font-semibold" 
                                    : appt.status === "PENDING"
                                      ? "bg-amber-950/40 border-amber-900/40 border-dashed text-amber-400 font-bold"
                                      : "bg-emerald-950/60 border border-emerald-900/40 text-emerald-400 font-semibold"
                              }`}
                            >
                              <p className="font-extrabold text-xs truncate text-zinc-100">{appt.customer.name}</p>
                              <p className="text-[9px] font-semibold opacity-90 truncate mt-0.5 text-zinc-300">{appt.service.name}</p>
                              <p className="text-[9px] font-bold text-zinc-500 mt-1 font-mono">{new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          ))}
                          {dailyAppts.length === 0 && (
                            <p className="text-[10px] text-center text-zinc-550 py-12 font-medium">No bookings</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-800 animate-in zoom-in-95 duration-250">
            <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-zinc-100 font-display">New Appointment</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-950/80 border border-rose-900/40 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block font-semibold">Select Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:bg-zinc-950 focus:border-emerald-500/50 font-semibold"
                >
                  <option value="" disabled className="bg-zinc-950">-- Select Customer --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-950">{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block font-semibold">Select Service *</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:bg-zinc-950 focus:border-emerald-500/50 font-semibold"
                >
                  <option value="" disabled className="bg-zinc-950">-- Select Service --</option>
                  {serviceList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950">{s.name} - ₹{s.price} ({s.durationMins} mins)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block font-semibold">Assign Stylist (Optional)</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:bg-zinc-950 focus:border-emerald-500/50 font-semibold"
                >
                  <option value="" className="bg-zinc-950">-- Auto-Assign Best Available --</option>
                  {staffList.filter(s => s.isAvailable).map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-950">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:bg-zinc-950 focus:border-emerald-500/50 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block font-semibold">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:bg-zinc-950 focus:border-emerald-500/50 font-semibold"
                  />
                </div>
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
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer font-sans border-0"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />}
                  Book Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Detail Dialog */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-800 animate-in zoom-in-95 duration-250 text-zinc-100">
            <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-zinc-100 text-lg font-display">Appointment Details</h3>
              <button 
                onClick={() => setSelectedAppt(null)}
                className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4 text-zinc-300 font-sans">
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-xl flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Customer</p>
                    <p className="font-bold text-zinc-100 text-sm">{selectedAppt.customer.name}</p>
                    <p className="text-xs text-zinc-400 font-medium">{selectedAppt.customer.phone}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-xl flex-shrink-0">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Service</p>
                    <p className="font-bold text-zinc-100 text-sm">{selectedAppt.service.name}</p>
                    <p className="text-xs text-zinc-400 font-medium">₹{selectedAppt.service.price} • {selectedAppt.service.durationMins} mins</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-xl flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Schedule</p>
                    <p className="font-bold text-zinc-100 text-sm">
                      {new Date(selectedAppt.startTime).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-zinc-400 font-medium font-mono">
                      {new Date(selectedAppt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedAppt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-xl flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Assigned Stylist</p>
                    <p className="font-bold text-zinc-100 text-sm">{selectedAppt.staff?.name || "Unassigned / Auto-assign"}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-zinc-805 border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedAppt.status === "COMPLETED" 
                      ? "bg-indigo-950/50 border-indigo-900/40 text-indigo-300" 
                      : selectedAppt.status === "CANCELLED" 
                        ? "bg-rose-950/40 border-rose-900/30 text-rose-455 text-rose-400 line-through" 
                        : selectedAppt.status === "PENDING"
                          ? "bg-amber-950/40 border-amber-900/40 text-amber-400"
                          : "bg-emerald-950/60 border-emerald-900/40 text-emerald-400"
                  }`}>
                    {selectedAppt.status}
                  </span>
                </div>
              </div>

              {selectedAppt.status === "PENDING" && (
                <div className="flex flex-col sm:flex-row gap-3 border-t border-zinc-800 pt-4">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CONFIRMED")}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-sans border-0"
                  >
                    <CheckSquare className="h-4 w-4 text-zinc-950" /> Accept Booking
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CANCELLED")}
                    className="flex-1 border border-rose-900/50 hover:bg-rose-950/40 text-rose-400 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans border-0 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" /> Decline Booking
                  </button>
                </div>
              )}

              {selectedAppt.status === "CONFIRMED" && (
                <div className="flex flex-col sm:flex-row gap-3 border-t border-zinc-800 pt-4">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "COMPLETED")}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-sans border-0"
                  >
                    <CheckSquare className="h-4 w-4 text-zinc-950" /> Check Out / Complete
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CANCELLED")}
                    className="flex-1 border border-rose-900/50 hover:bg-rose-950/40 text-rose-400 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans border-0 bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 text-rose-455 text-rose-400" /> Cancel Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

