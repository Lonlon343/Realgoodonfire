import { useState } from 'react';
import { DatenschutzModal } from '../components/DatenschutzModal';

export const DesktopLandingView = () => {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-b from-white via-emerald-50 to-emerald-100 text-slate-900 flex flex-col">

      <div className="flex-1 w-full max-w-7xl mx-auto px-12 grid grid-cols-2 gap-16 items-center">

        <div className="flex flex-col justify-center">
          <h1 className="text-6xl font-bold leading-[1.05] tracking-tight">
            Finde die besten<br />
            <span className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 bg-clip-text text-transparent">
              Supermarkt-Alternativen.
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-md">
            Scanne, bewerte und entdecke ehrliche Produkt-Empfehlungen aus der Community — direkt im Regal.
          </p>

          <div className="mt-10 flex items-center gap-6">

            <div className="flex items-center gap-4">
              <div className="w-28 h-28 bg-white rounded-xl shadow-lg ring-1 ring-emerald-100 p-2">
                <img
                  src="/Realgood%20AppQR.png"
                  alt="QR-Code zur realgood App"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm text-slate-500 max-w-[140px] leading-snug">
                Oder scanne den Code mit dem Handy.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="relative w-[280px] h-[580px] border-[10px] border-gray-800 rounded-[2.5rem] shadow-2xl bg-black">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rounded-full z-20" />

            <video
              autoPlay
              loop
              muted
              playsInline
              src="/demo-video.mp4"
              className="w-full h-full object-cover rounded-[1.8rem]"
            />
          </div>
        </div>

      </div>

      <footer className="w-full py-4 px-12 flex items-center justify-between text-xs text-slate-500 border-t border-emerald-100">
        <span>© {new Date().getFullYear()} realgood</span>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="hover:text-emerald-600 transition"
          >
            Impressum
          </button>
          <button
            type="button"
            onClick={() => setLegalOpen(true)}
            className="hover:text-emerald-600 transition"
          >
            Datenschutz
          </button>
        </div>
      </footer>

      <DatenschutzModal isOpen={legalOpen} onClose={() => setLegalOpen(false)} />
    </div>
  );
};
