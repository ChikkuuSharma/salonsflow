"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { ShieldCheck, User, Users, ChevronRight, Activity, Sparkles } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [showClerk, setShowClerk] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleRoleBypass = async (roleToken: string, roleName: string) => {
    setLoadingRole(roleName);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", roleToken);
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/v1/salons/me`, {
        headers: { Authorization: `Bearer ${roleToken}` }
      });
      
      if (response.ok) {
        const salon = await response.json();
        if (salon.isProfileComplete || roleToken.startsWith("dev-bypass-token")) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Bypass login failed:", err);
      router.push("/dashboard");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative font-sans overflow-hidden text-slate-800 selection:bg-purple-500 selection:text-white">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>

      {/* Ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200 shadow-xl rounded-3xl overflow-hidden z-10 p-8 flex flex-col space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2.5 mb-2">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-10 w-10 rounded-xl object-contain bg-white border border-purple-100 p-0.5 shadow-md" />
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-2xl tracking-tight text-slate-800 leading-none">
                Salons<span className="text-purple-600 font-black">Flow</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-1">
                Grow While You Style
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 font-extrabold uppercase px-3 py-1 rounded-full tracking-widest inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Sandbox Environment
          </span>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight pt-2">Enter Platform Console</h2>
          <p className="text-xs text-slate-500 leading-normal font-semibold">Select a role to bypass live SMS credentials during dev pilot testing.</p>
        </div>

        {/* Developer Bypass Cards */}
        {!showClerk ? (
          <div className="space-y-3.5">
            {[
              {
                role: "Super Admin",
                desc: "Full database schema control, global configurations, and lead lists.",
                token: "dev-bypass-token-superadmin",
                icon: ShieldCheck,
                color: "from-purple-50/80 to-purple-100/50 border-purple-200/80 hover:border-purple-300 text-purple-700"
              },
              {
                role: "Salon Owner",
                desc: "Manage services catalog, pricing tiers, commission ledger slabs, and payouts.",
                token: "dev-bypass-token-owner",
                icon: User,
                color: "from-pink-50/80 to-pink-100/50 border-pink-200/80 hover:border-pink-300 text-pink-700"
              },
              {
                role: "Salon Manager",
                desc: "Edit stylist schedules, review customer feedback scores, and approve rebooking lists.",
                token: "dev-bypass-token-manager",
                icon: Users,
                color: "from-indigo-50/80 to-indigo-100/50 border-indigo-200/80 hover:border-indigo-300 text-indigo-700"
              },
              {
                role: "Receptionist",
                desc: "Book offline walk-in slots, toggle stylist breaks, and record invoices in POS.",
                token: "dev-bypass-token-receptionist",
                icon: Activity,
                color: "from-teal-50/80 to-teal-100/50 border-teal-200/80 hover:border-teal-300 text-teal-700"
              }
            ].map((r, i) => {
              const IconComp = r.icon;
              const isLoading = loadingRole === r.role;
              return (
                <button
                  key={i}
                  disabled={loadingRole !== null}
                  onClick={() => handleRoleBypass(r.token, r.role)}
                  className={`w-full text-left p-4 bg-gradient-to-r ${r.color} border rounded-2xl flex items-center justify-between transition-all duration-200 cursor-pointer hover:translate-x-1 active:scale-98 disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl shrink-0">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">{r.role}</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold pr-3">{r.desc}</p>
                    </div>
                  </div>
                  {isLoading ? (
                    <span className="h-4 w-4 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin shrink-0"></span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-405 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase tracking-widest font-black">Or Use Live Login</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              onClick={() => setShowClerk(true)}
              className="w-full h-11 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
            >
              Sign In with Clerk
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 items-center">
              <SignIn 
                routing="hash"
                appearance={{
                  variables: {
                    colorPrimary: "#9333ea", // purple-600
                    colorBackground: "#ffffff",
                    colorText: "#1e293b", // slate-800
                    colorInputBackground: "#ffffff",
                    colorInputText: "#1e293b",
                    colorBorder: "#cbd5e1", // slate-300
                  },
                  elements: {
                    card: "bg-white border border-slate-200 shadow-xl rounded-3xl",
                    headerTitle: "text-slate-800 font-bold",
                    headerSubtitle: "text-slate-500",
                    socialButtonsIconButton: "border-slate-200 hover:bg-slate-50 text-slate-700",
                    formFieldLabel: "text-slate-500 font-bold uppercase text-[10px]",
                    formButtonPrimary: "bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl h-11 border-0",
                    footerActionText: "text-slate-500",
                    footerActionLink: "text-purple-600 hover:text-purple-500 font-bold",
                  }
                }}
              />
            
            <button
              onClick={() => setShowClerk(false)}
              className="text-xs text-slate-505 text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider font-bold bg-transparent border-0 cursor-pointer"
            >
              ← Back to Developer Bypass
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
