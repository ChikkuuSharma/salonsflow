"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Calendar, Bot, HelpCircle, User, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface Message {
  id: string;
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  timestamp: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function ConversationsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<"whatsapp" | "instagram">("whatsapp");
  const [customerName, setCustomerName] = useState("Anjali Sharma");
  const [customerPhone, setCustomerPhone] = useState("919876543210");

  useEffect(() => {
    if (channel === "whatsapp") {
      setCustomerName("Anjali Sharma");
      setCustomerPhone("919876543210");
    } else {
      setCustomerName("Anjali Sharma");
      setCustomerPhone("anjali_sharma_ig");
    }
  }, [channel]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Pre-configured test prompts for easy clicking
  const testPrompts = [
    { label: "💇 Book Haircut (Tomorrow at 4 PM)", text: "I want to book a Haircut tomorrow at 4 PM" },
    { label: "💅 Book Manicure (Next Monday at 10 AM)", text: "Can you schedule a Manicure for next Monday at 10 AM?" },
    { label: "💰 Ask Prices", text: "What are your service prices?" },
    { label: "📍 Ask Location", text: "Where is your salon located?" },
    { label: "👤 Speak to Human", text: "I want to speak with a human manager." }
  ];

  // Fetch all customers to choose from
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/customers`, {
        headers: { Authorization: "Bearer dev-bypass-token" }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(data[0].id);
          setCustomerName(data[0].name);
          setCustomerPhone(data[0].phone);
        }
      }
    } catch (e) {
      console.error("Failed to load customers list:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full conversation for selected customer
  const fetchConversation = async (customerId: string) => {
    if (!customerId) return;
    try {
      setError(null);
      const res = await fetch(`${apiUrl}/api/v1/customers/${customerId}`, {
        headers: { Authorization: "Bearer dev-bypass-token" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && data.conversations.length > 0) {
          setMessages(data.conversations[0].messages || []);
        } else {
          setMessages([]);
        }
      }
    } catch (e) {
      console.error("Failed to load conversation details:", e);
      setError("Failed to sync live chat thread from server.");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchConversation(selectedCustomerId);
      const interval = setInterval(() => fetchConversation(selectedCustomerId), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setSelectedCustomerId(cId);
    const selected = customers.find(c => c.id === cId);
    if (selected) {
      setCustomerName(selected.name);
      setCustomerPhone(selected.phone);
    }
  };

  const handleSend = async (textToSend = inputText) => {
    const msgText = textToSend.trim();
    if (!msgText) return;

    setSending(true);
    setInputText("");

    try {
      const isInstagram = channel === "instagram";
      const webhookUrl = isInstagram 
        ? `${apiUrl}/api/v1/webhooks/instagram`
        : `${apiUrl}/api/v1/webhooks/whatsapp`;

      // Build payload matching WhatsApp or Instagram webhook schema
      const webhookPayload = isInstagram 
        ? {
            object: "instagram",
            entry: [
              {
                id: "sandbox-instagram-page-id",
                time: Math.floor(Date.now() / 1000),
                messaging: [
                  {
                    sender: { id: customerPhone.trim() },
                    recipient: { id: "sandbox-instagram-page-id" },
                    timestamp: Date.now(),
                    message: {
                      mid: `ig.mid.${Date.now()}`,
                      text: msgText
                    }
                  }
                ]
              }
            ]
          }
        : {
            entry: [
              {
                changes: [
                  {
                    value: {
                      contacts: [
                        {
                          profile: {
                            name: customerName
                          }
                        }
                      ],
                      messages: [
                        {
                          from: customerPhone.replace(/\+/g, "").trim(),
                          id: `wamid.HBgL${Date.now()}FQIAERgSQjE4MkYwRDE2RjlB`,
                          text: {
                            body: msgText
                          },
                          timestamp: Math.floor(Date.now() / 1000).toString()
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!res.ok) {
        throw new Error("Failed to process message webhook");
      }

      // Re-fetch customers list in case a new customer was registered in postgres on-the-fly
      const refreshRes = await fetch(`${apiUrl}/api/v1/customers`, {
        headers: { Authorization: "Bearer dev-bypass-token" }
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setCustomers(data);
        const match = data.find((c: Customer) => c.phone === (isInstagram ? `ig_${customerPhone.trim()}` : customerPhone));
        if (match) {
          setSelectedCustomerId(match.id);
          fetchConversation(match.id);
        }
      }
    } catch (e) {
      console.error("Webhook simulation failed:", e);
      setError("Failed to deliver mock webhook message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col text-zinc-150">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 bg-gradient-to-r from-emerald-950/20 via-zinc-900/30 to-transparent rounded-3xl border border-emerald-900/30 shadow-md backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-405 bg-clip-text text-transparent font-display flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
              AI Chatbot Simulator & Tester
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Test intent classification and dynamic database scheduling in real-time.</p>
          </div>

          {/* Channel Segmented Switcher */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setChannel("whatsapp")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                channel === "whatsapp"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                  : "text-zinc-400 hover:text-zinc-200 bg-transparent"
              }`}
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </button>
            <button
              onClick={() => setChannel("instagram")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                channel === "instagram"
                  ? "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-200 bg-transparent"
              }`}
            >
              <Instagram className="h-4 w-4" /> Instagram
            </button>
          </div>
        </div>

        {/* Customer Selector / Creator */}
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-2xl shadow-sm">
          <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest pl-1">Active Customer:</label>
          <select 
            className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer"
            value={selectedCustomerId}
            onChange={handleSelectCustomer}
            disabled={customers.length === 0}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-zinc-950 text-zinc-200">
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Simulator Layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Simulator Controls & Prompts */}
        <div className="space-y-6 flex flex-col justify-between h-full">
          {/* Identity Card */}
          <Card className="bg-zinc-900/40 border border-zinc-850 backdrop-blur-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <CardHeader className="bg-zinc-900/40 border-b border-zinc-850 py-3.5 px-5 flex-shrink-0">
              <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                Simulated Sender Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5 px-5 pb-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Customer Display Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold shadow-inner"
                  placeholder="E.g. Anjali Sharma"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {channel === "whatsapp" ? "Simulated Phone Number" : "Simulated Instagram ID / Username"}
                </label>
                <input 
                  type="text" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold font-mono shadow-inner"
                  placeholder={channel === "whatsapp" ? "E.g. 919876543210" : "E.g. anjali_sharma_ig"}
                />
                <span className="text-[9px] text-zinc-500 block leading-normal pt-1 font-medium">
                  {channel === "whatsapp" 
                    ? "Changing display name or phone number simulates a new customer webhook event!"
                    : "Changing display name or Instagram ID simulates a new customer webhook event!"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Test Templates Card */}
          <Card className="bg-zinc-900/40 border border-zinc-850 backdrop-blur-md rounded-3xl shadow-lg flex-1 mt-4 overflow-hidden flex flex-col">
            <CardHeader className="bg-zinc-900/40 border-b border-zinc-850 py-3.5 px-5 flex-shrink-0">
              <CardTitle className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 font-display">
                <HelpCircle className="h-4 w-4 text-emerald-450" />
                Quick Test Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar">
              <p className="text-[11px] text-zinc-450 pb-1.5 font-light">Click a test prompt below to instantly simulate the client intent:</p>
              {testPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.text)}
                  disabled={sending}
                  className="w-full text-left text-xs bg-zinc-950 hover:bg-emerald-950/20 hover:border-emerald-500/30 border border-zinc-800/80 rounded-2xl p-3.5 transition-all duration-200 flex justify-between items-center group cursor-pointer text-zinc-300 hover:text-zinc-100 shadow-sm"
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl px-2.5 py-1 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500 transition-all font-bold">
                    Send
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
         {/* Right Side: Live Chat Interface (WhatsApp / Instagram Mockup) */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-900 border border-zinc-800/80 rounded-3xl shadow-xl overflow-hidden h-full">
          {/* Header */}
          <div className={`${channel === "instagram" ? "bg-[#121212] border-b border-zinc-800/80" : "bg-[#0b141a] border-b border-zinc-800/60"} p-4 flex justify-between items-center flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 ${
                channel === "instagram"
                  ? "bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 text-white"
                  : "bg-emerald-950 border border-emerald-800/40 text-emerald-400"
              } rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-black/30 font-display`}>
                {customerName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100 leading-tight font-display">{customerName}</h3>
                <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-wider pt-0.5">{customerPhone}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 ${
              channel === "instagram"
                ? "bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-900/30 text-purple-300"
                : "bg-emerald-950/60 border border-emerald-900/30 text-emerald-400"
            } text-[9px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-full`}>
              <Bot className={`h-3.5 w-3.5 ${channel === "instagram" ? "text-purple-400" : "text-emerald-400"} animate-pulse`} /> AI Autopilot
            </div>
          </div>

          {/* Messages Log area */}
          <div ref={messagesContainerRef} className={`flex-1 ${channel === "instagram" ? "bg-[#121212]/30" : "bg-[#0b141a]/40"} p-5 overflow-y-auto space-y-4 font-sans relative custom-scrollbar`}>
            {/* Background design matrix */}
            <div className={`absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(${channel === "instagram" ? "#ec4899" : "#10b981"}_1px,transparent_1px)] [background-size:16px_16px]`}></div>

            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-zinc-500 z-10 relative">
                <div className="h-12 w-12 bg-zinc-950 border border-zinc-850 text-zinc-400 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                  {channel === "instagram" ? (
                    <Instagram className="h-6 w-6 text-pink-500" />
                  ) : (
                    <MessageSquare className="h-6 w-6 text-emerald-500" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-300 font-display">No Conversations Logged</p>
                  <p className="text-xs max-w-xs mt-1 font-light text-zinc-450 leading-relaxed">
                    Type a custom message below or click one of our Quick Templates on the left to start checking the AI reception response logic.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isOutbound = m.direction === "OUTBOUND";
                return (
                  <div key={m.id} className={`flex ${isOutbound ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-md shadow-black/10 relative text-xs leading-relaxed ${
                      isOutbound 
                        ? (channel === "instagram" ? "bg-[#262626] text-neutral-100 rounded-tl-none border border-zinc-800/40" : "bg-[#202c33] text-neutral-100 rounded-tl-none border border-zinc-800/40")
                        : (channel === "instagram" ? "bg-[#3797f0] text-white rounded-tr-none" : "bg-[#005c4b] text-white rounded-tr-none")
                    }`}>
                      <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                      <div className="flex items-center justify-between gap-3 mt-2 border-t border-zinc-800/20 pt-1.5">
                        <span className="text-[8px] text-zinc-450 uppercase font-bold tracking-wider">
                          {isOutbound ? "AI Autopilot" : customerName}
                        </span>
                        <span className="text-[8px] text-zinc-450 font-semibold font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex justify-start">
                <div className={`${channel === "instagram" ? "bg-[#262626]" : "bg-[#202c33]"} border border-zinc-800/80 rounded-2xl rounded-tl-none p-3 shadow-md text-xs text-zinc-400 flex items-center gap-2`}>
                  <Loader2 className={`h-3.5 w-3.5 animate-spin ${channel === "instagram" ? "text-pink-500" : "text-emerald-500"}`} />
                  AI receptionist is analyzing intent...
                </div>
              </div>
            )}

            {/* End of Chat */}
          </div>

          {/* Input Panel */}
          <div className={`p-3.5 border-t border-zinc-800/60 ${channel === "instagram" ? "bg-[#121212]" : "bg-[#0b141a]"} flex gap-2.5 flex-shrink-0`}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className={`flex-1 ${channel === "instagram" ? "bg-[#1e1e1e] border-zinc-800" : "bg-[#202c33] border-zinc-800/50"} border text-xs text-zinc-105 placeholder-zinc-500 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 ${channel === "instagram" ? "focus:ring-pink-500" : "focus:ring-emerald-500"} font-semibold`}
              placeholder="Type message to test AI receptionist..."
              disabled={sending}
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !inputText.trim()}
              className={`h-10 w-10 ${channel === "instagram" ? "bg-gradient-to-r from-purple-650 to-pink-600 hover:from-purple-550 hover:to-pink-550 animate-shimmer" : "bg-emerald-600 hover:bg-emerald-500"} active:scale-95 rounded-xl flex items-center justify-center text-white transition-all shadow-md focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Send className="h-4.5 w-4.5 pl-0.5" />
            </button>
          </div>         </div>
        </div>

      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-900/40 text-rose-300 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4 text-rose-450" /> {error}
        </div>
      )}
    </div>
  );
}
