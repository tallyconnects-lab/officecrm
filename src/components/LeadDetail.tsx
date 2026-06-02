"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Modal from "@/components/Modal";
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Activity, Clock, User, FileText, MessageSquare, ArrowRightLeft, PlusCircle, CheckCircle, Calendar, Star } from "lucide-react";

interface Props {
  leadId: number | null;
  onClose: () => void;
}

interface TimelineItem {
  type: "activity" | "call";
  datetime: string;
  data: any;
}

const activityIcons: Record<string, any> = {
  "Created": { icon: PlusCircle, color: "text-emerald-600 bg-emerald-500/20" },
  "Assigned": { icon: User, color: "text-blue-600 bg-blue-500/20" },
  "Reassigned": { icon: ArrowRightLeft, color: "text-orange-600 bg-orange-500/20" },
  "Status Changed": { icon: Activity, color: "text-purple-600 bg-purple-500/20" },
  "Updated": { icon: FileText, color: "text-yellow-600 bg-yellow-500/20" },
  "Note Added": { icon: MessageSquare, color: "text-gray-600 bg-gray-500/20" },
  "Bulk Reassigned": { icon: ArrowRightLeft, color: "text-indigo-600 bg-indigo-500/20" },
  "Converted": { icon: Star, color: "text-amber-600 bg-amber-500/20" },
  "Follow-up Scheduled": { icon: Calendar, color: "text-blue-600 bg-blue-500/20" },
  "Demo Scheduled": { icon: Calendar, color: "text-purple-600 bg-purple-500/20" },
  "Demo Completed": { icon: CheckCircle, color: "text-emerald-600 bg-emerald-500/20" },
};

function callIcon(type: string) {
  const t = type?.toLowerCase();
  if (t === "incoming") return { icon: PhoneIncoming, color: "text-emerald-600 bg-emerald-500/20" };
  if (t === "outgoing") return { icon: PhoneOutgoing, color: "text-blue-600 bg-blue-500/20" };
  if (t === "missed") return { icon: PhoneMissed, color: "text-red-600 bg-red-500/20" };
  return { icon: Phone, color: "text-gray-600 bg-gray-500/20" };
}

function formatDuration(seconds: number) {
  if (!seconds || seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}m ${seconds % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function LeadDetail({ leadId, onClose }: Props) {
  const [lead, setLead] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"details" | "activity">("activity");

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    setTab("activity");
    api.get(`/leads/${leadId}`)
      .then((r) => {
        setLead(r.data.lead);
        setTimeline(r.data.timeline || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId]);

  const statusColor = (s: string) =>
    s === "Converted" || s === "Converted as New Software" ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" :
    s === "Not Interested" ? "bg-red-500/20 text-red-600 border-red-500/30" :
    s === "Lead" ? "bg-blue-500/20 text-blue-600 border-blue-500/30" :
    s === "Follow-Up" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
    s === "Demo Scheduled" ? "bg-purple-500/20 text-purple-600 border-purple-500/30" :
    s === "Demo Completed" ? "bg-cyan-500/20 text-cyan-600 border-cyan-500/30" :
    "bg-gray-500/20 text-gray-600 border-gray-500/30";

  return (
    <Modal open={!!leadId} onClose={onClose} title="" wide>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !lead ? (
        <div className="text-center py-8 text-gray-500">Lead not found</div>
      ) : (
        <div>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900">{lead.client_name}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                <span>#{lead.lead_number}</span>
                <span>{lead.client_phone}</span>
                {lead.client_email && <span>{lead.client_email}</span>}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div>Assigned: <span className="text-gray-700">{typeof lead.assigned_employee === "object" ? lead.assigned_employee?.name : lead.assigned_employee || "Unassigned"}</span></div>
              <div>Source: <span className="text-gray-700">{lead.lead_source?.name || "-"}</span></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
            <button
              onClick={() => setTab("activity")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                tab === "activity" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Activity & Calls ({timeline.length})
            </button>
            <button
              onClick={() => setTab("details")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                tab === "details" ? "bg-blue-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Details
            </button>
          </div>

          {/* Tab Content */}
          {tab === "details" && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {Object.entries({
                "Lead #": lead.lead_number,
                "Client Name": lead.client_name,
                "Phone": lead.client_phone,
                "Email": lead.client_email,
                "Status": lead.status,
                "Source": lead.lead_source?.name || "-",
                "Assigned To": typeof lead.assigned_employee === "object" ? lead.assigned_employee?.name : lead.assigned_employee || "-",
                "Source Employee": lead.source_employee || "-",
                "Created": new Date(lead.created_at).toLocaleString(),
                "Updated": new Date(lead.updated_at).toLocaleString(),
              }).map(([k, v]) => (
                <div key={k}>
                  <span className="text-gray-500">{k}</span>
                  <p className="text-gray-900 mt-0.5">{v || "-"}</p>
                </div>
              ))}
              {lead.client_issue && (
                <div className="col-span-2">
                  <span className="text-gray-500">Client Issue</span>
                  <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{lead.client_issue}</p>
                </div>
              )}
              {lead.remark && (
                <div className="col-span-2">
                  <span className="text-gray-500">Remark</span>
                  <p className="text-gray-900 mt-0.5 whitespace-pre-wrap">{lead.remark}</p>
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-0">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No activity yet</div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

                  {timeline.map((item, i) => {
                    if (item.type === "activity") {
                      const ai = activityIcons[item.data.activity_type] || { icon: Activity, color: "text-gray-600 bg-gray-500/20" };
                      const Icon = ai.icon;
                      return (
                        <div key={`a-${i}`} className="relative flex gap-4 py-3 pl-0">
                          <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${ai.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900">{item.data.activity_type}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(item.datetime)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{item.data.activity_details}</p>
                            <p className="text-xs text-gray-500 mt-0.5">by {item.data.performed_by}</p>
                          </div>
                        </div>
                      );
                    } else {
                      const ci = callIcon(item.data.type);
                      const Icon = ci.icon;
                      return (
                        <div key={`c-${i}`} className="relative flex gap-4 py-3 pl-0">
                          <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${ci.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {item.data.type} Call
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {timeAgo(item.datetime)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              <span className="text-sm text-gray-600">{item.data.phone}</span>
                              <span className="text-xs text-gray-500">Duration: {formatDuration(item.data.duration)}</span>
                              {item.data.name && item.data.name !== "Unknown" && (
                                <span className="text-xs text-gray-500">{item.data.name}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(item.datetime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
