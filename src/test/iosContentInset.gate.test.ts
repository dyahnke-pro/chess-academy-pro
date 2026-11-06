import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * THE PAGE OWNS THE SAFE AREA; THE iOS WEB VIEW NEVER INSETS IT (David's
 * iPhone, 2026-11-06: "Tired pressing the knight, but it hit the pawn").
 *
 * With capacitor `ios.contentInset: 'always'` the web view inset the page below
 * the status bar, and once that inset changed in a session WebKit drew the page
 * lower but resolved touches at the un-inset position — every tap on every
 * board landed about a status bar low (f6 answered as f7) until the app was
 * backgrounded. The inset is off, so three things must hold:
 *   1. the config says 'never';
 *   2. the page pads the WHOLE top inset (the half it used to pad only cleared
 *      the clock because the native inset added the rest);
 *   3. every element pinned to a screen edge pads that edge itself — `fixed`
 *      sits outside the page's padding, so a sheet at the bottom or a panel at
 *      the top would otherwise draw under the home indicator or the clock.
 */
const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx$/.test(n) && !/\.test\.tsx$/.test(n) ? [p] : [];
  });
}

const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the iOS web view never insets the page', () => {
  it("capacitor ios.contentInset is 'never'", () => {
    const cfg = stripComments(readFileSync(join(ROOT, 'capacitor.config.ts'), 'utf8'));
    expect(cfg).toMatch(/contentInset:\s*'never'/);
  });

  it('the page pads the whole top inset, once', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/--sat-pad:\s*var\(--sat\);/);
    expect(css).toMatch(/padding:\s*var\(--sat-pad\)/);
  });
});

/** The className strings of every `fixed` element a phone shows (desktop-only
 *  ones, `hidden md:…`, are skipped), with how it meets the screen's edges. */
function edgeElements(s: string): { cls: string; top: boolean; bottom: boolean }[] {
  const out: { cls: string; top: boolean; bottom: boolean }[] = [];
  for (const m of s.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const cls = m[1] ?? m[2] ?? '';
    const words = cls.split(/\s+/);
    if (!words.includes('fixed') || words.includes('hidden')) continue;
    const mobile = words.filter((w) => !/^(sm|md|lg|xl):/.test(w));
    const inset0 = mobile.includes('inset-0');
    // An overlay that fills the screen meets an edge only where its content
    // is pushed: to the top (items-start) or the bottom (items-end).
    const top = mobile.includes('top-0') || (inset0 && mobile.includes('items-start'));
    const bottom = mobile.includes('bottom-0') || (inset0 && mobile.includes('items-end'));
    if (top || bottom) out.push({ cls, top, bottom });
  }
  return out;
}

describe('every element pinned to a screen edge pads that edge', () => {
  const all = files(SRC).map((p) => ({ file: p.slice(SRC.length + 1), s: stripComments(readFileSync(p, 'utf8')) }));
  const pinned = all.flatMap(({ file, s }) => edgeElements(s).map((e) => ({ file, s, ...e })));

  it('finds the pinned elements (not vacuous)', () => {
    expect(pinned.map((p) => p.file)).toEqual(expect.arrayContaining([
      'components/ui/AppLayout.tsx',
      'components/Notifications/NotificationBell.tsx',
      'components/Paywall/PaywallPage.tsx',
    ]));
  });

  it('a top edge pads env(safe-area-inset-top)', () => {
    const bare = pinned
      .filter((p) => p.top && !/safe-area-inset-top/.test(p.cls))
      .map((p) => `${p.file}: ${p.cls}`);
    expect(bare).toEqual([]);
  });

  it('a bottom edge pads env(safe-area-inset-bottom) — on the element or the sheet inside it', () => {
    // The sheet inside an `items-end` overlay may carry the padding itself
    // (the consent and help sheets do); the file must then say it.
    const bare = pinned
      .filter((p) => p.bottom && !/safe-area-inset-bottom|pb-safe/.test(p.cls) && !/safe-area-inset-bottom|pb-safe/.test(p.s))
      .map((p) => `${p.file}: ${p.cls}`);
    expect(bare).toEqual([]);
  });
});
