// Demo video pipeline, run inside `firebase emulators:exec` (see start.mjs):
// build in emulator mode -> seed -> camera clip -> record -> encode.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { writeCameraClip } from './camera-clip.mjs';
import { SCANNED_PRODUCT_KEY, productByKey } from './demo-data.mjs';
import { encodeVideo } from './encode.mjs';
import { recordDemo } from './record.mjs';
import { PROJECT_ID, seedDemoData } from './seed.mjs';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const workDir = path.resolve(process.env.DEMO_VIDEO_WORKDIR || path.join(rootDir, '.demo-video'));
const distDir = path.join(rootDir, 'dist-demo');
const videoPath = path.join(rootDir, 'public', 'demo-video.mp4');
const posterPath = path.join(rootDir, 'public', 'demo-poster.jpg');

// Placeholder config: the emulator build never talks to a real project.
const EMULATOR_BUILD_ENV = {
  VITE_USE_EMULATORS: 'true',
  VITE_FIREBASE_API_KEY: 'demo-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000',
};

const main = async () => {
  const startedAt = Date.now();
  mkdirSync(workDir, { recursive: true });

  console.log('1/5 Building the app in emulator mode (dist-demo) …');
  Object.assign(process.env, EMULATOR_BUILD_ENV);
  await build({
    root: rootDir,
    mode: 'production',
    logLevel: 'warn',
    build: { outDir: distDir, emptyOutDir: true },
  });

  console.log('2/5 Seeding the emulators with demo data …');
  const seeded = await seedDemoData({ now: Date.now() });
  console.log(`  ${seeded.products} products, ${seeded.reviews} reviews, ${seeded.dupes} dupes, 1 demo account`);

  console.log('3/5 Generating the fake camera clip …');
  const cameraClip = writeCameraClip(productByKey(SCANNED_PRODUCT_KEY).id, path.join(workDir, 'camera.y4m'));

  console.log('4/5 Recording the storyboard …');
  const recording = await recordDemo({ rootDir, distDir, workDir, cameraClip });
  console.log(`  ${recording.frames.length} frames captured, barcode via ${recording.scanMode}`);
  if (recording.consoleErrors.length > 0) {
    console.log(`  note: ${recording.consoleErrors.length} console error(s) from the app, see ${path.join(workDir, 'record.log')}`);
  }

  console.log('5/5 Encoding …');
  const facts = await encodeVideo({ frames: recording.frames, workDir, videoPath, posterPath });

  console.log('');
  console.log(`Demo video: ${videoPath}`);
  console.log(`  ${facts.width}x${facts.height}, ${facts.fps} fps, ${facts.codec}, ${facts.durationSeconds.toFixed(2)} s, ${(facts.bytes / 1e6).toFixed(2)} MB (crf ${facts.crf})`);
  console.log(`  barcode scan: ${recording.scanMode}`);
  console.log(`Poster: ${posterPath} (${(facts.posterBytes / 1e3).toFixed(0)} kB)`);
  console.log(`Work files: ${workDir}`);
  console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(0)} s.`);
};

// Explicit exit: browser, preview server and emulator clients are closed in
// their finally blocks; nothing may keep emulators:exec waiting.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(`\nDemo video failed: ${error.message}`);
    process.exit(1);
  }
);
