"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Modal from "@/components/Modal";
import { FormField, inputClass, selectClass, btnPrimary, btnSecondary } from "@/components/FormField";
import toast from "react-hot-toast";
import { Users, Target, Ticket, Clock, TrendingUp, UserCheck, Phone, Calendar, IndianRupee, Trophy, Star, Plus, Copy, Check, ShieldCheck, LogIn, LogOut } from "lucide-react";
import LeadDetail from "@/components/LeadDetail";

interface Stats {
  [key: string]: any;
}

const leadStatusOptions = ["Lead", "Follow-Up", "Demo Scheduled", "Demo Completed", "Converted", "Converted as New Software", "Not Interested"];
const ticketStatusOptions = ["Open", "In Progress", "Resolved", "Closed"];
const priorityOptions = ["Low", "Medium", "High", "Urgent"];
const categoryOptions = ["Technical", "Billing", "General", "Feature Request", "Bug"];

const defaultLeadForm = {
  client_name: "", client_phone: "", client_email: "", client_issue: "",
  status: "Lead", assigned_employee_id: "", lead_source_id: "", remark: "", source_employee: "",
  followup_date: "", followup_time: "", conversion_date: "", conversion_amount: "",
};

const defaultTicketForm = {
  subject: "", description: "", client_name: "", client_phone: "", client_email: "",
  license_key: "", status: "Open", priority: "Medium", category: "General",
  assigned_to: "", admin_notes: "",
};

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" className="w-4 h-4 shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+91")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("91") && cleaned.length > 10) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  return "91" + cleaned;
}

export default function DashboardPage() {
  const { role, isAdminEmployee, user } = useAuth();
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [viewLeadId, setViewLeadId] = useState<number | null>(null);

  // Lead create
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [savingLead, setSavingLead] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Ticket create
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState(defaultTicketForm);
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketAssignMsg, setTicketAssignMsg] = useState<string | null>(null);
  const [ticketCopied, setTicketCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const [employees, setEmployees] = useState<any[]>([]);

  // Punch in/out
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [punching, setPunching] = useState(false);

  const effectiveRole = isAdminEmployee ? "super-admin" : role;

  useEffect(() => {
    if (!role) return;
    const endpoint = effectiveRole === "super-admin" ? "/dashboard/super-admin" : effectiveRole === "staff" ? "/dashboard/staff" : "/dashboard/employee";
    api.get(endpoint).then((r) => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [role, effectiveRole]);

  useEffect(() => {
    api.get("/lead-sources").then((r) => setLeadSources(r.data.data || r.data || [])).catch(() => {});
    if (effectiveRole === "super-admin" || effectiveRole === "staff") {
      api.get("/employees", { params: { per_page: 200 } }).then((r) => setEmployees(r.data.data || r.data)).catch(() => {});
    }
  }, [role, effectiveRole]);

  // Fetch attendance status for employees
  useEffect(() => {
    if (role === "employee" && !isAdminEmployee) {
      api.get("/attendance/today").then((r) => setTodayStatus(r.data)).catch(() => {});
    }
  }, [role, isAdminEmployee]);

  const handlePunch = async (type: "in" | "out") => {
    if (type === "out" && !confirm("Are you sure you want to punch out?")) return;
    setPunching(true);
    try {
      await api.post(type === "in" ? "/attendance/punch-in" : "/attendance/punch-out");
      toast.success(`Punched ${type} successfully`);
      api.get("/attendance/today").then((r) => setTodayStatus(r.data)).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Punch ${type} failed`);
    } finally { setPunching(false); }
  };

  const formatTime = (t: string | null) => {
    if (!t) return "-";
    try { return new Date(t).toLocaleTimeString(); } catch { return t; }
  };

  const fetchStats = () => {
    if (!role) return;
    const endpoint = effectiveRole === "super-admin" ? "/dashboard/super-admin" : effectiveRole === "staff" ? "/dashboard/staff" : "/dashboard/employee";
    api.get(endpoint).then((r) => setStats(r.data)).catch(() => {});
  };

  // Lead form helpers
  const setL = (k: string, v: string) => setLeadForm((p) => ({ ...p, [k]: v }));

  const handleLeadSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLead(true);
    try {
      const r = await api.post("/leads", leadForm);
      toast.success("Lead created");
      const lead = r.data;
      if (lead.assigned_employee_id) {
        const emp = employees.find((e: any) => e.id === lead.assigned_employee_id);
        const empName = lead.assigned_employee?.name || emp?.name || "-";
        const empTeams = emp?.teams?.map((t: any) => t.name || t).join(", ") || "";
        const assignType = !leadForm.assigned_employee_id ? "auto-assigned" : "assigned";
        const via = effectiveRole === "super-admin" ? "Super Admin" : user?.name || "Employee";
        setAssignMsg(`${lead.lead_number} - New lead ${assignType} to ${empName}${empTeams ? ` ${empTeams}` : ""}. Via ${via}`);
        setCopied(false);
      }
      setLeadModalOpen(false);
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSavingLead(false); }
  };

  // Ticket form helpers
  const setT = (k: string, v: string) => setTicketForm((p) => ({ ...p, [k]: v }));

  const handleVerifyClient = async () => {
    if (!ticketForm.license_key && !ticketForm.client_phone && !ticketForm.client_email) {
      toast.error("Enter a license key, phone, or email first"); return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const payload: any = {};
      if (ticketForm.license_key) payload.license_key = ticketForm.license_key;
      if (ticketForm.client_phone) payload.phone = ticketForm.client_phone;
      if (ticketForm.client_email) payload.email = ticketForm.client_email;
      const r = await api.post("/tickets/verify-client", payload);
      setVerifyResult(r.data);
      if (r.data.found) toast.success("Client found in system");
      else toast.error(r.data.message || "Client not found");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification failed");
      setVerifyResult({ error: true, message: "Verification failed" });
    } finally { setVerifying(false); }
  };

  const handleTicketSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTicket(true);
    try {
      const r = await api.post("/tickets", ticketForm);
      toast.success("Ticket created");
      const ticket = r.data;
      if (ticket.assigned_to) {
        const emp = employees.find((e: any) => e.id === ticket.assigned_to);
        const empName = ticket.assigned_employee?.name || emp?.name || "-";
        const empTeams = emp?.teams?.map((t: any) => t.name || t).join(", ") || "";
        const assignType = !ticketForm.assigned_to ? "auto-assigned" : "assigned";
        const via = effectiveRole === "super-admin" ? "Super Admin" : user?.name || "Employee";
        const clientInfo = `${ticket.client_name || ticketForm.client_name}(${ticket.client_phone || ticketForm.client_phone})`;
        setTicketAssignMsg(`${ticket.ticket_number} - New support for client ${clientInfo} ${assignType} to ${empName}${empTeams ? ` ${empTeams}` : ""}. Via ${ticketForm.category === "Technical" ? "Technical issue" : ticketForm.category === "Billing" ? "Billing query" : "Support call"} over phone`);
        setTicketCopied(false);
      }
      setTicketModalOpen(false);
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally { setSavingTicket(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Quick action buttons (shown for all roles)
  const QuickActions = () => (
    <div className="flex items-center gap-2">
      <button onClick={() => { setLeadForm(defaultLeadForm); setLeadModalOpen(true); }}
        className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
        <Plus className="w-4 h-4" /> New Lead
      </button>
      <button onClick={() => { setTicketForm(defaultTicketForm); setVerifyResult(null); setTicketModalOpen(true); }}
        className="px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 flex items-center gap-2">
        <Plus className="w-4 h-4" /> New Ticket
      </button>
    </div>
  );

  // Lead Create Modal
  const LeadCreateModal = () => (
    <Modal open={leadModalOpen} onClose={() => setLeadModalOpen(false)} title="New Lead" wide>
      <form onSubmit={handleLeadSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Client Name"><input className={inputClass} value={leadForm.client_name} onChange={(e) => setL("client_name", e.target.value)} required /></FormField>
        <FormField label="Phone"><input className={inputClass} value={leadForm.client_phone} onChange={(e) => setL("client_phone", e.target.value)} required /></FormField>
        <FormField label="Email"><input className={inputClass} type="email" value={leadForm.client_email} onChange={(e) => setL("client_email", e.target.value)} /></FormField>
        <FormField label="Source Employee"><input className={inputClass} value={leadForm.source_employee} onChange={(e) => setL("source_employee", e.target.value)} /></FormField>
        <FormField label="Status">
          <select className={selectClass} value={leadForm.status} onChange={(e) => {
            const s = e.target.value;
            if (s === "Follow-Up" || s === "Demo Scheduled") {
              setLeadForm((p) => ({ ...p, status: s, followup_date: p.followup_date || new Date().toISOString().split("T")[0], conversion_date: "", conversion_amount: "" }));
            } else if (s === "Converted" || s === "Converted as New Software") {
              setLeadForm((p) => ({ ...p, status: s, conversion_date: p.conversion_date || new Date().toISOString().split("T")[0], followup_date: "", followup_time: "" }));
            } else {
              setLeadForm((p) => ({ ...p, status: s, followup_date: "", followup_time: "", conversion_date: "", conversion_amount: "" }));
            }
          }}>
            {leadStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        {(leadForm.status === "Follow-Up" || leadForm.status === "Demo Scheduled") && (
          <>
            <FormField label={leadForm.status === "Demo Scheduled" ? "Demo Date" : "Follow-up Date"}>
              <input type="date" className={inputClass} value={leadForm.followup_date} onChange={(e) => setL("followup_date", e.target.value)} required />
            </FormField>
            <FormField label={leadForm.status === "Demo Scheduled" ? "Demo Time" : "Follow-up Time"}>
              <input type="time" className={inputClass} value={leadForm.followup_time} onChange={(e) => setL("followup_time", e.target.value)} />
            </FormField>
          </>
        )}
        {(leadForm.status === "Converted" || leadForm.status === "Converted as New Software") && (
          <>
            <FormField label="Conversion Date">
              <input type="date" className={inputClass} value={leadForm.conversion_date} onChange={(e) => setL("conversion_date", e.target.value)} required />
            </FormField>
            <FormField label="Amount (without GST)">
              <input type="number" step="0.01" min="0" className={inputClass} value={leadForm.conversion_amount} onChange={(e) => setL("conversion_amount", e.target.value)} required placeholder="₹ Amount" />
            </FormField>
          </>
        )}
        <FormField label="Lead Source">
          <select className={selectClass} value={leadForm.lead_source_id} onChange={(e) => setL("lead_source_id", e.target.value)}>
            <option value="">Select Source</option>
            {leadSources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
        {(effectiveRole === "super-admin" || effectiveRole === "staff") && (
          <FormField label="Assign To">
            <select className={selectClass} value={leadForm.assigned_employee_id} onChange={(e) => setL("assigned_employee_id", e.target.value)}>
              <option value="">Auto-assign (Round Robin)</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Client Issue" className="sm:col-span-2">
          <textarea className={inputClass + " h-20"} value={leadForm.client_issue} onChange={(e) => setL("client_issue", e.target.value)} />
        </FormField>
        <FormField label="Remark" className="sm:col-span-2">
          <textarea className={inputClass + " h-20"} value={leadForm.remark} onChange={(e) => setL("remark", e.target.value)} />
        </FormField>
        <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setLeadModalOpen(false)} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={savingLead} className={btnPrimary}>{savingLead ? "Saving..." : "Create"}</button>
        </div>
      </form>
    </Modal>
  );

  // Ticket Create Modal
  const TicketCreateModal = () => (
    <Modal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} title="New Ticket" wide>
      <form onSubmit={handleTicketSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Verify Client */}
        <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">Verify Client</label>
          <p className="text-xs text-blue-700 mb-2">Enter license key, phone, or email — then click Verify to check subscription status</p>
          <div className="flex gap-2">
            <input className={inputClass + " flex-1"} placeholder="License key..." value={ticketForm.license_key} onChange={(e) => { setT("license_key", e.target.value); setVerifyResult(null); }} />
            <button type="button" onClick={handleVerifyClient} disabled={verifying || (!ticketForm.license_key && !ticketForm.client_phone && !ticketForm.client_email)}
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
                    <span className={`text-sm font-semibold ${active ? "text-emerald-700" : "text-red-700"}`}>{active ? "Active Subscription" : "Expired Subscription"}</span>
                    <p className="text-xs text-gray-500">Found via <strong className="capitalize">{verifyResult.match_type}</strong></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block">Match Type</span><span className="font-semibold text-gray-800 capitalize">{verifyResult.match_type}</span></div>
                  <div className="bg-gray-50 p-2 rounded"><span className="text-gray-500 block">Subscription End</span><span className="font-semibold text-gray-800">{endDate || "N/A"}</span></div>
                </div>
                {isExpired && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800"><strong>⚠ Warning:</strong> Subscription expired on {endDate}.</div>}
                {active && <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800"><strong>✓ Active:</strong> Valid until {endDate}.</div>}
              </div>
            );
          })()}
          {verifyResult && !verifyResult.error && !verifyResult.found && (
            <div className="mt-3 bg-white border border-yellow-300 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-lg text-yellow-600">⚠</div>
                <div>
                  <span className="text-sm font-semibold text-yellow-800">Client Not Found</span>
                  <p className="text-xs text-gray-500">No matching client in the system.</p>
                </div>
              </div>
            </div>
          )}
          {verifyResult?.error && <p className="mt-2 text-xs text-red-600">{verifyResult.message || "Verification failed"}</p>}
        </div>

        <FormField label="Subject" className="sm:col-span-2"><input className={inputClass} value={ticketForm.subject} onChange={(e) => setT("subject", e.target.value)} required /></FormField>
        <FormField label="Client Name"><input className={inputClass} value={ticketForm.client_name} onChange={(e) => setT("client_name", e.target.value)} required /></FormField>
        <FormField label="Client Phone"><input className={inputClass} value={ticketForm.client_phone} onChange={(e) => setT("client_phone", e.target.value)} required /></FormField>
        <FormField label="Client Email"><input className={inputClass} type="email" value={ticketForm.client_email} onChange={(e) => setT("client_email", e.target.value)} /></FormField>
        <FormField label="Category">
          <select className={selectClass} value={ticketForm.category} onChange={(e) => setT("category", e.target.value)}>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Priority">
          <select className={selectClass} value={ticketForm.priority} onChange={(e) => setT("priority", e.target.value)}>
            {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Status">
          <select className={selectClass} value={ticketForm.status} onChange={(e) => setT("status", e.target.value)}>
            {ticketStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        {(effectiveRole === "super-admin" || effectiveRole === "staff") && (
          <FormField label="Assign To">
            <select className={selectClass} value={ticketForm.assigned_to} onChange={(e) => setT("assigned_to", e.target.value)}>
              <option value="">Auto-assign (Round Robin)</option>
              {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Description" className="sm:col-span-2">
          <textarea className={inputClass + " h-24"} value={ticketForm.description} onChange={(e) => setT("description", e.target.value)} />
        </FormField>
        <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setTicketModalOpen(false)} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={savingTicket} className={btnPrimary}>{savingTicket ? "Saving..." : "Create"}</button>
        </div>
      </form>
    </Modal>
  );

  // Assignment Message Modals
  const AssignMsgModal = ({ msg, onClose, isCopied, onCopy }: { msg: string | null; onClose: () => void; isCopied: boolean; onCopy: () => void }) => (
    <Modal open={!!msg} onClose={onClose} title="Assigned">
      {msg && (
        <div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-900 font-medium">{msg}</div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className={btnSecondary}>Close</button>
            <button onClick={onCopy} className={btnPrimary + " flex items-center gap-2"}>
              {isCopied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );

  // Super Admin / Staff Dashboard
  if (effectiveRole === "super-admin" || effectiveRole === "staff") {
    const cards = effectiveRole === "super-admin" ? [
      { label: "Total Leads", value: stats.total_leads ?? 0, icon: Target, color: "bg-blue-600" },
      { label: "Leads Today", value: stats.leads_today ?? 0, icon: TrendingUp, color: "bg-emerald-600" },
      { label: "Total Tickets", value: stats.total_tickets ?? 0, icon: Ticket, color: "bg-orange-600" },
      { label: "Tickets Today", value: stats.tickets_today ?? 0, icon: Ticket, color: "bg-red-600" },
      { label: "Employees", value: stats.total_employees ?? 0, icon: Users, color: "bg-cyan-600" },
      { label: "Active Employees", value: stats.active_employees ?? 0, icon: UserCheck, color: "bg-indigo-600" },
      { label: "Present Today", value: stats.present_today ?? 0, icon: Clock, color: "bg-teal-600" },
      { label: "Teams", value: stats.teams ?? 0, icon: Users, color: "bg-purple-600" },
    ] : [
      { label: "Department", value: stats.department ?? "-", icon: Users, color: "bg-indigo-600" },
      { label: "Team Members", value: stats.team_members ?? 0, icon: UserCheck, color: "bg-emerald-600" },
      { label: "Leads", value: stats.leads ?? 0, icon: Target, color: "bg-blue-600" },
      { label: "Tickets", value: stats.tickets ?? 0, icon: Ticket, color: "bg-orange-600" },
    ];

    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <QuickActions />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{card.label}</span>
                <div className={`${card.color} p-2 rounded-lg`}><card.icon className="w-4 h-4 text-white" /></div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
        {/* Employee-wise Current Month Conversions */}
        {(stats.employee_conversions || []).length >= 0 && (
          <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <h3 className="text-gray-900 font-semibold">Employee Conversions — {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h3>
              </div>
              <span className="text-xs text-gray-500">{(stats.employee_conversions || []).length} employees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-center">Conversions</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-right">Incentive (10%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(stats.employee_conversions || []).map((emp: any, idx: number) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{emp.employee_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm">{emp.conversion_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{(emp.total_amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">₹{(emp.incentive || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold text-sm">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-center">{(stats.employee_conversions || []).reduce((s: number, e: any) => s + e.conversion_count, 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-900">₹{(stats.employee_conversions || []).reduce((s: number, e: any) => s + e.total_amount, 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">₹{(stats.employee_conversions || []).reduce((s: number, e: any) => s + e.incentive, 0).toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <LeadCreateModal />
        <TicketCreateModal />
        <AssignMsgModal msg={assignMsg} onClose={() => setAssignMsg(null)} isCopied={copied} onCopy={() => { navigator.clipboard.writeText(assignMsg!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} />
        <AssignMsgModal msg={ticketAssignMsg} onClose={() => setTicketAssignMsg(null)} isCopied={ticketCopied} onCopy={() => { navigator.clipboard.writeText(ticketAssignMsg!); setTicketCopied(true); setTimeout(() => setTicketCopied(false), 2000); }} />
      </div>
    );
  }

  // Employee Dashboard
  const conv = stats.conversions || {};
  const followups = stats.followup_today || [];
  const demos = stats.demos_today || [];
  const progressPercent = conv.target ? Math.min((conv.count / conv.target) * 100, 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <QuickActions />
      </div>

      {/* Punch In/Out Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-gray-900 font-medium">Today&apos;s Attendance</h3>
            {todayStatus?.attendance ? (
              <div className="mt-2">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-700 rounded-full text-sm font-medium">
                    <UserCheck className="w-4 h-4" /> Present
                  </span>
                  {todayStatus.attendance.is_late && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-700 rounded-full text-sm font-medium">
                      <Clock className="w-4 h-4" /> Late by {todayStatus.attendance.late_minutes} min
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Punched in at {formatTime(todayStatus.attendance.punch_in_time)}
                  {todayStatus.attendance.punch_out_time && ` | Out at ${formatTime(todayStatus.attendance.punch_out_time)}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-1">You have not punched in yet today</p>
            )}
          </div>
          <div className="flex gap-3">
            {!todayStatus?.attendance && (
              <button onClick={() => handlePunch("in")} disabled={punching}
                className="px-6 py-3 bg-emerald-600 text-white text-base font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                <LogIn className="w-5 h-5" /> Punch In
              </button>
            )}
            {todayStatus?.attendance && !todayStatus.attendance.punch_out_time && (
              <button onClick={() => handlePunch("out")} disabled={punching}
                className="px-6 py-3 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Punch Out
              </button>
            )}
            {todayStatus?.attendance?.punch_out_time && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                <Check className="w-4 h-4" /> Day completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">My Leads</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.my_leads ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">My Tickets</span>
            <Ticket className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.my_tickets ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Today&apos;s Follow-ups</span>
            <Phone className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{followups.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Today&apos;s Demos</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{demos.length}</p>
        </div>
      </div>

      {/* Conversion & Incentive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold text-sm mb-3">Monthly Conversions</h3>
          <div className="text-center mb-3">
            <span className="text-4xl font-bold text-emerald-600">{conv.count || 0}</span>
            <span className="text-lg text-gray-400">/{conv.target || 7}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Target: {conv.target || 7}</span>
            <span>Milestone: {conv.milestone || 10}+</span>
          </div>
          {(conv.count || 0) >= (conv.milestone || 10) && (
            <div className="mt-3 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium text-yellow-800">Milestone achieved!</span>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold text-sm mb-3">{conv.month || "This Month"}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">Total Amount</span>
              </div>
              <span className="text-lg font-bold text-blue-900">₹{(conv.total_amount || 0).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-800">My Incentive (10%)</span>
              </div>
              <span className="text-lg font-bold text-emerald-900">₹{(conv.incentive || 0).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold text-sm mb-3">Converted Leads</h3>
          {(conv.list || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No conversions this month</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(conv.list || []).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs hover:bg-blue-50 cursor-pointer" onClick={() => setViewLeadId(l.id)}>
                  <div>
                    <span className="font-medium text-blue-600 hover:text-blue-800">{l.client_name}</span>
                    <span className="text-blue-400 ml-2">{l.lead_number}</span>
                  </div>
                  <span className="font-bold text-emerald-600">₹{(l.conversion_amount || 0).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Follow-ups & Demos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Phone className="w-4 h-4 text-yellow-600" />
            <h3 className="text-gray-900 font-semibold text-sm">Today&apos;s Follow-ups ({followups.length})</h3>
          </div>
          {followups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No follow-ups scheduled for today</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {followups.map((f: any) => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setViewLeadId(f.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600 hover:text-blue-800 text-sm">{f.client_name}</span>
                      <span className="text-xs text-blue-400 hover:text-blue-600">{f.lead_number}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <a href={`https://wa.me/${formatWhatsAppPhone(f.client_phone)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-green-600" onClick={(e) => e.stopPropagation()}>
                        <WhatsAppIcon /> {f.client_phone}
                      </a>
                      {f.followup_time && <span className="text-xs text-blue-600 font-medium">{f.followup_time}</span>}
                    </div>
                    {f.remark && <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{f.remark}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="text-gray-900 font-semibold text-sm">Today&apos;s Demos ({demos.length})</h3>
          </div>
          {demos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No demos scheduled for today</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {demos.map((d: any) => (
                <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setViewLeadId(d.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600 hover:text-blue-800 text-sm">{d.client_name}</span>
                      <span className="text-xs text-blue-400 hover:text-blue-600">{d.lead_number}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <a href={`https://wa.me/${formatWhatsAppPhone(d.client_phone)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-green-600" onClick={(e) => e.stopPropagation()}>
                        <WhatsAppIcon /> {d.client_phone}
                      </a>
                      {d.followup_time && <span className="text-xs text-purple-600 font-medium">{d.followup_time}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LeadDetail leadId={viewLeadId} onClose={() => setViewLeadId(null)} />
      <LeadCreateModal />
      <TicketCreateModal />
      <AssignMsgModal msg={assignMsg} onClose={() => setAssignMsg(null)} isCopied={copied} onCopy={() => { navigator.clipboard.writeText(assignMsg!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} />
      <AssignMsgModal msg={ticketAssignMsg} onClose={() => setTicketAssignMsg(null)} isCopied={ticketCopied} onCopy={() => { navigator.clipboard.writeText(ticketAssignMsg!); setTicketCopied(true); setTimeout(() => setTicketCopied(false), 2000); }} />
    </div>
  );
}
