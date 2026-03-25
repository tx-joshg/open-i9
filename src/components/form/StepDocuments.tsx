"use client";

import type { I9FormData, DocChoice } from "@/types/i9";
import { LIST_A_DOCS, LIST_B_DOCS, LIST_C_DOCS } from "@/types/i9";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FileUpload from "@/components/ui/FileUpload";

interface StepDocumentsProps {
  formData: I9FormData;
  updateField: <K extends keyof I9FormData>(field: K, value: I9FormData[K]) => void;
  errors: Record<string, string>;
}

const listAOptions = LIST_A_DOCS.map((d) => ({ value: d, label: d }));
const listBOptions = LIST_B_DOCS.map((d) => ({ value: d, label: d }));
const listCOptions = LIST_C_DOCS.map((d) => ({ value: d, label: d }));

export default function StepDocuments({ formData, updateField, errors }: StepDocumentsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Document Verification</h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload documents to verify your identity and employment authorization. You may present
          either one document from List A, or one document from List B and one from List C.
        </p>
      </div>

      {/* Document choice */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Choose document option<span className="text-red-500 ml-0.5">*</span>
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* List A option */}
          <label
            className={`
              flex flex-col p-4 rounded-lg border cursor-pointer transition-colors
              ${formData.docChoice === "listA"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="docChoice"
                value="listA"
                checked={formData.docChoice === "listA"}
                onChange={() => updateField("docChoice", "listA" as DocChoice)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">List A</span>
                <p className="text-xs text-gray-500">One document that proves both identity and employment authorization</p>
              </div>
            </div>
            <div className="mt-3 ml-7">
              <p className="text-xs font-medium text-gray-600 mb-1">Acceptable documents:</p>
              <ul className="text-xs text-gray-500 space-y-0.5">
                {LIST_A_DOCS.map((doc) => (
                  <li key={doc} className="flex items-start gap-1">
                    <span className="text-gray-400 mt-px shrink-0">&bull;</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </label>

          {/* List B + C option */}
          <label
            className={`
              flex flex-col p-4 rounded-lg border cursor-pointer transition-colors
              ${formData.docChoice === "listBC"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="docChoice"
                value="listBC"
                checked={formData.docChoice === "listBC"}
                onChange={() => updateField("docChoice", "listBC" as DocChoice)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">List B + List C</span>
                <p className="text-xs text-gray-500">One document for identity (B) and one for employment authorization (C)</p>
              </div>
            </div>
            <div className="mt-3 ml-7 grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">List B — Identity:</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  {LIST_B_DOCS.map((doc) => (
                    <li key={doc} className="flex items-start gap-1">
                      <span className="text-gray-400 mt-px shrink-0">&bull;</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">List C — Employment Authorization:</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  {LIST_C_DOCS.map((doc) => (
                    <li key={doc} className="flex items-start gap-1">
                      <span className="text-gray-400 mt-px shrink-0">&bull;</span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </label>
        </div>
        {errors.docChoice && <p className="mt-1 text-sm text-red-600">{errors.docChoice}</p>}
      </fieldset>

      {/* List A */}
      {formData.docChoice === "listA" && (
        <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-800">List A Document</h3>
          <Select
            label="Document Type"
            name="listADoc"
            value={formData.listADoc}
            onChange={(v) => updateField("listADoc", v)}
            options={listAOptions}
            error={errors.listADoc}
            required
          />
          <Input
            label="Issuing Authority"
            name="listAIssuingAuthority"
            value={formData.listAIssuingAuthority}
            onChange={(v) => updateField("listAIssuingAuthority", v)}
            placeholder="e.g. U.S. Department of State"
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Document Number"
              name="listADocNumber"
              value={formData.listADocNumber}
              onChange={(v) => updateField("listADocNumber", v)}
              error={errors.listADocNumber}
              required
            />
            <Input
              label="Expiration Date"
              name="listAExpDate"
              type="date"
              value={formData.listAExpDate}
              onChange={(v) => updateField("listAExpDate", v)}
            />
          </div>
          <FileUpload
            label="Upload Document"
            fileKey={formData.listAFileKey}
            onChange={(v) => updateField("listAFileKey", v)}
            error={errors.listAFileKey}
          />
        </div>
      )}

      {/* List B + C */}
      {formData.docChoice === "listBC" && (
        <div className="space-y-6">
          {/* List B */}
          <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800">List B Document (Identity)</h3>
            <Select
              label="Document Type"
              name="listBDoc"
              value={formData.listBDoc}
              onChange={(v) => updateField("listBDoc", v)}
              options={listBOptions}
              error={errors.listBDoc}
              required
            />
            <Input
              label="Issuing Authority"
              name="listBIssuingAuthority"
              value={formData.listBIssuingAuthority}
              onChange={(v) => updateField("listBIssuingAuthority", v)}
              placeholder="e.g. State of Texas"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Document Number"
                name="listBDocNumber"
                value={formData.listBDocNumber}
                onChange={(v) => updateField("listBDocNumber", v)}
                error={errors.listBDocNumber}
                required
              />
              <Input
                label="Expiration Date"
                name="listBExpDate"
                type="date"
                value={formData.listBExpDate}
                onChange={(v) => updateField("listBExpDate", v)}
              />
            </div>
            <FileUpload
              label="Upload Document"
              fileKey={formData.listBFileKey}
              onChange={(v) => updateField("listBFileKey", v)}
              error={errors.listBFileKey}
            />
          </div>

          {/* List C */}
          <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800">List C Document (Employment Authorization)</h3>
            <Select
              label="Document Type"
              name="listCDoc"
              value={formData.listCDoc}
              onChange={(v) => updateField("listCDoc", v)}
              options={listCOptions}
              error={errors.listCDoc}
              required
            />
            <Input
              label="Issuing Authority"
              name="listCIssuingAuthority"
              value={formData.listCIssuingAuthority}
              onChange={(v) => updateField("listCIssuingAuthority", v)}
              placeholder="e.g. Social Security Administration"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Document Number"
                name="listCDocNumber"
                value={formData.listCDocNumber}
                onChange={(v) => updateField("listCDocNumber", v)}
                error={errors.listCDocNumber}
                required
              />
              <Input
                label="Expiration Date"
                name="listCExpDate"
                type="date"
                value={formData.listCExpDate}
                onChange={(v) => updateField("listCExpDate", v)}
              />
            </div>
            <FileUpload
              label="Upload Document"
              fileKey={formData.listCFileKey}
              onChange={(v) => updateField("listCFileKey", v)}
              error={errors.listCFileKey}
            />
          </div>
        </div>
      )}
    </div>
  );
}
