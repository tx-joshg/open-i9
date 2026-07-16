"use client";

import { createContext, useContext, useCallback, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * Admin authentication is session-cookie based (NextAuth).
 * The cookie travels with same-origin `fetch()` automatically, so
 * `fetchWithAuth` no longer needs to attach a bearer token.
 *
 * The context shape is kept stable so existing admin pages that consume
 * `fetchWithAuth` continue to work without changes; on a 401 we surface
 * an in-app dialog before redirecting to the login page (so a session that
 * expired mid-form doesn't look like a silent click-into-nothing).
 */
interface AdminContextType {
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | null>(null);

// Module-level flag so we only surface the expiry dialog once per session
// even if multiple in-flight requests all 401 at the same time. Reset by
// the full page load the login redirect causes.
let sessionExpiryHandled = false;

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
      });
      if (response.status === 401 && !sessionExpiryHandled) {
        sessionExpiryHandled = true;
        setSessionExpired(true);
      }
      return response;
    },
    [],
  );

  // The session is dead either way, so dismissing the dialog (Escape or
  // backdrop click) leads to the login page just like the button does.
  const goToLogin = useCallback(() => {
    window.location.href = "/admin/login";
  }, []);

  const value = useMemo<AdminContextType>(
    () => ({ fetchWithAuth }),
    [fetchWithAuth],
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={sessionExpired}
        title="Session expired"
        message={<p>Your session expired — please sign in again.</p>}
        confirmLabel="Sign in"
        confirmTone="indigo"
        showCancel={false}
        onConfirm={goToLogin}
        onCancel={goToLogin}
      />
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
