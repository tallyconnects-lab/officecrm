"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import NotificationBell from "@/components/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loadFromStorage } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Top bar with notification bell */}
      <div className="md:ml-64 fixed top-0 right-0 left-0 md:left-64 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-2 flex items-center justify-end">
        <NotificationBell />
      </div>
      <main className="md:ml-64 p-4 md:p-6 pt-16 md:pt-14">{children}</main>
    </div>
  );
}
