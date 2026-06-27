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
  AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ServicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    durationMins: "",
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
      const token = "dev-bypass-token";
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
      const token = "dev-bypass-token";

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
      const token = "dev-bypass-token";

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
      const token = "dev-bypass-token";
      
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
      const token = "dev-bypass-token";

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

  // Filter services by search term
  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <p className="text-muted-foreground">Manage your salon's service menu. AI Chatbot fetches pricing and catalog dynamically from here.</p>
        </div>
        <button
          onClick={openAddModal}
          id="btn-add-service"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-md text-sm font-semibold transition-all shadow-sm active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" /> Add New Service
        </button>
      </div>

      {/* Main Services Table card */}
      <Card className="overflow-hidden border border-gray-100 shadow-sm">
        <div className="p-4 border-b bg-white flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              id="search-services-input"
              placeholder="Search services by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
            />
          </div>
        </div>

        <CardContent className="p-0">
          {error && (
            <div className="p-12 text-center">
              <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <p className="text-rose-600 font-semibold mb-2">Error: {error}</p>
              <button 
                onClick={fetchServices} 
                className="text-sm text-green-600 font-medium hover:underline"
              >
                Try reloading services
              </button>
            </div>
          )}

          {loading && services.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
              <span className="text-gray-500 text-sm font-medium">Fetching service catalog...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-xs uppercase tracking-wider">Service Name</th>
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
                        <div className="bg-green-50 text-green-700 p-2 rounded-lg">
                          <Scissors className="h-4 w-4" />
                        </div>
                        <span>{svc.name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
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
                            svc.isActive ? "bg-green-600" : "bg-gray-200"
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
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Edit Service"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(svc)}
                            id={`btn-delete-${svc.id}`}
                            className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                        No services found. Click "Add New Service" to start building your catalog.
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
    </div>
  );
}
