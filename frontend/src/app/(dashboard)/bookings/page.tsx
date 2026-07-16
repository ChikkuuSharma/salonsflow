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

  const getLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dy = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dy}`;
  };

  // Form states
  const [formData, setFormData] = useState({
    customerId: "",
    serviceId: "",
    staffId: "",
    date: getLocalDateStr(new Date()),
    time: "10:00",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

  const loadData = async () => {
    try {
      setLoading(true);
      const y = currentDate.getFullYear();
      const mo = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const dy = currentDate.getDate().toString().padStart(2, '0');
      const formattedDate = `${y}-${mo}-${dy}`;
      
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
      date: getLocalDateStr(currentDate),
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
    <div className="space-y-6 relative max-w-[1400px] mx-auto pb-12 text-slate-800">
      {/* Toast alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 font-display">Appointments Calendar</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">View, reschedule, and manage client bookings.</p>
        </div>
        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all self-start cursor-pointer font-sans border-0"
        >
          <Plus className="h-4.5 w-4.5" /> Book Appointment
        </button>
      </div>

      {/* Controls Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleNavigate("today")}
            className="border border-slate-200 bg-white rounded-xl px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 bg-white rounded-xl overflow-hidden">
            <button 
              onClick={() => handleNavigate("prev")}
              className="p-2.5 hover:bg-slate-50 border-r border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <button 
              onClick={() => handleNavigate("next")}
              className="p-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">{getDateLabel()}</span>
        </div>

        <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100">
          {(["staff", "day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                view === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v === "staff" ? "Stylist View" : `${v} view`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar View Container */}
      <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-slate-50/50">
              <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Fetching appointment metrics...</p>
            </div>
          ) : (
            <div>
              {/* STAFF DAY VIEW */}
              {view === "staff" && (
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[800px]">
                    {/* Header Columns */}
                    <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] border-b border-slate-200 bg-slate-50/50">
                      <div className="p-4 text-center font-bold text-xs text-slate-500 uppercase tracking-wider border-r border-slate-200 flex items-center justify-center font-mono">Time</div>
                      {staffList.map((staff) => (
                        <div key={staff.id} className="p-4 text-center border-r border-slate-200">
                          <p className="font-extrabold text-xs text-slate-800 uppercase tracking-wide font-display">{staff.name}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-bold mt-1.5 border ${
                            staff.isAvailable 
                              ? "bg-purple-50 text-purple-600 border-purple-100" 
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}>
                            {staff.isAvailable ? "Available" : "Off Duty"}
                          </span>
                        </div>
                      ))}
                      {staffList.length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-500">No staff configured.</div>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 bg-white">
                      {hours.map((hour) => {
                        return (
                          <div key={hour} className="grid grid-cols-[100px_repeat(auto-fit,minmax(150px,1fr))] h-[120px]">
                            {/* Time block */}
                            <div className="text-center text-[10px] font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center bg-slate-50/30 font-mono uppercase h-[120px]">
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
                                  className="border-r border-slate-100 relative group h-[120px]"
                                >
                                  {/* Underlying 15-minute hover slots (z-0) */}
                                  {staff.isAvailable && (
                                    <div className="absolute inset-0 flex flex-col z-0">
                                      {[0, 15, 30, 45].map((mins) => {
                                        const slotTimeStr = `${hour.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
                                        return (
                                          <button
                                            key={mins}
                                            type="button"
                                            onClick={() => handleOpenAddModal(staff.id, slotTimeStr)}
                                            className="flex-1 w-full relative border-b border-dashed border-slate-100/30 hover:bg-purple-500/[0.04] transition-all group/slot flex items-center justify-center cursor-pointer border-0 bg-transparent"
                                            title={`Book at ${slotTimeStr}`}
                                          >
                                            <span className="opacity-0 group-hover/slot:opacity-100 text-[9px] text-purple-600 font-bold transition-opacity">
                                              + {hour > 12 ? hour - 12 : hour}:{mins.toString().padStart(2, "0")} {hour >= 12 ? "PM" : "AM"}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Actual Appointments (z-10) */}
                                  {appts.map((appt) => {
                                    const startTime = new Date(appt.startTime);
                                    const startMin = startTime.getMinutes();
                                    const duration = appt.service?.durationMins || 30;
                                    
                                    // Position relative to the 120px hourly height (2px per minute)
                                    const topPx = startMin * 2;
                                    const heightPx = Math.max(26, duration * 2);
                                    
                                    return (
                                      <div
                                        key={appt.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAppt(appt);
                                        }}
                                        style={{
                                          top: `${topPx}px`,
                                          height: `${heightPx}px`
                                        }}
                                        className={`px-2 py-1 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] shadow-xs select-none absolute inset-x-1.5 z-10 flex flex-col justify-between overflow-hidden ${
                                          appt.status === "COMPLETED" 
                                            ? "bg-indigo-50 border-indigo-100 text-indigo-650 font-semibold" 
                                            : appt.status === "CANCELLED" 
                                              ? "bg-rose-50 border-rose-100 text-rose-600 line-through font-semibold" 
                                              : appt.status === "PENDING"
                                                ? "bg-amber-50 border-amber-100 text-amber-600 font-bold animate-pulse"
                                                : "bg-purple-50 border border-purple-100 text-purple-650 font-semibold"
                                        }`}
                                        title={`${appt.customer.name} - ${appt.service?.name} (${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                                      >
                                        <div>
                                          <p className="font-extrabold text-[10px] leading-tight truncate text-slate-800">{appt.customer.name}</p>
                                          {heightPx > 42 && appt.service && (
                                            <p className="text-[8px] font-semibold opacity-90 leading-tight truncate mt-0.5 text-slate-500">{appt.service.name}</p>
                                          )}
                                        </div>
                                        {heightPx > 58 && (
                                          <div className="flex items-center gap-1 text-[8px] opacity-75 font-mono leading-none">
                                            <Clock className="h-2 w-2" />
                                            <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({duration}m)</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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
                <div className="p-6 divide-y divide-slate-100 space-y-4 bg-white">
                  {appointments.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                      <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm font-semibold">No bookings scheduled for today.</p>
                    </div>
                  ) : (
                    appointments.map((appt) => (
                      <div 
                        key={appt.id} 
                        onClick={() => setSelectedAppt(appt)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 transition-all cursor-pointer gap-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-purple-50 text-purple-600 p-3 rounded-xl flex-shrink-0 border border-purple-100">
                            <Scissors className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{appt.customer.name}</h4>
                            <p className="text-xs text-slate-500 font-semibold">{appt.service.name} • ₹{appt.service.price} • {appt.service.durationMins} mins</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                              <span className="flex items-center gap-1 font-mono"><Clock className="h-3.5 w-3.5" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(appt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Stylist: {appt.staff?.name || "Unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            appt.status === "COMPLETED" 
                              ? "bg-indigo-50 border-indigo-100 text-indigo-650" 
                              : appt.status === "CANCELLED" 
                                ? "bg-rose-50 border-rose-100 text-rose-600 line-through" 
                                : appt.status === "PENDING"
                                  ? "bg-amber-50 border-amber-100 text-amber-600"
                                  : "bg-purple-50 border border-purple-100 text-purple-650"
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
                <div className="grid grid-cols-7 divide-x divide-slate-100 bg-white">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const startOfWeek = new Date(currentDate);
                    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + i);
                    
                    const dayName = startOfWeek.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = startOfWeek.getDate();
                    const targetY = startOfWeek.getFullYear();
                    const targetM = (startOfWeek.getMonth() + 1).toString().padStart(2, '0');
                    const targetD = startOfWeek.getDate().toString().padStart(2, '0');
                    const targetLocalDateStr = `${targetY}-${targetM}-${targetD}`;

                    // Find appointments for this specific date
                    const dailyAppts = appointments.filter((appt) => {
                      const apptDate = new Date(appt.startTime);
                      const y = apptDate.getFullYear();
                      const m = (apptDate.getMonth() + 1).toString().padStart(2, '0');
                      const d = apptDate.getDate().toString().padStart(2, '0');
                      const apptLocalDateStr = `${y}-${m}-${d}`;
                      return apptLocalDateStr === targetLocalDateStr;
                    });

                    return (
                      <div key={i} className="min-h-[400px] p-3 flex flex-col gap-3">
                        <div className="text-center border-b border-slate-100 pb-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">{dayName}</p>
                          <p className="text-lg font-black text-slate-800 mt-0.5 font-display">{dayNum}</p>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px] custom-scrollbar">
                          {dailyAppts.map((appt) => (
                            <div
                              key={appt.id}
                              onClick={() => setSelectedAppt(appt)}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:translate-y-[-1px] shadow-sm select-none ${
                                appt.status === "COMPLETED" 
                                  ? "bg-indigo-50 border-indigo-100 text-indigo-650 font-semibold" 
                                  : appt.status === "CANCELLED" 
                                    ? "bg-rose-50 border-rose-100 text-rose-600 line-through font-semibold" 
                                    : appt.status === "PENDING"
                                      ? "bg-amber-50 border-amber-100 text-amber-600 font-bold"
                                      : "bg-purple-50 border border-purple-100 text-purple-650 font-semibold"
                              }`}
                            >
                              <p className="font-extrabold text-xs truncate text-slate-800">{appt.customer.name}</p>
                              <p className="text-[9px] font-semibold opacity-90 truncate mt-0.5 text-slate-500">{appt.service.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-1 font-mono">{new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          ))}
                          {dailyAppts.length === 0 && (
                            <p className="text-[10px] text-center text-slate-400 py-12 font-medium">No bookings</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-250">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-purple-650" />
                <h3 className="font-bold text-slate-800 font-display">New Appointment</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-semibold">Select Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 font-semibold"
                >
                  <option value="" disabled>-- Select Customer --</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-semibold">Select Service *</label>
                <select
                  required
                  value={formData.serviceId}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceId: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 font-semibold"
                >
                  <option value="" disabled>-- Select Service --</option>
                  {serviceList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - ₹{s.price} ({s.durationMins} mins)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-semibold">Assign Stylist (Optional)</label>
                <select
                  value={formData.staffId}
                  onChange={(e) => setFormData(prev => ({ ...prev, staffId: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 font-semibold"
                >
                  <option value="">-- Auto-Assign Best Available --</option>
                  {staffList.filter(s => s.isAvailable).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-semibold">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none cursor-pointer font-sans border-0"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  Book Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Detail Dialog */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-250 text-slate-800">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg font-display">Appointment Details</h3>
              <button 
                onClick={() => setSelectedAppt(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer border-0 bg-transparent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4 text-slate-600 font-sans">
                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Customer</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedAppt.customer.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{selectedAppt.customer.phone}</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex-shrink-0">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Service</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedAppt.service.name}</p>
                    <p className="text-xs text-slate-500 font-medium">₹{selectedAppt.service.price} • {selectedAppt.service.durationMins} mins</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex-shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Schedule</p>
                    <p className="font-bold text-slate-800 text-sm">
                      {new Date(selectedAppt.startTime).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-500 font-medium font-mono">
                      {new Date(selectedAppt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedAppt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-2.5 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl flex-shrink-0">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Assigned Stylist</p>
                    <p className="font-bold text-slate-800 text-sm">{selectedAppt.staff?.name || "Unassigned / Auto-assign"}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                    selectedAppt.status === "COMPLETED" 
                      ? "bg-indigo-50 border-indigo-100 text-indigo-650" 
                      : selectedAppt.status === "CANCELLED" 
                        ? "bg-rose-50 border-rose-100 text-rose-600 line-through" 
                        : selectedAppt.status === "PENDING"
                          ? "bg-amber-50 border-amber-100 text-amber-600"
                          : "bg-purple-50 border border-purple-100 text-purple-650"
                  }`}>
                    {selectedAppt.status}
                  </span>
                </div>
              </div>

              {selectedAppt.status === "PENDING" && (
                <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-200 pt-4">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CONFIRMED")}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-sans border-0"
                  >
                    <CheckSquare className="h-4 w-4 text-white" /> Accept Booking
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CANCELLED")}
                    className="flex-1 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" /> Decline Booking
                  </button>
                </div>
              )}

              {selectedAppt.status === "CONFIRMED" && (
                <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-200 pt-4">
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "COMPLETED")}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer font-sans border-0"
                  >
                    <CheckSquare className="h-4 w-4 text-white" /> Check Out / Complete
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedAppt.id, "CANCELLED")}
                    className="flex-1 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-sans bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" /> Cancel Booking
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

