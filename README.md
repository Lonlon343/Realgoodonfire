# RealGood

Community app for supermarket products: scan a barcode, rate the product and
find cheaper alternatives ("dupes") that other users suggested.

- Web app: React 19, Vite 7, Tailwind 4, hosted on Vercel
- Android app: the same web build, packaged with Capacitor 8
- Backend: Firebase Authentication and Cloud Firestore
- Product data: Open Food Facts

## Setup

```bash
npm ci
cp .env.example .env   # fill in the Firebase web app values
npm run dev
```

The app is built for phones. Desktop browsers get a landing page; use the
device toolbar of the browser to see the app itself.

## Scripts

| Command           | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run dev`     | Local dev server                 |
| `npm run lint`    | ESLint                           |
| `npm run build`   | Production build into `dist/`    |
| `npm run preview` | Serve the production build       |

## Firestore rules

`firestore.rules` and `firestore.indexes.json` in this repository are the
source of truth. After a change is merged, publish them:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Anonymous sign-in must be enabled in Firebase Authentication: the app signs
every visitor in anonymously so that scanned products can be stored, while
reviews, dupes, votes and reports require a real account.

## Android

```bash
npm run build
npx cap sync android
```

Then open `android/` in Android Studio. Signing material (`*.jks`,
`keystore.properties`) and `google-services.json` are ignored by git and must
never be committed.
