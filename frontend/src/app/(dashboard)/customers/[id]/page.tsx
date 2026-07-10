"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Calendar, Phone, Mail, Loader2, Bot, Award, Star, Activity, Scissors, User } from "lucide-react";
import Link from "next/link";

interface Service {
  name: string;
  price: number;
}

interface Staff {
  name: string;
}

interface Appointment {
  id: string;
  startTime: string;
  service: Service;
  staff: Staff | null;
  bookingSource: string;
  amountPaid: number | null;
  status: string;
}

interface Message {
  id: string;
  content: string;
  direction: "INBOUND" | "OUTBOUND";
  timestamp: string;
}

interface Conversation {
  id: string;
  messages: Message[];
}

interface Metrics {
  totalVisits: number;
  totalRevenue: number;
  lastVisit: string | null;
  preferredServices: string[];
  preferredStaff: string[];
  lifetimeValue: number;
  bookingFrequencyDays: number;
  onlineRatio: number;
  offlineRatio: number;
}

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  appointments: Appointment[];
  conversations: Conversation[];
  metrics: Metrics;
}

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        
        // Fetch unified endpoint
        const response = await fetch(`${apiUrl}/api/v1/customers/unified/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load customer profile: ${response.statusText}`);
        }

        const data = await response.json();
        setCustomer(data);
      } catch (err: any) {
        setError(err.message || "Failed to load customer profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-24 min-h-[400px] gap-3">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
        <span className="text-zinc-400 text-sm">Decoding customer insights...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center text-red-400 bg-red-950/20 border border-red-900/50 rounded-md max-w-lg mx-auto my-12">
        <p className="font-semibold">Error: {error || "Customer profile could not be loaded."}</p>
        <div className="mt-4">
          <Link href="/customers" className="text-sm underline text-emerald-400 hover:text-emerald-350 transition-colors">
            Back to Smart Client Database
          </Link>
        </div>
      </div>
    );
  }

  const isVIP = customer.metrics.totalVisits >= 5;
  const status = isVIP ? "VIP Client" : "Regular Client";
  const messages = customer.conversations?.[0]?.messages || [];

  return (
    <div className="space-y-6 text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md border border-zinc-800">
            {customer.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 font-display">{customer.name}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border
                ${isVIP 
                  ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30' 
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'}`}>
                {isVIP ? <Star className="h-3 w-3 fill-indigo-400 text-indigo-455 text-indigo-400 border-none animate-none" /> : <Award className="h-3 w-3 text-zinc-400" />}
                {status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-zinc-400 mt-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-zinc-500" /> {customer.phone}</span>
              {customer.gender && (
                <span className="flex items-center gap-1.5 border-l border-zinc-800 pl-4">
                  <User className="h-3.5 w-3.5 text-zinc-500" /> 
                  <span className="capitalize">{customer.gender.toLowerCase()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`/conversations?phone=${customer.phone}`} 
            className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-805 hover:bg-zinc-800 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 duration-200 cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" /> Message Client
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Details & Insights */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800 shadow-sm overflow-hidden rounded-3xl backdrop-blur-md">
            <CardHeader className="border-b border-zinc-800 pb-4 bg-zinc-950/40">
              <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2 font-display">
                <Activity className="h-5 w-5 text-emerald-400" /> Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Lifetime Spend</p>
                  <p className="text-xl font-bold text-zinc-100 mt-0.5 font-display font-black">₹{customer.metrics.lifetimeValue}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Total Visits</p>
                  <p className="text-xl font-bold text-zinc-100 mt-0.5 font-display font-black">{customer.metrics.totalVisits}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Acquisition</p>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5 uppercase tracking-wide">
                    {customer.source?.replace('_', ' ') || "WHATSAPP"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Visit Interval</p>
                  <p className="text-sm font-bold text-zinc-300 mt-0.5">
                    {customer.metrics.totalVisits > 1 ? `~${customer.metrics.bookingFrequencyDays} Days` : "First Visit"}
                  </p>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Preferred Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.metrics.preferredServices.map((svc, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-950/40 text-emerald-400 text-xs font-semibold rounded-md border border-emerald-900/30">
                        <Scissors className="h-3 w-3" /> {svc}
                      </span>
                    ))}
                    {customer.metrics.preferredServices.length === 0 && (
                      <span className="text-xs text-zinc-500 italic font-semibold">No services logged</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Preferred Stylists</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.metrics.preferredStaff.map((staff, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 bg-blue-950/40 text-blue-400 text-xs font-semibold rounded-md border border-blue-900/30">
                        {staff}
                      </span>
                    ))}
                    {customer.metrics.preferredStaff.length === 0 && (
                      <span className="text-xs text-zinc-500 italic font-semibold">None assigned yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Online vs Offline Channels */}
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Booking Channel Split</p>
                <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                  <span>Online ({customer.metrics.onlineRatio}%)</span>
                  <span>Offline ({customer.metrics.offlineRatio}%)</span>
                </div>
                <div className="w-full bg-zinc-950 rounded-full h-2 flex overflow-hidden border border-zinc-800">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${customer.metrics.onlineRatio}%` }}></div>
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${customer.metrics.offlineRatio}%` }}></div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Staff Notes</p>
                <div className="text-sm text-zinc-300 bg-zinc-950 p-3.5 border border-zinc-800 rounded-xl italic font-semibold leading-relaxed">
                  {customer.notes || "No special instructions or preferences logged by staff."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Booking History & Conversations */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-zinc-900/60 border-zinc-800 shadow-sm overflow-hidden rounded-3xl backdrop-blur-md">
            <CardHeader className="border-b border-zinc-800 bg-zinc-950/40">
              <CardTitle className="text-lg font-bold text-zinc-100 flex items-center gap-2 font-display">
                <Calendar className="h-5 w-5 text-emerald-400" /> Booking History & Visits
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-800/60 p-0">
              {customer.appointments.map((booking) => {
                const amount = booking.amountPaid !== null && booking.amountPaid !== undefined 
                  ? booking.amountPaid 
                  : (booking.service?.price || 0);
                const isOffline = booking.bookingSource?.startsWith('OFFLINE_');
                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 hover:bg-zinc-950/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-zinc-200">{booking.service?.name || "Standard Treatment"}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border
                          ${isOffline 
                            ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' 
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'}`}>
                          {isOffline ? 'Offline Visit' : 'WhatsApp AI'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-zinc-500 mt-1 font-semibold">
                        <span>{new Date(booking.startTime).toLocaleDateString()} at {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {booking.staff && <span className="text-zinc-700 font-normal">•</span>}
                        {booking.staff && <span className="text-zinc-400">Stylist: {booking.staff.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-200">₹{amount}</p>
                      <span className="text-[10px] uppercase text-zinc-500 tracking-wide font-bold">{booking.status}</span>
                    </div>
                  </div>
                );
              })}
              {customer.appointments.length === 0 && (
                <div className="text-center text-zinc-500 py-16 font-semibold">
                  <Calendar className="h-8 w-8 mb-2 mx-auto text-zinc-655 text-zinc-600 animate-none" />
                  No visits or bookings recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800 shadow-sm overflow-hidden rounded-3xl backdrop-blur-md">
            <CardHeader className="border-b border-zinc-800 bg-zinc-950/40 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100 font-display">
                <MessageSquare className="h-5 w-5 text-emerald-400" /> AI Conversation Log
              </CardTitle>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full">Active Channel</span>
            </CardHeader>
            <CardContent className="p-0 bg-zinc-950/20">
              <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.direction === 'INBOUND' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      max-w-[80%] text-sm px-4 py-2.5 rounded-2xl shadow-xs leading-relaxed font-semibold
                      ${msg.direction === 'INBOUND' 
                        ? 'bg-zinc-805 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-br-none' 
                        : 'bg-gradient-to-r from-emerald-950/60 to-teal-950/40 text-emerald-400 border border-emerald-900/40 rounded-bl-none'}
                    `}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-zinc-555 text-zinc-500 font-semibold">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'OUTBOUND' && (
                        <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.2 rounded uppercase tracking-wider font-bold flex items-center gap-0.5">
                          <Bot className="h-2.5 w-2.5 text-emerald-400 animate-none" /> AI Agent
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-zinc-500 py-16 font-semibold">
                    <MessageSquare className="h-8 w-8 mb-2 mx-auto text-zinc-655 text-zinc-600 animate-none" />
                    No WhatsApp chat logs recorded yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
