"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, UserCog, Target, Ticket, Clock, Phone,
  Settings, LogOut, ChevronLeft, Menu, FileText, Bell
} from "lucide-react";
import { useState } from "react";

const navItems = {
  "super-admin": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Target },
    { href: "/tickets", label: "Support Tickets", icon: Ticket },
    { href: "/attendance", label: "Attendance", icon: Clock },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/staff", label: "Staff", icon: UserCog },
    { href: "/call-logs", label: "Call Logs", icon: Phone },
  ],
  staff: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Target },
    { href: "/tickets", label: "Support Tickets", icon: Ticket },
  ],
  employee: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leads", label: "My Leads", icon: Target },
    { href: "/tickets", label: "Support Tickets", icon: Ticket },
    { href: "/attendance", label: "Attendance", icon: Clock },
    { href: "/reminders", label: "Reminders", icon: Bell },
  ],
};

export default function Sidebar() {
  const { user, role, isAdminEmployee, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin employees see super-admin menu
  const effectiveRole = isAdminEmployee ? "super-admin" : role;
  const items = effectiveRole ? navItems[effectiveRole] || [] : [];

  const roleColors: Record<string, string> = {
    "super-admin": "bg-purple-600",
    staff: "bg-emerald-600",
    employee: "bg-blue-600",
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="font-bold text-gray-900 text-lg">TallyConnector</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${roleColors[effectiveRole || "employee"]}`}>
                {isAdminEmployee ? "ADMIN" : role?.replace("-", " ").toUpperCase()}
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-blue-600/10 text-blue-600 border border-blue-500/30"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => { logout(); window.location.href = "/login"; }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg text-gray-600 shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-30 bg-white border-r border-gray-200 transition-all ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
