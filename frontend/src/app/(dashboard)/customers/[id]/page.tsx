"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  MessageSquare, 
  Calendar, 
  Phone, 
  Loader2, 
  Bot, 
  Award, 
  Star, 
  Activity, 
  Scissors, 
  User,
  ChevronLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  amountPaid: number | null;
  bookingSource: string | null;
  service: {
    name: string;
    price: number;
  } | null;
  staff: {
    name: string;
  } | null;
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  messages: Message[];
}

interface CustomerDetails {
  id: string;
  name: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  source: string | null;
  createdAt: string;
  appointments: Appointment[];
  conversations: Conversation[];
  metrics: {
    lifetimeValue: number;
    totalVisits: number;
    bookingFrequencyDays: number;
    preferredServices: string[];
    preferredStaff: string[];
    onlineRatio: number;
    offlineRatio: number;
  };
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${apiUrl}/api/v1/customers/${id}`, {
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
        setError(err.message || "Failed to fetch customer profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [id, apiUrl]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 gap-3">
        <Loader2 className="h-10 w-10 text-purple-650 text-purple-600 animate-spin" />
        <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Loading client dossier...</span>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl max-w-md mx-auto space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Dossier Unavailable</h3>
        <p className="text-sm text-slate-500">{error || "Could not retrieve client details."}</p>
        <Link 
          href="/customers"
          className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" /> Return to Database
        </Link>
      </div>
    );
  }

  const isVIP = customer.metrics.totalVisits >= 5;
  const status = isVIP ? 'VIP Client' : 'Regular Client';
  const messages = customer.conversations?.[0]?.messages || [];

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gradient-to-tr from-purple-650 from-purple-600 to-pink-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md border border-slate-200">
            {customer.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-display">{customer.name}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border
                ${isVIP 
                  ? 'bg-amber-50 text-amber-600 border-amber-250 border-amber-200' 
                  : 'bg-slate-100 text-slate-655 text-slate-600 border-slate-205 border-slate-200'}`}>
                {isVIP ? <Star className="h-3 w-3 fill-amber-500 text-amber-600 border-none animate-none" /> : <Award className="h-3 w-3 text-slate-400" />}
                {status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-slate-500 mt-1.5 text-sm font-semibold">
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone}</span>
              {customer.gender && (
                <span className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                  <User className="h-3.5 w-3.5 text-slate-400" /> 
                  <span className="capitalize">{customer.gender.toLowerCase()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link 
            href={`/conversations?phone=${customer.phone}`} 
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 duration-200 cursor-pointer"
          >
            <MessageSquare className="h-4 w-4 text-slate-500" /> Message Client
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Details & Insights */}
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-200 pb-4 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
                <Activity className="h-5 w-5 text-purple-650" /> Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Lifetime Spend</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5 font-display font-black">₹{customer.metrics.lifetimeValue}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Visits</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5 font-display font-black">{customer.metrics.totalVisits}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Acquisition</p>
                  <p className="text-sm font-bold text-purple-600 mt-0.5 uppercase tracking-wide">
                    {customer.source?.replace('_', ' ') || "WHATSAPP"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Visit Interval</p>
                  <p className="text-sm font-bold text-slate-700 mt-0.5">
                    {customer.metrics.totalVisits > 1 ? `~${customer.metrics.bookingFrequencyDays} Days` : "First Visit"}
                  </p>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Preferred Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.metrics.preferredServices.map((svc, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-600 text-xs font-semibold rounded-md border border-purple-100">
                        <Scissors className="h-3 w-3" /> {svc}
                      </span>
                    ))}
                    {customer.metrics.preferredServices.length === 0 && (
                      <span className="text-xs text-slate-400 italic font-semibold">No services logged</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Preferred Stylists</p>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.metrics.preferredStaff.map((staff, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-md border border-blue-100">
                        {staff}
                      </span>
                    ))}
                    {customer.metrics.preferredStaff.length === 0 && (
                      <span className="text-xs text-slate-400 italic font-semibold">None assigned yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Online vs Offline Channels */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Booking Channel Split</p>
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Online ({customer.metrics.onlineRatio}%)</span>
                  <span>Offline ({customer.metrics.offlineRatio}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden border border-slate-200">
                  <div className="bg-purple-500 h-full transition-all" style={{ width: `${customer.metrics.onlineRatio}%` }}></div>
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${customer.metrics.offlineRatio}%` }}></div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Staff Notes</p>
                <div className="text-sm text-slate-655 text-slate-600 bg-slate-50 p-3.5 border border-slate-100 rounded-xl italic font-semibold leading-relaxed">
                  {customer.notes || "No special instructions or preferences logged by staff."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Booking History & Conversations */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-200 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2 font-display">
                <Calendar className="h-5 w-5 text-purple-650" /> Booking History & Visits
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {customer.appointments.map((booking) => {
                const amount = booking.amountPaid !== null && booking.amountPaid !== undefined 
                  ? booking.amountPaid 
                  : (booking.service?.price || 0);
                const isOffline = booking.bookingSource?.startsWith('OFFLINE_');
                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 hover:bg-slate-50/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-800">{booking.service?.name || "Standard Treatment"}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border
                          ${isOffline 
                            ? 'bg-blue-50 text-blue-650 border border-blue-100' 
                            : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                          {isOffline ? 'Offline Visit' : 'WhatsApp AI'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-1 font-semibold">
                        <span>{new Date(booking.startTime).toLocaleDateString()} at {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {booking.staff && <span className="text-slate-200 font-normal">•</span>}
                        {booking.staff && <span className="text-slate-500">Stylist: {booking.staff.name}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">₹{amount}</p>
                      <span className="text-[10px] uppercase text-slate-400 tracking-wide font-bold">{booking.status}</span>
                    </div>
                  </div>
                );
              })}
              {customer.appointments.length === 0 && (
                <div className="text-center text-slate-400 py-16 font-semibold">
                  <Calendar className="h-8 w-8 mb-2 mx-auto text-slate-400 animate-none" />
                  No visits or bookings recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="border-b border-slate-200 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 font-display">
                <MessageSquare className="h-5 w-5 text-purple-650" /> AI Conversation Log
              </CardTitle>
              <span className="text-xs text-purple-600 font-bold bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">Active Channel</span>
            </CardHeader>
            <CardContent className="p-0 bg-slate-50/20">
              <div className="p-4 flex flex-col gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.direction === 'INBOUND' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      max-w-[80%] text-sm px-4 py-2.5 rounded-2xl shadow-xs leading-relaxed font-semibold
                      ${msg.direction === 'INBOUND' 
                        ? 'bg-white text-slate-800 border border-slate-200 rounded-br-none' 
                        : 'bg-purple-50 text-purple-650 border border-purple-100 rounded-bl-none'}
                    `}>
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'OUTBOUND' && (
                        <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.2 rounded uppercase tracking-wider font-bold flex items-center gap-0.5">
                          <Bot className="h-2.5 w-2.5 text-purple-600 animate-none" /> AI Agent
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 py-16 font-semibold">
                    <MessageSquare className="h-8 w-8 mb-2 mx-auto text-slate-400 animate-none" />
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
