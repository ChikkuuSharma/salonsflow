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
  const [aiPrompt, setAiPrompt] = useState("");
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

  const token = "dev-bypass-token";
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
        setAiPrompt(data.aiPrompt || "");
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
      const payload: any = { name, address };
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
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">AI Receptionist Settings</h2>
          <p className="text-sm text-zinc-400">Configure how SalonsFlow's AI interacts with your customers on WhatsApp.</p>
        </div>

        {/* Subscription Plan Badge */}
        <div className={`flex items-center gap-2 border px-4 py-2 rounded-full font-semibold text-sm shadow-sm ${
          isPremium && isActive
            ? "bg-emerald-950/60 border-emerald-800/40 text-emerald-300"
            : "bg-zinc-800 border-zinc-700 text-zinc-300"
        }`}>
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>Plan: {subscription?.plan} ({isActive ? "Active" : "Inactive"})</span>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-900/50 text-emerald-300 p-4 rounded-lg shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/60 border border-red-900/50 text-red-300 p-4 rounded-lg shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSave} className="space-y-6">
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-zinc-200 font-display">Salon Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Business Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Address & Directions</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none resize-none"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-zinc-200 font-display flex items-center gap-2">
                <span>AI Personality & Tone</span>
                {!isPremium && <Lock className="h-4 w-4 text-amber-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Custom Instructions</label>
                <textarea
                  rows={6}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={!isPremium || !isActive}
                  placeholder="e.g., Always address the customer by their first name. If they ask for hair service, recommend the Keratin special."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-550 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none disabled:bg-zinc-900/40 disabled:text-zinc-500 resize-none"
                />
              </div>

              {/* FREE plan lock overlay */}
              {(!isPremium || !isActive) && (
                <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 border border-zinc-850 rounded-xl">
                  <div className="h-10 w-10 bg-zinc-900 text-amber-450 rounded-full flex items-center justify-center mb-2 shadow-sm border border-zinc-800">
                    <Lock className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-100 font-display">Custom Prompts Locked</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mt-1 leading-relaxed">
                    Customizing the AI personality, language rules, and rebooking thresholds requires upgrading your salon plan.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-md py-2.5 font-semibold transition-all active:scale-95 duration-200 shadow-sm shadow-emerald-950/20 hover:shadow-md hover:shadow-emerald-900/30 disabled:bg-emerald-700/60 disabled:pointer-events-none cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving settings..." : "Save Configuration"}
          </button>
        </form>

        <div>
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md flex flex-col h-full min-h-[500px] overflow-hidden">
            <CardHeader className="border-b border-zinc-800/80 bg-zinc-900/10">
              <CardTitle className="text-lg font-bold text-zinc-200 font-display flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" /> AI Receptionist Simulator
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col justify-between">
              <div className="flex-1 p-4 flex flex-col gap-4 bg-zinc-950/20 overflow-y-auto max-h-[360px] min-h-[300px]">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "self-end bg-emerald-700/80 text-zinc-100 rounded-br-none shadow-emerald-950/10"
                        : "self-start bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-none shadow-zinc-950/30"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[10px] text-zinc-550 block text-right mt-1.5">{msg.time}</span>
                  </div>
                ))}
                {isTyping && (
                  <div className="self-start bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm shadow-sm text-zinc-400 italic flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                    AI Receptionist is thinking...
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800/80 bg-zinc-900/10 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type a test client message (e.g. 'book haircut tomorrow')..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 text-white rounded-full h-9 w-9 flex items-center justify-center hover:bg-emerald-500 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-90 duration-200"
                >
                  &rarr;
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
