// THE CORPUS SWEEP (David 2026-07-22: "My instincts tell me there are more we
// haven't identified yet. Is there a way to sweep the entire review process to
// make sure none are hiding in places we haven't yet looked?").
//
// A single game only exercises the code paths THAT game happens to hit. Board-
// awareness criminals hide in the paths a given game never touches — endgame
// phases, promotions, opposite-side castling, IQP structures, the student
// LOSING, other openings. This sweep drives the FULL production narration
// (generateReviewNarration, uncapped — seat-stamping, refrains, dedup, threats)
// over a DIVERSE corpus of REAL, validated games (src/data/model-games.json —
// 646 master games, no fabrication, G3-clean) and runs a DETERMINISTIC
// BOARD-TRUTH SCANNER over every line it emits: every "piece on square" claim
// is replayed against chess.js at that exact ply, plus the falsity-signature
// classes (tag leak, double-possessive, mate-as-pawns, durability overclaim,
// prescriptive inventory the board lacks). Any criminal hiding in an untested
// path surfaces with its game + ply + line. Baseline-free: zero violations.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';

// Engine mock — returns a LEGAL short line from each position so the eval /
// PV-dependent facets (best-line walks, deep threats, "creates a passed pawn"…)
// actually FIRE and get scanned. The earlier version returned empty analysis,
// which suppressed those facets — the blind spot that let "a your passed pawn"
// hide from the sweep (prod line-read, 2026-07-23). The moves are real board
// moves (chess.js), not a real ENGINE's choice, which is fine: this sweep tests
// board-truth of the PROSE, not move quality.
vi.mock('./stockfishEngine', async () => {
  const { Chess } = await import('chess.js');
  const legalLine = (fen: string, plies: number): string[] => {
    const uci: string[] = [];
    let c: InstanceType<typeof Chess>;
    try { c = new Chess(fen); } catch { return uci; }
    for (let i = 0; i < plies; i++) {
      const ms = c.moves({ verbose: true });
      if (!ms.length) break;
      const m = ms[i % ms.length]; // deterministic (no Math.random — banned)
      uci.push(`${m.from}${m.to}${m.promotion ?? ''}`);
      c.move(m.san);
    }
    return uci;
  };
  return {
    stockfishEngine: {
      analyzePosition: vi.fn(async (fen: string) => {
        const line = legalLine(fen, 6);
        return { evaluation: 0, bestMove: line[0] ?? null, topLines: line.length ? [{ moves: line, evaluation: 0 }] : [] };
      }),
    },
  };
});

import { generateReviewNarration } from './coachFeatureService';
import type { ReviewMoveInput } from './coachFeatureService';
import modelGamesRaw from '../data/model-games.json';

const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

import { scanLine, type Violation } from '../test/narrationScanner';

// ── Build a diverse sample of the real corpus ────────────────────────────────
interface RawGame { id?: string; pgn?: string; openingId?: string; studentSide?: string; }
const games: RawGame[] = (Array.isArray(modelGamesRaw) ? modelGamesRaw : Object.values(modelGamesRaw as Record<string, unknown>).flat()) as RawGame[];

/** Strip PGN to bare SANs (headers + move numbers + result removed). */
function pgnToSans(pgn: string): string[] {
  const c = new Chess();
  try { c.loadPgn(pgn); return c.history(); } catch { /* fall through */ }
  // Manual fallback for header-less movetext.
  const toks = pgn.replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '').replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '').trim().split(/\s+/).filter(Boolean);
  const g = new Chess(); const sans: string[] = [];
  for (const t of toks) { try { const mv = g.move(t); if (!mv) break; sans.push(mv.san); } catch { break; } }
  return sans;
}

// Sample: one game per opening (diversity), full-length (endgame coverage),
// deterministic order (no Math.random — banned + keeps the gate stable).
const seen = new Set<string>();
const candidates: Array<{ id: string; sans: string[]; studentWB: Color }> = [];
for (const g of games) {
  if (!g.pgn) continue;
  const key = g.openingId ?? g.id ?? '';
  if (seen.has(key)) continue;
  const sans = pgnToSans(g.pgn);
  if (sans.length < 24) continue; // want real games that reach a middlegame/endgame
  seen.add(key);
  const studentWB: Color = g.studentSide === 'black' ? 'b' : 'w';
  candidates.push({ id: g.id ?? key, sans, studentWB });
}
// A 24-game slice fits the test budget; SWEEP_SHARD walks other slices so the
// whole corpus can be confirmed across a few runs (the committed gate is
// shard 0; broader shards are a one-time breadth confirmation).
// 8 games with the PV/best-line facets FIRING (the pvPlayback path where
// "a your passed pawn" hid) fits the test budget; SWEEP_SHARD walks other
// slices for a broader one-time pass.
const SHARD = Number(process.env.SWEEP_SHARD ?? 0);
const SIZE = Number(process.env.SWEEP_SIZE ?? 8);
const sample = candidates.slice(SHARD * SIZE, SHARD * SIZE + SIZE);

function synthMoves(sans: string[]): ReviewMoveInput[] {
  const c = new Chess();
  const out: ReviewMoveInput[] = [];
  let prevEval = 20;
  sans.forEach((san, i) => {
    const fenBefore = c.fen();
    // Every 4th ply is marked a synthetic mistake WITH a real legal best-move
    // (≠ the played move), so the best-line facets — explainBestMoveGrounded /
    // describeMoveGeometry(bestMove) / the "here's how you take advantage" walk
    // and their seat-stamping — actually FIRE and get scanned across the corpus
    // (the blind spot that let "a your passed pawn" hide; prod line-read 2026-07-23).
    let bestMove: string | null = null;
    let classification = 'good';
    if (i % 4 === 3) {
      try {
        const alt = new Chess(fenBefore).moves({ verbose: true }).find((m) => m.san !== san);
        if (alt) { bestMove = `${alt.from}${alt.to}${alt.promotion ?? ''}`; classification = 'mistake'; }
      } catch { /* leave good */ }
    }
    c.move(san);
    // White-POV material balance × 100 — a real, board-derived eval so the
    // [eval] attribution has an honest number to explain (no mate sentinels).
    let bal = 0;
    for (const row of c.board()) for (const cell of row) if (cell && cell.type !== 'k') bal += (cell.color === 'w' ? 1 : -1) * (PIECE_PTS[cell.type] ?? 0);
    const evaluation = bal * 100;
    out.push({
      ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0,
      classification, evaluation, preMoveEval: prevEval, bestMove, fenAfter: c.fen(),
    } as unknown as ReviewMoveInput);
    prevEval = evaluation;
  });
  return out;
}

describe('review corpus sweep — no board-untrue line hides in any path (David 2026-07-22)', () => {
  it('the corpus slice is real', () => {
    expect(sample.length).toBeGreaterThanOrEqual(Math.min(6, SIZE));
  });
  // ONE TEST PER GAME (walk 5, 2026-09-23). Eight games inside one 900s test
  // measured ~95s a game — 760s on an idle machine, over 900s under ship-check's
  // parallel load — so the gate ended "Test timed out", which reads the same
  // whether the scan found nothing or never finished. Per game, each has its
  // own budget, a slow machine costs one game's verdict at most, and a
  // violation names its game in the test title. Coverage is unchanged.
  for (const game of sample) {
    it(`every emitted narration line is board-true — ${game.id}`, async () => {
      const violations: Violation[] = [];
      const moves = synthMoves(game.sans);
      const narration = await generateReviewNarration({
        moves, playerColor: game.studentWB === 'w' ? 'white' : 'black',
        openingName: null, result: '*', playerRating: 1500,
        coachNarration: 'silent', uncapped: true,
      });
      for (const seg of narration.segments) {
        if (!seg.narration) continue;
        violations.push(...scanLine(seg.narration, seg.fenAfter, game.studentWB, { game: game.id, ply: seg.ply, san: seg.san, line: seg.narration }));
      }
      for (const v of violations.slice(0, 60)) {
        console.log(`  [${v.rule}] ${v.game} ply${v.ply} ${v.san}: ${v.detail}\n    → ${v.line.slice(0, 200)}`);
      }
      expect(violations, `board-untrue lines: ${violations.slice(0, 12).map((v) => `${v.rule}@${v.game}#${v.ply}`).join(', ')}`).toEqual([]);
    }, 400_000);
  }
});
