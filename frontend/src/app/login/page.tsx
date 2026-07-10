"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  User,
  Sparkles,
  ChevronRight,
  Key,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  Lock
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"admin" | "owner" | "demo">("demo");
  const [formMode, setFormMode] = useState<"login" | "register" | "change-password">("login");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const role = params.get("role");
      const mode = params.get("mode");
      if (role === "owner" || role === "admin" || role === "demo") {
        setSelectedRole(role as any);
      }
      if (mode === "login" || mode === "register" || mode === "change-password") {
        setFormMode(mode as any);
      }
    }
  }, []);
  
  // Admin credentials state
  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");

  // Owner credentials state
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerNewPassword, setOwnerNewPassword] = useState("");
  const [ownerSalonName, setOwnerSalonName] = useState("");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");

  // Shared UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const handleRoleChange = (role: "admin" | "owner" | "demo") => {
    setSelectedRole(role);
    setFormMode("login");
    setError(null);
    setSuccessMessage(null);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId || !adminPassword) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let endpoint = "/api/v1/auth/super-admin/login";
      let body: any = { adminId, password: adminPassword };

      if (formMode === "register") {
        endpoint = "/api/v1/auth/super-admin/register";
      } else if (formMode === "change-password") {
        endpoint = "/api/v1/auth/super-admin/change-password";
        body = { adminId, oldPassword: adminPassword, newPassword: adminNewPassword };
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        if (formMode === "register") {
          setSuccessMessage("Super Admin credentials created successfully! You can now log in.");
          setFormMode("login");
          setAdminPassword("");
        } else if (formMode === "change-password") {
          setSuccessMessage("Super Admin password updated successfully! You can now log in.");
          setFormMode("login");
          setAdminPassword("");
          setAdminNewPassword("");
        } else {
          const data = await response.json();
          localStorage.setItem("auth_token", data.token);
          window.location.href = "/admin/dashboard";
        }
      } else {
        const errData = await response.json();
        setError(errData.message || "Operation failed. Please verify credentials.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let endpoint = "/api/v1/auth/owner/login";
      let body: any = {};

      if (formMode === "login") {
        if (!ownerEmail || !ownerPassword) {
          setError("Email and Password are required.");
          setLoading(false);
          return;
        }
        body = { email: ownerEmail, password: ownerPassword };
      } else if (formMode === "register") {
        if (!ownerName || !ownerEmail || !ownerPassword || !ownerSalonName || !ownerWhatsapp) {
          setError("All fields are required for registration.");
          setLoading(false);
          return;
        }
        endpoint = "/api/v1/auth/owner/register";
        body = {
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword,
          salonName: ownerSalonName,
          whatsappNumber: ownerWhatsapp
        };
      } else if (formMode === "change-password") {
        if (!ownerEmail || !ownerPassword || !ownerNewPassword) {
          setError("All fields are required to change password.");
          setLoading(false);
          return;
        }
        endpoint = "/api/v1/auth/owner/change-password";
        body = { email: ownerEmail, oldPassword: ownerPassword, newPassword: ownerNewPassword };
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        if (formMode === "register") {
          setSuccessMessage("Owner account registered successfully! You can now log in.");
          setFormMode("login");
          setOwnerPassword("");
        } else if (formMode === "change-password") {
          setSuccessMessage("Owner password updated successfully! You can now log in.");
          setFormMode("login");
          setOwnerPassword("");
          setOwnerNewPassword("");
        } else {
          const data = await response.json();
          localStorage.setItem("auth_token", data.token);
          window.location.href = "/dashboard";
        }
      } else {
        const errData = await response.json();
        setError(errData.message || "Authentication action failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/demo/login`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("auth_token", data.token);
        window.location.href = "/dashboard";
      } else {
        setError("Failed to launch sandbox demo session.");
      }
    } catch (err) {
      console.error(err);
      setError("Connection error. Is the backend server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative font-sans overflow-y-auto text-slate-800 selection:bg-purple-500 selection:text-white">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>

      {/* Ambient lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-md w-full bg-white border border-slate-200/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-xl z-10 p-8 flex flex-col space-y-6 my-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-2.5 mb-2">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-10 w-10 rounded-xl object-contain bg-white border border-purple-100 p-0.5 shadow-md" />
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-2xl tracking-tight text-slate-800 leading-none">
                Salons<span className="text-purple-600">Flow</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-1">
                Grow While You Style
              </span>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight pt-2">Unified Access Gateway</h2>
          <p className="text-xs text-slate-500 leading-normal font-semibold">Select your account type to enter the SalonsFlow platform console.</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: "demo", label: "Demo User", icon: Sparkles },
            { id: "owner", label: "Salon Owner", icon: User },
            { id: "admin", label: "Super Admin", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedRole === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleRoleChange(tab.id as any)}
                className={`py-2 px-1 text-[10px] font-bold uppercase tracking-wider rounded-lg flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? "bg-purple-600 text-white shadow-md shadow-purple-950/20 border border-purple-500/20"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-250 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Dynamic Form Content */}
        <div className="min-h-[220px] flex flex-col justify-center">
          {selectedRole === "demo" && (
            <div className="space-y-5 text-center">
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl space-y-2">
                <span className="text-[10px] text-purple-600 font-extrabold uppercase tracking-widest block">Sandbox Credentials</span>
                <p className="text-xs text-slate-800 font-bold">Pre-configured Demo Environment</p>
                <div className="flex justify-center gap-4 text-xs font-mono pt-1">
                  <div className="bg-white border border-purple-200/60 px-3 py-1 rounded-lg shadow-sm">
                    <span className="text-[9px] text-purple-600 block font-sans font-bold">Role</span>
                    <span className="text-slate-800 font-bold text-xs">DEMO CLIENT</span>
                  </div>
                  <div className="bg-white border border-purple-200/60 px-3 py-1 rounded-lg shadow-sm">
                    <span className="text-[9px] text-purple-600 block font-sans font-bold">Scope</span>
                    <span className="text-slate-800 font-bold text-xs">SANDBOX SALON</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Explore fully populated CRM, dashboard analytics, WhatsApp message simulator, reviews ledger, and rebooking campaign pipelines with zero sign-up required.
              </p>

              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer active:scale-98 border-0"
              >
                {loading ? (
                  <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    Start Free Demo Session
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {selectedRole === "admin" && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {formMode === "register" ? "Choose Admin ID" : "Admin ID"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder={formMode === "register" ? "Choose a unique username" : "Enter Super Admin Username"}
                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {formMode === "change-password" ? "Old Secret Password" : "Secret Password"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {formMode === "change-password" && (
                <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    New Secret Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer active:scale-98 border-0"
                >
                  {loading ? (
                    <span className="h-4.5 w-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      {formMode === "register"
                        ? "Create Admin Credentials"
                        : formMode === "change-password"
                        ? "Update Password"
                        : "Verify Admin Credentials"}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center gap-2 pt-2 text-[10px]">
                {formMode === "login" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode("register");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                    >
                      Create New Admin Credentials
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode("change-password");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                    >
                      Change Admin Password
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("login");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                  >
                    Back to Admin Login
                  </button>
                )}
              </div>
            </form>
          )}

          {selectedRole === "owner" && (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              {formMode === "register" && (
                <div className="space-y-1.5 animate-in slide-in-from-top duration-250">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Devender Sharma"
                      className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@salonsflow.com"
                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {formMode === "register" && (
                <>
                  <div className="space-y-1.5 animate-in slide-in-from-top duration-250">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Salon Brand Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={ownerSalonName}
                        onChange={(e) => setOwnerSalonName(e.target.value)}
                        placeholder="Elegance Barber & Spa"
                        className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 animate-in slide-in-from-top duration-250">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      WhatsApp Operations Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={ownerWhatsapp}
                        onChange={(e) => setOwnerWhatsapp(e.target.value)}
                        placeholder="+919999999999"
                        className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {formMode === "change-password" ? "Old Password" : "Password"}
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {formMode === "change-password" && (
                <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={ownerNewPassword}
                      onChange={(e) => setOwnerNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 bg-white border border-slate-200 rounded-2xl pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 transition-all font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer active:scale-98 border-0"
                >
                  {loading ? (
                    <span className="h-4.5 w-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      {formMode === "register"
                        ? "Register Owner Account"
                        : formMode === "change-password"
                        ? "Update Password"
                        : "Verify Credentials"}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col items-center gap-2 pt-2 text-[10px]">
                {formMode === "login" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode("register");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                    >
                      Create Owner Account (Register)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormMode("change-password");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                    >
                      Change Owner Password
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("login");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-bold uppercase tracking-wider underline bg-transparent border-0"
                  >
                    Back to Owner Login
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
