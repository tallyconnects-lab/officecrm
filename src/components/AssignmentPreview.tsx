"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { UserCheck, UserX, ArrowRight } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  present: boolean;
}

interface PreviewData {
  employees: Employee[];
  next_assignee: { id: number; name: string } | null;
  present_count: number;
  total_count: number;
}

interface Props {
  type: "lead" | "ticket";
  manualAssignee?: string; // if manually selected, don't show auto-assign
}

export default function AssignmentPreview({ type, manualAssignee }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);

  useEffect(() => {
    api.get("/assignment-preview", { params: { type } })
      .then((r) => setData(r.data))
      .catch(() => {});
  }, [type]);

  if (!data) return null;
  if (manualAssignee) return null;

  return (
    <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-blue-800">
          Auto-Assignment (Round Robin)
        </span>
        <span className="text-xs text-blue-600">
          {data.present_count}/{data.total_count} present
        </span>
      </div>

      {data.next_assignee ? (
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Next: <strong>{data.next_assignee.name}</strong>
          </span>
        </div>
      ) : (
        <div className="text-sm text-red-600 font-medium mb-2">
          No employees present — cannot auto-assign
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {data.employees.map((emp) => (
          <span
            key={emp.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              emp.present
                ? emp.id === data.next_assignee?.id
                  ? "bg-blue-600 text-white"
                  : "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-400 line-through"
            }`}
          >
            {emp.present ? <UserCheck className="w-2.5 h-2.5" /> : <UserX className="w-2.5 h-2.5" />}
            {emp.name}
          </span>
        ))}
      </div>
    </div>
  );
}
