import { useEffect, useState } from 'react';
import { Flame, Loader2, ScanBarcode, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { DatenschutzModal } from '../components/DatenschutzModal';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../context/useAuth';
import { useShop } from '../context/useShop';

export const ProfileView = () => {
  const { currentUser, setIsLoginModalOpen, clearAuthError } = useAuth();
  const { getUserReviews } = useShop();

  const [userReviews, setUserReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDatenschutzOpen, setIsDatenschutzOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUserReviews([]);
      return;
    }

    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const reviews = await getUserReviews(currentUser.uid);
        if (isActive) setUserReviews(reviews);
      } catch (error) {
        console.error('Fehler beim Laden der Profil-Reviews:', error);
        if (isActive) setUserReviews([]);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();

    return () => { isActive = false; };
  }, [currentUser?.uid, getUserReviews]);

  const reviewCount = userReviews.length;
  const hypeCount = userReviews.filter((r) => r.rating >= 4).length;
  const recentReviews = userReviews.slice(0, 3);

  const handleDelete = () => {
    window.alert('Konto-Löschung ist aktuell noch nicht verfügbar. Bitte kontaktiere uns direkt.');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-realbg px-5 py-10 pb-32 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-squircle bg-white p-8 text-center shadow-xl border border-slate-100">
          <span className="text-5xl block mb-4">🍔</span>
          <h1 className="text-2xl font-black text-realgreen tracking-tight mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            RealGood
          </h1>
          <p className="text-slate-700 font-semibold mb-2">Logge dich ein, um dein Foodie-Profil zu sehen</p>
          <p className="text-sm text-slate-400 mb-6">Speichere Bewertungen, verfolge deine Hypes und baue deine Foodie-History auf.</p>
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              setIsLoginModalOpen(true);
            }}
            className="w-full rounded-squircle bg-realgreen px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.01]"
          >
            Einloggen oder registrieren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-realbg px-5 pt-8 pb-32">
      <div className="mx-auto max-w-md">

        {/* Avatar + Name */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="mx-auto mb-4 h-28 w-28 overflow-hidden rounded-squircle border border-emerald-100 bg-white p-1 shadow-xl shadow-emerald-100/30">
            <img
              src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'User')}&background=10B981&color=fff`}
              alt={currentUser.displayName || 'Profilbild'}
              className="h-full w-full rounded-[1.2rem] object-cover"
            />
          </div>
          <h1 className="text-3xl font-black text-realgreen tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {currentUser.displayName || 'Foodie User'}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Foodie Member</p>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="flex justify-center py-10 mb-8">
            <Loader2 size={28} className="animate-spin text-realgreen" />
          </div>
        ) : (
          <div className="grid grid-cols-2 auto-rows-[118px] gap-4 mb-8 animate-slide-up-delay-1">
            {/* Large tile — review count */}
            <div className="row-span-2 rounded-squircle bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Meine Bewertungen</span>
                <Star size={18} className="text-realorange" />
              </div>
              <div>
                <p className="text-4xl font-black text-slate-900 tracking-tight">{reviewCount}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {reviewCount === 0
                    ? 'Noch nichts bewertet – starte jetzt!'
                    : 'Dein letzter Eindruck bleibt hier nicht verborgen.'}
                </p>
              </div>
            </div>

            {/* Hypes tile */}
            <div className="rounded-squircle bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Hypes</span>
                <Flame size={18} className="text-realorange" />
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{hypeCount}</p>
            </div>

            {/* Scans tile — equals review count since each review = 1 scan */}
            <div className="rounded-squircle bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Scans</span>
                <ScanBarcode size={18} className="text-realgreen" />
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{reviewCount}</p>
            </div>
          </div>
        )}

        {/* Recent reviews */}
        <section className="animate-slide-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Zuletzt bewertet
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">History</span>
          </div>

          {isLoading ? null : recentReviews.length === 0 ? (
            <div className="rounded-squircle border border-slate-200/70 bg-white px-5 py-8 text-center text-sm text-slate-400 shadow-sm">
              Noch keine Bewertungen. Scanne dein erstes Produkt! 🛒
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-squircle bg-white px-4 py-4 shadow-sm border border-slate-100 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{review.productName}</p>
                    <p className="mt-1 text-xs text-slate-400">{review.store || '—'}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StarRating rating={review.rating} size={14} strokeWidth={1.8} activeClass="fill-realorange text-realorange" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer actions */}
        <section className="mt-8 border-t border-slate-200 pt-5 animate-slide-up-delay-3">
          <button
            type="button"
            onClick={() => setIsDatenschutzOpen(true)}
            className="w-full flex items-center gap-3 rounded-squircle px-4 py-3 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ShieldCheck size={16} className="text-slate-400" />
            <span>Datenschutz &amp; Impressum</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="mt-2 w-full flex items-center gap-3 rounded-squircle px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={16} className="text-red-500" />
            <span>Konto löschen</span>
          </button>
        </section>

      </div>

      <DatenschutzModal
        isOpen={isDatenschutzOpen}
        onClose={() => setIsDatenschutzOpen(false)}
      />
    </div>
  );
};
