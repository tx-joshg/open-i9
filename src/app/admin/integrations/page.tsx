"use client";
import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";

type RecordType = "employee" | "vendor";

interface IntegrationState {
  platform: string;
  connected: boolean;
  hasCredentials: boolean;
  environment: string | null;
  connectedAt: string | null;
  defaultRecordType: RecordType;
}

interface PlatformInfo {
  key: string;
  name: string;
  icon: string;
  setupUrl: string;
  setupSteps: string[];
  redirectPathSegment: string;
  fields: CredentialField[];
}

interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
}

const PLATFORMS: PlatformInfo[] = [
  {
    key: "quickbooks",
    name: "QuickBooks Online",
    icon: "\uD83D\uDCDA",
    setupUrl: "https://developer.intuit.com",
    setupSteps: [
      "Go to developer.intuit.com and sign in (or create a free developer account).",
      'Click "Create an app" and select "QuickBooks Online and Payments".',
      'Under "Keys & OAuth", copy the Client ID and Client Secret.',
      "Add the Redirect URI shown below to your app's OAuth settings.",
      "Choose Sandbox for testing or Production for live data.",
    ],
    redirectPathSegment: "quickbooks",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "ABc123..." },
      { key: "clientSecret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxx" },
      {
        key: "environment",
        label: "Environment",
        placeholder: "",
        type: "select",
        options: [
          { value: "sandbox", label: "Sandbox (testing)" },
          { value: "production", label: "Production (live)" },
        ],
      },
    ],
  },
  {
    key: "xero",
    name: "Xero",
    icon: "\uD83D\uDCCA",
    setupUrl: "https://developer.xero.com/app/manage",
    setupSteps: [
      "Go to developer.xero.com and sign in with your Xero account.",
      'Click "New app" and choose "Web app" as the app type.',
      "Copy the Client ID and generate a Client Secret.",
      "Add the Redirect URI shown below to your app's OAuth 2.0 settings.",
    ],
    redirectPathSegment: "xero",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
      { key: "clientSecret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
  },
  {
    key: "zoho",
    name: "Zoho Books",
    icon: "\uD83D\uDCCB",
    setupUrl: "https://api-console.zoho.com",
    setupSteps: [
      "Go to api-console.zoho.com and sign in with your Zoho account.",
      'Click "Add Client" and select "Server-based Applications".',
      "Copy the Client ID and Client Secret.",
      "Add the Redirect URI shown below to the Authorized Redirect URIs.",
      "Select your Zoho data center region below (must match your Zoho account region).",
    ],
    redirectPathSegment: "zoho",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "1000.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
      { key: "clientSecret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      {
        key: "environment",
        label: "Region",
        placeholder: "",
        type: "select",
        options: [
          { value: "US", label: "United States (.com)" },
          { value: "EU", label: "Europe (.eu)" },
          { value: "IN", label: "India (.in)" },
          { value: "AU", label: "Australia (.com.au)" },
          { value: "JP", label: "Japan (.jp)" },
        ],
      },
    ],
  },
  {
    key: "freshbooks",
    name: "FreshBooks",
    icon: "\uD83E\uDDFE",
    setupUrl: "https://my.freshbooks.com/#/developer",
    setupSteps: [
      "Go to my.freshbooks.com, sign in, then navigate to Settings > Developer Portal.",
      'Click "Create New App".',
      "Copy the Client ID and Client Secret.",
      "Add the Redirect URI shown below to the app's redirect URIs.",
    ],
    redirectPathSegment: "freshbooks",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "clientSecret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
  },
];

export default function AdminIntegrationsPage() {
  const { fetchWithAuth } = useAdmin();
  const [integrations, setIntegrations] = useState<IntegrationState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Track which platform's setup panel is open
  const [setupOpen, setSetupOpen] = useState<string | null>(null);

  // Credential form state per platform
  const [credentialForms, setCredentialForms] = useState<
    Record<string, Record<string, string>>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [savingRecordType, setSavingRecordType] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/integrations");
      if (res.ok) {
        const data = (await res.json()) as {
          integrations: Array<{
            platform: string;
            isConnected: boolean;
            hasCredentials: boolean;
            environment: string | null;
            connectedAt: string | null;
            defaultRecordType: RecordType;
          }>;
        };
        setIntegrations(
          data.integrations.map((i) => ({
            platform: i.platform,
            connected: i.isConnected,
            hasCredentials: i.hasCredentials,
            environment: i.environment,
            connectedAt: i.connectedAt,
            defaultRecordType: i.defaultRecordType,
          }))
        );
      } else {
        setError("Failed to load integrations.");
      }
    } catch {
      setError("Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  function getIntegrationState(
    platformKey: string
  ): IntegrationState | undefined {
    return integrations.find((i) => i.platform === platformKey);
  }

  function getFormValues(platformKey: string): Record<string, string> {
    return credentialForms[platformKey] ?? {};
  }

  function updateFormField(
    platformKey: string,
    field: string,
    value: string
  ) {
    setCredentialForms((prev) => ({
      ...prev,
      [platformKey]: { ...prev[platformKey], [field]: value },
    }));
    setSaveError(null);
    setSaveSuccess(null);
  }

  async function handleSaveCredentials(platform: PlatformInfo) {
    const form = getFormValues(platform.key);
    const clientId = form.clientId?.trim() ?? "";
    const clientSecret = form.clientSecret?.trim() ?? "";

    if (!clientId || !clientSecret) {
      setSaveError("Client ID and Client Secret are required.");
      return;
    }

    setSaving(platform.key);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const payload: Record<string, string> = {
        platform: platform.key,
        clientId,
        clientSecret,
      };
      if (form.environment) {
        payload.environment = form.environment;
      }

      const res = await fetchWithAuth("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Failed to save" }));
        throw new Error(body.error || "Failed to save credentials");
      }

      setSaveSuccess(platform.key);
      // Clear the form (credentials are saved)
      setCredentialForms((prev) => ({ ...prev, [platform.key]: {} }));
      // Refresh integrations list
      await loadIntegrations();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save credentials"
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleConnect(platformKey: string) {
    setError("");
    try {
      const res = await fetchWithAuth(
        `/api/integrations/${platformKey}/connect`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Failed to connect" }));
        setError(body.error || "Failed to start connection");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError("Failed to start connection");
    }
  }

  async function handleDisconnect(platformKey: string) {
    setDisconnecting(platformKey);
    try {
      const res = await fetchWithAuth(
        `/api/integrations/${platformKey}/disconnect`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await loadIntegrations();
      } else {
        setError(`Failed to disconnect ${platformKey}.`);
      }
    } catch {
      setError(`Failed to disconnect ${platformKey}.`);
    } finally {
      setDisconnecting(null);
    }
  }

  async function handleRecordTypeChange(
    platformKey: string,
    recordType: RecordType
  ) {
    setSavingRecordType(platformKey);
    try {
      const res = await fetchWithAuth(`/api/integrations/${platformKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultRecordType: recordType }),
      });
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) =>
            i.platform === platformKey
              ? { ...i, defaultRecordType: recordType }
              : i
          )
        );
      } else {
        setError(`Failed to update record type for ${platformKey}.`);
      }
    } catch {
      setError(`Failed to update record type for ${platformKey}.`);
    } finally {
      setSavingRecordType(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect your accounting platform to sync employee and vendor records.
          Set up credentials first, then connect.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError("")}
            className="mt-1 text-xs text-red-500 underline hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        {PLATFORMS.map((platform) => {
          const state = getIntegrationState(platform.key);
          const isConnected = state?.connected ?? false;
          const hasCredentials = state?.hasCredentials ?? false;
          const isSetupOpen = setupOpen === platform.key;
          const isDisconnecting = disconnecting === platform.key;
          const isSavingRecordType = savingRecordType === platform.key;
          const currentRecordType =
            state?.defaultRecordType ?? "employee";
          const form = getFormValues(platform.key);
          const redirectUri = `${appUrl}/api/integrations/${platform.redirectPathSegment}/callback`;

          return (
            <div
              key={platform.key}
              className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
            >
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-3xl"
                      role="img"
                      aria-label={platform.name}
                    >
                      {platform.icon}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {platform.name}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isConnected
                          ? "Connected and ready to sync"
                          : hasCredentials
                          ? "Credentials saved — ready to connect"
                          : "Setup required before connecting"}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                      isConnected
                        ? "bg-green-100 text-green-800"
                        : hasCredentials
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected
                          ? "bg-green-500"
                          : hasCredentials
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      }`}
                    />
                    {isConnected
                      ? "Connected"
                      : hasCredentials
                      ? "Ready"
                      : "Not Configured"}
                  </span>
                </div>

                {/* Connected info */}
                {isConnected && state?.connectedAt && (
                  <p className="text-xs text-gray-500 mt-2 ml-12">
                    Connected{" "}
                    {new Date(state.connectedAt).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" }
                    )}
                  </p>
                )}

                {/* Actions row */}
                <div className="mt-4 ml-12 flex flex-wrap items-center gap-3">
                  {isConnected ? (
                    <>
                      {/* Record type selector */}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`rt-${platform.key}`}
                          className="text-sm text-gray-600"
                        >
                          Sync as:
                        </label>
                        <select
                          id={`rt-${platform.key}`}
                          value={currentRecordType}
                          onChange={(e) =>
                            handleRecordTypeChange(
                              platform.key,
                              e.target.value as RecordType
                            )
                          }
                          disabled={isSavingRecordType}
                          className="px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                        >
                          <option value="employee">Employee</option>
                          <option value="vendor">Vendor</option>
                        </select>
                        {isSavingRecordType && (
                          <span className="text-xs text-gray-400">
                            Saving...
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDisconnect(platform.key)}
                        disabled={isDisconnecting}
                        className="px-3 py-1.5 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        {isDisconnecting
                          ? "Disconnecting..."
                          : "Disconnect"}
                      </button>

                      <button
                        onClick={() =>
                          setSetupOpen(isSetupOpen ? null : platform.key)
                        }
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        {isSetupOpen
                          ? "Hide Settings"
                          : "Update Credentials"}
                      </button>
                    </>
                  ) : hasCredentials ? (
                    <>
                      <button
                        onClick={() => handleConnect(platform.key)}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                      >
                        Connect to {platform.name}
                      </button>
                      <button
                        onClick={() =>
                          setSetupOpen(isSetupOpen ? null : platform.key)
                        }
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                      >
                        {isSetupOpen
                          ? "Hide Settings"
                          : "Update Credentials"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        setSetupOpen(isSetupOpen ? null : platform.key)
                      }
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Set Up {platform.name}
                    </button>
                  )}
                </div>
              </div>

              {/* Setup / Credentials Panel */}
              {isSetupOpen && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {/* Step-by-step instructions */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">
                      Setup Instructions
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      {platform.setupSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <div className="mt-3 flex items-center gap-4">
                      <a
                        href={platform.setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Open {platform.name} Developer Portal &rarr;
                      </a>
                    </div>
                  </div>

                  {/* Redirect URI */}
                  <div className="mb-6 p-3 rounded-md border border-blue-200 bg-blue-50">
                    <p className="text-xs font-medium text-blue-800 mb-1">
                      Redirect URI (copy this into your app settings):
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-blue-200 text-blue-900 break-all">
                        {redirectUri}
                      </code>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(redirectUri)
                        }
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Credential fields */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Credentials
                    </h3>
                    {platform.fields.map((field) => (
                      <div key={field.key}>
                        <label
                          htmlFor={`${platform.key}-${field.key}`}
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          {field.label}
                        </label>
                        {field.type === "select" && field.options ? (
                          <select
                            id={`${platform.key}-${field.key}`}
                            value={
                              form[field.key] ??
                              state?.environment ??
                              field.options[0].value
                            }
                            onChange={(e) =>
                              updateFormField(
                                platform.key,
                                field.key,
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`${platform.key}-${field.key}`}
                            type="text"
                            value={form[field.key] ?? ""}
                            onChange={(e) =>
                              updateFormField(
                                platform.key,
                                field.key,
                                e.target.value
                              )
                            }
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
                          />
                        )}
                      </div>
                    ))}

                    {hasCredentials && (
                      <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                        Credentials are already saved. Enter new values to
                        update them, or leave blank to keep the current ones.
                      </p>
                    )}

                    {saveError && saving === null && (
                      <p className="text-sm text-red-600">{saveError}</p>
                    )}

                    {saveSuccess === platform.key && (
                      <p className="text-sm text-green-700">
                        Credentials saved successfully!
                      </p>
                    )}

                    <button
                      onClick={() => handleSaveCredentials(platform)}
                      disabled={saving === platform.key}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {saving === platform.key
                        ? "Saving..."
                        : hasCredentials
                        ? "Update Credentials"
                        : "Save Credentials"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
