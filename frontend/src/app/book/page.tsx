"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, AlertCircle, Scissors, Sparkles, MapPin, RefreshCw, Lock, Hourglass, Users } from "lucide-react";

function BookingContent() {
  const searchParams = useSearchParams();
  const salonId = searchParams.get("salonId") || "d5e27d13-135c-4068-9ced-8f0bfddc9f4d"; // Default to Demo Salon ID

  // Config states
  const [salonInfo, setSalonInfo] = useState<any>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [detailedSlots, setDetailedSlots] = useState<Array<{ time: string; isAvailable: boolean }>>([]);
  const [queueInfo, setQueueInfo] = useState<{ activeAppointmentsAhead: number; estimatedWaitMins: number } | null>(null);
  const [slotFilter, setSlotFilter] = useState<"ALL" | "AVAILABLE" | "BOOKED">("ALL");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form selections
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [genderPreference, setGenderPreference] = useState<"MALE" | "FEMALE" | "ALL">("MALE");
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  
  // Default date format YYYY-MM-DD
  const getTodayLocalDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dy = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dy}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDateStr());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Fetch salon details on mount
  useEffect(() => {
    const fetchSalonDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/v1/public/appointments/salon/${salonId}`);
        if (!res.ok) throw new Error("Failed to load salon details.");
        const data = await res.json();
        setSalonInfo(data);
        if (data.services?.length > 0) {
          setSelectedServices([data.services[0]]);
        }
      } catch (err: any) {
        console.error(err);
        setError("Could not load salon scheduler. Please verify the URL is correct.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalonDetails();
  }, [salonId]);

  const handleToggleService = (serv: any) => {
    setSelectedServices(prev => {
      const exists = prev.some(s => s.id === serv.id);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least 1 service selected
        return prev.filter(s => s.id !== serv.id);
      }
      return [...prev, serv];
    });
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMins || 30), 0);
  const primaryService = selectedServices[0] || null;

  // Fetch available slots when service, date, or staff changes
  useEffect(() => {
    if (!primaryService || !selectedDate) return;

    const fetchAvailableSlots = async () => {
      try {
        setSlotsLoading(true);
        setSelectedSlot(null);
        let url = `${apiUrl}/api/v1/public/appointments/slots?salonId=${salonId}&serviceId=${primaryService.id}&date=${selectedDate}&detailed=true`;
        if (selectedStaff) {
          url += `&staffId=${selectedStaff.id}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load available slots.");
        const data = await res.json();
        
        if (data.detailedSlots) {
          setSlots(data.availableSlots || []);
          setDetailedSlots(data.detailedSlots || []);
          setQueueInfo(data.queueInfo || null);
        } else if (Array.isArray(data)) {
          setSlots(data);
          setDetailedSlots(data.map((s: string) => ({ time: s, isAvailable: true })));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchAvailableSlots();
  }, [primaryService?.id, selectedDate, selectedStaff, salonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError("Name is required. Please enter your name.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Mobile Number is required. Please enter your mobile number.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select a Time Slot from the list of available times below.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/v1/public/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          serviceId: primaryService.id,
          serviceIds: selectedServices.map(s => s.id),
          date: selectedDate,
          time: selectedSlot,
          staffId: selectedStaff?.id || undefined,
          customerName,
          customerPhone,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to confirm booking.");
      }

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during scheduling. Try another slot.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm font-semibold text-slate-400">Loading booking portal...</p>
        </div>
      </div>
    );
  }

  if (success) {
    const ticketId = `#SF-${Math.floor(1000 + Math.random() * 9000)}`;
    const estWait = queueInfo?.estimatedWaitMins || 15;
    const queuePos = (queueInfo?.activeAppointmentsAhead || 0) + 1;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-md">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest bg-emerald-950 border border-emerald-800/60 px-3 py-1 rounded-full font-mono">
              Live Waiting Ticket • {ticketId}
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white pt-2">Appointment Confirmed!</h2>
            <p className="text-xs text-slate-400">Thank you, <strong className="text-white">{customerName}</strong>. Your spot is reserved.</p>
          </div>

          {/* Live Wait Time & Queue Position Box */}
          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Est. Wait Time</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">~{estWait} mins</p>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Queue Position</span>
              <p className="text-lg font-black text-indigo-400 mt-0.5">#{queuePos} in Line</p>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs text-slate-300 space-y-2">
            <p className="flex justify-between"><span className="text-slate-500">Salon:</span> <strong className="text-slate-200">{salonInfo?.name || "Salon"}</strong></p>
            <p className="flex justify-between"><span className="text-slate-500">Services ({selectedServices.length}):</span> <span className="text-indigo-300 font-bold">{selectedServices.map(s => s.name).join(", ")}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Stylist:</span> <span className="text-slate-200">{selectedStaff?.name || "Any Stylist"}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Date & Slot:</span> <span className="text-emerald-300 font-bold">{selectedDate} ({selectedSlot})</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Duration:</span> <span className="text-slate-200">{totalDuration} mins</span></p>
            <p className="flex justify-between border-t border-slate-800 pt-2 text-sm"><span className="text-slate-400 font-bold">Total Price:</span> <strong className="text-white">₹{totalPrice}</strong></p>
          </div>

          <p className="text-[11px] text-slate-500 font-medium">Please show this live ticket at the reception desk when your turn arrives.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 font-sans flex items-center justify-center">
      {/* Abstract lights background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-[0.2] pointer-events-none"></div>
      <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-650/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-2xl w-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl z-10 overflow-hidden">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 md:p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">{salonInfo?.name || "Book Appointment"}</h1>
            <p className="text-xs text-indigo-400 flex items-center gap-1.5 font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {salonInfo?.address || "Salon Location"}
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm hidden md:flex">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        {/* Live Queue & Waiting Time Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800 p-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-emerald-400 uppercase tracking-wider text-[10px] font-mono">
                  Live Reception Queue
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <p className="text-slate-100 font-extrabold text-sm mt-0.5">
                {queueInfo && queueInfo.estimatedWaitMins > 0
                  ? `~${queueInfo.estimatedWaitMins} mins Current Wait Time`
                  : "⚡ No Waiting (Immediate Slots Available!)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Appointments Ahead:</span>
            <strong className="text-white font-mono">{queueInfo?.activeAppointmentsAhead || 0}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-950/80 border border-rose-900/40 rounded-2xl text-rose-455 text-xs text-rose-400 font-semibold flex items-center gap-2 animate-pulse">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Customer Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">1. Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block font-semibold">Your Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block font-semibold">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Select Services */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">2. Select Services (Multiple Allowed)</h3>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-800/60">
                {selectedServices.length} Selected
              </span>
            </div>

            {/* Who is this booking for */}
            <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">Who is this appointment for?</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGenderPreference("MALE");
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    genderPreference === "MALE"
                      ? "bg-blue-600/90 text-white border-blue-500 shadow-md"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  ♂️ Men / Gents
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGenderPreference("FEMALE");
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    genderPreference === "FEMALE"
                      ? "bg-pink-600/90 text-white border-pink-500 shadow-md"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  ♀️ Ladies / Women
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGenderPreference("ALL");
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    genderPreference === "ALL"
                      ? "bg-purple-600/90 text-white border-purple-500 shadow-md"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  🚻 All Services
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {salonInfo?.services
                ?.filter((serv: any) => {
                  if (genderPreference === "ALL") return true;
                  return serv.gender === genderPreference || serv.gender === "UNISEX" || !serv.gender;
                })
                .map((serv: any) => {
                  const isSelected = selectedServices.some(s => s.id === serv.id);
                  return (
                    <div
                      key={serv.id}
                      onClick={() => handleToggleService(serv)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] relative ${
                        isSelected
                          ? "bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-md ring-1 ring-indigo-500/50"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2.5">
                          <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all mt-0.5 ${
                            isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 bg-slate-900"
                          }`}>
                            {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-extrabold text-xs text-slate-100">{serv.name}</p>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                                serv.gender === "MALE"
                                  ? "bg-blue-950 text-blue-300 border-blue-800"
                                  : serv.gender === "FEMALE"
                                  ? "bg-pink-950 text-pink-300 border-pink-800"
                                  : "bg-purple-950 text-purple-300 border-purple-800"
                              }`}>
                                {serv.gender === "MALE" ? "Men" : serv.gender === "FEMALE" ? "Women" : "Unisex"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3" /> {serv.durationMins} mins
                            </p>
                          </div>
                        </div>
                        <p className="font-black text-xs text-indigo-400 font-mono">₹{serv.price}</p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Selected Summary Bar */}
            {selectedServices.length > 0 && (
              <div className="bg-indigo-950/80 border border-indigo-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-indigo-200">
                    Selected ({selectedServices.length}): {selectedServices.map(s => s.name).join(", ")}
                  </p>
                  <p className="text-[10px] text-indigo-400 font-mono">
                    Total Estimated Duration: {totalDuration} mins
                  </p>
                </div>
                <div className="text-right pl-3 border-l border-indigo-800/60">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Price</p>
                  <p className="text-base font-black text-white font-mono">₹{totalPrice}</p>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Select Date & Stylist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Select */}
            <div className="space-y-3 col-span-1 md:col-span-2">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">3. Choose Date</h3>
              
              {/* Scrollable date chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none custom-scrollbar">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  
                  const y = d.getFullYear();
                  const m = (d.getMonth() + 1).toString().padStart(2, '0');
                  const dy = d.getDate().toString().padStart(2, '0');
                  const dateStr = `${y}-${m}-${dy}`;
                  
                  const isSelected = selectedDate === dateStr;
                  const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString("en-US", { month: "short" });

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border min-w-[75px] transition-all hover:scale-[1.02] cursor-pointer select-none ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wider font-mono">{dayName}</span>
                      <span className="text-sm font-black mt-1 font-display">{dayNum}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-0.5">{monthName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Advanced calendar input */}
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  required
                  min={getTodayLocalDateStr()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-semibold"
                />
              </div>
            </div>

            {/* Stylist Select */}
            <div className="space-y-3 col-span-1 md:col-span-2">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">4. Preferred Stylist</h3>
              <select
                value={selectedStaff?.id || ""}
                onChange={(e) => {
                  const staff = salonInfo.staff.find((s: any) => s.id === e.target.value);
                  setSelectedStaff(staff || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-semibold"
              >
                <option value="">Any Available Qualified Stylist</option>
                {salonInfo?.staff
                  ?.filter((st: any) => {
                    if (genderPreference === "MALE") {
                      return st.genderSpecialization === "MALE_ONLY" || st.genderSpecialization === "ALL" || !st.genderSpecialization;
                    }
                    if (genderPreference === "FEMALE") {
                      return st.genderSpecialization === "FEMALE_ONLY" || st.genderSpecialization === "ALL" || !st.genderSpecialization;
                    }
                    return true;
                  })
                  .map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.genderSpecialization === "MALE_ONLY" ? "(Men's Specialist)" : st.genderSpecialization === "FEMALE_ONLY" ? "(Ladies Specialist)" : "(Unisex)"}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Step 5: Available & Reserved Time Slots */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">5. Select Time Slot</h3>
              
              {/* Slot Filter Pills */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSlotFilter("ALL")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    slotFilter === "ALL" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All ({detailedSlots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSlotFilter("AVAILABLE")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    slotFilter === "AVAILABLE" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🟢 Free ({slots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSlotFilter("BOOKED")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    slotFilter === "BOOKED" ? "bg-rose-900/60 text-rose-200 shadow-xs" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  🔴 Booked ({detailedSlots.filter(s => !s.isAvailable).length})
                </button>
              </div>
            </div>

            {slotsLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Checking live appointment calendar & stylist schedules...</span>
              </div>
            ) : detailedSlots.length === 0 ? (
              <p className="p-4 bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500 rounded-xl font-medium">
                No slots available on this date. Try another date or select a different stylist.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {detailedSlots
                  .filter((item) => {
                    if (slotFilter === "AVAILABLE") return item.isAvailable;
                    if (slotFilter === "BOOKED") return !item.isAvailable;
                    return true;
                  })
                  .map((item) => {
                    const isSelected = selectedSlot === item.time;
                    if (!item.isAvailable) {
                      return (
                        <div
                          key={item.time}
                          className="py-2.5 px-3 rounded-xl border border-slate-800/80 bg-slate-950/40 text-slate-600 text-center text-[10px] font-bold font-mono flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed select-none"
                        >
                          <Lock className="h-3 w-3 text-rose-500/70" />
                          <span className="line-through">{item.time}</span>
                          <span className="text-[8px] font-extrabold uppercase text-rose-400/80 bg-rose-950/60 border border-rose-900/40 px-1.5 py-0.5 rounded">
                            Booked
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.time}
                        type="button"
                        onClick={() => setSelectedSlot(item.time)}
                        className={`py-2.5 px-3 rounded-xl border text-center text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-md scale-[1.02] ring-1 ring-indigo-400"
                            : "bg-slate-950 border-emerald-900/40 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-white" : "bg-emerald-400 animate-pulse"}`}></span>
                        <span>{item.time}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || slotsLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-xs py-4 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Confirming appointment...</span>
              </>
            ) : (
              <span>Confirm Booking (Pay at Salon)</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Loading Fallback Component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold text-slate-400">Loading booking portal...</p>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingContent />
    </Suspense>
  );
}
