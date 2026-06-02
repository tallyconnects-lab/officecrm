"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Plus, Eye, Edit2, Trash2, X, Upload, Download, FileSpreadsheet, Copy, Check } from "lucide-react";
import LeadHeatmap from "@/components/LeadHeatmap";
import LeadDetail from "@/components/LeadDetail";
import AssignmentPreview from "@/components/AssignmentPreview";

const statusOptions = ["Lead", "Follow-Up", "Demo Scheduled", "Demo Completed", "Converted", "Converted as New Software", "Not Interested"];

interface Lead {
  id: number;
  lead_number: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_issue: string;
  status: string;
  source_employee: string;
  assigned_employee_id: number | null;
  assigned_employee?: string;
  lead_source_id: number | null;
  lead_source?: { id: number; name: string };
  remark: string;
  created_at: string;
  [key: string]: any;
}

const defaultForm = {
  client_name: "", client_phone: "", client_email: "", client_issue: "",
  status: "Lead", assigned_employee_id: "", lead_source_id: "", remark: "", source_employee: "",
  followup_date: "", followup_time: "", conversion_date: "", conversion_amount: "",
};

function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("91") && cleaned.length > 10) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return "91" + cleaned;
}

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" className="w-4 h-4 shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function LeadsPage() {
  const { role, isAdminEmployee, user } = useAuth();
  const effectiveRole = isAdminEmployee ? "super-admin" : role;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [heatmapLabel, setHeatmapLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewLeadId, setViewLeadId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    const params: any = { page, per_page: 15 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (employeeFilter) params.assigned_employee_id = employeeFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.get("/leads", { params })
      .then((r) => { setLeads(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => toast.error("Failed to load leads"))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, employeeFilter, dateFrom, dateTo]);

  const periodToDates = (period: string): { from: string; to: string } => {
    const now = new Date();
    const d = (dt: Date) => dt.toISOString().split("T")[0];
    const startOfWeek = (dt: Date) => { const day = dt.getDay(); const diff = dt.getDate() - day + (day === 0 ? -6 : 1); return new Date(dt.setDate(diff)); };
    switch (period) {
      case "today": return { from: d(now), to: d(now) };
      case "this_week": { const s = startOfWeek(new Date()); const e = new Date(s); e.setDate(s.getDate() + 6); return { from: d(s), to: d(e) }; }
      case "last_week": { const s = startOfWeek(new Date()); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(s.getDate() + 6); return { from: d(s), to: d(e) }; }
      case "this_month": return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: d(now) };
      case "last_month": { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const le = new Date(now.getFullYear(), now.getMonth(), 0); return { from: d(lm), to: d(le) }; }
      default: return { from: d(now), to: d(now) };
    }
  };

  const handleHeatmapClick = (employeeId: number | null, status: string | null, period: string) => {
    const { from, to } = periodToDates(period);
    setDateFrom(from);
    setDateTo(to);
    setEmployeeFilter(employeeId ? String(employeeId) : "");
    setStatusFilter(status || "");
    setPage(1);
    // Build label
    const parts: string[] = [];
    if (employeeId) {
      const emp = employees.find((e) => e.id === employeeId);
      parts.push(emp?.name || `Employee #${employeeId}`);
    }
    if (status) parts.push(status);
    const periodLabels: Record<string, string> = { today: "Today", this_week: "This Week", last_week: "Last Week", this_month: "This Month", last_month: "Last Month" };
    parts.push(periodLabels[period] || period);
    setHeatmapLabel(parts.join(" - "));
  };

  const clearHeatmapFilter = () => {
    setDateFrom("");
    setDateTo("");
    setEmployeeFilter("");
    setStatusFilter("");
    setHeatmapLabel("");
    setPage(1);
  };

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    if (effectiveRole === "super-admin" || effectiveRole === "staff") {
      api.get("/employees", { params: { per_page: 200 } }).then((r) => setEmployees(r.data.data || r.data)).catch(() => {});
    }
    api.get("/lead-sources").then((r) => setLeadSources(r.data.data || r.data || [])).catch(() => {});
  }, [role]);

  const openCreate = () => { setForm(defaultForm); setEditId(null); setModalOpen(true); };
  const openEdit = (lead: Lead) => {
    setForm({
      client_name: lead.client_name || "", client_phone: lead.client_phone || "",
      client_email: lead.client_email || "", client_issue: lead.client_issue || "",
      status: lead.status || "New", assigned_employee_id: lead.assigned_employee_id?.toString() || "",
      lead_source_id: lead.lead_source_id?.toString() || "", remark: lead.remark || "",
      source_employee: lead.source_employee || "",
      followup_date: lead.followup_date || "", followup_time: lead.followup_time || "",
      conversion_date: lead.conversion_date || "", conversion_amount: lead.conversion_amount?.toString() || "",
    });
    setEditId(lead.id);
    setModalOpen(true);
  };

  const buildAssignMsg = (lead: any, isNew: boolean) => {
    const empId = lead.assigned_employee_id;
    const emp = employees.find((e: any) => e.id === empId);
    const empName = lead.assigned_employee?.name || emp?.name || "-";
    const empTeams = emp?.teams?.map((t: any) => t.name || t).join(", ") || "";
    const assignType = isNew && !form.assigned_employee_id ? "auto-assigned" : "assigned";
    const via = effectiveRole === "super-admin" ? "Super Admin" : effectiveRole === "staff" ? "Staff" : user?.name || "Employee";
    return `${lead.lead_number} - ${isNew ? "New lead" : "Lead"} ${assignType} to ${empName}${empTeams ? ` ${empTeams}` : ""}. Via ${via}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const r = await api.put(`/leads/${editId}`, form);
        toast.success("Lead updated");
        const lead = r.data;
        if (lead.assigned_employee_id) {
          setAssignMsg(buildAssignMsg(lead, false));
          setCopied(false);
        }
      } else {
        const r = await api.post("/leads", form);
        toast.success("Lead created");
        const lead = r.data;
        if (lead.assigned_employee_id) {
          setAssignMsg(buildAssignMsg(lead, true));
          setCopied(false);
        }
      }
      setModalOpen(false);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const r = await api.post("/leads/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(r.data);
      toast.success(r.data.message);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Import failed");
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    api.get("/leads/import-template", { responseType: "blob" }).then((r) => {
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "lead_import_template.csv";
      a.click();
    }).catch(() => toast.error("Failed to download template"));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      fetchLeads();
    } catch { toast.error("Delete failed"); }
  };

  const columns = [
    { key: "lead_number", label: "#" },
    { key: "client_name", label: "Client Name" },
    { key: "client_phone", label: "Phone", render: (r: Lead) => (
      <a
        href={`https://wa.me/${formatWhatsAppPhone(r.client_phone)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-gray-700 hover:text-green-600 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <WhatsAppIcon />
        <span>{r.client_phone}</span>
      </a>
    )},
    { key: "status", label: "Status", render: (r: Lead) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        r.status === "Converted" || r.status === "Converted as New Software" ? "bg-emerald-500/20 text-emerald-600" :
        r.status === "Not Interested" ? "bg-red-500/20 text-red-600" :
        r.status === "Lead" ? "bg-blue-500/20 text-blue-600" :
        r.status === "Follow-Up" ? "bg-yellow-500/20 text-yellow-600" :
        r.status === "Demo Scheduled" ? "bg-purple-500/20 text-purple-600" :
        r.status === "Demo Completed" ? "bg-cyan-500/20 text-cyan-600" :
        "bg-gray-200 text-gray-700"
      }`}>{r.status}</span>
    )},
    { key: "lead_source", label: "Source", render: (r: Lead) => r.lead_source?.name || "-" },
    ...(effectiveRole !== "employee" ? [{ key: "assigned_employee", label: "Assigned To", render: (r: Lead) => {
      const ae = r.assigned_employee;
      if (!ae) return "-";
      if (typeof ae === "object") return (ae as any).name || "-";
      return ae;
    }}] : []),
  ];

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{effectiveRole === "employee" ? "My Leads" : "Leads"}</h1>
        <div className="flex items-center gap-2">
          {effectiveRole === "super-admin" && (
            <button onClick={() => { setImportModalOpen(true); setImportFile(null); setImportResult(null); }} className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" /> Import Excel
            </button>
          )}
          <button onClick={openCreate} className={btnPrimary + " flex items-center gap-2"}>
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      <LeadHeatmap onCellClick={handleHeatmapClick} />

      {heatmapLabel && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Filtered:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-600 rounded-lg text-sm font-medium">
            {heatmapLabel}
            <button onClick={clearHeatmapFilter} className="hover:text-gray-900"><X className="w-3.5 h-3.5" /></button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); setHeatmapLabel(""); }} className={selectClass + " w-auto"}>
          <option value="">All Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        total={total}
        page={page}
        perPage={15}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        searchPlaceholder="Search by name, phone, email or lead #..."
        loading={loading}
        actions={(row) => (
          <div className="flex items-center gap-1">
            <button onClick={() => setViewLeadId(row.id)} className="p-1.5 text-gray-500 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
            <button onClick={() => openEdit(row)} className="p-1.5 text-gray-500 hover:text-yellow-600"><Edit2 className="w-4 h-4" /></button>
            {effectiveRole === "super-admin" && (
              <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        )}
      />

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Lead" : "New Lead"} wide>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Client Name"><input className={inputClass} value={form.client_name} onChange={(e) => set("client_name", e.target.value)} required /></FormField>
          <FormField label="Phone"><input className={inputClass} value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} required /></FormField>
          <FormField label="Email"><input className={inputClass} type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} /></FormField>
          <FormField label="Source Employee"><input className={inputClass} value={form.source_employee} onChange={(e) => set("source_employee", e.target.value)} /></FormField>
          <FormField label="Status">
            <select className={selectClass} value={form.status} onChange={(e) => {
              const newStatus = e.target.value;
              set("status", newStatus);
              if (newStatus === "Follow-Up" || newStatus === "Demo Scheduled") {
                setForm((p) => ({ ...p, status: newStatus, followup_date: p.followup_date || new Date().toISOString().split("T")[0], conversion_date: "", conversion_amount: "" }));
              } else if (newStatus === "Converted" || newStatus === "Converted as New Software") {
                setForm((p) => ({ ...p, status: newStatus, conversion_date: p.conversion_date || new Date().toISOString().split("T")[0], followup_date: "", followup_time: "" }));
              } else {
                setForm((p) => ({ ...p, status: newStatus, followup_date: "", followup_time: "", conversion_date: "", conversion_amount: "" }));
              }
            }}>
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          {(form.status === "Follow-Up" || form.status === "Demo Scheduled") && (
            <>
              <FormField label={form.status === "Demo Scheduled" ? "Demo Date" : "Follow-up Date"}>
                <input type="date" className={inputClass} value={form.followup_date} onChange={(e) => set("followup_date", e.target.value)} required />
              </FormField>
              <FormField label={form.status === "Demo Scheduled" ? "Demo Time" : "Follow-up Time"}>
                <input type="time" className={inputClass} value={form.followup_time} onChange={(e) => set("followup_time", e.target.value)} />
              </FormField>
            </>
          )}
          {(form.status === "Converted" || form.status === "Converted as New Software") && (
            <>
              <FormField label="Conversion Date">
                <input type="date" className={inputClass} value={form.conversion_date} onChange={(e) => set("conversion_date", e.target.value)} required />
              </FormField>
              <FormField label="Amount (without GST)">
                <input type="number" step="0.01" min="0" className={inputClass} value={form.conversion_amount} onChange={(e) => set("conversion_amount", e.target.value)} required placeholder="₹ Amount" />
              </FormField>
            </>
          )}
          <FormField label="Lead Source">
            <select className={selectClass} value={form.lead_source_id} onChange={(e) => set("lead_source_id", e.target.value)}>
              <option value="">Select Source</option>
              {leadSources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          {(effectiveRole === "super-admin" || effectiveRole === "staff") && (
            <FormField label="Assign To">
              <select className={selectClass} value={form.assigned_employee_id} onChange={(e) => set("assigned_employee_id", e.target.value)}>
                <option value="">Auto-assign (Round Robin)</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </FormField>
          )}
          {!editId && !form.assigned_employee_id && (
            <AssignmentPreview type="lead" manualAssignee={form.assigned_employee_id} />
          )}
          <FormField label="Client Issue" className="sm:col-span-2">
            <textarea className={inputClass + " h-20"} value={form.client_issue} onChange={(e) => set("client_issue", e.target.value)} />
          </FormField>
          <FormField label="Remark" className="sm:col-span-2">
            <textarea className={inputClass + " h-20"} value={form.remark} onChange={(e) => set("remark", e.target.value)} />
          </FormField>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>Cancel</button>
            <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : editId ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Leads from Excel">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-900 font-medium">Upload Excel or CSV file</p>
                <p className="text-blue-700 mt-1">Required columns: <strong>client_name</strong>, <strong>client_phone</strong></p>
                <p className="text-blue-700">Optional: client_email, client_issue, remark, source_employee, status</p>
                <p className="text-blue-700 mt-1">Leads will be auto-assigned via round-robin to present Sales team employees.</p>
              </div>
            </div>
          </div>

          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Download className="w-4 h-4" /> Download sample template (CSV)
          </button>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {importFile && (
              <p className="mt-2 text-sm text-gray-600">{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>

          {importResult && (
            <div className={`rounded-lg p-4 ${importResult.imported > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-yellow-50 border border-yellow-200"}`}>
              <p className="font-medium text-sm">
                <span className="text-emerald-700">{importResult.imported} imported</span>
                {importResult.skipped > 0 && <span className="text-yellow-700"> · {importResult.skipped} skipped</span>}
              </p>
              {importResult.errors?.length > 0 && (
                <ul className="mt-2 text-xs text-gray-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {importResult.errors.map((err: string, i: number) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setImportModalOpen(false)} className={btnSecondary}>
              {importResult ? "Close" : "Cancel"}
            </button>
            {!importResult && (
              <button onClick={handleImport} disabled={!importFile || importing} className={btnPrimary + " flex items-center gap-2"}>
                {importing ? "Importing..." : <><Upload className="w-4 h-4" /> Import</>}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Assignment Message */}
      <Modal open={!!assignMsg} onClose={() => setAssignMsg(null)} title="Lead Assigned">
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

      {/* Lead Detail with Activity Timeline */}
      <LeadDetail leadId={viewLeadId} onClose={() => setViewLeadId(null)} />
    </div>
  );
}
