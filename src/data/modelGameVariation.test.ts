import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import modelGamesRaw from './model-games.json';
import repertoireRaw from './repertoire.json';
import proRaw from './pro-repertoires.json';

// Locks the per-variation model-game tags (David 2026-05-30, fix #1) against
// hand-drift: every `variation` tag must be exactly what
// scripts/classify-model-game-variations.mjs derives deterministically —
// PERFECT (identifying-prefix) match first, deepest-opening-match fallback,
// else untagged (main line). If you change a game's PGN or an opening's
// variations, re-run the classifier (`node scripts/classify-model-game-variations.mjs --write`)
// rather than hand-editing the tag.

interface Variation { name: string; pgn?: string }
interface Opening { id: string; pgn?: string; variations?: Variation[] }
interface Game { id: string; openingId: string; pgn: string; variation?: string }

const games = modelGamesRaw as unknown as Game[];
const openings = [
  ...(Array.isArray(repertoireRaw) ? (repertoireRaw as Opening[]) : []),
  ...(Array.isArray(proRaw) ? (proRaw as Opening[]) : []),
];
const byId = new Map(openings.map((o) => [o.id, o]));

function uciList(pgn: string | undefined): string[] {
  const c = new Chess();
  const out: string[] = [];
  for (const m of (pgn || '').trim().split(/\s+/).filter(Boolean)) {
    let mv;
    try { mv = c.move(m); } catch { break; }
    if (!mv) break;
    out.push(mv.from + mv.to + (mv.promotion || ''));
  }
  return out;
}
const commonLen = (a: string[], b: string[]): number => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };

function analyze(o: Opening): { mainU: string[]; ids: { name: string; u: string[]; prefix: string[]; L: number }[] } {
  const mainU = uciList(o.pgn);
  const vars = (o.variations || []).map((v) => ({ name: v.name, u: uciList(v.pgn) })).filter((v) => v.u.length);
  const others = (i: number): string[][] => [mainU, ...vars.filter((_, j) => j !== i).map((v) => v.u)];
  const ids = vars.map((v, i) => {
    let maxShared = 0;
    for (const ou of others(i)) maxShared = Math.max(maxShared, commonLen(v.u, ou));
    const L = Math.min(maxShared + 1, v.u.length);
    return { name: v.name, u: v.u, prefix: v.u.slice(0, L), L };
  });
  return { mainU, ids };
}

function classify(g: Game): string | undefined {
  const o = byId.get(g.openingId);
  if (!o) return undefined;
  const { mainU, ids } = analyze(o);
  const gu = uciList(g.pgn);
  // Tier 1 — exact identifying-prefix match (most specific).
  let best: { name: string; u: string[]; L: number } | null = null;
  for (const v of ids) {
    if (v.prefix.length > 0 && gu.length >= v.prefix.length && commonLen(gu, v.prefix) === v.prefix.length) {
      if (!best || v.L > best.L) best = v;
    }
  }
  if (best) return best.name;
  // Tier 2 — deepest opening match, deeper than the main line.
  let deepest: { name: string } | null = null;
  let deepestLen = commonLen(gu, mainU);
  for (const v of ids) { const cl = commonLen(gu, v.u); if (cl > deepestLen) { deepest = v; deepestLen = cl; } }
  return deepest?.name;
}

describe('model-game variation tags are the deterministic classifier output', () => {
  it('every stored variation tag matches what the classifier derives', () => {
    const drift = games
      .map((g) => ({ id: g.id, stored: g.variation, expected: classify(g) }))
      .filter((r) => r.stored !== r.expected);
    expect(
      drift,
      `Model-game variation tags drifted from the classifier. Re-run:\n  node scripts/classify-model-game-variations.mjs --write\n${drift
        .map((d) => `  ${d.id}: stored=${JSON.stringify(d.stored)} expected=${JSON.stringify(d.expected)}`)
        .join('\n')}`,
    ).toHaveLength(0);
  }, 30000); // re-derives the classifier across every model game — allow headroom

  it('every tagged variation names a real variation of its opening', () => {
    const bad = games
      .filter((g) => g.variation)
      .filter((g) => !(byId.get(g.openingId)?.variations || []).some((v) => v.name === g.variation));
    expect(bad.map((g) => `${g.id} → ${g.variation}`)).toHaveLength(0);
  });
});
