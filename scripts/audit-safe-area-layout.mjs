#!/usr/bin/env node
/**
 * audit-safe-area-layout
 * ----------------------
 * THE SAFE-AREA INSETS MUST BE COUNTED EXACTLY ONCE.
 *
 * David 2026-09-05, twice: "not able to scroll down all the way on Home Screen"
 * and then, after a fix that shipped and did nothing, "still doesn't scroll down
 * and still don't have more room at top!!"
 *
 * The cause was arithmetic, in two places at once. `html` pads by the safe-area
 * insets; `body`/`#root` asked for `100dvh` and AppLayout's root asked for
 * `h-dvh`. But 100dvh is the WHOLE screen — it already spans the notch and the
 * home indicator. Padding a full-screen-tall box by the insets makes it taller
 * than the screen by inset-top + inset-bottom (~93px on a Dynamic Island
 * iPhone), so:
 *   · the document itself scrolls, dragging the app header out of view — which
 *     is what David's screenshot showed, the "Chess Academy" bar (OUTSIDE the
 *     page scroller) slid up and clipped;
 *   · the page scroller ends ~93px BELOW the viewport, so its last rows are
 *     unreachable no matter how much bottom padding the page carries.
 *
 * The earlier `min-h-0` sweep could never have fixed it: min-h-0 lets a flex
 * child shrink to its container, and the containers were themselves too tall.
 *
 * 🚨 THE HARNESS IS THE HARD PART, AND ITS FIRST VERSION PASSED VACUOUSLY.
 * A headless browser has no notch: every env(safe-area-inset-*) is 0px, so the
 * bug is INVISIBLE by default and any check "passes". The insets are therefore
 * read once into --sat/--sar/--sab/--sal (index.css) and this audit overrides
 * those to real device values. The first attempt injected that override from an
 * addInitScript, which runs before <head> exists — the <style> never landed, the
 * run reported PASS having simulated nothing, and the numbers (root height ==
 * full viewport) were the only tell. It now injects AFTER mount and REFUSES to
 * report unless it has verified the notch is really applied.
 *
 *   node scripts/audit-safe-area-layout.mjs                  # localhost:5173
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_SANDBOX=1 \
 *     AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-safe-area-layout.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
/** iPhone 15 Pro: Dynamic Island + home indicator. */
const SAT = 59;
const SAB = 34;
/** Routes worth checking: the home screen David reported, plus a page whose own
 *  header used to be a separate scroller. */
const ROUTES = ['/', '/weaknesses'];

async function main() {
  const results = [];
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 393, height: 852 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 3,
  });
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('main', { timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(1_500);

    // Simulate the notch. Injected AFTER mount — see the header note.
    await page.addStyleTag({ content:
      `:root{--sat:${SAT}px!important;--sab:${SAB}px!important}`
      + '[data-testid="strength-calibration-bubble"],[data-testid="page-help-modal"],'
      + '[data-testid="ai-consent-modal"]{display:none!important}' });
    await page.waitForTimeout(400);

    // PRECONDITION — refuse to report anything unless the notch really applied.
    const applied = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { sat: cs.getPropertyValue('--sat').trim(), padTop: cs.paddingTop };
    });
    if (applied.sat !== `${SAT}px` || applied.padTop !== `${SAT}px`) {
      console.error(`✗ ${route}: HARNESS FAILED — notch not simulated (${JSON.stringify(applied)})`);
      results.push({ route, ok: false, reason: 'harness: notch not simulated' });
      continue;
    }

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const scroller = document.querySelector('main .overflow-y-auto') ?? document.querySelector('main');
      const out = {
        innerHeight: window.innerHeight,
        docOverflowPx: de.scrollHeight - window.innerHeight,
        overflowing: [],
      };
      for (let el = scroller; el && el !== document.body; el = el.parentElement) {
        const r = el.getBoundingClientRect();
        if (Math.round(r.bottom) > window.innerHeight + 1) {
          out.overflowing.push(`${el.tagName}${el.id ? '#' + el.id : ''} ${String(el.className).slice(0, 50)} → ${Math.round(r.bottom)}`);
        }
      }
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
        out.reachedBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        const navTab = document.querySelector('[data-testid^="nav-"][data-testid$="-tab"]');
        const navTop = navTab ? Math.round(navTab.getBoundingClientRect().top) : window.innerHeight;
        const kids = [...scroller.children];
        const last = kids[kids.length - 1];
        out.lastRowClearsNav = last ? Math.round(last.getBoundingClientRect().bottom) <= navTop + 1 : true;
        out.lastRowText = last ? (last.textContent || '').trim().slice(0, 28) : '';
      }
      // The document must not scroll AT ALL — that is what drags the header away.
      window.scrollTo(0, 500);
      out.docScrolledBy = Math.round(window.scrollY);
      window.scrollTo(0, 0);
      // The scroller must not CHAIN its overscroll to the document: that
      // hand-off at the end of a list is the stutter at the bottom of a page.
      if (scroller) {
        const ob = getComputedStyle(scroller).overscrollBehaviorY;
        out.overscrollY = ob;
        out.containsOverscroll = ob === 'contain' || ob === 'none';
      }
      return out;
    });

    const ok = m.docOverflowPx <= 1 && m.docScrolledBy === 0
      && m.overflowing.length === 0 && m.reachedBottom && m.lastRowClearsNav
      && m.containsOverscroll;
    results.push({ route, ok, ...m });
    console.log(`${ok ? '✓' : '✗'} ${route}  docOverflow=${m.docOverflowPx}px docScrolled=${m.docScrolledBy}px `
      + `reachedBottom=${m.reachedBottom} overscrollY=${m.overscrollY} lastRow="${m.lastRowText}" clearsNav=${m.lastRowClearsNav}`);
    for (const o of m.overflowing) console.log(`    OVERFLOWS VIEWPORT: ${o}`);
  }

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n[safe-area] ${results.length - failed.length}/${results.length} routes fit the screen`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error('[safe-area] fatal:', e); process.exit(2); });
