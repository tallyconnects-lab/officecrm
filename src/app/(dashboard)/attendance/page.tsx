"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DataTable from "@/components/DataTable";
import { btnPrimary, selectClass } from "@/components/FormField";
import toast from "react-hot-toast";
import { LogIn, LogOut, Users, UserCheck, UserX, Clock } from "lucide-react";

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee?: { name: string };
  date: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string;
  is_late: boolean;
  late_minutes: number;
  total_hours?: string;
  [key: string]: any;
}

export default function AttendancePage() {
  const { role, isAdminEmployee } = useAuth();
  const effectiveRole = isAdminEmployee ? "super-admin" : role;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [punching, setPunching] = useState(false);
  const [dateFilter, setDateFilter] = useState("");

  const isEmployee = effectiveRole === "employee";
  const isAdmin = effectiveRole === "super-admin" || effectiveRole === "staff";

  const fetchRecords = useCallback(() => {
    setLoading(true);
    if (isEmployee) {
      const params: any = { page, per_page: 15 };
      api.get("/attendance/history", { params })
        .then((r) => {
          const logs = r.data.logs || r.data;
          setRecords(logs.data || logs);
          setTotal(logs.total || (logs.data || logs).length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      const params: any = { date: dateFilter || new Date().toISOString().split("T")[0] };
      api.get("/attendance/admin", { params })
        .then((r) => {
          setRecords(r.data.logs || []);
          setAbsentEmployees(r.data.absent_employees || []);
          setTotal((r.data.logs || []).length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [page, isEmployee, dateFilter, isAdmin]);

  const fetchToday = () => {
    if (!isEmployee) return;
    api.get("/attendance/today").then((r) => setTodayStatus(r.data)).catch(() => {});
  };

  useEffect(() => { fetchRecords(); fetchToday(); }, [fetchRecords]);

  // Warn employee before closing if punched in but not out
  useEffect(() => {
    if (!isEmployee) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (todayStatus?.attendance && !todayStatus.attendance.punch_out_time) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEmployee, todayStatus]);

  const handlePunch = async (type: "in" | "out") => {
    if (type === "out" && !confirm("Are you sure you want to punch out?")) return;
    setPunching(true);
    try {
      const endpoint = type === "in" ? "/attendance/punch-in" : "/attendance/punch-out";
      await api.post(endpoint);
      toast.success(`Punched ${type} successfully`);
      fetchToday();
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Punch ${type} failed`);
    } finally { setPunching(false); }
  };

  const statusColor = (s: string) =>
    s === "present" ? "bg-emerald-500/20 text-emerald-600" :
    s === "late" ? "bg-yellow-500/20 text-yellow-600" :
    s === "half_day" ? "bg-orange-500/20 text-orange-600" :
    "bg-red-500/20 text-red-600";

  const formatTime = (t: string | null) => {
    if (!t) return "-";
    try { return new Date(t).toLocaleTimeString(); } catch { return t; }
  };

  const columns = [
    ...(!isEmployee ? [{ key: "employee", label: "Employee", render: (r: AttendanceRecord) => r.employee?.name || "-" }] : []),
    { key: "date", label: "Date", render: (r: AttendanceRecord) => new Date(r.date).toLocaleDateString() },
    { key: "punch_in_time", label: "Punch In", render: (r: AttendanceRecord) => formatTime(r.punch_in_time) },
    { key: "punch_out_time", label: "Punch Out", render: (r: AttendanceRecord) => formatTime(r.punch_out_time) },
    { key: "status", label: "Status", render: (r: AttendanceRecord) => <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    { key: "is_late", label: "Late", render: (r: AttendanceRecord) => r.is_late ? `${r.late_minutes} min` : "-" },
  ];

  const presentCount = records.filter(r => r.status === "present").length;
  const lateCount = records.filter(r => r.is_late).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
      </div>

      {/* Employee Punch In/Out Card */}
      {isEmployee && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-gray-900 font-medium">Today&apos;s Status</h3>
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
                <button onClick={() => handlePunch("in")} disabled={punching} className={btnPrimary + " flex items-center gap-2 text-base px-6 py-3"}>
                  <LogIn className="w-5 h-5" /> Punch In
                </button>
              )}
              {todayStatus?.attendance && !todayStatus.attendance.punch_out_time && (
                <button onClick={() => handlePunch("out")} disabled={punching} className="px-6 py-3 bg-red-600 text-white text-base font-medium rounded-lg hover:bg-red-700 flex items-center gap-2">
                  <LogOut className="w-5 h-5" /> Punch Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin: Summary Cards */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{presentCount + absentEmployees.length}</div>
                <div className="text-xs text-gray-500">Total Employees</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><UserX className="w-5 h-5 text-red-600" /></div>
              <div>
                <div className="text-2xl font-bold text-red-600">{absentEmployees.length}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
                <div className="text-xs text-gray-500">Late</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Absent employees */}
      {isAdmin && absentEmployees.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <h3 className="text-gray-900 font-medium text-sm mb-2">Absent Employees</h3>
          <div className="flex flex-wrap gap-2">
            {absentEmployees.map((emp) => (
              <span key={emp.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                <UserX className="w-3 h-3" /> {emp.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className={selectClass + " w-auto"} />
      </div>

      <DataTable columns={columns} data={records} total={total} page={page} perPage={isAdmin ? 50 : 15}
        onPageChange={setPage} loading={loading} />
    </div>
  );
}
