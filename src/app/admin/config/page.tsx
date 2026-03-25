"use client";
import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import ConfigForm from "@/components/admin/ConfigForm";
import type { PortalConfig } from "@/types/i9";

export default function AdminConfigPage() {
  const { fetchWithAuth } = useAdmin();
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/config");
      if (res.ok) {
        const data = (await res.json()) as PortalConfig;
        setConfig(data);
      } else {
        setError("Failed to load configuration.");
      }
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error || "Configuration not found."}</p>
        <button
          onClick={loadConfig}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Portal Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Customize branding, content, and notification settings.
        </p>
      </div>

      <ConfigForm
        initialConfig={config}
        onSaved={(updated) => setConfig(updated)}
      />
    </div>
  );
}
