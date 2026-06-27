"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calculator,
  User,
  Scissors,
  Percent,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  IndianRupee,
  Search,
  Sparkles,
  TrendingUp,
  Sliders,
  DollarSign
} from "lucide-react";

export default function CommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Lists from DB
  const [staffList, setStaffList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);

  // Payout report states
  const [payouts, setPayouts] = useState<any[]>([]);
  const [filterStaff, setFilterStaff] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Rate config states
  const [formStaff, setFormStaff] = useState("");
  const [formService, setFormService] = useState("");
  const [ratePercent, setRatePercent] = useState<number>(15);

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Load lists and payouts
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [staffRes, servicesRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/appointments/staff`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${apiUrl}/api/v1/rebookings/services`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!staffRes.ok || !servicesRes.ok) {
          throw new Error("Failed to load staff or service list");
        }

        const staffData = await staffRes.json();
        const servicesData = await servicesRes.json();

        setStaffList(staffData);
        setServicesList(servicesData);

        if (staffData.length > 0) setFormStaff(staffData[0].id);
        if (servicesData.length > 0) setFormService(servicesData[0].id);

        // Fetch payouts reports
        await fetchPayouts();
      } catch (err: any) {
        console.error(err);
        setError("Error loading data from server.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [apiUrl]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      let url = `${apiUrl}/api/v1/commissions/payouts?`;
      if (filterStaff) url += `staffId=${filterStaff}&`;
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch payouts calculation");
      const data = await res.json();
      setPayouts(data);
    } catch (err: any) {
      console.error(err);
      setError("Error calculating payouts report.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStaff || !formService) return;
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/commissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staffId: formStaff,
          serviceId: formService,
          ratePercent: Number(ratePercent)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save commission rate.");
      }

      setSuccess("Commission rate updated successfully!");
      setTimeout(() => setSuccess(null), 5000);
      await fetchPayouts(); // refresh report
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving commission.");
    } finally {
      setSaving(false);
    }
  };

  const totalCalculatedStats = payouts.reduce(
    (acc, curr) => {
      acc.revenue += curr.totalRevenue;
      acc.earnings += curr.totalEarnings;
      acc.bookings += curr.totalBookings;
      return acc;
    },
    { revenue: 0, earnings: 0, bookings: 0 }
  );

  if (loading && staffList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 font-medium">Loading commissions configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header section with glassmorphism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-900/10 via-indigo-900/5 to-transparent rounded-3xl border border-emerald-500/10 shadow-sm backdrop-blur-sm">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
            Stylist Payouts & Commissions
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure slab commission rates and query detailed automatic payroll ledger payouts.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm animate-pulse">
          <Sparkles className="h-4 w-4" />
          <span>Real-time Ledger Connected</span>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl shadow-sm transition-all duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl shadow-sm transition-all duration-300">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Set Commission Rate Card */}
        <Card className="md:col-span-1 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-gray-100/80 rounded-3xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 bg-white/70 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-b from-gray-50/50 to-transparent border-b border-gray-100/80 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-800">
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Percent className="h-4 w-4" />
              </div>
              <span>Set Commission Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveCommission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Stylist</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    value={formStaff}
                    onChange={(e) => setFormStaff(e.target.value)}
                    className="w-full border border-gray-200/80 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-white text-gray-700 shadow-sm font-medium transition-all"
                    required
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Service</label>
                <div className="relative">
                  <Scissors className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <select
                    value={formService}
                    onChange={(e) => setFormService(e.target.value)}
                    className="w-full border border-gray-200/80 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-white text-gray-700 shadow-sm font-medium transition-all"
                    required
                  >
                    {servicesList.map((sv) => (
                      <option key={sv.id} value={sv.id}>{sv.name} (₹{sv.price})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Commission Slab (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ratePercent}
                  onChange={(e) => setRatePercent(Number(e.target.value))}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-700 font-bold shadow-sm transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold transition-all duration-300 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 disabled:bg-emerald-400 mt-2 text-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Slab Rate"}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Filter / Reports Calculation Card */}
        <Card className="md:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-gray-100/80 rounded-3xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 bg-white/70 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-b from-gray-50/50 to-transparent border-b border-gray-100/80 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-800">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calculator className="h-4 w-4" />
              </div>
              <span>Payroll Calculator Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter by Stylist</label>
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white text-gray-700 shadow-sm font-medium transition-all"
                >
                  <option value="">All Stylists</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none text-gray-600 shadow-sm transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none text-gray-600 shadow-sm transition-all"
                />
              </div>
            </div>

            <button
              onClick={fetchPayouts}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20"
            >
              <Search className="h-4 w-4" />
              Compute Payouts
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:translate-y-[-2px] transition-all duration-300">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Total Stylist Revenue</p>
              <p className="text-3xl font-black text-gray-900">₹{totalCalculatedStats.revenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <IndianRupee className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
            <TrendingUp className="h-3.5 w-3.5" /> Gross sales tracked
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:translate-y-[-2px] transition-all duration-300">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Total Payouts Due</p>
              <p className="text-3xl font-black text-emerald-600">₹{totalCalculatedStats.earnings.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
            <Sliders className="h-3.5 w-3.5" /> Commission payouts
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:translate-y-[-2px] transition-all duration-300">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-bl-full"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Fulfilled Bookings</p>
              <p className="text-3xl font-black text-gray-900">{totalCalculatedStats.bookings}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-600 font-bold">
            <User className="h-3.5 w-3.5" /> Client bookings completed
          </div>
        </div>
      </div>

      {/* Calculations Breakdown */}
      <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-gray-100 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-100/80 bg-gray-50/30">
          <CardTitle className="text-base font-bold text-gray-800">Stylist Payout Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payouts.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-16">
              No completed bookings found for the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((stylist) => (
                <div key={stylist.staffId} className="p-6 space-y-4">
                  <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-200/50">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> {stylist.staffName}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium tracking-wide">Stylist ID: {stylist.staffId}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Earnings Due</p>
                      <p className="text-2xl font-black text-emerald-600">₹{stylist.totalEarnings.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase font-black tracking-wider bg-gray-50/30">
                          <th className="px-4 py-3.5">Date</th>
                          <th className="px-4 py-3.5">Client</th>
                          <th className="px-4 py-3.5">Service Provided</th>
                          <th className="px-4 py-3.5">Price Settled</th>
                          <th className="px-4 py-3.5">Slab Rate</th>
                          <th className="px-4 py-3.5 text-right">Commission Earned</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {stylist.bookings.map((booking: any) => (
                          <tr key={booking.id} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-4 py-3.5 font-semibold text-gray-700">{new Date(booking.startTime).toLocaleDateString()}</td>
                            <td className="px-4 py-3.5 font-medium">{booking.customerName}</td>
                            <td className="px-4 py-3.5 font-bold text-gray-900">{booking.serviceName}</td>
                            <td className="px-4 py-3.5 font-semibold">₹{booking.amountPaid}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {booking.ratePercent}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-black text-emerald-600">₹{booking.commissionEarned}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
