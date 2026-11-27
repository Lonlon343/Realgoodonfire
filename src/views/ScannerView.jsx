// FILE: src/views/ScannerView.jsx
import { useEffect, useRef, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CameraOff, Check, Lightbulb, ScanBarcode, XCircle } from 'lucide-react';
import { useShop } from '../context/useShop';

// WICHTIG: Nur Lebensmittel-Codes scannen!
const SCANNER_FORMATS = ['ean_13', 'ean_8'];

const SCANNER_COMPONENTS = {
  audio: false, // Kein "Beep" Sound
  onOff: true, // Zeigt einen An/Aus Button
  finder: true, // Zeigt den grünen Rahmen
};

const SCANNER_STYLES = {
  container: { width: '100%', height: '100%' },
  video: { objectFit: 'cover' },
};

// EAN-8, UPC-A (12), EAN-13 and GTIN-14
const BARCODE_PATTERN = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/;
const INVALID_BARCODE_MESSAGE = 'Bitte gib einen gültigen Barcode mit 8, 12, 13 oder 14 Ziffern ein.';

const isNetworkFailure = (error) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  return error instanceof TypeError
    && /fetch|network|load failed/i.test(error.message || '');
};

const getLookupErrorMessage = (error, code) => {
  if (isNetworkFailure(error)) {
    return 'Keine Verbindung. Prüfe deine Internetverbindung und versuche es erneut.';
  }

  if (typeof error?.message === 'string' && error.message.includes('nicht gefunden')) {
    return `Produkt ${code} wurde nicht gefunden.`;
  }

  return 'Produkt nicht gefunden oder keine Verbindung.';
};

const getCameraErrorMessage = (error) => {
  if (error?.name === 'NotAllowedError') {
    return 'Kein Zugriff auf die Kamera. Erlaube den Kamerazugriff in den Einstellungen oder gib den Barcode unten ein.';
  }

  return 'Die Kamera konnte nicht gestartet werden. Prüfe den Kamerazugriff in den Einstellungen oder gib den Barcode unten ein.';
};

export const ScannerView = ({ onTabChange }) => {
  const { fetchProductByBarcode, setCurrentProduct } = useShop();
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraError, setCameraError] = useState('');
  const lookupInFlightRef = useRef(false);
  const navigateTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
    }
  }, []);

  const lookupProduct = async (code, { clearManualInput = false } = {}) => {
    // Ignore further scans while a lookup is running or the redirect is pending.
    if (lookupInFlightRef.current) return;

    lookupInFlightRef.current = true;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const product = await fetchProductByBarcode(code);

      if (product) {
        setCurrentProduct(product);
        if (clearManualInput) setManualCode('');
        navigateTimeoutRef.current = setTimeout(() => onTabChange('rate'), 300);
        return;
      }

      setErrorMsg(getLookupErrorMessage(null, code));
    } catch (error) {
      setErrorMsg(getLookupErrorMessage(error, code));
    }

    lookupInFlightRef.current = false;
    setIsLoading(false);
  };

  const handleScan = (detectedCodes) => {
    if (!detectedCodes || detectedCodes.length === 0) return;

    const code = String(detectedCodes[0].rawValue || '').trim();
    if (!code) return;

    setCameraError('');
    lookupProduct(code);
  };

  const handleScannerError = (error) => {
    console.error('Kamerafehler:', error);
    setCameraError(getCameraErrorMessage(error));
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;

    if (!BARCODE_PATTERN.test(code)) {
      setErrorMsg(INVALID_BARCODE_MESSAGE);
      return;
    }

    lookupProduct(code, { clearManualInput: true });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <div className="px-4 py-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-center text-emerald-600 flex items-center justify-center gap-2"><ScanBarcode size={26} strokeWidth={2} /> Barcode Scanner</h2>
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

          {cameraError && !isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center" role="alert">
              <CameraOff size={36} strokeWidth={1.8} className="text-emerald-400" />
              <p className="text-sm font-medium leading-relaxed text-white">{cameraError}</p>
            </div>
          )}

          <Scanner
            onScan={handleScan}
            formats={SCANNER_FORMATS}
            components={SCANNER_COMPONENTS}
            onError={handleScannerError}
            paused={isLoading}
            styles={SCANNER_STYLES}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-6 space-y-4 border-t border-slate-200">
        {/* Error Message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center text-sm font-medium" role="alert">
            <XCircle size={16} className="inline-block mr-1 align-text-bottom" /> {errorMsg}
          </div>
        )}

        {/* Manual Input */}
        <form onSubmit={handleManualSubmit} className="space-y-3" noValidate>
          <label htmlFor="manual-barcode" className="block text-center text-slate-500 text-xs uppercase tracking-wider font-bold">Oder manuell eingeben</label>
          <div className="flex gap-2">
            <input
              id="manual-barcode"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Barcode eingeben (z. B. 4008400401829)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 min-w-0 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !manualCode.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold py-3 px-5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isLoading ? '…' : 'Suchen'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1"><Lightbulb size={14} className="text-amber-500" /> Tipps:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-1"><Check size={12} className="text-emerald-500 flex-shrink-0" /> Gute Beleuchtung ist wichtig</li>
            <li className="flex items-center gap-1"><Check size={12} className="text-emerald-500 flex-shrink-0" /> Barcode sollte deutlich zu sehen sein</li>
            <li className="flex items-center gap-1"><Check size={12} className="text-emerald-500 flex-shrink-0" /> Scanner funktioniert mit EAN-13 & EAN-8</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
