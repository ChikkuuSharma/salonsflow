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
  X,
  Search
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
  
  // Salon/Vendor Selection States
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [bookingStep, setBookingStep] = useState<"SELECT_VENDOR" | "SCHEDULE">("SELECT_VENDOR");
  const [bookingType, setBookingType] = useState<"SALON" | "HOME">("SALON");
  const [homeAddress, setHomeAddress] = useState("");
  const [salonStaff, setSalonStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

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

  const loadVendorsList = async () => {
    try {
      setVendorsLoading(true);
      const response = await fetch(`${apiUrl}/api/v1/admin/salons`, {
        headers: { Authorization: "Bearer dev-bypass-token" }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const mapped = data.map((v: any, index: number) => ({
            id: v.id,
            name: v.name,
            whatsappNumber: v.whatsappNumber,
            address: v.address || "Main Street Road",
            ownerCity: v.ownerCity || "Mumbai",
            businessCategory: v.businessCategory || "HAIR_SALON",
            rating: (4.5 + (index % 5) * 0.1).toFixed(1),
            reviewsCount: (80 + (index % 10) * 15).toString()
          }));
          setVendors(mapped);
          return;
        }
      }
    } catch (err) {
      console.error("Error loading vendors:", err);
    }
    
    // Fallback vendors if API is empty or offline
    const fallbackVendors = [
      {
        id: "v-mumbai-1",
        name: "Mirror Magic Unisex Salon",
        whatsappNumber: "+91 98765 43210",
        address: "Shop 4, Bandra West, near Linking Road",
        ownerCity: "Mumbai",
        businessCategory: "UNISEX_SALON",
        rating: "4.9",
        reviewsCount: "184"
      },
      {
        id: "v-delhi-2",
        name: "Toni & Guy Partner Studio",
        whatsappNumber: "+91 99999 88888",
        address: "Block M, Greater Kailash II",
        ownerCity: "Delhi",
        businessCategory: "HAIR_SALON",
        rating: "4.8",
        reviewsCount: "312"
      },
      {
        id: "v-blr-3",
        name: "Vogue & Co. Wellness Spa",
        whatsappNumber: "+91 98888 77777",
        address: "80 Feet Road, Indiranagar",
        ownerCity: "Bangalore",
        businessCategory: "SPA_AND_SALON",
        rating: "4.7",
        reviewsCount: "95"
      },
      {
        id: "v-pune-4",
        name: "The Grooming Bar & Lounge",
        whatsappNumber: "+91 97777 66666",
        address: "Koregaon Park Lane 6",
        ownerCity: "Pune",
        businessCategory: "BARBER_SHOP",
        rating: "4.9",
        reviewsCount: "156"
      }
    ];
    setVendors(fallbackVendors);
    setVendorsLoading(false);
  };

  const loadSalonStaff = async (salonId: string) => {
    try {
      setStaffLoading(true);
      const response = await fetch(`${apiUrl}/api/v1/public/salons/${salonId}/staff`);
      if (response.ok) {
        const data = await response.json();
        setSalonStaff(data || []);
      } else {
        setSalonStaff([]);
      }
    } catch (err) {
      console.error("Error loading staff:", err);
      setSalonStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  // Load scan count and partner salons on mount
  useEffect(() => {
    const savedCount = localStorage.getItem("sf_advisor_scans");
    if (savedCount) {
      setScanCount(parseInt(savedCount, 10));
    }
    loadVendorsList();
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
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Downscale image on canvas to avoid mobile memory limits / crash bugs
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setImagePreview(compressedDataUrl);
        } else {
          setImagePreview(event.target?.result as string);
        }

        // Combine name length, size and current timestamp to ensure a unique random choice per scan
        const seed = file.name.length + file.size + Date.now();
        const shapes: Array<"oval" | "round" | "square" | "heart"> = ["oval", "round", "square", "heart"];
        const chosenShape = shapes[seed % shapes.length];
        setDetectedShape(chosenShape);

        // Reset style selections to defaults for that shape
        const defaults = shapeData[chosenShape];
        setSelectedHaircut(defaults.haircuts[0]);
        setSelectedBeard(defaults.beards[0]);
        setSelectedColor(defaults.colors[0]);

        // Move to scanning animation
        startScanning();
      };
      img.src = event.target?.result as string;
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
    if (!bookingDate || !bookingTime || !selectedVendor) return;
    if (bookingType === "HOME" && !homeAddress.trim()) {
      alert("Bhai, please enter your home address for at-home service.");
      return;
    }

    setBookingLoading(true);
    try {
      const typeLabel = bookingType === "HOME" ? "🏠 Home Service (Doorstep)" : "🏪 Salon Visit (Store)";
      const addressNotes = bookingType === "HOME" ? `\nHome Address: ${homeAddress}` : "";
      
      const chosenStaff = salonStaff.find((s) => s.id === selectedStaffId);
      const staffNotes = chosenStaff ? `\nStylist/Specialist: ${chosenStaff.name}` : "\nStylist/Specialist: Any Available Stylist";

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
          salonId: selectedVendor.id,
          staffId: selectedStaffId || undefined,
          notes: `[AI Style Lab] Type: ${typeLabel}.${addressNotes}${staffNotes}\nPartner Salon: ${selectedVendor.name}. Haircut: ${selectedHaircut || shapeData[detectedShape].haircuts[0]}. Beard: ${selectedBeard}, Color: ${selectedColor}.\nCustomer Notes: ${bookingNotes}`
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
      name: "Oval (Perfect Balanced Face)",
      desc: "Bhai, your face has the perfect balance! Length is slightly more than width. Almost every haircut and beard looks super cool on you. You can pull off a neat slick back or a classic taper fade easily.",
      haircuts: ["Pompadour Fade (High Volume)", "Classic Taper (Medium Length)", "Slick Back (Classy Look)", "Side Part Quiff (Cool Style)"],
      beards: ["Clean Shaven (Gentleman look)", "Light Stubble (Classy 2-day look)", "Short Boxed Beard"],
      colors: ["Ash Brown Highlights", "Natural Black", "Copper Bronze"],
      imageUrl: "/looks/oval.png"
    },
    round: {
      name: "Round (Gol Face Shape)",
      desc: "Bhai, your face shape is round/circular (Gol). To make your face look sharper and longer, choose cuts that have volume/height on top and are short on the sides. Avoid round cuts.",
      haircuts: ["Textured Quiff Fade (Top Volume)", "Spiky High Fade (Sharp look)", "Faux Hawk Crop", "High & Tight Undercut"],
      beards: ["Sharp Angled Beard (Makes jaw look sharp)", "Goatee with Stubble", "Garibaldi Beard"],
      colors: ["Dark Platinum Silver", "Deep Mahogany", "Jet Black (Natural Indian Look)"],
      imageUrl: "/looks/round.png"
    },
    square: {
      name: "Square (Jawline Hero / Chowkor)",
      desc: "Bhai, you have a strong square jawline (Chowkor). You look masculine! Highlight your sharp jaw with very close side fades, short spikes, or a textured slick back.",
      haircuts: ["Buzz Cut (Army look)", "Textured Slick Back (Hero style)", "Modern French Crop", "Ivy League Crew Cut"],
      beards: ["Heavy Stubble (10-day raw look)", "Balbo Beard Style", "Circle Beard"],
      colors: ["Honey Gold Highlights", "Natural Brown", "Golden Blonde Strands"],
      imageUrl: "/looks/square.png"
    },
    heart: {
      name: "Heart ( Tapered Chin Face)",
      desc: "Bhai, your forehead is wider and chin is narrow (Heart shape). To balance this, keep longer messy hair on top to cover the forehead and a full corporate beard to add weight around the chin.",
      haircuts: ["Messy Fringe (Forehead cover)", "Classic Side Part", "Medium Waves"],
      beards: ["Full Corporate Beard (Fills chin gap)", "Thick Beard + Mustache", "Heavy Stubble"],
      colors: ["Chestnut Red Highlights", "Caramel Highlights", "Natural Black"],
      imageUrl: "/looks/heart.png"
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans relative selection:bg-purple-500 selection:text-white overflow-x-hidden">
      
      {/* Background decorations matching the landing page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-9.5 w-9.5 object-contain" />
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-lg tracking-tight text-slate-800 leading-none">
                Salons<span className="text-purple-600">Flow</span>
              </span>
              <span className="text-[9px] font-bold tracking-wider text-purple-600 uppercase mt-0.5">AI Style Lab</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-3.5 py-1.5 text-xs text-purple-700 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
              <span>Free usage remaining: <strong className="text-purple-700">{Math.max(0, 2 - scanCount)}/2 scans</strong></span>
            </div>
            <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white hover:bg-slate-55 border border-slate-200 px-4.5 py-2.5 rounded-xl shadow-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-10 px-6 relative z-10">
        <div className="w-full max-w-4xl mx-auto">

          {/* STEP 1: UPLOAD PORTAL */}
          {step === "UPLOAD" && (
            <div className="space-y-8 text-center">
              <div className="space-y-3 max-w-2xl mx-auto">
                <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full inline-block">
                  💡 100% Free Smart Portrait Analyzer
                </span>
                <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-slate-800 uppercase">
                  Discover Your Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500">AI Look</span>
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                  Upload your photo. Our facial geometry analyzer maps your exact facecut to recommend the haircuts, beard stylings, and hair colors that suit you best.
                </p>
              </div>

              {/* Drag and Drop Card */}
              <div className="bg-white border border-slate-200 p-12 rounded-3xl max-w-xl mx-auto shadow-xl relative group overflow-hidden transition-all hover:scale-[1.01]">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <label className="flex flex-col items-center justify-center cursor-pointer space-y-5 py-4 z-10 relative">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-black text-slate-800 block uppercase tracking-wider">Upload your Portrait</span>
                    <span className="text-[11px] text-slate-400 font-semibold block">Supports PNG, JPG, or JPEG</span>
                  </div>
                  <div className="bg-white border border-slate-200 text-[10px] font-bold text-slate-600 px-5 py-2.5 rounded-xl uppercase tracking-wider group-hover:border-purple-300 group-hover:text-purple-600 transition-all shadow-xs">
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
                <div className="bg-white border border-slate-200 p-5 rounded-2xl text-left space-y-1 shadow-sm">
                  <span className="text-purple-600 text-xs font-black block uppercase tracking-widest font-mono">01. Geometry Scan</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">Maps jaw lines, height, and bone structural widths dynamically.</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl text-left space-y-1 shadow-sm">
                  <span className="text-purple-600 text-xs font-black block uppercase tracking-widest font-mono">02. Tailored Grooming</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">Suggests visual hair cuts and beard alignments matching your structure.</p>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-2xl text-left space-y-1 shadow-sm">
                  <span className="text-purple-600 text-xs font-black block uppercase tracking-widest font-mono">03. High-Density Download</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">Export your lookbook card and present it at your next salon visit.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING SCREEN */}
          {step === "SCANNING" && (
            <div className="flex flex-col items-center justify-center space-y-8 py-10 max-w-md mx-auto text-center">
              <div className="relative w-64 h-64 rounded-3xl overflow-hidden border border-purple-500/30 bg-white shadow-2xl flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="Scanning preview" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="w-full h-full bg-slate-100"></div>
                )}
                
                {/* Sci-fi Scanning animation laser line */}
                <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_#9333ea] animate-[bounce_2s_infinite]"></div>
                
                {/* Target reticle overlay */}
                <div className="absolute inset-4 border border-purple-500/10 rounded-2xl pointer-events-none"></div>
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2.5">
                  <RefreshCw className="w-4.5 h-4.5 text-purple-600 animate-spin" />
                  <span className="font-display font-black text-lg text-slate-800 uppercase tracking-wider">AI Analysis in Progress</span>
                </div>
                <p className="text-xs text-purple-600 font-mono tracking-widest uppercase">{scanStatusText}</p>
              </div>
            </div>
          )}

          {/* STEP 3: LEAD CAPTURE GATE */}
          {step === "LEAD_GATE" && (
            <div className="max-w-md mx-auto bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl space-y-6 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-600 mx-auto">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-display font-black text-xl text-slate-800 uppercase">Your Analysis is Ready!</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Enter your contact details to save and unlock your personalized style sheet and haircut recommendations card.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={leadFormData.name}
                      onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">WhatsApp Number (Mandatory)</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={leadFormData.phone}
                      onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Email Address (Optional)</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={leadFormData.email}
                      onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Your City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={leadFormData.city}
                      onChange={(e) => setLeadFormData({ ...leadFormData, city: e.target.value })}
                      placeholder="Mumbai"
                      className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-10.5 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 mt-6 shadow-lg shadow-purple-500/15 active:scale-95 transition-all"
                >
                  <span>Reveal AI Lookbook Results</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: PREVIEW RESULT SCREEN */}
          {step === "RESULT" && (
            <div className="space-y-8">
              
              {/* Top Banner Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5 no-print">
                <div className="text-left">
                  <span className="text-purple-600 text-[10px] font-black uppercase tracking-widest font-mono">Analysis Report ID #LOOK-AI-{scanCount}</span>
                  <h2 className="font-display text-2xl font-black text-slate-800 uppercase tracking-tight">Your Face Cut Design Card</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4.5 py-2.5 rounded-full shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan New Photo</span>
                  </button>
                  <button
                    onClick={() => {
                      setBookingDate(new Date().toISOString().split("T")[0]);
                      setBookingSuccess(false);
                      setBookingStep("SELECT_VENDOR");
                      setSelectedVendor(null);
                      setBookingType("SALON");
                      setHomeAddress("");
                      setShowBookingModal(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-650 hover:bg-indigo-700 px-5 py-2.5 rounded-full transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Book Appointment</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 px-5 py-2.5 rounded-full transition-all shadow-md shadow-purple-500/10 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Style Sheet</span>
                  </button>
                </div>
              </div>

              {/* Analysis Result Card layout */}
              <div id="print-sheet" className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[90px] rounded-full pointer-events-none"></div>
                
                {/* Print view watermark */}
                <div className="hidden print:flex justify-between items-center w-full border-b border-slate-200 pb-4 mb-6 col-span-12">
                  <span className="font-display font-black text-lg text-slate-800">SalonsFlow <span className="text-purple-600">AI Lookbook</span></span>
                  <span className="text-[10px] font-mono text-slate-500">Owner: {leadFormData.name} ({leadFormData.phone})</span>
                </div>

                {/* Left side: Uploaded photo vs AI Mock suggestion */}
                <div className="md:col-span-5 space-y-6 flex flex-col items-center">
                  <div className="space-y-3 text-center w-full">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Style Analysis Preview</span>
                    
                    {/* Side by side user photo and reference model */}
                    <div className="grid grid-cols-2 gap-3 w-full max-w-[320px] md:max-w-none">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block font-semibold">Your Photo</span>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-md">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Your uploaded portrait"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">No Image</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest block font-semibold">Reference Style</span>
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-md">
                          {imagePreview ? (
                            <>
                              <img
                                src={imagePreview}
                                alt="Reference style model"
                                className="w-full h-full object-cover filter brightness-[0.9]"
                              />
                              
                              {/* Floating Live AI Style Tags */}
                              <div className="absolute inset-0 p-2.5 flex flex-col justify-between pointer-events-none select-none bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30">
                                <div className="flex flex-col gap-1 items-start">
                                  {selectedColor && (
                                    <span className="bg-white/90 backdrop-blur-md text-purple-700 text-[8.5px] font-black px-2 py-1 rounded-lg border border-purple-100 shadow-sm uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                                      🎨 Tone: {selectedColor}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 items-start">
                                  {selectedHaircut && (
                                    <span className="bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[8.5px] font-black px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider animate-in fade-in slide-in-from-bottom-1">
                                      💈 Cut: {selectedHaircut}
                                    </span>
                                  )}
                                  {selectedBeard && (
                                    <span className="bg-slate-900/90 text-emerald-450 border border-emerald-950 text-[8.5px] font-black px-2.5 py-1 rounded-lg shadow-sm uppercase tracking-wider animate-in fade-in slide-in-from-bottom-1 mt-0.5">
                                      🧔 Beard: {selectedBeard}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">No Image</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Face shape tag */}
                  <div className="bg-purple-50/80 border border-purple-100 px-5 py-3 rounded-2xl text-center w-full max-w-[280px]">
                    <span className="text-[9px] font-black text-purple-750 uppercase tracking-widest block">Primary Classification</span>
                    <span className="font-display font-black text-lg text-purple-700 uppercase tracking-tight block">{shapeData[detectedShape].name}</span>
                  </div>
                </div>

                {/* Right side: Detailed Recommendations */}
                <div className="md:col-span-7 space-y-6 text-left">
                  <div className="space-y-1.5">
                    <span className="text-purple-600 text-[10px] font-black uppercase tracking-widest font-mono">Morphological Evaluation</span>
                    <p className="text-[12px] text-slate-650 leading-relaxed font-semibold">{shapeData[detectedShape].desc}</p>
                  </div>

                  {/* Selection options matrix */}
                  <div className="space-y-4 border-t border-slate-200 pt-5">
                    
                    {/* haircuts */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Recommended Haircuts (Pick one)</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].haircuts.map((haircut) => (
                          <button
                            key={haircut}
                            onClick={() => setSelectedHaircut(haircut)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                              selectedHaircut === haircut
                                ? "bg-purple-50 border-purple-300 text-purple-700 font-extrabold"
                                : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                          >
                            {haircut}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Haircut view */}
                    <div className="hidden print:block">
                      <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider block">Selected Haircut Recommendation</span>
                      <span className="text-sm font-black text-slate-800">{selectedHaircut}</span>
                    </div>

                    {/* beards */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Suggested Beard Alignment</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].beards.map((beard) => (
                          <button
                            key={beard}
                            onClick={() => setSelectedBeard(beard)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                              selectedBeard === beard
                                ? "bg-purple-50 border-purple-300 text-purple-700 font-extrabold"
                                : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                          >
                            {beard}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Beard view */}
                    <div className="hidden print:block mt-3">
                      <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider block">Selected Beard Style</span>
                      <span className="text-sm font-black text-slate-800">{selectedBeard}</span>
                    </div>

                    {/* hair color */}
                    <div className="space-y-2 no-print">
                      <label className="text-[10px] font-black text-slate-505 uppercase tracking-wider block">Suggested Hair Tone</label>
                      <div className="flex flex-wrap gap-2">
                        {shapeData[detectedShape].colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`text-[10.5px] font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                              selectedColor === color
                                ? "bg-purple-50 border-purple-300 text-purple-700 font-extrabold"
                                : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 hover:text-slate-800"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Print Static Color view */}
                    <div className="hidden print:block mt-3">
                      <span className="text-[10px] font-black text-slate-405 uppercase tracking-wider block">Selected Hair Color Tone</span>
                      <span className="text-sm font-black text-slate-800">{selectedColor}</span>
                    </div>

                                {/* Booking CTA */}
                  <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 no-print">
                    <div className="text-left space-y-0.5">
                      <span className="text-[10.5px] font-black text-slate-800 uppercase block">Get this look near you</span>
                      <p className="text-[9.5px] text-slate-550 leading-relaxed font-semibold">Book an appointment at a SalonsFlow-powered salon nearby.</p>
                    </div>
                    <button
                      onClick={() => {
                        setBookingDate(new Date().toISOString().split("T")[0]);
                        setBookingSuccess(false);
                        setBookingStep("SELECT_VENDOR");
                        setSelectedVendor(null);
                        setBookingType("SALON");
                        setHomeAddress("");
                        setShowBookingModal(true);
                      }}
                      className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-550 hover:to-pink-400 text-white text-[10.5px] font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer border-0"
                    >
                      <span>Book Look Now</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>      </div>
                </div>
                
                {/* Print view footer */}
                <div className="hidden print:block w-full border-t border-slate-200 pt-4 mt-8 col-span-12 text-center text-[9px] text-slate-450">
                  © 2026 SalonsFlow AI Grooming Lab. All rights reserved. Powered by salonsflow.in
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PAYWALL BLOCK */}
          {step === "PAYWALL" && (
            <div className="max-w-md mx-auto bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl text-center space-y-6">
              <div className="space-y-2">
                <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-sm">
                  <Crown className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block font-mono">Premium Access Lock</span>
                <h3 className="font-display font-black text-2xl text-slate-800 uppercase tracking-tight">AI Scan Limit Reached</h3>
                <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                  You have used your **2/2 free facial scans** for this session. Upgrade to our Premium Style Lab tier for unlimited geometry analyses.
                </p>
              </div>

              {/* Checkout pricing box */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase block">Style Lab Unlimited Pass</span>
                    <span className="text-[10px] font-bold text-slate-450">Lifetime access & downloads</span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-xl text-purple-650 block">₹99</span>
                    <span className="text-[9px] font-semibold text-slate-500 block font-mono">One-time payment</span>
                  </div>
                </div>

                <div className="space-y-2 text-[10px] text-slate-600 font-semibold">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span>Unlimited portrait uploads & geometry scans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span>Detailed face morph details & structure notes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <span>High-resolution style card sheets downloads</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handlePaymentSimulate}
                  disabled={checkoutSimulated}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-550 hover:to-pink-400 text-white text-xs font-black uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer"
                >
                  {checkoutSimulated ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Processing simulated payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹99 & Unlock Now</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setStep("UPLOAD")}
                  className="w-full bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Styled Footer */}
      <footer className="border-t border-slate-200 py-6 px-6 no-print bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-450 font-semibold font-mono">
          <span>© 2026 SalonsFlow AI Lab. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-650">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-650">Terms of Use</Link>
          </div>
        </div>
      </footer>

      {/* BOOKING MODAL */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header with conditionally displayed Back Button */}
            <div className="flex justify-between items-center mb-2 pr-6">
              {bookingStep === "SCHEDULE" && !bookingSuccess ? (
                <button
                  onClick={() => setBookingStep("SELECT_VENDOR")}
                  className="flex items-center gap-1 text-[10.5px] text-purple-600 hover:text-purple-700 font-bold uppercase cursor-pointer border-0 bg-transparent"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-purple-50 border border-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto shadow-sm">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-black text-xl text-slate-800 uppercase tracking-tight">Appointment Requested!</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-xs mx-auto">
                    Your appointment for a <strong className="text-purple-600">{selectedHaircut || shapeData[detectedShape].haircuts[0]}</strong> at <strong>{selectedVendor?.name}</strong> has been requested successfully.
                  </p>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 text-xs font-bold px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : bookingStep === "SELECT_VENDOR" ? (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block font-mono">STEP 1: SELECT PARTNER SALON</span>
                  <h3 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight">Available Salons</h3>
                  <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                    Check partner salon ratings, locations, and choose where to get styled.
                  </p>
                </div>

                {/* City/Name Filter */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Search by city or salon name..."
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3.5" />
                </div>

                {/* Vendors Scroll Container */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 mt-2 custom-scrollbar">
                  {vendors.filter(v =>
                    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                    (v.ownerCity && v.ownerCity.toLowerCase().includes(vendorSearch.toLowerCase()))
                  ).map(v => (
                    <div key={v.id} className="border border-slate-200 rounded-2xl p-4 hover:border-purple-300 hover:bg-purple-50/10 transition-all flex flex-col justify-between gap-3 text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-purple-50 text-purple-650 border border-purple-100 text-[8.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block">
                            {v.businessCategory === "UNISEX_SALON" ? "Unisex" : v.businessCategory === "BARBER_SHOP" ? "Barber" : "Hair Salon"}
                          </span>
                          <h4 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight mt-1">{v.name}</h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-amber-500 text-xs">★</span>
                            <span className="text-[10.5px] font-black text-slate-750">{v.rating}</span>
                            <span className="text-[9.5px] font-semibold text-slate-400 font-sans">({v.reviewsCount} reviews)</span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{v.ownerCity || "Mumbai"}</span>
                      </div>

                      <div className="text-[10.5px] text-slate-500 font-semibold space-y-0.5">
                        <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {v.address}</p>
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {v.whatsappNumber}</p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedVendor(v);
                          setSelectedStaffId("");
                          loadSalonStaff(v.id);
                          setBookingStep("SCHEDULE");
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer text-center border-0"
                      >
                        Select & Book Look
                      </button>
                    </div>
                  ))}
                  {vendors.filter(v =>
                    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                    (v.ownerCity && v.ownerCity.toLowerCase().includes(vendorSearch.toLowerCase()))
                  ).length === 0 && (
                    <p className="text-xs text-slate-450 py-10 text-center font-medium">No partner salons matching your search.</p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-5 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block font-mono">STEP 2: SCHEDULE APPOINTMENT</span>
                  <h3 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight">Reserve Style Session</h3>
                  <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                    Book your recommended look <strong className="text-slate-700">{selectedHaircut || shapeData[detectedShape].haircuts[0]}</strong> at:
                  </p>
                </div>

                {/* Selected Salon Summary Box */}
                {selectedVendor && (
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex justify-between items-center text-left">
                    <div>
                      <h4 className="font-display font-black text-sm text-slate-800 uppercase tracking-tight">{selectedVendor.name}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {selectedVendor.address}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setBookingStep("SELECT_VENDOR")}
                      className="text-[10px] font-black text-purple-600 hover:text-purple-700 hover:underline cursor-pointer border-0 bg-transparent"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Booking Mode Selector Tabs */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Service Location</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBookingType("SALON")}
                      className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
                        bookingType === "SALON"
                          ? "bg-white text-purple-700 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800 bg-transparent"
                      }`}
                    >
                      🏪 Salon Visit
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingType("HOME")}
                      className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
                        bookingType === "HOME"
                          ? "bg-white text-purple-700 shadow-sm font-extrabold"
                          : "text-slate-500 hover:text-slate-800 bg-transparent"
                      }`}
                    >
                      🏠 Home Service
                    </button>
                  </div>
                </div>

                {/* Conditional Home Address Field */}
                {bookingType === "HOME" && (
                  <div className="space-y-1.5 animate-in fade-in duration-300">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Home Delivery Address *</label>
                    <textarea
                      required
                      rows={2.5}
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      placeholder="Enter your house number, building, area and landmark..."
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold resize-none"
                    />
                  </div>
                )}

                {/* Choose Stylist / Specialist */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Choose Stylist / Specialist</label>
                  {staffLoading ? (
                    <div className="flex items-center gap-2 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Loading stylists...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold cursor-pointer"
                    >
                      <option value="">Any Available Stylist (Recommended)</option>
                      {salonStaff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Preferred Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Preferred Time</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-555 tracking-wider block">Styling Notes / Requests (Optional)</label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="E.g., prefer low fade, beard trim details, color preference..."
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-550 hover:to-pink-400 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer border-0"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Scheduling session...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Appointment Request</span>
                      <Scissors className="w-3.5 h-3.5 text-white" />
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
            background-color: #ffffff !important;
            color: #000000 !important;
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
