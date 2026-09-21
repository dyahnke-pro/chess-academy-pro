/**
 * EVERY COACH SURFACE CAN REACH THE HANDS (2026-09-21).
 *
 * David: "Remember this is a unified coach, so all changes get made to all
 * surfaces. Make sure that happens."
 *
 * 🚨 WHY A SCANNING GATE AND NOT A LIST. "All surfaces" was verified by hand
 * once tonight and the hand-check was WRONG TWICE inside ten minutes — first a
 * four-file grep that missed six host surfaces, then a grep poisoned by a
 * comment that quoted the JSX tag it was searching for. A claim that fragile
 * does not survive as prose. This derives the answer from the code every run,
 * the same way `surface-map` does.
 *
 * THE CONTRACT. A surface is IN SCOPE when it drives a live coach board (it
 * supplies `onPlayMove` to the spine). Every in-scope surface must publish its
 * hands — either by rendering the shared chat panel (which registers on their
 * behalf) or by calling `registerCoachHands` itself. A surface that does
 * neither has a board the coach cannot touch, which is the G0 hole this whole
 * build closed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Strip comments so prose ABOUT a token never counts as the token — the exact
 *  trap that produced a false reading of this very question tonight. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const FILES = walk(SRC).map((p) => ({ path: p, src: code(p) }));

/** The shared chat panel registers hands for whoever renders it. */
const PANEL = 'GameChatPanel';

describe('the hands reach every coach surface', () => {
  it('finds the files non-vacuously', () => {
    expect(FILES.length).toBeGreaterThan(200);
  });

  it('the shared chat panel registers hands — six surfaces ride on this', () => {
    const panel = FILES.find((f) => f.path.endsWith(`${PANEL}.tsx`));
    expect(panel, 'the shared chat panel must exist').toBeTruthy();
    expect(panel!.src).toContain('registerCoachHands');
  });

  it('every surface that drives a coach board publishes its hands', () => {
    // In scope = supplies a live board to the spine.
    const inScope = FILES.filter((f) =>
      /\/components\//.test(f.path)
      && /onPlayMove\s*[:=]/.test(f.src));

    expect(inScope.length, 'no board surfaces found — the scan broke').toBeGreaterThan(0);

    const unwired = inScope.filter((f) =>
      !f.src.includes('registerCoachHands')      // registers itself
      && !new RegExp(`<${PANEL}[\\s>]`).test(f.src)); // or renders the panel that does

    expect(
      unwired.map((f) => f.path.replace(SRC, 'src')),
      'These surfaces drive a coach board but publish no hands, so the SPINE '
      + 'cannot act on them and a typed command dies there. Either render the '
      + 'shared chat panel or call registerCoachHands with what the surface '
      + 'genuinely has — an honest partial set is fine, a silent board is not.',
    ).toEqual([]);
  });

  it('CAN FIRE — a negative control on synthetic input', () => {
    // A gate nobody has watched fail cannot be told from one that cannot fail.
    const synthetic = [
      { path: '/components/Fake/Wired.tsx', src: 'onPlayMove: () => {}; registerCoachHands({})' },
      { path: '/components/Fake/ViaPanel.tsx', src: `onPlayMove: () => {}; <${PANEL} foo />` },
      { path: '/components/Fake/Silent.tsx', src: 'onPlayMove: () => {}' },
    ];
    const unwired = synthetic.filter((f) =>
      !f.src.includes('registerCoachHands')
      && !new RegExp(`<${PANEL}[\\s>]`).test(f.src));
    expect(unwired.map((f) => f.path)).toEqual(['/components/Fake/Silent.tsx']);
  });

  it('the comment trap stays shut — prose never counts as a render', () => {
    // `code()` strips comments, so a doc block quoting the tag cannot register
    // a phantom host. This is the false reading that cost ten minutes.
    const withProse = { src: code_of(`/** renders <${PANEL} /> in prose */\nonPlayMove: () => {}`) };
    expect(new RegExp(`<${PANEL}[\\s>]`).test(withProse.src)).toBe(false);
  });
});

function code_of(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
