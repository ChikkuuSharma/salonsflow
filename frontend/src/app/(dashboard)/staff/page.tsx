"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  UserCheck, 
  Scissors, 
  Loader2, 
  X, 
  Check, 
  AlertCircle,
  ShieldCheck,
  Edit2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface StaffService {
  serviceId: string;
  service: Service;
}

interface Staff {
  id: string;
  name: string;
  isAvailable: boolean;
  staffServices: StaffService[];
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [serviceList, setServiceList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [qualifiedServiceIds, setQualifiedServiceIds] = useState<string[]>([]);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    isAvailable: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const token = "dev-bypass-token";

  const fetchStaffAndServices = async () => {
    try {
      setLoading(true);
      const [staffRes, servicesRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/appointments/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/v1/services`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (staffRes.ok) {
        setStaffList(await staffRes.json());
      }
      if (servicesRes.ok) {
        setServiceList(await servicesRes.json());
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      setToast({ message: "Failed to load staff list.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndServices();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setFormError("Name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const response = await fetch(`${apiUrl}/api/v1/appointments/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to create stylist.");
      }

      setShowAddModal(false);
      setToast({ message: `Stylist "${formData.name}" added successfully!`, type: "success" });
      fetchStaffAndServices();
    } catch (err: any) {
      setFormError(err.message || "Failed to create stylist.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailable = async (staff: Staff) => {
    try {
      const newStatus = !staff.isAvailable;
      const response = await fetch(`${apiUrl}/api/v1/appointments/staff/${staff.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to toggle status.");
      }

      setToast({ message: `${staff.name} is now ${newStatus ? 'active' : 'on leave'}!`, type: "success" });
      fetchStaffAndServices();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update availability.", type: "error" });
    }
  };

  const handleDeleteStaff = async (staff: Staff) => {
    if (!confirm(`Are you sure you want to delete stylist "${staff.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/appointments/staff/${staff.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error("Failed to delete stylist.");
      }

      setToast({ message: `Stylist "${staff.name}" deleted successfully!`, type: "success" });
      fetchStaffAndServices();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to delete stylist.", type: "error" });
    }
  };

  const handleOpenQualifications = async (staff: Staff) => {
    setSelectedStaff(staff);
    // Fetch mapping service IDs
    try {
      const response = await fetch(`${apiUrl}/api/v1/appointments/staff/${staff.id}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setQualifiedServiceIds(await response.json());
      } else {
        setQualifiedServiceIds(staff.staffServices.map(ss => ss.serviceId));
      }
    } catch (err) {
      setQualifiedServiceIds(staff.staffServices.map(ss => ss.serviceId));
    }
  };

  const handleToggleQualificationCheckbox = (serviceId: string) => {
    setQualifiedServiceIds(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSaveQualifications = async () => {
    if (!selectedStaff) return;
    try {
      setSubmitting(true);
      const response = await fetch(`${apiUrl}/api/v1/appointments/staff/${selectedStaff.id}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ serviceIds: qualifiedServiceIds })
      });

      if (!response.ok) {
        throw new Error("Failed to save service qualifications.");
      }

      setToast({ message: `Qualifications for ${selectedStaff.name} saved!`, type: "success" });
      setSelectedStaff(null);
      fetchStaffAndServices();
    } catch (err: any) {
      setToast({ message: err.message || "Failed to update qualifications.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative max-w-[1400px] mx-auto pb-12">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${
          toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          {toast.type === "success" ? <Check className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground text-sm">Manage your salon staff. Here, you can add new staff, update availability, map qualified services, or delete stylists from your organization.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", isAvailable: true });
            setFormError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
        >
          <Plus className="h-4.5 w-4.5" /> Add Stylist
        </button>
      </div>

      {/* Roster Cards */}
      {loading && staffList.length === 0 ? (
        <div className="flex flex-col justify-center items-center py-24 gap-3 bg-white border border-gray-100 rounded-3xl">
          <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
          <span className="text-gray-500 text-sm font-medium">Loading staff list...</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff) => (
            <Card key={staff.id} className="overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white flex flex-col justify-between">
              <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-50 text-green-600 p-3 rounded-2xl">
                        <UserCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 text-base">{staff.name}</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase mt-0.5">Stylist</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleToggleAvailable(staff)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        staff.isAvailable ? "bg-green-600" : "bg-gray-200"
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        staff.isAvailable ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Qualified Services</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {staff.staffServices && staff.staffServices.length > 0 ? (
                        staff.staffServices.map((ss) => (
                          <span key={ss.serviceId} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                            {ss.service.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs font-medium italic">No qualified services mapped.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100/70 mt-6">
                  <button
                    onClick={() => handleOpenQualifications(staff)}
                    className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Scissors className="h-4.5 w-4.5 text-gray-400" /> Qualifications
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(staff)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Delete Stylist"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {staffList.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 bg-white border border-gray-100 rounded-3xl text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No stylists registered. Click "Add Stylist" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                <h3 className="font-bold text-lg">Add Stylist</h3>
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
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Stylist Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Stylist"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="add-staff-active"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="add-staff-active" className="text-sm font-semibold text-gray-700 select-none">
                  Available for bookings immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Stylist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Qualifications Mapping Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-800">
                <ShieldCheck className="h-5.5 w-5.5 text-green-600" />
                <h3 className="font-bold text-lg">Manage Qualifications</h3>
              </div>
              <button 
                onClick={() => setSelectedStaff(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stylist Name</p>
                <h4 className="font-extrabold text-base text-gray-900 mt-0.5">{selectedStaff.name}</h4>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Qualified Services</p>
                <div className="max-h-[250px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 p-2">
                  {serviceList.map((service) => {
                    const isChecked = qualifiedServiceIds.includes(service.id);
                    return (
                      <div 
                        key={service.id} 
                        onClick={() => handleToggleQualificationCheckbox(service.id)}
                        className="flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <span className="text-sm font-semibold text-gray-700">{service.name}</span>
                        <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? "bg-green-600 border-green-600 text-white" : "border-gray-200"
                        }`}>
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                  {serviceList.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">No catalog services found.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSaveQualifications}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Mappings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
