"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import DataTable from "@/components/DataTable";
import CallLogHeatmap from "@/components/CallLogHeatmap";
import { selectClass } from "@/components/FormField";
import toast from "react-hot-toast";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, X } from "lucide-react";

interface CallLog {
  id: number;
  name: string;
  phone: string;
  type: string;
  duration: string;
  contact_time: string;
  mobile?: { name?: string; employee?: { name: string } };
  [key: string]: any;
}

export default function CallLogsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [heatmapFilter, setHeatmapFilter] = useState<{ employeeId: number | null; type: string | null; period: string } | null>(null);

  useEffect(() => {
    api.get("/employees", { params: { per_page: 200 } }).then((r) => setEmployees(r.data.data || r.data)).catch(() => {});
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params: any = { page, per_page: 50 };
    if (search) params.search = search;
    if (typeFilter) params.type = typeFilter;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (employeeFilter) params.employee_id = employeeFilter;
    if (heatmapFilter) {
      if (heatmapFilter.employeeId) params.employee_id = heatmapFilter.employeeId;
      if (heatmapFilter.type) params.type = heatmapFilter.type;
      params.period = heatmapFilter.period;
    }
    api.get("/call-logs", { params })
      .then((r) => { setLogs(r.data.data || r.data); setTotal(r.data.total || r.data.length); })
      .catch(() => toast.error("Failed to load call logs"))
      .finally(() => setLoading(false));
  }, [page, search, typeFilter, dateFrom, dateTo, employeeFilter, heatmapFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleHeatmapClick = (employeeId: number | null, type: string | null, period: string) => {
    setHeatmapFilter({ employeeId, type, period });
    setPage(1);
  };

  const callIcon = (type: string) => {
    if (type === "Incoming" || type === "incoming") return <PhoneIncoming className="w-4 h-4 text-emerald-600" />;
    if (type === "Outgoing" || type === "outgoing") return <PhoneOutgoing className="w-4 h-4 text-blue-600" />;
    if (type === "Missed" || type === "missed") return <PhoneMissed className="w-4 h-4 text-red-600" />;
    return <Phone className="w-4 h-4 text-gray-500" />;
  };

  const columns = [
    { key: "name", label: "Contact", render: (r: CallLog) => r.name || "-" },
    { key: "phone", label: "Phone" },
    { key: "type", label: "Type", render: (r: CallLog) => (
      <div className="flex items-center gap-2">{callIcon(r.type)}<span className="capitalize">{r.type}</span></div>
    )},
    { key: "duration", label: "Duration", render: (r: CallLog) => {
      const s = Number(r.duration) || 0;
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
    }},
    { key: "contact_time", label: "Time", render: (r: CallLog) => r.contact_time ? new Date(r.contact_time).toLocaleString() : "-" },
    { key: "employee", label: "Employee", render: (r: CallLog) => r.mobile?.employee?.name || r.mobile?.name || "-" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Call Logs</h1>

      <CallLogHeatmap onCellClick={handleHeatmapClick} />

      {heatmapFilter && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Filtered by:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {heatmapFilter.employeeId ? employees.find(e => e.id === heatmapFilter.employeeId)?.name || "Employee" : "All Employees"}
            {heatmapFilter.type && ` · ${heatmapFilter.type}`}
            {` · ${heatmapFilter.period.replace("_", " ")}`}
            <button onClick={() => setHeatmapFilter(null)} className="ml-1 hover:text-blue-900"><X className="w-3 h-3" /></button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={employeeFilter} onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1); }} className={selectClass + " w-auto"}>
          <option value="">All Employees</option>
          {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={selectClass + " w-auto"}>
          <option value="">All Types</option>
          <option value="Incoming">Incoming</option>
          <option value="Outgoing">Outgoing</option>
          <option value="Missed">Missed</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={selectClass + " w-auto"} placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={selectClass + " w-auto"} placeholder="To" />
      </div>

      <DataTable columns={columns} data={logs} total={total} page={page} perPage={50}
        onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }} loading={loading} />
    </div>
  );
}
