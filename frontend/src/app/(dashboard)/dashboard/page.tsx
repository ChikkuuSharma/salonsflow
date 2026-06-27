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
  BarChart2
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
  const [metrics, setMetrics] = useState<any | null>(null);
  const [ucisMetrics, setUcisMetrics] = useState<any | null>(null);
  const [staffUtilization, setStaffUtilization] = useState<any[]>([]);
  const [recoveryMetrics, setRecoveryMetrics] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulated Chat State for WhatsApp sandbox
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "customer", text: "Hi, I want to book a hair spa tomorrow.", time: "18:10" },
    { sender: "ai", text: "Hi! I can definitely help with that. Our Hair Spa is 60 mins (₹1,200). What time works best for you?", time: "18:11" },
    { sender: "customer", text: "Around 5:00 PM please.", time: "18:11" },
    { sender: "ai", text: "Perfect! We have an open slot at 5:00 PM tomorrow with Amit Stylist (Senior Stylist). Shall I go ahead and book it?", time: "18:12" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Simulated Appointment list state
  const [appointmentsList, setAppointmentsList] = useState([
    { id: 1, name: "Amit Verma", service: "Premium Haircut", price: 500, time: "17:00", status: "Confirmed" },
    { id: 2, name: "Neha Singh", service: "Deep Tissue Massage", price: 1500, time: "18:30", status: "Confirmed" },
    { id: 3, name: "Rohit Kumar", service: "Beard Grooming & Styling", price: 350, time: "19:15", status: "Pending" },
    { id: 4, name: "Sneha Patel", service: "Hair Coloring Treatment", price: 2200, time: "20:00", status: "Confirmed" }
  ]);

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadData = async () => {
    try {
      const [metricsRes, ucisRes, staffRes, recoveryRes] = await Promise.all([
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
        })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (ucisRes.ok) setUcisMetrics(await ucisRes.json());
      if (staffRes.ok) setStaffUtilization(await staffRes.json());
      if (recoveryRes.ok) setRecoveryMetrics(await recoveryRes.json());
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
        if (storedToken && storedToken.startsWith("dev-bypass-token")) {
          return;
        }
        const response = await fetch(`${apiUrl}/api/v1/salons/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const salon = await response.json();
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
        aiText = "Our Premium Haircut is ₹500, Deep Tissue Massage is ₹1,500, and Beard Grooming is ₹350. Standard durations are 45-60 mins.";
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

  // Fallback concept values combined with API metrics if available
  const todayRevenue = metrics?.todayRevenue || 24350;
  const appointmentsCount = metrics?.appointmentsToday || 32;
  const newCustomersCount = metrics?.newCustomers || 8;
  const aiChatsCount = metrics?.aiHandledChats || 128;
  const activeStaffCount = staffUtilization.filter((s) => s.isAvailable).length || 12;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Top row: Metrics grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Today's Revenue */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover:translate-y-[-2px] transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Today's Revenue</p>
              <p className="text-3xl font-black text-slate-800 font-display">₹{todayRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-purple-100">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-600 font-bold">
            <TrendingUp className="h-4 w-4" /> +18.6% vs yesterday
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover:translate-y-[-2px] transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Appointments</p>
              <p className="text-3xl font-black text-slate-800 font-display">{appointmentsCount}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-blue-100">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-600 font-bold">
            <TrendingUp className="h-4 w-4" /> +21% vs yesterday
          </div>
        </div>

        {/* Card 3: New Customers */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover:translate-y-[-2px] transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-pink-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">New Customers</p>
              <p className="text-3xl font-black text-slate-800 font-display">{newCustomersCount}</p>
            </div>
            <div className="p-3 bg-pink-50 text-pink-500 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-pink-100">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-pink-650 font-bold">
            <TrendingUp className="h-4 w-4" /> +14% vs yesterday
          </div>
        </div>

        {/* Card 4: Active Staff */}
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-6 hover:translate-y-[-2px] transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Active Staff</p>
              <p className="text-3xl font-black text-slate-800 font-display">{activeStaffCount} Online</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-indigo-100">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          {/* Avatar stacks */}
          <div className="mt-3 flex items-center -space-x-2.5 overflow-hidden">
            <div className="h-6 w-6 rounded-full border border-white bg-gradient-to-tr from-purple-500 to-indigo-500 text-[8px] text-white flex items-center justify-center font-bold">RS</div>
            <div className="h-6 w-6 rounded-full border border-white bg-gradient-to-tr from-pink-500 to-rose-500 text-[8px] text-white flex items-center justify-center font-bold">AS</div>
            <div className="h-6 w-6 rounded-full border border-white bg-gradient-to-tr from-blue-500 to-teal-500 text-[8px] text-white flex items-center justify-center font-bold">PS</div>
            <div className="h-6 w-6 rounded-full border border-white bg-gradient-to-tr from-amber-500 to-orange-500 text-[8px] text-white flex items-center justify-center font-bold">VR</div>
            <div className="h-6 w-6 rounded-full border border-white bg-slate-200 text-[8px] text-slate-650 flex items-center justify-center font-bold">+8</div>
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
              <div className="space-y-4">
                {appointmentsList.map((appt) => (
                  <div key={appt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-slate-150 bg-slate-50/30 hover:bg-slate-50/70 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100">
                        {appt.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-700">{appt.name}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{appt.service} • ₹{appt.price}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3.5 mt-2 sm:mt-0">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> {appt.time}
                      </span>
                      <div className="flex items-center gap-2">
                        {appt.status === "Pending" ? (
                          <>
                            <button 
                              onClick={() => handleConfirmAppointment(appt.id)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[9px] font-bold shadow-sm transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-[9px] font-bold shadow-xs transition-colors cursor-pointer">
                              Reschedule
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.75 rounded-lg text-[9px] font-bold shadow-xs">
                            <Check className="h-3.5 w-3.5 stroke-[3]" /> Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                  { name: "Send Campaign", desc: "Dispatch marketing texts", icon: Megaphone, color: "text-blue-600 bg-blue-50 border-blue-100", href: "/campaigns" },
                  { name: "Collect Reviews", desc: "Send review campaign", icon: Star, color: "text-amber-500 bg-amber-50 border-amber-100", href: "/reviews" },
                  { name: "Staff Schedule", desc: "View staff management", icon: Clock, color: "text-indigo-600 bg-indigo-50 border-indigo-100", href: "/staff" },
                  { name: "Reports Logs", desc: "Analyze daily numbers", icon: BarChart2, color: "text-slate-600 bg-slate-50 border-slate-200", href: "/commissions" }
                ].map((action, idx) => (
                  <Link 
                    key={idx} 
                    href={action.href}
                    className="group flex flex-col justify-between p-4 rounded-2xl border border-slate-150 hover:border-purple-300 bg-white hover:bg-slate-50/30 transition-all shadow-xs"
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
            <CardContent className="p-4 flex-1 flex flex-col h-[380px] bg-slate-50/50 overflow-hidden">
              {/* Chat bubbles area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 custom-scrollbar">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col max-w-[85%] ${msg.sender === "customer" ? "ml-auto items-end" : "mr-auto items-start"}`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      msg.sender === "customer" 
                        ? "bg-[#6c5dd3] text-white rounded-br-none" 
                        : "bg-white text-slate-700 rounded-bl-none border border-slate-200"
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-slate-400 font-bold mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex items-center gap-1.5 mr-auto bg-white border border-slate-200 px-3.5 py-3 rounded-2xl rounded-bl-none max-w-[80%] shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
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
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#6c5dd3] hover:bg-[#5b4ec2] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
              <span className="h-2 w-2 rounded-full bg-pink-500 animate-ping"></span>
            </CardHeader>
            <CardContent className="p-6 flex items-center gap-4.5 bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-b border-slate-100">
              <div className="h-16 w-16 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 relative overflow-hidden animate-pulse">
                <Bot className="h-9 w-9 text-white relative z-10" />
                <div className="absolute -left-2 -bottom-2 h-8 w-8 bg-white/20 rounded-full"></div>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-extrabold text-sm text-slate-800 leading-tight">AI Receptionist Active</h4>
                <p className="text-[10px] text-slate-500 font-bold">24/7 Autopilot listening on WhatsApp Sandbox</p>
                <div className="flex gap-4 mt-2 justify-between border-t border-slate-150/80 pt-2 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Chats</p>
                    <p className="text-sm font-black text-purple-650">{aiChatsCount}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Bookings</p>
                    <p className="text-sm font-black text-pink-650">42</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Rate</p>
                    <p className="text-sm font-black text-indigo-650">32.8%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Today's Staff Schedule */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 flex flex-row items-center gap-2 shrink-0">
              <Clock className="h-4.5 w-4.5 text-purple-500" />
              <CardTitle className="text-base font-bold text-slate-800 font-display">Today's Staff Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative border-l border-slate-150 pl-4.5 ml-2.5 space-y-5">
                {[
                  { time: "10:00 AM", title: "Standard Haircut", staff: "Amit Stylist", active: false },
                  { time: "12:30 PM", title: "Massage Therapy", staff: "Rahul Stylist", active: false },
                  { time: "05:00 PM", title: "Premium Haircut & Styling", staff: "Amit Stylist", active: true },
                  { time: "08:00 PM", title: "Hair Coloring Treatment", staff: "Amit Stylist", active: false }
                ].map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                      item.active ? "bg-pink-500" : "bg-slate-300"
                    }`} />
                    <span className="text-[10px] font-extrabold text-purple-600 block">{item.time}</span>
                    <h4 className="font-bold text-xs text-slate-700 mt-0.5">{item.title}</h4>
                    <p className="text-[9px] text-slate-500 font-semibold">{item.staff}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Top Services Share */}
          <Card className="border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6 shrink-0">
              <CardTitle className="text-base font-bold text-slate-800 font-display">Popular Service Share</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {[
                { name: "Haircut & Grooming", pct: 45, color: "bg-purple-500" },
                { name: "Spa & Massage", pct: 30, color: "bg-pink-500" },
                { name: "Coloring & Treatment", pct: 25, color: "bg-blue-500" }
              ].map((service, idx) => (
                <div key={idx} className="space-y-1 group">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{service.name}</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-colors">{service.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
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
