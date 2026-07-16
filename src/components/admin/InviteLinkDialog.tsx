"use client";

import { useEffect, useRef, useState } from "react";

interface InviteLinkDialogProps {
  // The dialog is open whenever there is a URL to show.
  inviteUrl: string | null;
  title: string;
  onClose: () => void;
}

/**
 * Modal that presents a freshly created invite link with a copy button —
 * replaces the old `alert("Renewal invite created!\n\n" + url)`, from which
 * the URL couldn't even be copied.
 */
export default function InviteLinkDialog({
  inviteUrl,
  title,
  onClose,
}: InviteLinkDialogProps) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = inviteUrl !== null;

  // Close on Escape so keyboard users aren't trapped.
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // Clipboard API unavailable (e.g. non-secure context): select the
      // visible URL so the admin can copy it manually.
      inputRef.current?.select();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-link-dialog-title"
    >
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
        <h3
          id="invite-link-dialog-title"
          className="text-lg font-semibold text-gray-900 mb-2"
        >
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Share this link with the employee so they can complete their I-9.
        </p>
        <div className="flex items-center gap-2 mb-6">
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-gray-50"
          />
          <button
            type="button"
            onClick={handleCopy}
            autoFocus
            className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
