"use client";

import { createContext, useContext, useCallback, useMemo } from "react";

/**
 * Admin authentication is session-cookie based (NextAuth).
 * The cookie travels with same-origin `fetch()` automatically, so
 * `fetchWithAuth` no longer needs to attach a bearer token.
 *
 * The context shape is kept stable so existing admin pages that consume
 * `fetchWithAuth` continue to work without changes; on a 401 we redirect
 * to the login page.
 */
interface AdminContextType {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
      });
      if (response.status === 401) {
        window.location.href = "/admin/login";
      }
      return response;
    },
    [],
  );

  const value = useMemo<AdminContextType>(
    () => ({ fetchWithAuth }),
    [fetchWithAuth],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
