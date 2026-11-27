// Records the storyboard of the demo video: serves the emulator build with
// `vite preview`, drives it in a phone-sized Chromium and captures 2x frames
// through the DevTools screencast. Encoding happens in encode.mjs.
//
// Expects running emulators (Firestore 8080, Auth 9099), seeded data and a
// build in dist-demo made with VITE_USE_EMULATORS=true (see run.mjs).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { DEMO_ACCOUNT, openFoodFactsAnswer, productByKey } from './demo-data.mjs';

export const PREVIEW_HOST = '127.0.0.1';
export const PREVIEW_PORT = 4317;

const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 2;
const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const STEP_TIMEOUT = 20_000;

const SEARCH_TERM = 'Hafer';
const SEARCH_PICK = productByKey('cookie');
const SCANNED = productByKey('chips');
const VOTED_DUPE = productByKey('skyrdupe');
const HYPE_CATEGORY = 'Getränke';
const REVIEW = { stars: 5, price: '1.99', store: 'Lidl', comment: 'Knusprig, würzig, einfach top!' };

const isLocalUrl = (url) => ['data:', 'blob:', 'about:'].includes(url.protocol) || LOCAL_HOSTS.has(url.hostname);
const isOpenFoodFactsLookup = (url) => url.hostname === 'world.openfoodfacts.org' && url.pathname.startsWith('/api/v2/product/');
const isAuthPopupHelper = (url) => url.hostname === 'apis.google.com' && url.pathname === '/js/api.js';

// Emoji font of the recording phone. Headless Chromium on Linux often has no
// emoji font, so emoji would render as empty boxes. The recorder registers
// Noto Color Emoji (OFL) from @fontsource/noto-color-emoji as a web font,
// served from node_modules; the app itself is unchanged. Release 4.5.0 is
// pinned on purpose: later releases ship only the COLRv1 build, which this
// Chromium draws blank.
// Chromium only draws the color glyphs when the emoji face is the first
// matching family; reached as a fallback it draws the .notdef box. So the
// emoji-only faces are registered under the first family names of the app's
// stacks: "ui-sans-serif" (Tailwind's default stack; a plain family name for
// Chromium on Linux) and "Poppins" (headings), the latter per concrete weight
// so Chromium combines them with the app's Poppins faces. The range leaves
// out ASCII (the font also has keycap digits).
const require = createRequire(import.meta.url);
const EMOJI_FONT_FILE = path.join(
  path.dirname(require.resolve('@fontsource/noto-color-emoji/package.json')),
  'files',
  'noto-color-emoji-all-400-normal.woff2'
);
const EMOJI_FONT_URL = '/__demo-emoji/noto-color-emoji.woff2';
const EMOJI_UNICODE_RANGE = 'U+200D,U+20E3,U+2190-21FF,U+2300-23FF,U+24C2,U+25A0-27BF,U+2900-297F,U+2B00-2BFF,U+3030,U+303D,U+3297,U+3299,U+FE0F,U+1F000-1FAFF,U+E0020-E007F';
const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const buildEmojiFontCss = () => {
  const face = (family, weight, style) => `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(${EMOJI_FONT_URL}) format('woff2');unicode-range:${EMOJI_UNICODE_RANGE};}`;

  return ['normal', 'italic'].flatMap((style) => [
    face('ui-sans-serif', '100 900', style),
    face('Noto Color Emoji', '100 900', style),
    ...FONT_WEIGHTS.map((weight) => face('Poppins', weight, style)),
  ]).join('\n');
};

// Adds the emoji faces to <head> as soon as the parser has created it, which
// is before the app's (deferred) module scripts run. A style added at init
// time would be dropped when the parser builds the document. (Rewriting the
// served HTML through a route is not an option: Chromium then treats the
// page as non-local and blocks its calls to the emulators on 127.0.0.1.)
const EMOJI_FONT_SCRIPT = (css) => {
  const install = () => {
    if (!document.head || document.head.querySelector('style[data-demo-recording="emoji-font"]')) {
      return Boolean(document.head);
    }

    const style = document.createElement('style');
    style.dataset.demoRecording = 'emoji-font';
    style.textContent = css;
    document.head.prepend(style);
    return true;
  };

  if (install()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => {
    install();
    observer.disconnect();
  }, { once: true });
};

const assertPortFree = (port, host) => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', () => reject(new Error(`Port ${host}:${port} is in use. Stop the process that holds it and run again.`)));
  server.listen(port, host, () => server.close(resolve));
});

// Visual tap marker, purely an overlay of the recording (not part of the app).
const TAP_MARKER_SCRIPT = () => {
  window.__demoTap = (x, y) => {
    const marker = document.createElement('div');
    marker.setAttribute('aria-hidden', 'true');
    Object.assign(marker.style, {
      position: 'fixed',
      left: `${x - 22}px`,
      top: `${y - 22}px`,
      width: '44px',
      height: '44px',
      borderRadius: '9999px',
      background: 'rgba(15, 23, 42, 0.22)',
      border: '2px solid rgba(255, 255, 255, 0.85)',
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.25)',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    document.documentElement.appendChild(marker);
    marker.animate(
      [
        { transform: 'scale(0.55)', opacity: 0.95 },
        { transform: 'scale(1)', opacity: 0.9, offset: 0.35 },
        { transform: 'scale(1.25)', opacity: 0 },
      ],
      { duration: 650, easing: 'ease-out', fill: 'forwards' }
    ).finished.then(() => marker.remove(), () => marker.remove());
  };
};

// Animated scroll of the window or of one scroll container (ease-in-out).
const SMOOTH_SCROLL_SCRIPT = ({ selector, top, duration }) => new Promise((resolve) => {
  const element = selector ? document.querySelector(selector) : document.scrollingElement;
  const start = element.scrollTop;
  const maxTop = element.scrollHeight - element.clientHeight;
  const target = Math.max(0, Math.min(top, maxTop));
  const distance = target - start;
  const startTime = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

  if (Math.abs(distance) < 1) {
    resolve(target);
    return;
  }

  const frame = (now) => {
    const progress = Math.min(1, (now - startTime) / duration);
    element.scrollTop = start + distance * ease(progress);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      resolve(target);
    }
  };
  requestAnimationFrame(frame);
});

// Typing rhythm: fixed pattern, so every run types the same way.
const TYPING_DELAYS = [95, 70, 110, 80, 65, 120, 85, 75, 100, 90];

export const recordDemo = async ({ rootDir, distDir, workDir, cameraClip }) => {
  const framesDir = path.join(workDir, 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  // Failure screenshots of an earlier run would be misleading.
  readdirSync(workDir)
    .filter((name) => /^failure-.*\.png$/.test(name))
    .forEach((name) => rmSync(path.join(workDir, name)));
  mkdirSync(framesDir, { recursive: true });

  const frames = [];
  const pendingWrites = [];
  const blockedRequests = [];
  const pageErrors = [];
  const consoleErrors = [];
  const log = [];
  const note = (message) => {
    const line = `[${new Date().toISOString()}] ${message}`;
    log.push(line);
    console.log(`  ${message}`);
  };

  await assertPortFree(PREVIEW_PORT, PREVIEW_HOST);
  let previewServer = null;
  let browser = null;
  let scanMode = 'camera';

  try {
    previewServer = await preview({
      root: rootDir,
      logLevel: 'warn',
      build: { outDir: distDir },
      preview: { host: PREVIEW_HOST, port: PREVIEW_PORT, strictPort: true, open: false },
    });
    const baseUrl = `http://${PREVIEW_HOST}:${PREVIEW_PORT}/`;
    note(`preview server on ${baseUrl}`);

    browser = await chromium.launch({
      headless: true,
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        `--use-file-for-fake-video-capture=${cameraClip}`,
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      screen: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_USER_AGENT,
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      colorScheme: 'light',
      permissions: ['camera'],
      serviceWorkers: 'block',
    });

    // Fully offline: every non-local request is intercepted here and never
    // reaches the network. Open Food Facts gets a fixed answer; the Google
    // popup helper that the Firebase Auth SDK preloads on mobile browsers is
    // refused (only Google sign-in would need it). Any other non-local
    // request fails the run.
    await context.route((url) => !isLocalUrl(url), async (route) => {
      const url = new URL(route.request().url());

      if (isOpenFoodFactsLookup(url)) {
        const barcode = url.pathname.split('/').pop();
        note(`Open Food Facts lookup answered locally: ${barcode}`);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(openFoodFactsAnswer(barcode)),
        });
        return;
      }

      if (isAuthPopupHelper(url)) {
        note(`refused locally (Firebase Auth popup helper): ${url.origin}${url.pathname}`);
      }

      await route.abort('blockedbyclient');
    });
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (!isLocalUrl(url) && !isOpenFoodFactsLookup(url) && !isAuthPopupHelper(url)) {
        blockedRequests.push(url.href);
      }
    });
    await context.route((url) => isLocalUrl(url) && url.pathname === EMOJI_FONT_URL, (route) => (
      route.fulfill({ path: EMOJI_FONT_FILE, contentType: 'font/woff2' })
    ));
    await context.addInitScript(TAP_MARKER_SCRIPT);
    await context.addInitScript(EMOJI_FONT_SCRIPT, buildEmojiFontCss());

    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT);
    page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('websocket', (socket) => {
      const url = new URL(socket.url());
      if (!isLocalUrl(url)) blockedRequests.push(url.href);
    });

    // ── helpers ──
    const pause = (ms) => page.waitForTimeout(ms);

    const scrollWindowTo = (top, duration = 900) => page.evaluate(SMOOTH_SCROLL_SCRIPT, { selector: null, top, duration });

    const scrollIntoView = async (locator, { offset = 96, duration = 800, onlyIfNeeded = true } = {}) => {
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      const bottomLimit = VIEWPORT.height - 110; // keep clear of the bottom navigation

      if (onlyIfNeeded && box.y >= 70 && box.y + box.height <= bottomLimit) {
        return;
      }

      const scrollY = await page.evaluate(() => window.scrollY);
      await scrollWindowTo(scrollY + box.y - offset, duration);
    };

    // force: for elements with an endless CSS animation (never "stable").
    // markerOnly: show the tap marker without tapping.
    const tap = async (locator, { scroll = true, force = false, markerOnly = false } = {}) => {
      await locator.waitFor({ state: 'visible' });
      if (scroll) await scrollIntoView(locator);
      const box = await locator.boundingBox();
      await page.evaluate(([x, y]) => window.__demoTap(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
      await pause(140);
      if (!markerOnly) await locator.tap({ force });
    };

    const typeInto = async (locator, text, { speed = 0.7 } = {}) => {
      await tap(locator);
      await pause(200);
      let index = 0;
      for (const character of text) {
        await page.keyboard.type(character);
        await pause(TYPING_DELAYS[index % TYPING_DELAYS.length] * speed);
        index += 1;
      }
    };

    const step = async (name, action) => {
      note(`step: ${name}`);
      try {
        await action();
      } catch (error) {
        const shot = path.join(workDir, `failure-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
        await page.screenshot({ path: shot }).catch(() => {});
        throw new Error(`Storyboard step "${name}" failed: ${error.message}\nScreenshot: ${shot}`);
      }
    };

    const nav = (label) => page.locator('nav').getByRole('button', { name: label, exact: true });
    const modalScroller = '.fixed.inset-0.z-\\[120\\] .overflow-y-auto';
    const homeLoaded = async (greeting) => {
      await page.getByRole('heading', { name: new RegExp(`Moin, ${greeting}!`) }).waitFor();
      await page.getByText('AKTUELL IM TREND').first().waitFor();
      await page.getByText('BESTER DUPE').first().waitFor();
      await page.getByText('Gerade gesnackt').waitFor();
      // Loading skeletons are pulsing divs (the badge next to "Neu im Regal"
      // pulses forever, so only divs count).
      await page.waitForFunction(() => document.querySelectorAll('div.animate-pulse').length === 0);
    };

    // ── open the app (not recorded yet) ──
    const loadEmojiFont = () => page.evaluate(async () => {
      await Promise.all([...document.fonts]
        .filter((font) => font.family.replace(/["']/g, '') === 'Noto Color Emoji')
        .map((font) => font.load()));
      await document.fonts.ready;
    });

    await step('open app', async () => {
      await page.goto(baseUrl, { waitUntil: 'load' });
      await page.getByRole('button', { name: 'Login', exact: true }).waitFor();
      await homeLoaded('Foodie');
      await loadEmojiFont();
      // Second load: the emoji font is cached now, so the first recorded
      // frame never shows a placeholder glyph.
      await page.reload({ waitUntil: 'load' });
      await page.getByRole('button', { name: 'Login', exact: true }).waitFor();
      await homeLoaded('Foodie');
      await loadEmojiFont();
      if (await page.locator('style[data-demo-recording="emoji-font"]').count() !== 1) {
        throw new Error('The emoji font style is missing in the page.');
      }
      await pause(1500); // intro animations settle before the first frame
    });

    // ── start capturing ──
    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      const file = path.join(framesDir, `frame-${String(frames.length).padStart(5, '0')}.jpg`);
      frames.push({ file, timestamp: metadata.timestamp });
      pendingWrites.push(writeFile(file, Buffer.from(data, 'base64')));
    });
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 95,
      maxWidth: VIEWPORT.width * DEVICE_SCALE_FACTOR,
      maxHeight: VIEWPORT.height * DEVICE_SCALE_FACTOR,
      everyNthFrame: 1,
    });
    // Repaint once so the first frame arrives right away.
    await page.evaluate(() => window.__demoTap(-100, -100));

    // a. Home as a guest
    await step('home as guest', async () => {
      await pause(1300);
      // One continuous scroll past "Neu im Regal" down to "Dupe Alarm".
      await scrollIntoView(page.getByRole('heading', { name: 'Dupe Alarm' }), { offset: 24, duration: 1500, onlyIfNeeded: false });
      await pause(900);
      await scrollIntoView(page.getByRole('heading', { name: /Gerade gesnackt/ }), { offset: 24, duration: 700, onlyIfNeeded: false });
      await pause(700);
      await scrollWindowTo(0, 900);
      await pause(200);
    });

    // b. Search a product and open it
    await step('search', async () => {
      await typeInto(page.getByPlaceholder('Produkt suchen …'), SEARCH_TERM);
      const result = page.locator('.top-full button').filter({ hasText: SEARCH_PICK.name });
      await result.waitFor();
      await pause(600);
      await tap(result, { scroll: false });
      await page.getByRole('heading', { name: SEARCH_PICK.name, level: 2 }).waitFor();
      await page.locator('article').getByText('Weich in der Mitte').waitFor();
      await pause(600);
      await page.evaluate(SMOOTH_SCROLL_SCRIPT, { selector: modalScroller, top: 330, duration: 800 });
      await pause(1000);
      await tap(page.getByRole('button', { name: 'Produktdetails schließen' }), { scroll: false });
      await page.getByRole('heading', { name: SEARCH_PICK.name, level: 2 }).waitFor({ state: 'detached' });
      await pause(300);
    });

    // c. Scanner: the fake camera shows the barcode
    await step('scanner', async () => {
      await tap(page.getByRole('button', { name: 'Produkt scannen' }), { scroll: false, force: true });
      await page.getByRole('heading', { name: /Barcode Scanner/ }).waitFor();
      const ratingHeading = page.getByRole('heading', { name: SCANNED.name, level: 1 });

      try {
        await ratingHeading.waitFor({ timeout: 12_000 });
      } catch {
        // Fallback: the camera did not recognise the code, type it instead.
        scanMode = 'manual';
        note('camera scan not recognised, typing the barcode instead');
        await typeInto(page.locator('#manual-barcode'), SCANNED.id);
        await tap(page.getByRole('button', { name: 'Suchen' }));
        await ratingHeading.waitFor();
      }
      await pause(500);
    });

    // d. Rate it, log in on the way, post
    await step('rating', async () => {
      await tap(page.getByRole('button', { name: `${REVIEW.stars} Sterne` }));
      await page.getByText('von 5 Sternen').waitFor();
      await pause(300);
      await typeInto(page.locator('#rating-price'), REVIEW.price);
      await pause(150);
      // A real tap on <select> opens the native picker, which a headless
      // browser never shows and which swallows the next taps: show the tap
      // marker and set the option directly.
      const storeSelect = page.locator('#rating-store');
      await tap(storeSelect, { markerOnly: true });
      await storeSelect.selectOption(REVIEW.store);
      await pause(350);
      await typeInto(page.locator('#rating-comment'), REVIEW.comment, { speed: 0.55 });
      await pause(300);

      const postButton = page.getByRole('button', { name: 'Bewertung posten' });
      await tap(postButton);
      const dialog = page.getByRole('dialog', { name: 'Willkommen bei RealGood' });
      await dialog.waitFor();
      await pause(500);
      await typeInto(page.locator('#auth-email'), DEMO_ACCOUNT.email, { speed: 0.5 });
      await typeInto(page.locator('#auth-password'), DEMO_ACCOUNT.password, { speed: 0.5 });
      await pause(200);
      await tap(dialog.getByRole('button', { name: 'Einloggen', exact: true }), { scroll: false });
      await dialog.waitFor({ state: 'detached' });
      await pause(400);

      await tap(postButton);
      const saved = page.getByText('Bewertung gespeichert!');
      await saved.waitFor({ state: 'attached' });
      await scrollWindowTo(0, 450);
      await saved.waitFor();

      // The app returns to Home and opens the product with the new review.
      await page.getByRole('heading', { name: SCANNED.name, level: 2 }).waitFor();
      await page.locator('article').getByText(REVIEW.comment).waitFor();
      await pause(500);
      await page.evaluate(SMOOTH_SCROLL_SCRIPT, { selector: modalScroller, top: 330, duration: 800 });
      await pause(1200);
      await tap(page.getByRole('button', { name: 'Produktdetails schließen' }), { scroll: false });
      await page.getByRole('heading', { name: SCANNED.name, level: 2 }).waitFor({ state: 'detached' });
    });

    // e. Vote for a dupe
    await step('dupe vote', async () => {
      await homeLoaded(DEMO_ACCOUNT.displayName);
      await scrollIntoView(page.getByRole('heading', { name: 'Dupe Alarm' }), { offset: 24, duration: 900, onlyIfNeeded: false });
      await pause(700);
      const upButton = page.getByRole('button', { name: `${VOTED_DUPE.name} positiv bewerten` });
      const before = Number(await upButton.innerText());
      await tap(upButton, { scroll: false });
      await page.waitForFunction(
        ([label, expected]) => document.querySelector(`button[aria-label="${label}"]`)?.textContent.trim() === String(expected),
        [`${VOTED_DUPE.name} positiv bewerten`, before + 1]
      );
      await pause(1300);
    });

    // f. Hype tab with a category filter
    await step('hype', async () => {
      await scrollWindowTo(0, 700);
      await tap(nav('Hype'), { scroll: false });
      await page.getByRole('heading', { name: 'Hype Check' }).waitFor();
      await page.locator('.bg-white.rounded-squircle h3').first().waitFor();
      await pause(500);
      await tap(page.getByRole('button', { name: HYPE_CATEGORY, exact: true }), { scroll: false });
      await page.getByRole('button', { name: `${HYPE_CATEGORY} ✕` }).waitFor();
      await page.locator('.bg-white.rounded-squircle h3').filter({ hasText: productByKey('coldbrew').name }).waitFor();
      await pause(500);
      await scrollWindowTo(380, 800);
      await pause(1100);
    });

    // g. Profile, then back to Home
    await step('profile', async () => {
      await scrollWindowTo(0, 600);
      await tap(nav('Profil'), { scroll: false });
      await page.getByRole('heading', { name: DEMO_ACCOUNT.displayName, level: 1 }).waitFor();
      await page.getByText('Zuletzt bewertet').waitFor();
      await page.locator('section button').filter({ hasText: SCANNED.name }).waitFor();
      await pause(1700);
      await tap(nav('Home'), { scroll: false });
      await homeLoaded(DEMO_ACCOUNT.displayName);
      await pause(900);
    });

    await cdp.send('Page.stopScreencast');
    await Promise.all(pendingWrites);
    await cdp.detach();

    if (blockedRequests.length > 0) {
      throw new Error(`The recording is not offline: requests to non-local hosts:\n  ${[...new Set(blockedRequests)].join('\n  ')}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Uncaught errors in the app:\n  ${pageErrors.join('\n  ')}`);
    }
    if (frames.length < 2) {
      throw new Error('The screencast delivered no frames.');
    }

    return { frames, scanMode, consoleErrors };
  } finally {
    writeFileSync(path.join(workDir, 'record.log'), [
      ...log,
      '',
      'console errors:',
      ...consoleErrors,
      '',
      'blocked requests:',
      ...blockedRequests,
    ].join('\n'));
    await browser?.close().catch(() => {});
    await previewServer?.close().catch(() => {});
  }
};
