"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Loader2, 
  X, 
  Scissors, 
  Clock, 
  DollarSign, 
  AlertCircle,
  Check,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  gender: "MALE" | "FEMALE" | "UNISEX";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE" | "UNISEX">("ALL");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Presets State
  const defaultPresets = [
    { name: "Classic Men's Haircut", price: 250, durationMins: 25, gender: "MALE", category: "Men's Barber" },
    { name: "Beard Trim & Styling", price: 150, durationMins: 15, gender: "MALE", category: "Men's Barber" },
    { name: "Haircut + Beard Styling Combo", price: 350, durationMins: 35, gender: "MALE", category: "Men's Barber" },
    { name: "Men's Hair Color & Touchup", price: 400, durationMins: 30, gender: "MALE", category: "Men's Barber" },
    { name: "Men's Charcoal Face Clean Up", price: 450, durationMins: 30, gender: "MALE", category: "Men's Barber" },
    { name: "Head Massage & Hair Wash", price: 200, durationMins: 20, gender: "MALE", category: "Men's Barber" },
    { name: "Women's Haircut & Blowdry", price: 600, durationMins: 45, gender: "FEMALE", category: "Women's Beauty" },
    { name: "L'Oreal Hair Spa & Wash", price: 800, durationMins: 45, gender: "FEMALE", category: "Women's Beauty" },
    { name: "Threading (Eyebrows & Upper Lip)", price: 100, durationMins: 15, gender: "FEMALE", category: "Women's Beauty" },
    { name: "Full Arms & Legs Waxing", price: 700, durationMins: 40, gender: "FEMALE", category: "Women's Beauty" },
    { name: "O3+ Facial & Glow Treatment", price: 1200, durationMins: 60, gender: "FEMALE", category: "Women's Beauty" },
    { name: "Classic Pedicure & Manicure", price: 900, durationMins: 50, gender: "FEMALE", category: "Women's Beauty" },
    { name: "Keratin Smooth Treatment", price: 2500, durationMins: 90, gender: "UNISEX", category: "Unisex & Spa" },
    { name: "Deep Conditioning Hair Mask", price: 500, durationMins: 30, gender: "UNISEX", category: "Unisex & Spa" },
    { name: "Head, Neck & Shoulder Relief Massage", price: 400, durationMins: 25, gender: "UNISEX", category: "Unisex & Spa" },
    { name: "De-Tan Removal Face Pack", price: 350, durationMins: 20, gender: "UNISEX", category: "Unisex & Spa" },
  ];

  const [selectedPresets, setSelectedPresets] = useState<typeof defaultPresets>(defaultPresets);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    durationMins: "",
    gender: "UNISEX" as "MALE" | "FEMALE" | "UNISEX",
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "") : "";
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      const response = await fetch(`${apiUrl}/api/v1/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load services: ${response.statusText}`);
      }

      const data = await response.json();
      setServices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Show temporary toast messages
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const openAddModal = () => {
    setFormData({
      name: "",
      price: "",
      durationMins: "",
      gender: "UNISEX",
      isActive: true,
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      durationMins: service.durationMins.toString(),
      gender: service.gender || "UNISEX",
      isActive: service.isActive,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.durationMins) {
      setFormError("Please fill in all required fields (Name, Price, Duration).");
      return;
    }

    const priceNum = parseFloat(formData.price);
    const durationNum = parseInt(formData.durationMins);

    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Price must be a valid positive number.");
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      setFormError("Duration must be a valid positive integer (minutes).");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "") : "";

      const response = await fetch(`${apiUrl}/api/v1/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          price: priceNum,
          durationMins: durationNum,
          gender: formData.gender,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to create service.");
      }

      setShowAddModal(false);
      setToast({ message: `Service "${formData.name}" created successfully!`, type: "success" });
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || "Failed to create service.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkImportPresets = async () => {
    if (selectedPresets.length === 0) {
      setToast({ message: "Please select at least one preset to import.", type: "warning" });
      return;
    }

    try {
      setSubmitting(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "") : "";
      const response = await fetch(`${apiUrl}/api/v1/services/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          services: selectedPresets.map(p => ({
            name: p.name,
            price: p.price,
            durationMins: p.durationMins,
            gender: p.gender,
            isActive: true,
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Failed to import selected preset catalog.");
      }

      setShowPresetsModal(false);
      setToast({ message: `✨ ${selectedPresets.length} Popular Services Imported Live!`, type: "success" });
      fetchServices();
    } catch (err: any) {
      setToast({ message: err.message || "Bulk import failed.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    if (!formData.name || !formData.price || !formData.durationMins) {
      setFormError("Please fill in all required fields (Name, Price, Duration).");
      return;
    }

    const priceNum = parseFloat(formData.price);
    const durationNum = parseInt(formData.durationMins);

    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Price must be a valid positive number.");
      return;
    }

    if (isNaN(durationNum) || durationNum <= 0) {
      setFormError("Duration must be a valid positive integer (minutes).");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "") : "";

      const response = await fetch(`${apiUrl}/api/v1/services/${editingService.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          price: priceNum,
          durationMins: durationNum,
          gender: formData.gender,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to update service.");
      }

      setShowEditModal(false);
      setToast({ message: `Service "${formData.name}" updated successfully!`, type: "success" });
      fetchServices();
    } catch (err: any) {
      setFormError(err.message || "Failed to update service.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";
      
      const newStatus = !service.isActive;

      // Optimistically update status in UI first
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, isActive: newStatus } : s));

      const response = await fetch(`${apiUrl}/api/v1/services/${service.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: newStatus,
        }),
      });

      if (!response.ok) {
        // Rollback optimistic update
        setServices(prev => prev.map(s => s.id === service.id ? { ...s, isActive: service.isActive } : s));
        const errData = await response.json();
        throw new Error(errData.message || "Failed to toggle service status.");
      }

      setToast({ 
        message: `Service "${service.name}" is now ${newStatus ? 'active' : 'inactive'}.`, 
        type: "success" 
      });
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update status.", type: "error" });
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete the service "${service.name}"?`)) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const token = typeof window !== "undefined" ? (localStorage.getItem("auth_token") || "dev-bypass-token") : "dev-bypass-token";

      const response = await fetch(`${apiUrl}/api/v1/services/${service.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to delete service.");
      }

      setToast({ message: `Service "${service.name}" deleted successfully!`, type: "success" });
      fetchServices();
    } catch (err: any) {
      // Show error in a nice toast/alert style rather than crashing
      setToast({ message: err.message || "Failed to delete service.", type: "error" });
    }
  };

  // Filter services by search term & gender
  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = genderFilter === "ALL" || (s.gender || "UNISEX") === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6 relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : toast.type === "warning" 
              ? "bg-amber-50 text-amber-800 border-amber-200" 
              : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {toast.type === "success" && <Check className="h-5 w-5 text-emerald-600" />}
          {toast.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
          {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services Catalog</h2>
          <p className="text-muted-foreground">Manage your salon's service menu with male, female, and unisex categories & pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresetsModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 border-0 cursor-pointer"
          >
            <Sparkles className="h-4.5 w-4.5 animate-pulse" /> ✨ 1-Click Popular Presets
          </button>
          <button
            onClick={openAddModal}
            id="btn-add-service"
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 border-0 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" /> Add New Service
          </button>
        </div>
      </div>

      {/* Main Services Table card */}
      <Card className="overflow-hidden border border-gray-100 shadow-sm rounded-2xl">
        <div className="p-4 border-b bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              id="search-services-input"
              placeholder="Search services by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>

          {/* Gender Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            {[
              { id: "ALL", label: "All" },
              { id: "MALE", label: "♂️ Men" },
              { id: "FEMALE", label: "♀️ Women" },
              { id: "UNISEX", label: "🚻 Unisex" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setGenderFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all border-0 cursor-pointer ${
                  genderFilter === tab.id
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-0">
          {error && (
            <div className="p-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <p className="text-rose-600 font-semibold mb-2">Error: {error}</p>
              <button 
                onClick={fetchServices} 
                className="text-sm text-purple-600 font-medium hover:underline"
              >
                Try reloading services
              </button>
            </div>
          )}

          {loading && services.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
              <span className="text-gray-500 text-sm font-medium">Fetching service catalog...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Service Name</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Target Customer</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredServices.map((svc) => (
                    <tr key={svc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2.5">
                        <div className="bg-purple-50 text-purple-700 p-2 rounded-lg">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <span>{svc.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold border uppercase ${
                          svc.gender === "MALE"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : svc.gender === "FEMALE"
                            ? "bg-pink-50 text-pink-700 border-pink-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {svc.gender === "MALE" ? "♂️ Male Customers" : svc.gender === "FEMALE" ? "♀️ Female Customers" : "🚻 Both (Unisex)"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-bold">
                        ₹{svc.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {svc.durationMins} mins
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(svc)}
                          id={`toggle-status-${svc.id}`}
                          title={`Click to ${svc.isActive ? "disable" : "enable"}`}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            svc.isActive ? "bg-purple-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              svc.isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(svc)}
                            id={`btn-edit-${svc.id}`}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all border-0 cursor-pointer"
                            title="Edit Service"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(svc)}
                            id={`btn-delete-${svc.id}`}
                            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border-0 cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                        No services found. Click "Add New Service" to start building your menu catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-lg">Add New Service</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-md text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Name *</label>
                <input
                  type="text"
                  required
                  id="add-service-name"
                  placeholder="e.g. Haircut & Styling"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Available For Customers *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "MALE" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "MALE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>♂️ Male Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "FEMALE" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "FEMALE"
                        ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>♀️ Female Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "UNISEX" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "UNISEX"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🚻 Both (Unisex)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" /> Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    id="add-service-price"
                    placeholder="e.g. 450"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" /> Duration (min) *
                  </label>
                  <input
                    type="number"
                    required
                    id="add-service-duration"
                    placeholder="e.g. 30"
                    value={formData.durationMins}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMins: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="add-service-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="add-service-active" className="text-sm font-semibold text-gray-700 select-none">
                  Enable service immediately in catalog
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  id="submit-add-service"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-75 disabled:pointer-events-none"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                <h3 className="font-bold text-lg">Edit Service</h3>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-md text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service Name *</label>
                <input
                  type="text"
                  required
                  id="edit-service-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Available For Customers *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "MALE" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "MALE"
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>♂️ Male Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "FEMALE" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "FEMALE"
                        ? "bg-pink-600 text-white border-pink-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>♀️ Female Only</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: "UNISEX" }))}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.gender === "UNISEX"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🚻 Both (Unisex)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" /> Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    id="edit-service-price"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" /> Duration (min) *
                  </label>
                  <input
                    type="number"
                    required
                    id="edit-service-duration"
                    value={formData.durationMins}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMins: e.target.value }))}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-service-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="edit-service-active" className="text-sm font-semibold text-gray-700 select-none">
                  Service is active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  id="submit-edit-service"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all hover:shadow active:scale-95 disabled:opacity-75 disabled:pointer-events-none"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click Presets Modal */}
      {showPresetsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg">1-Click Popular Salon Presets</h3>
                  <p className="text-xs text-amber-100">Select industry-standard services and import your full catalog in 1 second!</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPresetsModal(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Category Quick Select Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Select:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPresets(defaultPresets)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                  >
                    Select All (16)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPresets(defaultPresets.filter(p => p.gender === "MALE"))}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                  >
                    ♂️ All Men's
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPresets(defaultPresets.filter(p => p.gender === "FEMALE"))}
                    className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs"
                  >
                    ♀️ All Women's
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPresets([])}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-extrabold rounded-xl transition-all"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Preset List Grid */}
              <div className="space-y-3">
                {["Men's Barber", "Women's Beauty", "Unisex & Spa"].map((cat) => {
                  const catItems = defaultPresets.filter(p => p.category === cat);
                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1.5">
                        <Scissors className="h-3.5 w-3.5 text-amber-500" /> {cat}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {catItems.map((preset) => {
                          const isSelected = selectedPresets.some(p => p.name === preset.name);
                          const currentSelected = selectedPresets.find(p => p.name === preset.name);

                          return (
                            <div
                              key={preset.name}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? "bg-amber-50/60 border-amber-300 text-amber-950 shadow-xs"
                                  : "bg-white border-gray-200 text-gray-500 opacity-60 hover:opacity-100"
                              }`}
                            >
                              <div 
                                onClick={() => {
                                  setSelectedPresets(prev => 
                                    prev.some(p => p.name === preset.name)
                                      ? prev.filter(p => p.name !== preset.name)
                                      : [...prev, preset]
                                  );
                                }}
                                className="flex items-center gap-2.5 cursor-pointer flex-1"
                              >
                                <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                  isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-gray-300 bg-white"
                                }`}>
                                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{preset.name}</p>
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${
                                    preset.gender === "MALE"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : preset.gender === "FEMALE"
                                      ? "bg-pink-50 text-pink-700 border-pink-200"
                                      : "bg-purple-50 text-purple-700 border-purple-200"
                                  }`}>
                                    {preset.gender === "MALE" ? "Men" : preset.gender === "FEMALE" ? "Women" : "Unisex"}
                                  </span>
                                </div>
                              </div>

                              {/* Editable price & duration when selected */}
                              {isSelected && (
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="space-y-0.5 text-right">
                                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Price</span>
                                    <input
                                      type="number"
                                      value={currentSelected?.price || preset.price}
                                      onChange={(e) => {
                                        const newPrice = Number(e.target.value);
                                        setSelectedPresets(prev => 
                                          prev.map(p => p.name === preset.name ? { ...p, price: newPrice } : p)
                                        );
                                      }}
                                      className="w-16 bg-white border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs font-black text-emerald-700 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                  <div className="space-y-0.5 text-right">
                                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Mins</span>
                                    <input
                                      type="number"
                                      value={currentSelected?.durationMins || preset.durationMins}
                                      onChange={(e) => {
                                        const newMins = Number(e.target.value);
                                        setSelectedPresets(prev => 
                                          prev.map(p => p.name === preset.name ? { ...p, durationMins: newMins } : p)
                                        );
                                      }}
                                      className="w-12 bg-white border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs font-bold text-gray-700 text-right focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-bold text-gray-600">
                Total Services Selected: <strong className="text-amber-600">{selectedPresets.length}</strong>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || selectedPresets.length === 0}
                  onClick={handleBulkImportPresets}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 animate-pulse" />}
                  Import {selectedPresets.length} Services Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

