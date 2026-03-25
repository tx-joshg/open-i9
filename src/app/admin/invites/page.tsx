"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "@/contexts/AdminContext";

interface Invite {
  id: string;
  token: string;
  emailHint: string | null;
  nameHint: string | null;
  expiresAt: string;
  usedAt: string | null;
  isRenewal: boolean;
  createdAt: string;
  employeeId: string | null;
  workerType: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type InviteStatus = "active" | "expired" | "used";

function getInviteStatus(invite: Invite): InviteStatus {
  if (invite.usedAt) return "used";
  if (new Date(invite.expiresAt) < new Date()) return "expired";
  return "active";
}

function StatusBadge({ status }: { status: InviteStatus }) {
  const styles: Record<InviteStatus, string> = {
    active: "bg-green-100 text-green-800",
    expired: "bg-yellow-100 text-yellow-800",
    used: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function AdminInvitesPage() {
  const { fetchWithAuth } = useAdmin();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupComplete, setSetupComplete] = useState(true);

  // Create form state
  const [emailHint, setEmailHint] = useState("");
  const [nameHint, setNameHint] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [workerType, setWorkerType] = useState("employee");
  const [isRenewal, setIsRenewal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Generated link
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites);
      }
    } catch {
      setError("Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/employees?limit=200");
      if (res.ok) {
        const data = await res.json();
        if (data.employees) {
          setEmployees(data.employees);
        }
      }
    } catch {
      // Employees endpoint may not exist yet; ignore
    }
  }, [fetchWithAuth]);

  const checkSetup = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/config");
      if (res.ok) {
        const cfg = await res.json();
        const complete = cfg.useEVerify !== null
          && !!cfg.employerName
          && !!cfg.employerTitle
          && !!cfg.employerBusinessName
          && !!cfg.employerBusinessAddress;
        setSetupComplete(complete);
      }
    } catch { /* ignore */ }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadInvites();
    loadEmployees();
    checkSetup();
  }, [loadInvites, loadEmployees, checkSetup]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    setGeneratedLink("");

    const payload: Record<string, unknown> = {};
    if (emailHint.trim()) payload.emailHint = emailHint.trim();
    if (nameHint.trim()) payload.nameHint = nameHint.trim();
    if (expiryDays.trim()) {
      const days = parseInt(expiryDays, 10);
      if (days > 0) payload.expiryDays = days;
    }
    if (isRenewal) payload.isRenewal = true;
    if (selectedEmployeeId) payload.employeeId = selectedEmployeeId;
    payload.workerType = workerType;

    try {
      const res = await fetchWithAuth("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to create invite" }));
        throw new Error(body.error || "Failed to create invite");
      }

      const result = await res.json();
      setGeneratedLink(result.inviteUrl);

      // Reset form
      setEmailHint("");
      setNameHint("");
      setExpiryDays("");
      setWorkerType("employee");
      setIsRenewal(false);
      setSelectedEmployeeId("");

      // Refresh list
      loadInvites();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure you want to revoke this invite?")) return;

    try {
      const res = await fetchWithAuth(`/api/invites/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to revoke" }));
        alert(body.error || "Failed to revoke invite");
        return;
      }
      loadInvites();
    } catch {
      alert("Failed to revoke invite");
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copyInviteLink(token: string) {
    const appUrl = window.location.origin;
    const url = `${appUrl}/?token=${token}`;
    await copyToClipboard(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invites</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and manage invite links for employees to complete their I-9 forms.
        </p>
      </div>

      {/* Setup warning */}
      {!setupComplete && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800">
            Setup required before creating invites
          </p>
          <p className="text-sm text-amber-700 mt-1">
            Go to{" "}
            <a href="/admin/config" className="font-medium underline hover:text-amber-900">
              Settings
            </a>{" "}
            and complete the E-Verify selection and Employer Information sections.
          </p>
        </div>
      )}

      {/* Create Invite Form */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${!setupComplete ? "opacity-50 pointer-events-none" : ""}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Invite</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nameHint" className="block text-sm font-medium text-gray-700 mb-1">
                Employee Name (optional)
              </label>
              <input
                id="nameHint"
                type="text"
                value={nameHint}
                onChange={(e) => setNameHint(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-gray-400"
              />
            </div>
            <div>
              <label htmlFor="emailHint" className="block text-sm font-medium text-gray-700 mb-1">
                Employee Email (optional)
              </label>
              <input
                id="emailHint"
                type="text"
                value={emailHint}
                onChange={(e) => setEmailHint(e.target.value)}
                placeholder="e.g. john@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiryDays" className="block text-sm font-medium text-gray-700 mb-1">
                Expires in (days)
              </label>
              <input
                id="expiryDays"
                type="number"
                min="1"
                max="365"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                placeholder="Default from portal config"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  placeholder:text-gray-400"
              />
            </div>
            {employees.length > 0 && (
              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Employee (optional)
                </label>
                <select
                  id="employeeId"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">-- None --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Worker Type</span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="workerType"
                  value="employee"
                  checked={workerType === "employee"}
                  onChange={() => setWorkerType("employee")}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Employee
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="workerType"
                  value="contractor"
                  checked={workerType === "contractor"}
                  onChange={() => setWorkerType("contractor")}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Contractor
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="isRenewal"
              type="checkbox"
              checked={isRenewal}
              onChange={(e) => setIsRenewal(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isRenewal" className="text-sm text-gray-700">
              This is a reverification invite
            </label>
          </div>

          {createError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {createError}
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md
              hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? "Creating..." : "Create Invite"}
          </button>
        </form>

        {/* Generated link display */}
        {generatedLink && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800 mb-2">Invite created successfully!</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3 py-2 border border-green-300 rounded-md text-sm text-gray-900 bg-white"
              />
              <button
                onClick={() => copyToClipboard(generatedLink)}
                className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md
                  hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invites Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Invites</h2>
        </div>

        {error && (
          <div className="px-6 py-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {invites.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No invites created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name Hint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Hint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <tr key={invite.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invite.nameHint || (
                          <span className="text-gray-400">--</span>
                        )}
                        {invite.isRenewal && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Renewal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invite.emailHint || (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invite.workerType
                          ? invite.workerType.charAt(0).toUpperCase() + invite.workerType.slice(1)
                          : "Employee"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        {status === "active" && (
                          <>
                            <button
                              onClick={() => copyInviteLink(invite.token)}
                              className="text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                              Copy Link
                            </button>
                            <button
                              onClick={() => handleRevoke(invite.id)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                        {status !== "active" && (
                          <span className="text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
