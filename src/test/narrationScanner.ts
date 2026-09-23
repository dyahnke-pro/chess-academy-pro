// narrationScanner — the DETERMINISTIC board-truth scanner shared by every
// review sweep (the mocked-engine corpus sweep and the real-engine amateur
// sweep). One scanner, so two sweeps can never disagree about what a board-
// untrue line is. Extracted from reviewCorpusSweep.test.ts (2026-09-23).
import { Chess } from 'chess.js';
import type { Color } from 'chess.js';
import { detectTactics } from '../services/tacticsDetector';
import { tacticWinsMaterial } from '../services/pvPlayback';

/**
 * 🔴 THIS WAS A SECOND, HAND-WRITTEN COPY OF THE PRODUCT'S RULE, AND IT HAD
 * DRIFTED (found 2026-09-21). It is DELETED, not annotated.
 *
 * The scanner defined its own "is this fork/skewer meaningful" and the real one
 * lives in `pvPlayback` beside the code that emits "lands a fork". Two
 * corrections were made there and never here — the ROYAL FORK rule (2026-09-14:
 * one target being the KING makes one other winnable target enough) and
 * `winnableBy`'s king rule (2026-09-15: a king is never WON) — so the sweep
 * failed three REAL royal forks as "empty tactics" (Re1+, Qxf2+, Qf4+, every
 * one a check) and blamed the product for a rule it had not been told about.
 * The copy had even half-migrated: it carried the royal carve-out on the SKEWER
 * branch and missed it on the fork.
 *
 * THE SCANNER'S INDEPENDENCE IS NOT LOST BY SHARING THIS. What it checks is
 * that the PROSE matches the board: it still re-derives the tactic from
 * `detectTactics(fenAfter)` itself and still requires the claimed motif to be
 * made by the piece on the square the mover landed on — which is where a
 * narration can lie. "What counts as a winning fork" is a product judgement,
 * and a hand-copy of it never bought independence, only drift.
 */
const tacticIsMeaningful = (
  board: InstanceType<typeof Chess>,
  t: { type: string; involvedSquares: string[] },
): boolean => tacticWinsMaterial(board, t);
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

export interface Violation { game: string; ply: number; san: string; rule: string; detail: string; line: string; }

/** The board-truth scanner. `fenAfter` is the position at this ply; `studentWB`
 *  is the student's colour (so "your"/"their" map to a concrete colour). */
export function scanLine(line: string, fenAfter: string, studentWB: Color, ctx: Omit<Violation, 'rule' | 'detail'>): Violation[] {
  const out: Violation[] = [];
  const add = (rule: string, detail: string): void => { out.push({ ...ctx, rule, detail, line }); };
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return out; }
  const enemy: Color = studentWB === 'w' ? 'b' : 'w';

  // ── Signature classes — run on the WHOLE line (definitive, no board needed) ──
  if (/\[[a-z0-9-]+\]/i.test(line)) add('tag-leak', (line.match(/\[[a-z0-9-]+\]/i) ?? [''])[0]);
  const dbl = new RegExp(`\\b(your|their)\\s+\\w+\\s+(your|their)\\s+(?:${PIECE_WORDS})\\b`, 'i').exec(line);
  if (dbl) add('double-possessive', dbl[0]);
  // Article + possessive is also broken English ("a your passed pawn on c2") —
  // the variant the seat-stamper produced after an indefinite article
  // (prod line-read, 2026-07-23).
  const artPoss = /\b(a|an|the)\s+(your|their)\b/i.exec(line);
  if (artPoss) add('double-possessive', artPoss[0]);
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

  // TACTIC-REALITY: a "lands a fork/skewer/pin" claim on THIS move must be a
  // WINNING tactic the moved piece makes — not a bare geometric alignment on
  // defended, equal-value targets (the "Bg7 lands a skewer" leak). Present-tense
  // head only, so the PV projection tails ("…then Rg4 (lands a skewer)…", which
  // describe future positions) are excluded.
  const tacticClaim = /\bland(?:s|ed)? an? (fork|skewer|pin)\b/i.exec(head);
  if (tacticClaim) {
    const claimed = tacticClaim[1].toLowerCase();
    const landSq = ctx.san.replace(/[+#!?]+$/, '').match(/([a-h][1-8])(?!.*[a-h][1-8])/)?.[1] ?? null;
    const real = landSq !== null && detectTactics(fenAfter).tactics.some(
      (t) => t.type === claimed && t.involvedSquares[0] === landSq && tacticIsMeaningful(board, t),
    );
    if (!real) add('empty-tactic', `"lands a ${claimed}" — no winning ${claimed} by the piece on ${landSq ?? '?'}`);
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

