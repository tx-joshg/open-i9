"use client";
import { useState, FormEvent } from "react";
import type { PortalConfig, NotificationEmail } from "@/types/i9";
import { useAdmin } from "@/contexts/AdminContext";

interface ConfigFormProps {
  initialConfig: PortalConfig;
  onSaved: (config: PortalConfig) => void;
}

export default function ConfigForm({ initialConfig, onSaved }: ConfigFormProps) {
  const { fetchWithAuth } = useAdmin();
  const [config, setConfig] = useState<PortalConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Notification email draft
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Logo upload
  const [uploading, setUploading] = useState(false);

  function updateField<K extends keyof PortalConfig>(key: K, value: PortalConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function addNotificationEmail() {
    if (!newEmail.trim()) return;
    const entry: NotificationEmail = {
      email: newEmail.trim(),
      label: newLabel.trim() || newEmail.trim(),
    };
    updateField("notificationEmails", [...config.notificationEmails, entry]);
    setNewEmail("");
    setNewLabel("");
  }

  function removeNotificationEmail(index: number) {
    updateField(
      "notificationEmails",
      config.notificationEmails.filter((_, i) => i !== index)
    );
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetchWithAuth("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { fileKey: string };
      updateField("logoFileKey", data.fileKey);
    } catch {
      setError("Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validate required compliance fields
    const missing: string[] = [];
    if (config.useEVerify === null) missing.push("E-Verify selection");
    if (!config.employerName.trim()) missing.push("Employer Name");
    if (!config.employerTitle.trim()) missing.push("Employer Title");
    if (!config.employerBusinessName.trim()) missing.push("Business Name");
    if (!config.employerBusinessAddress.trim()) missing.push("Business Address");

    if (missing.length > 0) {
      setError(`Required for I-9 compliance: ${missing.join(", ")}`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetchWithAuth("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = (await res.json()) as PortalConfig;
      setConfig(updated);
      onSaved(updated);
      setSaved(true);
    } catch {
      setError("Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Branding */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Branding</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={config.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            <div className="flex items-center gap-3">
              {config.logoFileKey && (
                <img
                  src={`/api/uploads/${config.logoFileKey}`}
                  alt="Logo"
                  className="h-10 w-10 object-contain rounded border border-gray-200"
                />
              )}
              <label className="cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                {uploading ? "Uploading..." : "Choose File"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={config.primaryColor}
                onChange={(e) => updateField("primaryColor", e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.accentColor}
                onChange={(e) => updateField("accentColor", e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={config.accentColor}
                onChange={(e) => updateField("accentColor", e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Welcome Message
            </label>
            <textarea
              rows={3}
              value={config.welcomeMessage}
              onChange={(e) => updateField("welcomeMessage", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Footer Text
            </label>
            <input
              type="text"
              value={config.footerText}
              onChange={(e) => updateField("footerText", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendConfirmation"
              checked={config.sendEmployeeConfirmation}
              onChange={(e) =>
                updateField("sendEmployeeConfirmation", e.target.checked)
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="sendConfirmation" className="text-sm text-gray-700">
              Send confirmation email to employees after submission
            </label>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Does your organization use E-Verify?<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${config.useEVerify === true ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="useEVerify"
                  checked={config.useEVerify === true}
                  onChange={() => updateField("useEVerify", true)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">Yes, we use E-Verify</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${config.useEVerify === false ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="useEVerify"
                  checked={config.useEVerify === false}
                  onChange={() => updateField("useEVerify", false)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">No, we do not use E-Verify</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {config.useEVerify === true
                ? "Employees will be required to provide their Social Security Number on the I-9 form."
                : config.useEVerify === false
                ? "The SSN field will be shown as voluntary on the I-9 form, per USCIS guidelines."
                : "You must select one before you can create employee invites."}
            </p>
          </div>
        </div>
      </section>

      {/* Employer Information */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Employer Information (I-9 Section 2)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          This information appears on every completed I-9 form in the employer section.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employer or Authorized Representative Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={config.employerName}
              onChange={(e) => updateField("employerName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={config.employerTitle}
              onChange={(e) => updateField("employerTitle", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business or Organization Name<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={config.employerBusinessName}
              onChange={(e) => updateField("employerBusinessName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business or Organization Address (Street, City, State, ZIP)<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={config.employerBusinessAddress}
              onChange={(e) => updateField("employerBusinessAddress", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
        </div>
      </section>

      {/* Notification Emails */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Notification Emails
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          These addresses receive email notifications when new I-9 submissions arrive.
        </p>

        {config.notificationEmails.length > 0 && (
          <ul className="space-y-2 mb-4">
            {config.notificationEmails.map((entry, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-2"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {entry.label}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({entry.email})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNotificationEmail(idx)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="hr@company.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Label
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="HR Team"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900"
            />
          </div>
          <button
            type="button"
            onClick={addNotificationEmail}
            disabled={!newEmail.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Add
          </button>
        </div>
      </section>

      {/* Live Preview */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Header Preview
        </h2>
        <div
          className="rounded-lg px-6 py-4 flex items-center gap-4"
          style={{ backgroundColor: config.primaryColor }}
        >
          {config.logoFileKey && (
            <img
              src={`/api/uploads/${config.logoFileKey}`}
              alt="Logo preview"
              className="h-10 w-10 object-contain rounded"
            />
          )}
          <span className="text-white font-bold text-lg">
            {config.businessName || "Your Business"}
          </span>
          <div className="ml-auto">
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: config.accentColor, color: "#fff" }}
            >
              Accent
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Configuration saved successfully.
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 font-medium">{error}</span>
        )}
      </div>
    </form>
  );
}
