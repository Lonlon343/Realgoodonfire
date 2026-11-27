import { ArrowLeft } from 'lucide-react';

// Single place for the legally responsible party. Change it here only.
const CONTACT = {
  name: 'Leon Hartling',
  street: 'Hahnweg 62',
  city: '96450 Coburg',
  email: 'leonhartling96@googlemail.com',
};

const Section = ({ title, children }) => (
  <section>
    <h2 className="text-base font-bold text-slate-900 mb-3">{title}</h2>
    <div className="rounded-squircle bg-white border border-slate-100 shadow-sm px-4 py-4 text-sm text-slate-600 leading-relaxed space-y-3">
      {children}
    </div>
  </section>
);

const ContactBlock = () => (
  <div className="space-y-0.5">
    <p className="font-semibold text-slate-800">{CONTACT.name}</p>
    <p>{CONTACT.street}</p>
    <p>{CONTACT.city}</p>
    <p className="pt-2">
      E-Mail:{' '}
      <a
        href={`mailto:${CONTACT.email}`}
        className="text-realgreen font-medium underline underline-offset-2"
      >
        {CONTACT.email}
      </a>
    </p>
  </div>
);

export const DatenschutzModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-realbg overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
    >
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
        <h1
          id="legal-title"
          className="mt-3 text-xl font-black text-slate-900 tracking-tight"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Impressum &amp; Datenschutz
        </h1>
      </div>

      {/* Content */}
      <div className="px-5 py-6 pb-24 max-w-2xl mx-auto space-y-8">
        <Section title="Impressum">
          <p>Angaben gemäß § 5 DDG, zugleich Verantwortlicher im Sinne der DSGVO:</p>
          <ContactBlock />
        </Section>

        <Section title="1. Überblick">
          <p>
            RealGood ist eine Community-App: Du scannst Supermarkt-Produkte, bewertest sie und
            schlägst günstige Alternativen („Dupes“) vor. Diese Erklärung beschreibt, welche Daten
            dabei verarbeitet werden, wofür und an wen sie gehen.
          </p>
        </Section>

        <Section title="2. Bereitstellung der App">
          <p>
            Die Web-Version wird bei Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA)
            gehostet. Beim Aufruf verarbeitet Vercel technisch notwendige Verbindungsdaten wie
            deine IP-Adresse sowie Datum und Uhrzeit der Anfrage, um die App auszuliefern.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
            sicheren und schnellen Bereitstellung). Vercel ist unter dem EU-US Data Privacy
            Framework zertifiziert.
          </p>
          <p>
            Die Android-App bringt ihre Dateien selbst mit; beim Start werden keine App-Dateien von
            Vercel geladen.
          </p>
        </Section>

        <Section title="3. Anonyme Sitzung">
          <p>
            Beim ersten Start legt die App über „Firebase Authentication“ der Google Ireland
            Limited (Gordon House, Barrow Street, Dublin 4, Irland) automatisch eine anonyme
            Sitzung an. Sie besteht aus einer zufälligen Kennung ohne Namen oder E-Mail-Adresse und
            wird im lokalen Speicher deines Geräts abgelegt. Wir brauchen sie, damit gescannte
            Produkte in der gemeinsamen Produktdatenbank gespeichert werden können und unsere
            Datenbank vor Missbrauch geschützt ist. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </Section>

        <Section title="4. Konto und Anmeldung">
          <p>
            Um Bewertungen zu schreiben, Dupes vorzuschlagen, abzustimmen oder Inhalte zu melden,
            brauchst du ein Konto. Auch dafür nutzen wir Firebase Authentication. Bei der
            Registrierung mit E-Mail verarbeiten wir deine E-Mail-Adresse, dein Passwort (nur als
            Prüfwert gespeichert) und den von dir gewählten Namen. Bei der Anmeldung mit Google
            erhalten wir deine E-Mail-Adresse, deinen Google-Profilnamen und dein Profilbild.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzung der App-Funktionen).
          </p>
          <p>
            Firebase speichert einen technisch notwendigen Anmelde-Token im lokalen Speicher deines
            Geräts, damit du angemeldet bleibst. Eine Einwilligung ist dafür nicht erforderlich
            (§ 25 Abs. 2 TDDDG). Tracking- oder Werbe-Cookies setzen wir nicht ein.
          </p>
        </Section>

        <Section title="5. Deine Beiträge und was öffentlich sichtbar ist">
          <p>
            Bewertungen, Dupe-Vorschläge, Abstimmungen und Preisangaben speichern wir in der
            Datenbank „Cloud Firestore“ von Google. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            <span className="font-semibold text-slate-700">Öffentlich abrufbar</span> sind: deine
            Bewertungen mit Text, Sternen, Preis und Markt, dein Anzeigename, dein Profilbild
            (falls vorhanden) sowie eine interne Nutzerkennung. Bei Dupes sind außerdem die
            Kennung der Person, die ihn eingetragen hat, und die abgegebenen Stimmen je
            Nutzerkennung abrufbar. Wähle deinen Anzeigenamen deshalb so, wie du öffentlich
            auftreten möchtest.
          </p>
          <p>
            Gescannte Produkte werden ohne Bezug zu deinem Konto in der gemeinsamen
            Produktdatenbank gespeichert.
          </p>
          <p>
            Einzelne Bewertungen lassen sich in der App derzeit nicht nachträglich ändern. Du
            kannst dein Konto samt deiner Bewertungen jederzeit im Profil löschen (siehe
            Abschnitt 11) oder uns per E-Mail um die Löschung einzelner Beiträge bitten.
          </p>
        </Section>

        <Section title="6. Meldungen">
          <p>
            Wenn du eine Bewertung meldest, speichern wir die gemeldete Bewertung, den gewählten
            Grund, deinen optionalen Freitext, den Zeitpunkt und deine Nutzerkennung. Meldungen
            sind nicht öffentlich; wir nutzen sie ausschließlich zur Prüfung und Moderation.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </Section>

        <Section title="7. Produktdaten von Open Food Facts">
          <p>
            Beim Scannen oder Eingeben eines Barcodes fragt die App die Produktdaten direkt bei
            Open Food Facts (Association Open Food Facts, 21 rue des Iles, 94100 Saint-Maur-des-
            Fossés, Frankreich) ab. Dabei werden deine IP-Adresse und der Barcode übertragen.
            Produktbilder werden ebenfalls von den Servern von Open Food Facts geladen.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="8. Profilbilder">
          <p>
            Hat jemand sich mit Google angemeldet, wird das Profilbild von Servern von Google
            geladen; dabei wird deine IP-Adresse an Google übertragen. Ohne Profilbild zeigt die
            App die Anfangsbuchstaben des Namens, ohne dafür einen externen Dienst zu nutzen.
          </p>
        </Section>

        <Section title="9. Kamera (Barcode-Scanner)">
          <p>
            Zum Scannen braucht die App Zugriff auf die Kamera. Der Zugriff erfolgt erst, nachdem
            du ihn erlaubt hast. Der Barcode wird direkt auf deinem Gerät erkannt. Es werden keine
            Bilder oder Videos gespeichert oder übertragen, verarbeitet wird nur die erkannte
            Ziffernfolge.
          </p>
        </Section>

        <Section title="10. Empfänger und Übermittlung in Drittländer">
          <p>
            Empfänger deiner Daten sind die genannten Dienstleister: Google (Firebase), Vercel und
            Open Food Facts. Mit Google besteht ein Vertrag zur Auftragsverarbeitung. Unsere
            Firestore-Datenbank ist für einen Standort in der EU eingerichtet. Google und Vercel
            können Daten auch in den USA verarbeiten; beide stützen sich dafür auf das EU-US Data
            Privacy Framework und auf Standardvertragsklauseln.
          </p>
        </Section>

        <Section title="11. Speicherdauer und Löschung">
          <p>
            Wir speichern deine Kontodaten und Beiträge, solange dein Konto besteht. Über
            „Konto löschen“ im Profil entfernst du dein Konto und deine Bewertungen sofort. Von
            dir eingetragene Dupes und abgegebene Stimmen bleiben ohne Namen erhalten und sind nur
            noch mit einer Kennung verknüpft, die keinem Konto mehr zugeordnet ist; auf Wunsch
            löschen wir auch diese. Meldungen löschen wir, sobald sie bearbeitet sind und nicht
            mehr gebraucht werden.
          </p>
        </Section>

        <Section title="12. Deine Rechte">
          <p>
            Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung
            (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20)
            und Widerspruch gegen Verarbeitungen, die auf berechtigtem Interesse beruhen
            (Art. 21). Schreib uns dazu an die oben genannte E-Mail-Adresse.
          </p>
          <p>
            Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77
            DSGVO), zum Beispiel beim Bayerischen Landesamt für Datenschutzaufsicht.
          </p>
        </Section>

        <Section title="13. Hinweis zu Produktangaben">
          <p>
            Produktdaten, Preise und Bewertungen stammen aus der Community und von Open Food
            Facts. RealGood übernimmt keine Gewähr für Zutaten, Allergiehinweise oder Preise.
            Maßgeblich sind immer die Angaben auf der Verpackung.
          </p>
        </Section>
      </div>
    </div>
  );
};
