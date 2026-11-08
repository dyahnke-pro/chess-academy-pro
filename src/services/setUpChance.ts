/**
 * THE TACTIC YOU CAN SET UP — moment 3 of the coach beside you (WO-COACH-NEXT-
 * TO-YOU-01: "Nothing tactical yet — the plan that builds one"; David
 * 2026-11-07: "Let's strengthen moment 3 … More tactics the better. I want my
 * app heavy in teaching tactics").
 *
 * Two readers, both vouched by the engine's own lines from the student's board
 * (a line within half a pawn of the best), so a set-up is never a move that
 * loses:
 *  - THE STRIKE: the line's first move is quiet (no capture, no check), and
 *    the line wins material or mates one or two of the student's moves later
 *    (`pvGainDepth`); the strike is named by the ONE classifier
 *    (`detectTacticType`), so every motif it knows — fork, pin, skewer,
 *    discovery, mate, deflection, the trapped piece, … — is taught the same
 *    way it is recorded.
 *  - THE PIN: the line's first move pins a piece of theirs to their king or
 *    queen (`pinGeometry.findPins`, a pin the piece cannot walk out of), the
 *    pinning piece safe where it lands.
 *
 * Said in held form (LEARN NAMES NO MOVE UNASKED): the tactic and its targets,
 * never the move. A pointer at the student's next decision (`HeldForm.points`,
 * the motif's own skill), so the record decides whether it is said.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { pvGainDepth, pvGain } from './tacticGeometry';
import { detectTacticType } from './missedTacticService';
import { findPins } from './pinGeometry';
import { MOTIF_OF_TACTIC, MOTIFS, type MotifId } from '../data/tacticMotifs';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnalysisLine } from '../types';
import { andList } from '../utils/andList';
import { CAPTURE_VALUE } from './pieceValues';

const VALUE = CAPTURE_VALUE;
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** A set-up line must be this close to the engine's best (centipawns). */
export const SET_UP_SOUND_CP = 50;
/** The strike must net this much (pawns) — a piece or the exchange and more. */
export const SET_UP_GAIN = 2;
/** It lands on the student's second or third move. */
const SET_UP_MAX_DEPTH = 3;

/** How each motif is set up, in words: "sets up ___". */
const SET_UP_WORDS: Record<MotifId, string> = {
  'free-piece': 'a free piece to take',
  fork: 'a fork',
  pin: 'a pin',
  skewer: 'a skewer',
  'discovered-attack': 'a discovered attack',
  'discovered-check': 'a discovered check',
  'x-ray': 'an x-ray',
  mate: 'mate',
  promotion: 'a pawn that promotes',
  'double-check': 'a double check',
  'removing-the-guard': 'taking out a defender',
  overload: 'an overloaded defender to hit',
  deflection: 'a deflection',
  zwischenzug: 'an in-between move',
  'trapped-piece': 'a trapped piece',
  clearance: 'a clearance',
  interference: 'an interference',
};

export interface SetUpChance {
  kind: 'strike' | 'pin';
  motif: MotifId;
  /** The quiet move that sets it up (UCI and SAN) — held, never said. */
  uci: string;
  san: string;
  /** The student's move the payoff lands on: 2 = next move, 3 = the one after. */
  depth: number;
  /** What the line nets (pawns; 100 = mate). */
  gain: number;
  /** The strike itself gives mate (the board after it is checkmate). A
   *  'mate' motif that does not is a mating THREAT that wins material. */
  mates: boolean;
  /** What the line wins: the piece the strike takes, else the prize taken
   *  after it. */
  captured: PieceSymbol | null;
  /** The strike itself takes `captured` (a fork that checks takes later). */
  strikeTakes: boolean;
  /** A pin whose pinned piece has no legal move at all. */
  frozen: boolean;
  /** Their pieces the payoff hits, strongest first (by type): a fork's
   *  targets, the trapped piece, the pinned piece and what is behind it. */
  targets: PieceSymbol[];
  /** The squares of those pieces (lit when said, never read out). */
  squares: string[];
  /** The engine line, UCI, from the student's board. */
  line: readonly string[];
}

function play(c: Chess, uci: string): boolean {
  try { c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci[4] } : {}) }); return true; } catch { return false; }
}

/** Their pieces (a knight or more, or the king) the piece on `sq` hits. */
function hitsFrom(c: Chess, sq: Square, by: Color): Array<{ type: PieceSymbol; square: Square }> {
  const out: Array<{ type: PieceSymbol; square: Square }> = [];
  for (const p of c.board().flat()) {
    if (!p || p.color === by || p.type === 'p') continue;
    if (c.attackers(p.square, by).includes(sq)) out.push({ type: p.type, square: p.square });
  }
  return out.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
}

function safeOn(c: Chess, sq: Square, by: Color, value: number): boolean {
  const them: Color = by === 'w' ? 'b' : 'w';
  const hitters = c.attackers(sq, them);
  if (hitters.length === 0) return true;
  if (hitters.some((h) => { const p = c.get(h); return !!p && VALUE[p.type] < value; })) return false;
  return c.attackers(sq, by).length > 0;
}

function quietMove(fen: string, uci: string): { san: string; piece: PieceSymbol; to: Square; after: Chess } | null {
  const c = new Chess(fen);
  let mv;
  try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci.length > 4 ? { promotion: uci[4] } : {}) }); } catch { return null; }
  if (mv.captured || mv.promotion || c.inCheck()) return null;
  return { san: mv.san, piece: mv.piece, to: mv.to, after: c };
}

/** The gain is still there where the engine's line ends: read where the
 *  student is to move again, not in check (a line cut off mid-exchange, a
 *  queen "won" that the next move takes back, is not a win). */
function holdsToTheEnd(fen: string, line: readonly string[], me: Color): boolean {
  const end = line.length % 2 === 0 ? line.length : line.length - 1;
  const net = pvGain(fen, line, me, end);
  if (net === null || net < SET_UP_GAIN) return false;
  if (net >= 100) return true;
  const c = new Chess(fen);
  for (let i = 0; i < end; i += 1) if (!play(c, line[i])) return false;
  return !c.inCheck();
}

/** A tactic is on the board NOW: a sound line opens with a capture, a check
 *  or a promotion and nets the gain. That is moment 2's (the shot), never a
 *  set-up — moment 3 is "nothing tactical yet". */
function tacticNow(fen: string, lines: readonly AnalysisLine[], me: Color): boolean {
  return lines.some((l) => {
    const first = l.moves[0];
    if (!first) return false;
    const c = new Chess(fen);
    let mv;
    try { mv = c.move({ from: first.slice(0, 2), to: first.slice(2, 4), ...(first.length > 4 ? { promotion: first[4] } : {}) }); } catch { return false; }
    if (!mv.captured && !mv.promotion && !c.inCheck()) return false;
    return pvGainDepth(fen, l.moves, me, SET_UP_GAIN, 2 * SET_UP_MAX_DEPTH) !== null;
  });
}

/** The moved piece makes a threat at once — it hits a piece of theirs that
 *  is unguarded or worth more than it. That is a threat, never a quiet
 *  set-up (the threat readers say it). */
function threatens(after: Chess, sq: Square, me: Color): boolean {
  const mover = after.get(sq);
  if (!mover) return false;
  const them: Color = me === 'w' ? 'b' : 'w';
  return hitsFrom(after, sq, me).some((h) => h.type !== 'k' && (
    VALUE[h.type] > VALUE[mover.type] || after.attackers(h.square, them).length === 0));
}

/** The strike a quiet first move sets up, read down the engine's line.
 *
 *  Three readings keep it a SET-UP and true:
 *   - the opponent gives nothing away first: a line where they capture before
 *     the student's strike is them dumping material (a queen thrown in to
 *     stop a mate), not a tactic the quiet move built;
 *   - the quiet move does not attack the prize itself: that is a threat on a
 *     loose piece, which the threat readers already say;
 *   - the prize is a piece (a knight or more) or mate — a pawn grab is not
 *     the tactic this moment teaches.
 *  The strike is the student's next move when it is a check or a capture (a
 *  check that forks is named at the check), else their first capture. */
function strikeOf(fen: string, line: readonly string[], me: Color): SetUpChance | null {
  const q = quietMove(fen, line[0]);
  if (!q || threatens(q.after, q.to, me)) return null;
  const depth = pvGainDepth(fen, line, me, SET_UP_GAIN, 2 * SET_UP_MAX_DEPTH);
  if (depth === null || depth < 2 || depth > SET_UP_MAX_DEPTH) return null;
  if (!holdsToTheEnd(fen, line, me)) return null;
  // Walk the student's moves after the quiet one, up to the depth that nets.
  const walk = new Chess(fen);
  if (!play(walk, line[0])) return null;
  // Where each of their pieces stood when the quiet move was played, and
  // where the quiet-moved piece is now (they may take it: a sacrifice).
  const origin = new Map<string, Square>();
  for (const p of q.after.board().flat()) if (p && p.color !== me) origin.set(p.square, p.square);
  let offered: Square | null = q.to;
  let prize: { type: PieceSymbol; square: Square; from: Square; index: number } | null = null;
  let mateAt: number | null = null;
  // Where they put a piece, not in check, that the student's next move takes:
  // a piece given up, which only a mating threat makes a set-up.
  let placed: Square | null = null;
  let gaveUp = false;
  for (let i = 1; i < 2 * depth && i < line.length; i += 1) {
    const checked = walk.inCheck();
    const mv = (() => { try { return walk.move({ from: line[i].slice(0, 2), to: line[i].slice(2, 4), ...(line[i].length > 4 ? { promotion: line[i][4] } : {}) }); } catch { return null; } })();
    if (!mv) return null;
    const mine = i % 2 === 0;
    if (mine) {
      if (placed && mv.captured && mv.to === placed) gaveUp = true;
      placed = null;
    }
    if (!mine) {
      placed = !mv.captured && !checked ? mv.to : null;
      // They may take the piece the quiet move offered; anything else they
      // take first is them giving material back, not the tactic.
      if (mv.captured && mv.to !== offered) return null;
      if (mv.to === offered) offered = null;
      const was = origin.get(mv.from);
      origin.delete(mv.from);
      if (was) origin.set(mv.to, was);
      continue;
    }
    if (mv.from === offered) offered = mv.to;
    if (walk.isCheckmate()) { mateAt = i; break; }
    if (mv.captured) { prize = { type: mv.captured, square: mv.to, from: origin.get(mv.to) ?? mv.to, index: i }; break; }
  }
  if (mateAt === null && (!prize || VALUE[prize.type] < 3)) return null;
  // A prize the quiet move attacks at once is a threat, not a set-up.
  if (prize && q.after.attackers(prize.from, me).includes(q.to)) return null;
  const lastIdx = mateAt ?? (prize as { index: number }).index;
  // The strike: the student's next move when it checks or takes, else the
  // move that takes the prize (or mates).
  const next = new Chess(q.after.fen());
  const nextReply = line[1];
  if (!nextReply || !play(next, nextReply)) return null;
  const nextMv = (() => { try { return new Chess(next.fen()).move({ from: line[2].slice(0, 2), to: line[2].slice(2, 4), ...(line[2].length > 4 ? { promotion: line[2][4] } : {}) }); } catch { return null; } })();
  const strikeIdx = nextMv && (nextMv.captured || nextMv.san.includes('+') || nextMv.san.includes('#')) ? 2 : lastIdx;
  const at = new Chess(fen);
  for (let i = 0; i < strikeIdx; i += 1) if (!play(at, line[i])) return null;
  const strike = line[strikeIdx];
  const motif = MOTIF_OF_TACTIC[detectTacticType(at.fen(), strike, line.slice(strikeIdx))];
  if (!motif) return null;
  if (gaveUp && motif !== 'mate' && motif !== 'trapped-piece') return null;
  const struck = new Chess(at.fen());
  let played;
  try { played = struck.move({ from: strike.slice(0, 2), to: strike.slice(2, 4), ...(strike.length > 4 ? { promotion: strike[4] } : {}) }); } catch { return null; }
  const hit = hitsFrom(struck, played.to, me);
  const gain = pvGain(fen, line, me, 2 * depth) ?? SET_UP_GAIN;
  // What it wins comes first: the piece the strike takes, else the prize the
  // line takes after it; then what the striking piece hits.
  const taken = played.captured
    ? [{ type: played.captured, square: played.to }]
    : prize ? [{ type: prize.type, square: prize.square }] : [];
  const all = [...taken, ...hit.filter((h) => !taken.some((t) => t.square === h.square))];
  return {
    kind: 'strike', motif, uci: line[0], san: q.san, depth, gain,
    mates: mateAt !== null && strikeIdx === mateAt, captured: played.captured ?? prize?.type ?? null, strikeTakes: !!played.captured, frozen: false,
    targets: all.map((h) => h.type), squares: all.map((h) => h.square), line,
  };
}

/** A pin the quiet first move makes on their king or queen. */
function pinOf(fen: string, line: readonly string[], me: Color): SetUpChance | null {
  const q = quietMove(fen, line[0]);
  if (!q || !'brq'.includes(q.piece)) return null;
  if (!safeOn(q.after, q.to, me, VALUE[q.piece])) return null;
  const before = new Chess(fen);
  const standing = new Set(findPins(before).filter((p) => p.beneficiary === me).map((p) => `${p.involvedSquares[1]}|${p.involvedSquares[2]}`));
  for (const p of findPins(q.after, q.to)) {
    const front = q.after.get(p.involvedSquares[1] as Square);
    const back = q.after.get(p.involvedSquares[2] as Square);
    if (!front || !back || front.type === 'p' || (back.type !== 'k' && back.type !== 'q')) continue;
    if (standing.has(`${p.involvedSquares[1]}|${p.involvedSquares[2]}`)) continue;
    // A pinned piece that can take the pinner breaks it at once.
    if (q.after.moves({ square: p.involvedSquares[1] as Square, verbose: true }).some((x) => x.to === q.to)) continue;
    const frozen = q.after.moves({ square: p.involvedSquares[1] as Square }).length === 0;
    return {
      kind: 'pin', motif: 'pin', uci: line[0], san: q.san, depth: 1, gain: 0, mates: false, captured: null, strikeTakes: false, frozen,
      targets: [front.type, back.type], squares: [p.involvedSquares[1], p.involvedSquares[2]], line,
    };
  }
  return null;
}

/**
 * The set-up the student's board holds, from the engine's own lines: a strike
 * before a pin, a bigger gain first, the engine's order breaking ties. Null
 * when it is not the student's move or no sound line sets anything up.
 */
export function detectSetUpChance(fen: string, topLines: readonly AnalysisLine[], student: Color): SetUpChance | null {
  let board: Chess;
  try { board = new Chess(fen); } catch { return null; }
  if (board.turn() !== student || topLines.length === 0) return null;
  const sign = student === 'w' ? 1 : -1;
  const pov = (l: AnalysisLine): number => (l.mate !== null ? (l.mate > 0 ? 1 : -1) * 100000 : l.evaluation) * sign;
  const best = Math.max(...topLines.map(pov));
  const sound = topLines.filter((l) => l.moves.length > 0 && pov(l) >= best - SET_UP_SOUND_CP);
  if (tacticNow(fen, sound, student)) return null;
  let found: SetUpChance | null = null;
  for (const l of sound) {
    const s = strikeOf(fen, l.moves, student);
    if (s && (!found || found.kind === 'pin' || s.gain > found.gain)) found = s;
  }
  if (found) return found;
  for (const l of sound) {
    const p = pinOf(fen, l.moves, student);
    if (p) return p;
  }
  return null;
}

/** How much the board asked when it posed a set-up (the one scoring's
 *  importance scale; a shot is 85). */
export const SET_UP_POSED = 85;

/**
 * THE SET-UP THE BOARD POSED, for the record (David 2026-11-08: "Repeatedly
 * missing a set-up is noted as a weakness the coach teaches"): the board's
 * best line is a strike a quiet move sets up — a piece won or mate, never a
 * pin that wins nothing (a strike nets a minor or mates by construction).
 * Read off the best line alone, the one line the record and the population
 * sample both carry, so the student and the population are scored alike.
 */
export function setUpPosed(fen: string, bestLineUci: readonly string[]): boolean {
  if (bestLineUci.length < 3) return false;
  let me: Color;
  try { me = new Chess(fen).turn(); } catch { return false; }
  return detectSetUpChance(fen, [{ rank: 1, evaluation: 0, mate: null, moves: [...bestLineUci] }], me)?.kind === 'strike';
}

/** The skill a set-up points at: the motif's own "you missed it" row. */
export function setUpSkill(c: SetUpChance): MisconceptionTagId {
  return MOTIFS[c.motif].yours;
}

/** What is set up, in words — its own targets only where they ARE the motif
 *  (a fork's two pieces, the free piece, the trapped piece, the pin's pair);
 *  a 'mate' the strike does not deliver is a mating threat. */
function whatWords(c: SetUpChance): string {
  const named = c.targets.filter((t) => t !== 'k');
  switch (c.motif) {
    case 'fork': {
      const forked = c.strikeTakes ? c.targets.slice(1) : c.targets;
      return forked.length >= 2 ? `a fork of their ${andList(forked.map((t) => NAME[t]))}` : SET_UP_WORDS.fork;
    }
    case 'free-piece':
      return c.captured && c.captured !== 'p' ? `a shot at their loose ${NAME[c.captured]}` : SET_UP_WORDS['free-piece'];
    case 'trapped-piece':
      return named[0] ? `a trap for their ${NAME[named[0]]}` : SET_UP_WORDS['trapped-piece'];
    case 'mate':
      return c.mates ? SET_UP_WORDS.mate : 'a mating threat';
    default:
      return SET_UP_WORDS[c.motif];
  }
}

function payoffWords(c: SetUpChance): string {
  if (c.kind === 'pin') {
    if (c.targets[1] !== 'k') return 'if it steps off the line, the queen behind it is attacked';
    return c.frozen
      ? 'it cannot move, so whatever it guards is guarded no more'
      : 'it can only move along the pin, so whatever it guards off that line is guarded no more';
  }
  const when = c.depth === 2 ? 'on your next move' : 'two moves from now';
  return c.mates ? `it ends in mate ${when}` : `it wins material ${when}`;
}

/** What the quiet move does: it pins, or it sets up the strike. */
function doesWords(c: SetUpChance): string {
  return c.kind === 'pin'
    ? `pins their ${NAME[c.targets[0]]} to their ${NAME[c.targets[1]]}`
    : `sets up ${whatWords(c)}`;
}

/** The held line: the tactic, its targets and its payoff, never the move. */
export function setUpHeldClause(c: SetUpChance): string {
  return `A quiet move here ${doesWords(c)}: ${payoffWords(c)}.`;
}

/** The same fact naming the move, for a surface that may name it. */
export function setUpClause(c: SetUpChance): string {
  return `${c.san} quietly ${doesWords(c)}: ${payoffWords(c)}.`;
}
