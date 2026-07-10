"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Scissors, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  IndianRupee, 
  Clock, 
  Check,
  AlertCircle,
  HelpCircle,
  Play,
  Heart,
  UserCheck,
  ShieldCheck,
  CheckCircle,
  FileText
} from "lucide-react";

interface ServiceTemplate {
  name: string;
  price: number;
  durationMins: number;
  selected: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Salon category preset state
  const [selectedPreset, setSelectedPreset] = useState<"hair" | "spa" | "unisex" | "custom">("hair");

  // Step 1: Business Profile
  const [businessData, setBusinessData] = useState({
    name: "",
    address: "",
    state: "Delhi",
    gstin: "",
  });

  // Step 2: Service Templates (Default Hair Salon templates)
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([
    { name: "Premium Haircut", price: 350, durationMins: 30, selected: true },
    { name: "Classic Beard Shave", price: 150, durationMins: 15, selected: true },
    { name: "Charcoal Face Facial", price: 600, durationMins: 45, selected: true },
    { name: "Aroma Therapy Massage", price: 1200, durationMins: 60, selected: false },
    { name: "Hair Spa & Nourish", price: 800, durationMins: 45, selected: false },
    { name: "Pedicure & Clean", price: 400, durationMins: 30, selected: false },
    { name: "Bridal Styling Makeup", price: 3500, durationMins: 120, selected: false },
  ]);

  // Step 3: WhatsApp Configuration
  const [whatsAppData, setWhatsAppData] = useState({
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    useSandbox: true, // Default to true for easy trials!
  });

  // Step 3: Instagram Configuration
  const [instagramData, setInstagramData] = useState({
    pageId: "",
    accessToken: "",
    useSandbox: true,
  });

  // Help details open state
  const [showMetaHelp, setShowMetaHelp] = useState(false);

  const token = "dev-bypass-token";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Preset configuration applicator
  useEffect(() => {
    if (selectedPreset === "hair") {
      setServiceTemplates([
        { name: "Premium Haircut", price: 350, durationMins: 30, selected: true },
        { name: "Classic Beard Shave", price: 150, durationMins: 15, selected: true },
        { name: "Hair Spa & Nourish", price: 800, durationMins: 45, selected: true },
        { name: "Hair Coloring", price: 1200, durationMins: 60, selected: false },
        { name: "Pedicure & Clean", price: 400, durationMins: 30, selected: false },
      ]);
    } else if (selectedPreset === "spa") {
      setServiceTemplates([
        { name: "Aroma Therapy Massage", price: 1200, durationMins: 60, selected: true },
        { name: "Deep Tissue Massage", price: 1500, durationMins: 60, selected: true },
        { name: "Charcoal Face Facial", price: 600, durationMins: 45, selected: true },
        { name: "Body Scrub Treatment", price: 1800, durationMins: 75, selected: false },
        { name: "Pedicure & Clean", price: 400, durationMins: 30, selected: false },
      ]);
    } else if (selectedPreset === "unisex") {
      setServiceTemplates([
        { name: "Premium Haircut", price: 450, durationMins: 35, selected: true },
        { name: "Classic Beard Shave", price: 150, durationMins: 15, selected: true },
        { name: "Charcoal Face Facial", price: 600, durationMins: 45, selected: true },
        { name: "Hair Spa & Nourish", price: 800, durationMins: 45, selected: true },
        { name: "Pedicure & Clean", price: 400, durationMins: 30, selected: true },
        { name: "Bridal Styling Makeup", price: 4500, durationMins: 120, selected: false },
        { name: "Aroma Therapy Massage", price: 1200, durationMins: 60, selected: false },
      ]);
    }
  }, [selectedPreset]);

  // Check if profile is already complete
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/salons/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const salon = await response.json();
          // Check if we are forcing setup wizard re-entry
          const urlParams = new URLSearchParams(window.location.search);
          const force = urlParams.get("force") === "true";
          
          if (salon.isProfileComplete && !force) {
            router.push("/dashboard");
          } else {
            // Set defaults from database provisioning placeholders
            setBusinessData(prev => ({
              ...prev,
              name: salon.name || "",
              address: salon.address || "",
            }));
            if (salon.whatsappPhoneNumberId) {
              setWhatsAppData(prev => ({
                ...prev,
                phoneNumberId: salon.whatsappPhoneNumberId || "",
                businessAccountId: salon.whatsappBusinessAccountId || "",
                accessToken: salon.whatsappAccessToken || "",
                useSandbox: false
              }));
            }
            if (salon.instagramPageId) {
              setInstagramData(prev => ({
                ...prev,
                pageId: salon.instagramPageId || "",
                accessToken: salon.instagramAccessToken || "",
                useSandbox: false
              }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to check salon profile status:", err);
      }
    };
    checkStatus();
  }, [apiUrl, router]);

  const handleTemplateToggle = (index: number) => {
    setServiceTemplates(prev => prev.map((item, idx) => 
      idx === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const handleTemplateValueChange = (index: number, key: 'price' | 'durationMins', value: number) => {
    setServiceTemplates(prev => prev.map((item, idx) => 
      idx === index ? { ...item, [key]: value } : item
    ));
  };

  const handleNextStep = () => {
    if (step === 1 && !businessData.name) {
      setSubmitError("Salon Name is required to build your operational boundaries.");
      return;
    }
    setSubmitError(null);
    setStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setSubmitError(null);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    // Prepare credentials based on sandbox selection
    const phoneNumberId = whatsAppData.useSandbox ? "sandbox-phone-id" : whatsAppData.phoneNumberId;
    const businessAccountId = whatsAppData.useSandbox ? "sandbox-account-id" : whatsAppData.businessAccountId;
    const accessToken = whatsAppData.useSandbox ? "sandbox-access-token" : whatsAppData.accessToken;

    const instagramPageId = whatsAppData.useSandbox ? "sandbox-instagram-page-id" : instagramData.pageId;
    const instagramAccessToken = whatsAppData.useSandbox ? "sandbox-instagram-access-token" : instagramData.accessToken;

    if (!whatsAppData.useSandbox && (!phoneNumberId || !businessAccountId || !accessToken || !instagramPageId || !instagramAccessToken)) {
      setSubmitError("Please fill out all credentials or select 'Sandbox Trial Line' to proceed.");
      setLoading(false);
      return;
    }

    try {
      // 1. Save Salon Business Profile, WhatsApp & Instagram settings
      const profileRes = await fetch(`${apiUrl}/api/v1/salons/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: businessData.name,
          address: businessData.address || undefined,
          whatsappPhoneNumberId: phoneNumberId,
          whatsappAccessToken: accessToken,
          whatsappBusinessAccountId: businessAccountId,
          instagramPageId: instagramPageId,
          instagramAccessToken: instagramAccessToken,
          isProfileComplete: true
        })
      });

      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(errData.message || "Failed to save business profile.");
      }

      // 2. Initialize Selected Services
      const selectedServices = serviceTemplates.filter(s => s.selected);
      
      // Clean up previous services if re-running
      // (For pilot simplicity, we post new ones. In production we would sync/upsert)
      await Promise.all(selectedServices.map(async (svc) => {
        return fetch(`${apiUrl}/api/v1/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: svc.name,
            price: svc.price,
            durationMins: svc.durationMins,
            isActive: true
          })
        });
      }));

      // Launch successfully
      setStep(4);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3500);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong during onboarding setup.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-zinc-900/60 rounded-3xl border border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col relative z-10 transition-all duration-300 backdrop-blur-md">
        
        {/* Progress Header */}
        <div className="p-8 bg-gradient-to-br from-zinc-900/85 to-zinc-950/85 border-b border-zinc-800 text-zinc-100 flex flex-col gap-5 relative">
          <div className="absolute top-0 right-0 w-32 h-full bg-white/[0.01] skew-x-12 pointer-events-none"></div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="SalonsFlow Logo" className="h-9 w-9 object-contain" />
              <div>
                <span className="font-bold text-lg tracking-tight block font-display">Salons<span className="text-emerald-400">Flow</span></span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-550 block">Autopilot Setup Console</span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold bg-zinc-800 border border-zinc-700 text-zinc-300 px-3.5 py-1 rounded-full uppercase tracking-wider">
              Step {step} of 4
            </span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 font-display text-zinc-150">
              {step === 1 && <><Building2 className="h-6 w-6 text-emerald-400" /> Salon Profile & Identity</>}
              {step === 2 && <><Scissors className="h-6 w-6 text-emerald-400" /> AI Qualification Menu</>}
              {step === 3 && <><MessageSquare className="h-6 w-6 text-emerald-400" /> WhatsApp API Link</>}
              {step === 4 && <><Sparkles className="h-6 w-6 text-emerald-400 animate-spin" /> Launching AI Autopilot...</>}
            </h2>
            <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-lg">
              {step === 1 && "Introduce your brand. The AI Receptionist uses this data to confirm location details, address queries, and format POS billing invoices."}
              {step === 2 && "Establish your service menu. The AI Autopilot references this pricing list to dynamically schedule appointments, calculate charges, and upsell treatments on WhatsApp."}
              {step === 3 && "Activate your automated receptionist line. Start with our sandbox simulator to test client dialogues in seconds, or link a live Meta WABA number."}
              {step === 4 && "Deploying secure sandbox databases, syncing Hinglish language classifiers, and binding automatic rebooking engines..."}
            </p>
          </div>

          {/* Progress Bar Container */}
          <div className="space-y-1">
            <div className="w-full bg-zinc-950 border border-zinc-800 h-2 rounded-full overflow-hidden p-[1px]">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wider text-zinc-550">
              <span>Configuration</span>
              <span>Ready to Launch</span>
            </div>
          </div>
        </div>

        {/* Timeline navigation labels */}
        <div className="border-b border-zinc-800 flex text-[10px] font-bold text-zinc-500 bg-zinc-900/10">
          {[
            { num: 1, label: "Identity", icon: Building2 },
            { num: 2, label: "Catalog", icon: Scissors },
            { num: 3, label: "WhatsApp", icon: MessageSquare },
            { num: 4, label: "Launch AI", icon: CheckCircle2 }
          ].map((tab) => (
            <div 
              key={tab.num}
              className={`flex-1 py-4 border-b-2 flex items-center justify-center gap-1.5 transition-all ${
                step === tab.num 
                  ? "border-emerald-500 text-emerald-400 bg-zinc-900/40" 
                  : "border-transparent text-zinc-500"
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline uppercase tracking-wider">{tab.label}</span>
            </div>
          ))}
        </div>

        {/* Wizard Form Area */}
        <div className="p-8 flex-1 flex flex-col justify-between min-h-[380px] bg-zinc-955/10">
          
          {/* Error alert banner */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-2xl text-red-305 text-xs font-semibold flex items-center gap-3 animate-in shake duration-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* STEP 1 CONTENT: Business Profile */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Salon Name <span className="text-rose-505">*</span></label>
                <input
                  type="text"
                  required
                  id="ob-salon-name"
                  placeholder="e.g. Elegance Barber & Spa"
                  value={businessData.name}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-zinc-950 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Salon Address</label>
                <input
                  type="text"
                  id="ob-salon-address"
                  placeholder="e.g. Shop 12, Ground Floor, Galleria Market, Gurugram"
                  value={businessData.address}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-zinc-950 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">State</label>
                  <select
                    value={businessData.state}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-zinc-955 transition-all font-semibold"
                  >
                    <option value="Delhi" className="bg-zinc-950">Delhi</option>
                    <option value="Maharashtra" className="bg-zinc-950">Maharashtra</option>
                    <option value="Karnataka" className="bg-zinc-950">Karnataka</option>
                    <option value="Haryana" className="bg-zinc-950">Haryana</option>
                    <option value="Uttar Pradesh" className="bg-zinc-950">Uttar Pradesh</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">GSTIN</label>
                    <span className="text-[9px] text-zinc-550 font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">Optional</span>
                  </div>
                  <input
                    type="text"
                    id="ob-salon-gst"
                    placeholder="e.g. 07AAAAA1111A1Z0"
                    value={businessData.gstin}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, gstin: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-zinc-950 transition-all uppercase font-semibold placeholder:normal-case"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 CONTENT: Services Menu */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Select Salon Category Template</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "hair", name: "Hair Salon", desc: "Barbers & Stylists" },
                    { id: "spa", name: "Spa & Massage", desc: "Therapy & Facials" },
                    { id: "unisex", name: "Unisex Salon", desc: "All-in-one setup" },
                  ].map((pres) => (
                    <button
                      key={pres.id}
                      type="button"
                      onClick={() => setSelectedPreset(pres.id as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                        selectedPreset === pres.id 
                          ? "bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/10" 
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/50 text-zinc-400"
                      }`}
                    >
                      <span className="font-extrabold text-[11px] block font-display">{pres.name}</span>
                      <span className="text-[9px] font-medium opacity-80 mt-0.5">{pres.desc}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPreset("custom")}
                    className={`p-3 rounded-2xl border text-left flex flex-col transition-all cursor-pointer ${
                      selectedPreset === "custom" 
                        ? "bg-emerald-950/50 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/10" 
                        : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/50 text-zinc-400"
                    }`}
                  >
                    <span className="font-extrabold text-[11px] block font-display">Custom Menu</span>
                    <span className="text-[9px] font-medium opacity-80 mt-0.5">Start from scratch</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-zinc-550 uppercase tracking-wide">
                  <span>Available Services</span>
                  <span>Base Price (₹) & Duration (min)</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {serviceTemplates.map((svc, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        svc.selected 
                          ? "bg-zinc-900 border-emerald-800/40 shadow-sm text-zinc-205" 
                          : "bg-zinc-900/30 border-zinc-850/60 text-zinc-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`check-template-${idx}`}
                          checked={svc.selected}
                          onChange={() => handleTemplateToggle(idx)}
                          className="h-4.5 w-4.5 text-emerald-550 border-zinc-800 bg-zinc-950 rounded focus:ring-emerald-500/20 focus:ring-offset-zinc-950 cursor-pointer"
                        />
                        <label htmlFor={`check-template-${idx}`} className={`font-bold text-xs select-none cursor-pointer ${svc.selected ? "text-zinc-200" : "text-zinc-500 font-medium"}`}>
                          {svc.name}
                        </label>
                      </div>

                      {svc.selected ? (
                        <div className="flex items-center gap-2">
                          <div className="relative w-24">
                            <IndianRupee className="absolute left-2 top-2 h-3.5 w-3.5 text-emerald-500" />
                            <input
                              type="number"
                              value={svc.price}
                              onChange={(e) => handleTemplateValueChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-zinc-100"
                              placeholder="Price"
                            />
                          </div>
                          <div className="relative w-20">
                            <Clock className="absolute left-2 top-2.5 h-3 w-3 text-emerald-500" />
                            <input
                              type="number"
                              value={svc.durationMins}
                              onChange={(e) => handleTemplateValueChange(idx, 'durationMins', parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-zinc-100"
                              placeholder="Min"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] italic font-semibold text-zinc-600">Deselected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 CONTENT: WhatsApp Setup */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Option toggle banner */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setWhatsAppData(prev => ({ ...prev, useSandbox: true }))}
                  className={`p-4 rounded-2xl border text-left flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    whatsAppData.useSandbox 
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/10" 
                      : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/50 text-zinc-400"
                  }`}
                >
                  <Sparkles className="h-6 w-6 text-emerald-400 mb-2" />
                  <span className="font-extrabold text-xs block">Use Sandbox Trial Line</span>
                  <span className="text-[9px] font-medium opacity-85 mt-1 max-w-[200px]">Instant setup. Try the Hinglish AI dialog immediately.</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setWhatsAppData(prev => ({ ...prev, useSandbox: false }))}
                  className={`p-4 rounded-2xl border text-left flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    !whatsAppData.useSandbox 
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/10" 
                      : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/50 text-zinc-400"
                  }`}
                >
                  <Building2 className="h-6 w-6 text-indigo-400 mb-2" />
                  <span className="font-extrabold text-xs block">Connect Live Meta API</span>
                  <span className="text-[9px] font-medium opacity-85 mt-1 max-w-[200px]">Link your own WABA WhatsApp number credentials.</span>
                </button>
              </div>

              {whatsAppData.useSandbox ? (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl space-y-2">
                  <h4 className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                    Sandbox Active (Highly Recommended for Sandbox Trials)
                  </h4>
                  <p className="text-[11px] text-emerald-400/90 leading-relaxed font-semibold">
                    We will provision a shared WhatsApp cloud number simulation for your trial salon. You can test missed call welcomes, chat bookings, and rebookings.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-350 bg-zinc-900/80 border border-emerald-900/30 p-2 rounded-xl text-center">
                    Auto-webhook simulation: Active [✓]
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">Meta API Credentials</span>
                    <button 
                      type="button"
                      onClick={() => setShowMetaHelp(!showMetaHelp)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <HelpCircle className="h-4 w-4 text-indigo-405" /> Need help finding these?
                    </button>
                  </div>

                  {showMetaHelp && (
                    <div className="p-4 bg-indigo-950/25 border border-indigo-900/40 rounded-2xl text-[11px] text-indigo-300 leading-relaxed space-y-2.5">
                      <p className="font-bold flex items-center gap-1.5"><FileText className="h-4 w-4 text-indigo-400" /> WABA Extraction Steps:</p>
                      <ol className="list-decimal pl-4 space-y-1 font-semibold text-zinc-400">
                        <li>Log into your <strong>Meta App Dashboard</strong> (developers.facebook.com).</li>
                        <li>Add the <strong>WhatsApp product</strong> to your app.</li>
                        <li>Find the <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong> in the WhatsApp Getting Started panel.</li>
                        <li>Generate a <strong>Permanent System User Access Token</strong> in your Business Manager settings.</li>
                      </ol>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">WhatsApp Phone ID</label>
                      <input
                        type="text"
                        required={!whatsAppData.useSandbox}
                        placeholder="e.g. 104593821039485"
                        value={whatsAppData.phoneNumberId}
                        onChange={(e) => setWhatsAppData(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Meta Account ID (WABA)</label>
                      <input
                        type="text"
                        required={!whatsAppData.useSandbox}
                        placeholder="e.g. 984728103945821"
                        value={whatsAppData.businessAccountId}
                        onChange={(e) => setWhatsAppData(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                      />
                    </div>
                  </div>

                   <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Permanent Access Token</label>
                    <input
                      type="password"
                      required={!whatsAppData.useSandbox}
                      placeholder="EAAG3O4Ssd..."
                      value={whatsAppData.accessToken}
                      onChange={(e) => setWhatsAppData(prev => ({ ...prev, accessToken: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                    />
                  </div>

                  <div className="border-t border-zinc-800/80 my-4 pt-4">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block mb-3">Instagram DM Credentials</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Instagram Page ID</label>
                        <input
                          type="text"
                          required={!whatsAppData.useSandbox}
                          placeholder="e.g. 178414000000000"
                          value={instagramData.pageId}
                          onChange={(e) => setInstagramData(prev => ({ ...prev, pageId: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide block">Instagram Access Token</label>
                        <input
                          type="password"
                          required={!whatsAppData.useSandbox}
                          placeholder="EAAG3O4SsdIG..."
                          value={instagramData.accessToken}
                          onChange={(e) => setInstagramData(prev => ({ ...prev, accessToken: e.target.value }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4 CONTENT: Autopilot Launch */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-6 animate-in zoom-in-95 duration-500">
              <div className="h-16 w-16 bg-emerald-950/40 border-4 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/20 animate-bounce">
                <Check className="h-8 w-8 stroke-[3.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-100 tracking-tight font-display">System Autopilot Configured!</h3>
                <p className="text-xs text-zinc-400 font-semibold max-w-sm leading-relaxed">
                  We are finalizing your isolated data workspace, setting up AI receptionist dialog flows, and redirecting you to your main operations center.
                </p>
              </div>

              {/* Progress feedback feed */}
              <div className="w-full max-w-xs space-y-1.5 text-left border border-zinc-800 bg-zinc-950 p-4 rounded-2xl text-[10px] font-mono text-zinc-550">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>[✓] Save business coordinates</span>
                  <span>100%</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>[✓] Import default catalog</span>
                  <span>100%</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>[✓] Bind webhook callback listeners</span>
                  <span>100%</span>
                </div>
                <div className="flex justify-between items-center text-indigo-400 font-bold uppercase animate-pulse">
                  <span>[→] Redirecting to Dashboard</span>
                  <span>Syncing</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800/80 mt-6 bg-transparent">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-xl text-xs font-bold transition-all active:scale-95 duration-200 shadow-sm cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div></div>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  id="btn-next-step"
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 duration-200 cursor-pointer border-0"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  id="btn-finish-setup"
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-zinc-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md active:scale-98 transition-all duration-200 cursor-pointer border-0 disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-950" /> Setting Up...
                    </>
                  ) : (
                    <>
                      Finish & Launch AI <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
