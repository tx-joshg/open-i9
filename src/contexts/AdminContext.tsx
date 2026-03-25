"use client";
import { createContext, useContext } from "react";

interface AdminContextType {
  adminSecret: string;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
