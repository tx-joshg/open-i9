"use client";

import { useState, useRef } from "react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_MB = 10;

interface FileUploadProps {
  label: string;
  fileKey: string;
  onChange: (fileKey: string) => void;
  error?: string;
  className?: string;
}

export default function FileUpload({
  label,
  fileKey,
  onChange,
  error,
  className = "",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<{ url: string; type: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("File must be JPEG, PNG, WebP, or PDF");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    setUploadError("");
    setUploading(true);

    // Generate local preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview({ url, type: "image" });
    } else {
      setPreview({ url: "", type: "pdf" });
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error || "Upload failed");
      }

      const data: { fileKey: string } = await res.json();
      onChange(data.fileKey);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange("");
    setPreview(null);
    setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const displayError = error || uploadError;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {/* Upload area */}
      {!fileKey && !uploading && (
        <>
          <label
            className={`
              flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer
              transition-colors hover:bg-gray-50
              ${displayError ? "border-red-400 bg-red-50" : "border-gray-300"}
            `}
          >
            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
            </svg>
            <span className="text-sm text-gray-500">Click to upload or drag and drop</span>
            <span className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, or PDF (max {MAX_SIZE_MB}MB)</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          <p className="mt-2 text-xs text-gray-400 flex items-start gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400 mt-px shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
              This upload is used solely for your employer to verify your identity and employment
              authorization. It will be permanently deleted after review and will not be stored
              or accessible to anyone afterward.
            </span>
          </p>
        </>
      )}

      {/* Uploading state */}
      {uploading && (
        <div className="flex items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-sm text-blue-600">Uploading...</span>
          </div>
        </div>
      )}

      {/* Preview */}
      {fileKey && !uploading && (
        <div className="relative flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          {preview?.type === "image" ? (
            <img src={preview.url} alt="Document preview" className="w-16 h-16 object-cover rounded" />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center rounded bg-red-100">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">Document uploaded</p>
            <p className="text-xs text-gray-400 truncate">{fileKey}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Remove file"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {displayError && <p className="mt-1 text-sm text-red-600">{displayError}</p>}
    </div>
  );
}
