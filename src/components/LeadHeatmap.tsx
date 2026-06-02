"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const periods = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

interface HeatmapRow {
  employee_id: number | null;
  employee_name: string;
  total: number;
  [key: string]: any;
}

interface HeatmapData {
  period: string;
  from: string;
  to: string;
  statuses: string[];
  heatmap: HeatmapRow[];
  totals: HeatmapRow;
}

interface Props {
  onCellClick: (employeeId: number | null, status: string | null, period: string) => void;
}

const statusColors: Record<string, string> = {
  "Lead": "bg-blue-500/20 text-blue-700",
  "Follow-Up": "bg-yellow-500/20 text-yellow-700",
  "Demo Scheduled": "bg-purple-500/20 text-purple-700",
  "Demo Completed": "bg-cyan-500/20 text-cyan-700",
  "Converted": "bg-emerald-500/20 text-emerald-700",
  "Converted as New Software": "bg-green-500/20 text-green-700",
  "Not Interested": "bg-red-500/20 text-red-700",
};

function getStatusColor(status: string) {
  return statusColors[status] || "bg-gray-500/20 text-gray-700";
}

export default function LeadHeatmap({ onCellClick }: Props) {
  const [period, setPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params: any = { period };
    if (period === "custom") {
      params.date_from = customFrom;
      params.date_to = customTo;
    }
    api.get("/leads/heatmap", { params })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    fetchData();
  }, [fetchData, period, customFrom, customTo]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
        <h2 className="text-gray-900 font-semibold">Employee Lead Summary</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p.value ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => { setPeriod("custom"); if (!customFrom) { const t = new Date().toISOString().split("T")[0]; setCustomFrom(t); setCustomTo(t); } }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === "custom" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Custom
            </button>
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !data || data.heatmap.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">No leads for this period</div>
      ) : (
        <div className="overflow-x-auto">
          {(() => {
            const filteredStatuses = ["Lead", "Follow-Up", "Demo Scheduled", "Demo Completed", "Converted", "Converted as New Software"];
            return (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-600 font-medium sticky left-0 bg-white z-10">Employee</th>
                {filteredStatuses.map((s) => (
                  <th key={s} className="text-center px-3 py-3 text-gray-600 font-medium whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${getStatusColor(s)}`}>{s}</span>
                  </th>
                ))}
                <th className="text-center px-4 py-3 text-gray-600 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.heatmap.map((row) => (
                <tr key={row.employee_id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">
                    {row.employee_name}
                  </td>
                  {filteredStatuses.map((s) => {
                    const count = row[`status_${s}`] || 0;
                    return (
                      <td key={s} className="text-center px-3 py-2.5">
                        {count > 0 ? (
                          <button
                            onClick={() => onCellClick(row.employee_id, s, period)}
                            className={`inline-block min-w-[32px] px-2 py-1 rounded text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${getStatusColor(s)}`}
                          >
                            {count}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">0</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-2.5">
                    <button
                      onClick={() => onCellClick(row.employee_id, null, period)}
                      className="inline-block min-w-[32px] px-2 py-1 rounded text-xs font-bold bg-gray-200 text-gray-900 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                    >
                      {row.total}
                    </button>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-100 border-t border-gray-300">
                <td className="px-4 py-2.5 text-gray-900 font-bold sticky left-0 bg-gray-100 z-10">TOTAL</td>
                {filteredStatuses.map((s) => {
                  const count = data.totals[`status_${s}`] || 0;
                  return (
                    <td key={s} className="text-center px-3 py-2.5">
                      {count > 0 ? (
                        <button
                          onClick={() => onCellClick(null, s, period)}
                          className={`inline-block min-w-[32px] px-2 py-1 rounded text-xs font-bold cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${getStatusColor(s)}`}
                        >
                          {count}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">0</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center px-4 py-2.5">
                  <button
                    onClick={() => onCellClick(null, null, period)}
                    className="inline-block min-w-[32px] px-2 py-1 rounded text-xs font-bold bg-blue-600/20 text-blue-700 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                  >
                    {data.totals.total}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
            );
          })()}
        </div>
      )}
    </div>
  );
}
