"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/contexts/AdminContext";

interface SubmissionSummary {
  id: string;
  createdAt: string;
  status: string;
  isRenewal: boolean;
  nextRenewalDate: string | null;
  citizenshipStatus: string;
  docChoice: string;
}

interface EmployeeDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  workerType: string | null;
  hireDate: string | null;
  terminatedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  submissions: SubmissionSummary[];
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-yellow-100 text-yellow-800",
    terminated: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        colors[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export default function EmployeeDetailPage() {
  const { fetchWithAuth } = useAdmin();
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [notes, setNotes] = useState("");

  const [renewalLoading, setRenewalLoading] = useState(false);
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [terminationDate, setTerminationDate] = useState("");

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/employees/${employeeId}`);
      if (res.ok) {
        const data: EmployeeDetail = await res.json();
        setEmployee(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        setPhone(data.phone || "");
        setStatus(data.status);
        setHireDate(
          data.hireDate ? new Date(data.hireDate).toISOString().slice(0, 10) : ""
        );
        setNotes(data.notes || "");
      } else if (res.status === 404) {
        setError("Employee not found");
      }
    } catch {
      setError("Failed to load employee");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, employeeId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetchWithAuth(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || null,
          status,
          hireDate: hireDate || null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setSuccessMsg("Employee updated successfully");
        loadEmployee();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update employee");
      }
    } catch {
      setError("Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleTerminate() {
    if (!terminationDate) {
      setError("Termination date is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetchWithAuth(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "terminated", terminatedAt: terminationDate }),
      });

      if (res.ok) {
        setShowTerminateForm(false);
        setTerminationDate("");
        loadEmployee();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to terminate employee");
      }
    } catch {
      setError("Failed to terminate employee");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendRenewal() {
    setRenewalLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/employees/${employeeId}/send-renewal`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        alert(`Renewal invite created!\n\n${data.inviteUrl}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send renewal invite");
      }
    } catch {
      alert("Failed to send renewal invite");
    } finally {
      setRenewalLoading(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString();
  }

  function isRenewalSoon(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const renewalDate = new Date(dateStr);
    const now = new Date();
    const daysUntil =
      (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 30 && daysUntil >= 0;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || "Employee not found"}</p>
        <button
          onClick={() => router.push("/admin/employees")}
          className="mt-4 text-indigo-600 hover:text-indigo-900 font-medium text-sm"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  const nextRenewal =
    employee.submissions.length > 0
      ? employee.submissions[0].nextRenewalDate
      : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/admin/employees")}
            className="text-sm text-indigo-600 hover:text-indigo-900 mb-2 inline-block"
          >
            &larr; Back to Employees
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={employee.status} />
            {nextRenewal && isRenewalSoon(nextRenewal) && (
              <span className="text-sm text-amber-600 font-medium">
                Renewal due {formatDate(nextRenewal)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSendRenewal}
            disabled={renewalLoading}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {renewalLoading ? "Sending..." : "Send Renewal Invite"}
          </button>
          {employee.status !== "terminated" && (
            <button
              onClick={() => setShowTerminateForm(true)}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              {employee.workerType === "contractor" ? "End Engagement" : "Terminate"}
            </button>
          )}
        </div>
      </div>

      {/* Terminate Form */}
      {showTerminateForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium mb-3">
            {employee.workerType === "contractor" ? "End Engagement" : "Terminate"}{" "}
            <strong>
              {employee.firstName} {employee.lastName}
            </strong>
          </p>
          <div className="mb-3">
            <label className="block text-sm font-medium text-red-800 mb-1">
              {employee.workerType === "contractor"
                ? "End of Engagement Date"
                : "Termination Date"}{" "}
              <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
              required
              className="px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleTerminate}
              disabled={saving || !terminationDate}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saving
                ? "Processing..."
                : employee.workerType === "contractor"
                ? "Confirm End Engagement"
                : "Confirm Termination"}
            </button>
            <button
              onClick={() => {
                setShowTerminateForm(false);
                setTerminationDate("");
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Next Renewal Date Banner */}
      {nextRenewal && (
        <div
          className={`rounded-lg p-4 mb-6 ${
            isRenewalSoon(nextRenewal)
              ? "bg-amber-50 border border-amber-200"
              : "bg-blue-50 border border-blue-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              isRenewalSoon(nextRenewal) ? "text-amber-800" : "text-blue-800"
            }`}
          >
            Next renewal date: {formatDate(nextRenewal)}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">{successMsg}</p>
        </div>
      )}

      {/* Edit Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Employee Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hire Date
            </label>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Submission History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Submission History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Citizenship
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Renewal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employee.submissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No submissions yet
                  </td>
                </tr>
              ) : (
                employee.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link
                        href={`/admin/submissions/${sub.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {formatDate(sub.createdAt)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SubmissionStatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.isRenewal ? (
                        <span className="text-amber-600 font-medium">
                          Renewal
                        </span>
                      ) : (
                        "Initial"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.citizenshipStatus}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sub.docChoice === "listA" ? "List A" : "List B + C"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={
                          isRenewalSoon(sub.nextRenewalDate)
                            ? "text-amber-600 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {formatDate(sub.nextRenewalDate)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
