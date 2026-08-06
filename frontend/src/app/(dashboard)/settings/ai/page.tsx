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
  const [openingTime, setOpeningTime] = useState("10:00");
  const [closingTime, setClosingTime] = useState("20:00");
  const [aiPrompt, setAiPrompt] = useState("");
  const [salonId, setSalonId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [qrStatus, setQrStatus] = useState<"QR" | "CONNECTED" | "DISCONNECTED" | "LOADING">("DISCONNECTED");
  const [subscription, setSubscription] = useState<any>(null);

  // 8-digit pairing code state
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingCodeLoading, setPairingCodeLoading] = useState(false);
  const [pairingCodeError, setPairingCodeError] = useState("");
  const [linkMode, setLinkMode] = useState<"QR" | "CODE">("QR");
  const [copiedCode, setCopiedCode] = useState(false);

  const instanceIdRef = React.useRef('inst_' + Math.random().toString(36).substring(2, 7));
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  if (typeof window !== "undefined") {
    console.log(`[${new Date().toISOString()}] [RENDER #${renderCountRef.current}] [${instanceIdRef.current}] linkMode: ${linkMode}, pairingCode: ${pairingCode || 'EMPTY'}, qrStatus: ${qrStatus}, loading: ${loading}, salonId: ${salonId || 'EMPTY'}`);
  }

  useEffect(() => {
    console.log(`[${new Date().toISOString()}] [COMPONENT_MOUNT] [${instanceIdRef.current}] Mounted AISettingsPage`);
    return () => {
      console.log(`[${new Date().toISOString()}] [COMPONENT_UNMOUNT] [${instanceIdRef.current}] Unmounted AISettingsPage`);
    };
  }, []);

  const copyPairingCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "https://api.salonsflow.in";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  };
  const apiUrl = getApiUrl();

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

        setSalonId(data.id || "");
        setName(data.name || "");
        setAddress(data.address || "");
        setHomeBookingFee(data.homeBookingFee ?? 0);
        setOpeningTime(data.openingTime || "10:00");
        setClosingTime(data.closingTime || "20:00");
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
        openingTime,
        closingTime,
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
      setOpeningTime(updatedSalon.openingTime || "10:00");
      setClosingTime(updatedSalon.closingTime || "20:00");
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
      const activeToken = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
      const res = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/status`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONNECTED') {
          setQrStatus('CONNECTED');
          setQrCode("");
          const confRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
            headers: { Authorization: `Bearer ${activeToken}` }
          });
          if (confRes.ok) {
            const confData = await confRes.json();
            setWhatsappNumber(confData.whatsappNumber || "");
          }
        } else if (data.status === 'QR' || data.status === 'QR_READY') {
          setQrStatus('QR');
          if (data.qr) {
            setQrCode(data.qr);
          } else {
            loadQrCode(false);
          }
        } else if (data.status === 'CONNECTING') {
          setQrStatus('LOADING');
        } else if (data.status === 'DISCONNECTED') {
          setQrStatus('DISCONNECTED');
        }
      }
    } catch (err) {
      console.error("Failed to check QR status:", err);
    }
  };

  const loadQrCode = async (isForce = false) => {
    setQrStatus('LOADING');
    setQrCode("");
    try {
      const activeToken = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
      const url = isForce ? `${apiUrl}/api/v1/webhooks/whatsapp/qr?force=true` : `${apiUrl}/api/v1/webhooks/whatsapp/qr`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONNECTED') {
          setQrStatus('CONNECTED');
          return;
        }

        setQrStatus('QR');
        if (data.qr) {
          setQrCode(data.qr);
        }

        // Continuous resilience status polling loop every 2s to detect phone scan without destroying active socket
        const startTime = Date.now();
        const pollInterval = setInterval(async () => {
          if (Date.now() - startTime > 45000) {
            clearInterval(pollInterval);
            return;
          }
          try {
            const pollRes = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/status`, {
              headers: { Authorization: `Bearer ${activeToken}` }
            });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.status === 'CONNECTED') {
                setQrStatus('CONNECTED');
                setQrCode("");
                clearInterval(pollInterval);
                const confRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
                  headers: { Authorization: `Bearer ${activeToken}` }
                });
                if (confRes.ok) {
                  const confData = await confRes.json();
                  setWhatsappNumber(confData.whatsappNumber || "");
                }
              } else if ((pollData.status === 'QR' || pollData.status === 'QR_READY') && pollData.qr) {
                setQrStatus('QR');
                setQrCode(pollData.qr);
              }
            }
          } catch (_) {}
        }, 2000);
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

  const handleRequestPairingCode = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!pairingPhone) return;
    console.log(`[${new Date().toISOString()}] [CLICK_GET_CODE] [${instanceIdRef.current}] Phone: ${pairingPhone}`);
    setPairingCodeLoading(true);
    setPairingCodeError("");
    setPairingCode("");
    console.log(`[${new Date().toISOString()}] [SET_LINK_MODE] [${instanceIdRef.current}] Transitioning linkMode to CODE`);
    setLinkMode("CODE");

    try {
      const activeToken = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
      console.log(`[${new Date().toISOString()}] [HTTP_DISPATCH] [${instanceIdRef.current}] Dispatching POST ${apiUrl}/api/v1/webhooks/whatsapp/pairing-code`);
      const res = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/pairing-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ phoneNumber: pairingPhone }),
      });
      const data = await res.json();
      console.log(`[${new Date().toISOString()}] [HTTP_RESPONSE] [${instanceIdRef.current}] Status: ${res.status}, Data: ${JSON.stringify(data)}`);
      if (res.ok && data.code) {
        console.log(`[${new Date().toISOString()}] [SET_PAIRING_CODE] [${instanceIdRef.current}] Setting pairing code state: ${data.code}`);
        setPairingCode(data.code);
        setLinkMode("CODE");

        // Start lightweight status-only polling loop to detect phone handshake completion
        const startTime = Date.now();
        const codePoll = setInterval(async () => {
          if (Date.now() - startTime > 180000) {
            clearInterval(codePoll);
            return;
          }
          try {
            const statusRes = await fetch(`${apiUrl}/api/v1/webhooks/whatsapp/status`, {
              headers: { Authorization: `Bearer ${activeToken}` }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.status === 'CONNECTED') {
                console.log(`[${new Date().toISOString()}] [CONNECTED_DETECTED] [${instanceIdRef.current}] Setting status CONNECTED`);
                setQrStatus('CONNECTED');
                clearInterval(codePoll);
                const confRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
                  headers: { Authorization: `Bearer ${activeToken}` }
                });
                if (confRes.ok) {
                  const confData = await confRes.json();
                  setWhatsappNumber(confData.whatsappNumber || "");
                }
              }
            }
          } catch (_) {}
        }, 2000);
      } else {
        console.error(`[${new Date().toISOString()}] [HTTP_ERROR] [${instanceIdRef.current}] Error: ${data.error}`);
        setPairingCodeError(data.error || "Failed to generate pairing code.");
      }
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] [FETCH_EXCEPTION] [${instanceIdRef.current}] Exception: ${err.message}`);
      setPairingCodeError(err.message || "Failed to connect to backend server.");
    } finally {
      setPairingCodeLoading(false);
    }
  };

  useEffect(() => {
    checkQrStatus();
    loadQrCode(false);
  }, []);

  useEffect(() => {
    let interval: any;
    // ONLY poll QR status when user is explicitly in QR mode
    if (linkMode === "QR" && (qrStatus === 'QR' || qrStatus === 'LOADING')) {
      interval = setInterval(() => {
        checkQrStatus();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrStatus, qrCode, linkMode]);

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

  if (loading && !salonId) {
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
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 font-display">AI Receptionist Settings</h2>
          <p className="text-sm text-slate-500 font-semibold">Configure how SalonsFlow's AI interacts with your customers on WhatsApp.</p>
        </div>

        {/* Subscription Plan Badge */}
        <div className={`flex items-center gap-2 border px-4 py-2 rounded-full font-semibold text-sm shadow-sm ${
          isPremium && isActive
            ? "bg-purple-50 border-purple-100 text-purple-600"
            : "bg-slate-100 border-slate-200 text-slate-500"
        }`}>
          <Bot className="h-4 w-4 text-emerald-450 animate-pulse text-emerald-450" />
          <span>Plan: {subscription?.plan} ({isActive ? "Active" : "Inactive"})</span>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/80 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 p-4 rounded-xl shadow-xs">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-display">Salon Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Address & Directions</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold resize-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                  🏠 Home Service Booking Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150"
                  value={homeBookingFee}
                  onChange={(e) => setHomeBookingFee(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold"
                  required
                />
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold block leading-normal">
                  Set the additional convenience fee charged to clients choosing home booking services. Leave 0 for free.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Opening Time (24h)</label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Closing Time (24h)</label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-display">WhatsApp Web Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-5 pb-6 text-center">
              {qrStatus === 'CONNECTED' && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="mx-auto h-16 w-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 font-display">WhatsApp Linked & Live</h4>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">Connected Number: <span className="font-mono font-bold bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400">{whatsappNumber || "Loading..."}</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-medium max-w-xs mx-auto leading-relaxed">
                      Your custom WhatsApp business number is active. All inbound booking messages will receive instant AI replies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={disconnectWhatsapp}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 duration-200"
                  >
                    Disconnect Channel
                  </button>

                  {/* Walk-in Direct Online Booking QR Code helper */}
                  <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 mt-4 text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900/30 px-3 py-1 rounded-full">
                      Walk-In Direct Booking QR
                    </span>
                    <p className="text-slate-500 dark:text-zinc-400 text-[11px] font-semibold mt-3 max-w-[280px] mx-auto leading-relaxed">
                      Scan this QR code with your phone camera to directly open your salon's web booking scheduler:
                    </p>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 inline-block my-4">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/book?salonId=${salonId || ""}` : "https://salonsflow.in/book")}`} 
                        alt="Walk-in Direct Booking QR" 
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold leading-normal max-w-xs mx-auto">
                      Direct booking link: <a href={typeof window !== "undefined" ? `${window.location.origin}/book?salonId=${salonId || ""}` : "#"} target="_blank" rel="noreferrer" className="text-emerald-600 underline">Open Booking Scheduler</a>
                    </p>
                  </div>
                </div>
              )}

              {qrStatus !== 'CONNECTED' && (
                <div className="space-y-4 py-2 animate-in fade-in duration-200">
                  {/* Linking Mode Selector Tabs */}
                  <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl max-w-xs mx-auto mb-2 border border-slate-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        setLinkMode("QR");
                        if (qrStatus === 'DISCONNECTED') loadQrCode(false);
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${linkMode === "QR" ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"}`}
                    >
                      📷 QR Code Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setLinkMode("CODE")}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${linkMode === "CODE" ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900"}`}
                    >
                      🔑 8-Digit Code
                    </button>
                  </div>

                  {linkMode === "CODE" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl max-w-sm mx-auto space-y-3 text-left">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">
                          Enter Phone Number with Country Code:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={pairingPhone}
                            onChange={(e) => setPairingPhone(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRequestPairingCode(e);
                              }
                            }}
                            placeholder="e.g. 919876543210"
                            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={(e) => handleRequestPairingCode(e)}
                            disabled={pairingCodeLoading}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            {pairingCodeLoading ? "Generating..." : "Get Code"}
                          </button>
                        </div>
                        {pairingCodeError && (
                          <p className="text-[11px] font-bold text-rose-500">{pairingCodeError}</p>
                        )}
                      </div>

                      {pairingCode && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-2xl max-w-sm mx-auto text-center animate-in fade-in zoom-in-95 duration-200">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block mb-1">
                            🔑 Your 8-Digit WhatsApp Pairing Code
                          </span>
                          <div className="text-3xl font-mono font-black text-emerald-700 dark:text-emerald-300 tracking-widest my-2 bg-white dark:bg-zinc-900 py-3 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center justify-center gap-3">
                            <span>{pairingCode}</span>
                            <button
                              type="button"
                              onClick={copyPairingCode}
                              className="text-xs font-sans font-bold px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-all active:scale-95 border-0"
                            >
                              {copiedCode ? "Copied! ✓" : "Copy"}
                            </button>
                          </div>
                          <ol className="text-xs font-semibold text-slate-700 dark:text-zinc-300 text-left space-y-1.5 list-decimal list-inside mt-3">
                            <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                            <li>Go to <strong>Linked Devices &rarr; Link a Device</strong>.</li>
                            <li>Tap <strong>"Link with phone number instead"</strong> at the bottom.</li>
                            <li>Enter 8-digit code: <strong className="font-mono text-emerald-600">{pairingCode}</strong></li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {linkMode === "QR" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3.5 rounded-xl text-left max-w-sm mx-auto">
                        <span className="text-[11px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase block mb-1">
                          📱 Important: Scan inside WhatsApp App
                        </span>
                        <ol className="text-xs font-semibold text-amber-900 dark:text-amber-200 space-y-1 list-decimal list-inside">
                          <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                          <li>Tap <strong>Menu (3 dots)</strong> or <strong>Settings</strong>.</li>
                          <li>Select <strong>Linked Devices &rarr; Link a Device</strong>.</li>
                          <li>Scan the QR code below using the in-app scanner.</li>
                        </ol>
                        <p className="text-[10px] text-amber-750 dark:text-amber-300 mt-1.5 font-bold italic">
                          ⚠️ Do NOT scan with regular Phone Camera app.
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 font-bold">
                          💡 If WhatsApp shows "Can't link new device", log out of an old linked device under WhatsApp -&gt; Linked Devices first (WhatsApp allows max 4 linked devices per phone number).
                        </p>
                      </div>

                      {qrCode ? (
                        <div className="bg-white p-3 rounded-2xl shadow-md inline-block mx-auto border border-slate-200">
                          <img 
                            src={qrCode.startsWith("data:image/") ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`} 
                            alt="WhatsApp Web QR Code" 
                            className="w-52 h-52 rounded-xl object-contain" 
                          />
                        </div>
                      ) : (
                        <div className="w-52 h-52 mx-auto flex flex-col items-center justify-center border border-dashed border-emerald-500/40 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/20 gap-3">
                          <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
                          <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">Generating live QR code...</span>
                        </div>
                      )}

                      <div className="pt-1 flex flex-col items-center gap-2">
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold max-w-xs mx-auto leading-normal">
                          This screen automatically detects your phone scan and connects.
                        </p>
                        <button
                          type="button"
                          onClick={() => loadQrCode(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3 text-emerald-500" /> Regenerate QR Code
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-display flex items-center gap-2">
                <span>AI Personality & Tone</span>
                {!isPremium && <Lock className="h-4 w-4 text-amber-500 animate-none" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">Custom Instructions</label>
                <textarea
                  rows={6}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={!isPremium || !isActive}
                  placeholder="e.g., Always address the customer by their first name. If they ask for hair service, recommend the Keratin special."
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-slate-805 text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:outline-none font-semibold resize-none disabled:bg-slate-100 dark:disabled:bg-zinc-900/40 disabled:text-slate-400 dark:disabled:text-zinc-500"
                />
              </div>

              {/* FREE plan lock overlay */}
              {(!isPremium || !isActive) && (
                <div className="absolute inset-0 bg-white/95 dark:bg-zinc-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 border border-slate-200 dark:border-zinc-800 rounded-3xl">
                  <div className="h-10 w-10 bg-slate-50 dark:bg-zinc-900 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-200 dark:border-zinc-800">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-display">Custom Prompts Locked</h4>
                  <p className="text-xs text-slate-550 dark:text-zinc-400 max-w-xs mt-1 leading-relaxed font-semibold">
                    Customizing the AI personality, language rules, and rebooking thresholds requires upgrading your salon plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl py-3 font-bold uppercase tracking-wider transition-all active:scale-95 duration-200 shadow-sm disabled:opacity-75 disabled:pointer-events-none cursor-pointer border-0"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving settings..." : "Save Configuration"}
          </button>
        </form>

        <Card className="bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col h-full min-h-[500px] overflow-hidden rounded-3xl backdrop-blur-md">
          <CardHeader className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-zinc-100 font-display flex items-center gap-2">
              <Bot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> AI Receptionist Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col justify-between">
            <div className="flex-1 p-4 flex flex-col gap-4 bg-slate-50/50 dark:bg-zinc-950/20 overflow-y-auto max-h-[360px] min-h-[300px] custom-scrollbar">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-xs leading-relaxed font-semibold ${
                    msg.sender === "user"
                      ? "self-end bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-br-none"
                      : "self-start bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/60 dark:to-teal-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 block text-right mt-1.5">{msg.time}</span>
                </div>
              ))}
              {isTyping && (
                <div className="self-start bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm shadow-xs text-slate-500 dark:text-zinc-400 italic flex items-center gap-1.5 font-semibold">
                  <RefreshCw className="h-3 w-3 animate-spin text-slate-400 dark:text-zinc-500" />
                  <span>AI is formulating response...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask the AI simulator a scheduling question..."
                className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-full px-4 py-2 text-sm text-slate-805 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all font-semibold"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-full p-2.5 active:scale-95 duration-200 cursor-pointer border-0"
                title="Send message"
              >
                <Bot className="h-4.5 w-4.5 text-zinc-950" />
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
