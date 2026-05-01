import { useEffect, useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useShop } from '../context/useShop';
import { useAuth } from '../context/useAuth';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam oder Werbung' },
  { value: 'harassment', label: 'Beleidigung oder Hassrede' },
  { value: 'inappropriate', label: 'Unangemessene Inhalte' },
  { value: 'other', label: 'Sonstiges' },
];

const MAX_DETAILS_LENGTH = 500;

export const ReportModal = ({ isOpen, reviewId, onClose, onReported }) => {
  const { reportReview } = useShop();
  const { currentUser } = useAuth();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setSelectedReason('');
    setDetails('');
    setErrorMessage('');
    setIsSubmitting(false);

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !reviewId) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedReason) {
      setErrorMessage('Bitte wähle einen Meldegrund aus.');
      return;
    }

    if (!currentUser?.uid) {
      setErrorMessage('Du musst eingeloggt sein, um eine Meldung zu senden.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await reportReview(reviewId, currentUser.uid, selectedReason, details);
      onReported?.(reviewId);
      onClose?.();
    } catch (error) {
      console.error('Fehler beim Senden der Meldung:', error);
      setErrorMessage('Die Meldung konnte nicht gesendet werden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex w-full max-w-md flex-col rounded-t-[2rem] bg-realbg p-6 shadow-2xl animate-pop-in sm:rounded-squircle">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          aria-label="Schließen"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="mb-5 flex items-center gap-3 pr-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Flag size={18} strokeWidth={2.2} />
          </span>
          <div>
            <h2
              id="report-modal-title"
              className="text-lg font-bold text-slate-900"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Bewertung melden
            </h2>
            <p className="text-xs text-slate-500">
              Hilf uns, die Community sauber zu halten.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold text-slate-700">
              Was ist das Problem?
            </legend>
            {REPORT_REASONS.map((reason) => {
              const isActive = selectedReason === reason.value;
              return (
                <label
                  key={reason.value}
                  className={[
                    'flex cursor-pointer items-center gap-3 rounded-squircle border px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason.value}
                    checked={isActive}
                    onChange={() => setSelectedReason(reason.value)}
                    className="h-4 w-4 accent-red-500"
                  />
                  <span>{reason.label}</span>
                </label>
              );
            })}
          </fieldset>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-slate-700">
              Zusätzliche Details <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value.slice(0, MAX_DETAILS_LENGTH))}
              rows={3}
              placeholder="Beschreibe das Problem kurz..."
              className="w-full resize-none rounded-squircle border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <span className="self-end text-[11px] text-slate-400">
              {details.length}/{MAX_DETAILS_LENGTH}
            </span>
          </label>

          {errorMessage ? (
            <p className="rounded-squircle bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-squircle border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="flex-[1.2] rounded-squircle bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-red-200 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Wird gesendet...' : 'Melden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
