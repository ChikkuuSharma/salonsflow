"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, ArrowLeft, ShieldCheck, HelpCircle, Sparkles, Award } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "annual">("annual");

  const plans = [
    {
      name: "Basic Plan",
      description: "Core AI WhatsApp Receptionist, POS Checkout register, and Client Directory.",
      monthlyPrice: 2999,
      quarterlyPrice: 2699,
      annualPrice: 2399,
      features: [
        "Core AI WhatsApp Receptionist (Hinglish/Hindi)",
        "Offline POS Digital Billing Terminal",
        "GST-Ready Invoice Designer",
        "Inbound Missed Call Welcome Alerts",
        "Basic Calendar & Booking Schedule",
        "Employee Shift Roster Setup",
        "Staff Commissions Ledger",
        "100 Printed/Digital Invoices per month",
      ],
      notIncluded: [
        "AI Rebooking Recommendation Campaigns",
        "Auto Google Maps Reviews Collection",
        "Whisper Audio Voice Note Transcription & Booking",
        "Franchise Chain Sync & Advanced Analytics",
      ],
      cta: "Get Started Now",
      popular: false,
    },
    {
      name: "Pro Autopilot",
      description: "Complete AI receptionist autopilot, rebooking campaigns, and review engines.",
      monthlyPrice: 4999,
      quarterlyPrice: 4499,
      annualPrice: 3999,
      features: [
        "Everything in Basic plan",
        "AI Rebooking Recommendation Lifecycles",
        "Auto Google Review Campaigns",
        "Whisper Audio Voice Note Booking",
        "Stylist Payroll & Franchise Chain Sync",
        "WhatsApp Promotional Broadcasts",
        "UPI & Card Terminal Link Integration",
        "Unlimited Digital Invoices & Customers",
      ],
      notIncluded: [],
      cta: "Go Autopilot",
      popular: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      
      {/* Premium background engineering grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>

      {/* Ambient glowing layers */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>

      {/* Sticky Premium Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-purple-650 transition-colors" />
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-9 w-9 rounded-xl object-contain shadow-md bg-white border border-purple-100 p-0.5" />
            <span className="font-bold text-xl tracking-tight text-slate-800 font-display">
              Salons<span className="text-purple-650 font-black">Flow</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 font-bold">
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider">
              Back to Home
            </Link>
            <Link
              href="/login"
              className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-xs font-bold"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-20 relative z-10 space-y-24">
        
        {/* Page Title & Toggle */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-4.5 py-1.5 text-xs font-bold text-purple-700 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-purple-650" /> Subscription Plans
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black text-slate-800 tracking-tight leading-[1.05] font-display">
            Transparent Pricing. <br />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
              Flat Rates. 0% Commission.
            </span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto font-semibold leading-relaxed">
            Stop paying 10% to 15% booking commissions to aggregators. SalonsFlow gives you flat-rate pricing to scale bookings without paying extra on growth.
          </p>

          {/* Billing switcher switch */}
          <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("quarterly")}
              className={`px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1 cursor-pointer ${
                billingCycle === "quarterly"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              3 Months
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tight ${
                billingCycle === "quarterly" ? "bg-white text-purple-700" : "bg-purple-50 text-purple-700"
              }`}>Save 10%</span>
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "annual"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-950"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Annual
              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-tight ${
                billingCycle === "annual" ? "bg-white text-purple-700" : "bg-purple-50 text-purple-700"
              }`}>Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            return (
              <div
                key={i}
                className={`bg-white border rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] ${
                  plan.popular
                    ? "border-purple-500 ring-2 ring-purple-500/10 shadow-lg shadow-purple-950/10"
                    : "border-slate-200 hover:border-slate-350 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <span className="absolute top-4 right-4 bg-purple-50 border border-purple-250 text-purple-650 text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                
                <div className="space-y-6">
                  <div className="space-y-2 text-left">
                    <h3 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wide">{plan.name}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed min-h-[36px] font-semibold">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-2 py-5 border-y border-slate-150 text-left">
                    <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent font-display">
                      ₹{price}
                    </span>
                    <span className="text-slate-400 text-xs font-bold">/ month</span>
                    {billingCycle === "annual" && (
                      <span className="text-[10px] text-purple-600 font-bold block ml-3 uppercase tracking-wider">billed annually</span>
                    )}
                    {billingCycle === "quarterly" && (
                      <span className="text-[10px] text-purple-600 font-bold block ml-3 uppercase tracking-wider">billed quarterly</span>
                    )}
                    {billingCycle === "monthly" && (
                      <span className="text-[10px] text-slate-400 font-bold block ml-3 uppercase tracking-wider">billed monthly</span>
                    )}
                  </div>

                  {/* Feature lists */}
                  <div className="space-y-4 text-left">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Features Included:</span>
                    <ul className="space-y-3.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-700">
                          <Check className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {plan.notIncluded.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-[11px] text-slate-400">
                          <X className="h-4 w-4 text-slate-300 flex-shrink-0 mt-0.5" />
                          <span className="line-through">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className={`w-full h-12 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-sm hover:shadow-md ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-md shadow-purple-950/20"
                        : "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Matrix Breakdown */}
        <div className="pt-12 border-t border-slate-200 max-w-5xl mx-auto space-y-8">
          <h2 className="text-2xl font-black text-center font-display text-slate-800">Detailed Feature matrix</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-5">Platform Capabilities</th>
                  <th className="p-5 text-center font-medium">Basic Plan</th>
                  <th className="p-5 text-center text-purple-650 bg-purple-50/10 border-x border-slate-200">Pro Autopilot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-650 font-medium">
                {[
                  { name: "3 Months (Quarterly) Billing Cycle Option", b: true, p: true },
                  { name: "24/7 AI WhatsApp Receptionist (Hinglish NLP)", b: true, p: true },
                  { name: "Inbound Missed Call automated welcomes", b: true, p: true },
                  { name: "Offline POS Digital Billing terminals", b: true, p: true },
                  { name: "Stylist shift roster payroll ledger", b: true, p: true },
                  { name: "GSTIN tax compliant invoicing ledger", b: true, p: true },
                  { name: "UPI & Card Payment terminal link", b: false, p: true },
                  { name: "Google Reviews maps auto campaigns", b: false, p: true },
                  { name: "AI Rebooking Recommendation Lifecycles", b: false, p: true },
                  { name: "Whisper Audio Voice Note Transcriptions", b: false, p: true },
                  { name: "WhatsApp Promotional broadcasts", b: false, p: true },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 font-semibold text-slate-700">{row.name}</td>
                    <td className="p-5 text-center">
                      {row.b ? <Check className="h-4.5 w-4.5 text-purple-600 mx-auto" /> : <X className="h-4.5 w-4.5 text-slate-200 mx-auto" />}
                    </td>
                    <td className="p-5 text-center text-purple-650 bg-purple-50/5 border-x border-purple-200">
                      {row.p ? <Check className="h-5 w-5 text-pink-500 mx-auto stroke-[2.5]" /> : <X className="h-4.5 w-4.5 text-slate-200 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-2xl font-black text-center font-display text-slate-800">Pricing FAQs</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                q: "Is there any setup fee for the WhatsApp Business API?",
                a: "No setup fees. We help you setup your official WABA line on your Meta profile for free. You only pay standard Meta message volume charges.",
              },
              {
                q: "Do I need a GST registration to bill with POS?",
                a: "No. GST settings are fully optional. If unregistered, you can legally configure flat tax invoicing templates under PAN formats.",
              },
              {
                q: "What booking commission do you charge?",
                a: "0%. We don't take a cut of your clients or reservations. You pay a flat subscription fee and keep 100% of your business revenues.",
              },
              {
                q: "What billing frequencies are supported?",
                a: "We support Monthly billing, 3-Month (Quarterly) billing at 10% savings, and Annual billing at 20% savings. Switch or scale cycles anytime.",
              },
              {
                q: "Can I cancel or downgrade my plan?",
                a: "Yes. You can switch plans or cancel your active subscription anytime directly from the Account settings panel with no penalty.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-2xl space-y-2.5 shadow-sm text-left">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                  <ShieldCheck className="h-4.5 w-4.5 text-purple-600 flex-shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-slate-450 text-xs">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-8 w-8 rounded-lg object-contain shadow-sm bg-white border border-purple-100 p-0.5" />
            <span className="font-extrabold text-sm tracking-tight text-slate-700 font-display">
              Salons<span className="text-purple-650">Flow</span>
            </span>
          </div>
          <p>© 2026 SalonsFlow Platform Operating System. Built for Indian Salons.</p>
          <div className="flex items-center gap-4 font-bold text-slate-500">
            <Link href="/" className="hover:text-slate-800 transition-colors">Home</Link>
            <Link href="/pricing" className="text-purple-600">Pricing</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
