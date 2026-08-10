"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Sparkles,
  Scissors,
  Star,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  PhoneCall,
  X,
  Navigation,
  DollarSign,
  Tag,
  ShieldCheck,
  Building2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";

export default function SalonsMarketplacePage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  // Price Inspection Modal State
  const [inspectSalon, setInspectSalon] = useState<any | null>(null);

  const getApiUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "https://api.salonsflow.in";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  };
  const apiUrl = getApiUrl();

  const fetchSalons = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (selectedCity !== "ALL") params.append("city", selectedCity);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);

      const res = await fetch(`${apiUrl}/api/v1/public/salons?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load salons list.");
      const data = await res.json();
      setSalons(data);
    } catch (err: any) {
      console.error(err);
      setError("Unable to connect to salon database. Please verify backend service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, [selectedCity, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSalons();
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoMsg("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    setGeoMsg("Detecting your nearest location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        setGeoMsg("Location detected! Showing nearest salons in Mumbai area.");
        setSelectedCity("Mumbai");
        setTimeout(() => setGeoMsg(null), 4000);
      },
      (err) => {
        setGeoLocating(false);
        setGeoMsg("Could not get location automatically. Please select a city.");
        setTimeout(() => setGeoMsg(null), 4000);
      }
    );
  };

  const citiesList = [
    { label: "All Cities", value: "ALL" },
    { label: "Mumbai", value: "Mumbai" },
    { label: "Delhi / NCR", value: "Delhi" },
    { label: "Bengaluru", value: "Bengaluru" },
    { label: "Pune", value: "Pune" },
    { label: "Hyderabad", value: "Hyderabad" },
    { label: "Chennai", value: "Chennai" },
    { label: "Kolkata", value: "Kolkata" },
  ];

  const categoryList = [
    { label: "All Categories", value: "ALL" },
    { label: "Unisex Salon", value: "UNISEX_SALON" },
    { label: "Hair Studio", value: "HAIR_STUDIO" },
    { label: "Beauty Spa", value: "BEAUTY_SPA" },
    { label: "Barber Shop", value: "BARBER_SHOP" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-20">
      {/* Top Header Navigation */}
      <TopNav />

      {/* Hero Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-slate-950 to-slate-950 pt-28 pb-12 border-b border-slate-800/80">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-mx px-4 sm:px-6 lg:px-8 mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            Verified Salon Network Marketplace
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Discover Nearest Salons & Compare Service Prices
          </h1>
          <p className="mt-3 text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Find top-rated partner salons near you, inspect transparent service pricing in real-time, and book instant appointment slots online.
          </p>

          {/* Search & Location Bar */}
          <div className="mt-8 max-w-4xl mx-auto">
            <form onSubmit={handleSearchSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 sm:p-3 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row gap-2 sm:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search salon name, service, haircut, or landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* City Selector */}
              <div className="relative sm:w-48">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:border-purple-500"
                >
                  {citiesList.map((c) => (
                    <option key={c.value} value={c.value} className="bg-slate-900 text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={geoLocating}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  title="Detect nearest salons based on your location"
                >
                  <Navigation className={`h-3.5 w-3.5 ${geoLocating ? "animate-spin" : ""}`} />
                  {geoLocating ? "Locating..." : "Near Me 📍"}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            </form>

            {geoMsg && (
              <p className="mt-2 text-xs text-purple-400 font-medium animate-pulse">
                {geoMsg}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Category Pills & Results Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-2">
              <Filter className="h-3.5 w-3.5" /> Category:
            </span>
            {categoryList.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-900/50"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="font-bold text-white">{salons.length}</span> listed salon partner{salons.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-2/3 mb-3"></div>
                <div className="h-4 bg-slate-800/60 rounded w-1/2 mb-6"></div>
                <div className="space-y-2 mb-6">
                  <div className="h-3 bg-slate-800/40 rounded w-full"></div>
                  <div className="h-3 bg-slate-800/40 rounded w-4/5"></div>
                </div>
                <div className="h-10 bg-slate-800 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="my-12 p-6 bg-rose-950/30 border border-rose-800/60 rounded-2xl text-center max-w-xl mx-auto">
            <p className="text-rose-300 font-semibold text-sm">{error}</p>
            <button
              onClick={fetchSalons}
              className="mt-4 px-4 py-2 bg-rose-900/50 hover:bg-rose-800 text-white text-xs font-bold rounded-xl border border-rose-700/50 transition-all"
            >
              Try Reloading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && salons.length === 0 && (
          <div className="my-16 text-center max-w-md mx-auto py-12 px-4">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800 text-slate-500">
              <Building2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No Salons Found</h3>
            <p className="text-slate-400 text-xs mt-1.5">
              We couldn't find any partner salons matching your active filter criteria. Try resetting your search or selecting "All Cities".
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCity("ALL");
                setSelectedCategory("ALL");
              }}
              className="mt-5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Salons Grid */}
        {!loading && !error && salons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8">
            {salons.map((salon) => (
              <div
                key={salon.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/20 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />

                <div>
                  {/* Card Header: Category & Verified Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                      {salon.businessCategory?.replace("_", " ") || "UNISEX SALON"}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3 w-3" /> Verified Partner
                    </span>
                  </div>

                  {/* Salon Title */}
                  <h2 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                    <span>{salon.name}</span>
                  </h2>

                  {/* Rating & Location */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {salon.rating || 4.8} ({salon.reviewCount || 42})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 truncate text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{salon.ownerCity || "Mumbai"}</span>
                    </span>
                  </div>

                  {/* Full Address */}
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {salon.address}
                  </p>

                  {/* Highlights Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-300 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{salon.openingTime || "10:00"} - {salon.closingTime || "20:00"}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Starts At</span>
                      <span className="font-extrabold text-emerald-400 text-sm">₹{salon.minPrice || 299}</span>
                    </div>
                  </div>

                  {/* Services Preview Pills */}
                  {salon.services && salon.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {salon.services.slice(0, 3).map((srv: any) => (
                        <span
                          key={srv.id}
                          className="text-[10px] font-semibold bg-slate-950/80 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md"
                        >
                          {srv.name} • <span className="text-emerald-400">₹{srv.price}</span>
                        </span>
                      ))}
                      {salon.services.length > 3 && (
                        <span className="text-[10px] font-bold text-purple-400 bg-purple-950/30 px-1.5 py-0.5 rounded">
                          +{salon.services.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-800/60 flex flex-col gap-2">
                  <button
                    onClick={() => setInspectSalon(salon)}
                    className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700/50 flex items-center justify-center gap-1.5"
                  >
                    <Tag className="h-3.5 w-3.5 text-purple-400" />
                    Inspect Services & Price List ({salon.serviceCount || salon.services?.length || 0})
                  </button>

                  <div className="flex gap-2">
                    {salon.whatsappNumber && (
                      <a
                        href={`https://wa.me/${salon.whatsappNumber.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(salon.name)},%20I%20found%20you%20on%20SalonsFlow%20and%20would%20like%20to%20inquire%20about%20appointments.`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                        title="Chat on WhatsApp"
                      >
                        <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                        Chat
                      </a>
                    )}

                    <Link
                      href={`/book?salonId=${salon.id}`}
                      className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-950/50 flex items-center justify-center gap-1.5 group-hover:scale-[1.02]"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Book Appointment Now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Price Inspection Modal */}
      {inspectSalon && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase">
                  <Scissors className="h-3 w-3 text-purple-400" /> Transparent Price Menu
                </div>
                <h2 className="text-2xl font-bold text-white mt-1">{inspectSalon.name}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-purple-400" /> {inspectSalon.address}
                </p>
              </div>

              <button
                onClick={() => setInspectSalon(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Services List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Available Services & Instant Pricing ({inspectSalon.services?.length || 0})
              </h3>

              {(!inspectSalon.services || inspectSalon.services.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No detailed service items configured yet for this salon.
                </p>
              ) : (
                inspectSalon.services.map((service: any) => (
                  <div
                    key={service.id}
                    className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex items-center justify-between hover:border-purple-500/40 transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                          {service.name}
                        </h4>
                        {service.gender && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {service.gender}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" /> {service.durationMins || 45} mins
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-400">₹{service.price}</span>
                      </div>
                      <Link
                        href={`/book?salonId=${inspectSalon.id}&serviceId=${service.id}`}
                        className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Book This
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Operating Hours: <span className="text-white font-semibold">{inspectSalon.openingTime || "10:00"} - {inspectSalon.closingTime || "20:00"}</span>
              </span>

              <Link
                href={`/book?salonId=${inspectSalon.id}`}
                className="py-2 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-purple-950/50 flex items-center gap-1.5"
              >
                Proceed to Booking Calendar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
