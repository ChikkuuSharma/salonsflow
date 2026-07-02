"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Save, AlertTriangle, Lock, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [homeBookingFee, setHomeBookingFee] = useState<number | string>(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrStatus, setQrStatus] = useState<"QR" | "CONNECTED" | "DISCONNECTED" | "LOADING">("DISCONNECTED");
  const [subscription, setSubscription] = useState<any>(null);

  // Chat simulator state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "user",
      text: "Hi, what's the price for a Hair Spa?",
      time: "10:24 AM",
    },
    {
      sender: "ai",
      text: "Hello! A Hair Spa starts at ₹1,200 depending on length. Would you like to book an appointment?",
      time: "10:25 AM",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Load configuration on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${apiUrl}/api/v1/salons/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to load salon configuration");
        const data = await res.json();

        setName(data.name || "");
        setAddress(data.address || "");
        setHomeBookingFee(data.homeBookingFee ?? 0);
        setAiPrompt(data.aiPrompt || "");
        setWhatsappNumber(data.whatsappNumber || "");
        setSubscription(data.subscription || { plan: "FREE", status: "ACTIVE" });
      } catch (err: any) {
        console.error(err);
        setError("Error loading settings. Please verify the backend is online.");
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, [apiUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const payload: any = {
        name,
        address,
        homeBookingFee: Number(homeBookingFee) || 0,
      };
      // Include aiPrompt if editable (not on FREE plan)
      const isPremium = subscription?.plan === "BASIC" || subscription?.plan === "PRO";
      const isActive = subscription?.status === "ACTIVE";
      if (isPremium && isActive) {
        payload.aiPrompt = aiPrompt;
      }

      const res = await fetch(`${apiUrl}/api/v1/salons/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save configuration");
      }

      const updatedSalon = await res.json();
      setName(updatedSalon.name || "");
      setAddress(updatedSalon.address || "");
      setHomeBookingFee(updatedSalon.homeBookingFee ?? 0);
      setWhatsappNumber(updatedSalon.whatsappNumber || "");
      if (updatedSalon.aiPrompt) setAiPrompt(updatedSalon.aiPrompt);

      setSuccess("Configuration saved successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  const checkQrStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data.status);
        if (data.status === 'CONNECTED') {
          setQrCode("");
          // Re-fetch configurations to get updated whatsappNumber
          const confRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (confRes.ok) {
            const confData = await confRes.json();
            setWhatsappNumber(confData.whatsappNumber || "");
          }
        }
      }
    } catch (err) {
      console.error("Failed to check QR status:", err);
    }
  };

  const loadQrCode = async () => {
    setQrStatus('LOADING');
    try {
      const res = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data.status);
        if (data.qr) {
          setQrCode(data.qr);
        }
      }
    } catch (err) {
      console.error("Failed to load QR code:", err);
      setQrStatus('DISCONNECTED');
    }
  };

  const disconnectWhatsapp = async () => {
    if (!confirm("Are you sure you want to disconnect your linked WhatsApp number?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQrStatus('DISCONNECTED');
        setQrCode("");
        setWhatsappNumber("");
        alert("WhatsApp disconnected successfully.");
      }
    } catch (err) {
      console.error("Failed to disconnect WhatsApp:", err);
    }
  };

  useEffect(() => {
    checkQrStatus();
  }, []);

  useEffect(() => {
    let interval: any;
    if (qrStatus === 'QR' || qrStatus === 'LOADING') {
      interval = setInterval(() => {
        checkQrStatus();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrStatus]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      sender: "user",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response based on settings
    setTimeout(() => {
      let aiText = "";
      const textLower = userMsg.text.toLowerCase();

      const isPremium = subscription?.plan === "BASIC" || subscription?.plan === "PRO";
      const isActive = subscription?.status === "ACTIVE";

      if (isPremium && isActive && aiPrompt) {
        // AI customized logic simulation
        if (textLower.includes("price") || textLower.includes("how much")) {
          aiText = `Based on your instructions, I'd say: "Prices vary, but let me check that for you! Would you like to schedule an appointment at ${name}?"`;
        } else if (textLower.includes("book") || textLower.includes("appointment")) {
          aiText = `Got it! Let's schedule that for you. What date and time works best?`;
        } else {
          aiText = `Hello from ${name}! I'm programmed with custom behavior: "${aiPrompt.slice(0, 60)}..." how can I help you today?`;
        }
      } else {
        // Default standard response
        if (textLower.includes("price") || textLower.includes("how much")) {
          aiText = "Our services start at ₹300. Hair Spa starts at ₹1,200. Would you like to book an appointment?";
        } else {
          aiText = `Hello! Welcome to ${name || "our salon"}. I'm your automated assistant. Would you like to book an appointment or ask a question?`;
        }
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: aiText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-450 font-medium">Loading salon configuration...</p>
      </div>
    );
  }

  const isPremium = subscription?.plan === "BASIC" || subscription?.plan === "PRO";
  const isActive = subscription?.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-display">AI Receptionist Settings</h2>
          <p className="text-sm text-slate-550 font-semibold">Configure how SalonsFlow's AI interacts with your customers on WhatsApp.</p>
        </div>

        {/* Subscription Plan Badge */}
        <div className={`flex items-center gap-2 border px-4 py-2 rounded-full font-semibold text-sm shadow-sm ${
          isPremium && isActive
            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
            : "bg-slate-105 border-slate-200 text-slate-700"
        }`}>
          <Sparkles className="h-4 w-4 text-emerald-550 animate-pulse animate-none" />
          <span>Plan: {subscription?.plan} ({isActive ? "Active" : "Inactive"})</span>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-xl shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-bold">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/20">
              <CardTitle className="text-lg font-bold text-slate-800 font-display">Salon Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Address & Directions</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none font-semibold resize-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  🏠 Home Service Booking Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150"
                  value={homeBookingFee}
                  onChange={(e) => setHomeBookingFee(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none font-semibold"
                  required
                />
                <span className="text-[10px] text-zinc-550 font-semibold block leading-normal">
                  Set the additional convenience fee charged to clients choosing home booking services. Leave 0 for free.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/20">
              <CardTitle className="text-lg font-bold text-slate-800 font-display">WhatsApp Web Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-5 pb-6 text-center">
              {qrStatus === 'CONNECTED' && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 font-display">WhatsApp Linked & Live</h4>
                    <p className="text-xs font-semibold text-emerald-650 mt-1">Connected Number: <span className="font-mono font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-emerald-700">{whatsappNumber || "Loading..."}</span></p>
                    <p className="text-[11px] text-zinc-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
                      Your custom WhatsApp business number is active. All inbound booking messages will receive instant AI replies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectWhatsapp}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 duration-200"
                  >
                    Disconnect Channel
                  </button>
                </div>
              )}

              {qrStatus === 'QR' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-purple-650 uppercase block mb-1">Scan QR Code</span>
                    <h4 className="text-sm font-bold text-slate-800 leading-normal max-w-xs mx-auto font-sans">
                      Open WhatsApp on your phone, go to <strong className="text-purple-650">Linked Devices &rarr; Link a Device</strong>, and scan the code below.
                    </h4>
                  </div>
                  {qrCode ? (
                    <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto">
                      <img src={qrCode} alt="WhatsApp Web QR Code" className="w-48 h-48 rounded-xl object-contain" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 mx-auto flex items-center justify-center border border-dashed rounded-2xl bg-slate-50/50">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-450" />
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-550 font-semibold max-w-xs mx-auto leading-normal">
                    This screen will automatically refresh and connect as soon as you scan the QR code.
                  </p>
                </div>
              )}

              {qrStatus === 'LOADING' && (
                <div className="space-y-4 py-8 animate-pulse">
                  <RefreshCw className="h-8 w-8 animate-spin text-purple-650 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Connecting to WhatsApp gateway...</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Generating your secure encryption QR scan code...</p>
                  </div>
                </div>
              )}

              {qrStatus === 'DISCONNECTED' && (
                <div className="space-y-4 py-4 animate-in fade-in duration-200">
                  <div className="mx-auto h-12 w-12 bg-purple-50 text-purple-650 rounded-full flex items-center justify-center border border-purple-100 shadow-sm">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Connect Custom WhatsApp Line</h4>
                    <p className="text-xs text-zinc-450 max-w-xs mx-auto mt-1 leading-normal font-semibold">
                      Automate booking scheduling, review collection, and rebooking reminders using your own local WhatsApp phone number.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadQrCode}
                    className="inline-flex items-center gap-1.5 px-6 py-3 bg-purple-600 hover:bg-purple-550 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-200/50 cursor-pointer active:scale-95 duration-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Link via QR Code
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white border-slate-200 shadow-sm rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/20">
              <CardTitle className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                <span>AI Personality & Tone</span>
                {!isPremium && <Lock className="h-4 w-4 text-amber-500 animate-none" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Custom Instructions</label>
                <textarea
                  rows={6}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={!isPremium || !isActive}
                  placeholder="e.g., Always address the customer by their first name. If they ask for hair service, recommend the Keratin special."
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-850 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 focus:outline-none font-semibold resize-none disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              {/* FREE plan lock overlay */}
              {(!isPremium || !isActive) && (
                <div className="absolute inset-0 bg-slate-50/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 border border-slate-200 rounded-3xl">
                  <div className="h-10 w-10 bg-white text-amber-500 rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 font-display">Custom Prompts Locked</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed font-semibold">
                    Customizing the AI personality, language rules, and rebooking thresholds requires upgrading your salon plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-semibold transition-all active:scale-95 duration-200 shadow-sm disabled:bg-emerald-700/60 disabled:pointer-events-none cursor-pointer border-0"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving settings..." : "Save Configuration"}
          </button>
        </form>

        <div>
          <Card className="bg-white border-slate-200 shadow-sm flex flex-col h-full min-h-[500px] overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/20">
              <CardTitle className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-555" /> AI Receptionist Simulator
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col justify-between">
              <div className="flex-1 p-4 flex flex-col gap-4 bg-slate-50/30 overflow-y-auto max-h-[360px] min-h-[300px] custom-scrollbar">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs leading-relaxed font-semibold ${
                      msg.sender === "user"
                        ? "self-end bg-emerald-600 text-white rounded-br-none"
                        : "self-start bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[10px] text-slate-400 block text-right mt-1.5">{msg.time}</span>
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm shadow-xs text-slate-550 italic flex items-center gap-1.5 font-semibold">
                    <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
                    <span>AI is formulating response...</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-slate-50/20 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the AI simulator a scheduling question..."
                  className="flex-1 bg-white border border-slate-250 rounded-full px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all font-semibold shadow-inner"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-full p-2 shadow-xs transition-all active:scale-95 duration-200 cursor-pointer border-0"
                  title="Send message"
                >
                  <Bot className="h-4.5 w-4.5 text-white" />
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
