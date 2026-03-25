"use client";
import { useRouter } from "next/navigation";
import type { SubmissionStatus, CitizenshipStatus, DocChoice } from "@/types/i9";

export interface SubmissionRow {
  id: string;
  firstName: string;
  lastName: string;
  citizenshipStatus: CitizenshipStatus;
  docChoice: DocChoice;
  status: SubmissionStatus;
  createdAt: string;
}

interface SubmissionsTableProps {
  submissions: SubmissionRow[];
  loading?: boolean;
}

const STATUS_STYLES: Record<SubmissionStatus, { bg: string; text: string; label: string }> = {
  pending_review: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Review" },
  approved: { bg: "bg-green-100", text: "text-green-800", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-800", label: "Rejected" },
};

const CITIZENSHIP_LABELS: Record<CitizenshipStatus, string> = {
  usCitizen: "U.S. Citizen",
  usnational: "U.S. National",
  lpr: "Lawful Permanent Resident",
  authorized: "Authorized Alien",
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

export default function SubmissionsTable({
  submissions,
  loading = false,
}: SubmissionsTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
          Loading submissions...
        </div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center text-gray-500">
          No submissions found.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Citizenship
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documents
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.map((sub) => (
              <tr
                key={sub.id}
                onClick={() => router.push(`/admin/submissions/${sub.id}`)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {sub.firstName} {sub.lastName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(sub.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {CITIZENSHIP_LABELS[sub.citizenshipStatus]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sub.docChoice === "listA" ? "List A" : "List B + C"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={sub.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StatusBadge, CITIZENSHIP_LABELS };
