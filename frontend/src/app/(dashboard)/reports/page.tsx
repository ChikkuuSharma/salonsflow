"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Clock, 
  Calendar, 
  Settings, 
  Eye, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  Smartphone,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BusinessReport {
  id: string;
  salonId: string;
  type: "DAILY" | "WEEKLY" | "MONTHLY";
  date: string;
  content: string;
  status: "PENDING" | "SENT" | "FAILED";
  retryCount: number;
  error: string | null;
  deliveredAt: string | null;
  recommendation: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"history" | "settings">("history");
  const [reports, setReports] = useState<BusinessReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewReport, setPreviewReport] = useState<BusinessReport | null>(null);
  
  // Settings Form State
  const [dailyTime, setDailyTime] = useState("20:00");
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [weeklyEnabled, setWeeklyEnabled] = useState(true);
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const fetchReports = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Error loading reports history:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/reports/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDailyTime(data.dailyReportTime);
        setDailyEnabled(data.dailyReportsEnabled);
        setWeeklyEnabled(data.weeklyReportsEnabled);
        setMonthlyEnabled(data.monthlyReportsEnabled);
      }
    } catch (err) {
      console.error("Error loading report settings:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchReports(), fetchSettings()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/reports/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dailyReportTime: dailyTime,
          dailyReportsEnabled: dailyEnabled,
          weeklyReportsEnabled: weeklyEnabled,
          monthlyReportsEnabled: monthlyEnabled
        })
      });

      if (res.ok) {
        setMessage({ text: "Preferences updated successfully!", type: "success" });
      } else {
        const errData = await res.json();
        setMessage({ text: errData.message || "Failed to update settings.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Connection error. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualTrigger = async (type: "DAILY" | "WEEKLY" | "MONTHLY") => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/reports/trigger/${type.toLowerCase()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: `Successfully compiled and dispatched ${type} Report!`, type: "success" });
        await fetchReports(); // reload list
      } else {
        const errData = await res.json();
        setMessage({ text: errData.message || `Failed to trigger ${type} Report.`, type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Connection error. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryDelivery = async (reportId: string) => {
    setMessage(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/reports/retry/${reportId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ text: "Retry request dispatched successfully!", type: "success" });
        await fetchReports(); // reload list
      } else {
        const errData = await res.json();
        setMessage({ text: errData.message || "Failed to retry delivery.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Connection error.", type: "error" });
    }
  };

  // Calculations for KPI headers
  const totalSent = reports.filter(r => r.status === "SENT").length;
  const totalFailed = reports.filter(r => r.status === "FAILED").length;
  const successRate = reports.length > 0 ? Math.round((totalSent / reports.length) * 100) : 100;
  const activeSchedulesCount = [dailyEnabled, weeklyEnabled, monthlyEnabled].filter(Boolean).length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 custom-scrollbar">
      {/* Upper Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight">
            Daily WhatsApp Reports
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track business performance summaries delivered directly to your WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-xs font-semibold text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          IST Schedule Monitor Active
        </div>
      </div>

      {/* Notifications Alert banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border text-sm flex items-start gap-3 shadow-sm transition-all duration-300 ${
          message.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Schedules</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{activeSchedulesCount} / 3</h3>
                <p className="text-xs text-slate-500 mt-1">Daily, Weekly, Monthly</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports Delivered</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{totalSent}</h3>
                <p className="text-xs text-slate-500 mt-1">To registered owner number</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                <Send className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Success Rate</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{successRate}%</h3>
                <p className="text-xs text-slate-500 mt-1">{totalFailed} delivery failures logged</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Scheduled Dispatch</p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{dailyTime}</h3>
                <p className="text-xs text-slate-500 mt-1">Every evening (IST timezone)</p>
              </div>
              <div className="p-3 bg-pink-50 rounded-xl text-pink-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Panel */}
      <div className="flex gap-2 border-b border-slate-200/60 pb-3 mb-6">
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "history"
              ? "bg-purple-950 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Report Log History
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === "settings"
              ? "bg-purple-950 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Settings className="h-4 w-4" />
          Settings & Sandbox
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <RotateCw className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          <p className="text-slate-500 text-sm mt-3 font-semibold">Compiling records...</p>
        </div>
      ) : activeTab === "history" ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-display font-black text-sm text-slate-800">Generated Reports Ledger</h3>
          </div>
          <div className="overflow-x-auto">
            {reports.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h4 className="font-bold text-slate-700">No Reports Logged Yet</h4>
                <p className="text-xs text-slate-400 mt-1">Scheduled or triggered reports will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Period Date</th>
                    <th className="py-4 px-6">Report Type</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Retry Log</th>
                    <th className="py-4 px-6">Last Updated</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {reports.map((report) => {
                    const localDate = new Date(report.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    });
                    const updatedTime = new Date(report.updatedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4.5 px-6 font-bold text-slate-900">{localDate}</td>
                        <td className="py-4.5 px-6">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            report.type === "DAILY" 
                              ? "bg-purple-50 text-purple-700 border border-purple-100" 
                              : report.type === "WEEKLY"
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-pink-50 text-pink-700 border border-pink-100"
                          }`}>
                            {report.type}
                          </span>
                        </td>
                        <td className="py-4.5 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            report.status === "SENT"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : report.status === "FAILED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {report.status === "SENT" && <CheckCircle2 className="h-3 w-3" />}
                            {report.status === "FAILED" && <XCircle className="h-3 w-3" />}
                            {report.status === "PENDING" && <AlertCircle className="h-3 w-3" />}
                            {report.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 font-semibold">
                          {report.status === "SENT" ? (
                            <span className="text-slate-400 text-[10px]">Delivered</span>
                          ) : (
                            <span className="text-rose-500 font-bold">
                              Retry {report.retryCount}/3 {report.error ? `(${report.error})` : ""}
                            </span>
                          )}
                        </td>
                        <td className="py-4.5 px-6 text-slate-400 font-medium">{updatedTime}</td>
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            <button
                              onClick={() => setPreviewReport(report)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Preview
                            </button>
                            {report.status !== "SENT" && report.retryCount < 3 && (
                              <button
                                onClick={() => handleRetryDelivery(report.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/50 rounded-xl font-bold transition-all"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                                Retry Send
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-100 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-sm font-display font-black text-slate-800">Dispatch Preferences</CardTitle>
                <p className="text-xs text-slate-400">Configure the automated triggers and timing for reports.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Daily Report Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Daily Business Summary</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Sends a summary of daily metrics every evening.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={dailyEnabled}
                        onChange={(e) => setDailyEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-950"></div>
                    </label>
                  </div>

                  {/* Daily Report Time Input */}
                  {dailyEnabled && (
                    <div className="p-4 border border-slate-100 rounded-2xl space-y-3">
                      <label className="block text-xs font-bold text-slate-700">Evening Dispatch Time (24h format)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={dailyTime}
                          onChange={(e) => setDailyTime(e.target.value)}
                          placeholder="e.g. 20:00"
                          className="max-w-[120px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-purple-600 transition-all text-center"
                        />
                        <span className="text-[10px] font-semibold text-slate-400">Indian Standard Time (IST)</span>
                      </div>
                    </div>
                  )}

                  {/* Weekly Report Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Weekly Health Report</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dispatched every Monday morning at 8:00 AM.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={weeklyEnabled}
                        onChange={(e) => setWeeklyEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-950"></div>
                    </label>
                  </div>

                  {/* Monthly Report Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Monthly Intelligence Report</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Dispatched on the 1st of every month at 8:00 AM.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={monthlyEnabled}
                        onChange={(e) => setMonthlyEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-950"></div>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-purple-950 hover:bg-purple-900 disabled:bg-purple-950/50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer text-center"
                  >
                    {submitting ? "Saving..." : "Save Preferences"}
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Quick Manual trigger panel */}
          <div className="space-y-6">
            <Card className="border-slate-100 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-sm font-display font-black text-slate-800">Manual Reports Sandbox</CardTitle>
                <p className="text-xs text-slate-400">Compile and send reports immediately to test integration.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-medium leading-normal">
                  📌 Warning: Running a manual trigger overrides any existing reports generated for today/this week.
                </div>
                
                <button
                  onClick={() => handleManualTrigger("DAILY")}
                  disabled={submitting}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 font-bold transition-all text-xs text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-purple-600" />
                    Compile Daily Summary
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleManualTrigger("WEEKLY")}
                  disabled={submitting}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 font-bold transition-all text-xs text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Compile Weekly Health
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  onClick={() => handleManualTrigger("MONTHLY")}
                  disabled={submitting}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 font-bold transition-all text-xs text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-pink-600" />
                    Compile Monthly Growth
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* WhatsApp Message Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            {/* Phone Top Header */}
            <div className="bg-[#075e54] text-white p-4.5 flex items-center gap-3.5">
              <div className="p-2.5 bg-white/10 rounded-full shrink-0 text-white">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black truncate leading-tight">SalonsFlow Reports</h4>
                <p className="text-[9px] text-white/80 font-semibold leading-none mt-1">Online</p>
              </div>
              <button
                onClick={() => setPreviewReport(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chat Body Bubble */}
            <div className="bg-[#ece5dd] p-4.5 max-h-[420px] overflow-y-auto custom-scrollbar">
              <div className="relative bg-[#dcf8c6] text-slate-800 p-4.5 rounded-2xl rounded-tr-none shadow-sm max-w-[90%] ml-auto text-xs font-semibold leading-relaxed whitespace-pre-wrap font-mono">
                {previewReport.content}
                <div className="absolute top-0 -right-2.5 w-0 h-0 border-[6px] border-transparent border-t-[#dcf8c6] border-l-[#dcf8c6]"></div>
                <div className="text-right text-[8px] text-slate-500 font-bold mt-2">
                  {new Date(previewReport.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50/80 px-6 py-4.5 border-t border-slate-100 text-center">
              <button
                onClick={() => setPreviewReport(null)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

