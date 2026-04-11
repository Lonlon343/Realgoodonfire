

const getDisplayScore = (score) => {
  const normalizedScore = Number.isFinite(score) ? score : 0;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
};

export const DupeSuccessModal = ({
  isOpen,
  initialMatchScore = 0,
  onViewFeed,
}) => {
  if (!isOpen) {
    return null;
  }

  const displayScore = getDisplayScore(initialMatchScore);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

      <div className="relative z-10 w-full max-w-md rounded-squircle bg-white p-6 shadow-2xl animate-pop-in">
        <div className="mb-6 text-center">
          <span className="mb-3 block text-5xl">🎉</span>
          <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Dupe eingereicht!
          </h2>
        </div>

        <div className="mb-6 rounded-squircle border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">System-Startwert</span>
            <span className="text-sm font-bold text-emerald-700">{displayScore}%</span>
          </div>

          <div
            className="h-3 overflow-hidden rounded-full bg-emerald-100"
            role="progressbar"
            aria-valuenow={displayScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Initialer Match-Score"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-orange-400 transition-all duration-700 ease-out"
              style={{ width: `${displayScore}%` }}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Dein System-Startwert liegt bei <span className="font-semibold text-slate-700">{displayScore}%</span> (berechnet aus der Preisersparnis).
          </p>
        </div>

        <div className="mb-6 rounded-squircle bg-slate-100 px-4 py-4 text-sm leading-relaxed text-slate-600">
          <span className="mb-1 block font-semibold text-slate-800">Was passiert jetzt?</span>
          Dein Vorschlag ist jetzt im Community-Feed. Wenn andere Foodies zustimmen (👍) und dein Dupe 85% erreicht, wird er offiziell auf der Startseite im 'Dupe Alarm' gefeatured!
        </div>

        <button
          type="button"
          onClick={onViewFeed}
          className="w-full rounded-squircle bg-realgreen px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:brightness-105"
        >
          Zum Feed & Daumen drücken
        </button>
      </div>
    </div>
  );
};