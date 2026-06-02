import { create } from "zustand";
import api from "./api";

export type Role = "super-admin" | "staff" | "employee";

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string;
  employee_code?: string;
  department?: string;
  teams?: string[];
}

interface AuthState {
  user: User | null;
  role: Role | null;
  token: string | null;
  isLoading: boolean;
  isAdminEmployee: boolean; // employee with Admin team
  login: (role: Role, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
}

function checkAdminEmployee(role: Role | null, user: User | null): boolean {
  return role === "employee" && !!user?.teams?.includes("Admin");
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: null,
  token: null,
  isLoading: true,
  isAdminEmployee: false,

  loadFromStorage: () => {
    if (typeof window === "undefined") return set({ isLoading: false });
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const role = localStorage.getItem("role") as Role | null;
    if (token && user && role) {
      const parsedUser = JSON.parse(user);
      set({ token, user: parsedUser, role, isLoading: false, isAdminEmployee: checkAdminEmployee(role, parsedUser) });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (role, username, password) => {
    const endpoint =
      role === "super-admin"
        ? "/auth/super-admin/login"
        : role === "staff"
        ? "/auth/staff/login"
        : "/auth/employee/login";

    const { data } = await api.post(endpoint, { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("role", data.role);
    set({
      token: data.token,
      user: data.user,
      role: data.role,
      isAdminEmployee: checkAdminEmployee(data.role, data.user),
    });
  },

  logout: async () => {
    try {
      await api.post("/logout");
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    set({ token: null, user: null, role: null, isAdminEmployee: false });
  },
}));
