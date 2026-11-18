// oppositionRead — THE OPPOSITION, AND WHAT IT DECIDES (WO-DANYA-READS-01 #5,
// Danya: "1.Kd6 meets with 1...Kd8, when it is Black who has the opposition";
// "if this position were reached with Black to move, he would lose on the
// spot"). The one opposition geometry in the app: `endgameTechnique.
// detectOpposition` and `positionReadingService.oppositionRead` read it here.
//
// THE GEOMETRY. Two kings face each other with an ODD number of squares
// between them — on a file or a rank (direct with one square, distant with
// three or five), or on a diagonal (diagonal opposition). The side NOT to move
// holds it: the side to move has to give way.
//
// WHAT IT DECIDES, read off the board, never a label: in a king-and-pawn
// ending (kings and pawns only, at least one pawn),
//   entry — the squares beside the holder's king that the mover's king
//           guards now: after EVERY king step the mover has, the holder's king
//           can step onto at least one of them (chess.js plays each step and
//           asks for the holder's legal king moves). Empty when one of the
//           mover's king steps keeps every square covered.
//   spare — the mover's legal pawn moves. A pawn move hands the move back,
//           so the opposition forces nothing while one is left (Danya's spare
//           tempo); the holder's own spare moves are read too.
// And, when the surface hands in the engine's score, whether it decides the
// game: the holder winning by the read (no read, no verdict).
//
// PURE: chess.js.
import { Chess, type Color, type Square } from 'chess.js';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { orList } from '../utils/andList';
import { raceCountOn } from './raceCount';

export type OppositionKind = 'direct' | 'distant' | 'diagonal';

/** Kings in opposition, by geometry alone: the kind, or null. `w`, `b`: the
 *  kings' squares. */
export function kingsInOpposition(w: string, b: string): { kind: OppositionKind; between: string[] } | null {
  const wf = w.charCodeAt(0) - 97; const wr = Number(w[1]);
  const bf = b.charCodeAt(0) - 97; const br = Number(b[1]);
  const df = bf - wf; const dr = br - wr;
  const straight = df === 0 || dr === 0;
  const diagonal = Math.abs(df) === Math.abs(dr);
  if (!straight && !diagonal) return null;
  const gap = Math.max(Math.abs(df), Math.abs(dr)) - 1;
  if (gap < 1 || gap % 2 === 0) return null;
  const between: string[] = [];
  const sf = Math.sign(df); const sr = Math.sign(dr);
  for (let i = 1; i <= gap; i += 1) between.push(`${String.fromCharCode(97 + wf + sf * i)}${wr + sr * i}`);
  const kind: OppositionKind = diagonal && !straight ? 'diagonal' : gap === 1 ? 'direct' : 'distant';
  return { kind, between };
}

export interface OppositionRead {
  kind: OppositionKind;
  /** The side that holds it — the one NOT to move. */
  holder: Color;
  mover: Color;
  kings: Record<Color, Square>;
  between: string[];
  /** Squares the holder's king gets after any king step of the mover (forced
   *  only when the mover has no spare pawn move); [] when a step keeps it out. */
  entry: Square[];
  /** The mover's legal pawn moves (SAN): each hands the move back. */
  spare: string[];
  /** The holder's legal pawn moves (SAN), were it the holder's turn. */
  holderSpare: string[];
  /** Pawns each side has (the side with fewer is the one the opposition saves). */
  holderPawns: number;
  moverPawns: number;
  key: string;
}

function other(c: Color): Color { return c === 'w' ? 'b' : 'w'; }

function kingSquares(c: Chess): Record<Color, Square> | null {
  let w: Square | null = null; let b: Square | null = null;
  for (const cell of c.board().flat()) if (cell?.type === 'k') { if (cell.color === 'w') w = cell.square; else b = cell.square; }
  return w && b ? { w, b } : null;
}

/** Kings and pawns only (the ending the opposition decides). */
function pawnEndingOnly(c: Chess): { pawns: number } | null {
  let pawns = 0;
  for (const cell of c.board().flat()) {
    if (!cell) continue;
    if (cell.type === 'p') pawns += 1;
    else if (cell.type !== 'k') return null;
  }
  return { pawns };
}

/** `fen` with `side` to move (en passant cleared), or null when that board
 *  cannot be (the other king in check). */
/** The board with `side` to move, through the ONE null-move rule
 *  (`sideToMoveAs`: null when the side asked to pass is in check). */
function withTurn(fen: string, side: Color): Chess | null {
  const f = sideToMoveAs(fen, side);
  if (!f) return null;
  try {
    const c = new Chess(f);
    return kingSquares(c) ? c : null;
  } catch { return null; }
}

/** A SPARE TEMPO: a quiet pawn move — no check (the reply to a check is
 *  forced, nothing is handed back), and the pawn not left to be taken (on a
 *  square the other side attacks and its own side does not guard). */
function spareMoves(c: Chess): string[] {
  const out: string[] = [];
  for (const m of c.moves({ verbose: true })) {
    if (m.piece !== 'p' || m.san.includes('+') || m.san.includes('#')) continue;
    const b = new Chess(c.fen()); b.move(m);
    const attacked = b.attackers(m.to, other(m.color)).length > 0;
    const guarded = b.attackers(m.to, m.color).length > 0;
    if (attacked && !guarded) continue;
    out.push(m.san);
  }
  return out;
}

/** THE OPPOSITION on a board, kings and pawns only, at least one pawn — or
 *  null. Geometry first; the entry and the spare moves are played out. */
export function readOpposition(fen: string): OppositionRead | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const pe = pawnEndingOnly(c);
  if (!pe || pe.pawns === 0 || c.inCheck()) return null;
  // A pawn running free decides the ending, not the kings' standoff
  // (`raceCount`): the opposition is not the story there.
  if (raceCountOn(fen)) return null;
  const o = oppositionOn(c);
  // The diagonal opposition is a face-off one square apart; across three
  // squares of diagonal the kings are not fighting over anything yet.
  if (o && o.kind === 'diagonal' && o.between.length > 1) return null;
  return o;
}

/** The geometry and its reads on any board with the two kings (no material
 *  gate) — the one read under every opposition caller. */
export function oppositionOn(c: Chess): OppositionRead | null {
  const kings = kingSquares(c);
  if (!kings) return null;
  const geo = kingsInOpposition(kings.w, kings.b);
  if (!geo) return null;
  const mover = c.turn();
  const holder = other(mover);
  const fen = c.fen();
  const moves = c.moves({ verbose: true });
  const spare = spareMoves(c);
  const holderBoard = withTurn(fen, holder);
  const holderSpare = holderBoard ? spareMoves(holderBoard) : [];
  // THE ENTRY: the squares beside the holder's king the mover's king covers
  // now, and which of them each king step gives up.
  const hk = kings[holder]; const mk = kings[mover];
  const near = (a: string, b: string): boolean => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1]))) === 1;
  const contested: string[] = [];
  for (let df = -1; df <= 1; df += 1) for (let dr = -1; dr <= 1; dr += 1) {
    if (!df && !dr) continue;
    const f = hk.charCodeAt(0) - 97 + df; const r = Number(hk[1]) + dr;
    if (f < 0 || f > 7 || r < 1 || r > 8) continue;
    const sq = `${String.fromCharCode(97 + f)}${r}`;
    if (near(sq, mk)) contested.push(sq);
  }
  let entry: Square[] = [];
  const kingSteps = moves.filter((m) => m.piece === 'k');
  if (contested.length > 0 && kingSteps.length > 0) {
    const freed = new Set<Square>();
    let everyStepGives = true;
    for (const m of kingSteps) {
      const b = new Chess(fen); b.move(m.san);
      const opens = b.moves({ verbose: true }).filter((x) => x.piece === 'k' && contested.includes(x.to)).map((x) => x.to);
      if (opens.length === 0) { everyStepGives = false; break; }
      for (const s of opens) freed.add(s);
    }
    if (everyStepGives) entry = [...freed].sort();
  }
  const pawnsOf = (side: Color): number => c.board().flat().filter((x) => x?.type === 'p' && x.color === side).length;
  return { kind: geo.kind, holder, mover, kings, between: geo.between, entry, spare, holderSpare, holderPawns: pawnsOf(holder), moverPawns: pawnsOf(mover),
    key: `opposition:${fen.split(' ').slice(0, 2).join(' ')}` };
}

/** Does the read decide the game, by the engine's score (White's view)?
 *  The holder winning by at least this much. */
const DECIDES_CP = 150;
/** A draw by the read: within this of level. */
const DRAW_CP = 50;

const RANK_WORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

function lineWord(o: OppositionRead): string {
  if (o.kind === 'diagonal') return 'the diagonal';
  const k = o.kings;
  return k.w[0] === k.b[0] ? `the ${k.w[0]}-file` : `the ${RANK_WORD[Number(k.w[1])]} rank`;
}

function gapWords(o: OppositionRead): string {
  const n = o.between.length;
  return n === 1 ? `one square between them (${o.between[0]})` : `${n === 3 ? 'three' : 'five'} squares between them`;
}

/** THE OPPOSITION IN WORDS, from the student's seat. `tense`: `now` reads the
 *  board as it stands; `took` says the student's or their move just took it.
 *  `whiteCp`: the engine's score of the board (White's view), or null. */
export function oppositionLine(o: OppositionRead, student: Color, tense: 'now' | 'took', whiteCp: number | null): string {
  const mine = o.holder === student;
  const key = stemKeyOf(o.key);
  const where = `${lineWord(o)}, with ${gapWords(o)}`;
  const head = tense === 'took'
    ? (mine
      ? rotateStem([`Your king takes the opposition: the kings face each other on ${where}, and it is their move.`, `That king move takes the opposition. The kings stand on ${where}, and they have to move.`], key)
      : rotateStem([`Their king takes the opposition: the kings face each other on ${where}, and it is your move.`, `Their king move takes the opposition. The kings stand on ${where}, and you have to move.`], key))
    : (mine
      ? rotateStem([`You have the opposition: the kings face each other on ${where}, and it is their move.`, `Your king holds the opposition. The kings stand on ${where}, and they are the ones to move.`], key)
      : rotateStem([`They have the opposition: the kings face each other on ${where}, and it is your move.`, `Their king holds the opposition. The kings stand on ${where}, and you are the one to move.`], key));
  const parts = [head];
  if (o.spare.length > 0) {
    parts.push(mine
      ? `It forces nothing yet: they still have a pawn move to spare, and a pawn move hands the move back.`
      : `It forces nothing yet: you still have a pawn move to spare, and a pawn move hands the move back.`);
  } else if (o.entry.length > 0) {
    const sq = orList(o.entry);
    parts.push(mine
      ? `Their king has to step aside, and whichever way it goes, yours steps forward to ${sq}.`
      : `Your king has to step aside, and whichever way it goes, theirs steps forward to ${sq}.`);
  } else if (o.kind === 'distant') {
    parts.push(mine
      ? `Keep it by answering each king step of theirs with the matching step of yours.`
      : `They keep it by answering each step of your king with the matching step of theirs.`);
  } else {
    parts.push(mine ? `Their king has to give ground.` : `Your king has to give ground.`);
  }
  if (whiteCp !== null && o.spare.length === 0) {
    const holderCp = o.holder === 'w' ? whiteCp : -whiteCp;
    if (holderCp >= DECIDES_CP) parts.push(mine ? `That is what wins it.` : `That is what loses it for you.`);
    else if (Math.abs(holderCp) <= DRAW_CP && o.holderPawns <= o.moverPawns) parts.push(mine ? `That is what holds the draw.` : `That is why you cannot win this.`);
  }
  return parts.join(' ');
}

/** The squares a read shows: the kings and the entry squares. */
export function oppositionSquares(o: OppositionRead): Square[] {
  return [o.kings.w, o.kings.b, ...o.entry];
}

/** THE MOVE THAT TOOK THE OPPOSITION (either seat): a king move after which
 *  the mover holds it in a king-and-pawn ending, with something it decides —
 *  the entry forced, or the distant opposition kept. Null otherwise. */
export function oppositionTaken(fenBefore: string, san: string): { read: OppositionRead; fenAfter: string } | null {
  let c: Chess;
  try { c = new Chess(fenBefore); } catch { return null; }
  const mover = c.turn();
  let mv;
  try { mv = c.move(san); } catch { return null; }
  if (mv.piece !== 'k') return null;
  const read = readOpposition(c.fen());
  if (!read || read.holder !== mover) return null;
  if (read.spare.length > 0) return null;
  if (read.entry.length === 0 && read.kind !== 'distant') return null;
  return { read, fenAfter: c.fen() };
}

