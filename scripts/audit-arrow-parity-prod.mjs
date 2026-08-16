// ARROW / MARKER PARITY — opening tab vs coach tab, measured, not inferred.
//
// David 2026-07-31, after three failed attempts: "It's not just the color of
// arrow but the shape and look of them… make the physical arrow code the same
// in coach tab/everywhere in the app that uses arrows" — and then: "You need
// to verify every single claim you make and make sure it's coded as intended.
// You're guessing A LOT!"
//
// So this reads the RENDERED DOM on both surfaces for the SAME opening at the
// SAME position and diffs it. Every previous claim of parity came from reading
// source and reasoning about it; this one comes from the pixels' own markup:
// the arrow elements' geometry attributes and the square styles react-chessboard
// actually applied.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_OPENING_ID=italian-game] [AUDIT_ASK="italian game"] \
//   node scripts/audit-arrow-parity-prod.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENING_ID = process.env.AUDIT_OPENING_ID || 'italian-game';
const ASK = process.env.AUDIT_ASK || 'italian game';

/** Everything about the board's markers that a human would SEE. Read off the
 *  live DOM: the arrow shapes with their geometry, and the styles applied to
 *  every square that has any. */
// react-chessboard draws each arrow as ONE <path marker-end=url(#…-arrowhead-…)>
// plus a <marker><polygon points="0.3 0, 2 1.25, 0.3 2.5" fill=color>. Every
// geometry attribute derives from arrowOptions + squareWidth, so those two
// nodes are the whole visual signature. (Read out of
// node_modules/react-chessboard/dist — not assumed.)
const SNAPSHOT = () => {
  const arrows = [...document.querySelectorAll('path[marker-end]')].map((el) => {
    const head = document.querySelector(
      `marker[id="${(el.getAttribute('marker-end') || '').replace(/^url\(#|\)$/g, '')}"] polygon`,
    );
    return {
      tag: 'path',
      stroke: el.getAttribute('stroke') || '',
      strokeWidth: el.getAttribute('stroke-width') || '',
      fill: el.getAttribute('fill') || '',
      opacity: el.getAttribute('opacity') || '',
      markerEnd: el.getAttribute('marker-end') || '',
      d: (el.getAttribute('d') || '').slice(0, 60),
      points: head?.getAttribute('points') || '',
      headFill: head?.getAttribute('fill') || '',
    };
  });
  // react-chessboard applies `squareStyles[squareId]` to an INNER
  // <div style="width:100%;height:100%">, NOT to the [data-square] element —
  // read out of node_modules/react-chessboard/dist. Reading the parent returns
  // the base board colour and makes every highlight look absent.
  const squares = [...document.querySelectorAll('[data-square]')].map((el) => {
    const inner = [el, ...el.querySelectorAll('div')].map((n) => {
      const cs = getComputedStyle(n);
      return {
        background: cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor,
        boxShadow: cs.boxShadow,
      };
    });
    return { square: el.getAttribute('data-square'), layers: inner };
  });
  // The board's own two colours are whatever appears most often across the
  // outer squares; any other layer colour, or any boxShadow, is a marker.
  const freq = new Map();
  for (const s of squares) freq.set(s.layers[0].background, (freq.get(s.layers[0].background) ?? 0) + 1);
  const base = new Set([...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c));
  // The board's BASE GLOW is painted on every square, so it is not a marker
  // either — the most common boxShadow is the baseline, not a highlight.
  const shadowFreq = new Map();
  for (const s of squares) for (const l of s.layers) if (l.boxShadow && l.boxShadow !== 'none') shadowFreq.set(l.boxShadow, (shadowFreq.get(l.boxShadow) ?? 0) + 1);
  const baseShadow = [...shadowFreq.entries()].sort((a, b) => b[1] - a[1])[0];
  const baselineShadow = baseShadow && baseShadow[1] >= 32 ? baseShadow[0] : null;
  const TRANSPARENT = new Set(['rgba(0, 0, 0, 0)', 'transparent', 'none']);
  const marked = [];
  for (const s of squares) {
    for (const l of s.layers) {
      const hasFill = l.background && !TRANSPARENT.has(l.background) && !base.has(l.background);
      const hasRing = l.boxShadow && l.boxShadow !== 'none' && l.boxShadow !== baselineShadow;
      if (hasFill || hasRing) {
        marked.push({ square: s.square, background: hasFill ? l.background : '(none)', boxShadow: hasRing ? l.boxShadow : 'none' });
        break;
      }
    }
  }
  const sqEl = document.querySelector('[data-square]');
  const squareWidth = sqEl ? sqEl.getBoundingClientRect().width : 0;
  return { arrows, squares: marked, squareWidth, squareCount: document.querySelectorAll('[data-square]').length };
};

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
const p = await ctx.newPage();

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = p.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await p.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = p.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await p.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* absent */ }
}

/** Wait until the board is actually showing arrows, then snapshot. */
async function sampleThroughout(label, budgetMs) {
  // Sample the WHOLE lesson, not one moment. A single snapshot compares two
  // DIFFERENT beats and proves nothing. The marker id carries the squares
  // (`…-arrowhead-{i}-{from}-{to}`), so each arrow is identifiable — the union
  // of everything drawn across the walk is the surface's real vocabulary.
  const arrows = new Map(); const squares = new Map(); const shapes = new Map();
  let sawNoBoard = false;
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    await p.waitForTimeout(2500);
    const snap = await p.evaluate(SNAPSHOT).catch(() => null);
    if (snap) {
      for (const a of snap.arrows) {
        const sq = /arrowhead-\d+-([a-h][1-8])-([a-h][1-8])/.exec(a.markerEnd);
        // stroke-width / squareWidth IS the shape (react-chessboard sets it to
        // squareWidth / arrowWidthDenominator). Arrow LENGTH varies per move,
        // so normalising by it compares nothing.
        const w = snap.squareWidth > 0 ? (Number(a.strokeWidth) / snap.squareWidth).toFixed(3) : 'n/a';
        shapes.set(`w/square=${w}|op=${a.opacity}|head=${a.points || 'none'}`, true);
        if (sq) arrows.set(`${sq[1]}-${sq[2]} ${a.stroke}`, true);
      }
      if (snap.squareCount === 0) sawNoBoard = true;
      for (const s of snap.squares) squares.set(`${s.square} bg=${s.background} shadow=${s.boxShadow.slice(0, 44)}`, true);
    }
    for (const sel of ['[data-testid="walkthrough-fork-option-0"]', '[data-testid="lesson-next"]', '[data-testid="walkthrough-skip"]']) {
      try { const el = p.locator(sel).first(); if (await el.isVisible({ timeout: 250 })) { await el.click({ force: true }); break; } } catch { /* next */ }
    }
  }
  console.log(`  [${label}] ${arrows.size} distinct arrow(s), ${squares.size} marked square(s), ${shapes.size} shape(s)${sawNoBoard ? ' — WARNING: a sample saw 0 [data-square] elements (selector/board issue, not "no highlights")' : ''}`);
  return { arrows: [...arrows.keys()], squares: [...squares.keys()], shapes: [...shapes.keys()], sawNoBoard };
}

const results = {};
try {
  // ── OPENING TAB: /openings/<id> → Watch → LessonPlayer ──
  await p.goto(`${BASE}/openings/${OPENING_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  const watch = p.locator('[data-testid="walkthrough-btn"]');
  await watch.waitFor({ timeout: 30000 });
  await watch.click({ force: true });
  await p.locator('[data-testid="lesson-player"]').waitFor({ timeout: 30000 });
  results.opening = await sampleThroughout('opening tab', 120000);

  // ── COACH TAB: /coach/teach → "teach me the <opening>" ──
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box.press('Enter');
  results.coach = await sampleThroughout('coach tab', 220000);
} catch (e) {
  console.log(`  ERROR ${String(e).slice(0, 180)}`);
}
await b.close();

// ── DIFF ──
const setOf = (snap, k) => new Set(snap?.[k] ?? []);
const only = (a, b) => [...a].filter((x) => !b.has(x));

for (const k of ['shapes', 'arrows', 'squares']) {
  console.log(`\n──── ${k.toUpperCase()} ────`);
  for (const [label, snap] of Object.entries(results)) {
    console.log(`  ${label}: ${(snap?.[k] ?? []).length}`);
    for (const v of (snap?.[k] ?? []).slice(0, 10)) console.log(`    ${v}`);
  }
}

const oShapes = setOf(results.opening, 'shapes'); const cShapes = setOf(results.coach, 'shapes');
const oSq = setOf(results.opening, 'squares'); const cSq = setOf(results.coach, 'squares');
const both = (results.opening?.arrows?.length ?? 0) > 0 && (results.coach?.arrows?.length ?? 0) > 0;
const shapeMatch = both && only(oShapes, cShapes).length === 0 && only(cShapes, oShapes).length === 0;
// Highlight STYLE parity: fill vs ring. Compare the style shape, not the squares.
const styleKind = (set) => new Set([...set].map((s) => (/bg=rgba\(0, 0, 0, 0\)|bg=none/.test(s) ? 'ring-only' : 'fill')));
const oKind = styleKind(oSq); const cKind = styleKind(cSq);
const sqComparable = oSq.size > 0 && cSq.size > 0;
const sqMatch = sqComparable && [...cKind].every((k) => oKind.has(k));

console.log('\n──── VERDICT ────');
console.log(`  ${both ? '✓' : '✗'} both surfaces rendered arrows to compare`);
console.log(`  ${shapeMatch ? '✓' : '✗'} arrow geometry identical`);
if (!shapeMatch && both) {
  console.log(`    opening only: ${only(oShapes, cShapes).join(' ; ') || '(none)'}`);
  console.log(`    coach only:   ${only(cShapes, oShapes).join(' ; ') || '(none)'}`);
}
console.log(`  ${sqComparable ? (sqMatch ? '✓' : '✗') : '○'} marked-square style ${sqComparable ? (sqMatch ? 'matches' : `DIFFERS (opening=${[...oKind]} coach=${[...cKind]})`) : 'NOT COMPARABLE — one side drew none'}`);

await mkdir('audit-reports/arrow-parity', { recursive: true }).catch(() => undefined);
const out = `audit-reports/arrow-parity/report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
await writeFile(out, JSON.stringify(results, null, 2)).catch(() => undefined);
console.log(`  report → ${out}`);
process.exit(both && shapeMatch && (!sqComparable || sqMatch) ? 0 : 1);
