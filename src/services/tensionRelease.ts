// tensionRelease — "TO TAKE IS A MISTAKE": WHAT TAKING FIRST HANDS THEM (2026-11-19).
//
// `speedRunReads.keepTension` says "keep the tension" when a pawn-takes-pawn
// capture exists and the engine's best is quiet — but only for pawns, and never
// WHY. Danya's rule is about the why: the side that captures first lets the
// other side recapture with a gain — a piece developed, a file opened for a
// rook, a bishop let out, a pawn into the centre, or your own pawn left
// isolated. This computer reads that gain off the board after your capture and
// their recapture, so the sentence names the concrete thing taking gives away.
//
// Two reads, one engine of facts:
//   - `tensionKept` (before the move): a TENSION CAPTURE (pawn takes pawn, or a
//     piece takes a piece of equal value that can be taken back) is on the
//     board, the engine's best is quiet, and the engine's own line for the
//     capture is ≥ KEEP_GAP_CP worse (a capture outside the lines is never
//     claimed: it may be only a hair behind the last line). Silent when the
//     recapture gains them nothing the board can name (empty > generic).
//   - `tensionReleased` (after the move, Review/Learn): the student made such a
//     capture while the engine's quiet best was ≥ RELEASE_GAP_CP better — said
//     in the past tense with what it gave them.
//
// PURE: chess.js plus the engine lines the caller already holds (G0).
import { computeMustDefend } from './threatOut';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';
import { isMinorAtHome } from './development';
import { pieceScope } from './positionReadingService';
import { moverCp } from './winChance';
import { andList } from '../utils/andList';

/** An engine line as the board-facts tape carries it: UCI moves, White-POV centipawns. */
export interface TensionLine { moves: readonly string[]; cp: number | null; mate: number | null }

export type TensionGainKind = 'develops' | 'opens-file' | 'frees-piece' | 'takes-centre' | 'isolates-pawn';
export interface TensionGain { kind: TensionGainKind; text: string; squares: Square[] }

export interface TensionRead {
  /** The capture that releases the tension (SAN). */
  capture: string;
  /** Their recapture read off the board (SAN). */
  recapture: string;
  /** The engine's quiet best (SAN). */
  best: string;
  /** How much worse the capture is, mover's centipawns; null when the capture is in no engine line. */
  gapCp: number | null;
  gains: TensionGain[];
  text: string;
  squares: Square[];
}

/** The capture must be this much worse than the quiet best before the board says "keep it". */
export const KEEP_GAP_CP = 30;
/** A played capture that cost this much against the quiet best is a released tension. */
export const RELEASE_GAP_CP = 50;

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function lineCp(fen: string, l: TensionLine): number {
  return moverCp(fen, { evaluation: l.cp ?? 0, mate: l.mate });
}

function uciOf(m: Move): string {
  return `${m.from}${m.to}${m.promotion ?? ''}`;
}

/** A capture that keeps material level when taken back: pawn takes pawn, or a piece takes an equal-valued piece the opponent can recapture. */
export function isTensionCapture(fen: string, m: Move): boolean {
  if (!m.captured || m.isEnPassant() || m.piece === 'k') return false;
  if (m.piece === 'p') return m.captured === 'p';
  if (m.captured === 'p' || MATERIAL_VALUE[m.piece] !== MATERIAL_VALUE[m.captured]) return false;
  const after = new Chess(fen);
  after.move(m.san);
  return after.moves({ verbose: true }).some((r) => r.to === m.to && !!r.captured);
}

/** Their recaptures on the capture square, best-first: the engine's own reply when a line holds it, then the one with the most gains, then the cheapest piece. */
function recaptureFor(fen: string, capture: Move, lines: readonly TensionLine[], reply: string | null): Move | null {
  const after = new Chess(fen);
  after.move(capture.san);
  const options = after.moves({ verbose: true }).filter((r) => r.to === capture.to && !!r.captured);
  if (!options.length) return null;
  if (reply) {
    const hit = options.find((r) => r.san === reply || uciOf(r) === reply);
    if (hit) return hit;
  }
  const fromLine = lines.find((l) => l.moves[0] === uciOf(capture))?.moves[1];
  if (fromLine) {
    const hit = options.find((r) => uciOf(r) === fromLine);
    if (hit) return hit;
  }
  return options
    .map((r) => ({ r, n: gainsOf(fen, capture, r).length }))
    .sort((a, b) => b.n - a.n || MATERIAL_VALUE[a.r.piece] - MATERIAL_VALUE[b.r.piece])[0].r;
}

function pawnFiles(c: Chess, col: Color): Set<string> {
  const files = new Set<string>();
  for (const row of c.board()) for (const p of row) if (p && p.type === 'p' && p.color === col) files.add(p.square[0]);
  return files;
}

function pawnsOf(c: Chess, col: Color): Square[] {
  const out: Square[] = [];
  for (const row of c.board()) for (const p of row) if (p && p.type === 'p' && p.color === col) out.push(p.square);
  return out;
}

function isolated(files: Set<string>, sq: string): boolean {
  const f = sq.charCodeAt(0);
  return !files.has(String.fromCharCode(f - 1)) && !files.has(String.fromCharCode(f + 1));
}

/** What their recapture gains, read off the board before your capture and after their recapture. */
export function gainsOf(fen: string, capture: Move, recapture: Move): TensionGain[] {
  const before = new Chess(fen);
  const after = new Chess(fen);
  after.move(capture.san);
  after.move(recapture.san);
  const me = capture.color;
  const them = other(me);
  const gains: TensionGain[] = [];

  if (isMinorAtHome(recapture.piece, them, recapture.from)) {
    gains.push({ kind: 'develops', text: `develops their ${NAME[recapture.piece]} from ${recapture.from}`, squares: [recapture.from, recapture.to] });
  }

  if (recapture.piece === 'p' && recapture.from[0] !== recapture.to[0]) {
    const file = recapture.from[0];
    if (pawnFiles(before, them).has(file) && !pawnFiles(after, them).has(file)) {
      const heavy = after.board().flat().find((p) => p && p.color === them && (p.type === 'r' || p.type === 'q') && p.square[0] === file);
      if (heavy) gains.push({ kind: 'opens-file', text: `opens the ${file}-file for their ${NAME[heavy.type]} on ${heavy.square}`, squares: [heavy.square, `${file}${them === 'w' ? 2 : 7}` as Square] });
    }
    if (['d4', 'e4', 'd5', 'e5'].includes(recapture.to)) {
      gains.push({ kind: 'takes-centre', text: `puts their pawn in the centre on ${recapture.to}`, squares: [recapture.to] });
    }
  }

  // A long-range piece of theirs (not the recapturer) that sees clearly more after the exchange.
  for (const row of after.board()) {
    for (const p of row) {
      if (!p || p.color !== them || !['b', 'r', 'q'].includes(p.type) || p.square === recapture.to) continue;
      if (gains.some((g) => g.kind === 'opens-file' && g.squares[0] === p.square)) continue;
      const was = before.get(p.square);
      if (!was || was.type !== p.type || was.color !== them) continue;
      const gain = pieceScope(after, p.square) - pieceScope(before, p.square);
      if (gain >= 3) gains.push({ kind: 'frees-piece', text: `frees their ${NAME[p.type]} on ${p.square}`, squares: [p.square] });
    }
  }

  const myFilesBefore = pawnFiles(before, me);
  const myFilesAfter = pawnFiles(after, me);
  for (const sq of pawnsOf(after, me)) {
    // A rim pawn alone is rarely the point; an isolated pawn from the b- to g-file is a target.
    if (sq[0] === 'a' || sq[0] === 'h') continue;
    if (isolated(myFilesAfter, sq) && !isolated(myFilesBefore, sq)) {
      gains.push({ kind: 'isolates-pawn', text: `leaves your pawn on ${sq} isolated`, squares: [sq] });
    }
  }
  return gains;
}

interface Candidate { capture: Move; recapture: Move; gains: TensionGain[]; gapCp: number | null; best: string }

function bestQuiet(fen: string, lines: readonly TensionLine[]): { san: string; cp: number } | null {
  if (!lines.length || !lines[0].moves.length) return null;
  const top = lines[0];
  const c = new Chess(fen);
  let m: Move;
  try { m = c.move(top.moves[0]); } catch { return null; }
  if (m.captured) return null;
  return { san: m.san, cp: lineCp(fen, top) };
}

function readCapture(fen: string, capture: Move, lines: readonly TensionLine[], best: { san: string; cp: number }, reply: string | null): Candidate | null {
  const recapture = recaptureFor(fen, capture, lines, reply);
  if (!recapture) return null;
  const gains = gainsOf(fen, capture, recapture);
  if (!gains.length) return null;
  const line = lines.find((l) => l.moves[0] === uciOf(capture));
  const gapCp = line ? best.cp - lineCp(fen, line) : null;
  return { capture, recapture, gains, gapCp, best: best.san };
}

function describe(m: Move): string {
  return m.piece === 'p' ? `the ${m.from[0]}-pawn` : `the ${NAME[m.piece]}`;
}

/** BEFORE the move: a tension capture the engine wants left alone, and what taking first would hand them. */
export function tensionKept(fen: string, lines: readonly TensionLine[]): TensionRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  // A piece of the side to move hit by a cheaper piece is the board's
  // question, not the tension (decision baseline 2026-11-19: "Keep the
  // tension" said to a queen a bishop attacked). Two equal pieces eyeing each
  // other ARE the tension.
  const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  if (computeMustDefend(fen, c.turn()).pieces.some((p) => p.attacker !== null && (VAL[p.attacker] ?? 0) < (VAL[p.piece] ?? 0))) return null;
  const best = bestQuiet(fen, lines);
  if (!best) return null;
  const reads: Candidate[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (!isTensionCapture(fen, m)) continue;
    const r = readCapture(fen, m, lines, best, null);
    if (!r) continue;
    // The engine must have read the capture and found it worse: a capture
    // outside the lines may be only a hair behind the third line.
    if (r.gapCp === null || r.gapCp < KEEP_GAP_CP) continue;
    reads.push(r);
  }
  if (!reads.length) return null;
  const r = reads.sort((a, b) => b.gains.length - a.gains.length || (b.gapCp ?? 0) - (a.gapCp ?? 0))[0];
  const text = `Keep the tension. If you take on ${r.capture.to} with ${describe(r.capture)}, they take back with ${describe(r.recapture)}, and that ${andList(r.gains.map((g) => g.text))}.`;
  return finish(r, text);
}

/**
 * AFTER the move: the student captured and released tension the engine wanted
 * kept. `playedCp` is the played move's value for the mover when the caller has
 * it (the review's own read); otherwise the engine lines must hold the capture.
 * `reply` is their actual recapture when it has been played.
 */
export function tensionReleased(fenBefore: string, playedSan: string, lines: readonly TensionLine[], playedCp: number | null, reply: string | null): TensionRead | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  let m: Move;
  try { m = c.move(playedSan); } catch { return null; }
  if (!isTensionCapture(fenBefore, m)) return null;
  const best = bestQuiet(fenBefore, lines);
  if (!best) return null;
  const r = readCapture(fenBefore, m, lines, best, reply);
  if (!r) return null;
  const gap = playedCp !== null ? best.cp - playedCp : r.gapCp;
  if (gap === null || gap < RELEASE_GAP_CP) return null;
  r.gapCp = gap;
  const text = `Taking on ${m.to} released the tension too early. They take back with ${describe(r.recapture)}, and that ${andList(r.gains.map((g) => g.text))}. ${r.best} kept it.`;
  return finish(r, text);
}

function finish(r: Candidate, text: string): TensionRead {
  const squares = [...new Set([r.capture.from, r.capture.to, ...r.gains.flatMap((g) => g.squares)])] as Square[];
  return { capture: r.capture.san, recapture: r.recapture.san, best: r.best, gapCp: r.gapCp, gains: r.gains, text, squares };
}
