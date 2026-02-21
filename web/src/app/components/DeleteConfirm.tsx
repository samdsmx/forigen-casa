"use client";

import { ReactNode } from "react";

interface DeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  loading?: boolean;
  blocked?: boolean;
}

export default function DeleteConfirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
  blocked = false,
}: DeleteConfirmProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn btn-secondary btn-md"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          {!blocked && (
            <button
              type="button"
              className="btn btn-danger btn-md"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
