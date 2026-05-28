"use client";

import { createContext, useContext, useCallback, useMemo } from "react";

/**
 * Admin authentication is session-cookie based (NextAuth).
 * The cookie travels with same-origin `fetch()` automatically, so
 * `fetchWithAuth` no longer needs to attach a bearer token.
 *
 * The context shape is kept stable so existing admin pages that consume
 * `fetchWithAuth` continue to work without changes; on a 401 we surface
 * a message before redirecting to the login page (so a session that
 * expired mid-form doesn't look like a silent click-into-nothing).
 */
interface AdminContextType {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | null>(null);

// Module-level flag so we only show the expiry message + redirect once
// per session even if multiple in-flight requests all 401 at the same
// time (otherwise the user sees the alert stacked N times).
let sessionExpiryHandled = false;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
      });
      if (response.status === 401) {
        if (!sessionExpiryHandled) {
          sessionExpiryHandled = true;
          // Browser-native alert is intentional here: there's no in-app
          // toast system yet, and a silent redirect during form-fill is
          // worse than a one-off alert. Replace with a toast when a
          // toast primitive lands.
          if (typeof window !== "undefined") {
            window.alert("Your session expired — please sign in again.");
            window.location.href = "/admin/login";
          }
        }
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
