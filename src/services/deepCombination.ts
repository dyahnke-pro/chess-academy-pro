// deepCombination — THE SACRIFICE THE SHALLOW READ DOES NOT SHOW (WO-DANYA-READS-01
// group 8, 2026-11-18: his "Nxe5! looks like it drops the queen, but after
// …Bxd1 Bxf7+ Ke7 Nd5 is mate" and "Rxd5! gives the rook back for a moment:
// after …exd5 Qxa8 you are a piece up"). The move gives material up on
// purpose, the other side takes it, and the forced follow-up in the engine's
// own line wins it back with interest, or mates.
//
// THE MOVE, either seat: within the first three plies the mover's material
// drops by two points or more below where it stood (the other side took
// something worth more than it gave), and the mover does not simply take back
// on the same square next. The piece must have been safe where it stood (a
// piece already lost there is the desperado's, not a sacrifice).
//
// THE PROOF is the engine's line: after the sacrifice every move of the
// mover's is forcing — a check, a capture, a promotion or a quiet move that
// threatens mate — through to mate, or to a board where the trades are
// finished (`exchangeLedger.settledNetForLine`) with the mover ahead of where
// it began. A line that only wins the material back is said only when the
// engine scores the end clearly for the mover. The engine's own score for the
// move must agree (the mover better by `DEEP_COMBO_CP`, or mating).
//
// ONE COMPUTER PER IDEA: a sacrifice by the other king is `kingSacrifice`'s
// (it says what the sacrifice opens), the exchange given for what it buys is
// `exchangeSacrifice`'s. This reads the rest.
//
// PURE: chess.js, the exchange ledger and the engine line the surface hands in.
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { MATERIAL_VALUE, sideMaterial } from './pieceValues';
import { legalSeeGainFor } from './positionReadingService';
import { mateThreatsAgainst } from './threatOut';
import { settledNetForLine, gainWords, promotedIn, type PieceLetter } from './exchangeLedger';
import { kingSacrifice, kingSacrificeLine, kingSacrificeSquares } from './kingSiege';
import { andList, lineShape } from '../utils/andList';
import { openSentence } from '../utils/openSentence';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The engine's score for the mover that a combination needs: a line that
 *  wins it back has to leave the mover clearly better, or it is a trade. */
export const DEEP_COMBO_CP = 150;
/** How far the line is walked for the forced follow-up, in plies. */
const MAX_PLIES = 14;
/** A sacrifice is two points or more below where the mover stood. */
const SAC_POINTS = 2;

export interface DeepCombination {
  mover: Color;
  /** The move that starts it (SAN). */
  san: string;
  /** The mover's piece the other side took, and on which square. */
  given: { piece: PieceSymbol; square: Square };
  /** The moves before the sacrifice when it comes a move in (SAN, from the
   *  board before), and the move that offers it. */
  lead: string[];
  offered: { san: string; color: Color; to: Square };
  /** The moves from the offer to the take (SAN), the take last. */
  accepted: string[];
  /** The board after it was taken (FEN), and the line from there to where
   *  the combination lands (SAN, the mover first). */
  takenFen: string;
  follow: string[];
  /** The whole line from the board before the move, to the point it proves (SAN). */
  line: string[];
  /** Mate; material ahead of where the mover began (`won` names it); or the
   *  material back with the engine's score clearly for the mover. */
  outcome: 'mate' | 'ahead' | 'back';
  /** What the mover comes out ahead by ("a rook", "a knight for a pawn"), for 'ahead'. */
  won: string | null;
  /** The material the line nets the mover, in pawns (0 for a mate). */
  net: number;
  key: string;
}

function material(c: Chess, color: Color): number {
  return sideMaterial(c.fen(), color);
}

function playUci(c: Chess, u: string): Move | null {
  try { return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { return null; }
}

/**
 * THE COMBINATION a move starts: `san` on `fenBefore`, proved by the engine's
 * line after it (`line`, UCI, the reply first). `moverCp` / `moverMate`: the
 * engine's score for the mover after the move (null with no read). Null when
 * the move gives nothing up, the line does not force, or it does not pay.
 */
export function deepCombination(fenBefore: string, san: string, line: readonly string[], moverCp: number | null, moverMate: number | null): DeepCombination | null {
  if (line.length < 2) return null;
  const scored = (moverMate !== null && moverMate > 0) || (moverCp !== null && moverCp >= DEEP_COMBO_CP);
  if (!scored) return null;
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const mover = c.turn();
  const foe = other(mover);
  const balance = (b: Chess): number => material(b, mover) - material(b, foe);
  const b0 = balance(c);
  let first: Move;
  try { first = c.move(san); } catch { return null; }
  const moves: Move[] = [first];
  for (const u of line.slice(0, MAX_PLIES - 1)) {
    const m = playUci(c, u);
    if (!m) break;
    moves.push(m);
    if (c.isGameOver()) break;
  }
  // THE SACRIFICE: the first ply of theirs within three that leaves the mover
  // two points or more below where it began.
  const walk = new Chess(fenBefore);
  let sacAt = -1;
  for (let k = 0; k < Math.min(4, moves.length); k += 1) {
    walk.move(moves[k].san);
    if (moves[k].color === foe && moves[k].captured && balance(walk) <= b0 - SAC_POINTS) { sacAt = k; break; }
    // Before the sacrifice is taken, the mover's second move must force too.
    if (k === 2 && moves[k].color === mover && !forcing(walk, moves[k], foe)) return null;
  }
  if (sacAt < 1) return null;
  const take = moves[sacAt];
  const givenSq = take.to;
  const givenPiece = take.captured as PieceSymbol;
  // The move that offers it: the mover's move that put the piece there in
  // this line, or the move before the take (it left the piece to be taken).
  let offerAt = sacAt - 1;
  for (let j = sacAt - 1; j >= 0; j -= 1) if (moves[j].color === mover && moves[j].to === givenSq) { offerAt = j; break; }
  const offered = moves[offerAt];
  // A desperado spends a piece that was lost where it stood: a piece taken
  // on the square it moved to must have been safe on the square it left.
  if (offered.color === mover && offered.to === givenSq && legalSeeGainFor(fenBefore, offered.from, foe) > 0) return null;
  // Taking straight back on the square is a trade, not a sacrifice.
  const next = moves[sacAt + 1];
  if (!next || (next.captured && next.to === givenSq)) return null;
  // THE FORCED FOLLOW-UP: the mover's moves after the sacrifice, while forcing.
  const replay = new Chess(fenBefore);
  for (let k = 0; k <= sacAt; k += 1) replay.move(moves[k].san);
  let followed = 0;
  let lastForcing = -1;
  let mated = false;
  for (let k = sacAt + 1; k < moves.length; k += 1) {
    const m = moves[k];
    replay.move(m.san);
    if (m.color === mover) {
      if (!forcing(replay, m, foe)) break;
      followed += 1;
      lastForcing = k;
    }
    if (replay.isCheckmate()) { mated = replay.turn() === foe; lastForcing = k; break; }
  }
  if (followed === 0 || lastForcing < 0) return null;
  const sans = moves.map((m) => m.san);
  let outcome: DeepCombination['outcome'] | null = null;
  let proved = sans.slice(0, lastForcing + 1);
  let won: string | null = null;
  let gained = 0;
  if (mated) outcome = 'mate';
  else {
    // The trades finished: the line through the last forcing move and the
    // take-backs that follow it.
    let end = lastForcing + 1;
    while (end < sans.length && /x/.test(sans[end]) && end - lastForcing <= 4) end += 1;
    const net = settledNetForLine(fenBefore, sans.slice(0, end), mover);
    if (net === null) return null;
    // The proof stops where the line first lands on that count with the
    // trades finished: the checks after the material is in prove nothing more.
    const cut = shortestAt(fenBefore, sans, sacAt + 2, end, mover, net);
    if (net >= 1) {
      outcome = 'ahead';
      proved = sans.slice(0, cut);
      won = netWon(fenBefore, proved, mover);
      gained = net;
    } else if (net === 0) {
      outcome = 'back';
      proved = sans.slice(0, cut);
    }
  }
  if (!outcome) return null;
  // A sacrifice by the other king is `kingSacrifice`'s to say.
  if (kingSacrifice(fenBefore, san, line, moverCp, moverMate)) return null;
  return {
    mover, san: first.san, given: { piece: givenPiece, square: givenSq },
    lead: sans.slice(0, offerAt), offered: { san: offered.san, color: offered.color, to: offered.to },
    accepted: sans.slice(offerAt + 1, sacAt + 1),
    takenFen: take.after, follow: proved.slice(sacAt + 1), line: proved, outcome, won, net: gained, key: `deep-combo:${first.from}${first.to}`,
  };
}

/** The shortest prefix length in [from, end] whose finished count is `net`
 *  and whose next move does not take back on the last capture's square. */
function shortestAt(fenBefore: string, sans: readonly string[], from: number, end: number, mover: Color, net: number): number {
  const sqOf = (s: string): string | undefined => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(s)?.[1];
  for (let k = Math.max(1, from); k < end; k += 1) {
    if (settledNetForLine(fenBefore, sans.slice(0, k), mover) !== net) continue;
    const last = sans[k - 1];
    const nextSan = sans[k];
    if (nextSan && /x/.test(nextSan) && /x/.test(last) && sqOf(nextSan) === sqOf(last)) continue;
    return k;
  }
  return end;
}

/** A forcing move of the mover's: a check, a capture, a promotion, or a quiet
 *  move that threatens mate (`c` is the board after it). */
function forcing(c: Chess, m: Move, foe: Color): boolean {
  if (m.captured || m.promotion || c.inCheck()) return true;
  return mateThreatsAgainst(c.fen(), foe).moves.length > 0;
}

/** What the line nets for the mover, by piece. */
function netWon(fenBefore: string, sans: readonly string[], mover: Color): string | null {
  const c = new Chess(fenBefore);
  const took: PieceLetter[] = [];
  const gave: PieceLetter[] = [];
  for (const s of sans) {
    const m = c.move(s);
    if (!m.captured) continue;
    (m.color === mover ? took : gave).push(m.captured as PieceLetter);
  }
  // A line that makes a new queen is said by the queen it makes, never as "a
  // pawn for a rook, and a new queen" (the trade on the way is its price).
  if (promotes(sans)) return null;
  return gainWords(took, gave, []);
}

/** Does the mover promote in the line (the mover's moves are the even plies)? */
function promotes(sans: readonly string[]): boolean {
  return promotedIn(sans.filter((_, i) => i % 2 === 0)).length > 0;
}

const dots = (san: string, color: Color): string => (color === 'b' ? `…${san}` : san);

/** Said from the student's seat, one idea a sentence, rotated on the board:
 *  what is given, the forced follow-up, and what it wins. */
export function deepCombinationLine(d: DeepCombination, student: Color, fen: string): string {
  const mine = d.mover === student;
  const own = mine ? 'your' : 'their';
  const subject = mine ? 'you' : 'they';
  const foe = other(d.mover);
  const given = `${own} ${NAME[d.given.piece]} on ${d.given.square}`;
  // The sacrifice is the piece that moved there, or one the move leaves.
  const itself = d.offered.to === d.given.square;
  const offer = dots(d.offered.san, d.offered.color);
  // A sacrifice a move in is said after the moves that lead to it.
  const lead = d.lead.length ? `After ${andList(d.lead.map((s, i) => dots(s, i % 2 === 0 ? d.mover : foe)))}, ` : '';
  // The line after the take, said by its shape (`lineShape`): the voice says
  // the key moves, the board shows the rest.
  const follow = lineShape(d.follow, subject, d.takenFen, 'first');
  const ends = d.outcome === 'mate'
    ? 'It ends in mate.'
    : d.outcome === 'ahead'
      ? (d.won
        ? `${openSentence(subject)} win ${d.won}.`
        : promotes(d.line) ? `${openSentence(subject)} make a new ${NAME[promotedIn(d.line.filter((_, i) => i % 2 === 0))[0]]} and come out ahead in material.` : `${openSentence(subject)} come out ahead in material.`)
      : `${openSentence(subject)} win the material back, and ${mine ? 'you are' : 'they are'} clearly better.`;
  const accepted = andList(d.accepted.map((s, i) => dots(s, i % 2 === 0 ? foe : d.mover)));
  const key = stemKeyOf(`${fen}|deepCombination|${d.key}`);
  const gives = itself ? `${offer} gives up ${given}` : `${offer} leaves ${given} to be taken`;
  return rotateStem([
    `${lead}${gives}. After ${accepted}, ${follow}. ${ends}`,
    `${lead}${gives}, and on purpose. After ${accepted}, ${follow}. ${ends}`,
    `${lead}${offer} looks like it ${itself ? 'drops' : 'loses'} ${given}, but it doesn't. After ${accepted}, ${follow}. ${ends}`,
  ].map(openSentence), key);
}

export function deepCombinationSquares(d: DeepCombination): string[] {
  return [d.given.square];
}

export interface CombinationRead { text: string; squares: string[]; key: string }

/**
 * THE SACRIFICE ON THE BOARD AS IT STANDS (the position read): the engine's
 * best line from `fen` (`line`, UCI, the side to move first) read for the
 * sacrifice it starts — by the other king (`kingSacrifice`, with what it
 * opens) or anywhere else (`deepCombination`). `whiteCp` / `whiteMate`: the
 * engine's score from White's view (null with no read). Either seat.
 */
export function combinationReadOn(fen: string, student: Color, line: readonly string[] | null, whiteCp: number | null, whiteMate: number | null): CombinationRead | null {
  if (!line || line.length < 3) return null;
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const mover = c.turn();
  const m = playUci(c, line[0]);
  if (!m) return null;
  const sign = mover === 'w' ? 1 : -1;
  const cp = whiteCp === null ? null : whiteCp * sign;
  const mate = whiteMate === null ? null : whiteMate * sign;
  const k = kingSacrifice(fen, m.san, line.slice(1), cp, mate);
  if (k) return { text: kingSacrificeLine(k, student), squares: kingSacrificeSquares(k), key: k.key };
  const d = deepCombination(fen, m.san, line.slice(1), cp, mate);
  if (d) return { text: deepCombinationLine(d, student, fen), squares: deepCombinationSquares(d), key: d.key };
  return null;
}
