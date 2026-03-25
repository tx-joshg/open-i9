"use client";

import { useState } from "react";
import type { I9FormData } from "@/types/i9";

interface StepReviewProps {
  formData: I9FormData;
  onSubmitted: () => void;
  inviteToken?: string;
}

function maskSSN(ssn: string): string {
  if (!ssn) return "Not provided";
  const digits = ssn.replace(/\D/g, "");
  if (digits.length < 4) return ssn;
  const last4 = digits.slice(-4);
  return `\u2022\u2022\u2022-\u2022\u2022-${last4}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "usCitizen":
      return "U.S. Citizen";
    case "usnational":
      return "Noncitizen National of the U.S.";
    case "lpr":
      return "Lawful Permanent Resident";
    case "authorized":
      return "Alien Authorized to Work";
    default:
      return status;
  }
}

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 py-1.5">
      <span className="text-sm font-medium text-gray-500 sm:w-48 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

function DocThumbnail({ fileKey, label }: { fileKey: string; label: string }) {
  if (!fileKey) return null;
  return (
    <div className="flex items-center gap-3 p-2 rounded border border-gray-200 bg-gray-50">
      <div className="w-12 h-12 flex items-center justify-center rounded bg-blue-100 shrink-0">
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 truncate">{fileKey}</p>
      </div>
    </div>
  );
}

export default function StepReview({ formData, onSubmitted, inviteToken }: StepReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, inviteToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Submission failed" }));
        if (body.details?.fieldErrors) {
          const fields = body.details.fieldErrors as Record<string, string[]>;
          const messages = Object.entries(fields)
            .map(([field, errs]) => `${field}: ${errs.join(", ")}`)
            .join("; ");
          throw new Error(messages || body.error || "Submission failed");
        }
        throw new Error(body.error || "Submission failed");
      }

      onSubmitted();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Review Your Information</h2>
        <p className="text-sm text-gray-500 mt-1">
          Please review all information below before submitting. Use the Back button to make corrections.
        </p>
      </div>

      {/* Personal Information */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Personal Information</h3>
        <div className="divide-y divide-gray-100">
          <ReviewRow label="Full Name" value={`${formData.firstName} ${formData.middleInitial ? formData.middleInitial + ". " : ""}${formData.lastName}`} />
          {formData.otherLastNames && <ReviewRow label="Other Last Names" value={formData.otherLastNames} />}
          <ReviewRow label="Address" value={`${formData.address}${formData.aptUnit ? ", " + formData.aptUnit : ""}, ${formData.city}, ${formData.state} ${formData.zip}`} />
          <ReviewRow label="Date of Birth" value={formData.dob} />
          <ReviewRow label="SSN" value={maskSSN(formData.ssn)} />
          <ReviewRow label="Email" value={formData.email} />
          {formData.phone && <ReviewRow label="Phone" value={formData.phone} />}
        </div>
      </div>

      {/* Eligibility */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Citizenship / Immigration Status</h3>
        <div className="divide-y divide-gray-100">
          <ReviewRow label="Status" value={statusLabel(formData.citizenshipStatus)} />
          {formData.alienRegNumber && <ReviewRow label="Alien Reg. Number" value={formData.alienRegNumber} />}
          {formData.i94Number && <ReviewRow label="I-94 Number" value={formData.i94Number} />}
          {formData.foreignPassportNumber && <ReviewRow label="Foreign Passport" value={`${formData.foreignPassportNumber}${formData.passportCountry ? " (" + formData.passportCountry + ")" : ""}`} />}
          {formData.authExpDate && <ReviewRow label="Auth. Expiration" value={formData.authExpDate} />}
          <ReviewRow label="Attestation" value={formData.attestationChecked ? "Signed" : "Not signed"} />
          <ReviewRow label="Signature Date" value={formData.signatureDate} />
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Documents</h3>
        <ReviewRow label="Document Option" value={formData.docChoice === "listA" ? "List A" : formData.docChoice === "listBC" ? "List B + List C" : ""} />

        {formData.docChoice === "listA" && (
          <div className="mt-3 space-y-2">
            <ReviewRow label="Document" value={formData.listADoc} />
            <ReviewRow label="Issuing Authority" value={formData.listAIssuingAuthority} />
            <ReviewRow label="Number" value={formData.listADocNumber} />
            {formData.listAExpDate && <ReviewRow label="Expiration" value={formData.listAExpDate} />}
            <DocThumbnail fileKey={formData.listAFileKey} label={formData.listADoc || "List A Document"} />
          </div>
        )}

        {formData.docChoice === "listBC" && (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">List B (Identity)</p>
              <ReviewRow label="Document" value={formData.listBDoc} />
              <ReviewRow label="Issuing Authority" value={formData.listBIssuingAuthority} />
              <ReviewRow label="Number" value={formData.listBDocNumber} />
              {formData.listBExpDate && <ReviewRow label="Expiration" value={formData.listBExpDate} />}
              <DocThumbnail fileKey={formData.listBFileKey} label={formData.listBDoc || "List B Document"} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">List C (Employment Authorization)</p>
              <ReviewRow label="Document" value={formData.listCDoc} />
              <ReviewRow label="Issuing Authority" value={formData.listCIssuingAuthority} />
              <ReviewRow label="Number" value={formData.listCDocNumber} />
              {formData.listCExpDate && <ReviewRow label="Expiration" value={formData.listCExpDate} />}
              <DocThumbnail fileKey={formData.listCFileKey} label={formData.listCDoc || "List C Document"} />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      {submitError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 px-4 rounded-lg bg-blue-600 text-white font-medium text-sm
          hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          "Submit I-9 Form"
        )}
      </button>
    </div>
  );
}
