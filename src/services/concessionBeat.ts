// When the coach plays a worse move, it says what it gave up.
//
// David 2026-08-09: "if the coach plays poorly, which it should, the coach leads
// the user into how to take advantage. Like 'I do not take your attack seriously
// so I remove one defender to attack over here, now is your chance to take
// control of the key square'."
//
// And then, correcting the first design, which had proposed a centipawn
// threshold: "I don't have a deterministic answer for that. If the coach plays a
// worse move that CLEARLY HAS A DRAWBACK then coach needs to alert the user and
// point them in the direction of the punishment (don't just give them the
// answer, but something subtle that makes them think)."
//
// That correction is the whole design. A threshold asks "how much worse?", which
// nobody can answer and which fires on moves whose downside cannot be described.
// A NAMEABLE DRAWBACK asks "can code say what was given up?" — and if it cannot,
// there is nothing to teach and the beat stays silent. It is the stricter test
// and the honest one: every firing comes with the specific thing that changed.
//
// THE COACH NEVER APOLOGIZES (David, locked). Not "sorry", not "that was
// careless of me", not a hedge in either direction. It states what it did and
// what that hands over — a strong player showing you the hole they just made,
// not a teacher confessing. The coach's weakness becomes the lesson instead of
// something to excuse.
import { Chess, type Color, type Square } from 'chess.js';
import { findWeakPawns, findPieceQuality } from './positionReadingService';

export type DrawbackKind =
  | 'defender-left'
  | 'file-opened'
  | 'piece-offside'
  | 'pawn-weakened'
  | 'outpost-conceded';

export interface Concession {
  kind: DrawbackKind;
  /** The square the student should be looking at. */
  square: string;
  /** First person, no apology — the coach IS the opponent here. */
  said: string;
  /** What the student is being pointed toward, WITHOUT the move. */
  opening: string;
}

/** How close to the coach's own king an abandoned square has to be before it
 *  counts as a hole rather than a square a piece stopped looking at. Three is
 *  the ring an attacking piece reaches in one move from the squares around the
 *  king. */
const NEAR_KING = 3;

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Which squares a side's pieces defend or attack, by square. */
function coverage(fen: string, color: Color): Map<string, number> {
  const out = new Map<string, number>();
  let board: Chess;
  try { board = new Chess(fen); } catch { return out; }
  // Force the colour to move so `moves()` reports its coverage, and clear en
  // passant + castling so the probe cannot invent a move the real position
  // does not allow.
  const parts = board.fen().split(' ');
  parts[1] = color;
  parts[3] = '-';
  let probe: Chess;
  try { probe = new Chess(parts.join(' ')); } catch { return out; }
  for (const mv of probe.moves({ verbose: true })) {
    out.set(mv.to, (out.get(mv.to) ?? 0) + 1);
  }
  return out;
}

/** Squares a side can land a real PIECE on — pawns excluded deliberately.
 *
 *  A pawn "using" an abandoned square is usually just a pawn move; the
 *  concession that teaches is a piece arriving somewhere nothing can chase it
 *  from. This is also what stops the beat reporting every rim square a bishop
 *  stopped looking at. */
function pieceLandings(fen: string, color: Color): Set<string> {
  const out = new Set<string>();
  const parts = fen.split(' ');
  if (parts.length < 6) return out;
  parts[1] = color;
  parts[3] = '-';
  let probe: Chess;
  try { probe = new Chess(parts.join(' ')); } catch { return out; }
  for (const mv of probe.moves({ verbose: true })) {
    if (mv.piece === 'p' || mv.piece === 'k') continue;
    out.add(mv.to);
  }
  return out;
}

/** Chebyshev distance from a colour's king — how close to home the square is. */
function distanceToKing(fen: string, color: Color, square: string): number {
  let king: string | null = null;
  try {
    for (const cell of new Chess(fen).board().flat()) {
      if (cell && cell.type === 'k' && cell.color === color) king = cell.square;
    }
  } catch { return 99; }
  if (!king) return 99;
  return Math.max(
    Math.abs(king.charCodeAt(0) - square.charCodeAt(0)),
    Math.abs(Number(king[1]) - Number(square[1])),
  );
}

/** Rank distance from a colour's own back rank — how far offside a piece went. */
function ranksFromHome(square: string, color: Color): number {
  const rank = Number(square[1]);
  return color === 'w' ? rank - 1 : 8 - rank;
}

/**
 * What the coach's move gave up, or null when nothing can be named.
 *
 * `played` and `best` are both moves from `fen` for the SAME side — the coach's
 * actual move and the engine's. The comparison is between two real boards, so
 * every claim is a difference two chess.js reads agree on.
 */
export function findConcession(args: {
  fen: string;
  /** SAN the coach actually played. */
  playedSan: string;
  /** SAN the engine preferred for the same side. */
  bestSan: string;
  /** The coach's colour — the side making the concession. */
  coachColor: 'white' | 'black';
}): Concession | null {
  if (args.playedSan === args.bestSan) return null; // nothing was given up
  const me: Color = args.coachColor === 'white' ? 'w' : 'b';
  const them: Color = me === 'w' ? 'b' : 'w';

  let after: Chess;
  let alt: Chess;
  let moved;
  try {
    after = new Chess(args.fen);
    moved = after.move(args.playedSan);
    alt = new Chess(args.fen);
    alt.move(args.bestSan);
  } catch {
    return null;
  }
  if (!moved) return null;

  // A FORCING MOVE IS NOT A CONCESSION. A check or a capture may well be worse
  // than the engine's choice, but "I gave something up" is the wrong frame for
  // it — the student is looking at a threat, not at a hole. Before this, a
  // bishop sacrifice on f7 was reported as the piece having wandered offside.
  if (after.isCheck() || moved.captured) return null;

  // 1. A DEFENDER LEFT A SQUARE. The concession David described by name: "I
  //    remove one defender to attack over here." Provable as a coverage
  //    difference on the square the piece stopped watching.
  const before = coverage(args.fen, me);
  const now = coverage(after.fen(), me);
  // Where the STUDENT can put a real piece once the move is made. A square
  // nobody can use is not a concession, and this is measured AFTER the move
  // because that is the position the student is about to play in.
  const theirLandings = pieceLandings(after.fen(), them);

  let abandoned: string | null = null;
  for (const [square, count] of before) {
    if (count === 0) continue;
    if ((now.get(square) ?? 0) !== 0) continue;         // still covered
    // The move's own squares are not concessions. A bishop going c4→b5 stops
    // "attacking" b5 because it is STANDING on it, and the first version of
    // this happily reported that as a defender walking away — which is how the
    // beat reached 38% of all move pairs, most of them nonsense.
    if (square === moved.from || square === moved.to) continue;
    if (!theirLandings.has(square)) continue;
    // NEAR THE COACH'S OWN KING, or it is not a concession worth a word. A
    // bishop that stops eyeing a square on the far rim has not given anything
    // up; a square abandoned three files from the king is a hole an attack can
    // use, which is the thing the student is being pointed at.
    if (distanceToKing(after.fen(), me, square) > NEAR_KING) continue;
    if (!abandoned || distanceToKing(after.fen(), me, square) < distanceToKing(after.fen(), me, abandoned)) {
      abandoned = square;
    }
  }
  if (abandoned) {
    // David's framing — "I do not take your attack seriously so I remove one
    // defender to attack over here" — only fits when the piece actually went
    // to the OTHER WING. On a retreat it would be a non-sequitur, so the wing
    // is checked rather than assumed, and the plain statement is used instead.
    const wentAcross = Math.abs(moved.to.charCodeAt(0) - abandoned.charCodeAt(0))
      > Math.abs(moved.from.charCodeAt(0) - abandoned.charCodeAt(0)) + 1;
    return {
      kind: 'defender-left',
      square: abandoned,
      said: wentAcross
        ? `I don't rate your play over there, so I've taken a defender off ${abandoned} to play on the other wing.`
        : `That takes my last defender off ${abandoned}.`,
      opening: `Nothing of mine is watching ${abandoned} now.`,
    };
  }

  // 2. A PAWN BECAME WEAK that the engine's move would have kept healthy.
  const weakNow = findWeakPawns(after.fen(), me);
  const weakAlt = findWeakPawns(alt.fen(), me);
  const newIsolated = weakNow.isolated.find((sq) => !weakAlt.isolated.includes(sq));
  if (newIsolated) {
    return {
      kind: 'pawn-weakened',
      square: newIsolated,
      said: `That leaves my pawn on ${newIsolated} isolated — no pawn of mine can ever defend it.`,
      opening: `A pawn that can only be defended by pieces is a target for the rest of the game.`,
    };
  }

  // 3. A FILE OPENED toward the coach's own king.
  if (moved.piece === 'p') {
    const file = moved.from[0];
    const stillMine = after.board().flat()
      .some((c) => c && c.type === 'p' && c.color === me && c.square[0] === file);
    let king: string | null = null;
    for (const c of after.board().flat()) if (c && c.type === 'k' && c.color === me) king = c.square;
    if (!stillMine && king && Math.abs(king.charCodeAt(0) - file.charCodeAt(0)) <= 1) {
      return {
        kind: 'file-opened',
        square: `${file}${king[1]}`,
        said: `Pushing that pawn opens the ${file}-file next to my own king.`,
        opening: `An open file beside a king is a road, and roads get used.`,
      };
    }
  }

  // 4. THE PIECE WENT OFFSIDE — further from its own king than the engine's
  //    move, with the student's pieces already reaching where it left.
  if (moved.piece !== 'p' && moved.piece !== 'k') {
    const wentTo = ranksFromHome(moved.to, me);
    const altTo = alt.history({ verbose: true })[0];
    const altRank = altTo ? ranksFromHome(altTo.to, me) : wentTo;
    if (wentTo >= 5 && wentTo > altRank + 1) {
      return {
        kind: 'piece-offside',
        square: moved.to,
        said: `My ${NAME[moved.piece] ?? 'piece'} has gone all the way to ${moved.to} — it is a long way from my own king.`,
        opening: `A piece that far from home takes moves to come back.`,
      };
    }
  }

  // 5. AN OUTPOST CONCEDED — the student gains a square the engine's move
  //    would have denied them.
  const goodNow = findPieceQuality(after.fen()).filter((q) => q.color === them && q.quality === 'good');
  const goodAlt = new Set(
    findPieceQuality(alt.fen()).filter((q) => q.color === them && q.quality === 'good').map((q) => q.square as string),
  );
  const conceded = goodNow.find((q) => !goodAlt.has(q.square as string));
  if (conceded) {
    return {
      kind: 'outpost-conceded',
      square: conceded.square,
      said: `That hands you ${conceded.square} — ${conceded.reason}.`,
      opening: `A square my pawns can never challenge is yours for as long as you want it.`,
    };
  }

  // NOTHING NAMEABLE. The move may well be worse; if code cannot say HOW, there
  // is no teaching in announcing it, and a coach that says "that was probably a
  // mistake" without saying why is noise. Silence is the honest answer.
  return null;
}

/**
 * The spoken beat, at the register the student has earned.
 *
 * The tiers are the same idea as everywhere else (`hintRegister`): the anchor
 * is what the coach did, the detail is what opened up, and the stakes spell out
 * why it matters. A strong student hears only the first and goes looking; a
 * struggling one is told what to look at — and neither is handed the move.
 */
export function concessionPackage(c: Concession): {
  anchor: string; detail: string; stakes: string; withhold: string;
} {
  return {
    anchor: c.said,
    detail: c.opening,
    stakes: `Now is the moment to do something about ${c.square}.`,
    // The honesty contract, and the never-apologize rule, travel together
    // because they fail together: a coach that apologises is inviting
    // reassurance, and a coach that names the punishing move has ended the
    // lesson it just started.
    withhold: `Do NOT name the move that punishes this, and do NOT apologise for the concession — state it plainly and let them find it.`,
  };
}
