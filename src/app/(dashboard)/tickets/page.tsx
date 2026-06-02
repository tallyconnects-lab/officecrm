"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Plus, Eye, Edit2, Trash2, X, Copy, Check, ShieldCheck } from "lucide-react";
import TicketHeatmap from "@/components/TicketHeatmap";
import TicketMonthlyHeatmap from "@/components/TicketMonthlyHeatmap";
import AssignmentPreview from "@/components/AssignmentPreview";

const statusOptions = ["Open", "In Progress", "Resolved", "Closed"];
const priorityOptions = ["Low", "Medium", "High", "Urgent"];
const categoryOptions = ["Technical", "Billing", "General", "Feature Request", "Bug"];

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  license_key: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: number | null;
  employee_id: number | null;
  employee?: { name: string };
  assigned_employee?: { name: string };
  resolution: string;
  admin_notes: string;
  created_at: string;
  [key: string]: any;
}

const defaultForm = {
  subject: "", description: "", client_name: "", client_phone: "", client_email: "",
  license_key: "", status: "Open", priority: "Medium", category: "General",
  assigned_to: "", admin_notes: "",
};

export default function TicketsPage() {
  const { role, isAdminEmployee, user } = useAuth();
  const effectiveRole = isAdminEmployee ? "super-admin" : role;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Ticket | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [heatmapFilter, setHeatmapFilter] = useState<{ employeeId: number | null; status: string | null; period: string } | null>(null);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const fetchTickets = useCallback(() => {
    setLoading(true);
    const params: any = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (heatmapFilter) {
      if (heatmapFilter.employeeId) params.assigned_to = heatmapFilter.employeeId;
      if (heatmapFilter.status) params.status = heatmapFilter.status;
      params.period = heatmapFilter.period;
    }
    api.get("/tickets", { params })
      .then((r) => { setTickets(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => toast.error("Failed to load tickets"))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, heatmapFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (effectiveRole === "super-admin" || effectiveRole === "staff") {
      api.get("/employees", { params: { per_page: 200 } }).then((r) => setEmployees(r.data.data || r.data)).catch(() => {});
    }
  }, [role]);

  const handleVerifyClient = async () => {
    if (!form.license_key && !form.client_phone && !form.client_email) {
      toast.error("Enter a license key, phone, or email first");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const payload: any = {};
      if (form.license_key) payload.license_key = form.license_key;
      if (form.client_phone) payload.phone = form.client_phone;
      if (form.client_email) payload.email = form.client_email;
      const r = await api.post("/tickets/verify-client", payload);
      const data = r.data;
      setVerifyResult(data);
      if (data.found) {
        toast.success("Client found in system");
      } else {
        toast.error(data.message || "Client not found");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
      setVerifyResult({ error: true, message: "Verification failed" });
    } finally { setVerifying(false); }
  };

  const openCreate = () => { setForm(defaultForm); setEditId(null); setVerifyResult(null); setModalOpen(true); };
  const openEdit = (t: Ticket) => {
    setForm({
      subject: t.subject || "", description: t.description || "",
      client_name: t.client_name || "", client_phone: t.client_phone || "",
      client_email: t.client_email || "", license_key: t.license_key || "",
      status: t.status || "Open", priority: t.priority || "Medium",
      category: t.category || "General", assigned_to: t.assigned_to?.toString() || "",
      admin_notes: t.admin_notes || "",
    });
    setEditId(t.id);
    setModalOpen(true);
  };

  const buildTicketAssignMsg = (ticket: any, isNew: boolean) => {
    const empId = ticket.assigned_to;
    const emp = employees.find((e: any) => e.id === empId);
    const empName = ticket.assigned_employee?.name || emp?.name || "-";
    const empTeams = emp?.teams?.map((t: any) => t.name || t).join(", ") || "";
    const assignType = isNew && !form.assigned_to ? "auto-assigned" : "assigned";
    const via = effectiveRole === "super-admin" ? "Super Admin" : effectiveRole === "staff" ? "Staff" : user?.name || "Employee";
    const clientInfo = `${ticket.client_name || form.client_name}(${ticket.client_phone || form.client_phone})`;
    return `${ticket.ticket_number} - ${isNew ? "New support" : "Support"} for client ${clientInfo} ${assignType} to ${empName}${empTeams ? ` ${empTeams}` : ""}. Via ${form.category === "Technical" ? "Technical issue" : form.category === "Billing" ? "Billing query" : "Support call"} over phone`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const r = await api.put(`/tickets/${editId}`, form);
        toast.success("Ticket updated");
        const ticket = r.data;
        if (ticket.assigned_to) {
          setAssignMsg(buildTicketAssignMsg(ticket, false));
          setCopied(false);
        }
      } else {
        const r = await api.post("/tickets", form);
        toast.success("Ticket created");
        const ticket = r.data;
        if (ticket.assigned_to) {
          setAssignMsg(buildTicketAssignMsg(ticket, true));
          setCopied(false);
        }
      }
      setModalOpen(false);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ticket?")) return;
    try { await api.delete(`/tickets/${id}`); toast.success("Deleted"); fetchTickets(); }
    catch { toast.error("Delete failed"); }
  };

  const priorityColor = (p: string) =>
    p === "Urgent" ? "bg-red-500/20 text-red-600" :
    p === "High" ? "bg-orange-500/20 text-orange-600" :
    p === "Medium" ? "bg-yellow-500/20 text-yellow-600" :
    "bg-gray-200 text-gray-700";

  const statusColor = (s: string) =>
    s === "Resolved" || s === "Closed" ? "bg-emerald-500/20 text-emerald-600" :
    s === "Open" ? "bg-blue-500/20 text-blue-600" :
    "bg-purple-500/20 text-purple-600";

  const columns = [
    { key: "ticket_number", label: "#" },
    { key: "subject", label: "Subject" },
    { key: "client_name", label: "Client" },
    { key: "priority", label: "Priority", render: (r: Ticket) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor(r.priority)}`}>{r.priority}</span> },
    { key: "status", label: "Status", render: (r: Ticket) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(r.status)}`}>{r.status}</span> },
    ...(effectiveRole !== "employee" ? [{ key: "assigned_employee", label: "Assigned To", render: (r: Ticket) => r.assigned_employee?.name || "-" }] : []),
  ];

  const handleHeatmapClick = (employeeId: number | null, status: string | null, period: string) => {
    setHeatmapFilter({ employeeId, status, period });
    setPage(1);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}>
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <TicketHeatmap onCellClick={handleHeatmapClick} />
      <TicketMonthlyHeatmap />

      {heatmapFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Filtered by:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {heatmapFilter.employeeId ? employees.find(e => e.id === heatmapFilter.employeeId)?.name || "Employee" : "All Employees"}
            {heatmapFilter.status && ` · ${heatmapFilter.status}`}
            {` · ${heatmapFilter.period.replace("_", " ")}`}
            <button onClick={() => setHeatmapFilter(null)} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass + " w-auto"}>
          <option value="">All Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns} data={tickets} total={total} page={page} perPage={15}
        onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }} loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => setViewModal(row)} className="p-1.5 text-gray-500 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-yellow-600"><Edit2 className="w-4 h-4" /></button>
            {effectiveRole === "super-admin" && <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Ticket" : "New Ticket"} wide>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* License Key Verify Section */}
          <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">Verify Client</label>
            <p className="text-xs text-blue-700 mb-2">Enter license key, phone, or email — then click Verify to check subscription status</p>
            <div className="flex gap-2">
              <input className={inputClass + " flex-1"} placeholder="License key..." value={form.license_key} onChange={(e) => { set("license_key", e.target.value); setVerifyResult(null); }} />
              <button type="button" onClick={handleVerifyClient} disabled={verifying || (!form.license_key && !form.client_phone && !form.client_email)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4" /> {verifying ? "Verifying..." : "Verify"}
              </button>
            </div>
            {verifyResult && !verifyResult.error && verifyResult.found && (() => {
              const isActive = verifyResult.status === 1;
              const endDate = verifyResult.dateend;
              const isExpired = endDate ? new Date(endDate) < new Date() : false;
              const active = isActive && !isExpired;
              return (
                <div className={`mt-3 bg-white border ${active ? "border-emerald-300" : "border-red-300"} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${active ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                      {active ? "✓" : "✗"}
                    </div>
                    <div>
                      <span className={`text-sm font-semibold ${active ? "text-emerald-700" : "text-red-700"}`}>
                        {active ? "Active Subscription" : "Expired Subscription"}
                      </span>
                      <p className="text-xs text-gray-500">Found via <strong className="capitalize">{verifyResult.match_type}</strong></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block">Match Type</span><span className="font-semibold text-gray-800 capitalize">{verifyResult.match_type}</span></div>
                    <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block">Subscription End</span><span className="font-semibold text-gray-800">{endDate || "N/A"}</span></div>
                  </div>
                  {isExpired && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>⚠ Warning:</strong> Subscription expired on {endDate}. Client may need renewal.
                    </div>
                  )}
                  {active && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                      <strong>✓ Active:</strong> Valid subscription until {endDate}.
                    </div>
                  )}
                </div>
              );
            })()}
            {verifyResult && !verifyResult.error && !verifyResult.found && (
              <div className="mt-3 bg-white border border-yellow-300 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-lg text-yellow-600">⚠</div>
                  <div>
                    <span className="text-sm font-semibold text-yellow-800">Client Not Found</span>
                    <p className="text-xs text-gray-500">No matching client in the system. Verify details before proceeding.</p>
                  </div>
                </div>
              </div>
            )}
            {verifyResult?.error && (
              <p className="mt-2 text-xs text-red-600">{verifyResult.message || "Verification failed"}</p>
            )}
          </div>

          <FormField label="Subject" className="sm:col-span-2"><input className={inputClass} value={form.subject} onChange={(e) => set("subject", e.target.value)} required /></FormField>
          <FormField label="Client Name"><input className={inputClass} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} required /></FormField>
          <FormField label="Client Phone"><input className={inputClass} value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} required /></FormField>
          <FormField label="Client Email"><input className={inputClass} type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></FormField>
          <FormField label="Category">
            <select className={selectClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select className={selectClass} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className={selectClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          {(effectiveRole === "super-admin" || effectiveRole === "staff") && (
            <FormField label="Assign To">
              <select className={selectClass} value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Auto-assign (Round Robin)</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </FormField>
          )}
          {!editId && !form.assigned_to && (
            <AssignmentPreview type="ticket" manualAssignee={form.assigned_to} />
          )}
          <FormField label="Description" className="sm:col-span-2">
            <textarea className={inputClass + " h-24"} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </FormField>
          {effectiveRole === "super-admin" && (
            <FormField label="Admin Notes" className="sm:col-span-2">
              <textarea className={inputClass + " h-20"} value={form.admin_notes} onChange={(e) => set("admin_notes", e.target.value)} />
            </FormField>
          )}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Ticket Details" wide>
        {viewModal && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries({
              "Ticket #": viewModal.ticket_number, "Subject": viewModal.subject,
              "Client": viewModal.client_name, "Phone": viewModal.client_phone,
              "Email": viewModal.client_email, "License Key": viewModal.license_key,
              "Category": viewModal.category, "Priority": viewModal.priority,
              "Status": viewModal.status,
              "Assigned To": viewModal.assigned_employee?.name || "-",
              "Created By": viewModal.employee?.name || "-",
              "Created": new Date(viewModal.created_at).toLocaleDateString(),
            }).map(([k, v]) => (
              <div key={k}><span className="text-gray-500">{k}</span><p className="text-gray-900 mt-0.5">{v || "-"}</p></div>
            ))}
            {viewModal.description && (
              <div className="col-span-2"><span className="text-gray-500">Description</span><p className="text-gray-900 mt-0.5">{viewModal.description}</p></div>
            )}
            {viewModal.resolution && (
              <div className="col-span-2"><span className="text-gray-500">Resolution</span><p className="text-gray-900 mt-0.5">{viewModal.resolution}</p></div>
            )}
          </div>
        )}
      </Modal>

      {/* Assignment Message */}
      <Modal open={!!assignMsg} onClose={() => setAssignMsg(null)} title="Ticket Assigned">
        {assignMsg && (
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-900 font-medium">
              {assignMsg}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setAssignMsg(null)} className={btnSecondary}>Close</button>
              <button
                onClick={() => { navigator.clipboard.writeText(assignMsg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={btnPrimary + " flex items-center gap-2"}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
