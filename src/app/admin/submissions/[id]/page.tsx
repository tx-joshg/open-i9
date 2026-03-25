"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAdmin } from "@/contexts/AdminContext";
import { StatusBadge, CITIZENSHIP_LABELS } from "@/components/admin/SubmissionsTable";
import type { SubmissionStatus, CitizenshipStatus, SyncStatus } from "@/types/i9";

interface SubmissionDetail {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  otherLastNames: string;
  address: string;
  aptUnit: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  ssn: string;
  email: string;
  phone: string;
  citizenshipStatus: CitizenshipStatus;
  alienRegNumber: string;
  i94Number: string;
  foreignPassportNumber: string;
  passportCountry: string;
  authExpDate: string;
  signatureDate: string;
  docChoice: "listA" | "listBC";
  listADoc: string;
  listADocNumber: string;
  listAExpDate: string;
  listAFileKey: string;
  listBDoc: string;
  listBDocNumber: string;
  listBExpDate: string;
  listBFileKey: string;
  listCDoc: string;
  listCDocNumber: string;
  listCExpDate: string;
  listCFileKey: string;
  status: SubmissionStatus;
  adminNotes: string;
  createdAt: string;
  integrationSyncs?: IntegrationSync[];
}

interface IntegrationSync {
  integrationName: string;
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

const SYNC_BADGE_STYLES: Record<SyncStatus, { bg: string; text: string }> = {
  synced: { bg: "bg-green-100", text: "text-green-800" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
  failed: { bg: "bg-red-100", text: "text-red-800" },
};

function isImageFile(fileKey: string): boolean {
  const ext = fileKey.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
}

function DocumentPreview({ fileKey, label }: { fileKey: string; label: string }) {
  if (!fileKey) return null;

  const url = `/api/uploads/${fileKey}`;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      {isImageFile(fileKey) ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt={label}
            className="max-w-full max-h-64 object-contain rounded border border-gray-100"
          />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-md text-sm text-indigo-600 hover:text-indigo-800 hover:bg-gray-100 transition-colors"
        >
          <svg
            className="h-8 w-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
          </svg>
          View Document
        </a>
      )}
    </div>
  );
}

function formatDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function MaskedSSNField({ value }: { value: string | undefined | null }) {
  const [revealed, setRevealed] = useState(false);

  if (!value) return <FieldRow label="SSN" value="-" />;

  const masked = value.length >= 4
    ? `\u2022\u2022\u2022-\u2022\u2022-${value.slice(-4)}`
    : "\u2022\u2022\u2022-\u2022\u2022-\u2022\u2022\u2022\u2022";

  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">SSN</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center gap-2">
        <span className="font-mono">{revealed ? value : masked}</span>
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title={revealed ? "Hide SSN" : "Reveal SSN"}
        >
          {revealed ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </dd>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
        {value || "-"}
      </dd>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { fetchWithAuth } = useAdmin();
  const id = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubmissionStatus>("pending_review");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [hireDate, setHireDate] = useState("");

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/submissions/${id}`);
      if (res.ok) {
        const data = (await res.json()) as SubmissionDetail;
        setSubmission(data);
        setStatus(data.status);
        setAdminNotes(data.adminNotes ?? "");
      } else if (res.status === 404) {
        router.push("/admin");
      }
    } catch {
      // fetchWithAuth handles 401
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, id, router]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  async function handleStatusSave() {
    const willPurge = status === "approved" || status === "rejected";

    if (status === "approved") {
      if (!hireDate) {
        setMessage("Please enter a hire/engagement date before approving.");
        return;
      }
      const confirmed = window.confirm(
        "Approving this submission will permanently delete all uploaded documents. " +
        "This cannot be undone.\n\n" +
        "You are confirming that you have reviewed the employee's identity and " +
        "employment authorization documents.\n\n" +
        "Continue with approval?"
      );
      if (!confirmed) return;
    }

    if (status === "rejected") {
      const confirmed = window.confirm(
        "Rejecting this submission will permanently delete all uploaded documents. " +
        "This cannot be undone.\n\n" +
        "Continue with rejection?"
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, purgeDocuments: willPurge, hireDate }),
      });
      if (res.ok) {
        setMessage(
          willPurge
            ? `Submission ${status}. Documents have been purged.`
            : "Status updated."
        );
        if (willPurge) {
          loadSubmission();
        } else {
          setSubmission((prev) => (prev ? { ...prev, status } : prev));
        }
      } else {
        setMessage("Failed to update status.");
      }
    } catch {
      setMessage("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesSave() {
    setSavingNotes(true);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        setMessage("Notes saved.");
        setSubmission((prev) => (prev ? { ...prev, adminNotes } : prev));
      } else {
        setMessage("Failed to save notes.");
      }
    } catch {
      setMessage("Failed to save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleResendEmail() {
    setResending(true);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/api/submissions/${id}/resend`, {
        method: "POST",
      });
      if (res.ok) {
        setMessage("Notification email resent.");
      } else {
        setMessage("Failed to resend email.");
      }
    } catch {
      setMessage("Failed to resend email.");
    } finally {
      setResending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-20 text-gray-500">
        Submission not found.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          &larr; Back to Submissions
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {submission.firstName} {submission.lastName}
          </h1>
          <StatusBadge status={submission.status} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-gray-500">
            Submitted {new Date(submission.createdAt).toLocaleString()}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetchWithAuth(`/api/submissions/${id}/pdf`);
                if (!res.ok) throw new Error("Failed to generate PDF");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `I-9_${submission.lastName}_${submission.firstName}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                setMessage("Failed to download PDF.");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download I-9 PDF
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-800 rounded-md text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Personal */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Section 1 - Employee Information
            </h2>
            <dl className="divide-y divide-gray-100">
              <FieldRow
                label="Full Name"
                value={`${submission.lastName}, ${submission.firstName}${submission.middleInitial ? ` ${submission.middleInitial}.` : ""}`}
              />
              <FieldRow
                label="Other Last Names Used"
                value={submission.otherLastNames}
              />
              <FieldRow
                label="Address"
                value={`${submission.address}${submission.aptUnit ? `, ${submission.aptUnit}` : ""}`}
              />
              <FieldRow
                label="City, State, ZIP"
                value={`${submission.city}, ${submission.state} ${submission.zip}`}
              />
              <FieldRow label="Date of Birth" value={submission.dob} />
              {submission.ssn && <MaskedSSNField value={submission.ssn} />}
              <FieldRow label="Email" value={submission.email} />
              <FieldRow label="Phone" value={submission.phone} />
              <FieldRow
                label="Citizenship Status"
                value={CITIZENSHIP_LABELS[submission.citizenshipStatus]}
              />
              {submission.alienRegNumber && (
                <FieldRow
                  label="Alien Registration Number"
                  value={submission.alienRegNumber}
                />
              )}
              {submission.i94Number && (
                <FieldRow label="I-94 Number" value={submission.i94Number} />
              )}
              {submission.foreignPassportNumber && (
                <FieldRow
                  label="Foreign Passport Number"
                  value={submission.foreignPassportNumber}
                />
              )}
              {submission.passportCountry && (
                <FieldRow
                  label="Passport Country"
                  value={submission.passportCountry}
                />
              )}
              {submission.authExpDate && (
                <FieldRow
                  label="Authorization Expiration"
                  value={formatDate(submission.authExpDate)}
                />
              )}
              <FieldRow
                label="Signature Date"
                value={formatDate(submission.signatureDate)}
              />
            </dl>
          </section>

          {/* Documents */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Documents ({submission.docChoice === "listA" ? "List A" : "List B + C"})
            </h2>

            {submission.docChoice === "listA" ? (
              <div className="space-y-4">
                <div className="space-y-1 mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Document:</span>{" "}
                    {submission.listADoc}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Number:</span>{" "}
                    {submission.listADocNumber}
                  </p>
                  {submission.listAExpDate && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Expires:</span>{" "}
                      {formatDate(submission.listAExpDate)}
                    </p>
                  )}
                </div>
                <DocumentPreview
                  fileKey={submission.listAFileKey}
                  label="List A Document"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    List B - Identity
                  </h3>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Document:</span>{" "}
                      {submission.listBDoc}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Number:</span>{" "}
                      {submission.listBDocNumber}
                    </p>
                    {submission.listBExpDate && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Expires:</span>{" "}
                        {formatDate(submission.listBExpDate)}
                      </p>
                    )}
                  </div>
                  <DocumentPreview
                    fileKey={submission.listBFileKey}
                    label="List B Document"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    List C - Employment Authorization
                  </h3>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Document:</span>{" "}
                      {submission.listCDoc}
                    </p>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Number:</span>{" "}
                      {submission.listCDocNumber}
                    </p>
                    {submission.listCExpDate && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Expires:</span>{" "}
                        {formatDate(submission.listCExpDate)}
                      </p>
                    )}
                  </div>
                  <DocumentPreview
                    fileKey={submission.listCFileKey}
                    label="List C Document"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Status
            </h2>
            <div className="space-y-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubmissionStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              {status === "approved" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire / Engagement Date<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              )}
              <button
                onClick={handleStatusSave}
                disabled={saving || status === submission.status}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Update Status"}
              </button>
            </div>
          </section>

          {/* Admin Notes */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Admin Notes
            </h2>
            <div className="space-y-3">
              <textarea
                rows={5}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this submission..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={handleNotesSave}
                disabled={savingNotes}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingNotes ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </section>

          {/* Actions */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </h2>
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resending ? "Sending..." : "Resend Notification Email"}
            </button>
          </section>

          {/* Integration Sync Status */}
          {submission.integrationSyncs &&
            submission.integrationSyncs.length > 0 && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Integration Sync
                </h2>
                <ul className="space-y-3">
                  {submission.integrationSyncs.map((sync) => {
                    const badge = SYNC_BADGE_STYLES[sync.status];
                    return (
                      <li
                        key={sync.integrationName}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-700">
                          {sync.integrationName}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                        >
                          {sync.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
        </div>
      </div>
    </div>
  );
}
