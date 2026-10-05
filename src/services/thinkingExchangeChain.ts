// thinkingExchangeChain — the FOLLOW-UP CHAIN behind a right answer in "Learn
// how to think" (plan C1: "a right tap is followed by a question only an
// understanding answers").
//
// The student tapped a piece that can be won ("their targets") or one of
// theirs in danger ("am I safe?"). A lucky tap and a counted one look the same,
// so the coach asks the count itself, all by taps:
//   1. "Tap every piece attacking it."      — key = the LEGAL capturers;
//   2. "Now tap its defenders."             — key = the LEGAL recapturers;
//   3. "So who wins it? Tap who takes first." — key = the cheapest legal
//      capturer(s) (any of them is right), asked only when taking WINS;
// then the coach states the exchange result from the pin-aware SEE (G0 — the
// result is computed, never phrased by a model, never guessed).
//
// Every key is computed from chess.js legal moves (a pinned piece neither
// attacks nor defends — the same rule `legalSeeGain` uses), so the count the
// student is asked for is the count the SEE result rests on. A link whose key
// is not fair (empty, or more than four squares) is SKIPPED; the length of the
// chain is decided by the board, never by a number.
//
// PURE: chess.js + the SEE helpers only.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { asIfToMove, captureRead } from './positionReadingService';
import { rotateStem } from '../utils/rotateStem';
import { andList } from '../utils/andList';
import { CAPTURE_VALUE } from './pieceValues';

/** One link of a follow-up chain: a tap question with its own computed key. */
export interface FollowUp {
  /** Which link (for the audit and tests). */
  id: 'attackers' | 'defenders' | 'takes-first';
  /** The question, spoken and shown. */
  prompt: string;
  /** The computed answer (1–4 squares). */
  key: Square[];
  /** `all`: find them all. `any`: one of them is a full answer. */
  mode: 'all' | 'any';
  /** What rules a wrong tap out — the method, never the answer. */
  wrongTapLine: (sq: Square) => string;
  /** Said when the link is shown rather than found: the key, named. */
  shownLine: string;
  /** Said after the link closes, whatever the outcome (the computed result). */
  after: string | null;
}

/** Whose piece the chain is about, from the student's (side to move) seat. */
export type ChainSeat = 'theirs' | 'mine';

/** The largest key a tap question may ask for (a fair question). */
const MAX_FAIR_KEY = 4;

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** Squares of `capturer`'s pieces that can LEGALLY take on `sq` — as if it were
 *  their move. Empty when that board cannot exist (the other side is in check). */
export function legalCapturers(fen: string, sq: Square, capturer: Color): Square[] {
  const asIf = asIfToMove(fen, capturer);
  if (!asIf) return [];
  let chess: Chess;
  try { chess = new Chess(asIf); } catch { return []; }
  const victim = chess.get(sq);
  if (!victim || victim.color === capturer) return [];
  const from = chess.moves({ verbose: true }).filter((m) => m.to === sq && m.captured).map((m) => m.from);
  return [...new Set(from)];
}

/** Squares of the owner's pieces that could LEGALLY take back on `sq` once an
 *  enemy piece stands there: the piece on `sq` is replaced by an enemy knight
 *  and the owner's legal captures are read (a pinned defender is not counted). */
export function legalDefenders(fen: string, sq: Square, owner: Color): Square[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const piece = chess.get(sq);
  if (!piece || piece.color !== owner || piece.type === 'k') return [];
  chess.remove(sq);
  if (!chess.put({ type: 'n', color: other(owner) }, sq)) return [];
  // The board AFTER the capture: the owner is to move.
  const parts = chess.fen().split(' ');
  parts[1] = owner;
  parts[3] = '-';
  let after: Chess;
  try { after = new Chess(parts.join(' ')); } catch { return []; }
  const from = after.moves({ verbose: true }).filter((m) => m.to === sq && m.captured).map((m) => m.from);
  return [...new Set(from)];
}

const fair = (key: readonly Square[]): boolean => key.length >= 1 && key.length <= MAX_FAIR_KEY;

function labelled(chess: Chess, squares: readonly Square[], whose: 'your' | 'their'): string {
  return andList(squares.map((s) => {
    const p = chess.get(s);
    return `${whose} ${p ? name(p.type) : 'piece'} on ${s}`;
  }));
}

const material = (n: number): string => (n === 1 ? 'a pawn' : `${n} points`);

/**
 * The follow-up chain for the piece on `sq`. `seat` says whose piece it is from
 * the student's (side to move) point of view: `theirs` for a target, `mine` for
 * a piece in danger. Returns [] when there is nothing honest to ask (no piece,
 * the board cannot be read as a standing fact, no fair link).
 */
export function exchangeChain(fen: string, sq: Square, seat: ChainSeat, rot = 0): FollowUp[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const me = chess.turn();
  const owner = seat === 'theirs' ? other(me) : me;
  const capturer = other(owner);
  const piece = chess.get(sq);
  if (!piece || piece.color !== owner || piece.type === 'k') return [];
  // Only a STANDING read is taught (a check makes every count "for one move").
  const gain = captureRead(fen, sq, capturer);
  if (gain === null) return [];

  const atkWhose = seat === 'theirs' ? 'your' : 'their';
  const defWhose = seat === 'theirs' ? 'their' : 'your';
  const pieceLabel = `${seat === 'theirs' ? 'their' : 'your'} ${name(piece.type)} on ${sq}`;
  const attackers = legalCapturers(fen, sq, capturer);
  const defenders = legalDefenders(fen, sq, owner);
  const links: FollowUp[] = [];

  const wrongCount = (role: 'attack' | 'defend', side: Color, whose: 'your' | 'their') => (t: Square): string => {
    const p = chess.get(t);
    if (!p) return 'Tap a piece, not an empty square.';
    if (p.color !== side) return whose === 'your' ? 'That one is theirs — tap your own pieces.' : 'That one is yours — tap their pieces.';
    // A piece that reaches the square by geometry but cannot legally take: pinned.
    const reaches = chess.attackers(sq, side).includes(t);
    if (reaches) return `The ${name(p.type)} on ${t} points at ${sq}, but it is pinned — it cannot take, so it does not count.`;
    return `The ${name(p.type)} on ${t} cannot reach ${sq} — it does not ${role} it.`;
  };

  if (fair(attackers)) {
    links.push({
      id: 'attackers',
      prompt: rotateStem([
        `Look at ${pieceLabel}. Tap every ${atkWhose === 'your' ? 'piece of yours' : 'piece of theirs'} attacking it.`,
        `Now count: ${pieceLabel} — tap each ${atkWhose === 'your' ? 'of your pieces' : 'of their pieces'} that attacks it.`,
      ], rot),
      key: attackers,
      mode: 'all',
      wrongTapLine: wrongCount('attack', capturer, atkWhose),
      shownLine: `The attackers: ${labelled(chess, attackers, atkWhose)}.`,
      after: null,
    });
  }

  if (fair(defenders)) {
    links.push({
      id: 'defenders',
      prompt: rotateStem([
        `Now tap ${defWhose === 'their' ? 'their pieces' : 'your pieces'} defending it.`,
        `And its defenders — tap ${defWhose === 'their' ? 'each of theirs' : 'each of yours'}.`,
      ], rot),
      key: defenders,
      mode: 'all',
      wrongTapLine: wrongCount('defend', owner, defWhose),
      shownLine: `The defenders: ${labelled(chess, defenders, defWhose)}.`,
      after: null,
    });
  }

  // The verdict, from the pin-aware SEE.
  const loose = defenders.length === 0;
  const cheapest = attackers.length > 0 ? Math.min(...attackers.map((s) => CAPTURE_VALUE[chess.get(s)?.type ?? 'k'])) : null;
  const firstTakers = loose ? attackers : attackers.filter((s) => CAPTURE_VALUE[chess.get(s)?.type ?? 'k'] === cheapest);
  const takerType = firstTakers.length > 0 ? chess.get(firstTakers[0])?.type : undefined;
  const verdict = gain > 0 && takerType
    ? (seat === 'theirs'
      ? (loose
        ? `So it's yours: nothing can take back, and you win ${material(gain)}.`
        : `So you win it: take with the ${name(takerType)} first, and when the trades are done you are ${material(gain)} up.`)
      : (loose
        ? `So they win it: nothing of yours takes back, and they are ${material(gain)} up — it needs your attention now.`
        : `So they win it: they take with the ${name(takerType)} first and come out ${material(gain)} ahead — that is why it is in danger.`))
    : null;

  if (gain > 0 && fair(firstTakers)) {
    links.push({
      id: 'takes-first',
      prompt: seat === 'theirs'
        ? rotateStem(['So who wins it? Tap the piece you take with first.', 'Who takes first? Tap that piece.'], rot)
        : rotateStem(['So which of their pieces takes first? Tap it.', 'Who would they take with first? Tap that piece.'], rot),
      key: firstTakers,
      mode: 'any',
      wrongTapLine: (t) => {
        if (!attackers.includes(t)) return `That piece cannot take on ${sq}.`;
        return seat === 'theirs'
          ? 'Take with the cheapest piece first — if they take back, you lose the least.'
          : 'They take with their cheapest piece first — it risks the least.';
      },
      shownLine: `${seat === 'theirs' ? 'You take' : 'They take'} first with the ${takerType ? name(takerType) : 'piece'} on ${firstTakers[0]}.`,
      after: verdict,
    });
  } else if (links.length > 0) {
    // No "who wins it" to tap: the coach states the computed result.
    links[links.length - 1] = {
      ...links[links.length - 1],
      after: verdict ?? (seat === 'theirs'
        ? `Count them: taking first does not win it — the defenders hold.`
        : `Count them: they cannot take it and come out ahead.`),
    };
  }
  return links;
}
