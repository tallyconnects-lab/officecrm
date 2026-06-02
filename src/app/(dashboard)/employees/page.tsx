"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { FormField, inputClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Key } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  employee_code: string;
  is_active: boolean;
  teams?: { id: number; name: string }[];
  created_at: string;
  [key: string]: any;
}

const defaultForm = {
  name: "", username: "", email: "", phone: "", password: "",
  address: "", date_of_birth: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    api.get("/employees", { params: { page, per_page: 15, search } })
      .then((r) => { setEmployees(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setModalOpen(true); };
  const openEdit = (emp: Employee) => {
    setForm({
      name: emp.name || "", username: emp.username || "", email: emp.email || "",
      phone: emp.phone || "", password: "", address: emp.address || "",
      date_of_birth: emp.date_of_birth || "",
    });
    setEditId(emp.id);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form };
    if (editId && !payload.password) delete (payload as any).password;
    try {
      if (editId) { await api.put(`/employees/${editId}`, payload); toast.success("Employee updated"); }
      else { await api.post("/employees", payload); toast.success("Employee created"); }
      setModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this employee?")) return;
    try { await api.delete(`/employees/${id}`); toast.success("Deleted"); fetchEmployees(); }
    catch { toast.error("Delete failed"); }
  };

  const handleResetPassword = async (id: number) => {
    const pw = prompt("Enter new password (min 6 chars):");
    if (!pw || pw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    try { await api.post(`/employees/${id}/reset-password`, { password: pw }); toast.success("Password reset"); }
    catch { toast.error("Failed"); }
  };

  const columns = [
    { key: "employee_code", label: "Code" },
    { key: "name", label: "Name" },
    { key: "username", label: "Username" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "teams", label: "Teams", render: (r: Employee) => r.teams?.map((t) => t.name).join(", ") || "-" },
    { key: "is_active", label: "Status", render: (r: Employee) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.is_active ? "bg-emerald-500/20 text-emerald-600" : "bg-red-500/20 text-red-600"}`}>
        {r.is_active ? "Active" : "Inactive"}
      </span>
    )},
  ];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <DataTable columns={columns} data={employees} total={total} page={page} perPage={15}
        onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }} loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-yellow-600"><Edit2 className="w-4 h-4" /></button>
            <button onClick={() => handleResetPassword(row.id)} className="p-1.5 text-gray-500 hover:text-blue-600" title="Reset Password"><Key className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Employee" : "New Employee"} wide>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Name"><input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} required /></FormField>
          <FormField label="Username"><input className={inputClass} value={form.username} onChange={(e) => set("username", e.target.value)} required /></FormField>
          <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></FormField>
          <FormField label="Phone"><input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></FormField>
          <FormField label={editId ? "New Password (leave blank to keep)" : "Password"}>
            <input className={inputClass} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} {...(!editId ? { required: true } : {})} />
          </FormField>
          <FormField label="Date of Birth"><input className={inputClass} type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} /></FormField>
          <FormField label="Address" className="sm:col-span-2"><input className={inputClass} value={form.address} onChange={(e) => set("address", e.target.value)} /></FormField>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
