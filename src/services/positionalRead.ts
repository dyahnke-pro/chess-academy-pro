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
import { Chess, type Color, type Square } from 'chess.js';
import {
  kingSafetyRead,
  developmentRead,
  findWeakPawns,
  findPieceQuality,
  goodPieceClause,
  findPawnBreaks,
  findColorComplexWeakness,
  findMinorityAttack,
  findPassedPawns,
  findOpenFiles,
  bishopBlockingPawns,
  namedPawnStructure,
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
export type ObservationKind =
  | 'plan' | 'king' | 'development' | 'piece' | 'structure' | 'lever'
  // WIDENED BOARD AWARENESS (David 2026-09-13: "increased scope … our strongest
  // narration tool"). Each is a concrete, board-provable feature, ranked by how
  // much it should lead a quiet-position read.
  | 'minority' | 'passer' | 'complex' | 'file';

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
  /** THE KEY SQUARES THIS OBSERVATION NAMES (David 2026-09-13: "add highlights
   *  to all spoken key squares"). Handed over with the fact so the board marks
   *  what the voice named — computed here, never scraped from the prose (the
   *  coupling rule). Empty when the read names only files/counts, not squares. */
  squares?: readonly string[];
}

/** Urgency by kind. A plan outranks the facts it is built from — that is the
 *  whole reason to build it. */
const RANK: Record<ObservationKind, number> = {
  plan: 100, king: 90, development: 70,
  // A concrete plan with a legal lever outranks a static piece read; a passer
  // and a colour-complex weakness are notable assets/targets; a fully-open file
  // is the lowest of the new rungs (a where-rooks-belong pointer).
  minority: 65, piece: 60, passer: 58, complex: 55, structure: 50, file: 45, lever: 40,
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

/** A rook of `color` can step onto `file` in one move along its own rank —
 *  the empty squares between, and a landing square that is empty or enemy. A
 *  rook already standing on the file counts as there. ONE predicate for every
 *  "your rook belongs on that file" claim. */
export function rookReachesFile(fen: string, color: Color, file: string): boolean {
  let b: Chess;
  try { b = new Chess(fen); } catch { return false; }
  for (const c of b.board().flat()) {
    if (!c || c.color !== color || c.type !== 'r') continue;
    if (c.square[0] === file) return true;
    const rank = c.square[1];
    const from = c.square.charCodeAt(0);
    const to = file.charCodeAt(0);
    const step = to > from ? 1 : -1;
    let clear = true;
    for (let f = from + step; f !== to; f += step) {
      if (b.get(`${String.fromCharCode(f)}${rank}` as Square)) { clear = false; break; }
    }
    const target = b.get(`${file}${rank}` as Square);
    if (clear && (!target || target.color !== color)) return true;
  }
  return false;
}

/** The castling right is held and every square between king and rook is empty. */
export function castleIsOneMoveAway(fen: string, color: Color): boolean {
  let b: Chess;
  try { b = new Chess(fen); } catch { return false; }
  const rights = fen.split(' ')[2] ?? '-';
  const r = color === 'w' ? '1' : '8';
  const clear = (files: readonly string[]): boolean => files.every((f) => !b.get(`${f}${r}` as Square));
  const kingSide = rights.includes(color === 'w' ? 'K' : 'k') && clear(['f', 'g']);
  const queenSide = rights.includes(color === 'w' ? 'Q' : 'q') && clear(['b', 'c', 'd']);
  return kingSide || queenSide;
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

  // QUEENS OFF, THE KING IS A FIGHTING PIECE. A centralised king in an
  // endgame is right, not a weakness, and "lines open toward your king" is the
  // middlegame worry (hand walk 2340, moves 32-34: both read with the queens
  // traded). No queen on the board → the king reads stay quiet.
  const queensOn = /[qQ]/.test(fen.split(' ')[0] ?? '');
  const king = queensOn ? kingSafetyRead(fen, color) : null;
  // "Get castled" is advice only when castling is ONE move away: the right is
  // still held and the squares between king and rook are empty. At move three
  // (1.e4 e5 2.Nf3 d6 3.d4) the f1-bishop still blocks it, so the line told the
  // student to castle when they could not — and faulted the book move d4 for it
  // (hand walk 2026-09-24). The student's version waits for that; the opponent's
  // version is a different claim (lines toward their king) and keeps its gate.
  const fullMove = Number(fen.split(' ')[5] ?? '1') || 1;
  // Theirs is a weakness only once they CANNOT castle next move and the
  // opening is over — at move five with …O-O one move away it is noise.
  const centreCounts = own
    ? castleIsOneMoveAway(fen, color)
    : !castleIsOneMoveAway(fen, color) && fullMove >= 8;
  if (king?.inCenter && !king.castled && centreCounts) {
    out.push({
      key: `${side}-king-centre`, side, kind: 'king', rank: rank('king'),
      squares: [king.square],
      text: own
        ? 'Your king is still in the centre and castling is ready — getting it tucked away is worth more than anything else right now.'
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
  const foeColor: Color = color === 'w' ? 'b' : 'w';
  const roads = (king?.openFilesNearKing ?? []).filter((f) => attackerCanUseFile(fen, f, foeColor));
  if (king?.exposed && roads.length > 0 && heavyAttackers > 0) {
    const files = roads.slice(0, 2).join(' and ');
    const plural = roads.length > 1 ? 's are' : ' is';
    out.push({
      key: `${side}-king-open-file`, side, kind: 'king', rank: rank('king'),
      text: own
        ? `The ${files} file${plural} open toward your king — that is the road an attack would come down.`
        : `The ${files} file${plural} open toward their king — that is the road an attack would come down.`,
    });
  }

  const mine = developmentRead(fen, color);
  const other = developmentRead(fen, color === 'w' ? 'b' : 'w');
  // Development is an opening/middlegame read: with the queens off, a knight
  // "at home" is an endgame piece, not a lag (hand walk 2026-09-25, move 36).
  if (queensOn && mine && other && mine.totalMinors > 0) {
    const asleep = mine.totalMinors - mine.developedMinors;
    // One tempo is not a lead in the first moves — White moves first, and
    // "they are ahead in development" after 1.e4 c6 2.Nf3 d5 3.e5 is a nag
    // about one knight (hand walk 1600). Two pieces, or one past move five.
    const lead = other.developedMinors - mine.developedMinors;
    const moveNo = Number(fen.split(' ')[5] ?? '1') || 1;
    if (asleep >= 2 && (lead >= 2 || (lead >= 1 && moveNo >= 6))) {
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
      squares: [outpost.square],
      text: own
        ? `Your ${NAME[outpost.piece] ?? 'piece'} on ${outpost.square} is your best-placed piece — ${goodPieceClause(outpost.kind, outpost.square)}.`
        // Not "their best-placed piece": the engine's piece read owns THEIR best
        // ("the piece doing the most work for them"), and two computers crowning
        // two different pieces on one move contradicted each other (hand walk
        // 2340: rook d8 "best-placed", then knight c6 "most work"). This names
        // the fact about the piece, which is true whichever wins that ranking.
        : `Their ${NAME[outpost.piece] ?? 'piece'} on ${outpost.square} is well placed — ${goodPieceClause(outpost.kind, outpost.square)}.`,
    });
  }
  // Same rule as the join: a piece still on its starting square is not a
  // problem piece, it is a piece that has not been developed yet.
  const startRank = color === 'w' ? '1' : '8';
  const bad = quality.find((q) => q.color === color && q.quality === 'bad' && q.square[1] !== startRank);
  if (bad) {
    out.push({
      key: `${side}-bad-${bad.square}`, side, kind: 'piece', rank: rank('piece'),
      squares: [bad.square],
      text: own
        // ONE sentence each: the say-once dedupe works per sentence, and a
        // tail left standing alone ("Keeping it bad is worth as much as
        // winning a pawn.", hand walk 2026-09-25) names nothing.
        ? `Your ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is your problem piece — ${bad.reason}, so improving it is a plan in itself.`
        : `Their ${NAME[bad.piece] ?? 'piece'} on ${bad.square} is their problem piece — ${bad.reason}, and keeping it bad is worth as much as winning a pawn.`,
    });
  }

  const weak = findWeakPawns(fen, color);
  // An isolated d-pawn IS the isolani — the structure lane names it with its
  // plan ("you hold the isolated queen's pawn…"), so this read stays off it
  // (hand walk 2340: both said it on one move).
  const isolani = /isolated queen/i.test(namedPawnStructure(fen, color)?.name ?? '');
  if (isolani) weak.isolated = weak.isolated.filter((sq) => sq[0] !== 'd');
  if (weak.isolated.length > 0) {
    out.push({
      key: `${side}-iso-${weak.isolated[0]}`, side, kind: 'structure', rank: rank('structure'),
      squares: [weak.isolated[0]],
      text: own
        ? `Your pawn on ${weak.isolated[0]} is isolated — no friendly pawn can ever defend it, so a piece has to.`
        : `Their pawn on ${weak.isolated[0]} is isolated — that is a long-term target worth playing against.`,
    });
  }
  if (weak.doubled.length > 0) {
    out.push({
      key: `${side}-doubled-${weak.doubled[0][0]}`, side, kind: 'structure', rank: rank('structure'),
      text: own
        ? `Your pawns on the ${weak.doubled[0][0]}-file are doubled — they can't defend each other, so each one needs a neighbour or a piece to guard it.`
        : `Their pawns on the ${weak.doubled[0][0]}-file are doubled — they can't defend each other, which makes them targets.`,
    });
  }

  const turned = withTurn(fen, color);
  const breaks = turned ? findPawnBreaks(turned) : [];
  if (breaks.length > 0) {
    out.push({
      key: `${side}-break-${breaks[0]}`, side, kind: 'lever', rank: rank('lever'),
      squares: [breaks[0]],
      text: own
        ? `A pawn break is available on ${breaks[0]} — in a quiet position the pawn levers are where the play comes from.`
        : `${you.charAt(0).toUpperCase()}${you.slice(1)} have a pawn break available on ${breaks[0]} — that is where their play comes from.`,
    });
  }

  // ── WIDENED BOARD AWARENESS (David 2026-09-13) — each fires only when the
  //    feature is genuinely on the board (selective at source, so the read never
  //    pads), and each runs for BOTH sides via the caller. ──────────────────────

  // MINORITY ATTACK — fewer pawns on a flank with a LEGAL lever onto an enemy
  // pawn. A concrete plan, so it leads the new rungs.
  const minority = findMinorityAttack(fen, color);
  if (minority) {
    out.push({
      key: `${side}-minority-${minority.flank}`, side, kind: 'minority', rank: rank('minority'),
      squares: [minority.leverTo, minority.target],
      text: own
        ? `You have a minority attack on the ${minority.flank} — ${minority.leverSan} makes contact and leaves them a weak pawn on ${minority.target}.`
        : `They have a minority attack on the ${minority.flank} — ${minority.leverSan} is the lever, and it would leave you a weak pawn on ${minority.target}.`,
    });
  }

  // PASSED PAWN — no enemy pawn ahead on its own or an adjacent file.
  const passers = findPassedPawns(fen, color);
  if (passers.length > 0) {
    out.push({
      key: `${side}-passer-${passers[0]}`, side, kind: 'passer', rank: rank('passer'),
      squares: [passers[0]],
      text: own
        ? `Your passed pawn on ${passers[0]} is a long-term trump — every trade that clears its path makes it stronger.`
        // WORD FOR WORD the structure plan's sentence (boardPlan), so the two
        // lanes that both read this passer are one claim to the dedupe — they
        // were heard back to back in two wordings (hand walk 1200).
        : `Their passed pawn on ${passers[0]} is the danger — get a piece in front of it and blockade before it runs.`,
    });
  }

  // COLOUR COMPLEX — a side missing the bishop of a colour with ≥2 own-camp holes
  // of it, so no piece naturally covers those squares.
  for (const cc of findColorComplexWeakness(fen)) {
    if (cc.side !== color) continue;
    const sqs = cc.squares.slice(0, 2).join(' and ');
    out.push({
      key: `${side}-complex-${cc.complex}`, side, kind: 'complex', rank: rank('complex'),
      squares: cc.squares.slice(0, 2),
      text: own
        ? `Your ${cc.complex} squares are weak — with no bishop of that colour, nothing covers ${sqs}, so a piece has to babysit them.`
        : `Their ${cc.complex} squares are weak — ${sqs} are holes their bishop can't cover; a knight belongs on one.`,
    });
    break; // one complex read is enough — the second is the same lesson
  }

  // FULLY-OPEN FILE — where the rooks belong. Only the fully-open files (semi-open
  // are too common to be notable), lowest of the new rungs, and STUDENT-side only:
  // a fully-open file is open for both, so emitting it on both passes would twin
  // (and the file token isn't an [a-h][1-8] square the dedupe guard catches).
  // Requires the side to actually HAVE a rook — on a pawnless K+K board every file
  // is "open" and means nothing, the same precondition the king-open-file rung uses.
  const openFiles = findOpenFiles(fen).open;
  if (own && openFiles.length > 0) {
    // A rook must be able to step ONTO the file in one move — the same one
    // predicate `danyaBehaviors`' open-file uses (hand walk 2026-09-24: at move
    // twelve the e1-queen and the c1-bishop walled both rooks off the d-file).
    const rookOn = (f: string): boolean => {
      try { return new Chess(fen).board().flat().some((c) => c && c.color === color && c.type === 'r' && c.square[0] === f); }
      catch { return false; }
    };
    const file = openFiles.some(rookOn) ? undefined : openFiles.find((f) => rookReachesFile(fen, color, f));
    if (file) {
      out.push({
        key: `${side}-file-${file}`, side, kind: 'file', rank: rank('file'),
        text: `The ${file}-file is open — that is where a rook wants to be.`,
      });
    }
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
  // A PIECE THAT HAS NOT MOVED IS NOT A PROBLEM PIECE. Every game starts with
  // both bishops hemmed in by their own pawns, so the bad-bishop test is true
  // of the opening position itself. A live prod run duly said, at move two,
  // "your bishop on f1 is your problem piece … and the pawn move to a3 is what
  // fixes it" — a3 "fixes" it only because a2 is a light square, so pushing it
  // drops the count below the threshold. True arithmetic, absurd teaching.
  const homeRank = color === 'w' ? '1' : '8';
  const atHome = new Set(badBefore.filter((b) => b.square[1] === homeRank).map((b) => b.square as string));

  // ONLY A PAWN ON THE BLOCKED RAY CAN FIX IT, AND ONE JOIN PER BISHOP
  // (WO-STANDARD-01 D-1, prod tape 2026-09-22: "a pawn to a6 would fix it"
  // spoken FOUR times at one ply — every pawn move that happened to drop the
  // colour count "fixed" the bishop, and each one was its own observation).
  // The blocking pawns are the bishop computer's own answer; a move by any
  // other pawn is not a fix, whatever it does to a count.
  const blockersOf = new Map<string, Set<string>>();
  for (const b of badBefore) {
    if (b.piece !== 'b') continue;
    blockersOf.set(b.square, new Set(bishopBlockingPawns(probe, b.square, color)));
  }
  const fixed = new Set<string>();
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
      if (atHome.has(b.square)) continue; // see `atHome`
      if (fixed.has(b.square)) continue; // one join per problem piece (D-1)
      const blockers = blockersOf.get(b.square);
      if (blockers && !blockers.has(mv.from)) continue; // not the blocking pawn (D-1)
      // The piece must not merely have MOVED out of the list — it has to still
      // be on its square and no longer be bad.
      if (stillBad.has(b.square)) continue;
      fixed.add(b.square);
      const piece = after.get(b.square);
      if (!piece || piece.type !== b.piece || piece.color !== color) continue;
      out.push({
        key: `${side}-join-${b.square}-${mv.to}`,
        side,
        kind: 'plan',
        rank: RANK.plan - (side === 'opponent' ? OPPONENT_PENALTY : 0),
        squares: [b.square, mv.to],
        text: side === 'student'
          ? `Your ${NAME[b.piece] ?? 'piece'} on ${b.square} is your problem piece — ${b.reason} — and the pawn move to ${mv.to} is what fixes it — that pairing is the plan, and the pawn move is not about the pawn.`
          : `Their ${NAME[b.piece] ?? 'piece'} on ${b.square} is their problem piece — ${b.reason} — and a pawn to ${mv.to} would fix it, so stopping that pawn is worth more than it looks.`,
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
): PositionalObservation | null {
  // Returns the whole observation (not just its text) so the caller can mark the
  // squares it named (David 2026-09-13: "add highlights to all spoken key
  // squares"). `.text` is the line; `.squares` are what to highlight.
  for (const o of readPosition(fen, studentColor)) {
    if (said?.has(o.key)) continue;
    said?.add(o.key);
    return o;
  }
  return null;
}

/** A file is a ROAD toward a king only if the ATTACKER has no pawn on it (hand
 *  walk 2026-09-24: "the d-file is open toward their king" with White's own
 *  d3-pawn standing on it — the file was open for BLACK, not for the attack). */
export function attackerCanUseFile(fen: string, file: string, attacker: 'w' | 'b'): boolean {
  try {
    const b = new Chess(fen);
    for (let r = 1; r <= 8; r += 1) {
      const p = b.get(`${file}${r}` as Square);
      if (p && p.type === 'p' && p.color === attacker) return false;
    }
    return true;
  } catch { return true; }
}
