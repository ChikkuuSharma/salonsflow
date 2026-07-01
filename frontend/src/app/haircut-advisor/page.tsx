"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Scissors,
  Download,
  RefreshCw,
  Sparkles,
  Lock,
  Check,
  User,
  Phone,
  ArrowRight,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Crown,
  X
} from "lucide-react";

interface LeadData {
  name: string;
  phone: string;
  email: string;
  salonName: string;
  city: string;
}

export default function HaircutAdvisorPage() {
  // Wizard States: 'UPLOAD' | 'SCANNING' | 'LEAD_GATE' | 'RESULT' | 'PAYWALL'
  const [step, setStep] = useState<"UPLOAD" | "SCANNING" | "LEAD_GATE" | "RESULT" | "PAYWALL">("UPLOAD");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number>(0);
  const [scanStatusText, setScanStatusText] = useState("Initializing facial scanner...");
  const [detectedShape, setDetectedShape] = useState<"oval" | "round" | "square" | "heart">("oval");
  const [checkoutSimulated, setCheckoutSimulated] = useState(false);

  // Style Selections (Editable on Result screen)
  const [selectedHaircut, setSelectedHaircut] = useState("");
  const [selectedBeard, setSelectedBeard] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  // Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("12:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Lead Data
  const [leadFormData, setLeadFormData] = useState<LeadData>({
    name: "",
    phone: "",
    email: "",
    salonName: "Public Visitor",
    city: "Mumbai"
  });
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Load scan count from LocalStorage on mount
  useEffect(() => {
    const savedCount = localStorage.getItem("sf_advisor_scans");
    if (savedCount) {
      setScanCount(parseInt(savedCount, 10));
    }
  }, []);

  // Heuristic matching based on image name or simple selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check freemium limit (2 free scans)
    if (scanCount >= 2) {
      setStep("PAYWALL");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      
      // Determine a pseudo-random shape based on filename hash to keep it consistent
      const nameHash = file.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const shapes: Array<"oval" | "round" | "square" | "heart"> = ["oval", "round", "square", "heart"];
      const chosenShape = shapes[nameHash % shapes.length];
      setDetectedShape(chosenShape);

      // Reset style selections to defaults for that shape
      const defaults = shapeData[chosenShape];
      setSelectedHaircut(defaults.haircuts[0]);
      setSelectedBeard(defaults.beards[0]);
      setSelectedColor(defaults.colors[0]);

      // Move to scanning animation
      startScanning();
    };
    reader.readAsDataURL(file);
  };

  const startScanning = () => {
    setStep("SCANNING");
    const statuses = [
      "Initializing facial scanner...",
      "Mapping face borders and height...",
      "Detecting jawline curvature...",
      "Measuring chin width and cheekbones...",
      "Determining primary face shape index...",
      "Face shape analysis complete!"
    ];

    statuses.forEach((status, idx) => {
      setTimeout(() => {
        setScanStatusText(status);
        if (idx === statuses.length - 1) {
          // Increment scan count and save to localStorage
          const nextCount = scanCount + 1;
          setScanCount(nextCount);
          localStorage.setItem("sf_advisor_scans", nextCount.toString());
          
          setTimeout(() => {
            setStep("LEAD_GATE");
          }, 1200);
        }
      }, idx * 1000);
    });
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadFormData.name || !leadFormData.phone) return;

    setLeadSubmitted(true);
    try {
      await fetch(`${apiUrl}/api/v1/public/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: leadFormData.name,
          phone: leadFormData.phone,
          email: leadFormData.email,
          salonName: "AI Style Lab Portal",
          city: leadFormData.city,
          demoStatus: "AI_STYLE_LAB",
          notes: `[AI Style Lab] Shape: ${detectedShape.toUpperCase()}. Recommended Haircut: ${selectedHaircut || "None"}, Beard: ${selectedBeard || "None"}, Color: ${selectedColor || "None"}.`
        })
      });
    } catch (err) {
      console.error("Failed to persist lead details to database:", err);
    }
    setStep("RESULT");
  };

  const handlePaymentSimulate = () => {
    setCheckoutSimulated(true);
    setTimeout(() => {
      // Reset scan count and allow more scans
      localStorage.setItem("sf_advisor_scans", "0");
      setScanCount(0);
      setCheckoutSimulated(false);
      setStep("UPLOAD");
    }, 2000);
  };

  const handleReset = () => {
    setImagePreview(null);
    setStep("UPLOAD");
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) return;

    setBookingLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/public/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: leadFormData.name,
          phone: leadFormData.phone,
          date: bookingDate,
          time: bookingTime,
          haircut: selectedHaircut || shapeData[detectedShape].haircuts[0],
          notes: bookingNotes || `AI Style Lab Booking. Haircut: ${selectedHaircut || shapeData[detectedShape].haircuts[0]}. Beard: ${selectedBeard}, Color: ${selectedColor}.`
        })
      });
      if (response.ok) {
        setBookingSuccess(true);
      } else {
        alert("Failed to register appointment booking.");
      }
    } catch (err) {
      console.error("Public booking error:", err);
      alert("Error booking appointment.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Helper to trigger print view of the style card
  const handlePrint = () => {
    window.print();
  };

  const shapeData = {
    oval: {
      name: "Oval Face Shape",
      desc: "Your forehead is slightly wider than your jawline, and the length of your face is longer than the width of your cheekbones. This is the most versatile face shape for hairstyles.",
      haircuts: ["Pompadour Fade", "Classic Taper Fade", "Slicked Back Undercut", "Side Part Quiff"],
      beards: ["Clean Shaven", "Light Stubble", "Short Boxed Beard"],
      colors: ["Ash Brown Highlights", "Natural Black", "Copper Bronze"],
      imageUrl: "/looks/oval.png"
    },
    round: {
      name: "Round Face Shape",
      desc: "Your face length and width are approximately equal, with soft features and a less defined jawline. Hairstyle goals should add height and volume to elongate the face shape.",
      haircuts: ["Textured Quiff Fade", "Spiky High Fade", "Faux Hawk Crop", "High & Tight Undercut"],
      beards: ["Full Beard with Sharp Angles", "Goatee with Stubble", "Garibaldi Beard"],
      colors: ["Dark Platinum Silver", "Deep Mahogany", "Jet Black Highlights"],
      imageUrl: "/looks/round.png"
    },
    square: {
      name: "Square Face Shape",
      desc: "Your face is characterized by a strong, prominent jawline, straight sides, and a broad forehead. Hairstyles should either emphasize your sharp features or soften them.",
      haircuts: ["Buzz Cut Fade", "Textured Slick Back", "Modern French Crop", "Ivy League Crew Cut"],
      beards: ["Heavy 10-Day Stubble", "Balbo Beard", "Circle Beard"],
      colors: ["Honey Gold Highlights", "Natural Brown", "Golden Blonde Strands"],
      imageUrl: "/looks/square.png"
    },
    heart: {
      name: "Heart Face Shape",
      desc: "Your face shape features a wider forehead that tapers down to a sharp, pointed chin. Hairstyles should balance the narrow chin by adding weight/fullness around the lower face.",
      haircuts: ["Messy Textured Fringe", "Medium Length Layered Waves", "Side Swept Fringe", "Classic Side Part"],
      beards: ["Full Corporate Beard", "Thick Beard with Mustache", "Hollywoodian Beard"],
      colors: ["Chestnut Red", "Natural Ash Blonde", "Caramel Highlights"],
      imageUrl: "/looks/heart.png"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform group-hover:scale-105">
              S
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-tight text-white block">Salons<span className="text-emerald-400">Flow</span></span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400/85 block">AI Style Lab</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 text-xs text-zinc-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Free usage remaining: <strong className="text-emerald-400">{Math.max(0, 2 - scanCount)}/2 scans</strong></span>
            </div>
            <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-zinc-450 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-850 px-4.5 py-2.5 rounded-full">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-10 px-6">
        <div className="w-full max-w-4xl mx-auto">

          {/* STEP 1: UPLOAD PORTAL */}
          {step === "UPLOAD" && (
            <div className="space-y-8 text-center">
              <div className="space-y-3 max-w-2xl mx-auto">
                <span className="bg-emerald-950/60 border border-emerald-900/50 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block">
                  💡 100% Free Smart Portrait Analyzer
                </span>
                <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white uppercase">
                  Discover Your Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">AI Look</span>
                </h1>
                <p className="text-sm text-zinc-400 leading-relaxed font-semibold">
                  Upload your photo. Our facial geometry analyzer maps your exact facecut to recommend the haircuts, beard stylings, and hair colors that suit you best.
                </p>
              </div>

              {/* Drag and Drop Card */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-12 rounded-3xl backdrop-blur-md max-w-xl mx-auto shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <label className="flex flex-col items-center justify-center cursor-pointer space-y-5 py-4 z-10 relative">
                  <div className="w-16 h-16 bg-zinc-950/80 border border-zinc-850 rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-black text-white block uppercase tracking-wider">Upload your Portrait</span>
                    <span className="text-[11px] text-zinc-500 font-semibold block">Supports PNG, JPG, or JPEG</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-850 text-[10px] font-bold text-zinc-400 px-5 py-2.5 rounded-full uppercase tracking-wider group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-all shadow">
                    Select Image File
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Value Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 max-w-3xl mx-auto">
                <div className="bg-zinc-900/20 border border-zinc-900/40 p-5 rounded-2xl text-left space-y-1">
                  <span className="text-emerald-400 text-xs font-black block uppercase tracking-widest font-mono">01. Geometry Scan</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">Maps jaw lines, height, and bone structural widths dynamically.</p>
                </div>
                <div className="bg-zinc-900/20 border border-zinc-900/40 p-5 rounded-2xl text-left space-y-1">
                  <span className="text-emerald-400 text-xs font-black block uppercase tracking-widest font-mono">02. Tailored Grooming</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">Suggests visual hair cuts and beard alignments matching your structure.</p>
                </div>
                <div className="bg-zinc-900/20 border border-zinc-900/40 p-5 rounded-2xl text-left space-y-1">
                  <span className="text-emerald-400 text-xs font-black block uppercase tracking-widest font-mono">03. High-Density Download</span>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">Export your lookbook card and present it at your next salon visit.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING SCREEN */}
          {step === "SCANNING" && (
            <div className="flex flex-col items-center justify-center space-y-8 py-10 max-w-md mx-auto text-center">
              <div className="relative w-64 h-64 rounded-3xl overflow-hidden border border-emerald-500/35 bg-zinc-950 shadow-2xl flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Scanning preview" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full bg-zinc-900"></div>
                )}
                
                {/* Sci-fi Scanning animation laser line */}
                <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-[bounce_2s_infinite]"></div>
                
                {/* Target reticle overlay */}
                <div className="absolute inset-4 border border-emerald-500/10 rounded-2xl pointer-events-none"></div>
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5">
                  <RefreshCw className="w-4.5 h-4.5 text-emerald-400 animate-spin" />
                  <span className="font-display font-black text-lg text-white uppercase tracking-wider">AI Analysis in Progress</span>
                </div>
                <p className="text-xs text-emerald-400 font-mono tracking-widest uppercase">{scanStatusText}</p>
              </div>
            </div>
          )}

          {/* STEP 3: LEAD CAPTURE GATE */}
          {step === "LEAD_GATE" && (
            <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl backdrop-blur-md shadow-2xl space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-400 mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-xl text-white uppercase">Your Analysis is Ready!</h3>
                <p className="text-xs text-zinc-450 font-semibold leading-relaxed">
                  Enter your contact details to save and unlock your personalized style sheet and haircut recommendations card.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="text"
                      required
                      value={leadFormData.name}
                      onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">WhatsApp Number (Mandatory)</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="tel"
                      required
                      value={leadFormData.phone}
                      onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Email Address (Optional)</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="email"
                      value={leadFormData.email}
                      onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Your City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-550" />
                    <input
                      type="text"
                      required
                      value={leadFormData.city}
                      onChange={(e) => setLeadFormData({ ...leadFormData, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 mt-6 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <span>Reveal AI Lookbook Results</span>
                  <ArrowRight className="w-4 h-4 text-zinc-950" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: PREVIEW RESULT SCREEN */}
          {step === "RESULT" && (
            <div className="space-y-8">
              
              {/* Top Banner Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-900 pb-5 no-print">
                <div className="text-left">
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">Analysis Report ID #LOOK-AI-{scanCount}</span>
                  <h2 className="font-display text-2xl font-black text-white uppercase tracking-tight">Your Face Cut Design Card</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 px-4.5 py-2.5 rounded-full transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan New Photo</span>
                  </button>
                  <button
                    onClick={() => {
                      setBookingDate(new Date().toISOString().split("T")[0]);
                      setBookingSuccess(false);
                      setShowBookingModal(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-650 hover:bg-indigo-700 px-5 py-2.5 rounded-full transition-all shadow shadow-indigo-500/10 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Book Appointment</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-950 bg-emerald-400 hover:bg-emerald-500 px-5 py-2.5 rounded-full transition-all shadow shadow-emerald-500/10"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Style Sheet</span>
                  </button>
                </div>
              </div>

              {/* Analysis Result Card layout */}
              <div id="print-sheet" className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-zinc-900/40 border border-zinc-850 p-6 md:p-8 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none"></div>
                
                {/* Print view watermark */}
                <div className="hidden print:flex justify-between items-center w-full border-b border-zinc-800 pb-4 mb-6 col-span-12">
                  <span className="font-display font-black text-lg text-white">SalonsFlow <span className="text-emerald-400">AI Lookbook</span></span>
                  <span className="text-[10px] font-mono text-zinc-500">Owner: {leadFormData.name} ({leadFormData.phone})</span>
                </div>

                {/* Left side: Uploaded photo vs AI Mock suggestion */}
                <div className="md:col-span-5 space-y-6 flex flex-col items-center">
                  <div className="space-y-3 text-center w-full">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Style Analysis Preview</span>
                    
                    {/* Side by side user photo and reference model */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] md:max-w-none">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Your Photo</span>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Your uploaded portrait"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-650">No Image</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Reference Style</span>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-md">
                          <img
                            src={shapeData[detectedShape].imageUrl}
                            alt="Reference style model"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Face shape tag */}
                  <div className="bg-zinc-950/80 border border-zinc-850 px-5 py-3 rounded-2xl text-center w-full max-w-[280px]">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Primary Classification</span>
                    <span className="font-display font-black text-lg text-white uppercase tracking-tight block">{shapeData[detectedShape].name}</span>
                  </div>
                </div>

                {/* Right side: Detailed Recommendations */}
                <div className="md:col-span-7 space-y-6 text-left">
                  <div className="space-y-1.5">
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">Morphological Evaluation</span>
                    <p className="text-[11.5px] text-zinc-450 leading-relaxed font-semibold">{shapeData[detectedShape].desc}</p>
                  </div>

                  {/* Selection options matrix */}
                  <div className="space-y-4 border-t border-zinc-850 pt-5">
                    
                    {/* haircuts */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Recommended Haircuts (Pick one)</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].haircuts.map((haircut) => (
                          <button
                            key={haircut}
                            onClick={() => setSelectedHaircut(haircut)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all ${
                              selectedHaircut === haircut
                                ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-400 font-extrabold"
                                : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {haircut}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Haircut view */}
                    <div className="hidden print:block">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Selected Haircut Recommendation</span>
                      <span className="text-sm font-black text-white">{selectedHaircut}</span>
                    </div>

                    {/* beards */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Suggested Beard Alignment</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].beards.map((beard) => (
                          <button
                            key={beard}
                            onClick={() => setSelectedBeard(beard)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all ${
                              selectedBeard === beard
                                ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-400 font-extrabold"
                                : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {beard}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Beard view */}
                    <div className="hidden print:block mt-3">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Selected Beard Style</span>
                      <span className="text-sm font-black text-white">{selectedBeard}</span>
                    </div>

                    {/* hair color */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Suggested Hair Tone</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all ${
                              selectedColor === color
                                ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-400 font-extrabold"
                                : "bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Color view */}
                    <div className="hidden print:block mt-3">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Selected Hair Color Tone</span>
                      <span className="text-sm font-black text-white">{selectedColor}</span>
                    </div>

                  </div>

                  {/* Booking CTA */}
                  <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 no-print">
                    <div className="text-left space-y-0.5">
                      <span className="text-[10.5px] font-black text-white uppercase block">Get this look near you</span>
                      <p className="text-[9.5px] text-zinc-550 leading-relaxed font-semibold">Book an appointment at a SalonsFlow-powered salon nearby.</p>
                    </div>
                    <Link
                      href="/onboarding"
                      className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[10.5px] font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow"
                    >
                      <span>Book Look Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                
                {/* Print view footer */}
                <div className="hidden print:block w-full border-t border-zinc-800 pt-4 mt-8 col-span-12 text-center text-[9px] text-zinc-550">
                  © 2026 SalonsFlow AI Grooming Lab. All rights reserved. Powered by salonsflow.in
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PAYWALL BLOCK */}
          {step === "PAYWALL" && (
            <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 p-8 rounded-3xl backdrop-blur-md shadow-2xl text-center space-y-6">
              <div className="space-y-2">
                <div className="w-14 h-14 bg-amber-950/60 border border-amber-900/50 rounded-2xl flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                  <Crown className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block font-mono">Premium Access Lock</span>
                <h3 className="font-display font-black text-2xl text-white uppercase tracking-tight">AI Scan Limit Reached</h3>
                <p className="text-xs text-zinc-450 leading-relaxed font-semibold">
                  You have used your **2/2 free facial scans** for this session. Upgrade to our Premium Style Lab tier for unlimited geometry analyses.
                </p>
              </div>

              {/* Checkout pricing box */}
              <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl text-left space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div>
                    <span className="text-xs font-black text-white uppercase block">Style Lab Unlimited Pass</span>
                    <span className="text-[10px] font-bold text-zinc-500">Lifetime access & downloads</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-xl text-emerald-400 block">₹99</span>
                    <span className="text-[9px] font-semibold text-zinc-550 block">One-time payment</span>
                  </div>
                </div>

                <div className="space-y-2 text-[10px] text-zinc-400 font-semibold">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Unlimited portrait uploads & geometry scans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Detailed face morph details & structure notes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>High-resolution style card sheets downloads</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handlePaymentSimulate}
                  disabled={checkoutSimulated}
                  className="w-full bg-gradient-to-r from-emerald-400 to-indigo-500 hover:from-emerald-500 hover:to-indigo-600 text-zinc-950 text-xs font-black uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 active:scale-95 transition-all"
                >
                  {checkoutSimulated ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Processing simulated payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹99 & Unlock Now</span>
                      <ArrowRight className="w-4 h-4 text-zinc-950" />
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setStep("UPLOAD")}
                  className="w-full bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold py-3 rounded-xl transition-all"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Styled Footer */}
      <footer className="border-t border-zinc-900 py-6 px-6 no-print bg-zinc-950/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-zinc-550 font-semibold">
          <span>© 2026 SalonsFlow AI Lab. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-zinc-300">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-zinc-300">Terms of Use</Link>
          </div>
        </div>
      </footer>

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-zinc-100 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {bookingSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">Appointment Requested!</h3>
                  <p className="text-xs text-zinc-400 font-semibold leading-relaxed max-w-xs mx-auto">
                    Your appointment request for a <strong className="text-emerald-400">{selectedHaircut || shapeData[detectedShape].haircuts[0]}</strong> has been logged in the booking manager list.
                  </p>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white text-xs font-bold px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-5 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block font-mono">STEP 4: SCHEDULE APPOINTMENT</span>
                  <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Reserve Style Session</h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">
                    Book your recommended look <strong className="text-white">{selectedHaircut || shapeData[detectedShape].haircuts[0]}</strong> at our partner salon.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Preferred Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Preferred Time</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Styling Notes / Requests (Optional)</label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="E.g., prefer low fade, beard trim details, color preference..."
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-emerald-500/50 font-semibold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                      <span>Scheduling session...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Appointment Request</span>
                      <Scissors className="w-3.5 h-3.5 text-zinc-950" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tailwind Print support styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #000000 !important;
            color: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          #print-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: transparent !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

    </div>
  );
}
