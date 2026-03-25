"use client";

import type { I9FormData, CitizenshipStatus } from "@/types/i9";
import Input from "@/components/ui/Input";
import SignaturePad from "@/components/ui/SignaturePad";

interface StepEligibilityProps {
  formData: I9FormData;
  updateField: <K extends keyof I9FormData>(field: K, value: I9FormData[K]) => void;
  errors: Record<string, string>;
}

const STATUS_OPTIONS: { value: CitizenshipStatus; label: string; description: string }[] = [
  {
    value: "usCitizen",
    label: "A citizen of the United States",
    description: "",
  },
  {
    value: "usnational",
    label: "A noncitizen national of the United States",
    description: "",
  },
  {
    value: "lpr",
    label: "A lawful permanent resident",
    description: "Provide your Alien Registration Number (A-Number)",
  },
  {
    value: "authorized",
    label: "An alien authorized to work",
    description: "Provide work authorization details below",
  },
];

export default function StepEligibility({ formData, updateField, errors }: StepEligibilityProps) {
  const today = new Date().toISOString().split("T")[0];

  // Auto-set signature date to today if not already set
  if (!formData.signatureDate) {
    updateField("signatureDate", today);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Section 1: Citizenship / Immigration Status</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select your current citizenship or immigration status and provide any required documentation numbers.
        </p>
      </div>

      {/* Status radios */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          I attest, under penalty of perjury, that I am:
          <span className="text-red-500 ml-0.5">*</span>
        </legend>
        <div className="space-y-3">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${formData.citizenshipStatus === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
                }
              `}
            >
              <input
                type="radio"
                name="citizenshipStatus"
                value={opt.value}
                checked={formData.citizenshipStatus === opt.value}
                onChange={() => updateField("citizenshipStatus", opt.value)}
                className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                {opt.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        {errors.citizenshipStatus && (
          <p className="mt-1 text-sm text-red-600">{errors.citizenshipStatus}</p>
        )}
      </fieldset>

      {/* LPR fields */}
      {formData.citizenshipStatus === "lpr" && (
        <div className="pl-4 border-l-2 border-blue-300 space-y-4">
          <Input
            label="Alien Registration Number (A-Number)"
            name="alienRegNumber"
            value={formData.alienRegNumber}
            onChange={(v) => updateField("alienRegNumber", v)}
            error={errors.alienRegNumber}
            placeholder="A-XXXXXXXXX"
            required
          />
        </div>
      )}

      {/* Authorized alien fields */}
      {formData.citizenshipStatus === "authorized" && (
        <div className="pl-4 border-l-2 border-blue-300 space-y-4">
          <Input
            label="Work Authorization Expiration Date"
            name="authExpDate"
            type="date"
            value={formData.authExpDate}
            onChange={(v) => updateField("authExpDate", v)}
            error={errors.authExpDate}
            required
          />
          <p className="text-sm text-gray-500">
            Provide at least one of the following identifiers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Alien Registration Number (A-Number)"
              name="alienRegNumber"
              value={formData.alienRegNumber}
              onChange={(v) => updateField("alienRegNumber", v)}
              error={errors.alienRegNumber}
              placeholder="A-XXXXXXXXX"
            />
            <Input
              label="I-94 Admission Number"
              name="i94Number"
              value={formData.i94Number}
              onChange={(v) => updateField("i94Number", v)}
              error={errors.i94Number}
              placeholder="xxxxxxxxxxx"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Foreign Passport Number"
              name="foreignPassportNumber"
              value={formData.foreignPassportNumber}
              onChange={(v) => updateField("foreignPassportNumber", v)}
              error={errors.foreignPassportNumber}
            />
            <Input
              label="Country of Issuance"
              name="passportCountry"
              value={formData.passportCountry}
              onChange={(v) => updateField("passportCountry", v)}
            />
          </div>
        </div>
      )}

      {/* Attestation */}
      <div className="border-t pt-6 space-y-4">
        <label
          className={`
            flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors
            ${formData.attestationChecked
              ? "border-green-500 bg-green-50"
              : errors.attestationChecked
                ? "border-red-400 bg-red-50"
                : "border-gray-200 hover:bg-gray-50"
            }
          `}
        >
          <input
            type="checkbox"
            checked={formData.attestationChecked}
            onChange={(e) => updateField("attestationChecked", e.target.checked)}
            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I attest, under penalty of perjury, that I am (check one of the above), that I have
            examined the document(s) presented, and that to the best of my knowledge, I am
            authorized to work in the United States.
            <span className="text-red-500 ml-0.5">*</span>
          </span>
        </label>
        {errors.attestationChecked && (
          <p className="text-sm text-red-600">{errors.attestationChecked}</p>
        )}

        <SignaturePad
          value={formData.signatureDataUrl}
          onChange={(v) => updateField("signatureDataUrl", v)}
          error={errors.signatureDataUrl}
        />

        <Input
          label="Signature Date"
          name="signatureDate"
          type="date"
          value={formData.signatureDate || today}
          onChange={(v) => updateField("signatureDate", v)}
        />
      </div>
    </div>
  );
}
