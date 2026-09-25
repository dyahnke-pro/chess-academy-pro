// EVERY SURFACE, EVERY POSITION, ONE STANDARD (David 2026-09-25: "Root cause
// fixes this time" / "All other coach surfaces have this standard?").
//
// Seven hand walks found the same KINDS of defect again and again, each time on
// a new surface or a new lane, because each fix was made where it was heard.
// This gate runs every narrating surface over every position of six real walk
// games (Stockfish evals, MultiPV 3, in the fixture) and fails on the kinds:
//   A. a colour as the subject ("Black hits d4") — the student is "you";
//   B. a bare detector piece ("Bishop on g4 pins…") — whose bishop?
//   C. a standing claim on a board in flux (a recapture pending);
//   D. a plan beside a mate on the board;
//   E. the same sentence twice in one utterance;
//   F. we / our / us.
// Surfaces: review (buildReviewSegments), the live composer that Learn, phase
// narration, read-position and the live coach share (computePositionFacts), the
// positional read, the Learn commentary composer, "read this position"
// (Play's tap and Learn), and chat (assessment + tactics answer).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildReviewSegments, type ReviewMoveInput } from '../services/coachFeatureService';
import { computePositionFacts } from '../services/positionFacts';
import { readPosition } from '../services/positionalRead';
import { buildPlayCommentary } from '../services/playCommentary';
import { buildTacticsLiveContext } from '../services/liveTacticsContext';
import { assemblePositionAssessment, assembleTacticsAnswer } from '../services/groundedAnswer';
import { boardStateAfter } from '../services/boardState';
import { composePositionRead } from '../services/positionReadComposer';
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';

interface Line { rank: number; evaluation: number; mate: number | null; moves: string[] }
interface Read { evaluation: number; topLines: Line[] }
interface Ply { ply: number; san: string; fenBefore: string; fenAfter: string; before: Read; after: Read }
const GAMES = JSON.parse(readFileSync('src/test/fixtures/walkGames-2026-09-25.json', 'utf8')) as Record<string, { side: 'white' | 'black'; plies: Ply[] }>;

function analysis(r: Read): StockfishAnalysis {
  const top = r.topLines[0];
  const mate = top?.mate ?? null;
  return {
    bestMove: top?.moves[0] ?? '', evaluation: r.evaluation, isMate: mate !== null, mateIn: mate,
    depth: 10, nodesPerSecond: 0,
    topLines: r.topLines.map((l) => ({ rank: l.rank, evaluation: l.evaluation, moves: l.moves, mate: l.mate })),
  } as unknown as StockfishAnalysis;
}
function uciToSan(fen: string, uci: string | undefined): string | null {
  if (!uci) return null;
  try { return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san; } catch { return null; }
}
const strip = (t: string): string => t.replace(/\[[a-z-]+\]\s*/g, '');
const sentences = (t: string): string[] => strip(t).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

export interface Violation { game: string; ply: number; surface: string; kind: string; text: string }

/** Outputs checked per surface — a surface that produced nothing would pass
 *  vacuously, so the test also asserts each one spoke. */
export const HEARD: Record<string, number> = {};

function check(v: Violation[], game: string, ply: number, surface: string, text: string, board: { inFlux: string | null; mateOnBoard: boolean }): void {
  const t = strip(text);
  if (t.trim()) HEARD[surface] = (HEARD[surface] ?? 0) + 1;
  const push = (kind: string, s: string): void => { v.push({ game, ply, surface, kind, text: s }); };
  for (const s of sentences(t)) {
    if (/\b(White|Black)(?:'s)?\s+(?:has|have|is|plays|played|hits|can|will|threatens|wins|takes|defends|king|queen|rook|bishop|knight|pawns?)\b/.test(s)) push('A colour subject', s);
    if (/(?:^|[—:;]\s*)(?:Knight|Bishop|Rook|Queen|Pawn|King) on [a-h][1-8]/.test(s)) push('B unseated piece', s);
    if (/\b(?:we|our|us)\b/i.test(s)) push('F we/our/us', s);
    if (board.inFlux && /\b(?:a|an|the) (?:piece|pawn|rook|queen|exchange|knight|bishop) up\b|\bNewly undefended\b|\bup \d+ points? of material\b/i.test(s)) push('C standing claim in flux', s);
    if (board.mateOnBoard && /\bplan\b/i.test(s)) push('D plan beside mate', s);
  }
  const seen = new Set<string>();
  for (const s of sentences(t)) {
    const k = s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (k.length > 20 && seen.has(k)) push('E said twice', s);
    seen.add(k);
  }
}

export async function sweep(): Promise<Violation[]> {
  const v: Violation[] = [];
  for (const [game, g] of Object.entries(GAMES)) {
    const studentWhite = g.side === 'white';
    const sc: 'w' | 'b' = studentWhite ? 'w' : 'b';
    const rating = Number(game.slice(0, 4)) || 1500;
    // REVIEW
    const inputs = g.plies.map((p, i) => ({
      ply: p.ply, san: p.san, fenAfter: p.fenAfter,
      isCoachMove: studentWhite ? i % 2 === 1 : i % 2 === 0,
      classification: null, preMoveEval: p.before.evaluation, evaluation: p.after.evaluation,
      bestMove: uciToSan(p.fenBefore, p.before.topLines[0]?.moves[0]),
    }) as unknown as ReviewMoveInput);
    const segs = buildReviewSegments(inputs, g.side, null as unknown as string, true, rating);
    for (const s of segs) {
      const p = g.plies[s.ply - 1];
      if (!p || !s.narration) continue;
      check(v, game, s.ply, 'review', s.narration, boardStateAfter(p.fenBefore, p.san, p.fenAfter, p.after.evaluation));
    }
    // LIVE: the composer every live surface shares, the positional read, the
    // Learn commentary, and chat — at every position the student is to move.
    for (let i = 0; i < g.plies.length; i++) {
      const p = g.plies[i];
      const toMove = p.fenAfter.split(' ')[1];
      if (toMove !== sc) continue;
      const board = boardStateAfter(p.fenBefore, p.san, p.fenAfter, p.after.evaluation);
      const prev = g.plies[i - 1];
      const pf = await computePositionFacts({
        posture: 'walk', fen: p.fenAfter, moverColor: sc, studentColor: sc, analysis: analysis(p.after),
        opponentLastMove: { fenBefore: p.fenBefore, san: p.san },
        ...(prev ? { lastMove: { fenBefore: prev.fenBefore, san: prev.san, cpLoss: null, reads: null } } : {}),
      } as unknown as Parameters<typeof computePositionFacts>[0]);
      check(v, game, p.ply, 'live composer', pf.clauses.map((c) => c.text).join(' '), board);
      check(v, game, p.ply, 'positional read', readPosition(p.fenAfter, g.side).map((o) => o.text).join(' '), board);
      const beat = buildPlayCommentary({ fen: p.fenAfter, studentColor: g.side, midExchangeOn: board.inFlux, saidExplainers: new Set(), skipSquares: new Set() } as unknown as Parameters<typeof buildPlayCommentary>[0]);
      if (beat?.spoken) check(v, game, p.ply, 'learn commentary', beat.spoken, board);
      const tctx = buildTacticsLiveContext(p.fenAfter, analysis(p.after), sc, rating);
      const assess = assemblePositionAssessment({ evalCp: p.after.evaluation, mateIn: p.after.topLines[0]?.mate ?? null, tactics: tctx, studentColor: g.side, fen: p.fenAfter });
      if (assess) check(v, game, p.ply, 'chat assessment', assess.facts, board);
      const tac = assembleTacticsAnswer(tctx, g.side);
      if (tac) check(v, game, p.ply, 'chat tactics', tac.facts, board);
      const read = await composePositionRead({
        fen: p.fenAfter, pgn: g.plies.slice(0, i + 1).map((x) => x.san).join(' '), playerColor: g.side,
        openingName: null, rating, analysis: analysis(p.after), tacticsSkill: undefined,
        studentWeaknesses: [], studentNeedContext: null,
        evalBoard: () => Promise.reject(new Error('no engine in the sweep')),
        isCancelled: () => false, corpusNotes: false,
      });
      if (read) check(v, game, p.ply, 'read position', read, board);
    }
  }
  return v;
}

describe('every coach surface, every walk position, one standard', () => {
  it('no colour subjects, bare pieces, claims in flux, plans beside mate, repeats or we/our', async () => {
    const v = await sweep();
    console.log('heard per surface', JSON.stringify(HEARD));
    const report = v.map((x) => `${x.kind} | ${x.surface} | ${x.game} ply ${x.ply} | ${x.text}`).join('\n');
    expect(v, report).toEqual([]);
    // NON-VACUOUS: every surface was actually heard, on many positions.
    for (const surface of ['review', 'live composer', 'positional read', 'learn commentary', 'chat assessment', 'chat tactics', 'read position']) {
      expect(HEARD[surface] ?? 0, `${surface} produced nothing to check`).toBeGreaterThanOrEqual(10);
    }
  }, 600_000);
});
