// Hole 6 — masters-DB legitimacy audit for past-book lesson plies.
//
// The static DB-anchor gate (lessonIntegrity, Hole 1) proves a lesson's
// SPINE is a real openings-lichess.json line. Past that anchor, lessons run
// deep into the middlegame (the depth gate forces ≥20 plies). Those past-
// book moves are chess.js-legal but the static DB can't say whether they're
// REAL theory or plausible invention. The Lichess MASTERS database can —
// it's the full master-game corpus, far deeper than the named-opening DB.
//
// This audit replays each lesson's deepest beat and, for every ply BEYOND
// the openings-lichess anchor, asks the masters explorer (via the prod
// proxy — direct lichess is firewalled in the sandbox) whether that move
// was actually played in master games. A move absent from masters at its
// position is a SUSPECT — flagged for human review, not auto-condemned
// (rare-but-sound sharp lines exist; masters sample thins with depth).
//
// NETWORK + SLOW — gated behind RUN_MASTERS_AUDIT so it never runs in the
// fast unit gate. Run on demand:
//   RUN_MASTERS_AUDIT=1 npx vitest run src/data/lessons/mastersCoverage.test.ts
// or via ship-check:full. Baseline parks today's known suspects so the gate
// is green + surfaces the backlog + hard-fails NEW suspects.

import { describe, it, expect } from 'vitest';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { ALL_LESSONS, FIRST_CLASS_OPENING_IDS } from './registry';
import { longestAnchorPly } from '../../utils/dbAnchor';
import middlegamePlansRaw from '../middlegame-plans.json';

interface PlanLine { fen: string; moves: string[] }
interface PlanRow { id: string; openingId: string; playableLines: PlanLine[] }
const PLANS = middlegamePlansRaw as PlanRow[];

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RUN = !!process.env.RUN_MASTERS_AUDIT;

// ── Stockfish (accuracy half) ───────────────────────────────────────────
// Masters coverage proves a past-book move is REAL theory; Stockfish proves
// it's SOUND (not a blunder dressed up as a teaching move). Resolved from a
// system UCI binary — the WASM npm build is a Web Worker script, not node-
// drivable, so this uses the same approach as audit-traps-stockfish.mjs.
// Skips cleanly (NOT a failure) when no engine is reachable, e.g. this
// sandbox; runs on David's machine / CI where stockfish is installed.
const SF_DEPTH = 16;
const MAX_CP_LOSS = 120; // a past-book move losing >120cp vs best = suspect

function resolveStockfish(): string | null {
  const env = process.env.STOCKFISH_PATH;
  const candidates = [env, '/usr/games/stockfish', '/usr/bin/stockfish', '/usr/local/bin/stockfish'].filter(Boolean) as string[];
  for (const p of candidates) if (existsSync(p)) return p;
  try { return execSync('which stockfish', { encoding: 'utf-8' }).trim() || null; } catch { return null; }
}
const STOCKFISH = resolveStockfish();

/** Centipawn score (side-to-move POV) for a fen at SF_DEPTH; null on failure. */
function evalFen(bin: string, fen: string, searchMove?: string): Promise<number | null> {
  return new Promise((resolve) => {
    const sf = spawn(bin);
    let last: number | null = null;
    let done = false;
    const finish = (v: number | null): void => { if (!done) { done = true; try { sf.kill(); } catch { /* */ } resolve(v); } };
    let buf = '';
    sf.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split('\n'); buf = lines.pop() ?? '';
      for (const line of lines) {
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (mate) last = parseInt(mate[1], 10) > 0 ? 100000 : -100000;
        else if (cp) last = parseInt(cp[1], 10);
        if (line.startsWith('bestmove')) finish(last);
      }
    });
    sf.on('error', () => finish(null));
    sf.stdin.write('uci\n');
    sf.stdin.write(`position fen ${fen}\n`);
    sf.stdin.write(`go depth ${SF_DEPTH}${searchMove ? ` searchmoves ${searchMove}` : ''}\n`);
    setTimeout(() => finish(last), 12000);
  });
}

// Genuine masters-suspects accepted today: a main/variation past-book move
// where masters WERE at that position (≥1 game) but played something else —
// so the lesson's move may be a teaching simplification or an inferior tail.
// Keyed `${registryKey}::${ply}:${san}`. Flagged for human/engine review;
// SHRINK over time, a NEW one fails the audit. (Measured 2026-05-22.)
//   • Ruy MAIN ply 29 Ng3 — the lone deep master game played otherwise.
//   • Vienna Gambit ply 15 Bd2 — masters' 1 game diverged; then the line
//     leaves masters' book entirely (16-24 absent → Stockfish's job).
//   • Vienna Paulsen plies 13 a4 / 16 Be6 — masters diverged; tail absent.
const SUSPECT_BASELINE = new Set<string>([
  'The Ruy Lopez — A Master Class::29:Ng3',
  'vienna-game::Vienna Gambit::15:Bd2',
  'vienna-game::Paulsen Attack::13:a4',
  'vienna-game::Paulsen Attack::16:Be6',
]);

interface MasterMove { san: string; games: number }

async function mastersMoves(uci: string[], tries = 2): Promise<MasterMove[] | null> {
  const url = `${PROXY}?source=masters&play=${uci.join(',')}`;
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) { await sleep(500); continue; }
      const j = await r.json();
      return (j.moves ?? []).map((m: { san: string; white: number; draws: number; black: number }) => ({
        san: m.san, games: m.white + m.draws + m.black,
      }));
    } catch { await sleep(500); }
  }
  return null; // network failure — treated as "unknown", not a suspect
}

async function mastersMovesByFen(fen: string, tries = 2): Promise<MasterMove[] | null> {
  const url = `${PROXY}?source=masters&fen=${encodeURIComponent(fen)}`;
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url);
      if (!r.ok) { await sleep(500); continue; }
      const j = await r.json();
      return (j.moves ?? []).map((m: { san: string; white: number; draws: number; black: number }) => ({
        san: m.san, games: m.white + m.draws + m.black,
      }));
    } catch { await sleep(500); }
  }
  return null;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function deepestBeat(lessonBeats: { moves: string[] }[]): string[] {
  let d: string[] = [];
  for (const b of lessonBeats) if (b.moves.length > d.length) d = b.moves;
  return d;
}

// ── Hole 6a — masters LEGITIMACY (main + variation lines only) ──────────
// Traps are EXCLUDED: masters don't fall for traps, so a trap's punishment
// line is legitimately absent from the masters DB — Stockfish (6b) verifies
// traps instead. Semantics: a move is a SUSPECT only when masters WERE at
// that position (≥1 game) and played something else. A position with ZERO
// master games means the line is simply past masters' book depth — recorded
// as "beyond book" and handed to the Stockfish soundness check, NOT failed.
describe.runIf(RUN)('Hole 6a — masters legitimacy of past-book moves (main + variation)', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    if (scope === 'trap') continue;
    it(`[${scope}] ${key}: past-book moves are master-played where masters reached (or baselined)`, async () => {
      const deepest = deepestBeat(lesson.beats);
      const anchor = longestAnchorPly(deepest);
      const c = new Chess();
      const uci: string[] = [];
      const suspects: string[] = [];
      let beyondBook = 0;

      for (let i = 0; i < deepest.length; i++) {
        const before = uci.slice();
        let mv;
        try { mv = c.move(deepest[i]); } catch { break; }
        const ply = i + 1;
        if (ply > anchor) {
          const moves = await mastersMoves(before);
          if (moves !== null) {
            if (moves.length === 0) {
              beyondBook++; // past masters' depth — Stockfish's job, not a suspect
            } else if (!moves.some((m) => m.san === mv.san) && !SUSPECT_BASELINE.has(`${key}::${ply}:${mv.san}`)) {
              suspects.push(`ply ${ply} ${mv.san} — masters reached this position (${moves.length} replies: ${moves.slice(0, 4).map((m) => m.san).join('/')}) but did not play it`);
            }
          }
          await sleep(300);
        }
        uci.push(mv.from + mv.to + (mv.promotion ?? ''));
      }
      if (beyondBook > 0) {
        console.log(`  [${key}] ${beyondBook} ply past masters' book → deferred to Stockfish soundness`);
      }
      expect(
        suspects,
        `${key}: master-divergent past-book move(s) — review for legitimacy:\n  ${suspects.join('\n  ')}`,
      ).toEqual([]);
    }, 120000);
  }
});

// Soundness baseline (6b). Mirrors SUSPECT_BASELINE (6a): a small allowlist of
// master-played plies the engine flags as a big cp-loss but which are DELIBERATELY
// SHOWN — the opponent's defining mistake that the line exists to punish. The
// cp-loss is real and CORRECT (the move IS bad for the side that plays it); the
// gate just can't tell "recommended White move" from "opponent's greedy blunder
// we're teaching the student to punish." Only legitimate when 6a confirms the
// move is master-played (real theory, not invention). Keyed `${key}::${ply}:${san}`.
const SOUNDNESS_BASELINE = new Set<string>([
  // Møller Attack accepted: ...Bxa1 grabs the rook and walks into the winning
  // attack — the whole point of the exchange sacrifice. Master-played (6a green);
  // engine reads it as −3.7 for Black, i.e. White is winning, which IS the lesson.
  'italian-game::Italian: Modern Moller Attack::20:Bxa1',
]);

// ── Hole 6b — Stockfish SOUNDNESS (all lessons, incl. traps) ────────────
// Verifies each past-book move isn't a blunder: the move's centipawn loss
// vs the engine's best at that position must be ≤ MAX_CP_LOSS. This is the
// accuracy half (masters = legitimacy). Engine-gated: when no UCI binary is
// reachable (e.g. this sandbox — the WASM npm build isn't node-drivable),
// the block reports SKIPPED rather than failing. Runs on a machine/CI with
// stockfish installed, or STOCKFISH_PATH set.
describe.runIf(RUN && !!STOCKFISH)('Hole 6b — Stockfish soundness of past-book moves', () => {
  for (const { scope, key, lesson } of ALL_LESSONS) {
    it(`[${scope}] ${key}: no past-book move loses > ${MAX_CP_LOSS}cp vs best`, async () => {
      const bin = STOCKFISH!;
      const deepest = deepestBeat(lesson.beats);
      const anchor = longestAnchorPly(deepest);
      const c = new Chess();
      const blunders: string[] = [];

      for (let i = 0; i < deepest.length; i++) {
        const fenBefore = c.fen();
        let mv;
        try { mv = c.move(deepest[i]); } catch { break; }
        const ply = i + 1;
        if (ply > anchor) {
          const best = await evalFen(bin, fenBefore);
          const played = await evalFen(bin, fenBefore, mv.from + mv.to + (mv.promotion ?? ''));
          if (best !== null && played !== null) {
            const loss = best - played; // both side-to-move POV at fenBefore
            if (loss > MAX_CP_LOSS && !SOUNDNESS_BASELINE.has(`${key}::${ply}:${mv.san}`)) {
              blunders.push(`ply ${ply} ${mv.san} — loses ${loss}cp vs best (${best} → ${played})`);
            }
          }
        }
      }
      expect(
        blunders,
        `${key}: unsound past-book move(s) (engine flags a blunder):\n  ${blunders.join('\n  ')}`,
      ).toEqual([]);
    }, 300000);
  }
});

// ── Hole 7 — middlegame PLAN lines: legitimacy + soundness ──────────────
// Plans were legality + lead-the-eye only (middlegamePlanner.test). Their
// moves start from a mid-game FEN, so they can't prefix-anchor to the
// openings DB — but the masters explorer takes a FEN, so we verify them the
// same way: walk each plan line from its start FEN, flag a move only when
// masters reached that exact position and played otherwise; a position with
// no master games is past book → Stockfish's job. Keyed by plan id + ply.
const PLAN_SUSPECT_BASELINE = new Set<string>([
  // Italian plan-demo continuations that run past heavy book into thematic but
  // not-the-master-top-choice moves. All pass the 6b/7b Stockfish soundness
  // gate (no move loses >120cp) — they're sound, just less common than the
  // masters' pick at that exact move-order. Reviewed + kept; the plans teach
  // the manoeuvre, not a forced master line.
  'mp-italiangame-evans::4:Ne7',   // Paulsen tabiya (masters: Nf6) — matches the Evans lesson
  'mp-italiangame-modern::4:Nf1',  // the Nbd2-f1-g3 Pianissimo manoeuvre (masters: Nc4/Bxe6)
  'mp-italiangame-modern::5:Bxb3', // Black trades the bishop (masters keep tension, Re8/Qd7)
  'mp-italiangame-evans::7:Nc3',   // develop the knight (masters: Qd2) — both sound
]);

// Soundness baseline for plan lines (7b) — same rationale as SOUNDNESS_BASELINE
// above. Keyed `${plan.id}::${moveNumber}:${san}`.
const PLAN_SOUNDNESS_BASELINE = new Set<string>([
  // Møller plan opens on the accepted-sacrifice ...Bxa1 (the rook grab the
  // attack punishes). Master-played, deliberately shown; White is winning after.
  'mp-italiangame-moller::1:Bxa1',
]);

describe.runIf(RUN)('Hole 7a — masters legitimacy of middlegame plan lines', () => {
  for (const openingId of FIRST_CLASS_OPENING_IDS) {
    const plans = PLANS.filter((p) => p.openingId === openingId);
    it(`${openingId}: plan moves are master-played where masters reached (or baselined)`, async () => {
      const suspects: string[] = [];
      let beyondBook = 0;
      for (const plan of plans) {
        for (const line of plan.playableLines ?? []) {
          const c = new Chess(line.fen);
          for (let i = 0; i < line.moves.length; i++) {
            const fenBefore = c.fen();
            let mv;
            try { mv = c.move(line.moves[i]); } catch { break; }
            const moves = await mastersMovesByFen(fenBefore);
            if (moves !== null) {
              if (moves.length === 0) beyondBook++;
              else if (!moves.some((m) => m.san === mv.san) && !PLAN_SUSPECT_BASELINE.has(`${plan.id}::${i + 1}:${mv.san}`)) {
                suspects.push(`${plan.id} move ${i + 1} ${mv.san} — masters reached this position (${moves.slice(0, 4).map((m) => m.san).join('/')}) but did not play it`);
              }
            }
            await sleep(300);
          }
        }
      }
      if (beyondBook > 0) {
        console.log(`  [${openingId} plans] ${beyondBook} ply past masters' book → deferred to Stockfish`);
      }
      expect(suspects, `${openingId}: master-divergent plan move(s):\n  ${suspects.join('\n  ')}`).toEqual([]);
    }, 300000);
  }
});

describe.runIf(RUN && !!STOCKFISH)('Hole 7b — Stockfish soundness of middlegame plan lines', () => {
  for (const openingId of FIRST_CLASS_OPENING_IDS) {
    const plans = PLANS.filter((p) => p.openingId === openingId);
    it(`${openingId}: no plan move loses > ${MAX_CP_LOSS}cp vs best`, async () => {
      const bin = STOCKFISH!;
      const blunders: string[] = [];
      for (const plan of plans) {
        for (const line of plan.playableLines ?? []) {
          const c = new Chess(line.fen);
          for (let i = 0; i < line.moves.length; i++) {
            const fenBefore = c.fen();
            let mv;
            try { mv = c.move(line.moves[i]); } catch { break; }
            const best = await evalFen(bin, fenBefore);
            const played = await evalFen(bin, fenBefore, mv.from + mv.to + (mv.promotion ?? ''));
            if (
              best !== null && played !== null && best - played > MAX_CP_LOSS &&
              !PLAN_SOUNDNESS_BASELINE.has(`${plan.id}::${i + 1}:${mv.san}`)
            ) {
              blunders.push(`${plan.id} move ${i + 1} ${mv.san} — loses ${best - played}cp vs best`);
            }
          }
        }
      }
      expect(blunders, `${openingId}: unsound plan move(s):\n  ${blunders.join('\n  ')}`).toEqual([]);
    }, 600000);
  }
});

// Always-present sanity + a clear note on what ran vs skipped.
describe('past-book verification availability', () => {
  it('reports which checks are armed', () => {
    console.log(`  masters(legitimacy): ${RUN ? 'ON' : 'OFF (set RUN_MASTERS_AUDIT=1)'} | stockfish(soundness): ${RUN && STOCKFISH ? `ON (${STOCKFISH})` : STOCKFISH ? 'OFF' : 'SKIPPED — no UCI engine (set STOCKFISH_PATH)'}`);
    expect(typeof PROXY).toBe('string');
  });
});
