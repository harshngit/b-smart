import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

// Shared in-app replacement for window.confirm() across My Store — no native
// browser dialogs, consistent styling with the rest of the app.
export default function ConfirmDialog({ open, onClose, title, description, confirmLabel = 'Remove', confirmClass = 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20', onConfirm, loading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
          {description && <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>}
        </div>
        <div className="flex border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-r border-gray-100 dark:border-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 ${confirmClass}`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
