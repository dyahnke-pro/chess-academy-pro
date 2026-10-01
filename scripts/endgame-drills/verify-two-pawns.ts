// Truth check for detectTwoPawnsVsKing: random K+2P vs K, defender to move.
// When the detector says the pawns defend each other, EVERY king capture of a
// pawn must lose for the defender (tablebase). Prints counts + any counterexample.
import { Chess } from 'chess.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { detectTwoPawnsVsKing } from '../../src/services/endgameTechnique';

const CACHE = '/tmp/claude-0/eg/tb-cache.json';
const cache: Record<string, { category: string; moves: Array<{ san: string; category: string }> } | null> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
async function tb(fen: string) {
  if (fen in cache) return cache[fen];
  for (let a = 0; a < 4; a += 1) {
    try {
      const r = await fetch(`https://chess-academy-pro.vercel.app/api/lichess-tablebase?fen=${encodeURIComponent(fen)}`);
      if (r.status === 429) { await sleep(2000 * (a + 1)); continue; }
      if (!r.ok) return null;
      const j = await r.json();
      cache[fen] = { category: j.category, moves: j.moves.map((m: { san: string; category: string }) => ({ san: m.san, category: m.category })) };
      await sleep(200);
      return cache[fen];
    } catch { await sleep(1000); }
  }
  return null;
}
let seed = 77;
const rnd = (n: number): number => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return (seed >>> 16) % n; };
const F = 'abcdefgh';
let yes = 0, no = 0, bad = 0, checked = 0;
for (let i = 0; checked < Number(process.argv[2] ?? 80) && i < 5000; i += 1) {
  const sqs = new Set<string>();
  const pick = (r0: number, r1: number): string => { for (;;) { const s = `${F[rnd(8)]}${r0 + rnd(r1 - r0 + 1)}`; if (!sqs.has(s)) { sqs.add(s); return s; } } };
  const K = pick(1, 8), k = pick(1, 8), p1 = pick(2, 7);
  // second pawn within two files of the first, so the rule is in play
  const f2 = Math.min(7, Math.max(0, p1.charCodeAt(0) - 97 + [-2, -1, 1, 2][rnd(4)]));
  const p2 = `${F[f2]}${2 + rnd(6)}`; if (sqs.has(p2)) continue; sqs.add(p2);
  const put: Record<string, string> = { [K]: 'K', [k]: 'k', [p1]: 'P', [p2]: 'P' };
  const rows: string[] = [];
  for (let r = 8; r >= 1; r -= 1) { let row = ''; let e = 0; for (const f of F) { const p = put[`${f}${r}`]; if (p) { if (e) row += e; e = 0; row += p; } else e += 1; } if (e) row += e; rows.push(row); }
  const fen = `${rows.join('/')} b - - 0 1`;
  let c: Chess; try { c = new Chess(fen); } catch { continue; }
  if (c.isGameOver() || c.inCheck()) continue;
  const caps = c.moves({ verbose: true }).filter((m) => m.captured);
  if (!caps.length) continue; // only positions where a capture is on offer
  const d = detectTwoPawnsVsKing(fen); if (!d) continue;
  const r = await tb(fen); if (!r) continue;
  checked += 1;
  if (d.selfDefending) {
    yes += 1;
    const safeCap = caps.find((m) => { const mv = r.moves.find((x) => x.san === m.san); return mv && !['win', 'cursed-win', 'maybe-win'].includes(mv.category); });
    // moves[].category is from the side to move AFTER the move (white): white 'loss'/'draw' = the capture saved black
    if (safeCap) { bad += 1; console.log('COUNTEREXAMPLE', fen, safeCap.san); }
  } else no += 1;
}
writeFileSync(CACHE, JSON.stringify(cache));
console.log(`[two-pawns] checked=${checked} selfDefending=${yes} not=${no} counterexamples=${bad}`);
