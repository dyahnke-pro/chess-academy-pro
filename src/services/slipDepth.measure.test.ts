// WO-DEPTH-01 step 3 — the deep reads at David's slips against a MATCHED
// ordinary move (same game, same seat). A read is a reason only where it is
// more common at slips than at the matched moves (the lift).
//   node scripts/depth/slip-reads.mjs <drop> audit-reports/slip-reads <i/n>   (engine, sharded)
//   SLIP_DEPTH_MEASURE=1 npx vitest run src/services/slipDepth.measure.test.ts
// Writes audit-reports/slip-depth.json.
import { it } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { refutationOf, mainConceptLine, recurringFalls } from './slipDepth';
import { expectedScore } from './winChance';
import { newThreat } from './threatOut';
import { findAllowedChain } from './causalChain';

const RUN = process.env.SLIP_DEPTH_MEASURE === '1';

// The reads that did NOT tell his slips apart live here, with the measure that
// showed it — they are not reasons the app says.
interface EngineLine { cp: number | null; mate: number | null; pv: string[] }
const HOLD_GAP = 0.05; // Lichess's inaccuracy line, in expected score
const lineCp = (l: EngineLine): number => (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.cp ?? 0);
function sanOf(fen: string, uci: string | undefined): { san: string; capture: boolean; check: boolean } | null {
  if (!uci) return null;
  try { const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }); return m ? { san: m.san, capture: !!m.captured, check: /[+#]$/.test(m.san) } : null; } catch { return null; }
}
function slipDepth(fen: string, san: string, lines: EngineLine[], after: EngineLine | null) {
  if (lines.length === 0) return null;
  const best = expectedScore(lineCp(lines[0]));
  const b = sanOf(fen, lines[0].pv[0]);
  let fenAfter: string | null = null; let bait: string | null = null;
  try {
    const c = new Chess(fen); const m = c.move(san); fenAfter = c.fen();
    bait = m.captured ? 'capture' : /[+#]$/.test(m.san) ? 'check' : newThreat(fen, fenAfter, m.color === 'w' ? 'b' : 'w') ? 'threat' : null;
  } catch { fenAfter = null; }
  return {
    holds: lines.filter((l) => best - expectedScore(lineCp(l)) < HOLD_GAP).length,
    read: lines.length,
    bestQuiet: !!b && !b.capture && !b.check,
    bait,
    refutation: fenAfter && after ? refutationOf(fenAfter, after.pv) : null,
  };
}
const DIR = 'audit-reports/slip-reads';

interface Row { game: string; ply: number; seat: string; kind: string; san: string; fen: string; lines: EngineLine[]; after?: EngineLine | null }

it.runIf(RUN && existsSync(DIR))('deep reads: slips against matched ordinary moves', () => {
  const rows: Row[] = readdirSync(DIR).filter((f) => f.startsWith('slips-')).flatMap((f) =>
    readFileSync(`${DIR}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Row));
  const groups: Record<string, { n: number; holds: number[]; one: number; two: number; narrow: number; bestQuiet: number; bait: Record<string, number>; ref: number; refMoves: number[]; refQuiet: number; refMate: number }> = {};
  const samples: Array<Record<string, unknown>> = [];
  // THE EARLIER CAUSE: how often the one causal-chain computer proves the move
  // that set the slip up (the chain Review and Learn already say).
  const DROP = 'audit-reports/.fixtures/data-drop-david.json';
  const sansOf = new Map<string, string[]>();
  if (existsSync(DROP)) {
    for (const g of (JSON.parse(readFileSync(DROP, 'utf8')) as { stores: { games: Array<{ id: string; pgn: string }> } }).stores.games) {
      try { const c = new Chess(); c.loadPgn(g.pgn); sansOf.set(g.id, c.history()); } catch { /* unreadable */ }
    }
  }
  const chain = { slips: 0, fired: 0, firedRefuted: 0, refuted: 0 };
  for (const r of rows) {
    const g = (groups[r.kind === 'ordinary' ? 'ordinary' : 'slip'] ??= { n: 0, holds: [], one: 0, two: 0, narrow: 0, bestQuiet: 0, bait: {}, ref: 0, refMoves: [], refQuiet: 0, refMate: 0 });
    const d = slipDepth(r.fen, r.san, r.lines, r.after ?? null);
    if (!d) continue;
    g.n += 1;
    g.holds.push(d.holds);
    if (d.holds === 1) g.one += 1;
    if (d.holds === 2) g.two += 1;
    if (d.holds <= 3) g.narrow += 1;
    if (d.bestQuiet) g.bestQuiet += 1;
    g.bait[d.bait ?? 'none'] = (g.bait[d.bait ?? 'none'] ?? 0) + 1;
    if (d.refutation) {
      g.ref += 1; g.refMoves.push(d.refutation.moves);
      if (d.refutation.quietStart) g.refQuiet += 1;
      if (d.refutation.mate) g.refMate += 1;
    }
    if (r.kind !== 'ordinary') {
      const sans = sansOf.get(r.game);
      const ch = sans ? findAllowedChain(sans, r.ply + 1, r.seat === 'white' ? 'w' : 'b') : null;
      chain.slips += 1; if (ch) chain.fired += 1;
      if (d.refutation) { chain.refuted += 1; if (ch) chain.firedRefuted += 1; }
    }
    if (r.kind !== 'ordinary' && samples.length < 40 && (samples.length < 15 || r.ply % 5 === 0)) {
      samples.push({ game: r.game, ply: r.ply + 1, seat: r.seat, san: r.san, fen: r.fen, holds: d.holds, read: d.read, bestQuiet: d.bestQuiet, best: r.lines[0]?.pv[0], bait: d.bait, refutation: d.refutation });
    }
  }
  const pct = (a: number, n: number): number => Math.round((1000 * a) / Math.max(1, n)) / 10;
  const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };
  const summary = Object.fromEntries(Object.entries(groups).map(([k, g]) => [k, {
    n: g.n,
    medianHolds: median(g.holds),
    onlyOne: pct(g.one, g.n), onlyTwo: pct(g.two, g.n), threeOrFewer: pct(g.narrow, g.n),
    bestQuiet: pct(g.bestQuiet, g.n),
    bait: Object.fromEntries(Object.entries(g.bait).map(([b, c]) => [b, pct(c, g.n)])),
    refuted: pct(g.ref, g.n), medianRefMoves: median(g.refMoves), refQuietStart: pct(g.refQuiet, g.ref), refMate: pct(g.refMate, g.ref),
    refMovesHist: g.refMoves.reduce<Record<number, number>>((h, m) => { h[m] = (h[m] ?? 0) + 1; return h; }, {}),
  }]));
  writeFileSync('audit-reports/slip-depth.json', JSON.stringify({ rows: rows.length, summary, chain, samples }, null, 1));
  console.log('CHAIN', JSON.stringify(chain));
  console.log('SLIP_DEPTH', JSON.stringify(summary));
}, 600_000);

// The main concept on whole games: every costly move's reply, both seats
// (`scripts/depth/slip-replies.mjs`). How many games get a line, and the lines.
it.runIf(RUN && existsSync('audit-reports/slip-replies'))('main concept on whole games', () => {
  const D = 'audit-reports/slip-replies';
  const rows = readdirSync(D).filter((f) => f.startsWith('replies-')).flatMap((f) =>
    readFileSync(`${D}/${f}`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { game: string; ply: number; seat: string; san: string; fenBefore: string; replyUci: string[] }));
  const byGame = new Map<string, typeof rows>();
  for (const r of rows) byGame.set(r.game, [...(byGame.get(r.game) ?? []), r]);
  const tally = { games: 0, line: 0, mine: 0, theirs: 0, families: {} as Record<string, number> };
  const lines: string[] = [];
  for (const [game, rs] of byGame) {
    tally.games += 1;
    const moves = rs.sort((a, b) => a.ply - b.ply).map((r) => ({ seat: (r.seat === 'white' ? 'w' : 'b') as 'w' | 'b', san: r.san, fenBefore: r.fenBefore, replyUci: r.replyUci }));
    // David's seat: the side his name plays is not in the reads; read both seats as "his" in turn.
    for (const seat of ['w', 'b'] as const) {
      const line = mainConceptLine(moves, seat);
      if (!line) continue;
      tally.line += 1;
      const f = recurringFalls(moves);
      if (f.some((x) => x.seat === seat)) tally.mine += 1; else tally.theirs += 1;
      for (const x of f) tally.families[x.family] = (tally.families[x.family] ?? 0) + 1;
      if (lines.length < 12) lines.push(`${game} [${seat}] ${line}`);
    }
  }
  writeFileSync('audit-reports/main-concept.json', JSON.stringify({ tally, lines }, null, 1));
  console.log('MAIN_CONCEPT', JSON.stringify(tally));
}, 600_000);
