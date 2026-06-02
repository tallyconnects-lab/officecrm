"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, X, Target, Ticket, Phone, Calendar, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getPusher, disconnectPusher } from "@/lib/pusher";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
}

const typeIcon: Record<string, typeof Bell> = {
  lead_assigned: Target,
  ticket_assigned: Ticket,
  followup_reminder: Phone,
  demo_reminder: Calendar,
};

const typeColor: Record<string, string> = {
  lead_assigned: "bg-blue-100 text-blue-600",
  ticket_assigned: "bg-orange-100 text-orange-600",
  followup_reminder: "bg-yellow-100 text-yellow-600",
  demo_reminder: "bg-purple-100 text-purple-600",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Notification sound
function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1000;
      gain2.gain.value = 0.15;
      osc2.start();
      osc2.stop(ctx.currentTime + 0.15);
    }, 180);
  } catch {}
}

export default function NotificationBell() {
  const { user, role } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
  }, []);

  // Subscribe to Pusher
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const pusher = getPusher();
    const channel = pusher.subscribe(`employee-${user.id}`);

    channel.bind("new-notification", (data: any) => {
      setNotifications((prev) => [{ ...data, read_at: null }, ...prev]);
      setUnreadCount((prev) => prev + 1);
      playSound();

      // Show toast
      toast(data.message, {
        icon: data.type === "lead_assigned" ? "🎯" : data.type === "ticket_assigned" ? "🎫" : data.type === "followup_reminder" ? "📞" : "📅",
        duration: 6000,
        style: { background: "#1f2937", color: "#fff", maxWidth: "400px" },
      });
    });

    // Poll every 2 minutes as fallback
    const interval = setInterval(fetchNotifications, 120000);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`employee-${user.id}`);
      clearInterval(interval);
    };
  }, [user?.id, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = (n: Notification) => {
    // Mark as read
    if (!n.read_at) {
      api.post("/notifications/read", { ids: [n.id] }).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate
    if (n.data?.lead_id) {
      router.push("/leads");
    } else if (n.data?.ticket_id) {
      router.push("/tickets");
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[28rem] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = typeIcon[n.type] || Bell;
                const color = typeColor[n.type] || "bg-gray-100 text-gray-600";
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !n.read_at ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.read_at ? "font-semibold text-gray-900" : "text-gray-700"} truncate`}>
                          {n.title}
                        </p>
                        {!n.read_at && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
