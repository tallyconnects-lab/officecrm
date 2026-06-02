"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, CheckCircle } from "lucide-react";

interface Reminder {
  id: number;
  lead?: { company_name: string };
  lead_id: number;
  type: string;
  reminder_date: string;
  reminder_time: string;
  notes: string;
  status: string;
  [key: string]: any;
}

const typeOptions = ["Call", "Follow Up", "Meeting", "Email", "WhatsApp", "Other"];
const defaultForm = { lead_id: "", type: "Call", reminder_date: "", reminder_time: "", notes: "" };

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [leads, setLeads] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("upcoming");

  const fetchReminders = useCallback(() => {
    setLoading(true);
    const params: any = { page, per_page: 15 };
    if (filter) params.filter = filter;
    api.get("/reminders", { params })
      .then((r) => { setReminders(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);
  useEffect(() => {
    api.get("/leads", { params: { per_page: 100 } }).then((r) => setLeads(r.data.data || r.data)).catch(() => {});
  }, []);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) { await api.put(`/reminders/${editId}`, form); toast.success("Updated"); }
      else { await api.post("/reminders", form); toast.success("Reminder created"); }
      setModalOpen(false);
      fetchReminders();
    } catch (err: any) { toast.error(err.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleComplete = async (id: number) => {
    try { await api.put(`/reminders/${id}`, { status: "completed" }); toast.success("Completed"); fetchReminders(); }
    catch { toast.error("Failed"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this reminder?")) return;
    try { await api.delete(`/reminders/${id}`); toast.success("Deleted"); fetchReminders(); }
    catch { toast.error("Failed"); }
  };

  const columns = [
    { key: "lead", label: "Lead", render: (r: Reminder) => r.lead?.company_name || "-" },
    { key: "type", label: "Type" },
    { key: "reminder_date", label: "Date", render: (r: Reminder) => new Date(r.reminder_date).toLocaleDateString() },
    { key: "reminder_time", label: "Time" },
    { key: "notes", label: "Notes", render: (r: Reminder) => <span className="truncate max-w-[200px] block">{r.notes || "-"}</span> },
    { key: "status", label: "Status", render: (r: Reminder) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "completed" ? "bg-emerald-500/20 text-emerald-600" : "bg-yellow-500/20 text-yellow-600"}`}>
        {r.status}
      </span>
    )},
  ];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}><Plus className="w-4 h-4" /> Add Reminder</button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={selectClass + " w-auto"}>
          <option value="upcoming">Upcoming</option>
          <option value="all">All</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <DataTable columns={columns} data={reminders} total={total} page={page} perPage={15}
        onPageChange={setPage} loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            {row.status !== "completed" && (
              <button onClick={() => handleComplete(row.id)} className="p-1.5 text-gray-500 hover:text-emerald-600" title="Complete"><CheckCircle className="w-4 h-4" /></button>
            )}
            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Reminder">
        <form onSubmit={handleSave} className="space-y-4">
          <FormField label="Lead">
            <select className={selectClass} value={form.lead_id} onChange={(e) => set("lead_id", e.target.value)} required>
              <option value="">Select Lead</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.company_name}</option>)}
            </select>
          </FormField>
          <FormField label="Type">
            <select className={selectClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Date"><input className={inputClass} type="date" value={form.reminder_date} onChange={(e) => set("reminder_date", e.target.value)} required /></FormField>
          <FormField label="Time"><input className={inputClass} type="time" value={form.reminder_time} onChange={(e) => set("reminder_time", e.target.value)} required /></FormField>
          <FormField label="Notes"><textarea className={inputClass + " h-20"} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
