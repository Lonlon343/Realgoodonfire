// Entry point of `npm run demo:video`: checks the tools, then runs the
// pipeline (run.mjs) inside the Firestore and Auth emulators. The emulators
// are started and stopped by `firebase emulators:exec`.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OVERALL_TIMEOUT_MS = 15 * 60 * 1000;

const fail = (message) => {
  console.error(`demo:video: ${message}`);
  process.exit(1);
};

const checkJava = () => {
  const result = spawnSync('java', ['-version'], { encoding: 'utf8', timeout: 30_000 });

  if (result.error || result.status !== 0) {
    fail('Java (JDK 21 or newer) is needed for the Firebase emulators. Put it on PATH or set JAVA_HOME and PATH.');
  }
};

// With npm's ignore-scripts the ffmpeg binary is not downloaded on install.
const ensureFfmpeg = () => {
  const binary = require('ffmpeg-static');

  if (binary && existsSync(binary)) {
    return;
  }

  console.log('Downloading the ffmpeg-static binary (once) …');
  const installer = require.resolve('ffmpeg-static/install.js');
  const result = spawnSync(process.execPath, [installer], { stdio: 'inherit', timeout: 5 * 60 * 1000 });

  if (result.status !== 0 || !existsSync(binary)) {
    fail('Could not download the ffmpeg-static binary. Run: node node_modules/ffmpeg-static/install.js');
  }
};

const checkChromium = async () => {
  const { chromium } = await import('playwright');

  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (error) {
    fail(`Playwright Chromium is not available (${error.message.split('\n')[0]}). Run: npx playwright install chromium`);
  }
};

checkJava();
ensureFfmpeg();
await checkChromium();

const firebaseCli = require.resolve('firebase-tools/lib/bin/firebase.js');
const pipeline = `"${process.execPath}" scripts/demo-video/run.mjs`;
const child = spawn(
  process.execPath,
  [firebaseCli, 'emulators:exec', '--only', 'firestore,auth', '--project', 'demo-realgood', pipeline],
  { cwd: rootDir, stdio: 'inherit' }
);

const stopChild = (signal) => {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
};
const timer = setTimeout(() => {
  console.error(`demo:video: no result after ${OVERALL_TIMEOUT_MS / 60000} minutes, stopping.`);
  stopChild('SIGINT');
}, OVERALL_TIMEOUT_MS);

process.on('SIGINT', () => stopChild('SIGINT'));
process.on('SIGTERM', () => stopChild('SIGTERM'));

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  process.exit(code ?? (signal ? 1 : 0));
});
