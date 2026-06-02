"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeatmapRow {
  employee_id: number;
  employee_name: string;
  total: number;
  avg_time: string;
  days: Record<number, number>;
}

interface HeatmapData {
  heatmap: HeatmapRow[];
  daily_totals: Record<number, number>;
  days_in_month: number;
  month: number;
  year: number;
  stats: {
    total_tickets: number;
    active_agents: number;
    avg_per_agent: number;
    active_days: number;
  };
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getCellColor(count: number): string {
  if (count === 0) return "bg-gray-50 text-gray-300";
  if (count <= 2) return "bg-blue-100 text-blue-700";
  if (count <= 5) return "bg-blue-200 text-blue-800";
  if (count <= 10) return "bg-blue-400 text-white";
  return "bg-blue-600 text-white";
}

function getDayOfWeek(year: number, month: number, day: number): string {
  const d = new Date(year, month - 1, day);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

function isSunday(year: number, month: number, day: number): boolean {
  return new Date(year, month - 1, day).getDay() === 0;
}

export default function TicketMonthlyHeatmap() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get("/tickets/monthly-heatmap", { params: { month, year } })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
        <h2 className="text-gray-900 font-semibold">Monthly Ticket Heatmap</h2>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center">
            {monthNames[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{data.stats.total_tickets}</div>
            <div className="text-xs text-blue-600 mt-0.5">Total Tickets</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-700">{data.stats.active_agents}</div>
            <div className="text-xs text-emerald-600 mt-0.5">Active Agents</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{data.stats.avg_per_agent}</div>
            <div className="text-xs text-purple-600 mt-0.5">Avg / Agent</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{data.stats.active_days}</div>
            <div className="text-xs text-orange-600 mt-0.5">Active Days</div>
          </div>
        </div>
      )}

      {/* Heatmap Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !data || data.heatmap.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No tickets for this month</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-3 py-2 text-gray-600 font-medium sticky left-0 bg-white z-10 min-w-[120px]">Agent</th>
                {Array.from({ length: data.days_in_month }, (_, i) => i + 1).map((d) => (
                  <th key={d} className={`text-center px-0.5 py-2 font-medium min-w-[28px] ${isSunday(data.year, data.month, d) ? "text-red-500" : "text-gray-500"}`}>
                    <div>{d}</div>
                    <div className="text-[9px] font-normal">{getDayOfWeek(data.year, data.month, d)}</div>
                  </th>
                ))}
                <th className="text-center px-2 py-2 text-gray-700 font-bold min-w-[40px]">Total</th>
                <th className="text-center px-2 py-2 text-gray-700 font-bold min-w-[50px]">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              {data.heatmap.map((row) => (
                <tr key={row.employee_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-1.5 text-gray-900 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">
                    {row.employee_name}
                  </td>
                  {Array.from({ length: data.days_in_month }, (_, i) => i + 1).map((d) => {
                    const count = row.days[d] || 0;
                    return (
                      <td key={d} className="text-center px-0.5 py-1.5">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-semibold ${getCellColor(count)}`}>
                          {count > 0 ? count : ""}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center px-2 py-1.5">
                    <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-1 rounded text-xs font-bold bg-gray-200 text-gray-900">
                      {row.total}
                    </span>
                  </td>
                  <td className="text-center px-2 py-1.5 text-gray-600 font-medium">
                    {row.avg_time}
                  </td>
                </tr>
              ))}
              {/* Daily totals row */}
              <tr className="bg-gray-50 border-t border-gray-300">
                <td className="px-3 py-1.5 text-gray-900 font-bold sticky left-0 bg-gray-50 z-10">TOTAL</td>
                {Array.from({ length: data.days_in_month }, (_, i) => i + 1).map((d) => {
                  const count = data.daily_totals[d] || 0;
                  return (
                    <td key={d} className="text-center px-0.5 py-1.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${count > 0 ? "bg-blue-600/20 text-blue-700" : "text-gray-300"}`}>
                        {count > 0 ? count : ""}
                      </span>
                    </td>
                  );
                })}
                <td className="text-center px-2 py-1.5">
                  <span className="inline-flex items-center justify-center min-w-[28px] px-1.5 py-1 rounded text-xs font-bold bg-blue-600/20 text-blue-700">
                    {data.stats.total_tickets}
                  </span>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-200">
        <span className="text-[10px] text-gray-500">Less</span>
        <span className="w-5 h-5 rounded bg-gray-50 border border-gray-200" />
        <span className="w-5 h-5 rounded bg-blue-100" />
        <span className="w-5 h-5 rounded bg-blue-200" />
        <span className="w-5 h-5 rounded bg-blue-400" />
        <span className="w-5 h-5 rounded bg-blue-600" />
        <span className="text-[10px] text-gray-500">More</span>
      </div>
    </div>
  );
}
