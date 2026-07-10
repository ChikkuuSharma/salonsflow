"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";

export default function DemoPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const logTimeline = [
      "Allocating multi-tenant database sandbox container...",
      "Resolving Demo Salon boundary parameters (+919999999999)...",
      "Clearing legacy trial logs and cash register logs...",
      "Seeding realistic customer profiles and staff qualifications...",
      "Creating 30-day historical completed appointments & commissions...",
      "Populating active schedule calendars and review feedback scores...",
      "Provisioning Pro Autopilot AI Receptionist config context...",
      "Acquiring sandbox bypass security token...",
      "Entering Interactive Platform Workspace..."
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < logTimeline.length) {
        if (active) {
          setLogs((prev) => [...prev, logTimeline[currentIdx]]);
          setProgress((prev) => Math.min(prev + 11, 95));
        }
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    const runSeedAndLogin = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/api/v1/auth/demo/login`, {
          method: "POST"
        });
        
        if (!response.ok) throw new Error("Demo seeding failed on backend.");
        
        const data = await response.json();
        
        // Let progress hit 100%
        if (active) {
          setProgress(100);
          setTimeout(() => {
            localStorage.setItem("auth_token", data.token);
            window.location.href = "/dashboard";
          }, 400);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError("Failed to initialize demo salon database sandbox. Make sure the backend server is running.");
          clearInterval(interval);
        }
      }
    };

    runSeedAndLogin();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative font-sans overflow-hidden text-slate-800 selection:bg-purple-500 selection:text-white">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>

      {/* Ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl z-10 p-8 flex flex-col items-center space-y-6">
        <div className="flex flex-col items-center space-y-2.5 text-center">
          <div className="h-12 w-12 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Initializing Demo Environment</h2>
          <p className="text-[10px] text-purple-600 uppercase tracking-widest font-black">Sandbox Provisioning</p>
        </div>

        {error ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-red-500 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              Retry Provisioning
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 border border-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Simulation logs */}
            <div className="h-[140px] bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[9px] text-slate-650 leading-relaxed overflow-y-auto space-y-1 scrollbar-none select-none">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-1.5 animate-in fade-in duration-200">
                  <span className="text-purple-600 font-extrabold select-none">✓</span>
                  <span>{log}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-0.5">
                <RefreshCw className="h-3 w-3 animate-spin text-purple-500 shrink-0" />
                <span className="text-purple-500 animate-pulse font-semibold">Running database pipeline migrations...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
