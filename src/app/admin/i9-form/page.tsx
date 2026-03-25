"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";

interface PdfFieldInfo {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "other";
}

interface MappingKey {
  key: string;
  label: string;
  section: string;
  fieldType: "text" | "checkbox" | "dropdown";
}

const MAPPING_KEYS: MappingKey[] = [
  // Section 1 - Personal
  { key: "lastName", label: "Last Name", section: "Section 1 - Personal", fieldType: "text" },
  { key: "firstName", label: "First Name", section: "Section 1 - Personal", fieldType: "text" },
  { key: "middleInitial", label: "Middle Initial", section: "Section 1 - Personal", fieldType: "text" },
  { key: "otherLastNames", label: "Other Last Names", section: "Section 1 - Personal", fieldType: "text" },
  { key: "address", label: "Address", section: "Section 1 - Personal", fieldType: "text" },
  { key: "aptUnit", label: "Apt/Unit", section: "Section 1 - Personal", fieldType: "text" },
  { key: "city", label: "City", section: "Section 1 - Personal", fieldType: "text" },
  { key: "state", label: "State", section: "Section 1 - Personal", fieldType: "dropdown" },
  { key: "zip", label: "ZIP Code", section: "Section 1 - Personal", fieldType: "text" },
  { key: "dob", label: "Date of Birth", section: "Section 1 - Personal", fieldType: "text" },
  { key: "ssn", label: "Social Security Number", section: "Section 1 - Personal", fieldType: "text" },
  { key: "email", label: "Email", section: "Section 1 - Personal", fieldType: "text" },
  { key: "phone", label: "Phone", section: "Section 1 - Personal", fieldType: "text" },

  // Section 1 - Citizenship
  { key: "cbCitizen", label: "Checkbox: U.S. Citizen", section: "Section 1 - Citizenship", fieldType: "checkbox" },
  { key: "cbNational", label: "Checkbox: Noncitizen National", section: "Section 1 - Citizenship", fieldType: "checkbox" },
  { key: "cbLpr", label: "Checkbox: LPR", section: "Section 1 - Citizenship", fieldType: "checkbox" },
  { key: "cbAuthorized", label: "Checkbox: Authorized Alien", section: "Section 1 - Citizenship", fieldType: "checkbox" },
  { key: "uscisNumber", label: "USCIS/A-Number", section: "Section 1 - Citizenship", fieldType: "text" },
  { key: "authExpDate", label: "Auth Expiration Date", section: "Section 1 - Citizenship", fieldType: "text" },
  { key: "i94Number", label: "I-94 Number", section: "Section 1 - Citizenship", fieldType: "text" },
  { key: "foreignPassport", label: "Foreign Passport", section: "Section 1 - Citizenship", fieldType: "text" },

  // Section 1 - Signature
  { key: "employeeSignature", label: "Employee Signature", section: "Section 1 - Signature", fieldType: "text" },
  { key: "employeeSignatureDate", label: "Signature Date", section: "Section 1 - Signature", fieldType: "text" },

  // Section 2 - List A
  { key: "listADocTitle", label: "List A: Document Title", section: "Section 2 - List A", fieldType: "text" },
  { key: "listAIssuingAuthority", label: "List A: Issuing Authority", section: "Section 2 - List A", fieldType: "text" },
  { key: "listADocNumber", label: "List A: Document Number", section: "Section 2 - List A", fieldType: "text" },
  { key: "listAExpDate", label: "List A: Expiration Date", section: "Section 2 - List A", fieldType: "text" },

  // Section 2 - List B
  { key: "listBDocTitle", label: "List B: Document Title", section: "Section 2 - List B", fieldType: "text" },
  { key: "listBIssuingAuthority", label: "List B: Issuing Authority", section: "Section 2 - List B", fieldType: "text" },
  { key: "listBDocNumber", label: "List B: Document Number", section: "Section 2 - List B", fieldType: "text" },
  { key: "listBExpDate", label: "List B: Expiration Date", section: "Section 2 - List B", fieldType: "text" },

  // Section 2 - List C
  { key: "listCDocTitle", label: "List C: Document Title", section: "Section 2 - List C", fieldType: "text" },
  { key: "listCIssuingAuthority", label: "List C: Issuing Authority", section: "Section 2 - List C", fieldType: "text" },
  { key: "listCDocNumber", label: "List C: Document Number", section: "Section 2 - List C", fieldType: "text" },
  { key: "listCExpDate", label: "List C: Expiration Date", section: "Section 2 - List C", fieldType: "text" },

  // Section 2 - Employer
  { key: "firstDayEmployed", label: "First Day Employed", section: "Section 2 - Employer", fieldType: "text" },
  { key: "employerNameAndTitle", label: "Employer Name & Title", section: "Section 2 - Employer", fieldType: "text" },
  { key: "employerSignature", label: "Employer Signature", section: "Section 2 - Employer", fieldType: "text" },
  { key: "employerSignatureDate", label: "Employer Signature Date", section: "Section 2 - Employer", fieldType: "text" },
  { key: "employerBusinessName", label: "Business Name", section: "Section 2 - Employer", fieldType: "text" },
  { key: "employerBusinessAddress", label: "Business Address", section: "Section 2 - Employer", fieldType: "text" },

  // Section 2 - Employee name repeat
  { key: "section2LastName", label: "Section 2: Last Name", section: "Section 2 - Name Repeat", fieldType: "text" },
  { key: "section2FirstName", label: "Section 2: First Name", section: "Section 2 - Name Repeat", fieldType: "text" },
  { key: "section2MiddleInitial", label: "Section 2: Middle Initial", section: "Section 2 - Name Repeat", fieldType: "text" },
];

export default function I9FormManagementPage() {
  const { fetchWithAuth } = useAdmin();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [hasCustomForm, setHasCustomForm] = useState(false);
  const [pdfFields, setPdfFields] = useState<PdfFieldInfo[]>([]);
  const [defaultMapping, setDefaultMapping] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [totalFields, setTotalFields] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFormInfo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/api/i9-form");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setHasCustomForm(data.hasCustomForm);
      setPdfFields(data.pdfFields);
      setDefaultMapping(data.defaultMapping);
      setTotalFields(data.totalFields);

      // Merge stored mapping with defaults for display
      const merged = { ...data.defaultMapping, ...data.storedMapping };
      setMapping(merged);
    } catch {
      setError("Failed to load I-9 form configuration.");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadFormInfo();
  }, [loadFormInfo]);

  async function handleUpload(file: File) {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      // Upload the file
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetchWithAuth("/api/uploads", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { fileKey } = await uploadRes.json() as { fileKey: string };

      // Save the fileKey to config
      const saveRes = await fetchWithAuth("/api/i9-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      if (!saveRes.ok) throw new Error("Failed to save");

      setMessage("Form uploaded successfully. Review the field mapping below.");
      await loadFormInfo();
    } catch {
      setError("Failed to upload I-9 form.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRevertToDefault() {
    if (!confirm("Revert to the bundled default I-9 form? Your uploaded form will be removed.")) return;

    try {
      const res = await fetchWithAuth("/api/i9-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: null, mapping: {} }),
      });
      if (!res.ok) throw new Error("Failed to revert");

      setMessage("Reverted to default I-9 form.");
      await loadFormInfo();
    } catch {
      setError("Failed to revert.");
    }
  }

  async function handleSaveMapping() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Only save values that differ from defaults
      const diff: Record<string, string> = {};
      for (const [key, value] of Object.entries(mapping)) {
        if (value !== defaultMapping[key]) {
          diff[key] = value;
        }
      }

      const res = await fetchWithAuth("/api/i9-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping: diff }),
      });
      if (!res.ok) throw new Error("Failed to save");

      setMessage("Field mapping saved successfully.");
    } catch {
      setError("Failed to save field mapping.");
    } finally {
      setSaving(false);
    }
  }

  function updateMapping(key: string, pdfFieldName: string) {
    setMapping((prev) => ({ ...prev, [key]: pdfFieldName }));
    setMessage("");
  }

  // Group PDF fields by type for the dropdown options
  const textFields = pdfFields.filter((f) => f.type === "text");
  const checkboxFields = pdfFields.filter((f) => f.type === "checkbox");
  const dropdownFields = pdfFields.filter((f) => f.type === "dropdown");

  function getOptionsForType(fieldType: string): PdfFieldInfo[] {
    switch (fieldType) {
      case "checkbox": return checkboxFields;
      case "dropdown": return [...dropdownFields, ...textFields]; // dropdowns can fall back to text
      default: return textFields;
    }
  }

  // Group mapping keys by section
  const sections = Array.from(new Set(MAPPING_KEYS.map((k) => k.section)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">I-9 Form Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a new I-9 form when USCIS releases an update, then map the PDF fields to your data.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      {/* Current Form Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current I-9 Form</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            hasCustomForm ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasCustomForm ? "bg-blue-500" : "bg-gray-400"}`} />
            {hasCustomForm ? "Custom uploaded form" : "Default bundled form (Edition 01/20/25)"}
          </div>
          <span className="text-sm text-gray-500">{totalFields} form fields detected</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors">
            {uploading ? "Uploading..." : "Upload New I-9 Form"}
            <input
              type="file"
              accept="application/pdf"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
          {hasCustomForm && (
            <button
              onClick={handleRevertToDefault}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Revert to Default
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Upload the official USCIS Form I-9 PDF. The system will read all form fields so you can map them below.
        </p>
      </div>

      {/* PDF Fields Inspector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">PDF Fields Found</h2>
        <p className="text-sm text-gray-500 mb-4">
          These are the fillable fields detected in the I-9 PDF. Use this as a reference when mapping below.
        </p>

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pdfFields.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5 font-mono text-xs text-gray-800">{f.name}</td>
                  <td className="px-4 py-1.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      f.type === "text" ? "bg-blue-100 text-blue-700" :
                      f.type === "checkbox" ? "bg-green-100 text-green-700" :
                      f.type === "dropdown" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {f.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Mapping */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Field Mapping</h2>
            <p className="text-sm text-gray-500 mt-1">
              Map each data field to the corresponding PDF form field name. Select from detected fields or type a custom name.
            </p>
          </div>
          <button
            onClick={handleSaveMapping}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Mapping"}
          </button>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section}>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                {section}
              </h3>
              <div className="space-y-3">
                {MAPPING_KEYS.filter((k) => k.section === section).map((mk) => {
                  const options = getOptionsForType(mk.fieldType);
                  const currentValue = mapping[mk.key] ?? "";
                  const isDefault = currentValue === defaultMapping[mk.key];

                  return (
                    <div key={mk.key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                      <label className="text-sm text-gray-700">
                        {mk.label}
                        {!isDefault && (
                          <span className="ml-2 text-xs text-amber-600 font-medium">(customized)</span>
                        )}
                      </label>
                      <select
                        value={currentValue}
                        onChange={(e) => updateMapping(mk.key, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">-- Not mapped --</option>
                        {options.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
