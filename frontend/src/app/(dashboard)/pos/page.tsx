"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  IndianRupee,
  ShoppingBag,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Coins,
  Printer,
  X,
  CreditCard,
  QrCode,
  Tag,
  BookOpen
} from "lucide-react";

export default function POSPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // DB data states
  const [appointments, setAppointments] = useState<any[]>([]);
  const [drawerSummary, setDrawerSummary] = useState<any>({
    openingBalance: 0,
    totalSales: 0,
    totalPayouts: 0,
    currentBalance: 0,
    logCount: 0
  });

  // Modal control states
  const [activeCheckoutAppt, setActiveCheckoutAppt] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "STRIPE">("CASH");
  const [notes, setNotes] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Print state
  const [printReceiptData, setPrintReceiptData] = useState<any | null>(null);

  // Drawer action states
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [drawerActionType, setDrawerActionType] = useState<"OPEN" | "PAYOUT">("OPEN");
  const [drawerAmount, setDrawerAmount] = useState<number>(2000);
  const [drawerNotes, setDrawerNotes] = useState("");

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Load appointments and summary
  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptRes, summaryRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/pos/drawer-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!apptRes.ok || !summaryRes.ok) {
        throw new Error("Failed to load appointments or POS summary");
      }

      setAppointments(await apptRes.json());
      setDrawerSummary(await summaryRes.json());
    } catch (err: any) {
      console.error(err);
      setError("Error loading POS data. Please make sure the backend is live.");
    } finally {
      setLoading(false);
    }
  };

  const openCheckout = (appt: any) => {
    setActiveCheckoutAppt(appt);
    setAmountPaid(appt.service.price);
    setPaymentMode("CASH");
    setNotes("");
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckoutAppt) return;
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      // Log checkout and settlement in the backend database
      const checkoutRes = await fetch(`${apiUrl}/api/v1/pos/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          appointmentId: activeCheckoutAppt.id,
          amountPaid: Number(amountPaid),
          paymentMode,
          notes: notes
        })
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json();
        throw new Error(errData.message || "Failed to record checkout settlement.");
      }

      // Prepare data for the thermal receipt printout
      setPrintReceiptData({
        id: activeCheckoutAppt.id,
        date: new Date(activeCheckoutAppt.startTime).toLocaleString(),
        customer: activeCheckoutAppt.customer.name,
        service: activeCheckoutAppt.service.name,
        price: activeCheckoutAppt.service.price,
        amountPaid: Number(amountPaid),
        paymentMode,
        staffName: activeCheckoutAppt.staff?.name || "Unassigned"
      });

      setSuccess("Checkout completed successfully!");
      setActiveCheckoutAppt(null);
      await loadData(); // Reload summary and lists
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error finalizing checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrawerAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/pos/invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(drawerAmount),
          actionType: drawerActionType,
          notes: drawerNotes
        })
      });

      if (!res.ok) throw new Error("Failed to log drawer action.");

      setSuccess(`Drawer registry ${drawerActionType} recorded successfully.`);
      setShowDrawerModal(false);
      setDrawerNotes("");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error logging drawer action.");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerReceiptPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 relative">
      {/* Printable Area - Hidden on screen, shown during window.print() */}
      {printReceiptData && (
        <div className="hidden print:block print:p-6 bg-white text-black font-mono text-sm max-w-[80mm] mx-auto border border-dashed border-gray-400">
          <div className="text-center space-y-1 mb-4">
            <h2 className="text-lg font-bold">ELEGANCE SALON & SPA</h2>
            <p className="text-xs">123 MG Road, Bengaluru, Karnataka</p>
            <p className="text-xs">Tel: +91 9876543210</p>
          </div>
          <hr className="border-dashed border-gray-400 my-2" />
          <div className="space-y-1 text-xs">
            <p><strong>Receipt ID:</strong> {printReceiptData.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> {printReceiptData.date}</p>
            <p><strong>Customer:</strong> {printReceiptData.customer}</p>
            <p><strong>Stylist:</strong> {printReceiptData.staffName}</p>
          </div>
          <hr className="border-dashed border-gray-400 my-2" />
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-1">Description</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">{printReceiptData.service}</td>
                <td className="py-1 text-right">₹{printReceiptData.price}</td>
              </tr>
              <tr className="font-bold border-t border-gray-300 pt-1">
                <td className="py-1">Grand Total</td>
                <td className="py-1 text-right">₹{printReceiptData.price}</td>
              </tr>
              <tr>
                <td className="py-1">Paid Amount</td>
                <td className="py-1 text-right font-bold">₹{printReceiptData.amountPaid}</td>
              </tr>
              <tr>
                <td className="py-1">Payment Mode</td>
                <td className="py-1 text-right capitalize">{printReceiptData.paymentMode}</td>
              </tr>
            </tbody>
          </table>
          <hr className="border-dashed border-gray-400 my-3" />
          <div className="text-center text-xs space-y-1">
            <p>GST IN: 29AAAAA1111A1Z1</p>
            <p className="font-bold mt-2">Thank you for visiting Elegance!</p>
            <p>Powered by SalonsFlow AI</p>
          </div>
        </div>
      )}

      {/* Main POS Screen - Hidden during printing */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-900/10 via-indigo-900/5 to-transparent rounded-3xl border border-emerald-500/10 shadow-sm backdrop-blur-sm">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
              Point of Sale (POS) Checkout
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage cash registers, log client checkouts, and print paper invoices.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setDrawerActionType("OPEN");
                setDrawerAmount(2000);
                setShowDrawerModal(true);
              }}
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4 text-emerald-600" /> Open Float
            </button>
            <button
              onClick={() => {
                setDrawerActionType("PAYOUT");
                setDrawerAmount(500);
                setShowDrawerModal(true);
              }}
              className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-rose-100/50 transition-colors cursor-pointer shadow-sm"
            >
              <Coins className="h-4 w-4" /> Cash Payout
            </button>
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

        {/* Daily Cash Reconciliation Summary */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Starting Float</p>
            <p className="text-3xl font-black text-gray-900 mt-1">₹{drawerSummary.openingBalance}</p>
          </div>
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Cash Sales</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">+₹{drawerSummary.totalSales}</p>
          </div>
          <div className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
            <p className="text-xs text-gray-400 uppercase font-extrabold tracking-wider">Cash Payouts</p>
            <p className="text-3xl font-black text-rose-600 mt-1">-₹{drawerSummary.totalPayouts}</p>
          </div>
          <div className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-teal-500/5 rounded-3xl border border-emerald-500/10 shadow-sm p-6 hover:shadow-md transition-all duration-300">
            <p className="text-xs text-emerald-800/60 uppercase font-extrabold tracking-wider">Drawer Balance</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">₹{drawerSummary.currentBalance}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Active Bookings list to Checkout */}
          <Card className="md:col-span-2 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-gray-100 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="border-b border-gray-100 bg-gray-50/20">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span>Appointments Pending Settlement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[500px] overflow-y-auto divide-y divide-gray-50">
              {appointments.filter(a => a.status === "PENDING" || a.status === "CONFIRMED").length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-16">
                  No active bookings pending checkout for today.
                </div>
              ) : (
                appointments
                  .filter(a => a.status === "PENDING" || a.status === "CONFIRMED")
                  .map((appt) => (
                    <div key={appt.id} className="p-5 flex items-center justify-between hover:bg-gray-50/30 transition-all duration-200">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-gray-900 text-base">{appt.customer.name}</span>
                          <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded-lg text-gray-500">{appt.customer.phone}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-semibold">
                          <span className="flex items-center gap-1"><Scissors className="h-3.5 w-3.5 text-gray-400" /> {appt.service.name}</span>
                          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-gray-400" /> {appt.staff?.name || "Unassigned"}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" /> {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-gray-900 text-xl">₹{appt.service.price}</span>
                        <button
                          onClick={() => openCheckout(appt)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2 text-xs font-bold cursor-pointer transition-all duration-300 shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20"
                        >
                          Checkout
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          {/* Last Printed Receipt Preview Panel */}
          <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.02)] border-dashed border-emerald-200 rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50/10 border-b border-dashed border-emerald-100">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-800">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Receipt className="h-4 w-4" />
                </div>
                <span>Receipt Buffer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {printReceiptData ? (
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 border border-gray-200/50 rounded-2xl font-mono text-xs space-y-2.5">
                    <p className="text-center font-bold text-gray-800 uppercase tracking-wider">Receipt Preview</p>
                    <hr className="border-dashed" />
                    <p><strong>Customer:</strong> {printReceiptData.customer}</p>
                    <p><strong>Service:</strong> {printReceiptData.service}</p>
                    <p><strong>Amount:</strong> ₹{printReceiptData.amountPaid}</p>
                    <p><strong>Mode:</strong> <span className="capitalize">{printReceiptData.paymentMode}</span></p>
                  </div>
                  <button
                    onClick={triggerReceiptPrint}
                    className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold transition-all duration-300 cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 text-sm"
                  >
                    <Printer className="h-4 w-4" /> Print Thermal Receipt (80mm)
                  </button>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-16">
                  No active receipt in print buffer. Settle a checkout.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Drawer Overlay Modal */}
      {activeCheckoutAppt && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5" /> Settle Invoice Checkout
              </h3>
              <button onClick={() => setActiveCheckoutAppt(null)} className="text-white hover:text-gray-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200/50 space-y-2 text-sm text-gray-600">
                <p className="flex justify-between"><strong>Customer:</strong> <span>{activeCheckoutAppt.customer.name}</span></p>
                <p className="flex justify-between"><strong>Service:</strong> <span>{activeCheckoutAppt.service.name}</span></p>
                <p className="flex justify-between"><strong>Stylist:</strong> <span>{activeCheckoutAppt.staff?.name || "Unassigned"}</span></p>
                <div className="border-t border-gray-200/50 my-2 pt-2 flex justify-between items-baseline">
                  <span className="font-extrabold text-gray-800">Due Amount:</span>
                  <span className="text-xl font-black text-gray-900">₹{activeCheckoutAppt.service.price}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CASH", label: "Cash", icon: Coins },
                    { id: "UPI", label: "UPI QR", icon: QrCode },
                    { id: "STRIPE", label: "Card", icon: CreditCard }
                  ].map((mode) => {
                    const ModeIcon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMode(mode.id as any)}
                        className={`border rounded-xl px-3 py-3 text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          paymentMode === mode.id
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                            : "border-gray-200/80 hover:bg-gray-50 text-gray-500"
                        }`}
                      >
                        <ModeIcon className="h-4 w-4" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Handled (₹)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transaction Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Split payment, cash drawer float adjust"
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold transition-all duration-300 cursor-pointer disabled:bg-emerald-400 text-sm shadow-md flex-shrink-0"
              >
                {submitting ? "Finalizing..." : "Settle & Print Receipt"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer Action Modal Overlay */}
      {showDrawerModal && (
        <div className="print:hidden fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Coins className="h-5 w-5" /> Log Drawer Cash Adjustment
              </h3>
              <button onClick={() => setShowDrawerModal(false)} className="text-white hover:text-gray-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDrawerAction} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "OPEN", label: "Set Opening Float" },
                    { id: "PAYOUT", label: "Cash Payout / Expenses" }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDrawerActionType(mode.id as any)}
                      className={`border rounded-xl px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer text-center ${
                        drawerActionType === mode.id
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                          : "border-gray-200/80 hover:bg-gray-50 text-gray-500"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount (₹)</label>
                <input
                  type="number"
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(Number(e.target.value))}
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-700 font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Log Notes</label>
                <textarea
                  rows={2}
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="e.g. Set ₹2000 starting cash float, drew ₹500 for tea/salon supplies"
                  className="w-full border border-gray-200/80 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold transition-all duration-300 cursor-pointer disabled:bg-emerald-400 text-sm shadow-md flex-shrink-0"
              >
                {submitting ? "Logging..." : "Commit Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
