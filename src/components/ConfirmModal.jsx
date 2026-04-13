import { X } from 'lucide-react';

/**
 * A minimal, styled confirmation modal consistent with the rest of the UI.
 *
 * Props:
 *   isOpen       — whether the modal is visible
 *   title        — heading text
 *   message      — body text
 *   confirmLabel — text for the confirm button (default 'Bestätigen')
 *   cancelLabel  — text for the cancel button (default 'Abbrechen')
 *   danger       — if true, confirm button uses red styling
 *   onConfirm    — called when user confirms
 *   onCancel     — called when user cancels or closes
 */
export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative z-10 w-full max-w-sm rounded-squircle bg-realbg p-6 shadow-2xl animate-pop-in">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          aria-label="Schließen"
        >
          <X size={15} strokeWidth={2.5} />
        </button>

        <div className="mb-5 pr-8">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {title}
          </h2>
          {message && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{message}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-squircle border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'flex-[1.2] rounded-squircle px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105',
              danger
                ? 'bg-red-500 shadow-red-200'
                : 'bg-realgreen shadow-emerald-200',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
