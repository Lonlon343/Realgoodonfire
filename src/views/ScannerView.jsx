// FILE: src/views/ScannerView.jsx
import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useShop } from '../context/useShop';

export const ScannerView = ({ onTabChange }) => {
  const { fetchProductByBarcode, setCurrentProduct } = useShop();
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (detectedCodes) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;

      setIsLoading(true);
      setErrorMsg('');

      try {
        const product = await fetchProductByBarcode(code);
        setIsLoading(false);

        if (product) {
          setCurrentProduct(product);
          setTimeout(() => onTabChange('rate'), 300);
        }
      } catch {
        setErrorMsg(`Produkt ${code} nicht gefunden.`);
        setIsLoading(false);
      }
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const product = await fetchProductByBarcode(manualCode);
      setIsLoading(false);

      if (product) {
        setCurrentProduct(product);
        setManualCode('');
        setTimeout(() => onTabChange('rate'), 300);
      }
    } catch {
      setErrorMsg('Produkt nicht gefunden. Versuche es erneut.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <div className="px-4 py-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-center text-emerald-600">📷 Barcode Scanner</h2>
        <p className="text-center text-slate-500 text-sm mt-2">Halte einen Barcode vor die Kamera</p>
      </div>

      {/* Scanner View */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="relative rounded-2xl overflow-hidden border-4 border-emerald-500/50 shadow-2xl w-full max-w-sm aspect-square bg-black">
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
            </div>
          )}
          
          <Scanner
            onScan={handleScan}
            formats={['ean_13', 'ean_8']} // WICHTIG: Nur Lebensmittel-Codes scannen!
            components={{
              audio: false, // Kein "Beep" Sound
              onOff: true, // Zeigt einen An/Aus Button
              finder: true // Zeigt den grünen Rahmen
            }}
            onError={() => {}} // Fehler leise ignorieren
            styles={{
              container: { width: '100%', height: '100%' },
              video: { objectFit: 'cover' }
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-6 space-y-4 border-t border-slate-200">
        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center text-sm font-medium">
            ❌ {errorMsg}
          </div>
        )}

        {/* Manual Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <p className="text-center text-slate-500 text-xs uppercase tracking-wider font-bold">Oder manuell eingeben</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Barcode eingeben (z.B. 4008400401829)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !manualCode.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Go'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">💡 Tipps:</p>
          <ul className="space-y-1">
            <li>✓ Gute Beleuchtung ist wichtig</li>
            <li>✓ Barcode sollte deutlich zu sehen sein</li>
            <li>✓ Scanner funktioniert mit EAN-13 & EAN-8</li>
            <li>✓ Manuelle Eingabe als Fallback</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
