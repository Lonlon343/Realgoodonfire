
import { Flame, ScanBarcode, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useShop } from '../context/useShop';

const FALLBACK_HISTORY = [
  { id: 'placeholder-1', productName: 'Pistazien-Kekse', store: 'Edeka', rating: 5 },
  { id: 'placeholder-2', productName: 'Berry Kombucha', store: 'Rewe', rating: 4 },
  { id: 'placeholder-3', productName: 'Nuss-Pli', store: 'Aldi', rating: 5 },
];

export const ProfileView = () => {
  const { currentUser, setIsLoginModalOpen, clearAuthError } = useAuth();
  const { reviews } = useShop();

  const userReviews = currentUser
    ? reviews.filter((review) => review.userId === currentUser.uid)
    : [];

  const recentReviews = userReviews.length > 0 ? userReviews.slice(0, 3) : FALLBACK_HISTORY;
  const reviewCount = userReviews.length || 12;
  const hypeCount = userReviews.length
    ? userReviews.filter((review) => review.rating >= 4).length
    : 38;
  const scanCount = userReviews.length ? userReviews.length * 3 : 24;

  const renderStars = (rating) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          strokeWidth={1.8}
          className={star <= rating ? 'fill-realorange text-realorange' : 'text-slate-200'}
        />
      ))}
    </div>
  );

  const handleDelete = () => {
    const confirmed = window.confirm('Bist du sicher? Alle deine Daten werden gelöscht.');
    if (confirmed) {
      console.log('Delete triggered');
    }
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

        <div className="grid grid-cols-2 auto-rows-[118px] gap-4 mb-8 animate-slide-up-delay-1">
          <div className="row-span-2 rounded-squircle bg-white p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Meine Bewertungen</span>
              <Star size={18} className="text-realorange" />
            </div>
            <div>
              <p className="text-4xl font-black text-slate-900 tracking-tight">{reviewCount}</p>
              <p className="mt-2 text-sm text-slate-400">Dein letzter Eindruck bleibt hier nicht verborgen.</p>
            </div>
          </div>

          <div className="rounded-squircle bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Hypes</span>
              <Flame size={18} className="text-realorange" />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{hypeCount}</p>
          </div>

          <div className="rounded-squircle bg-white p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">Scans</span>
              <ScanBarcode size={18} className="text-realgreen" />
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{scanCount}</p>
          </div>
        </div>

        <section className="animate-slide-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Zuletzt bewertet
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">History</span>
          </div>

          <div className="space-y-3">
            {recentReviews.map((review, index) => (
              <div key={review.id || `${review.productName}-${index}`} className="rounded-squircle bg-white px-4 py-4 shadow-sm border border-slate-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{review.productName}</p>
                  <p className="mt-1 text-xs text-slate-400">{review.store}</p>
                </div>
                <div className="flex-shrink-0">
                  {renderStars(review.rating)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-5 animate-slide-up-delay-3">
          <button
            type="button"
            onClick={() => console.log('Open Datenschutz & Impressum')}
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
    </div>
  );
};