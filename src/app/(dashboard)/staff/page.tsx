"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";

interface StaffMember {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  department: string;
  status: string;
  [key: string]: any;
}

const defaultForm = { name: "", username: "", email: "", phone: "", password: "", department: "" };

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(() => {
    setLoading(true);
    api.get("/staff", { params: { page, per_page: 15, search } })
      .then((r) => { setStaff(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => toast.error("Failed to load staff"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setModalOpen(true); };
  const openEdit = (s: StaffMember) => {
    setForm({ name: s.name || "", username: s.username || "", email: s.email || "", phone: s.phone || "", password: "", department: s.department || "" });
    setEditId(s.id);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (editId && !payload.password) delete (payload as any).password;
    try {
      if (editId) { await api.put(`/staff/${editId}`, payload); toast.success("Staff updated"); }
      else { await api.post("/staff", payload); toast.success("Staff created"); }
      setModalOpen(false);
      fetchStaff();
    } catch (err: any) { toast.error(err.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this staff member?")) return;
    try { await api.delete(`/staff/${id}`); toast.success("Deleted"); fetchStaff(); }
    catch { toast.error("Delete failed"); }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "department", label: "Department" },
    { key: "status", label: "Status", render: (r: StaffMember) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "active" ? "bg-emerald-500/20 text-emerald-600" : "bg-red-500/20 text-red-600"}`}>{r.status}</span>
    )},
  ];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}><Plus className="w-4 h-4" /> Add Staff</button>
      </div>

      <DataTable columns={columns} data={staff} total={total} page={page} perPage={15}
        onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }} loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-yellow-600"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Staff" : "New Staff"}>
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Name"><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required /></FormField>
          <FormField label="Username"><input className={inputClass} value={form.username} onChange={(e) => set("username", e.target.value)} required /></FormField>
          <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></FormField>
          <FormField label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></FormField>
          <FormField label={editId ? "New Password (leave blank to keep)" : "Password"}>
            <input className={inputClass} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} {...(!editId ? { required: true } : {})} />
          </FormField>
          <FormField label="Department"><input className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)} /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
