"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, 
  Link as LinkIcon, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  QrCode,
  BarChart3,
  MessageSquare,
  Settings,
  User,
  Scissors,
  Check,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
  HelpCircle,
  Printer,
  Sparkles
} from "lucide-react";

interface ReviewCampaign {
  id: string;
  sentAt: string | null;
  clickedAt: string | null;
  completed: boolean;
  message: string | null;
  rating: number | null;
  feedback: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolverNotes: string | null;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
  };
  appointment: {
    startTime: string;
    service: {
      name: string;
    };
    staff?: {
      name: string;
    } | null;
  };
}

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"analytics" | "feed" | "qr" | "settings">("analytics");

  // Salon settings
  const [salonData, setSalonData] = useState<any>(null);
  const [googleReviewLink, setGoogleReviewLink] = useState("");
  const [reviewDelayMins, setReviewDelayMins] = useState(60);

  // Campaigns list & reviews
  const [campaigns, setCampaigns] = useState<ReviewCampaign[]>([]);
  const [metrics, setMetrics] = useState({
    reviewRequestsSent: 0,
    reviewLinkClicks: 0,
    estimatedReviewsGenerated: 0,
    reviewsCollected: 0,
    averageRating: 0,
    reviewConversionRate: 0,
    positiveReviewRate: 0,
    negativeReviewRecoveryRate: 0
  });

  const [expandedMsg, setExpandedMsg] = useState<Record<string, boolean>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotesText, setResolutionNotesText] = useState("");
  const [feedFilter, setFeedFilter] = useState<"all" | "critical" | "resolved" | "unresolved">("all");

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  async function loadData() {
    try {
      setError(null);
      // 1. Fetch salon details for config
      const salonRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!salonRes.ok) throw new Error("Failed to load salon configuration");
      const salonObj = await salonRes.json();
      setSalonData(salonObj);
      setGoogleReviewLink(salonObj.googleReviewLink || "");
      setReviewDelayMins(salonObj.reviewDelayMins || 60);

      // 2. Fetch metrics
      const metricsRes = await fetch(`${apiUrl}/api/v1/analytics/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!metricsRes.ok) throw new Error("Failed to load metrics");
      const metricsData = await metricsRes.json();
      setMetrics({
        reviewRequestsSent: metricsData.reviewRequestsSent || 0,
        reviewLinkClicks: metricsData.reviewLinkClicks || 0,
        estimatedReviewsGenerated: metricsData.estimatedReviewsGenerated || 0,
        reviewsCollected: metricsData.reviewsCollected || 0,
        averageRating: metricsData.averageRating || 0,
        reviewConversionRate: metricsData.reviewConversionRate || 0,
        positiveReviewRate: metricsData.positiveReviewRate || 0,
        negativeReviewRecoveryRate: metricsData.negativeReviewRecoveryRate || 0
      });

      // 3. Fetch review campaigns list
      const campaignsRes = await fetch(`${apiUrl}/api/v1/reviews/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!campaignsRes.ok) throw new Error("Failed to load campaigns list");
      const campaignsList = await campaignsRes.json();
      setCampaigns(campaignsList);
    } catch (err: any) {
      console.error(err);
      setError("Error fetching reviews dashboard data. Please verify backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [apiUrl]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/salons/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          googleReviewLink: googleReviewLink.trim(),
          reviewDelayMins: Number(reviewDelayMins),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save settings");
      }

      setSuccess("Review collection preferences saved!");
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleResolveReview = async (campaignId: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/reviews/resolve/${campaignId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: resolutionNotesText.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to resolve dispute.");
      }

      setSuccess("Dispute marked as resolved successfully!");
      setResolvingId(null);
      setResolutionNotesText("");
      setTimeout(() => setSuccess(null), 3000);
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error resolving review campaign.");
    } finally {
      setSaving(false);
    }
  };

  const toggleMsg = (id: string) => {
    setExpandedMsg(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const reviewsList = campaigns.filter(c => c.rating !== null);

  const filteredReviews = reviewsList.filter(c => {
    if (feedFilter === "critical") return c.rating !== null && c.rating <= 3;
    if (feedFilter === "resolved") return c.rating !== null && c.rating <= 3 && c.resolved;
    if (feedFilter === "unresolved") return c.rating !== null && c.rating <= 3 && !c.resolved;
    return true;
  });

  // Calculate rating stats dynamically
  const ratingsCounts = [0, 0, 0, 0, 0, 0]; // 1 to 5 index
  reviewsList.forEach(c => {
    if (c.rating && c.rating >= 1 && c.rating <= 5) {
      ratingsCounts[c.rating]++;
    }
  });

  const waNumber = salonData?.whatsappNumber ? salonData.whatsappNumber.replace(/[^0-9]/g, "") : "919999999999";
  const salonName = salonData?.name || "Our Salon";
  const prefilledText = `Join Queue`;
  const qrLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(prefilledText)}`;
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrLink)}`;

  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Walk-in QR Code</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .card {
              border: 3px solid #e2e8f0;
              border-radius: 32px;
              padding: 50px 40px;
              max-width: 500px;
              margin: 0 auto;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            }
            .logo-placeholder {
              font-weight: 800;
              font-size: 24px;
              color: #059669;
              margin-bottom: 24px;
              letter-spacing: -0.5px;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 8px;
              color: #1e293b;
              letter-spacing: -0.5px;
            }
            .tagline {
              font-size: 16px;
              color: #059669;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 30px;
            }
            .qr-container {
              margin: 32px 0;
              display: inline-block;
              border: 10px solid #f1f5f9;
              border-radius: 24px;
              padding: 20px;
              background-color: #f8fafc;
            }
            .instructions {
              font-size: 16px;
              color: #475569;
              line-height: 1.6;
              margin-bottom: 32px;
              font-weight: 500;
            }
            .step-container {
              display: flex;
              justify-content: space-around;
              margin-top: 30px;
              border-top: 1px solid #e2e8f0;
              padding-top: 24px;
            }
            .step {
              flex: 1;
              font-size: 13px;
              font-weight: 600;
              color: #64748b;
            }
            .step-num {
              display: block;
              font-size: 20px;
              font-weight: 800;
              color: #059669;
              margin-bottom: 4px;
            }
            .footer {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 40px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo-placeholder">SalonsFlow</div>
            <h1>${salonName}</h1>
            <div class="tagline">WhatsApp Walk-In Booking</div>
            <div class="instructions">
              Skip the queue! Scan the QR code using your phone camera to register and book your walk-in service instantly via WhatsApp.
            </div>
            <div class="qr-container">
              <img src="${qrImgUrl}" alt="WhatsApp QR Code" width="250" height="250" />
            </div>
            <div class="step-container">
              <div class="step"><span class="step-num">1</span> Scan QR</div>
              <div class="step"><span class="step-num">2</span> Chat & Book</div>
              <div class="step"><span class="step-num">3</span> Get Served</div>
            </div>
            <div class="footer">
              Powered by SalonsFlow • Zero-Commission CRM
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
        <p className="text-sm text-slate-500 font-semibold">Loading your reputation desk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Reviews & Customer Feedback
          </h2>
          <p className="text-slate-500 text-sm">
            Automate WhatsApp feedback requests, build Google reviews, and manage walk-in conversions.
          </p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Sync Data
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-sm animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl shadow-sm animate-in fade-in duration-300">
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Tab Interface Navigation */}
      <div className="flex border-b border-slate-200 space-x-6">
        {[
          { id: "analytics", label: "Satisfaction Analytics", icon: BarChart3 },
          { id: "feed", label: `Customer Reviews (${reviewsList.length})`, icon: MessageSquare },
          { id: "qr", label: "QR Walk-In Setup", icon: QrCode },
          { id: "settings", label: "Collection Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "border-green-600 text-green-700 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-green-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Satisfaction Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Metrics Row */}
          <div className="grid gap-5 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-yellow-400 to-yellow-500"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Rating</p>
                  <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{metrics.averageRating || "0.0"}</span>
                  <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                </div>
                <div className="mt-3 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={`h-3.5 w-3.5 ${
                        s <= Math.round(metrics.averageRating) 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-slate-200"
                      }`} 
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 font-bold ml-1.5">
                    ({metrics.reviewsCollected} responses)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 to-emerald-500"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Response Rate</p>
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{metrics.reviewConversionRate}%</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-4 leading-none font-medium">
                  {metrics.reviewsCollected} completed out of {metrics.reviewRequestsSent} sent
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-blue-500"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Positive Rate</p>
                  <Star className="h-4.5 w-4.5 text-blue-500 fill-blue-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{metrics.positiveReviewRate}%</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-4 leading-none font-medium">
                  Percentage of reviews rated 4 or 5 stars
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-400 to-indigo-500"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispute Recovery</p>
                  <CheckCircle2 className="h-4.5 w-4.5 text-indigo-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{metrics.negativeReviewRecoveryRate}%</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-4 leading-none font-medium">
                  Unhappy clients contacted & resolved
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown Section */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Rating distribution chart */}
            <Card className="md:col-span-2 border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-slate-800">Rating Distribution</CardTitle>
                <p className="text-xs text-slate-500">Real-time breakdown of scores collected via WhatsApp.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingsCounts[stars];
                  const percentage = metrics.reviewsCollected > 0 
                    ? Math.round((count / metrics.reviewsCollected) * 100) 
                    : 0;
                  return (
                    <div key={stars} className="flex items-center gap-3">
                      <span className="w-12 text-xs font-bold text-slate-600 flex items-center gap-0.5">
                        {stars} <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                      </span>
                      <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stars >= 4 ? "bg-emerald-500" : stars === 3 ? "bg-amber-400" : "bg-rose-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="w-10 text-right text-xs font-semibold text-slate-500">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Zero-Commission Marketing Card */}
            <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-emerald-50/50 via-white to-indigo-50/20 flex flex-col justify-between">
              <CardHeader>
                <div className="h-9 w-9 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold text-sm mb-2 shadow-sm border border-emerald-200">
                  ₹0
                </div>
                <CardTitle className="text-sm font-extrabold text-slate-800">Zero-Commission Growth</CardTitle>
                <p className="text-xs text-slate-550 leading-relaxed">
                  Every walk-in customer captured through your QR and converted to a Google Review is 100% free of commissions. Own your client list, build direct loyalty, and rank higher on Google Maps automatically.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border-t border-slate-200/80 pt-4 mt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Est. Reviews Generated</span>
                    <span className="text-emerald-700">{metrics.estimatedReviewsGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Feedback Delivered</span>
                    <span className="text-indigo-700">{metrics.reviewRequestsSent}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Customer Reviews Feed */}
      {activeTab === "feed" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Reviews Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Reviews" },
              { id: "critical", label: "Critical Ratings (1-3 ★)" },
              { id: "unresolved", label: "Needs Resolution (Pending)" },
              { id: "resolved", label: "Resolved Disputes" },
            ].map((filt) => (
              <button
                key={filt.id}
                onClick={() => setFeedFilter(filt.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  feedFilter === filt.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filt.label}
              </button>
            ))}
          </div>

          {/* Feed List */}
          <div className="space-y-4">
            {filteredReviews.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
                <Star className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-sm">No reviews found</p>
                <p className="text-xs text-slate-400 mt-1">No feedback campaigns matching this filter have been received.</p>
              </div>
            ) : (
              filteredReviews.map((review) => {
                const isCritical = review.rating !== null && review.rating <= 3;
                return (
                  <Card key={review.id} className="border-slate-200 hover:shadow-sm transition-all bg-white relative overflow-hidden">
                    {/* Status accent side bar */}
                    <div 
                      className={`absolute left-0 top-0 h-full w-1.5 ${
                        !isCritical 
                          ? "bg-emerald-500" 
                          : review.resolved 
                            ? "bg-indigo-400" 
                            : "bg-amber-500 animate-pulse"
                      }`}
                    ></div>
                    
                    <CardContent className="p-5 pl-7">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left Section: Details */}
                        <div className="space-y-1.5">
                          <div className="flex items-center flex-wrap gap-2.5">
                            <span className="font-bold text-slate-900 text-base">{review.customer.name}</span>
                            <span className="text-xs font-mono text-slate-400">{review.customer.phone}</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              • {new Date(review.createdAt).toLocaleDateString()} at {new Date(review.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                            <Scissors className="h-3.5 w-3.5 text-slate-500" />
                            <span>{review.appointment?.service?.name || "Service"}</span>
                            {review.appointment?.staff && (
                              <>
                                <span className="text-slate-350">•</span>
                                <span className="text-slate-500">Stylist: {review.appointment.staff.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Section: Rating score */}
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star 
                                key={st} 
                                className={`h-4.5 w-4.5 ${
                                  st <= (review.rating || 0) 
                                    ? "text-yellow-500 fill-yellow-500" 
                                    : "text-slate-200"
                                }`} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* Rating badges */}
                            {!isCritical ? (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Positive Rating
                              </span>
                            ) : review.resolved ? (
                              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Check className="h-3 w-3 stroke-[3]" /> Resolved
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                <AlertCircle className="h-3 w-3" /> Dispute Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comment Feedback Bubble */}
                      {review.feedback && (
                        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-slate-700 text-xs italic font-medium leading-relaxed">
                          "{review.feedback}"
                        </div>
                      )}

                      {/* Dispute Resolution Actions */}
                      {isCritical && (
                        <div className="mt-4 border-t border-slate-100 pt-4 flex flex-col gap-3">
                          {review.resolved ? (
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-xs">
                              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                Resolved on {new Date(review.resolvedAt!).toLocaleDateString()}
                              </div>
                              {review.resolverNotes && (
                                <p className="text-slate-600 mt-1 font-medium pl-5">
                                  <strong>Resolution Notes:</strong> {review.resolverNotes}
                                </p>
                              )}
                            </div>
                          ) : resolvingId === review.id ? (
                            <div className="space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                              <label className="text-xs font-bold text-slate-600 block">
                                Resolution Notes (Explain how this dispute was handled):
                              </label>
                              <textarea
                                placeholder="e.g. Contacted client, apologized for the delay, offered a complimentary hair spa for next visit."
                                value={resolutionNotesText}
                                onChange={(e) => setResolutionNotesText(e.target.value)}
                                className="w-full border rounded-xl p-3 text-xs focus:ring-1 focus:ring-green-500 focus:outline-none focus:bg-slate-50 transition-all text-slate-750 font-medium"
                                rows={2}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResolvingId(null);
                                    setResolutionNotesText("");
                                  }}
                                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleResolveReview(review.id)}
                                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {saving ? "Saving..." : "Save Resolution"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setResolvingId(review.id);
                                setResolutionNotesText("");
                              }}
                              className="self-start flex items-center gap-1.5 bg-white border border-slate-250 hover:bg-slate-50 rounded-lg px-3.5 py-1.5 text-xs font-bold text-indigo-750 transition-all cursor-pointer shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-650" />
                              Mark Dispute Resolved
                            </button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Table: Original Campaign Dispatch Log (Auditing/History) */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-450" />
              Automated Dispatch Campaign History
            </h3>
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                  <Star className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold">No dispatch campaigns logged</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto border-none">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-bold">Client</th>
                        <th className="px-6 py-3 font-bold">Service</th>
                        <th className="px-6 py-3 font-bold">Sent Date</th>
                        <th className="px-6 py-3 font-bold">Action / Rating</th>
                        <th className="px-6 py-3 font-bold">Message Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaigns.map((camp) => (
                        <tr key={camp.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{camp.customer.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{camp.customer.phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-700">{camp.appointment.service.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(camp.appointment.startTime).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-600">
                            {camp.sentAt ? new Date(camp.sentAt).toLocaleString() : "Scheduling..."}
                          </td>
                          <td className="px-6 py-4">
                            {camp.rating !== null ? (
                              <span className="flex items-center gap-0.5 text-xs font-bold text-slate-800">
                                {camp.rating} ★
                              </span>
                            ) : camp.clickedAt ? (
                              <span className="bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                Link Clicked
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                Sent
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            {camp.message ? (
                              <div className="flex flex-col gap-1">
                                <p className={`text-xs text-slate-500 font-mono truncate leading-normal ${expandedMsg[camp.id] ? "whitespace-normal break-words truncate-none" : ""}`}>
                                  {camp.message}
                                </p>
                                <button 
                                  onClick={() => toggleMsg(camp.id)}
                                  className="text-[10px] text-green-600 hover:text-green-700 font-bold self-start mt-0.5 flex items-center gap-0.5 cursor-pointer"
                                >
                                  {expandedMsg[camp.id] ? (
                                    <>
                                      <EyeOff className="h-3 w-3" /> Hide
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3 w-3" /> Show Message
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No content</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: QR Walk-In Setup */}
      {activeTab === "qr" && (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
          {/* Instructions */}
          <Card className="lg:col-span-1 border-slate-200 shadow-sm flex flex-col justify-between">
            <CardHeader>
              <div className="h-9 w-9 bg-green-100 text-green-800 rounded-lg flex items-center justify-center font-bold mb-2 shadow-sm border border-green-200">
                <QrCode className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold text-slate-800">Smart QR Walk-In Setup</CardTitle>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Display this unique QR code at your salon reception desk. Walk-in customers scan this code using their mobile phone cameras to be onboarded instantly.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="border-t border-slate-200/80 pt-4 space-y-3.5 text-xs text-slate-650 font-medium">
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-slate-600 text-[10px]">1</span>
                  <p>Walk-in customer scans QR with camera app.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-slate-600 text-[10px]">2</span>
                  <p>A prefilled message launches in their WhatsApp. The AI receptionist captures their name and sets Customer Source to <strong>WALK_IN</strong>.</p>
                </div>
                <div className="flex gap-2">
                  <span className="h-5 w-5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center shrink-0 font-bold text-slate-600 text-[10px]">3</span>
                  <p>AI books them, tags the session, and triggers post-visit feedback loops upon POS checkout.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePrintQR}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Printer className="h-4 w-4" /> Print Setup Poster
                </button>
              </div>
            </CardContent>
          </Card>

          {/* QR poster mockup */}
          <Card className="lg:col-span-2 border-slate-200 shadow-md bg-white p-8 flex flex-col items-center justify-center text-center relative overflow-hidden select-none">
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>

            <div className="border-2 border-slate-200 border-dashed rounded-3xl p-6 w-full max-w-sm flex flex-col items-center bg-slate-50/50 shadow-sm">
              <span className="text-[10px] font-black uppercase text-green-600 tracking-widest bg-green-50 border border-green-200/50 px-3 py-1 rounded-full mb-1">
                Scan to Book
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{salonName}</h3>
              <p className="text-slate-500 text-[11px] font-semibold mt-1 max-w-[220px]">
                WhatsApp Walk-In Booking Autopilot
              </p>

              {/* QR display block */}
              <div className="bg-white border-4 border-slate-100 rounded-2xl p-4 my-5 shadow-inner">
                <img 
                  src={qrImgUrl} 
                  alt="WhatsApp QR Code" 
                  className="w-40 h-40 object-contain"
                />
              </div>

              <p className="text-slate-600 text-xs font-bold leading-relaxed max-w-[250px]">
                Scan QR code with your phone camera to start instant booking. No app installation needed.
              </p>
              
              <div className="border-t border-slate-200/80 pt-3.5 mt-4 w-full flex justify-around text-[10px] font-bold text-slate-400">
                <span>1. Scan QR</span>
                <span>2. Chat & Book</span>
                <span>3. Enjoy Service</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 font-semibold mt-4">
              QR Endpoint URL: <span className="font-mono bg-slate-100 border px-1.5 py-0.5 rounded select-all">{qrLink}</span>
            </p>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Collection Settings */}
      {activeTab === "settings" && (
        <Card className="border-slate-200 shadow-sm max-w-2xl animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-500" />
              <span>Review Preferences & Delay Settings</span>
            </CardTitle>
            <p className="text-xs text-slate-500">
              Configure parameters governing automated post-checkout feedback dispatches.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-slate-500" />
                  Google Business Review URL
                </label>
                <input
                  type="url"
                  placeholder="https://g.page/r/your-review-id/review"
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none focus:bg-slate-50 transition-all font-semibold"
                  required
                />
                <span className="text-[10px] text-slate-400 font-medium block leading-normal pl-1">
                  Customers who rate your service 4 or 5 stars on WhatsApp will be automatically prompted with this link to post their review on Google.
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Dispatch Delay Timer
                  </label>
                  <span className="text-xs font-black text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-lg shadow-sm">
                    {reviewDelayMins} minutes ({Math.round(reviewDelayMins / 60 * 10) / 10} hours)
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="1440"
                  step="5"
                  value={reviewDelayMins}
                  onChange={(e) => setReviewDelayMins(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600 border"
                />
                <span className="text-[10px] text-slate-400 font-medium block leading-normal pl-1">
                  Wait duration elapsed between checking out the appointment via the POS and emitting the rating survey trigger.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold text-xs transition-colors cursor-pointer disabled:bg-green-400 shadow-md shadow-green-950/10 flex items-center justify-center gap-1.5"
                >
                  {saving ? "Saving preferences..." : "Save Settings"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

