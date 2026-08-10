// positionalRead — something true to say when nothing is happening.
//
// David 2026-08-08, after seeing the ply-by-ply transcript: "There needs to be
// positional notes then or something at the silent plies."
//
// Measured over the 656 student plies of the repertoire we teach, all lanes
// together speak on 54.3%. The corpus reaches ~14% (only 6,768 of 58,124 notes
// carry a position at all), the tactic and threat detectors reach the sharp
// moments, and `buildPlayCommentary` covers the rest of what is CONCRETE. What
// is left is the quiet middle: legal, balanced, nothing hanging, no alignment —
// and a coach that says nothing there feels absent for half the game.
//
// A quiet position is not an empty one. It has a king that has or has not
// castled, a development count, a weak pawn, an outpost, a lever available. All
// of that is already computed, board-true, in `positionReadingService` — and
// was reachable only through `formatReadingFacts`, a prompt block that opens
// "READING FACTS (GROUND TRUTH …)" and can never be spoken. So the facts
// existed and the voice could not use them.
//
// This turns the same computation into ONE spoken sentence. Ranked, so the
// student hears the most useful observation rather than the first one found,
// and hard-capped at one: filling silence with a paragraph is how a coach gets
// muted.
//
// It is the LOWEST-priority lane by design. It should never displace a tactic,
// a threat, a gem or a taught note — it is what plays when none of them have
// anything, which per the measurement is about half the game.
import { Chess, type Color } from 'chess.js';
import {
  kingSafetyRead,
  developmentRead,
  findWeakPawns,
  findPieceQuality,
  findPawnBreaks,
} from './positionReadingService';

const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * ONE OBSERVATION about the position, on either side of the board.
 *
 * David 2026-08-09: "We will need to know the plans for both sides. That is the
 * most important part of teaching chess." This read was built one-sided — eight
 * of its nine rungs described the student and nothing else — so a coach using
 * it could describe half a chess position. Every rung now runs for both
 * colours, and each observation carries whose it is.
 */
export type ObservationKind = 'plan' | 'king' | 'development' | 'piece' | 'structure' | 'lever';

export interface PositionalObservation {
  /** Dedupe key for the caller's said-set. */
  key: string;
  /** Whose feature this is. */
  side: 'student' | 'opponent';
  kind: ObservationKind;
  /** Higher speaks first. The caller decides how far down the list to read. */
  rank: number;
  /** Speakable as-is. Names squares, never a move. */
  text: string;
}

/** Urgency by kind. A plan outranks the facts it is built from — that is the
 *  whole reason to build it. */
const RANK: Record<ObservationKind, number> = {
  plan: 100, king: 90, development: 70, piece: 60, structure: 50, lever: 40,
};

/** The same fact about the opponent is worth slightly less than about the
 *  student, so ties break toward the board the student is responsible for. */
const OPPONENT_PENALTY = 5;

/** A position with `color` to move — the reading helpers that only look at the
 *  side to move (pawn breaks) need this to answer for the other side. En
 *  passant is cleared because it belongs to the real move order. */
function withTurn(fen: string, color: Color): string | null {
  const parts = fen.split(' ');
  if (parts.length < 6) return null;
  parts[1] = color;
  parts[3] = '-';
  try {
    new Chess(parts.join(' '));
  } catch {
    return null;
  }
  return parts.join(' ');
}

/** Every observation for one side. */
function observationsFor(
  fen: string,
  color: Color,
  side: 'student' | 'opponent',
): PositionalObservation[] {
  const out: PositionalObservation[] = [];
  const rank = (k: ObservationKind): number => RANK[k] - (side === 'opponent' ? OPPONENT_PENALTY : 0);
  const own = side === 'student';
  const your = own ? 'Your' : 'Their';
  const you = own ? 'you' : 'they';

  const king = kingSafetyRead(fen, color);
  if (king?.inCenter && !king.castled) {
    out.push({
      key: `${side}-king-centre`, side, kind: 'king', rank: rank('king'),
      text: own
        ? 'Your king is still in the centre — getting it castled is worth more than another pawn move right now.'
        : 'Their king is still in the centre — every line that opens toward it is worth looking at.',
    });
  }
  // An open file next to a king is only "the road an attack comes down" if the
  // other side owns something that travels down files. Without this the read
  // fires on a bare king-and-pawn ending — every file is open there, and the
  // attack it warns about cannot exist. A precondition the caller can name is
  // the difference between a fact and a scary-sounding one.
  const heavyAttackers = (() => {
    try {
      const b = new Chess(fen);
      const foe: Color = color === 'w' ? 'b' : 'w';
      return b.board().flat().filter((c) => c && c.color === foe && (c.type === 'r' || c.type === 'q')).length;
    } catch { return 0; }
  })();
  if (king?.exposed && king.openFilesNearKing.length > 0 && heavyAttackers > 0) {
    const files = king.openFilesNearKing.slice(0, 2).join(' and ');
    const plural = king.openFilesNearKing.length > 1 ? 's are' : ' is';
    out.push({
      key: `${side}-king-open-file`, side, kind: 'king', rank: rank('king'),
      text: own
        ? `The ${files} file${plural} open toward your king — that is the road an attack would come down.`
        : `The ${files} file${plural} open toward their king — that is the road an attack would come down.`,
    });
  }

  const mine = developmentRead(fen, color);
  const other = developmentRead(fen, color === 'w' ? 'b' : 'w');
  if (mine && other && mine.totalMinors > 0) {
    const asleep = mine.totalMinors - mine.developedMinors;
    if (asleep >= 2 && other.developedMinors > mine.developedMinors) {
      out.push({
        key: `${side}-development`, side, kind: 'development', rank: rank('development'),
        text: own
          ? `You still have ${asleep} minor pieces at home and they are ahead in development — the next move probably belongs to a piece, not a pawn.`
          : `They still have ${asleep} minor pieces at home — a lead in development is only worth something while it lasts.`,
      });
    }
  }

  const quality = findPieceQuality(fen);
  const outpost = quality.find((q) => q.color === color && q.quality === 'good');
  if (outpost) {
    out.push({
      key: `${side}-good-${outpost.square}`, side, kind: 'piece', rank: rank('piece'),
      text: own
        ? `Your ${NAME[outpost.piece] ?? 'piece'} on ${outpost.square} is your best-placed piece — ${outpost.reason}.`
        : `Their ${NAME[outpost.piece] ?? 'piece'} on ${outpost.square} is their best-placed piece — ${outpost.reason}. Trading it off is a plan in itself.`,
    });
  }
  const bad = quality.find((q) => q.color === color && q.quality === 'bad');
  if (bad) {
    out.push({
      key: `${side}-bad-${bad.square}`, side, kind: 'piece', rank: rank('piece'),
      text: own
        ? `Your ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is your problem piece — ${bad.reason}. Improving it is a plan in itself.`
        : `Their ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is their problem piece — ${bad.reason}. Keeping it bad is worth as much as winning a pawn.`,
    });
  }

  const weak = findWeakPawns(fen, color);
  if (weak.isolated.length > 0) {
    out.push({
      key: `${side}-iso-${weak.isolated[0]}`, side, kind: 'structure', rank: rank('structure'),
      text: own
        ? `Your pawn on ${weak.isolated[0]} is isolated — no friendly pawn can ever defend it, so a piece has to.`
        : `Their pawn on ${weak.isolated[0]} is isolated — that is a long-term target worth playing against.`,
    });
  }
  if (weak.doubled.length > 0) {
    out.push({
      key: `${side}-doubled-${weak.doubled[0][0]}`, side, kind: 'structure', rank: rank('structure'),
      text: own
        ? `Your pawns on the ${weak.doubled[0][0]}-file are doubled — they cannot defend each other, so the file matters more than the count.`
        : `Their pawns on the ${weak.doubled[0][0]}-file are doubled — the file in front of them is the weakness, not the pawn count.`,
    });
  }

  const turned = withTurn(fen, color);
  const breaks = turned ? findPawnBreaks(turned) : [];
  if (breaks.length > 0) {
    out.push({
      key: `${side}-break-${breaks[0]}`, side, kind: 'lever', rank: rank('lever'),
      text: own
        ? `A pawn break is available on ${breaks[0]} — in a quiet position the pawn levers are where the play comes from.`
        : `${you.charAt(0).toUpperCase()}${you.slice(1)} have a pawn break available on ${breaks[0]} — that is where their play comes from.`,
    });
  }
  void your;
  return out;
}

/**
 * THE JOINS — where teaching actually lives.
 *
 * A bad piece is a fact. An available break is a fact. A bad piece plus the
 * break that FREES it is a plan, and the ranked list above would have spoken
 * them as two unrelated observations on two different plies, if at all.
 *
 * The join is PROVED, not asserted: play the break on a probe board and re-run
 * the same quality read. If the piece is no longer bad, the two facts really
 * are one plan. If it is still bad, they are two facts and stay separate — no
 * amount of plausibility makes an unproved join speakable (G0).
 */
function joinsFor(
  fen: string,
  color: Color,
  side: 'student' | 'opponent',
): PositionalObservation[] {
  const turned = withTurn(fen, color);
  if (!turned) return [];
  const badBefore = findPieceQuality(fen).filter((q) => q.color === color && q.quality === 'bad');
  if (badBefore.length === 0) return [];
  const out: PositionalObservation[] = [];
  let probe: Chess;
  try { probe = new Chess(turned); } catch { return []; }
  for (const mv of probe.moves({ verbose: true })) {
    if (mv.piece !== 'p') continue;
    let after: Chess;
    try {
      after = new Chess(turned);
      after.move(mv);
    } catch { continue; }
    const stillBad = new Set(
      findPieceQuality(after.fen())
        .filter((q) => q.color === color && q.quality === 'bad')
        .map((q) => q.square as string),
    );
    for (const b of badBefore) {
      // The piece must not merely have MOVED out of the list — it has to still
      // be on its square and no longer be bad.
      if (stillBad.has(b.square)) continue;
      const piece = after.get(b.square);
      if (!piece || piece.type !== b.piece || piece.color !== color) continue;
      out.push({
        key: `${side}-join-${b.square}-${mv.to}`,
        side,
        kind: 'plan',
        rank: RANK.plan - (side === 'opponent' ? OPPONENT_PENALTY : 0),
        text: side === 'student'
          ? `Your ${NAME[b.piece] ?? 'piece'} on ${b.square} is your problem piece — ${b.reason} — and the pawn move to ${mv.to} is what fixes it. That pairing is the plan: the pawn move is not about the pawn.`
          : `Their ${NAME[b.piece] ?? 'piece'} on ${b.square} is their problem piece — ${b.reason} — and a pawn to ${mv.to} would fix it. Stopping that pawn is worth more than it looks.`,
      });
      break; // one join per bad piece; the first proved fix is enough to teach
    }
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * Every observation about the position, both sides, most urgent first.
 *
 * The caller decides how much to say — which is what makes the hint register
 * (`hintRegister`) able to hand over one fact or three from the same read.
 */
export function readPosition(
  fen: string,
  studentColor: 'white' | 'black',
): PositionalObservation[] {
  const me: Color = studentColor === 'white' ? 'w' : 'b';
  const them: Color = me === 'w' ? 'b' : 'w';
  const all = [
    ...joinsFor(fen, me, 'student'),
    ...joinsFor(fen, them, 'opponent'),
    ...observationsFor(fen, me, 'student'),
    ...observationsFor(fen, them, 'opponent'),
  ];
  // A join supersedes the bare fact it was built from — otherwise the coach
  // says "your bishop is bad" and then, a rung later, "your bishop is bad and
  // here is the break that fixes it".
  const joinedSquares = new Set(
    all.filter((o) => o.kind === 'plan').map((o) => o.key.split('-')[2]),
  );
  const deduped = all.filter((o) => !(o.kind === 'piece' && joinedSquares.has(o.key.split('-').pop() ?? '')));
  return deduped.sort((a, b) => b.rank - a.rank);
}

/**
 * One speakable observation about a quiet position, or '' when even this has
 * nothing — which is rare, and when it happens silence is the honest answer.
 *
 * The single-sentence face of `readPosition`: take the highest-ranked thing
 * nobody has said yet. Kept because the quiet lane must stay hard-capped at one
 * sentence — filling silence with a paragraph is how a coach gets muted.
 *
 * Deliberately NOT a "your strongest piece is X" fallback. That branch existed
 * and was cut on 2026-08-08 after reading its output: on a quiet Pirc it
 * produced "Your queen on d1 is doing the most work — build around it." True by
 * the mobility score, and terrible teaching — the queen had not moved, and
 * "build around it" is advice a student would be worse for taking. Silence
 * beats bad advice.
 */
export function buildPositionalRead(
  fen: string,
  studentColor: 'white' | 'black',
  /** Observation keys already spoken this game. A quiet position often has the
   *  SAME true thing to say for many plies running — an uncastled king stays
   *  uncastled — and repeating it is what makes a coach sound stuck. So the
   *  ladder SKIPS what has been said and descends to the next true observation
   *  instead. Caller owns the set for the game. */
  said?: Set<string>,
): string {
  for (const o of readPosition(fen, studentColor)) {
    if (said?.has(o.key)) continue;
    said?.add(o.key);
    return o.text;
  }
  return '';
}
