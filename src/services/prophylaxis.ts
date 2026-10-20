// prophylaxis — STOP IT BEFORE IT LANDS (teaching census rank 2: "a modest h3
// takes g4 away from the bishop before the pin can happen; a4 stops b5 from
// arriving with tempo"). Was MISSING as a computer — only a theme tag.
//
// Read on the student's turn: what the opponent WANTS next (their move if
// they had it now — a pin of your knight or bishop against the queen or king,
// or a pawn kick on a minor), and the QUIET move of yours (a one-step pawn
// move or a king step) after which that move no longer works: the square is
// taken from them (a pawn now covers it and taking back wins material for
// you), or the pin no longer pins anything.
//
// DUAL-USE: Learn names it as advice on the student's turn (gated by the move-
// advice rule and the engine's own top lines); a review can name the quiet
// move the student skipped when the pin or kick then arrived.
// The proof is exact: the covering pawn and its capture, read off the board.
// PURE: chess.js + the legal SEE.
import { sideToMoveAs } from './threatOut';
import { openSentence } from '../utils/openSentence';
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import type { Proof } from './proof';
import type { SpokenLine } from './voicePackage';
import type { TacticType } from '../types';
import { CAPTURE_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';

export type ProphylaxisKind = 'pin' | 'kick' | 'fork';

export interface Prophylaxis {
  kind: ProphylaxisKind;
  /** Their wanted move, on the board where they would play it now. */
  intent: { san: string; from: Square; to: Square; piece: PieceSymbol };
  /** The student's piece it would pin or kick. */
  victim: { square: Square; piece: PieceSymbol };
  /** The quiet move that stops it. */
  prevention: { san: string; from: Square; to: Square; piece: PieceSymbol };
  squares: Square[];
  /** THEIR WANTED MOVE AS A FACT (OS-1 root cause 1): the line that plays it
   *  from the board where they would have it now, the squares of what it hits
   *  (attacker, victim, the piece behind a pin) and the motif. The one place
   *  "their next move pins, kicks or forks your piece" is computed — every
   *  sentence about it is rendered from here, so its answer cannot exist
   *  without it, and its claim is graded on the board it is about. */
  threat: { line: SpokenLine; squares: Square[]; motif: TacticType | null };
}

const MOTIF: Record<ProphylaxisKind, TacticType | null> = { pin: 'pin', fork: 'fork', kick: null };
const VERB: Record<ProphylaxisKind, string> = { pin: 'pin', fork: 'fork', kick: 'hit' };

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;
const VAL = CAPTURE_VALUE as Readonly<Record<PieceSymbol, number>>;

function withTurn(fen: string, turn: Color): Chess | null {
  // The one null-move rule (threatOut.sideToMoveAs, census 2026-10-10).
  const f = sideToMoveAs(fen, turn);
  return f ? new Chess(f) : null;
}

/** The student piece their move `m` pins against the queen or king (a minor
 *  with the big piece straight behind it on the line from m.to), or null. */
function pinVictim(after: Chess, m: Move, me: Color): { square: Square; piece: PieceSymbol; behind: Square } | null {
  if (m.piece !== 'b' && m.piece !== 'r' && m.piece !== 'q') return null;
  const dirs = m.piece === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : m.piece === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const f0 = m.to.charCodeAt(0) - 97;
  const r0 = Number(m.to[1]) - 1;
  for (const [df, dr] of dirs) {
    let first: { square: Square; piece: PieceSymbol } | null = null;
    for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 8 && r >= 0 && r < 8; f += df, r += dr) {
      const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
      const pc = after.get(sq);
      if (!pc) continue;
      if (pc.color !== me) break;
      if (!first) {
        if (pc.type !== 'n' && pc.type !== 'b') break;
        first = { square: sq, piece: pc.type };
        continue;
      }
      if (pc.type === 'q' || pc.type === 'k') return { ...first, behind: sq };
      break;
    }
  }
  return null;
}

/** Their moves that would pin or kick one of the student's minors right now. */
type Intent = { m: Move; kind: ProphylaxisKind; victim: { square: Square; piece: PieceSymbol }; hits: Square[] };
function intents(fen: string, me: Color): Intent[] {
  const them: Color = me === 'w' ? 'b' : 'w';
  const board = withTurn(fen, them);
  if (!board || board.inCheck()) return [];
  const out: Intent[] = [];
  for (const m of board.moves({ verbose: true })) {
    if (m.captured || m.san.includes('+')) continue;
    board.move(m);
    const after = board;
    // The move must be safe for them where it lands — a pin or kick that just
    // loses the piece is no plan of theirs.
    if (legalSeeGainFor(after.fen(), m.to, me) > 0) { board.undo(); continue; }
    if (m.piece === 'p') {
      // A pawn kick: the pawn lands hitting a student minor (or bigger), safely.
      const f = m.to.charCodeAt(0) - 97;
      const r = Number(m.to[1]) - 1 + (them === 'w' ? 1 : -1);
      for (const df of [-1, 1]) {
        if (f + df < 0 || f + df > 7 || r < 0 || r > 7) continue;
        const sq = `${String.fromCharCode(97 + f + df)}${r + 1}` as Square;
        const pc = after.get(sq);
        if (pc && pc.color === me && VAL[pc.type] >= 3 && pc.type !== 'k') {
          out.push({ m, kind: 'kick', victim: { square: sq, piece: pc.type }, hits: [sq] });
          break;
        }
      }
    } else {
      const v = pinVictim(after, m, me);
      if (v) out.push({ m, kind: 'pin', victim: { square: v.square, piece: v.piece }, hits: [v.square, v.behind] });
      else {
        // A FORK: the piece lands hitting two of the student's pieces each
        // worth more than it (or the king and one more).
        const hit: { square: Square; piece: PieceSymbol }[] = [];
        for (const row of after.board()) for (const cell of row) {
          if (!cell || cell.color !== me) continue;
          if (!after.attackers(cell.square, them).includes(m.to)) continue;
          if (cell.type === 'k' || VAL[cell.type] > VAL[m.piece]) hit.push({ square: cell.square, piece: cell.type });
        }
        if (hit.length >= 2) {
          const victim = hit.filter((h) => h.piece !== 'k').sort((a, b) => VAL[b.piece] - VAL[a.piece])[0];
          if (victim) out.push({ m, kind: 'fork', victim, hits: hit.map((h) => h.square) });
        }
      }
    }
    board.undo();
  }
  return out;
}

/** Does `intent` still work after the student's quiet move? It fails when the
 *  move is no longer legal for them, or its landing square can be taken with
 *  profit, or (a pin) it no longer pins anything. */
function stillWorks(fenAfterPrevention: string, me: Color, i: { m: Move; kind: ProphylaxisKind }): boolean {
  const them: Color = me === 'w' ? 'b' : 'w';
  const board = withTurn(fenAfterPrevention, them);
  if (!board) return false;
  const again = board.moves({ verbose: true }).find((x) => x.from === i.m.from && x.to === i.m.to);
  if (!again) return false;
  board.move(again);
  if (legalSeeGainFor(board.fen(), again.to, me) > 0) return false;
  if (i.kind === 'pin') return !!pinVictim(board, again, me);
  return true;   // a fork or kick that still lands safely still works
}

/** One of THEIR wanted moves, as a fact: the move, what it pins, forks or
 *  hits, the line that plays it from the board where they would have it, the
 *  squares and the motif. The ONE place "their next move pins, kicks or forks
 *  your piece" is computed — Learn's prevention, the obvious-stop verdict and
 *  chat's "their ideas" all read it (OS-1 root cause 1). */
export interface TheirWant {
  kind: ProphylaxisKind;
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  /** Every student piece it hits, the main victim first; for a pin, the
   *  victim and the piece behind it. */
  hit: Array<{ square: Square; piece: PieceSymbol }>;
  line: SpokenLine;
  squares: Square[];
  motif: TacticType | null;
}

/** Every move of theirs that would pin, kick or fork one of the student's
 *  pieces right now, landing safely — read on the board handed to them. */
export function theirWantedMoves(fen: string, me: Color): TheirWant[] {
  const them: Color = me === 'w' ? 'b' : 'w';
  const lineFen = sideToMoveAs(fen, them);
  if (!lineFen) return [];
  let board: Chess;
  try { board = new Chess(fen); } catch { return []; }
  return intents(fen, me).map((w) => {
    const rest = w.hits.filter((sq) => sq !== w.victim.square)
      .map((sq) => ({ square: sq, piece: board.get(sq)?.type ?? 'p' }));
    return {
      kind: w.kind, san: w.m.san, from: w.m.from, to: w.m.to, piece: w.m.piece,
      hit: [w.victim, ...rest],
      line: { fen: lineFen, sans: [w.m.san] },
      squares: [w.m.to, ...w.hits],
      motif: MOTIF[w.kind],
    };
  });
}

/** Their wanted move in words, from the student's seat. */
export function theirWantSentence(w: TheirWant, me: Color): string {
  const mv = `${me === 'w' ? '…' : ''}${w.san}`;
  const [v, ...rest] = w.hit;
  const yours = (h: { square: Square; piece: PieceSymbol }): string => `your ${NAME[h.piece]} on ${h.square}`;
  if (w.kind === 'pin') return `${mv} would pin ${yours(v)}${rest[0] ? ` against ${yours(rest[0])}` : ''}`;
  if (w.kind === 'fork') return `${mv} would fork ${[v, ...rest].map(yours).join(' and ')}`;
  return `${mv} would hit ${yours(v)}`;
}

/**
 * The prophylactic move on `fen` (the student to move), or null. Prefers the
 * PIN (it costs more if it lands); a pawn prevention before a king step.
 */
export function findProphylaxis(fen: string): Prophylaxis | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.inCheck()) return null;
  const me = board.turn();
  const ORDER: Record<ProphylaxisKind, number> = { fork: 0, pin: 1, kick: 2 };
  const wants = intents(fen, me).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  if (wants.length === 0) return null;
  const quiet = board.moves({ verbose: true }).filter((m) => !m.captured && !m.san.includes('+')
    && ((m.piece === 'p' && Math.abs(Number(m.to[1]) - Number(m.from[1])) === 1) || (m.piece === 'k' && !m.san.startsWith('O'))))
    .sort((a, b) => (a.piece === b.piece ? 0 : a.piece === 'p' ? -1 : 1));
  for (const w of wants) {
    for (const q of quiet) {
      board.move(q);
      const after = board.fen();
      board.undo();
      // The quiet move must not hand them something worse: it is safe itself.
      if (legalSeeGainFor(after, q.to, me === 'w' ? 'b' : 'w') > 0) continue;
      if (stillWorks(after, me, w)) continue;
      const them: Color = me === 'w' ? 'b' : 'w';
      const lineFen = sideToMoveAs(fen, them);
      if (!lineFen) continue;
      return {
        kind: w.kind,
        intent: { san: w.m.san, from: w.m.from, to: w.m.to, piece: w.m.piece },
        victim: w.victim,
        prevention: { san: q.san, from: q.from, to: q.to, piece: q.piece },
        squares: [w.m.to, w.victim.square, q.to],
        threat: { line: { fen: lineFen, sans: [w.m.san] }, squares: [w.m.to, ...w.hits], motif: MOTIF[w.kind] },
      };
    }
  }
  return null;
}

/** THE ONE KEY for "their next move lands on this square and hits your piece"
 *  (the pin, kick or fork they want). The full read, its held idea and the
 *  "obvious stop" that fails all make this claim, so all three carry it — the
 *  ledger and the turn's holds then see one fact however it is worded (7.O-O
 *  replay 2026-10-20: held as 'prophylaxis:g4', spoken as ':idea'). */
export function prophylaxisKey(theirSquare: string): string {
  return `prophylaxis:${theirSquare}`;
}

/** The proof: what their move would do, and why it no longer works. Exact. */
export function prophylaxisProof(p: Prophylaxis): Proof {
  const covers = p.prevention.piece === 'p'
    ? `after ${p.prevention.san} the pawn covers ${p.intent.to}`
    : `after ${p.prevention.san} it no longer works`;
  return {
    kind: 'squares', exact: true,
    short: covers,
    full: `${p.intent.san} would ${p.kind === 'pin' ? 'pin' : p.kind === 'fork' ? 'fork' : 'hit'} your ${NAME[p.victim.piece]} on ${p.victim.square}, and ${covers}`,
    squares: p.squares,
  };
}

/** The advice, with its proof. */
export function prophylaxisLine(p: Prophylaxis): string {
  // THE THREAT ONCE, THEN WHAT STOPS IT (OS-1 g2 ply 12: "h6 first — it
  // stops the pin with bishop to g5 before it lands. Bishop to g5 would pin
  // your knight on f6, and after h6 the pawn covers g5" said the pin twice).
  return `${p.prevention.san} first — ${openSentence(prophylaxisProof(p).full)}.`;
}

/** THE THREAT ALONE, proven: their move played out on the board where they
 *  would have it, and the squares it hits. Exact — chess.js legality and the
 *  pin geometry. Names no move of the student's. */
export function prophylaxisThreatProof(p: Prophylaxis): Proof {
  const what = `${p.intent.san} would ${VERB[p.kind]} your ${NAME[p.victim.piece]} on ${p.victim.square}`;
  return { kind: 'line', exact: true, short: what, full: what, line: p.threat.line, squares: p.threat.squares };
}

/** The advice with the move held: their idea, and that one move stops it —
 *  carried with the threat's proof, line and squares, never the stopping
 *  move's (that square would hand over the held move). */
export function prophylaxisIdea(p: Prophylaxis): { text: string; proof: Proof; squares: string[]; lines: SpokenLine[]; motif?: TacticType } {
  return {
    text: `Watch ${p.intent.san} — it would ${VERB[p.kind]} your ${NAME[p.victim.piece]} on ${p.victim.square}. One move stops it before it lands.`,
    proof: prophylaxisThreatProof(p),
    squares: [...p.threat.squares],
    lines: [p.threat.line],
    ...(p.threat.motif ? { motif: p.threat.motif } : {}),
  };
}
