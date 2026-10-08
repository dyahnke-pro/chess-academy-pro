// Board-claim checker for authored narration (2026-10-08).
//
// The 2026-10-07 openings audit found 88 false-teaching claims in the
// Openings tab that every gate passed: "isolated" pawns with a neighbour,
// "doubled" pawns that were not, "half-open" files with pawns of both
// colours, pins through a blocking pawn, a "bishop pair" nobody held, a
// knight "no pawn can chase" with an enemy pawn one push away. The old
// fact-check gate (narrationFactCheck.test.ts) reads attack/fork claims
// about the piece that just moved and nothing else.
//
// This reads the STRUCTURAL claims a sentence makes and checks each against
// the board. A claim passes if it holds on the position after the beat OR
// the one before it (narration describes the move that just landed, so
// either board is honest). Every pattern is anchored on a square or file
// the sentence names, so a claim without a concrete anchor is not judged —
// a missed check is a smaller harm than a gate that cries wolf.

import { Chess, type Square } from 'chess.js';

export interface BoardClaimViolation {
  claim: string;
  why: string;
}

type Color = 'w' | 'b';
const FILES = 'abcdefgh';
const PIECE_LETTER: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

function pawnFiles(chess: Chess, color: Color): number[] {
  const counts = new Array<number>(8).fill(0);
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type === 'p' && sq.color === color) counts[FILES.indexOf(sq.square[0])]++;
  }
  return counts;
}

function isIsolatedAt(chess: Chess, square: string): boolean {
  const p = chess.get(square as Square);
  if (!p || p.type !== 'p') return false;
  const f = FILES.indexOf(square[0]);
  const files = pawnFiles(chess, p.color);
  return (f === 0 || files[f - 1] === 0) && (f === 7 || files[f + 1] === 0);
}

function fileIsolated(chess: Chess, file: string): boolean {
  const f = FILES.indexOf(file);
  return (['w', 'b'] as Color[]).some((c) => {
    const files = pawnFiles(chess, c);
    return files[f] > 0 && (f === 0 || files[f - 1] === 0) && (f === 7 || files[f + 1] === 0);
  });
}

function fileDoubled(chess: Chess, file: string): boolean {
  const f = FILES.indexOf(file);
  return pawnFiles(chess, 'w')[f] >= 2 || pawnFiles(chess, 'b')[f] >= 2;
}

function anyDoubled(chess: Chess): boolean {
  return pawnFiles(chess, 'w').some((n) => n >= 2) || pawnFiles(chess, 'b').some((n) => n >= 2);
}

function fileState(chess: Chess, file: string): 'open' | 'half-open' | 'closed' {
  const f = FILES.indexOf(file);
  const w = pawnFiles(chess, 'w')[f];
  const b = pawnFiles(chess, 'b')[f];
  if (w === 0 && b === 0) return 'open';
  if (w === 0 || b === 0) return 'half-open';
  return 'closed';
}

function hasBishopPair(chess: Chess, color: Color): boolean {
  let light = false; let dark = false;
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type === 'b' && sq.color === color) {
      const isLight = (FILES.indexOf(sq.square[0]) + Number(sq.square[1])) % 2 === 1;
      if (isLight) light = true; else dark = true;
    }
  }
  return light && dark;
}

/** The piece on `square` is pinned: an enemy slider sees it along a clear
 *  line, and behind it on the same line stands a more valuable piece of
 *  its own colour (or its king). */
function isPinnedAt(chess: Chess, square: string): boolean {
  const piece = chess.get(square as Square);
  if (!piece) return false;
  const f0 = FILES.indexOf(square[0]); const r0 = Number(square[1]);
  const dirs: Array<[number, number, 'line' | 'diag']> = [
    [1, 0, 'line'], [-1, 0, 'line'], [0, 1, 'line'], [0, -1, 'line'],
    [1, 1, 'diag'], [1, -1, 'diag'], [-1, 1, 'diag'], [-1, -1, 'diag'],
  ];
  const at = (f: number, r: number): ReturnType<Chess["get"]> | null | undefined =>
    f < 0 || f > 7 || r < 1 || r > 8 ? undefined : chess.get(`${FILES[f]}${r}` as Square) ?? null;
  for (const [df, dr, kind] of dirs) {
    // Walk toward the attacker.
    let f = f0 + df; let r = r0 + dr; let attacker = null as ReturnType<typeof at>;
    for (;;) { const s = at(f, r); if (s === undefined) break; if (s) { attacker = s; break; } f += df; r += dr; }
    if (!attacker || attacker.color === piece.color) continue;
    const slides = kind === 'line' ? ['r', 'q'] : ['b', 'q'];
    if (!slides.includes(attacker.type)) continue;
    // Walk the other way for the piece behind.
    f = f0 - df; r = r0 - dr; let behind = null as ReturnType<typeof at>;
    for (;;) { const s = at(f, r); if (s === undefined) break; if (s) { behind = s; break; } f -= df; r -= dr; }
    if (!behind || behind.color !== piece.color) continue;
    if (behind.type === 'k' || VALUE[behind.type] > VALUE[piece.type] || behind.type === 'q') return true;
  }
  return false;
}

function anyPinnedOfType(chess: Chess, type: string): boolean {
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type === type && isPinnedAt(chess, sq.square)) return true;
  }
  return false;
}

/** An enemy pawn can ever attack `square`: one on an adjacent file that has
 *  not yet passed the attacking rank. */
function pawnCanEverChase(chess: Chess, square: string, owner: Color): boolean {
  const enemy: Color = owner === 'w' ? 'b' : 'w';
  const f = FILES.indexOf(square[0]); const r = Number(square[1]);
  // Black pawns attack downward: a black pawn on rank R attacks rank R-1.
  // It can reach rank r+1 (to hit r) only if it now stands on rank >= r+1.
  for (const df of [-1, 1]) {
    const ff = f + df; if (ff < 0 || ff > 7) continue;
    for (let rr = 1; rr <= 8; rr++) {
      const s = chess.get(`${FILES[ff]}${rr}` as Square);
      if (!s || s.type !== 'p' || s.color !== enemy) continue;
      if (enemy === 'b' ? rr >= r + 1 : rr <= r - 1) return true;
    }
  }
  return false;
}

function materialDiff(chess: Chess): number {
  let d = 0;
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type !== 'k') d += (sq.color === 'w' ? 1 : -1) * VALUE[sq.type];
  }
  return d;
}

function pieceOn(chess: Chess, square: string, type: string): boolean {
  const p = chess.get(square as Square);
  return !!p && p.type === type;
}

interface Check { re: RegExp; test: (chess: Chess, m: RegExpMatchArray) => boolean; why: (m: RegExpMatchArray) => string }

function anyIsolatedD(chess: Chess): boolean { return fileIsolated(chess, 'd'); }

function kingCastled(chess: Chess, color: Color): boolean {
  for (const row of chess.board()) for (const sq of row) {
    if (sq && sq.type === 'k' && sq.color === color) {
      return color === 'w' ? ['g1', 'c1', 'b1', 'h1'].includes(sq.square) : ['g8', 'c8', 'b8', 'h8'].includes(sq.square);
    }
  }
  return false;
}

const COUNT: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };
/** Material from `side`'s seat in pawns (minor 3, rook 5, queen 9). */
function balanceFor(chess: Chess, side: Color): number {
  const d = materialDiff(chess);
  return side === 'w' ? d : -d;
}

const SQ = '([a-h][1-8])';
const FILE = '([a-h])';

const CHECKS: Check[] = [
  // "isolated d-pawn", "the isolated pawn on d4", "the d4-pawn is isolated"
  { re: new RegExp(`\\bisolated (?:queen'?s? )?${FILE}-pawns?\\b`, 'gi'),
    test: (c, m) => fileIsolated(c, m[1].toLowerCase()),
    why: (m) => `no isolated pawn on the ${m[1]}-file` },
  { re: new RegExp(`\\bisolated pawn on ${SQ}\\b`, 'gi'),
    test: (c, m) => isIsolatedAt(c, m[1]), why: (m) => `the pawn on ${m[1]} is not isolated (or not there)` },
  { re: new RegExp(`\\b${SQ}-pawn (?:is|stays|remains|becomes|now) (?:an? )?isolated\\b`, 'gi'),
    test: (c, m) => isIsolatedAt(c, m[1]), why: (m) => `the pawn on ${m[1]} is not isolated (or not there)` },
  // IQP / isolani with no square named
  { re: /\b(?:the |an |this )?(?:isolated queen'?s pawn|isolani|IQP)\b/gi,
    test: (c) => anyIsolatedD(c), why: () => 'no isolated d-pawn on the board' },
  { re: new RegExp(`\\bthe ${SQ}-pawn (?:is )?isolated\\b`, 'gi'),
    test: (c, m) => isIsolatedAt(c, m[1]), why: (m) => `the pawn on ${m[1]} is not isolated (or not there)` },
  // doubled
  { re: new RegExp(`\\bdoubled (?:white |black )?${FILE}-pawns?\\b`, 'gi'),
    test: (c, m) => fileDoubled(c, m[1].toLowerCase()), why: (m) => `no doubled pawns on the ${m[1]}-file` },
  { re: new RegExp(`\\bdoubled ${FILE}[1-8]-pawn\\b`, 'gi'),
    test: (c, m) => fileDoubled(c, m[1].toLowerCase()), why: (m) => `no doubled pawns on the ${m[1]}-file` },
  { re: new RegExp(`\\bdoubled [a-z]+ on the ${FILE}-file\\b`, 'gi'),
    test: (c, m) => fileDoubled(c, m[1].toLowerCase()), why: (m) => `no doubled pawns on the ${m[1]}-file` },
  // castling credited to a side
  { re: /\b(White|Black) (?:now |then |calmly |finally )?castles\b/g,
    test: (c, m) => kingCastled(c, m[1] === 'White' ? 'w' : 'b'), why: (m) => `${m[1]}'s king has not castled` },
  { re: /\bBoth sides (?:have )?castle(?:d)?\b/g,
    test: (c) => kingCastled(c, 'w') && kingCastled(c, 'b'), why: () => 'both kings have not castled' },
  // pawn counts credited to a side
  { re: /\b(White|Black) (?:is |stays |remains )?(?:still |now |nominally |clearly |simply )?(a|an|one|two|three) (?:clean |full |whole )?pawns? (up|down|ahead|behind)\b/g,
    test: (c, m) => {
      const n = COUNT[m[2].toLowerCase()]; const b = balanceFor(c, m[1] === 'White' ? 'w' : 'b');
      const want = /up|ahead/.test(m[3]) ? n : -n;
      return Math.abs(b - want) < 1;
    },
    why: (m) => `${m[1]} is not ${m[2]} pawn(s) ${m[3]}` },
  { re: /\b(White|Black) (?:is |stays |remains )?(?:still |now )?(?:a |the )?(?:clean )?(?:exchange|piece) (up|down)\b/g,
    test: (c, m) => { const b = balanceFor(c, m[1] === 'White' ? 'w' : 'b'); return m[2] === 'up' ? b >= 1 : b <= -1; },
    why: (m) => `${m[1]} is not material ${m[2]}` },
  { re: new RegExp(`\\bdoubled ${FILE}-pawns\\b`, 'gi'),
    test: (c, m) => fileDoubled(c, m[1].toLowerCase()), why: (m) => `no doubled pawns on the ${m[1]}-file` },
  { re: new RegExp(`\\bdoubled pawns on the ${FILE}-file\\b`, 'gi'),
    test: (c, m) => fileDoubled(c, m[1].toLowerCase()), why: (m) => `no doubled pawns on the ${m[1]}-file` },
  { re: /\b(?:has|have|left with|saddled with|stuck with) (?:a set of |a pair of )?doubled pawns\b/gi,
    test: (c) => anyDoubled(c), why: () => 'no doubled pawns on the board' },
  // half-open / open files
  { re: new RegExp(`\\b(?:half|semi)-open ${FILE}-file\\b`, 'gi'),
    test: (c, m) => fileState(c, m[1].toLowerCase()) === 'half-open',
    why: (m) => `the ${m[1]}-file is not half-open` },
  { re: new RegExp(`\\bthe (?:now[- ])?open ${FILE}-file\\b`, 'gi'),
    test: (c, m) => fileState(c, m[1].toLowerCase()) === 'open', why: (m) => `the ${m[1]}-file is not open` },
  // bishop pair
  { re: /\b(?:has|have|holds?|keeps?|owns?|retains?|with|enjoys?) the (?:(?:two[- ])?bishop[- ]pair|two bishops)\b(?!'s)/gi,
    test: (c) => hasBishopPair(c, 'w') !== hasBishopPair(c, 'b'),
    why: () => 'neither side alone holds the bishop pair' },
  // pins with a named square
  { re: new RegExp(`\\bpins? the ${SQ}-(knight|bishop|rook|queen|pawn)\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[1], PIECE_LETTER[m[2].toLowerCase()]) && isPinnedAt(c, m[1]),
    why: (m) => `the ${m[2]} on ${m[1]} is not pinned` },
  { re: new RegExp(`\\bpins? the (knight|bishop|rook|queen|pawn) on ${SQ}\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[2], PIECE_LETTER[m[1].toLowerCase()]) && isPinnedAt(c, m[2]),
    why: (m) => `the ${m[1]} on ${m[2]} is not pinned` },
  { re: new RegExp(`\\b(?:pinning|pins) the ${SQ}-(knight|bishop|rook|queen|pawn)\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[1], PIECE_LETTER[m[2].toLowerCase()]) && isPinnedAt(c, m[1]),
    why: (m) => `the ${m[2]} on ${m[1]} is not pinned` },
  { re: new RegExp(`\\bthe pin on (?:the )?${SQ}\\b(?!'s)`, 'gi'),
    test: (c, m) => isPinnedAt(c, m[1]), why: (m) => `nothing on ${m[1]} is pinned` },
  { re: new RegExp(`\\bthe ${SQ}-(knight|bishop|rook|queen|pawn) (?:is |stays |remains )?pinned\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[1], PIECE_LETTER[m[2].toLowerCase()]) && isPinnedAt(c, m[1]),
    why: (m) => `the ${m[2]} on ${m[1]} is not pinned` },
  // "pins the knight" with no square: some knight must be pinned
  { re: /\b(?:pins|pinning) the (knight|bishop|rook|queen)\b(?! (?:on|to|against))/gi,
    test: (c, m) => anyPinnedOfType(c, PIECE_LETTER[m[1].toLowerCase()]),
    why: (m) => `no ${m[1]} is pinned` },
  // piece named on a square: "the f5-knight", "the knight on f5"
  { re: new RegExp(`\\bthe ${SQ}-(knight|bishop|rook|queen)\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[1], PIECE_LETTER[m[2].toLowerCase()]),
    why: (m) => `no ${m[2]} stands on ${m[1]}` },
  { re: new RegExp(`\\bthe (knight|bishop|rook|queen) on ${SQ}\\b`, 'gi'),
    test: (c, m) => pieceOn(c, m[2], PIECE_LETTER[m[1].toLowerCase()]),
    why: (m) => `no ${m[1]} stands on ${m[2]}` },
  // "can never be chased by a pawn" / "no pawn can ever chase"
  { re: new RegExp(`\\b(?:knight|bishop|piece|outpost) on ${SQ}[^.]{0,60}?(?:can(?:not|'t)|never|no pawn can) (?:ever )?(?:be )?(?:chased|kicked|dislodged|challenged) (?:away )?by (?:a|any) pawn`, 'gi'),
    test: (c, m) => {
      const p = c.get(m[1] as Square);
      return !!p && !pawnCanEverChase(c, m[1], p.color);
    },
    why: (m) => `an enemy pawn can still advance to attack ${m[1]}` },
  // material level / up
  { re: /\b(?:material is (?:level|equal|even)|level material|material level|equal material|material balance is restored)\b/gi,
    test: (c) => materialDiff(c) === 0, why: () => 'material is not level' },
];

/** A claim passes if it holds on ANY board in `window` — the positions the
 *  sentence narrates (a beat recounts the last few moves, so "recaptures with
 *  the d7-knight" names a knight that has since moved). The window is the
 *  caller's to size; it never reaches past the line being spoken. */
/** Words that put a claim in the future, a condition, a comparison or
 *  another game ("will park the bishop on g7", "if Black takes, the doubled
 *  pawns arrive", "the way it does in the Nf6 line"). Such a claim is not
 *  about this board, so it is not judged against it. Looked for in the
 *  clause before the claim (back to the last sentence or dash break). */
const NOT_THIS_BOARD = /\b(?:will|would|if|once|after|later|preparing|prepares|prepare|to (?:plant|place|park|fianchetto)|park|looming|coming|arrive|arrives|either|compare|instead of|the way it does|original players|lets|could|can|threatens? to|aim|aiming to|heading|emerge|looming|gone|games|after a later|after the recapture|transposes|territory|structure|road|fight)\b/i;

function clauseBefore(text: string, index: number): string {
  const head = text.slice(0, index);
  const cut = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('— '));
  return head.slice(cut + 1);
}

export function checkBoardClaims(window: Chess[], text: string): BoardClaimViolation[] {
  const out: BoardClaimViolation[] = [];
  for (const chk of CHECKS) {
    for (const m of text.matchAll(chk.re)) {
      if (window.some((c) => chk.test(c, m))) continue;
      const end = (m.index ?? 0) + m[0].length;
      const after = text.slice(end, end + 50).split(/[.!?—;(]/)[0];
      if (NOT_THIS_BOARD.test(clauseBefore(text, m.index ?? 0) + ' ' + m[0] + after)) continue;
      out.push({ claim: m[0], why: chk.why(m) });
    }
  }
  return out;
}

/** Replay SAN from a start FEN; returns the boards after each of the last
 *  `span` moves (plus the one before them), or null on an illegal move. */
export function boardsFor(moves: string[], startFen?: string, span = 6): Chess[] | null {
  const game = startFen ? new Chess(startFen) : new Chess();
  const boards: Chess[] = [new Chess(game.fen())];
  for (const san of moves) {
    try { game.move(san); } catch { return null; }
    boards.push(new Chess(game.fen()));
  }
  return boards.slice(-(span + 1));
}
