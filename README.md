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
| `npm run demo:video` | Record the landing page demo video |

## Demo video

The video in the phone frame of the desktop landing page
(`public/demo-video.mp4`, poster `public/demo-poster.jpg`) is recorded
automatically from the real app:

```bash
npm run demo:video
```

The command starts the local Firestore and Auth emulators (project
`demo-realgood`), builds the app in emulator mode into `dist-demo/`, seeds
demo data, plays a fixed storyboard in a phone-sized headless Chromium
(home, search, barcode scan with a generated fake camera clip, rating with
login, dupe vote, hype filter, profile) and encodes the frames to H.264.
Everything runs offline: the Open Food Facts lookup is answered locally and
any other request to the internet fails the run. Work files (frames, logs,
failure screenshots) go to `.demo-video/`.

Requirements:

- Java 21 or newer on `PATH` (Firebase emulators)
- Playwright Chromium: `npx playwright install chromium`
- `ffmpeg-static`: its binary is downloaded on the first run (npm with
  `ignore-scripts` skips the package's own install step)
- Free ports 8080, 9099 and 4317

All demo content is fictional: products, brands, barcodes (GS1 prefix 20)
and people are invented, there are no product photos and no real accounts.
The scripts live in `scripts/demo-video/` and are not part of the app bundle.
`VITE_USE_EMULATORS=true` switches a build to the emulators; never set it for
a real build.

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
