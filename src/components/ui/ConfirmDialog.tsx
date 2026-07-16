"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  confirmTone: "indigo" | "red";
  // Hide the Cancel button for single-action notices (e.g. session expiry)
  // where dismissing and confirming mean the same thing.
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmTone,
  showCancel = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape so keyboard users aren't trapped.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClasses =
    confirmTone === "red"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-gray-900/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
        <h3
          id="confirm-dialog-title"
          className="text-lg font-semibold text-gray-900 mb-2"
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 space-y-2 mb-6">{message}</div>
        <div className="flex justify-end gap-2">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
