"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  ArrowRight,
  Play,
  Server,
  Layers,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  User,
  CheckCircle2,
  Mic,
  ArrowUpRight,
  X,
  Database,
  Cpu,
  RefreshCw,
  Star,
  DollarSign,
  ChevronDown,
  Menu,
  Check,
  Award
} from "lucide-react";

// Types for Chat Simulator
interface ChatMessage {
  sender: "customer" | "ai";
  text: string;
  isVoice?: boolean;
}

interface SimulatorScenario {
  title: string;
  description: string;
  icon: any;
  messages: ChatMessage[];
  calendarHighlightHour: string;
  calendarHighlightService: string;
}

export default function Home() {
  const router = useRouter();
  
  // Navigation Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active feature tab state
  const [activeTab, setActiveTab] = useState<"receptionist" | "multilingual" | "rebooking">("receptionist");
  
  // Billing cycle state for homepage pricing block
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

  // Book Demo Popup Modal State
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoFormSubmitSuccess, setDemoFormSubmitSuccess] = useState(false);
  const [demoFormData, setDemoFormData] = useState({
    name: "",
    phone: "",
    email: "",
    salonName: "",
    city: "Mumbai",
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Public Direct Booking Modal States
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
  const [bookingStep, setBookingStep] = useState<"GUEST_INFO" | "SELECT_VENDOR" | "SCHEDULE">("GUEST_INFO");
  const [bookingType, setBookingType] = useState<"SALON" | "HOME">("SALON");
  const [homeAddress, setHomeAddress] = useState("");
  const [salonStaff, setSalonStaff] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

  // Guest customer states
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const loadVendorsList = async () => {
    try {
      setVendorsLoading(true);
      const response = await fetch(`${apiUrl}/api/v1/public/salons`);
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
            homeBookingFee: v.homeBookingFee !== null && v.homeBookingFee !== undefined ? v.homeBookingFee : 0,
            rating: (4.5 + (index % 5) * 0.1).toFixed(1),
            reviewsCount: (80 + (index % 10) * 15).toString()
          }));
          setVendors(mapped);
          setVendorsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error loading vendors:", err);
    }
    setVendors([]);
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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime || !selectedVendor || !guestName || !guestPhone) return;
    if (bookingType === "HOME" && !homeAddress.trim()) {
      alert("Please enter your home address for doorstep service.");
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
          name: guestName,
          phone: guestPhone,
          date: bookingDate,
          time: bookingTime,
          haircut: "Regular Cut / Styling",
          salonId: selectedVendor.id,
          staffId: selectedStaffId || undefined,
          notes: `[Direct Client Booking] Type: ${typeLabel}.${addressNotes}${staffNotes}\nPartner Salon: ${selectedVendor.name}.\nCustomer Notes: ${bookingNotes}`
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

  useEffect(() => {
    loadVendorsList();
  }, []);

  // ROI Calculator States
  const [dailyBookingsLost, setDailyBookingsLost] = useState(3);
  const [averageTicketPrice, setAverageTicketPrice] = useState(500);
  const [monthlyStaffSalary, setMonthlyStaffSalary] = useState(15000);

  // Calculated ROI Metrics
  const calculatedMonthlyLeakage = dailyBookingsLost * averageTicketPrice * 30;
  const calculatedYearlySavings = (calculatedMonthlyLeakage + (monthlyStaffSalary - 3999)) * 12;

  // Dashboard entry loader state
  const [isEnteringDashboard, setIsEnteringDashboard] = useState(false);
  const [loaderLogs, setLoaderLogs] = useState<string[]>([]);
  const [loaderProgress, setLoaderProgress] = useState(0);

  // Chat simulator state
  const [activeScenario, setActiveScenario] = useState<"booking" | "voice" | "reschedule">("booking");
  const [simStep, setSimStep] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // FAQ Active Index
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Scenarios data
  const scenarios: Record<"booking" | "voice" | "reschedule", SimulatorScenario> = {
    booking: {
      title: "Hinglish Booking",
      description: "AI handles colloquial text instantly",
      icon: MessageSquare,
      calendarHighlightHour: "06:00 PM",
      calendarHighlightService: "Haircut & Shave",
      messages: [
        { sender: "customer", text: "Bhaiya, Haircut aur shave ke liye aaj shaam 6:00 baje time milega?" },
        { sender: "ai", text: "Ji haan! Shaam 6:00 PM baje hamare top stylist Rahul aur Amit dono free hain. Kya main aapka slot Rahul ke sath block kar doon?" },
        { sender: "customer", text: "Haan please, Rahul ke sath lock kar do." },
        { sender: "ai", text: "Done! Aapka appointment confirm ho gaya hai. 📅 Aaj Shaam 6:00 PM - Haircut & Beard with Rahul. Aapke calendar pe slot send kar diya hai!" }
      ]
    },
    voice: {
      title: "Voice Note Parsing",
      description: "AI transcribes and books voice notes",
      icon: Mic,
      calendarHighlightHour: "11:00 AM",
      calendarHighlightService: "Pedicure & Facial",
      messages: [
        { sender: "customer", text: "🎤 (Voice Note - 0:08) 'Hey, me and my sister want to book a facial and pedicure tomorrow morning around 11.'", isVoice: true },
        { sender: "ai", text: "Transcribing Audio... 📝 'facial and pedicure tomorrow morning around 11'.\n\nI found 2 slots together at 11:00 AM tomorrow with Priya and Ritu. Should I book them?" },
        { sender: "customer", text: "Yes please, book it!" },
        { sender: "ai", text: "Perfect! 2 Appointments confirmed for tomorrow at 11:00 AM (Pedicure & Facial). See you both tomorrow!" }
      ]
    },
    reschedule: {
      title: "Self-Serve Reschedule",
      description: "AI handles calendar updates",
      icon: RefreshCw,
      calendarHighlightHour: "05:00 PM",
      calendarHighlightService: "Deep Tissue Massage",
      messages: [
        { sender: "customer", text: "Hi, can I reschedule my massage from 4 PM to 5 PM today?" },
        { sender: "ai", text: "Checking current schedule... Yes, 5:00 PM is available. Would you like to move your Deep Tissue Massage appointment to 5:00 PM?" },
        { sender: "customer", text: "Yes, that works better. Thanks!" },
        { sender: "ai", text: "Updated! 🔄 Your appointment has been moved to 5:00 PM today. The 4:00 PM slot has been released back to our inventory." }
      ]
    }
  };

  // Run chat simulator animation loop
  useEffect(() => {
    if (userInteracted) return;

    setVisibleMessages([]);
    setSimStep(0);
    setIsTyping(false);
    
    let active = true;
    const scenario = scenarios[activeScenario];
    
    const playNextMessage = async (stepIndex: number) => {
      if (!active || stepIndex >= scenario.messages.length) return;
      
      const message = scenario.messages[stepIndex];
      
      if (message.sender === "ai") {
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, 1600));
        if (!active) return;
        setIsTyping(false);
      } else {
        await new Promise((r) => setTimeout(r, 800));
        if (!active) return;
      }
      
      setVisibleMessages((prev) => [...prev, message]);
      setSimStep(stepIndex + 1);
      
      playNextMessage(stepIndex + 1);
    };

    playNextMessage(0);

    return () => {
      active = false;
    };
  }, [activeScenario, userInteracted]);

  const handleSendCustomMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    
    setUserInteracted(true);
    const userMsg: ChatMessage = { sender: "customer", text: customInput.trim() };
    setVisibleMessages((prev) => [...prev, userMsg]);
    const typedText = customInput.toLowerCase();
    setCustomInput("");
    setIsTyping(true);
    
    // Simulate AI response based on typedText keyword classifier
    setTimeout(() => {
      let aiText = "";
      if (typedText.includes("cancel") || typedText.includes("cancellation") || typedText.includes("change")) {
        aiText = "Ji bilkul! Main aapka slot cancel/change kar sakti hoon. Kya aap koi aur time ya date select karna chahte hain?";
      } else if (typedText.includes("price") || typedText.includes("charges") || typedText.includes("rate") || typedText.includes("cost") || typedText.includes("rate list")) {
        aiText = "Ji! Hamare Salon pe Haircut ₹500 se start hota hai aur Deep Tissue Massage ₹1500 ka hai. Kis service ki pricing details chahiye aapko?";
      } else if (typedText.includes("time") || typedText.includes("slot") || typedText.includes("aaj") || typedText.includes("appointment") || typedText.includes("book")) {
        aiText = "Haanji, aaj shaam ko 5:00 PM aur 6:00 PM pe slots free hain. Amit aur Rahul dono stylists available hain. Kya main aapka slot book kar doon?";
      } else if (typedText.includes("hi") || typedText.includes("hello") || typedText.includes("hey") || typedText.includes("bhaiya")) {
        aiText = "Hello! SalonsFlow AI Autopilot Receptionist me aapka swagat hai. Main aapki kya sahayata kar sakti hoon? Slot book karna hai ya details chahiye?";
      } else {
        aiText = "Ji bilkul! Main samajh gayi. Aapke request ke hisab se hum Ritu ke sath slot block kar sakte hain. Please confirm kijiye ki aap kab aana chahte hain?";
      }
      
      setVisibleMessages((prev) => [...prev, { sender: "ai", text: aiText }]);
      setIsTyping(false);
    }, 1200);
  };

  // Dashboard Loader Sequence Simulation
  const triggerDashboardEntry = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEnteringDashboard(true);
    setLoaderLogs([]);
    setLoaderProgress(0);

    const logs = [
      "Establishing connection to Meta Cloud API...",
      "Resolving multi-tenant PostgreSQL schema boundaries...",
      "Fetching security tokens from Clerk authentication provider...",
      "Activating OpenAI Hinglish voice-to-text nodes...",
      "Retrieving current salon cash drawer float logs...",
      "Synchronizing live booking slots calendar...",
      "Redirecting to Platform Operations Center..."
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setLoaderLogs((prev) => [...prev, logs[currentLogIndex]]);
        setLoaderProgress((prev) => Math.min(prev + 15, 100));
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
        setLoaderProgress(100);
        setTimeout(async () => {
          try {
            const storedToken = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
            if (storedToken && storedToken.startsWith("dev-bypass-token")) {
              router.push("/dashboard");
              return;
            }
            const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const response = await fetch(`${apiUrl}/api/v1/salons/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
              const salon = await response.json();
              if (salon.isProfileComplete) {
                router.push("/dashboard");
              } else {
                router.push("/onboarding");
              }
            } else {
              router.push("/dashboard");
            }
          } catch (err) {
            console.error("Failed to check salon profile status:", err);
            router.push("/dashboard");
          }
        }, 600);
      }
    }, 450);
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoFormData.name || !demoFormData.phone) return;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    try {
      await fetch(`${apiUrl}/api/v1/public/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(demoFormData),
      });
    } catch (err) {
      console.error("Failed to submit lead request to backend:", err);
    }

    setDemoFormSubmitSuccess(true);
    setTimeout(() => {
      setDemoModalOpen(false);
      setDemoFormSubmitSuccess(false);
      setDemoFormData({ name: "", phone: "", email: "", salonName: "", city: "Mumbai" });
    }, 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden relative selection:bg-purple-500 selection:text-white">
      
      {/* Premium background engineering grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4] pointer-events-none"></div>

      {/* Ambient glowing layers */}
      <div className="absolute top-[-5%] left-[-10%] w-[50%] h-[40%] bg-purple-500/5 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-pink-500/5 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-5%] w-[50%] h-[50%] bg-indigo-500/5 blur-[160px] rounded-full pointer-events-none"></div>

      {/* Sticky Premium Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-9.5 w-9.5 object-contain" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-lg tracking-tight text-slate-850 font-display leading-none">
                Salons<span className="text-purple-600 font-black">Flow</span>
              </span>
              <span className="text-[9px] font-bold text-purple-600 tracking-wider uppercase mt-1">
                Grow While You Style
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link>
            <Link href="/haircut-advisor" className="hover:text-purple-600 text-purple-600 transition-colors flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" /> AI Style Lab</Link>
            <button
              onClick={() => {
                setBookingDate(new Date().toISOString().split("T")[0]);
                setBookingSuccess(false);
                setBookingStep("GUEST_INFO");
                setSelectedVendor(null);
                setBookingType("SALON");
                setHomeAddress("");
                setSelectedStaffId("");
                setShowBookingModal(true);
              }}
              className="hover:text-emerald-700 text-emerald-600 transition-colors flex items-center gap-1 uppercase tracking-wider border-0 bg-transparent cursor-pointer font-bold font-sans text-xs"
            >
              <Calendar className="w-3 h-3 text-emerald-600" /> Book Visit
            </button>
            <a href="#solutions" className="hover:text-slate-900 transition-colors">Solutions</a>
            <a href="#roi" className="hover:text-slate-900 transition-colors">ROI Calculator</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQs</a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-5">
            <button
              onClick={() => setDemoModalOpen(true)}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Book Demo
            </button>
            <Link
              href="/login"
              className="text-xs font-bold text-slate-750 bg-slate-105 hover:bg-slate-200 border border-slate-200 px-5 py-2.5 rounded-xl transition-all duration-200 shadow-xs hover:text-slate-900"
            >
              Login
            </Link>
          </div>

          {/* Mobile Hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-6 flex flex-col gap-4 text-sm font-bold text-slate-600 animate-in slide-in-from-top-4 duration-200 shadow-lg">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors py-1">Features</a>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors py-1">Pricing</Link>
            <Link href="/haircut-advisor" onClick={() => setMobileMenuOpen(false)} className="hover:text-purple-700 text-purple-600 transition-colors py-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-purple-650 animate-pulse" /> AI Style Lab</Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setBookingDate(new Date().toISOString().split("T")[0]);
                setBookingSuccess(false);
                setBookingStep("GUEST_INFO");
                setSelectedVendor(null);
                setBookingType("SALON");
                setHomeAddress("");
                setSelectedStaffId("");
                setShowBookingModal(true);
              }}
              className="hover:text-emerald-700 text-emerald-600 transition-colors py-1 flex items-center gap-1 uppercase tracking-wider border-0 bg-transparent cursor-pointer font-bold font-sans text-sm text-left"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Book Visit
            </button>
            <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors py-1">Solutions</a>
            <a href="#roi" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors py-1">ROI Calculator</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors py-1">FAQs</a>
            <hr className="border-slate-100 my-2" />
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setDemoModalOpen(true);
              }}
              className="text-left py-1 text-purple-600 hover:text-purple-500 font-bold"
            >
              Book Demo
            </button>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-3 rounded-xl hover:bg-slate-200 transition-all text-xs"
            >
              Login
            </Link>
          </div>
        )}
      </header>

       {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 max-w-7xl mx-auto z-10 w-full">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column (Text & CTAs) */}
          <div className="lg:col-span-7 text-left space-y-8 relative">
            <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-4.5 py-1.5 text-xs font-bold text-purple-700 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" /> Stop Handling Calendars. Hire AI.
            </div>
            
            <h1 className="text-4xl sm:text-6xl lg:text-[60px] font-black tracking-tight leading-[1.05] text-slate-800 font-display">
              The 24/7 AI Receptionist <br />
              <span className="bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 bg-clip-text text-transparent">
                Built for Indian Salons.
              </span>
            </h1>
            
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">
              SalonsFlow deploys an autonomous AI receptionist directly on your official WhatsApp Business number. It books appointments in Hinglish, converts missed calls into sales, details commissions, and updates your register instantly.
            </p>
            
            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-4">
              <Link
                href="/sign-up"
                className="group flex items-center justify-center gap-2 h-13 px-8 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-550 hover:to-pink-400 text-white font-bold tracking-wide transition-all shadow-md active:scale-95 duration-200 hover:-translate-y-0.5 text-xs uppercase rounded-xl border-0"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="flex items-center justify-center gap-2.5 h-13 px-8 bg-white hover:bg-slate-50 border border-slate-200 active:bg-slate-100 rounded-xl text-slate-700 hover:text-slate-900 font-bold tracking-wide transition-all duration-200 active:scale-95 hover:-translate-y-0.5 text-xs uppercase shadow-xs cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
                Explore Demo Mode
              </Link>
            </div>

            {/* AI Lookbook Highlight Box */}
            <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl flex items-center justify-between gap-4 mt-6 max-w-lg text-left shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest block font-mono">🔥 Free AI Feature Added</span>
                <span className="text-xs font-black text-slate-800 uppercase block">AI Haircut & Style Advisor</span>
                <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">Upload your photo, analyze your face shape, and get custom recommendations.</p>
              </div>
              <Link
                href="/haircut-advisor"
                className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-[10.5px] font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-1 hover:-translate-y-0.5 active:scale-95 transition-all shadow shadow-purple-500/10"
              >
                <span>Try AI Lab</span>
                <ArrowRight className="w-3 h-3 text-white" />
              </Link>
            </div>

            {/* Direct Booking Highlight Box */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between gap-4 mt-4 max-w-lg text-left shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block font-mono">⚡ Direct Client Booking</span>
                <span className="text-xs font-black text-slate-800 uppercase block">Book Partner Salon or Home Visit</span>
                <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">Instantly reserve a slot at any nearby vendor salon or get doorstep services.</p>
              </div>
              <button
                onClick={() => {
                  setBookingDate(new Date().toISOString().split("T")[0]);
                  setBookingSuccess(false);
                  setBookingStep("GUEST_INFO");
                  setSelectedVendor(null);
                  setBookingType("SALON");
                  setHomeAddress("");
                  setSelectedStaffId("");
                  setShowBookingModal(true);
                }}
                className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-1 hover:-translate-y-0.5 active:scale-95 transition-all shadow border-0 cursor-pointer"
              >
                <span>Book Appointment</span>
                <Calendar className="w-3 h-3 text-white" />
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="pt-8 border-t border-slate-200 flex flex-wrap gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-purple-650" /> No Card Required
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-pink-500" /> Sandbox Simulator
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Meta Authorized
              </div>
            </div>
          </div>

          {/* Right Column (Hero Illustration Image & Floating Widgets) */}
          <div className="lg:col-span-5 relative flex justify-center w-full">
            {/* Ambient backdrop glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent blur-3xl rounded-3xl pointer-events-none"></div>
            
            {/* Styled Frame for Illustration */}
            <div className="relative border border-slate-200 bg-white p-3 rounded-3xl shadow-2xl max-w-md w-full z-10 transition-transform duration-500 hover:scale-[1.02]">
              <img 
                src="/hero-illustration.png" 
                alt="SalonsFlow Platform Operations" 
                className="w-full rounded-2xl object-cover shadow-sm aspect-square bg-slate-50"
              />
            </div>

            {/* Floating 3D widgets positioned relative to the image on desktop */}
            <div className="hidden lg:block absolute -left-12 top-8 bg-white border border-slate-200/80 backdrop-blur-md rounded-2xl p-4 text-left shadow-lg max-w-[180px] z-20 animate-float">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping"></span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Hinglish Agent NLP</span>
              </div>
              <p className="text-[9px] text-slate-700 font-semibold leading-relaxed">
                "Bhaiya, kal shaam 6 baje Rahul ke sath block kar do."
              </p>
            </div>

            <div className="hidden lg:block absolute -right-12 bottom-12 bg-white border border-slate-200/80 backdrop-blur-md rounded-2xl p-4 text-left shadow-lg max-w-[170px] z-20 animate-float-delay-1">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-3.5 w-3.5 text-purple-650 animate-pulse" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Revenue Saved</span>
              </div>
              <span className="text-lg font-black text-slate-800 font-display block">₹42,800</span>
              <span className="text-[8px] text-purple-600 font-bold uppercase tracking-wider">autonomously saved</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Visual Mockup Grid */}
      <section className="relative pb-24 px-6 max-w-6xl mx-auto z-10 w-full">
        <div className="grid gap-6 md:grid-cols-2 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent blur-2xl rounded-3xl pointer-events-none"></div>

          {/* Chat Simulator Panel */}
          <div className="bg-zinc-900/50 border border-zinc-850 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
            <div className="bg-[#0b141a] px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8.5 w-8.5 bg-purple-950 text-purple-400 border border-purple-900/40 rounded-full flex items-center justify-center font-bold text-xs">AI</div>
                <div>
                  <div className="text-[12px] font-bold text-zinc-100 flex items-center gap-1.5 font-display">
                    SalonsFlow Autopilot
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-ping"></span>
                  </div>
                  <span className="text-[9px] font-semibold text-pink-455">Receptionist Active</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {(["booking", "voice", "reschedule"] as const).map((scen) => (
                  <button
                    key={scen}
                    onClick={() => {
                      setUserInteracted(false);
                      setActiveScenario(scen);
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all duration-200 cursor-pointer ${
                      activeScenario === scen && !userInteracted
                        ? "bg-purple-650 text-white shadow-sm"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-750"
                    }`}
                  >
                    {scen}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0b141a]/40 scrollbar-thin">
              {visibleMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "customer" 
                      ? "bg-[#6c5dd3] text-white rounded-tr-none shadow-md" 
                      : "bg-[#202c33] text-neutral-100 rounded-tl-none shadow-md"
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className="text-[9px] text-zinc-405 block text-right mt-1.5 font-light">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender === "ai" && <span className="text-purple-400 ml-1 font-semibold">✓✓</span>}
                    </span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] border border-zinc-800/80 rounded-2xl px-4 py-2.5 flex gap-1 items-center">
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Interactive Chat Input Form */}
            <form onSubmit={handleSendCustomMessage} className="bg-[#0b141a] px-3.5 py-2.5 border-t border-zinc-800/60 flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Or try typing yourself (e.g. Bhaiya, 5 PM rate list?)..."
                className="flex-1 bg-[#202c33] border border-zinc-800/50 text-[11px] text-zinc-100 placeholder-zinc-555 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
              />
              <button
                type="submit"
                className="bg-purple-650 hover:bg-purple-600 text-white font-extrabold text-[10px] uppercase px-4 py-2 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer shadow-md"
              >
                Send
              </button>
            </form>
          </div>

          {/* Calendar Sync Preview */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[400px]">
            <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-650" />
                Live Sync Calendar
              </span>
              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">Active Sync</span>
            </div>
            <div className="p-4 space-y-3.5 overflow-y-auto">
              {[
                { time: "04:00 PM", client: "Rohan Kumar", service: "Charcoal Facial", staff: "Amit", status: "Completed" },
                { time: "05:00 PM", client: "Anjali Singh", service: "Aroma Therapy Massage", staff: "Rahul", status: "In Progress" },
                { time: "06:00 PM", client: scenarios[activeScenario].calendarHighlightService, service: "AI Autopilot Reservation", staff: "Ritu", status: "Reserved by AI" }
              ].map((slot, i) => (
                <div key={i} className="p-3.5 border border-slate-150 rounded-2xl bg-slate-50/30 text-xs flex items-center justify-between hover:border-purple-300 hover:bg-slate-50 transition-all">
                  <div className="space-y-1 text-left">
                    <span className="text-[9px] font-bold text-purple-600 block">{slot.time}</span>
                    <h5 className="font-bold text-slate-700">{slot.client}</h5>
                    <p className="text-slate-500 text-[10px]">{slot.service} with {slot.staff}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2.5 py-0.75 rounded-lg border ${
                    slot.status.includes("AI") || slot.status.includes("Reserved")
                      ? "bg-purple-50 text-purple-700 border-purple-200" 
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solutions / Categories Section */}
      <section id="solutions" className="py-24 border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="max-w-xl mx-auto mb-16 space-y-3">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              Category Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight font-display">Custom Platform Configurations</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              We provision isolated database schemas and automation rule engines specifically optimized for your category.
            </p>
          </div>

          <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Premium Hair Salons", icon: "💇", desc: "Stylist concurrent slot logs, tier-based slab commission split ledgers, checkouts." },
              { title: "Modern Barbershops", icon: "💈", desc: "Fast walk-in/queue allocations, automated Hinglish rebooking recommendation links." },
              { title: "Nail & Lash Studios", icon: "💅", desc: "Independent booking logs by nail artist, inventory consumption tracking models." },
              { title: "Day Spas & Wellness", icon: "💆", desc: "Therapy room capacity allocation templates, customized package slab ledger limits." },
              { title: "Aesthetics & Skin Clinics", icon: "🏥", desc: "Safe client history charts, skin service recurring treatment timeline models." },
              { title: "Bridal & Makeup Studios", icon: "💄", desc: "Peak wedding date slot lock limits, advanced deposits terminal sync models." },
              { title: "Massage Therapy Parlors", icon: "🌿", desc: "Commission slab payout rules by therapist, oil and material stock ledger track." },
              { title: "Tattoo & Piercing Parlors", icon: "🎨", desc: "Artist roster booking slots, consent form waiver records linked to CRM cards." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-6 rounded-3xl text-left hover:border-purple-300 hover:bg-slate-50/50 hover:translate-y-[-4px] transition-all duration-300 shadow-sm">
                <span className="text-3xl block mb-4">{item.icon}</span>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 mb-1.5 font-display uppercase tracking-wide">{item.title}</h4>
                <p className="text-slate-500 text-[10px] leading-relaxed font-semibold">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6 z-10 relative">
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
          <span className="text-[10px] font-bold text-purple-650 uppercase tracking-widest bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
            Core Modules
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-800 font-display">Deep Platform Breakdown</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            Everything you need to automate reservations, verify checkout registers, and reward repeat clients.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            { num: "01", title: "AI Receptionist Autopilot", desc: "Processes inbound WhatsApp messages using custom prompts, qualifying slots, and upselling services autonomously." },
            { num: "02", title: "Smart Client Database", desc: "Unified CRM console mapping past visit histories, preferred stylists, and automatic WhatsApp loyalty tags." },
            { num: "03", title: "WhatsApp Meta API Link", desc: "Binds your official WABA number to dispatch automated appointment alerts, invoices, and review cards." },
            { num: "04", title: "AI Haircut & Style Advisor", desc: "Analyzes client selfies using face shape detection (oval, round, square, heart) to recommend matching cuts." },
            { num: "05", title: "Home & Doorstep Services", desc: "Allows clients to book doorstep appointments. Salons can fix custom home service convenience fees dynamically." },
            { num: "06", title: "Inbound Missed Call Automation", desc: "Intercepts missed client calls instantly, triggering automated WhatsApp booking menus to convert callers." },
            { num: "07", title: "Hinglish Voice Note Parsing", desc: "Transcribes customer Hinglish/Hindi audio notes atomically into date, time, and service slot coordinates." },
            { num: "08", title: "Partner Salon Overflow Routing", desc: "Automatically suggests near-by partner salons in your network if your primary calendar is fully booked." },
            { num: "09", title: "POS Digital Billing Console", desc: "Tracks cash drawers, splits card/cash invoices, prints GST receipts, and auto-calculates commissions." },
            { num: "10", title: "Stylist Commission Ledger", desc: "Supports tier-based slabs, custom stylist split ratios, and automatic payroll calculation." },
            { num: "11", title: "Google Reviews Collection", desc: "Dispatches review prompt cards 60 minutes post-billing to elevate local SEO search rankings." },
            { num: "12", title: "Instant Sandbox Simulator", desc: "Enables instant simulator testing of Hinglish dialogues without setting up Meta developer credentials." }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/70 border border-slate-200/80 backdrop-blur-xs p-8 rounded-3xl hover:border-purple-300 hover:bg-slate-50/50 hover:-translate-y-1 transition-all duration-300 text-left group relative shadow-xs">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl rounded-full group-hover:bg-purple-500/10 pointer-events-none"></div>
              <span className="text-[9px] font-mono text-purple-600 font-bold block mb-1">MODULE {item.num}</span>
              <h4 className="font-bold text-sm text-slate-800 mb-2 uppercase tracking-wide font-display">{item.title}</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed font-semibold">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section id="roi" className="py-24 border-t border-slate-200 bg-slate-100/30 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-3 mb-12">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              ROI Calculator
            </span>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight font-display">Calculate Your AI Earnings Recovery</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Verify how much revenue is lost to missed call drops and how much is recovered by the AI Receptionist.
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-md grid gap-8 md:grid-cols-2 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Daily Missed Calls (Lost)</span>
                  <span className="text-purple-600 font-extrabold">{dailyBookingsLost} bookings</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={dailyBookingsLost}
                  onChange={(e) => setDailyBookingsLost(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-650 border border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Average Service Ticket (₹)</span>
                  <span className="text-purple-650 font-extrabold">₹{averageTicketPrice}</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={averageTicketPrice}
                  onChange={(e) => setAverageTicketPrice(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-650 border border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-500">Monthly Receptionist Salary (₹)</span>
                  <span className="text-purple-650 font-extrabold">₹{monthlyStaffSalary}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="30000"
                  step="1000"
                  value={monthlyStaffSalary}
                  onChange={(e) => setMonthlyStaffSalary(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-655 border border-slate-200"
                />
              </div>
            </div>

            {/* Calculated Box */}
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col justify-between h-full space-y-6 shadow-inner">
              <div className="space-y-1 text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Monthly Lost Revenue</span>
                <span className="text-2xl font-black text-pink-500 font-display">₹{calculatedMonthlyLeakage.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-slate-200 pt-4 space-y-1 text-left">
                <span className="text-[10px] text-purple-650 font-bold uppercase tracking-widest block flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-purple-600" /> Estimated Yearly Savings
                </span>
                <span className="text-4xl font-black text-slate-800 font-display">₹{calculatedYearlySavings.toLocaleString()}</span>
                <p className="text-[9px] text-slate-400 leading-relaxed mt-1 font-semibold">Includes recovered booking leakages and saved receptionist salary, minus flat sub fee.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Pricing Section on Homepage */}
      <section id="pricing" className="py-24 border-t border-slate-200 bg-white relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
              Subscription Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight font-display">Simple, Predictable Plans</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-md mx-auto">
              Automate your reception desk, coordinate styling appointments, and recover lost revenues with zero transaction commissions.
            </p>

            {/* Toggle switch */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-all ${billingCycle === "monthly" ? "text-purple-650" : "text-slate-400"}`}>Monthly Billing</span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-12 h-6.5 bg-slate-200 border border-slate-300 rounded-full relative p-0.5 transition-colors cursor-pointer flex items-center"
              >
                <span className={`h-5 w-5 bg-purple-600 rounded-full shadow-md transform transition-transform duration-200 ${billingCycle === "annual" ? "translate-x-5.5" : "translate-x-0"}`}></span>
              </button>
              <span className={`text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${billingCycle === "annual" ? "text-purple-650" : "text-slate-400"}`}>
                Annual Billing
                <span className="bg-purple-100 border border-purple-200 text-purple-700 text-[8px] font-extrabold px-2 py-0.5 rounded-full">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Basic Plan Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-left relative flex flex-col justify-between hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest block font-mono text-purple-600">Basic Plan</h4>
                  <p className="text-slate-450 text-[10px] font-semibold mt-1">Core AI receptionist and local billing registers.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-800">₹{billingCycle === "annual" ? "2,399" : "2,999"}</span>
                  <span className="text-slate-400 text-xs font-bold font-sans">/ month</span>
                </div>

                <ul className="space-y-3.5 text-xs text-slate-600 font-semibold border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>24/7 AI WhatsApp Receptionist (Hinglish/Hindi)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Offline POS Digital Billing Terminal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Inbound Missed Call Welcome Menus</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Basic Partner Calendar & Roster Setup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Stylist Tier Commission Ledgers</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 border-t border-slate-100/50 mt-8 space-y-3">
                <Link
                  href="/sign-up"
                  className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95"
                >
                  Start Free Trial
                </Link>
              </div>
            </div>

            {/* Pro Autopilot Card */}
            <div className="bg-slate-950 text-white rounded-3xl p-8 text-left relative flex flex-col justify-between border-2 border-purple-500 shadow-xl shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 border border-purple-400 text-white font-extrabold text-[8px] uppercase tracking-widest px-3 py-1 rounded-full shadow-md animate-pulse">
                Most Popular
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-purple-400 uppercase tracking-widest block font-mono">Pro Autopilot</h4>
                  <p className="text-slate-400 text-[10px] font-semibold mt-1">Complete autonomous marketing & customer loops.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹{billingCycle === "annual" ? "3,999" : "4,999"}</span>
                  <span className="text-purple-400 text-xs font-bold font-sans">/ month</span>
                </div>

                <ul className="space-y-3.5 text-xs text-slate-350 font-semibold border-t border-zinc-800 pt-6">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span className="text-white">Everything in Basic Plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>Whisper Voice Note Transcription Booking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>AI Haircut & Style Analysis (AI Lab)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>Home & Doorstep Booking with Custom Fees</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>Google Review Auto-Collection Campaigns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-pink-500 shrink-0" />
                    <span>Partner Salon Routing (Overflow Engine)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 border-t border-zinc-800/80 mt-8 space-y-3">
                <Link
                  href="/sign-up"
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md shadow-purple-900/10"
                >
                  Go Autopilot Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Positioning Section */}
      <section className="py-24 max-w-5xl mx-auto px-6 z-10 relative">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-black tracking-tight text-slate-855 font-display">Why SalonsFlow Outperforms</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed">
            See how we stack up against active regional software solutions (Flat 0% Booking Commission model).
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-3xl bg-white shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-5 font-semibold">Strategic Feature</th>
                <th className="p-5 text-center font-medium">TapGro / Respark</th>
                <th className="p-5 text-center font-medium">Invoay / Zenoti</th>
                <th className="p-5 text-center text-purple-600 bg-purple-50/20 border-x border-purple-200">SalonsFlow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600 font-medium">
              {[
                { name: "24/7 AI WhatsApp Receptionist", c1: false, c2: false, sf: true },
                { name: "Hinglish/Hindi NLP Dialog Classifier", c1: false, c2: false, sf: true },
                { name: "Whisper Voice Note Booking Sync", c1: false, c2: false, sf: true },
                { name: "Inbound Missed Call Automation", c1: false, c2: false, sf: true },
                { name: "Stylist Slab Commission ledgers", c1: true, c2: true, sf: true },
                { name: "Offline POS Cash Drawer tracking", c1: true, c2: true, sf: true },
                { name: "0% booking commission model", c1: false, c2: true, sf: true },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-55/50 transition-colors">
                  <td className="p-5 font-semibold text-slate-700">{row.name}</td>
                  <td className="p-5 text-center">
                    {row.c1 ? <Check className="h-4.5 w-4.5 text-purple-600 mx-auto stroke-[2.5]" /> : <X className="h-4.5 w-4.5 text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-5 text-center">
                    {row.c2 ? <Check className="h-4.5 w-4.5 text-purple-600 mx-auto stroke-[2.5]" /> : <X className="h-4.5 w-4.5 text-slate-300 mx-auto" />}
                  </td>
                  <td className="p-5 text-center text-purple-650 bg-purple-50/10 border-x border-purple-200 font-bold">
                    {row.sf ? <Check className="h-5 w-5 text-pink-500 mx-auto stroke-[3]" /> : <X className="h-4.5 w-4.5 text-slate-200 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Grid */}
      <section id="faq" className="py-24 border-t border-slate-200 max-w-4xl mx-auto px-6 z-10 relative">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-black text-slate-800 font-display">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-xs font-semibold leading-relaxed font-sans">
            Everything you need to know about the AI receptionist, WABA channels, and setup rules.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How does the AI identify my specific salon catalog?",
              a: "Each salon operates on an isolated multi-tenant database boundary. When a client messages, our backend maps the recipient's phone account ID to retrieve only your configured services, stylists, prices, and settings catalog.",
            },
            {
              q: "Does every salon need their own Meta Developer credentials?",
              a: "To run live on your own number, yes. However, we provision a shared WhatsApp cloud number simulation (Sandbox Trial) to let you test AI dialogues instantly during your pilot trial phase.",
            },
            {
              q: "Can the AI understand mixed Hinglish voice notes?",
              a: "Yes. Combining advanced NLP translation rules alongside Whisper audio transcribers, the AI Receptionist processes dates, times, and colloquial phrases like 'kal 4 baje haircut block kar do' with high precision.",
            },
            {
              q: "How does the missed call recovery webhook execute?",
              a: "When a customer calls and gets a busy tone or misses, our webhook listener intercepts the call status event instantly and triggers a welcoming WhatsApp scheduling template to prevent client drop-offs.",
            },
          ].map((faq, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl bg-white overflow-hidden transition-all hover:border-purple-300 shadow-sm">
              <button
                onClick={() => setFaqOpenIndex(faqOpenIndex === idx ? null : idx)}
                className="w-full text-left p-6 flex justify-between items-center font-bold text-xs uppercase tracking-wider hover:bg-slate-50 text-slate-700"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${faqOpenIndex === idx ? "rotate-180 text-slate-800" : ""}`} />
              </button>
              {faqOpenIndex === idx && (
                <div className="p-6 border-t border-slate-150 text-xs text-slate-500 leading-relaxed bg-slate-50/50 font-medium text-left font-semibold">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Inline Lead Capture Form */}
      <section className="py-24 border-t border-slate-200 bg-slate-100/30 relative z-10">
        <div className="max-w-xl mx-auto px-6 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-slate-800 font-display">Start Missed Call Recovery Today</h2>
            <p className="text-slate-550 text-xs font-medium leading-relaxed">
              Register your details below and an integration specialist will contact you to provision your sandbox line.
            </p>
          </div>

          <form onSubmit={handleDemoSubmit} className="space-y-4 text-left bg-white border border-slate-200 p-8 rounded-3xl shadow-md">
            {demoFormSubmitSuccess ? (
              <div className="p-4 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-2xl text-center">
                [✓] Lead Registered! Our team will contact you in 24 hours.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={demoFormData.name}
                    onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">WhatsApp Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={demoFormData.phone}
                    onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. sharma@gmail.com"
                    value={demoFormData.email}
                    onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Salon Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Royal Barber"
                      value={demoFormData.salonName}
                      onChange={(e) => setDemoFormData({ ...demoFormData, salonName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">City</label>
                    <select
                      value={demoFormData.city}
                      onChange={(e) => setDemoFormData({ ...demoFormData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                    >
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Pune">Pune</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-xs uppercase tracking-wide rounded-xl mt-4 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
                >
                  Request Call Back
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-white px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-slate-450 text-xs">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SalonsFlow Logo" className="h-8 w-8 object-contain" />
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight text-slate-700 font-display leading-none">
                Salons<span className="text-purple-600 font-black">Flow</span>
              </span>
              <span className="text-[8px] font-bold text-purple-600 tracking-wider uppercase mt-1">
                Grow While You Style
              </span>
            </div>
          </div>
          
          <p>© 2026 SalonsFlow Platform Operating System. Built for Indian Salons.</p>
          
          <div className="flex items-center gap-4 font-bold text-slate-500">
            <a href="#features" className="hover:text-slate-800 transition-colors">Features</a>
            <Link href="/pricing" className="hover:text-slate-800 transition-colors">Pricing</Link>
            <a href="#solutions" className="hover:text-slate-800 transition-colors">Solutions</a>
          </div>
        </div>
      </footer>

      {/* Futuristic AI Activation Transition Screen Overlay */}
      {isEnteringDashboard && (
        <div className="fixed inset-0 bg-[#0a061e] z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute w-60 h-60 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none animate-pulse"></div>

          <div className="w-full max-w-lg space-y-8 relative z-10">
            <div className="flex items-center justify-center gap-3">
              <img src="/logo.png" alt="SalonsFlow Logo" className="h-12 w-12 object-contain animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="font-black text-2xl tracking-tight text-white font-display leading-none">
                  Salons<span className="text-purple-400 font-bold">Flow</span>
                </span>
                <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase mt-1.5">
                  Grow While You Style
                </span>
              </div>
            </div>

            <div className="bg-purple-950/20 border border-purple-900/40 rounded-2xl p-5 font-mono text-[11px] text-purple-200 min-h-[180px] shadow-2xl flex flex-col justify-between backdrop-blur-md">
              <div className="space-y-2.5 text-left">
                {loaderLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-150">
                    <span className="text-pink-400 font-extrabold">[✓]</span>
                    <span>{log}</span>
                  </div>
                ))}
                {loaderLogs.length < 7 && (
                  <div className="flex items-center gap-2 text-purple-400/60 animate-pulse">
                    <span className="text-pink-400">&gt;</span>
                    <span>Analyzing configurations...</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-4 border-t border-purple-900/30">
                <div className="flex justify-between font-bold text-[9px] text-purple-400 uppercase tracking-widest">
                  <span>System Onboarding Progress</span>
                  <span>{loaderProgress}%</span>
                </div>
                <div className="w-full bg-purple-950 border border-purple-900 h-2 rounded-full overflow-hidden p-[1px]">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${loaderProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Demo Popup Modal */}
      {demoModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-800 transition-colors p-1"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black text-slate-800 font-display">Book a Personal AI Demo</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                  Schedule a 15-minute video call to configure your WhatsApp booking automation channels.
                </p>
              </div>

              <form onSubmit={handleDemoSubmit} className="space-y-4 text-left">
                {demoFormSubmitSuccess ? (
                  <div className="p-4 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-2xl text-center">
                    [✓] Thank you! We will WhatsApp and email you the Google Meet details shortly.
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rakesh Patel"
                        value={demoFormData.name}
                        onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">WhatsApp Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 9999988888"
                        value={demoFormData.phone}
                        onChange={(e) => setDemoFormData({ ...demoFormData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Email Address (Optional)</label>
                      <input
                        type="email"
                        placeholder="e.g. sharma@gmail.com"
                        value={demoFormData.email}
                        onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Salon Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Crown Grooming Salon"
                        value={demoFormData.salonName}
                        onChange={(e) => setDemoFormData({ ...demoFormData, salonName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-semibold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-xs uppercase tracking-wide rounded-xl mt-4 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      Book Free Meeting
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Public Client Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto font-sans text-left">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 text-slate-850">
            {/* Close Button */}
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 bg-transparent border-0 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 transition-all z-20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-6 sm:p-8">
              {bookingSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="h-16 w-16 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-black text-xl text-slate-855 uppercase tracking-tight">Appointment Requested!</h3>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed font-semibold">
                      Bhai, your styling appointment slot is successfully scheduled. The salon partner has received your booking and will confirm/whatsapp details soon.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer border-0 mt-4"
                  >
                    Close Window
                  </button>
                </div>
              ) : bookingStep === "GUEST_INFO" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (guestName && guestPhone) {
                      setBookingStep("SELECT_VENDOR");
                    }
                  }}
                  className="space-y-5 text-left"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block font-mono">STEP 1: YOUR DETAILS</span>
                    <h3 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight">Guest Information</h3>
                    <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                      Enter your name and WhatsApp number to check nearby partner salons and book.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Piyush Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">WhatsApp Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-550 hover:to-pink-400 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer border-0 mt-4 font-sans"
                  >
                    <span>Proceed to Salons</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </button>
                </form>
              ) : bookingStep === "SELECT_VENDOR" ? (
                <div className="space-y-4 text-left font-sans">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block font-mono">STEP 2: CHOOSE SALON</span>
                    <h3 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight">Select Partner Salon</h3>
                    <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
                      Select a SalonsFlow partner vendor near your location.
                    </p>
                  </div>

                  {/* Search Vendor */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filter by city or salon name..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold"
                    />
                  </div>

                  {/* Vendors Scroll Container */}
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 mt-2 custom-scrollbar">
                    {vendors.length === 0 ? (
                      <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-250 rounded-2xl">
                        <span className="text-2xl mb-1.5 block">🏪</span>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">No Partner Salons Found</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed">
                          Currently, there are no vendors onboarded in the database. If you are a client salon, sign up / onboarding from the dashboard to display here!
                        </p>
                      </div>
                    ) : (
                      vendors.filter(v =>
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
                                <span className="text-[10.5px] font-black text-slate-755">{v.rating}</span>
                                <span className="text-[9.5px] font-semibold text-slate-400 font-sans">({v.reviewsCount} reviews)</span>
                              </div>
                            </div>
                            <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{v.ownerCity || "Mumbai"}</span>
                          </div>

                          <div className="text-[10.5px] text-slate-500 font-semibold space-y-1">
                            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {v.address}</p>
                            <p className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-max font-bold border border-emerald-100/60 mt-1">
                              <span>🏠 Doorstep Service Fee:</span>
                              <span className="font-extrabold">{v.homeBookingFee > 0 ? `₹${v.homeBookingFee}` : "Free"}</span>
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedVendor(v);
                              setSelectedStaffId("");
                              loadSalonStaff(v.id);
                              setBookingStep("SCHEDULE");
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider py-2 rounded-xl transition-all cursor-pointer text-center border-0 font-sans"
                          >
                            Select Salon
                          </button>
                        </div>
                      ))
                    )}
                    {vendors.length > 0 && vendors.filter(v =>
                      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                      (v.ownerCity && v.ownerCity.toLowerCase().includes(vendorSearch.toLowerCase()))
                    ).length === 0 && (
                      <p className="text-xs text-slate-450 py-10 text-center font-medium">No partner salons matching your search.</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setBookingStep("GUEST_INFO")}
                    className="w-full bg-slate-150 text-slate-750 hover:bg-slate-200 text-xs font-black uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer border-0 mt-2 text-center font-bold"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4 text-left font-sans">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block font-mono">STEP 3: SCHEDULE VISIT</span>
                    <h3 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight">Reserve Appointment</h3>
                  </div>

                  {/* Selected Salon Summary Box */}
                  {selectedVendor && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center text-left">
                      <div>
                        <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">{selectedVendor.name}</h4>
                        <span className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                          {selectedVendor.address}
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setBookingStep("SELECT_VENDOR")}
                        className="text-[9.5px] font-black text-purple-600 hover:text-purple-755 hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Booking Mode Selector Tabs */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Service Location</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBookingType("SALON")}
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
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
                        className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
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
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Home Delivery Address *</label>
                        <textarea
                          required
                          rows={2}
                          value={homeAddress}
                          onChange={(e) => setHomeAddress(e.target.value)}
                          placeholder="Enter house number, street address, area name..."
                          className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold resize-none"
                        />
                      </div>

                      {selectedVendor && selectedVendor.homeBookingFee > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <div className="text-left">
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Convenience Fee Added</span>
                            <span className="text-[10.5px] font-bold text-slate-650 block">
                              An additional home service charge of <strong className="text-emerald-700 font-extrabold font-sans">₹{selectedVendor.homeBookingFee}</strong> will be added to your total bill by {selectedVendor.name}.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Choose Stylist / Specialist */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Choose Stylist / Specialist</label>
                    {staffLoading ? (
                      <div className="flex items-center gap-2 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                        <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Loading stylists...</span>
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
                      rows={1.5}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="E.g. haircut preferences, color, beard styling requests..."
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-455 focus:outline-none focus:border-purple-500/50 focus:bg-white font-semibold resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-555 hover:to-pink-400 text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 active:scale-95 transition-all cursor-pointer border-0 mt-2 font-sans"
                  >
                    {bookingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Scheduling visit...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Appointment Request</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

