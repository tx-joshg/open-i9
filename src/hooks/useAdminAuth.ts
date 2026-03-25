"use client";
import { useCallback, useMemo } from "react";

interface AdminAuth {
  adminSecret: string;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

export function useAdminAuth(secret: string): AdminAuth {
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${secret}`);

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        sessionStorage.removeItem("adminSecret");
        window.location.href = "/admin";
        return response;
      }

      return response;
    },
    [secret]
  );

  return useMemo(
    () => ({ adminSecret: secret, fetchWithAuth }),
    [secret, fetchWithAuth]
  );
}
