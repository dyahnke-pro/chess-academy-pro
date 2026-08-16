// WHICH BROWSER ENGINE AN AUDIT DRIVES — Chromium by default, real WebKit on
// request.
//
// 🚨 WHY THIS EXISTS (David 2026-08-16: "Maybe the app simulator would be more
// accurate?").
//
// He is right that Chromium is the weak instrument for this product. The app
// ships to iOS through Capacitor, which runs **WKWebView** — WebKit. Every
// audit here drives Chromium, so the entire class of bug that only WebKit
// produces is invisible to the whole suite: AudioContext gating,
// ManagedMediaSource, WebKit's IndexedDB behaviour, audio decode, and the
// layout differences that show up on his phone and nowhere else.
//
// A few audits already claim an "iOS round" by swapping the user-agent and
// viewport on Chromium. That is cosmetic: it changes what the app is TOLD it
// is running on, not what it is actually running on. A UA string has never
// reproduced a WKWebView bug.
//
// A real iOS SIMULATOR is the honest answer and cannot run here — this is a
// Linux container with no Xcode and no `simctl`. That check belongs on his Mac
// or a macOS CI runner, and saying otherwise would be pretending. But
// Playwright ships genuine WebKit for Linux, and it is a large step closer than
// Chromium-in-a-costume: same engine family as WKWebView, same JS engine, same
// media stack.
//
// Getting it running took ~15 system libraries (gtk-4, graphene, gstreamer,
// libmanette, flite, and finally gstreamer1.0-libav). If a fresh container is
// missing them, `webkitAvailable()` returns false and the audit stays on
// Chromium rather than dying — a missing engine must degrade, never fail,
// because an audit that cannot run teaches nothing.
//
// Usage:
//   const { browser, contextOptions } = await launchAuditBrowser();  // AUDIT_ENGINE
//   AUDIT_ENGINE=webkit node scripts/audit-whatever.mjs              // real WKWebView-family
import { chromium, webkit, devices } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './chromium.mjs';

/** Can real WebKit actually launch here? Cheap probe, cached. */
let webkitOk;
export async function webkitAvailable() {
  if (webkitOk !== undefined) return webkitOk;
  try {
    const b = await webkit.launch({ headless: true });
    await b.close();
    webkitOk = true;
  } catch {
    webkitOk = false;
  }
  return webkitOk;
}

/**
 * Launch the engine this run asked for.
 *
 * `AUDIT_ENGINE=webkit` drives real WebKit with an iPhone profile — the
 * closest thing to the shipped app available off a Mac. Anything else (or
 * WebKit being unavailable) drives Chromium exactly as before, so every
 * existing audit is unchanged until it opts in.
 *
 * Returns the context options too, because they differ per engine: WebKit
 * takes a device descriptor and ignores Chromium's proxy/TLS flags, which are
 * meaningless to it.
 */
export async function launchAuditBrowser({ device = 'iPhone 14' } = {}) {
  const want = (process.env.AUDIT_ENGINE ?? 'chromium').toLowerCase();
  if (want === 'webkit' && await webkitAvailable()) {
    // WebKit ignores Chromium's `--proxy-server` flag entirely — it takes a
    // structured `proxy` option instead. Without this the lane cannot reach
    // prod from the sandbox and fails exactly like the 43 audits did, which
    // would be an embarrassing way to reintroduce today's first bug.
    const proxy = process.env.AUDIT_PROXY ? { server: process.env.AUDIT_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
    const browser = await webkit.launch({ headless: true, ...(proxy ? { proxy } : {}) });
    return {
      engine: 'webkit',
      browser,
      // The device descriptor supplies the iPhone viewport, UA, touch and
      // deviceScaleFactor together — mismatching them by hand is how a
      // "mobile" context ends up with a desktop hit-testing model.
      contextOptions: { ...devices[device], ignoreHTTPSErrors: true },
    };
  }
  if (want === 'webkit') {
    console.log('[engine] AUDIT_ENGINE=webkit requested but WebKit cannot launch here — falling back to Chromium.');
    console.log('[engine] Install its system deps (npx playwright install-deps webkit) to enable the iOS-accurate lane.');
  }
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(false),
    args: sandboxLaunchArgs(),
  });
  return { engine: 'chromium', browser, contextOptions: sandboxContextOptions() };
}
