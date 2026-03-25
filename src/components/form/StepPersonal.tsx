"use client";

import type { I9FormData } from "@/types/i9";
import { US_STATES } from "@/types/i9";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

interface StepPersonalProps {
  formData: I9FormData;
  updateField: <K extends keyof I9FormData>(field: K, value: I9FormData[K]) => void;
  errors: Record<string, string>;
  useEVerify?: boolean;
}

const stateOptions = US_STATES.map((s) => ({ value: s, label: s }));

export default function StepPersonal({ formData, updateField, errors, useEVerify = false }: StepPersonalProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Section 1: Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1">
          Provide your legal name and contact information as they appear on your identification documents.
        </p>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          label="Last Name (Family Name)"
          name="lastName"
          value={formData.lastName}
          onChange={(v) => updateField("lastName", v)}
          error={errors.lastName}
          required
        />
        <Input
          label="First Name (Given Name)"
          name="firstName"
          value={formData.firstName}
          onChange={(v) => updateField("firstName", v)}
          error={errors.firstName}
          required
        />
        <Input
          label="Middle Initial"
          name="middleInitial"
          value={formData.middleInitial}
          onChange={(v) => updateField("middleInitial", v)}
          maxLength={1}
        />
        <Input
          label="Other Last Names Used"
          name="otherLastNames"
          value={formData.otherLastNames}
          onChange={(v) => updateField("otherLastNames", v)}
          placeholder="N/A if none"
        />
      </div>

      {/* Address row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Street Address"
          name="address"
          value={formData.address}
          onChange={(v) => updateField("address", v)}
          error={errors.address}
          required
        />
        <Input
          label="Apt/Suite/Unit"
          name="aptUnit"
          value={formData.aptUnit}
          onChange={(v) => updateField("aptUnit", v)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="City"
          name="city"
          value={formData.city}
          onChange={(v) => updateField("city", v)}
          error={errors.city}
          required
        />
        <Select
          label="State"
          name="state"
          value={formData.state}
          onChange={(v) => updateField("state", v)}
          options={stateOptions}
          error={errors.state}
          required
        />
        <Input
          label="ZIP Code"
          name="zip"
          value={formData.zip}
          onChange={(v) => updateField("zip", v)}
          placeholder="12345 or 12345-6789"
          error={errors.zip}
          required
        />
      </div>

      {/* DOB, SSN row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Date of Birth"
          name="dob"
          type="date"
          value={formData.dob}
          onChange={(v) => updateField("dob", v)}
          error={errors.dob}
          required
        />
        <div>
          <Input
            label={useEVerify ? "Social Security Number" : "Social Security Number (voluntary)"}
            name="ssn"
            value={formData.ssn}
            onChange={(v) => updateField("ssn", v)}
            placeholder="XXX-XX-XXXX"
            maxLength={11}
            error={errors.ssn}
            required={useEVerify}
          />
          {!useEVerify && (
            <p className="mt-1 text-xs text-gray-400">
              Providing your SSN is voluntary unless your employer participates in E-Verify.
            </p>
          )}
        </div>
      </div>

      {/* Contact row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
          required
        />
        <Input
          label="Phone Number (optional)"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(v) => updateField("phone", v)}
          placeholder="(555) 123-4567"
        />
      </div>
    </div>
  );
}
