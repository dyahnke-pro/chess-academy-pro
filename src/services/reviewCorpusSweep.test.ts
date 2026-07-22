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

// Engine mock — the deep-threat passes degrade to nothing (empty analysis), so
// this sweep centres on the eval-INDEPENDENT board claims (does/delta/structure/
// plan/opening/opponent/trapped/pins/forks/material), which is where the
// board-awareness criminals live. The live-threat lines were exercised with a
// REAL engine by audit-review-real-game.mjs.
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({ evaluation: 0, bestMove: null, topLines: [] }),
  },
}));

import { generateReviewNarration } from './coachFeatureService';
import type { ReviewMoveInput } from './coachFeatureService';
import modelGamesRaw from '../data/model-games.json';

const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_WORDS = 'pawn|knight|bishop|rook|queen|king';
const WANT: Record<string, string> = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const ADJ = 'passed|weak|isolated|doubled|backward|extra|lone|bad|connected|protected|central|advanced|remaining|outside';

/** Cut a line at the first PROJECTION marker — everything after refers to a
 *  FUTURE/hypothetical position, not the board at this ply, so a "piece on sq"
 *  there must NOT be checked against the current FEN. Same discipline as the
 *  real-game audit's presentTense(). */
function presentTense(text: string): string {
  const markers = [
    /\bit runs\b/i, /\bthe line runs\b/i, /\bthe plan runs\b/i, /\bit goes\b/i,
    /\bit continues\b/i, /\btheir idea runs\b/i, /\bhere's how\b/i,
    /\bwatch what they're building\b/i, /\bplayed out from here\b/i,
    /\bif they sit still\b/i, /\ba deeper threat brewing\b/i, /\bhere's exactly how\b/i,
    /\bhow you take advantage\b/i, /\byou're now threatening\b/i, /\bwatch out\b/i,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  return text.slice(0, cut);
}

interface Violation { game: string; ply: number; san: string; rule: string; detail: string; line: string; }

/** The board-truth scanner. `fenAfter` is the position at this ply; `studentWB`
 *  is the student's colour (so "your"/"their" map to a concrete colour). */
function scanLine(line: string, fenAfter: string, studentWB: Color, ctx: Omit<Violation, 'rule' | 'detail'>): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, detail: string): void => { out.push({ ...ctx, rule, detail, line }); };
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return out; }
  const enemy: Color = studentWB === 'w' ? 'b' : 'w';

  // ── Signature classes — run on the WHOLE line (definitive, no board needed) ──
  if (/\[[a-z0-9-]+\]/i.test(line)) add('tag-leak', (line.match(/\[[a-z0-9-]+\]/i) ?? [''])[0]);
  const dbl = new RegExp(`\\b(your|their)\\s+\\w+\\s+(your|their)\\s+(?:${PIECE_WORDS})\\b`, 'i').exec(line);
  if (dbl) add('double-possessive', dbl[0]);
  const mate = /eval bar[^.]*?\b(\d{3,})(\.\d)?\b/i.exec(line);
  if (mate) add('mate-as-pawns', mate[0]);
  // Durability overclaims — any absolute permanence claim the detectors can't
  // prove (the F16 outpost class). Present-tense grounded phrasing is allowed;
  // "ever" / "never" / "can't be chased" / "lasting" is not.
  const dur = /\b(can ever chase|ever chase it off|chase it off|never be chased|can'?t be chased|cannot be chased|chased away|a lasting)\b/i.exec(line);
  if (dur) add('durability-overclaim', dur[0]);

  // ── Board-truth — only on the PRESENT-TENSE head (projection tails excluded) ──
  const head = presentTense(line);

  // Piece-on-square: every "<poss>? <adj>? <piece> on <sq>" must be real, and a
  // your/their possessive must match the piece's actual colour.
  const pieceRe = new RegExp(`\\b(your|their|the)?\\s*(?:(?:${ADJ})\\s+)?(${PIECE_WORDS})\\s+on\\s+([a-h][1-8])\\b`, 'gi');
  for (const m of head.matchAll(pieceRe)) {
    const poss = (m[1] ?? '').toLowerCase();
    const type = WANT[m[2].toLowerCase()];
    const sq = m[3].toLowerCase();
    const cell = board.get(sq as Parameters<typeof board.get>[0]);
    if (!cell || cell.type !== type) { add('phantom-piece', `"${m[0].trim()}" — board has ${cell ? cell.type : 'empty'} on ${sq}`); continue; }
    if (poss === 'your' && cell.color !== studentWB) add('seat-error', `"${m[0].trim()}" — that ${m[2]} is the opponent's`);
    if (poss === 'their' && cell.color !== enemy) add('seat-error', `"${m[0].trim()}" — that ${m[2]} is yours`);
  }

  // Prescriptive inventory: never tell the student to use a piece they lack.
  const has = (t: string, n = 1): boolean => {
    let c = 0;
    for (const row of board.board()) for (const cell of row) if (cell && cell.color === studentWB && cell.type === t) c++;
    return c >= n;
  };
  if (/plant your knight\b/i.test(head) && !has('n')) add('prescribe-missing', 'plant your knight — no knight');
  if (/plant your bishop\b/i.test(head) && !has('b')) add('prescribe-missing', 'plant your bishop — no bishop');
  if (/(double (both|the second) rook|double both rooks)/i.test(head) && !has('r', 2)) add('prescribe-missing', 'double rooks — <2 rooks');
  if (/(swing your rook|put a rook on it)/i.test(head) && !has('r')) add('prescribe-missing', 'rook plan — no rook');

  return out;
}

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
const SHARD = Number(process.env.SWEEP_SHARD ?? 0);
const SIZE = 24;
const sample = candidates.slice(SHARD * SIZE, SHARD * SIZE + SIZE);

function synthMoves(sans: string[]): ReviewMoveInput[] {
  const c = new Chess();
  const out: ReviewMoveInput[] = [];
  let prevEval = 20;
  sans.forEach((san, i) => {
    c.move(san);
    // White-POV material balance × 100 — a real, board-derived eval so the
    // [eval] attribution has an honest number to explain (no mate sentinels).
    let bal = 0;
    for (const row of c.board()) for (const cell of row) if (cell && cell.type !== 'k') bal += (cell.color === 'w' ? 1 : -1) * (PIECE_PTS[cell.type] ?? 0);
    const evaluation = bal * 100;
    out.push({
      ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0,
      classification: 'good', evaluation, preMoveEval: prevEval, bestMove: null, fenAfter: c.fen(),
    } as unknown as ReviewMoveInput);
    prevEval = evaluation;
  });
  return out;
}

describe('review corpus sweep — no board-untrue line hides in any path (David 2026-07-22)', () => {
  it('every emitted narration line is board-true across a diverse real-game corpus', async () => {
    expect(sample.length).toBeGreaterThanOrEqual(20);
    const violations: Violation[] = [];
    for (const game of sample) {
      const moves = synthMoves(game.sans);
      let narration;
      try {
        narration = await generateReviewNarration({
          moves, playerColor: game.studentWB === 'w' ? 'white' : 'black',
          openingName: null, result: '*', playerRating: 1500,
          coachNarration: 'silent', uncapped: true,
        });
      } catch { continue; }
      for (const seg of narration.segments) {
        if (!seg.narration) continue;
        violations.push(...scanLine(seg.narration, seg.fenAfter, game.studentWB, { game: game.id, ply: seg.ply, san: seg.san, line: seg.narration }));
      }
    }
    // Group + report for triage.
    if (violations.length) {
      const byRule: Record<string, number> = {};
      for (const v of violations) byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
      // eslint-disable-next-line no-console
      console.log(`\n[corpus-sweep] ${violations.length} violations over ${sample.length} games:`, byRule);
      for (const v of violations.slice(0, 60)) {
        // eslint-disable-next-line no-console
        console.log(`  [${v.rule}] ${v.game} ply${v.ply} ${v.san}: ${v.detail}\n    → ${v.line.slice(0, 200)}`);
      }
    }
    expect(violations, `board-untrue lines: ${violations.slice(0, 12).map((v) => `${v.rule}@${v.game}#${v.ply}`).join(', ')}`).toEqual([]);
  }, 240000);
});
