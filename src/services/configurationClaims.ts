// configurationClaims — does a note's STRUCTURAL claim hold on this board?
//
// The geometry guard removed squares from floating notes, and that was
// necessary and nowhere near sufficient. Caught on prod, move 4 of a live game
// (David 2026-08-08):
//
//   board: rnbqkb1r/pp1ppppp/5n2/8/3QP3/8/PPP2PPP/RNB1KBNR w KQkq - 1 4
//   spoke: "Doubled rooks on the open file x-ray the opposing rook behind a
//           knight, pinning that knight to the back rank."
//
// Every rook is on its starting square. There are no doubled rooks, no open
// file, no rook behind a knight. The note names no SQUARE, so the guard passed
// it, and `gradeNarrationText` keeps it too — that grader validates
// square-anchored claims, and this sentence has none. It is the same lie the
// position-selection rule exists to prevent, wearing different clothes: fluent,
// internally consistent, and true of somebody else's board.
//
// A note reached by PATTERN may teach the pattern. It may not assert a
// configuration. So: every structural feature the prose NAMES must be provable
// on the live position, or the note is not spoken here.
//
// Deliberately narrow. Each claim below is one a chess.js read can settle
// outright; anything not listed is not checked, because a guard that guesses is
// worse than one that admits its scope.
import { Chess } from 'chess.js';

type Color = 'w' | 'b';

const FILES = 'abcdefgh'.split('');

interface Board {
  chess: Chess;
  pieces: Array<{ type: string; color: Color; square: string }>;
}

const read = (fen: string): Board | null => {
  try {
    const chess = new Chess(fen);
    const pieces: Board['pieces'] = [];
    for (const row of chess.board()) {
      for (const sq of row) {
        if (sq) pieces.push({ type: sq.type, color: sq.color, square: sq.square });
      }
    }
    return { chess, pieces };
  } catch {
    return null;
  }
};

/** Two rooks of the SAME colour sharing a file. */
const hasDoubledRooks = (b: Board): boolean => {
  for (const color of ['w', 'b'] as Color[]) {
    const files = b.pieces.filter((p) => p.type === 'r' && p.color === color).map((p) => p.square[0]);
    if (new Set(files).size < files.length) return true;
  }
  return false;
};

/** A file with no pawns of either colour on it. */
const hasOpenFile = (b: Board): boolean =>
  FILES.some((f) => !b.pieces.some((p) => p.type === 'p' && p.square[0] === f));

/** A file with pawns of one colour only — the half-open file. */
const hasHalfOpenFile = (b: Board): boolean =>
  FILES.some((f) => {
    const pawns = b.pieces.filter((p) => p.type === 'p' && p.square[0] === f);
    return pawns.length > 0 && new Set(pawns.map((p) => p.color)).size === 1;
  });

/** A pawn with no enemy pawn ahead of it on its file or either neighbour. */
const hasPassedPawn = (b: Board): boolean =>
  b.pieces.some((p) => {
    if (p.type !== 'p') return false;
    const file = FILES.indexOf(p.square[0]);
    const rank = Number(p.square[1]);
    const forward = p.color === 'w' ? 1 : -1;
    return !b.pieces.some((q) => {
      if (q.type !== 'p' || q.color === p.color) return false;
      const qf = FILES.indexOf(q.square[0]);
      const qr = Number(q.square[1]);
      return Math.abs(qf - file) <= 1 && (qr - rank) * forward > 0;
    });
  });

/** Two pawns of one colour on the same file. */
const hasDoubledPawns = (b: Board): boolean => {
  for (const color of ['w', 'b'] as Color[]) {
    const files = b.pieces.filter((p) => p.type === 'p' && p.color === color).map((p) => p.square[0]);
    if (new Set(files).size < files.length) return true;
  }
  return false;
};

/** A pawn with no friendly pawn on either neighbouring file. */
const hasIsolatedPawn = (b: Board): boolean =>
  b.pieces.some((p) => {
    if (p.type !== 'p') return false;
    const file = FILES.indexOf(p.square[0]);
    return !b.pieces.some((q) =>
      q.type === 'p' && q.color === p.color && q.square !== p.square &&
      Math.abs(FILES.indexOf(q.square[0]) - file) === 1);
  });

const hasBishopPair = (b: Board): boolean =>
  (['w', 'b'] as Color[]).some((c) => b.pieces.filter((p) => p.type === 'b' && p.color === c).length >= 2);

const hasQueensOff = (b: Board): boolean => !b.pieces.some((p) => p.type === 'q');


/** The piece types left on the board besides kings and pawns. */
const majorMinorTypes = (b: Board): Set<string> =>
  new Set(b.pieces.filter((p) => p.type !== 'k' && p.type !== 'p').map((p) => p.type));

/** "This is a rook endgame" and friends. A note that names the ENDGAME TYPE is
 *  making the largest structural claim there is — everything it then advises
 *  follows from that type — and it is the cheapest of all to settle: look at
 *  what is still on the board.
 *
 *  Heard on prod (David 2026-08-18): *"The rook endgame turns on removing both
 *  white pawns while keeping at least one black pawn"*, spoken over a position
 *  with two knights and a bishop still on and FIVE white pawns. Every earlier
 *  guard passed it — it names no square for the grader, and no structure the
 *  list below knew about. Two separate checks now catch that one line. */
const isEndgameOf = (types: readonly string[]) => (b: Board): boolean => {
  const left = majorMinorTypes(b);
  if (left.size === 0) return types.length === 0;
  return [...left].every((t) => types.includes(t));
};

/** Exactly N pawns of that colour — the claim hidden inside "both white pawns",
 *  which presupposes a two-pawn ending and reads as ordinary prose. */
const pawnCountIs = (color: Color, n: number) => (b: Board): boolean =>
  b.pieces.filter((p) => p.type === 'p' && p.color === color).length === n;

/** One bishop each, on squares of different colours — the ending whose whole
 *  character is that neither bishop can ever challenge the other. */
const hasOppositeColouredBishops = (b: Board): boolean => {
  const light = (sq: string): boolean =>
    (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
  const of = (c: Color) => b.pieces.filter((p) => p.type === 'b' && p.color === c);
  const [w, bl] = [of('w'), of('b')];
  if (w.length !== 1 || bl.length !== 1) return false;
  return light(w[0].square) !== light(bl[0].square);
};

/** Phrase → the check that settles it. Order matters only for readability. */
const CLAIMS: Array<{ re: RegExp; holds: (b: Board) => boolean; label: string }> = [
  { re: /\bdoubled rooks?\b|\brooks? (?:are )?doubled\b/i, holds: hasDoubledRooks, label: 'doubled rooks' },
  { re: /\bopen file\b/i, holds: hasOpenFile, label: 'open file' },
  { re: /\bhalf-?open file\b/i, holds: hasHalfOpenFile, label: 'half-open file' },
  { re: /\bpassed pawns?\b/i, holds: hasPassedPawn, label: 'passed pawn' },
  { re: /\bdoubled pawns?\b/i, holds: hasDoubledPawns, label: 'doubled pawns' },
  { re: /\bisolated pawn\b|\bisolani\b/i, holds: hasIsolatedPawn, label: 'isolated pawn' },
  { re: /\bbishop pair\b|\btwo bishops\b/i, holds: hasBishopPair, label: 'bishop pair' },
  { re: /\bqueens? (?:are )?(?:off|traded|exchanged)\b/i, holds: hasQueensOff, label: 'queens off' },
  // ENDGAME TYPE. The biggest structural claim a note can make, and the one
  // every piece of advice after it rests on.
  { re: /\brook (?:and pawn )?end(?:game|ing)\b/i, holds: isEndgameOf(['r']), label: 'a rook endgame' },
  { re: /\bqueen (?:and pawn )?end(?:game|ing)\b/i, holds: isEndgameOf(['q']), label: 'a queen endgame' },
  { re: /\bknight (?:and pawn )?end(?:game|ing)\b/i, holds: isEndgameOf(['n']), label: 'a knight endgame' },
  { re: /\bbishop (?:and pawn )?end(?:game|ing)\b/i, holds: isEndgameOf(['b']), label: 'a bishop endgame' },
  { re: /\bminor[- ]piece end(?:game|ing)\b/i, holds: isEndgameOf(['n', 'b']), label: 'a minor-piece endgame' },
  { re: /\b(?:king and pawn|pure pawn) end(?:game|ing)\b/i, holds: isEndgameOf([]), label: 'a pawn endgame' },
  { re: /\bopposite[- ]colou?red bishops\b/i, holds: hasOppositeColouredBishops, label: 'opposite-coloured bishops' },
  // PAWN COUNT. "Both white pawns" reads as prose and is a claim that the side
  // has exactly two of them.
  { re: /\bboth (?:of )?(?:the )?white pawns\b/i, holds: pawnCountIs('w', 2), label: 'exactly two white pawns' },
  { re: /\bboth (?:of )?(?:the )?black pawns\b/i, holds: pawnCountIs('b', 2), label: 'exactly two black pawns' },
];

/** The first structural claim the text makes that is FALSE here, or null when
 *  every claim it makes holds (including when it makes none). */
export function falseConfigurationClaim(text: string, fen: string): string | null {
  const b = read(fen);
  if (!b) return null;               // unreadable board judges nothing
  for (const c of CLAIMS) {
    if (c.re.test(text) && !c.holds(b)) return c.label;
  }
  return null;
}

/** Convenience: is this text safe to speak over this board? */
export const configurationClaimsHold = (text: string, fen: string): boolean =>
  falseConfigurationClaim(text, fen) === null;
