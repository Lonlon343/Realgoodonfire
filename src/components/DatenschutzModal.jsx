import { ArrowLeft } from 'lucide-react';

export const DatenschutzModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-realbg overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-realbg/90 backdrop-blur-md border-b border-slate-200/60 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-realgreen font-semibold text-sm"
        >
          <ArrowLeft size={18} />
          Zurück
        </button>
        <h1 className="mt-3 text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Datenschutz &amp; Impressum
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 py-6 pb-24 max-w-2xl mx-auto space-y-8">

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">1. Verantwortlicher für die Datenverarbeitung</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed space-y-0.5">
            <p className="font-semibold text-slate-800">Leon Hartling</p>
            <p>Hahnweg 62</p>
            <p>96450 Coburg</p>
            <p className="mt-2">
              E-Mail:{' '}
              <a
                href="mailto:leonhartling96@googlemail.com"
                className="text-realgreen font-medium underline underline-offset-2"
              >
                leonhartling96@googlemail.com
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">2. Hosting der App (Vercel)</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed">
            Unsere App wird bei dem Anbieter Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA) gehostet. Wenn du unsere App aufrufst, werden technisch bedingt Verbindungsdaten (wie deine IP-Adresse, Datum und Uhrzeit der Anfrage) an die Server von Vercel übertragen, um die App auf deinem Gerät auszuliefern. Vercel ist Teilnehmer des EU-US Data Privacy Frameworks, wodurch ein angemessenes Datenschutzniveau garantiert wird. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und schnellen Bereitstellung der App).
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">3. Registrierung und Login (Firebase Authentication)</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Damit du Bewertungen schreiben oder &ldquo;Dupes&rdquo; vorschlagen kannst, musst du dir ein Konto erstellen. Hierfür nutzen wir den Dienst &ldquo;Firebase Authentication&rdquo; der Google Ireland Limited (Gordon House, Barrow Street, Dublin 4, Irland).
            </p>
            <p>
              Wir erfassen dabei deine E-Mail-Adresse, ein von dir gewähltes Passwort und (falls du den Google-Login nutzt) deinen öffentlichen Profilnamen sowie dein Profilbild. Diese Daten werden ausschließlich zur Verwaltung deines Accounts und zur Sicherstellung der Funktionalität genutzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
            <p>
              <span className="font-semibold text-slate-700">Hinweis zu Cookies/Local Storage:</span> Firebase speichert einen technisch notwendigen Session-Token im lokalen Speicher (Local Storage) deines Geräts, damit du nicht bei jedem App-Start neu eingeloggt werden musst. Es handelt sich hierbei um technisch zwingend erforderliche Daten, für die keine gesonderte Cookie-Einwilligung erforderlich ist.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">4. Nutzergenerierte Inhalte (Firestore Database)</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed">
            Wenn du Produkte scannst, Bewertungen schreibst oder neue Alternativen (&ldquo;Dupes&rdquo;) vorschlägst, speichern wir diese Informationen in unserer Datenbank. Auch hierfür nutzen wir Google Firebase (Firestore). Diese Daten werden mit deiner eindeutigen Nutzer-ID verknüpft, damit du deine eigenen Beiträge (gemäß unserer Security Rules) bearbeiten oder löschen kannst. Dein gewählter Benutzername sowie deine Bewertungen sind für andere Nutzer der App öffentlich sichtbar. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzung der Community-Funktionen).
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">5. Datentransfer in Drittländer</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed">
            Wir haben Google (Firebase) so konfiguriert, dass unsere Datenbanken im europäischen Raum gehostet werden. Da die Muttergesellschaft von Google jedoch ihren Sitz in den USA hat, kann ein Datentransfer in die USA nicht gänzlich ausgeschlossen werden. Google Ireland Limited stützt sich hierbei auf die EU-Standardvertragsklauseln sowie das EU-US Data Privacy Framework. Wir haben mit Google einen Vertrag zur Auftragsverarbeitung (AVV) abgeschlossen.
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">6. Kamera-Zugriff (Barcode-Scanner)</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed">
            Um Produkte scannen zu können, benötigt die App Zugriff auf die Kamera deines Geräts. Dieser Zugriff erfolgt nur, nachdem du ihm ausdrücklich zugestimmt hast. Die Kamerafunktion (das Entschlüsseln des Barcodes) wird direkt auf deinem Gerät ausgeführt. Es werden keine Bilder oder Videos aufgenommen, gespeichert oder an unsere Server übertragen. Es wird lediglich die erkannte Ziffernfolge (Barcode) verarbeitet, um das Produkt in unserer Datenbank zu suchen.
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">7. Deine Rechte</h2>
          <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed">
            Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Wenn du deinen Account und alle damit verbundenen Daten (Bewertungen etc.) löschen möchtest, kannst du dies jederzeit über eine E-Mail an uns beantragen. RealGood übernimmt keine Haftung für die Richtigkeit der Zutaten oder Allergiehinweise. Bitte überprüfe vor dem Verzehr immer die offizielle Verpackung.
          </div>
        </section>

      </div>
    </div>
  );
};
