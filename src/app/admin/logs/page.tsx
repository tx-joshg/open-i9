"use client";

import { useEffect, useState, useCallback } from "react";

interface AuditEntry {
  id: string;
  action: string;
  detail: string | null;
  meta: Record<string, unknown> | null;
  actor: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "invite.created": { label: "Invite Created", color: "bg-blue-100 text-blue-800" },
  "invite.used": { label: "Invite Used", color: "bg-green-100 text-green-800" },
  "invite.revoked": { label: "Invite Revoked", color: "bg-gray-100 text-gray-800" },
  "submission.received": { label: "Submission Received", color: "bg-indigo-100 text-indigo-800" },
  "submission.approved": { label: "Approved", color: "bg-green-100 text-green-800" },
  "submission.rejected": { label: "Rejected", color: "bg-red-100 text-red-800" },
  "documents.purged": { label: "Docs Purged", color: "bg-yellow-100 text-yellow-800" },
  "employee.created": { label: "Employee Created", color: "bg-blue-100 text-blue-800" },
  "employee.terminated": { label: "Terminated", color: "bg-red-100 text-red-800" },
  "employee.reactivated": { label: "Reactivated", color: "bg-green-100 text-green-800" },
  "email.sent": { label: "Email Sent", color: "bg-teal-100 text-teal-800" },
  "email.failed": { label: "Email Failed", color: "bg-red-100 text-red-800" },
  "config.updated": { label: "Config Updated", color: "bg-purple-100 text-purple-800" },
  "admin.login": { label: "Admin Login", color: "bg-gray-100 text-gray-800" },
  "admin.setup": { label: "Admin Setup", color: "bg-purple-100 text-purple-800" },
};

const FILTER_OPTIONS = [
  { value: "", label: "All Events" },
  { value: "invite", label: "Invites" },
  { value: "submission", label: "Submissions" },
  { value: "employee", label: "Employees" },
  { value: "email", label: "Emails" },
  { value: "config", label: "Config" },
  { value: "admin", label: "Admin" },
  { value: "documents", label: "Documents" },
];

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filter) params.set("action", filter);
      const res = await fetch(`/api/audit?${params}`, {
        headers: { Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)admin_session\s*=\s*([^;]*).*$)|^.*$/, "$1")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function getActionDisplay(action: string) {
    return ACTION_LABELS[action] ?? { label: action, color: "bg-gray-100 text-gray-700" };
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total events</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={fetchLogs}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm mt-1">Events will appear here as you use the portal.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((entry) => {
              const display = getActionDisplay(entry.action);
              return (
                <div key={entry.id} className="px-5 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${display.color}`}>
                          {display.label}
                        </span>
                        <span className="text-xs text-gray-400">{entry.actor}</span>
                      </div>
                      {entry.detail && (
                        <p className="text-sm text-gray-700">{entry.detail}</p>
                      )}
                      {entry.meta && (
                        <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                          {Object.entries(entry.meta).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
