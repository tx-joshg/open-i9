"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAdmin } from "@/contexts/AdminContext";
import SubmissionsTable from "@/components/admin/SubmissionsTable";
import type { SubmissionRow } from "@/components/admin/SubmissionsTable";
import type { SubmissionStatus } from "@/types/i9";

const PAGE_SIZE = 20;

function SetupBanner() {
  const { fetchWithAuth } = useAdmin();
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetchWithAuth("/api/config");
        if (!res.ok) return;
        const cfg = await res.json();
        const items: string[] = [];
        if (cfg.useEVerify === null) items.push("E-Verify selection");
        if (!cfg.employerName) items.push("Employer name");
        if (!cfg.employerTitle) items.push("Employer title");
        if (!cfg.employerBusinessName) items.push("Business name");
        if (!cfg.employerBusinessAddress) items.push("Business address");
        setMissing(items);
      } catch { /* ignore */ }
    }
    check();
  }, [fetchWithAuth]);

  if (missing.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-900 mb-1">Setup Required</h3>
      <p className="text-sm text-blue-800 mb-2">
        Complete these items in{" "}
        <a href="/admin/config" className="font-medium underline hover:text-blue-950">Settings</a>{" "}
        before you can create employee invites:
      </p>
      <ul className="text-sm text-blue-700 space-y-0.5">
        {missing.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface RenewalAlert {
  total: number;
}

function RenewalAlertBanner() {
  const { fetchWithAuth } = useAdmin();
  const [renewalCount, setRenewalCount] = useState<number | null>(null);

  useEffect(() => {
    async function loadRenewals() {
      try {
        const res = await fetchWithAuth("/api/renewals/upcoming?days=30");
        if (res.ok) {
          const data: RenewalAlert = await res.json();
          setRenewalCount(data.total);
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }
    loadRenewals();
  }, [fetchWithAuth]);

  if (renewalCount === null || renewalCount === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-amber-800">
            {renewalCount} renewal{renewalCount !== 1 ? "s" : ""} due in the
            next 30 days
          </p>
        </div>
        <Link
          href="/admin/employees"
          className="text-sm font-medium text-amber-700 hover:text-amber-900 underline"
        >
          View employees
        </Link>
      </div>
    </div>
  );
}

export default function AdminSubmissionsPage() {
  const { fetchWithAuth } = useAdmin();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/submissions?limit=100");
      if (res.ok) {
        const data = await res.json() as { submissions: SubmissionRow[]; pagination: { total: number } };
        setSubmissions(data.submissions);
      }
    } catch {
      // fetchWithAuth handles 401
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filtered = useMemo(() => {
    let result = submissions;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    return result;
  }, [submissions, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  function exportCSV() {
    const headers = [
      "Name",
      "Submitted",
      "Citizenship Status",
      "Document Type",
      "Status",
    ];
    const rows = filtered.map((s) => [
      `${s.firstName} ${s.lastName}`,
      new Date(s.createdAt).toLocaleDateString(),
      s.citizenshipStatus,
      s.docChoice === "listA" ? "List A" : "List B + C",
      s.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `i9-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SetupBanner />
      <RenewalAlertBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} submission{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as SubmissionStatus | "");
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <SubmissionsTable submissions={paged} loading={loading} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {safeCurrentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
