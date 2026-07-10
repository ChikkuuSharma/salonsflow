"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar as CalendarIcon, Clock, User, Phone, CheckCircle, AlertCircle, Scissors, Sparkles, MapPin, RefreshCw } from "lucide-react";

function BookingContent() {
  const searchParams = useSearchParams();
  const salonId = searchParams.get("salonId") || "d5e27d13-135c-4068-9ced-8f0bfddc9f4d"; // Default to Demo Salon ID

  // Config states
  const [salonInfo, setSalonInfo] = useState<any>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form selections
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedService, setSelectedService] = useState<any>(null);
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
        const res = await fetch(`${apiUrl}/api/v1/public/bookings/salon/${salonId}`);
        if (!res.ok) throw new Error("Failed to load salon details.");
        const data = await res.json();
        setSalonInfo(data);
        if (data.services?.length > 0) {
          setSelectedService(data.services[0]);
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

  // Fetch available slots when service, date, or staff changes
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    const fetchAvailableSlots = async () => {
      try {
        setSlotsLoading(true);
        setSelectedSlot(null);
        let url = `${apiUrl}/api/v1/public/bookings/slots?salonId=${salonId}&serviceId=${selectedService.id}&date=${selectedDate}`;
        if (selectedStaff) {
          url += `&staffId=${selectedStaff.id}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load available slots.");
        const data = await res.json();
        setSlots(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchAvailableSlots();
  }, [selectedService, selectedDate, selectedStaff, salonId]);

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
    if (!selectedService) {
      setError("Please select a service.");
      return;
    }
    if (!selectedSlot) {
      setError("Please select a Time Slot from the list of available times below.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`${apiUrl}/api/v1/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          serviceId: selectedService.id,
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
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl">
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 shadow-md">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Booking Confirmed!</h2>
            <p className="text-sm text-slate-400">Thank you, {customerName}. Your appointment for {selectedService?.name} is successfully scheduled.</p>
          </div>
          <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs text-slate-300 space-y-2">
            <p><span className="text-slate-500">Service:</span> {selectedService?.name}</p>
            <p><span className="text-slate-500">Stylist:</span> {selectedStaff?.name || "Any Available Stylist"}</p>
            <p><span className="text-slate-500">Date:</span> {new Date(selectedDate).toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p><span className="text-slate-500">Time:</span> {selectedSlot}</p>
            <p><span className="text-slate-500">Price:</span> ₹{selectedService?.price}</p>
          </div>
          <p className="text-xs text-slate-500">You can close this tab now. We have saved your appointment details.</p>
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

          {/* Step 2: Select Service */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">2. Select Service</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {salonInfo?.services?.map((serv: any) => (
                <div
                  key={serv.id}
                  onClick={() => setSelectedService(serv)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                    selectedService?.id === serv.id
                      ? "bg-indigo-950/40 border-indigo-500/60 text-indigo-300"
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-extrabold text-xs text-slate-100">{serv.name}</p>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" /> {serv.durationMins} mins
                      </p>
                    </div>
                    <p className="font-black text-xs text-indigo-400 font-mono">₹{serv.price}</p>
                  </div>
                </div>
              ))}
            </div>
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
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">4. Preferred Stylist</h3>
              <select
                value={selectedStaff?.id || ""}
                onChange={(e) => {
                  const staff = salonInfo.staff.find((s: any) => s.id === e.target.value);
                  setSelectedStaff(staff || null);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 font-semibold"
              >
                <option value="">Any Available Stylist</option>
                {salonInfo?.staff?.map((st: any) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 4: Available Slots */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest font-mono">5. Available Time Slots</h3>
            {slotsLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                <span>Checking stylist schedules...</span>
              </div>
            ) : slots.length === 0 ? (
              <p className="p-4 bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500 rounded-xl font-medium">
                No slots available on this date. Try another date or select a different stylist.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-xl border text-center text-[10px] font-bold font-mono transition-all ${
                      selectedSlot === slot
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md scale-[1.02]"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
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
