"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Calendar,
  IndianRupee,
  Bot,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Sparkles,
  MessageCircle,
  MapPin,
  Activity,
  Phone,
  Camera,
  Globe,
  Tag,
  Gift,
  ChevronDown,
  Check,
  Plus,
  Star,
  Scissors,
  Clock,
  Megaphone,
  UserPlus,
  BarChart2,
  QrCode,
  Copy,
  ExternalLink,
  Printer
} from "lucide-react";
import dynamic from "next/dynamic";

const RevenueChart = dynamic(
  () => import("@/components/dashboard/RevenueChart").then((mod) => mod.RevenueChart),
  { ssr: false }
);
const LanguageMetricsCharts = dynamic(
  () => import("@/components/dashboard/LanguageMetricsCharts").then((mod) => mod.LanguageMetricsCharts),
  { ssr: false }
);

interface ChatMessage {
  sender: "customer" | "ai";
  text: string;
  time: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salonInfo, setSalonInfo] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [ucisMetrics, setUcisMetrics] = useState<any | null>(null);
  const [staffUtilization, setStaffUtilization] = useState<any[]>([]);
  const [recoveryMetrics, setRecoveryMetrics] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulated Chat State for WhatsApp sandbox
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "ai", text: "Hello! 👋 Welcome to our Salon. How can I assist you with service bookings today?", time: "18:00" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Appointment list state
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "") : "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadData = async () => {
    try {
      const [metricsRes, ucisRes, staffRes, recoveryRes, apptsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/analytics/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/analytics/ucis`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/analytics/staff-utilization`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/analytics/recovery-metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (ucisRes.ok) setUcisMetrics(await ucisRes.json());
      if (staffRes.ok) setStaffUtilization(await staffRes.json());
      if (recoveryRes.ok) setRecoveryMetrics(await recoveryRes.json());
      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        if (Array.isArray(apptsData)) {
          setAppointmentsList(apptsData.map((a: any) => ({
            id: a.id,
            name: a.customer?.name || "Walk-in Client",
            service: a.service?.name || "Salon Service",
            price: a.service?.price || 0,
            time: new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: a.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'
          })));
        }
      }
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
      setError("Error loading metrics from API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        if (storedToken === "dev-bypass-token-demo") {
          return;
        }
        const response = await fetch(`${apiUrl}/api/v1/salons/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const salon = await response.json();
          setSalonInfo(salon);
          if (!salon.isProfileComplete) {
            router.push("/onboarding");
          }
        }
      } catch (err) {
        console.error("Failed to check profile status on dashboard mount:", err);
      }
    };
    checkProfile();
    loadData();
  }, [apiUrl, router]);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "https://salonsflow.in";
  const activeSalonId = salonInfo?.id || "d5e27d13-135c-4068-9ced-8f0bfddc9f4d";
  const directBookingUrl = `${originUrl}/book?salonId=${activeSalonId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(directBookingUrl)}`;

  const handleCopyBookingLink = () => {
    navigator.clipboard.writeText(directBookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handlePrintStandee = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const salonName = salonInfo?.name || "Our Salon";
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Walk-in Booking Standee</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .card {
              border: 4px solid #059669;
              border-radius: 32px;
              padding: 50px 40px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            }
            .logo-placeholder {
              font-weight: 800;
              font-size: 24px;
              color: #059669;
              margin-bottom: 24px;
              letter-spacing: -0.5px;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 8px;
              color: #1e293b;
              letter-spacing: -0.5px;
            }
            .tagline {
              font-size: 16px;
              color: #059669;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 30px;
            }
            .qr-container {
              margin: 24px 0;
              display: inline-block;
              border: 10px solid #ecfdf5;
              border-radius: 24px;
              padding: 20px;
              background-color: #f8fafc;
            }
            .instructions {
              font-size: 16px;
              color: #475569;
              line-height: 1.6;
              margin-bottom: 24px;
              font-weight: 500;
            }
            .url-display {
              background: #f1f5f9;
              padding: 10px 16px;
              border-radius: 12px;
              font-family: monospace;
              font-size: 13px;
              font-weight: bold;
              color: #047857;
              word-break: break-all;
              margin-bottom: 24px;
            }
            .step-container {
              display: flex;
              justify-content: space-around;
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 24px;
            }
            .step {
              flex: 1;
              font-size: 13px;
              font-weight: 600;
              color: #64748b;
            }
            .step-num {
              display: block;
              font-size: 20px;
              font-weight: 800;
              color: #059669;
              margin-bottom: 4px;
            }
            .footer {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 40px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-placeholder">SalonsFlow</div>
            <h1>${salonName}</h1>
            <div class="tagline">Direct Online Appointment Booking</div>
            <div class="instructions">
              Skip the queue! Scan the QR code using your phone camera to view our live service menu and book your appointment instantly!
            </div>
            <div class="qr-container">
              <img src="${qrImageUrl}" alt="Appointment Booking QR Code" width="250" height="250" />
            </div>
            <div class="url-display">${directBookingUrl}</div>
            <div class="step-container">
              <div class="step"><span class="step-num">1</span> Scan QR</div>
              <div class="step"><span class="step-num">2</span> Pick Service</div>
              <div class="step"><span class="step-num">3</span> Confirm Slot</div>
            </div>
            <div class="footer">
              Powered by SalonsFlow • Instant Walk-In Appointments
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = { sender: "customer", text: inputText, time: userTime };
    setChatMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulate AI typing response
    setIsAiTyping(true);
    setTimeout(() => {
      setIsAiTyping(false);
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let aiText = "Perfect! I have processed your request. Let me check the schedule and confirm.";
      if (inputText.toLowerCase().includes("yes") || inputText.toLowerCase().includes("book")) {
        aiText = "Wonderful! Your appointment is successfully booked. I've sent the confirmation details to your WhatsApp.";
      } else if (inputText.toLowerCase().includes("price") || inputText.toLowerCase().includes("charge")) {
        aiText = "Our services start at standard salon rates. Standard durations are 20-60 mins.";
      }
      setChatMessages((prev) => [...prev, { sender: "ai", text: aiText, time: aiTime }]);
    }, 1500);
  };

  const handleConfirmAppointment = (id: number) => {
    setAppointmentsList((prev) =>
      prev.map((appt) => (appt.id === id ? { ...appt, status: "Confirmed" } : appt))
    );
  };

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-sm text-slate-500 font-bold">Initializing premium dashboard insights...</p>
      </div>
    );
  }

  const isDemoSession = token === "dev-bypass-token-demo";
  const savedRevenue = recoveryMetrics?.savedRevenue ?? metrics?.savedRevenue ?? (isDemoSession ? 8450 : 0);
  const aiConversionRate = metrics?.aiConversionRate ?? (isDemoSession ? 72 : 0);
  const appointmentsCount = metrics?.appointmentsToday ?? (isDemoSession ? 32 : appointmentsList.length);
  const aiChatsCount = metrics?.aiHandledChats ?? (isDemoSession ? 128 : 0);
  const activeStaffCount = staffUtilization.filter((s) => s.isAvailable).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top row: Metrics grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Revenue Saved by AI */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover-scale transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Revenue Saved by AI</p>
              <p className="text-3xl font-black text-slate-800 font-display">₹{savedRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-purple-100">
              <Bot className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-600 font-bold">
            <TrendingUp className="h-4 w-4" /> {savedRevenue > 0 ? "32.8% AI Autopilot Reservation rate" : "0% AI Autopilot Reservation rate"}
          </div>
        </div>

        {/* Card 2: AI Autopilot Conversion */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover-scale transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-pink-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">AI Booking Conversion</p>
              <p className="text-3xl font-black text-slate-800 font-display">{aiConversionRate}%</p>
            </div>
            <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-pink-100">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-pink-600 font-bold">
            <Sparkles className="h-4 w-4" /> {aiConversionRate > 0 ? "Converting leads automatically" : "0 AI Handled Leads"}
          </div>
        </div>

        {/* Card 3: Total Bookings */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover-scale transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Total Bookings Today</p>
              <p className="text-3xl font-black text-slate-800 font-display">{appointmentsCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-indigo-100">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
            <TrendingUp className="h-4 w-4" /> {appointmentsCount > 0 ? "+21% vs yesterday" : "0 bookings vs yesterday"}
          </div>
        </div>

        {/* Card 4: Active Staff */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover-scale transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-slate-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Active Staff</p>
              <p className="text-3xl font-black text-slate-800 font-display">{activeStaffCount} Online</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-slate-200">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center">
            {activeStaffCount === 0 ? (
              <Link href="/staff" className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1">
                + Add Staff / Stylists <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : (
              <div className="flex items-center -space-x-2.5 overflow-hidden">
                {staffUtilization.filter((s: any) => s.isAvailable).slice(0, 4).map((s: any, idx: number) => (
                  <div key={idx} className="h-6 w-6 rounded-full border border-white bg-gradient-to-tr from-purple-500 to-indigo-500 text-[8px] text-white flex items-center justify-center font-bold">
                    {s.staffName ? s.staffName.split(" ").map((n: string) => n[0]).join("") : "ST"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Salon-Specific Booking QR Standee & Direct Link Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <QrCode className="h-3.5 w-3.5" />
              <span>Salon-Specific Live Booking QR Standee & Link</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Direct Walk-In Online Booking Link
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed font-medium">
              Walk-in clients scan this QR code with their phone camera to open your salon's web booking scheduler directly! No WhatsApp redirect required.
            </p>

            {/* Direct URL Bar & Quick Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl px-3.5 py-2 flex items-center gap-2 font-mono text-xs text-emerald-300 max-w-md w-full overflow-hidden">
                <Globe className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate flex-1">{directBookingUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyBookingLink}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? "Copied Link!" : "Copy Booking Link"}
              </button>
              <a
                href={directBookingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" /> Open Web Scheduler
              </a>
            </div>
          </div>

          {/* QR Code & Print Button Box */}
          <div className="bg-white p-4 rounded-2xl shadow-lg text-slate-900 flex flex-col items-center justify-center text-center space-y-2 flex-shrink-0">
            <img 
              src={qrImageUrl} 
              alt="Direct Booking QR Code" 
              className="w-32 h-32 object-contain rounded-xl border border-slate-100" 
            />
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Scan with Phone Camera</span>
            <button
              type="button"
              onClick={handlePrintStandee}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-1"
            >
              <Printer className="h-3.5 w-3.5" /> Print Standee Poster
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Left Side: Charts & Tables (Col span 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 1: Area Chart */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-4.5 px-6">
              <CardTitle className="text-base font-bold text-slate-800 font-display">Appointments & Revenue Curve</CardTitle>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Live Data
              </span>
            </CardHeader>
            <CardContent className="p-6">
              <RevenueChart />
            </CardContent>
          </Card>

          {/* Section 2: Recent Appointments */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4.5 px-6">
              <CardTitle className="text-base font-bold text-slate-800 font-display">Today's Appointments & Confirmations</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {appointmentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">No Appointments Scheduled Today</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-xs">Your calendar is clean. When clients book online or via WhatsApp, appointments will appear here automatically.</p>
                  </div>
                  <Link href="/bookings" className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors">
                    + Book First Appointment
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointmentsList.map((appt) => (
                    <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100">
                          {appt.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800">{appt.name}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{appt.service} • ₹{appt.price}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-2 sm:mt-0">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {appt.time}
                        </span>
                        <div className="flex items-center gap-2">
                          {appt.status === "Pending" ? (
                            <>
                              <button 
                                onClick={() => handleConfirmAppointment(appt.id)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-bold shadow-sm transition-colors border-0 cursor-pointer"
                              >
                                Confirm
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-0.75 rounded-lg text-[9px] font-bold shadow-xs">
                              <Check className="h-3.5 w-3.5 stroke-[3]" /> Confirmed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Quick Operations Shortcuts */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4.5 px-6">
              <CardTitle className="text-base font-bold text-slate-800 font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: "New Appointment", desc: "Book client visit", icon: Plus, color: "text-purple-600 bg-purple-50 border-purple-100", href: "/bookings" },
                  { name: "Add Customer", desc: "Register new client", icon: UserPlus, color: "text-pink-600 bg-pink-50 border-pink-100", href: "/customers" },
                  { name: "Send Campaign", desc: "Dispatch marketing texts", icon: Megaphone, color: "text-indigo-600 bg-indigo-50 border-indigo-100", href: "/campaigns" },
                  { name: "Collect Reviews", desc: "Send review campaign", icon: Star, color: "text-amber-600 bg-amber-50 border-amber-100", href: "/reviews" },
                  { name: "Staff Schedule", desc: "View staff management", icon: Clock, color: "text-slate-600 bg-slate-100 border-slate-200", href: "/staff" },
                  { name: "Reports Logs", desc: "Analyze daily numbers", icon: BarChart2, color: "text-slate-500 bg-slate-50 border-slate-200", href: "/commissions" }
                ].map((action, idx) => (
                  <Link 
                    key={idx} 
                    href={action.href}
                    className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-200 hover:border-purple-500/50 bg-slate-50/30 hover:bg-slate-50/60 transition-all shadow-xs"
                  >
                    <div className={`p-2.5 rounded-xl ${action.color.split(" ")[0]} ${action.color.split(" ")[1]} border ${action.color.split(" ")[2]} self-start group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4.5">
                      <h4 className="font-bold text-xs text-slate-800 leading-none">{action.name}</h4>
                      <p className="text-[9px] text-slate-400 font-semibold mt-1">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: AI Receptionist Sandbox & Staff Status (Col span 3) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card 1: Interactive Chat Sandbox */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center gap-2 shrink-0">
              <Bot className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base font-bold text-slate-800 font-display">WhatsApp AI Receptionist</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col h-[380px] bg-slate-50/30 overflow-hidden">
              {/* Chat bubbles area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 custom-scrollbar">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === "customer" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                       msg.sender === "customer" 
                        ? "bg-slate-200 text-slate-800 border border-slate-300 rounded-br-none" 
                        : "bg-purple-600 text-white border border-purple-700 rounded-bl-none"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex items-center gap-1.5 mr-auto bg-purple-50 border border-purple-100 px-3.5 py-3 rounded-2xl rounded-bl-none max-w-[80%] shadow-xs animate-pulse-ring">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce delay-150"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-bounce delay-300"></span>
                  </div>
                )}
              </div>
              {/* input bar */}
              <form onSubmit={handleSendChatMessage} className="mt-3.5 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Simulate customer WhatsApp message..." 
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white rounded-xl text-xs font-bold shadow-sm transition-colors border-0 cursor-pointer"
                >
                  Send
                </button>
              </form>
            </CardContent>
          </Card>

          {/* Card 2: AI Telemetry & Mascot */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-base font-bold text-slate-800 font-display">AI Autopilot Status</CardTitle>
              <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>
            </CardHeader>
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4.5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-100">
              <div className="h-16 w-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 relative overflow-hidden animate-pulse">
                <Bot className="h-9 w-9 text-white relative z-10" />
                <div className="absolute -left-2 -bottom-2 h-8 w-8 bg-white/20 rounded-full"></div>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight">AI Receptionist Active</h4>
                <p className="text-[10px] text-slate-500 font-bold">24/7 Autopilot listening on WhatsApp Sandbox</p>
                <div className="flex gap-4 mt-2 justify-between border-t border-slate-100 pt-2 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Chats</p>
                    <p className="text-sm font-black text-purple-600">{aiChatsCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Bookings</p>
                    <p className="text-sm font-black text-purple-600">{appointmentsCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rate</p>
                    <p className="text-sm font-black text-purple-600">{aiConversionRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Today's Staff Schedule */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center gap-2 shrink-0">
              <Clock className="h-4.5 w-4.5 text-purple-600" />
              <CardTitle className="text-base font-bold text-slate-800 font-display">Today's Staff Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative border-l border-slate-200 pl-4.5 ml-2.5 space-y-5">
                {[
                  { time: "10:00 AM", title: "Standard Haircut", staff: "Amit Stylist", active: false },
                  { time: "12:30 PM", title: "Massage Therapy", staff: "Rahul Stylist", active: false },
                  { time: "05:00 PM", title: "Premium Haircut & Styling", staff: "Amit Stylist", active: true },
                  { time: "08:00 PM", title: "Hair Coloring Treatment", staff: "Amit Stylist", active: false }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                      item.active ? "bg-purple-600" : "bg-slate-300"
                    }`} />
                    <span className="text-[10px] font-extrabold text-purple-600 block">{item.time}</span>
                    <h4 className="font-bold text-xs text-slate-800 mt-0.5">{item.title}</h4>
                    <p className="text-[9px] text-slate-500 font-semibold">{item.staff}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Popular Service Share */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 shrink-0">
              <CardTitle className="text-base font-bold text-slate-800 font-display">Popular Service Share</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[
                { name: "Haircut & Grooming", pct: 45, color: "bg-purple-600" },
                { name: "Spa & Massage", pct: 30, color: "bg-indigo-500" },
                { name: "Coloring & Treatment", pct: 25, color: "bg-pink-500" }
              ].map((service, idx) => (
                <div key={idx} className="space-y-1 group">
                  <div className="flex justify-between text-xs font-bold text-slate-800">
                    <span>{service.name}</span>
                    <span className="text-slate-500 group-hover:text-slate-700 transition-colors">{service.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${service.color}`}
                      style={{ width: `${service.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Language Metrics Charts Block */}
      <LanguageMetricsCharts 
        languageDistribution={metrics?.languageDistribution || { english: 65, hindi: 15, hinglish: 20 }}
        conversionRateByLanguage={metrics?.conversionRateByLanguage || { english: 45, hindi: 58, hinglish: 72 }}
        topPhrases={metrics?.topPhrases || []}
      />
    </div>
  );
}
