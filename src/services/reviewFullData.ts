/**
 * reviewFullData — the UNCAPPED diagnostic aggregator (David 2026-07-20: "turn off
 * all narration caps … I want to hear ALL the computed data the position holds, on
 * every move"). The production review deliberately speaks ONE beat per move and
 * caps each teaching message to once per game (silence is a feature there). This
 * module does the opposite: on EVERY move it gathers EVERY computed facet the
 * position holds into an ordered list, so nothing is suppressed. It is the single
 * inventory of "what the review can compute" — every fact-computer is called here.
 *
 * Everything is board-truth (G0 — chess.js + the existing pure computers); the
 * uncapped review speaks these verbatim (un-warmed) so no fact is compressed away
 * and the gaps are visible. Each facet is a labeled prose clause.
 */
import { inFluxAfter } from './boardState';
import { readTiming, timingClause } from './moveTiming';
import { contrastMoves, contrastClause } from './moveContrast';
import { detectBluff, bluffClause } from './bluffDetector';
import { computeGemCrush } from './gemCrushLines';
import { getPunishGemById } from '../data/lessons/punishGems';
import { Chess, type Color, type Square } from 'chess.js';
import { plyFactsForMove } from './pvPlayback';
import { findMinorityAttack, findColorComplexWeakness } from './positionReadingService';
import { detectTactics } from './tacticsDetector';
import { verifyForkOnBoard } from './tacticVerification';
import { seatPieceReferences, detectNewThreat } from './groundedAnswer';
import { costStakes, exchangeStakes, forkPoints, piecesOn, isScenicPawnPin, isSacrifice, MATE_POINTS, type FactStakes } from './factStakes';
import { describeStructure } from './boardStructure';
import { assessPositionalEdge, phaseVerdictLine } from './reviewPositionalAssessment';
import type { RefutedAlternative } from './refutedAlternative';
import { MIN_ALTERNATIVE_SHARE } from './refutedAlternativeCore';
import { principleLine } from './moveFundamentals';
import { threatStoppedBy } from './opponentMovePurpose';
import { isMateEval } from './engineConstants';
import { computeBoardDelta } from './boardDelta';
import { sacrificeCompensation, enemyKingStuckInCenter, describeSacBreaksKingShield } from './reviewSacrifice';
import { explainMatingSacMechanism } from './reviewForcedSequence';
import { buildMiddlegameOrientation, buildOpeningDevelopmentPlan } from './reviewStrategicOrientation';
import { buildOpponentMoveTeaching, buildOpponentDevelopmentRead } from './reviewOpponentCommentary';
import { nameEndgamePhase } from './reviewMoveTeaching';
import { detectOpening } from './openingDetectionService';
import { planRaceClause } from './planRace';
import { attackerDefenderCount, royalDefenderTarget, rookOnSeventh, badEnemyBishop, worstPlacedFriendlyPiece, passedPawnPush, deriveNextPlans, findTrappedPiece } from './reviewTeachingPoints';
import type { PrincipleAttribution, FundamentalId } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';
import { betterMoveReason } from './inaccuracyCall';
import { andList } from '../utils/andList';
import { stemKeyOf } from '../utils/rotateStem';

interface Located { type: string; color: Color; square: string; }

const MINOR_HOME: Record<Color, Record<'n' | 'b', string[]>> = {
  w: { n: ['b1', 'g1'], b: ['c1', 'f1'] },
  b: { n: ['b8', 'g8'], b: ['c8', 'f8'] },
};
/** How many of `color`'s knights + bishops have left their home squares. */
function developedMinors(chess: Chess, color: Color): number {
  let dev = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== color || (sq.type !== 'n' && sq.type !== 'b')) continue;
      if (!MINOR_HOME[color][sq.type].includes(sq.square)) dev += 1;
    }
  }
  return dev;
}
/** Has `color`'s king reached a castled square (g/c file on its back rank)? */
function kingCastled(chess: Chess, color: Color): boolean {
  const back = color === 'w' ? '1' : '8';
  for (const row of chess.board()) {
    for (const sq of row) {
      if (sq && sq.color === color && sq.type === 'k') {
        return sq.square[1] === back && (sq.square[0] === 'g' || sq.square[0] === 'c');
      }
    }
  }
  return false;
}
/** Central files (d, e) with no pawn of either side — a proxy for an opened centre. */
function openCentralFiles(chess: Chess): number {
  let open = 0;
  for (const f of ['d', 'e']) {
    let pawn = false;
    for (let r = 1; r <= 8; r++) { const p = chess.get(`${f}${r}` as never); if (p && p.type === 'p') { pawn = true; break; } }
    if (!pawn) open += 1;
  }
  return open;
}
/**
 * WHY a mistaken move is bad, for the one classic case we can PROVE: a central
 * pawn break (d/e-file pawn) that OPENS the centre while the mover is behind in
 * development (fewer developed minors) or has not castled while the opponent
 * has. Danya's "e5 is premature — opening the centre before you're ready,
 * because you're underdeveloped." Fires ONLY when BOTH the break and the lag are
 * real on the board (G3 + David 2026-07-19: never overstate a non-applicable
 * why). Returns the clause, or null when it doesn't genuinely apply.
 */
export function prematureBreakWhy(fenBefore: string, san: string): string | null {
  try {
    const before = new Chess(fenBefore);
    const mover = before.turn();
    const enemy: Color = mover === 'w' ? 'b' : 'w';
    const after = new Chess(fenBefore);
    const mv = after.move(san.replace(/[?!]+$/, ''));
    if (!mv || mv.piece !== 'p') return null;
    // A central pawn BREAK — a d/e-file pawn thrust to the 4th/5th rank (also the
    // rank a central capture lands on). This is the "opening the centre" family
    // even when the files open only after the exchange (…dxe5 fxe5).
    const destRank = Number(mv.to[1]);
    if ((mv.to[0] !== 'd' && mv.to[0] !== 'e') || (destRank !== 4 && destRank !== 5)) return null;
    // Also honour a genuine immediate file-open, but don't require it.
    void openCentralFiles;
    const behindDev = developedMinors(before, mover) < developedMinors(before, enemy);
    const kingLag = !kingCastled(before, mover) && kingCastled(before, enemy);
    if (!behindDev && !kingLag) return null;                     // the lag must be real
    // Name the CONCRETE lag Danya names ("he doesn't have his bishop out"),
    // board-verified — a specific minor still on its starting square. Prefer a
    // bishop (his emphasis); never claim a home piece that isn't there.
    let homePiece: string | null = null;
    if (behindDev) {
      const homeMinors = before.board().flat().filter(
        (p): p is NonNullable<typeof p> => !!p && p.color === mover
          && (p.type === 'b' || p.type === 'n')
          && MINOR_HOME[mover][p.type].includes(p.square),
      );
      const pick = homeMinors.find((p) => p.type === 'b') ?? homeMinors[0];
      if (pick) homePiece = pick.type === 'b' ? 'a bishop' : 'a knight';
    }
    const reason = behindDev
      ? (homePiece ? `with ${homePiece} still at home` : 'still behind in development')
      : 'with the king still uncastled';
    return `a central break ${reason} — premature, opening the centre before you're ready for it`;
  } catch { return null; }
}

export interface MoveFactContext {
  fenBefore: string;
  fenAfter: string;
  san: string;
  ply: number;
  moverColor: 'white' | 'black';
  playerColor: 'white' | 'black' | undefined;
  studentColorWB: Color | null;
  /** White-POV centipawn eval AFTER the move (the analysis pipeline's number). */
  evaluation: number | null;
  preMoveEval: number | null;
  classification: string | null;
  bestMoveSan: string | null;
  /** The engine's line FROM the best move (UCI, the best move first). REQUIRED
   *  so the reason the better move is better is the same computer on every
   *  surface (`betterMoveReason`) — pass [] when the line is unknown. */
  bestLineUci: readonly string[];
  /** The engine's best REPLY at `fenAfter` (the next ply's best move), SAN, or
   *  null when there is none. REQUIRED: whether a move gave material depends
   *  on whether the opponent should take it (`isSacrifice`). */
  replyBestSan: string | null;
  prevCap: { square: string | null; capturedValue: number };
  /** Full SAN list of the game (for opening ID + forced-run + sac mechanism). */
  allSans: string[];
  /** 1-based ply where a forced mating run begins (from detectForcedMatingSequence), or null. */
  forcedRunStartPly: number | null;
  /** The fundamentals the (student, flagged) move neglected — attributed on the
   *  board by principleAttribution; the `[principle]` facet speaks them. */
  fundamentals?: PrincipleAttribution[];
  /** The GAME's say-once ledger for fundamentals — each is spoken in full with
   *  its HOW the first time and as a short stem after. Required, and owned by
   *  the caller that walks the game: a fresh set per ply (what this facet used
   *  to build) re-taught the same tempo lesson four times in one review
   *  (walk 5, R19). */
  seenFundamentals: Set<FundamentalId>;
  /** THE WO-TEACH-02 INPUTS — computed by the caller that walks the game
   *  (engine work happens before this synchronous builder runs). REQUIRED:
   *  `NO_TEACHING_CONTEXT` is the honest answer for a caller that has none,
   *  and a new caller must say so rather than inherit silence. */
  teaching: MoveTeachingContext;
}

export interface MoveTeachingContext {
  /** The move players at the student's level reach for here, with its engine
   *  cost and the line that proves it (S2) — student opening plies only. */
  refutedAlt: RefutedAlternative | null;
  /** The board before the PREVIOUS ply — on an opponent ply, the board the
   *  student's own move was played from, so "their reply stopped your threat"
   *  can be read (S3). Null on the first ply. */
  prevFenBefore: string | null;
  /** Set on the first ply the game is a middlegame / an endgame (S4). */
  phaseTurn: 'middlegame' | 'endgame' | null;
  /** Opening principles already SPOKEN this game (committed after the door),
   *  so each is taught once. */
  principlesTaught: ReadonlySet<string>;
}

export const NO_TEACHING_CONTEXT: MoveTeachingContext = {
  refutedAlt: null, prevFenBefore: null, phaseTurn: null, principlesTaught: new Set(),
};

const PIECE_PTS: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Board-truth: does the game end in checkmate delivered BY the student? Replays
 *  the SANs (glyph-independent — uses isCheckmate, not '#') and checks whether the
 *  side that made the final, mating move is the student's color. Used to suppress a
 *  shallow "inaccuracy" grade on the student's own forced-mate moves. */
function matingSideIsStudent(sans: string[], studentColorWB: Color | null): boolean {
  if (!studentColorWB || sans.length === 0) return false;
  try {
    const c = new Chess();
    for (const s of sans) c.move(s);
    if (!c.isCheckmate()) return false;
    // The side to move at a checkmate is the mated side; the mover was the other.
    const matedSide = c.turn(); // 'w' | 'b'
    const matingSide: Color = matedSide === 'w' ? 'b' : 'w';
    return matingSide === studentColorWB;
  } catch {
    return false;
  }
}

/**
 * Every computed facet for this move, ordered, each a prose clause. The uncapped
 * review joins them into the move's narration. This function IS the data inventory.
 */
/** Book depth for the empty-verdict rule. Ten plies is five moves a side — the
 *  span where "balanced" is a definition rather than a finding. */
const OPENING_VERDICT_SILENT_PLY = 10;

/** The positional eval shift worth a sentence (D-8). Below this the bar's
 *  movement is engine wobble between depths, and narrating it every ply was
 *  the "ticks 0.4 your way" drumbeat. */
export const EVAL_FACET_MIN_CP = 80;

export function computeMoveFacets(
  ctx: MoveFactContext,
  outSquares?: Map<string, readonly string[]>,
  /** Facts describing something the OPPONENT is doing TO the student, taken from
   *  the detector's own `beneficiary` — the signal `factSelector` uses to decide
   *  that their battery outranks your pin when both describe one diagonal.
   *  Coupled here, never inferred from the prose (G0). */
  outIncoming?: Set<string>,
  /** WHAT EACH FACET IS WORTH ON THE BOARD — coupled here from the computer
   *  that produced it (`factStakes.ts`); the door orders by it. */
  outStakes?: Map<string, FactStakes>,
  /** A facet's STRUCTURED identity, for the say-once commits after the door:
   *  `motif:<tactic type>` (the transfer ledger, S6) and `rule:<principle id>`
   *  (each opening principle once, S2). Coupled here, never read off prose. */
  outIdentity?: Map<string, string>,
): string[] {
  const facets: string[] = [];
  // Record the KEY SQUARES a facet named, keyed by the facet text, so the
  // review can lead the eye with a yellow highlight coupled from the COMPUTER's
  // own squares — never scraped from the prose (David 2026-09-13 "add highlights
  // to all spoken key squares"; G0 coupling). Only facets with a clean square
  // variable in scope record; prose-only facets (badbishop/worst) don't, so a
  // highlight never appears without a board-true square behind it.
  const recIncoming = (facet: string, beneficiary: 'w' | 'b' | undefined): void => {
    if (!outIncoming || !beneficiary || !ctx.studentColorWB) return;
    if (beneficiary !== ctx.studentColorWB) outIncoming.add(facet);
  };
  const recStakes = (facet: string, stakes: FactStakes | null | undefined): void => {
    if (outStakes && stakes && stakes.points > 0) outStakes.set(facet, stakes);
  };
  // …and on WHOSE idea it is: "your rook pins their pawn — you saw this idea on
  // move 15" referred back to THEIR pin of move 15 (hand walk 2000 review).
  const recMotif = (facet: string, motif: string, squares: readonly string[], side?: 'w' | 'b' | null): void => { outIdentity?.set(facet, `motif:${motif}@${side ?? '-'}:${squares.join('')}`); };
  const recSquares = (facet: string, squares: ReadonlyArray<string | null | undefined>): void => {
    if (!outSquares) return;
    const clean = squares.filter((s): s is string => typeof s === 'string' && /^[a-h][1-8]$/.test(s));
    if (clean.length) outSquares.set(facet, [...new Set(clean)]);
  };
  const { fenBefore, fenAfter, san, ply, moverColor, playerColor, studentColorWB } = ctx;
  const isStudent = playerColor ? moverColor === playerColor : false;
  const subj = isStudent ? 'You' : 'Your opponent';
  const moverWB: Color = moverColor === 'white' ? 'w' : 'b';
  const studentPovCp = ctx.evaluation != null && studentColorWB
    ? (studentColorWB === 'w' ? ctx.evaluation : -ctx.evaluation)
    : null;

  // ── 1. MOVE MECHANICS + MATERIAL + STRUCTURE DELTAS (the rich PlyFacts) ──
  const mech = plyFactsForMove(fenBefore, san, ctx.prevCap);
  if (mech) facets.push(`[move] ${subj}: ${lowerFirst(mech)}`);

  // ── 1b. WHAT THE MOVE NOW DOES — the per-move influence delta (David
  // 2026-07-22: "Each move changes the position and provides new threats and
  // positional challenges. Why doesn't the coach state what those are?").
  // The event computers above only speak on captures/checks/structure events,
  // which left QUIET moves with no beat of their own. This clause computes,
  // with chess.js attackers(), what the moved piece does from its NEW square:
  // enemy pieces it eyes, central squares it fights for, own pieces it now
  // guards. Every claim board-computed; emitted only when non-empty.
  const influenceSquares: string[] = [];
  const influenceShape = { hitsPiece: false };
  const influence0 = describeMoveInfluence(fenBefore, fenAfter, san, influenceSquares, influenceShape);
  const influence = influence0 && ctx.studentColorWB
    ? seatPieceReferences(influence0, fenAfter, ctx.studentColorWB)
    : influence0;
  // A move REASON only when the piece now bears on an enemy piece. "Fights for
  // d5" alone is the board's scenery, not why the move was played (walk 6, R3:
  // "Their pawn on c6 now fights for d5" on ~20 plies), so it rides as a
  // description — heard only beside a teaching point on the same squares.
  // A CAPTURE THEY CAN TAKE BACK IS A TRADE, and the trade is the move's
  // reason (2026-09-25). What the capturing piece "now eyes" describes a piece
  // about to be taken — the door drops it (`boardState`, in flux) — so without
  // this the ply went silent: 4…cxd4 in the Alapin had nothing left to say.
  const tradeSq = inFluxAfter(fenBefore, san);
  if (tradeSq) {
    try {
      const mv = new Chess(fenBefore).move(san);
      const NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
      const mine = NOUN[mv.piece] ?? 'piece';
      const theirs = NOUN[mv.captured ?? ''] ?? 'piece';
      const what = mine === theirs ? `a ${mine} trade` : isStudent ? `your ${mine} for their ${theirs}` : `their ${mine} for your ${theirs}`;
      const f = isStudent
        ? `[trade] You take on ${tradeSq}, and they can take back — ${what}.`
        : `[trade] They take on ${tradeSq}, and you can take back — ${what}.`;
      facets.push(f);
    } catch { /* no trade line */ }
  } else if (influence) { const f = `[${influenceShape.hitsPiece ? 'does' : 'delta'}] ${influence}`; facets.push(f); recSquares(f, influenceSquares); }

  // ── 1c. THE FULL BOARD DELTA — every other relevant change the move caused
  // (David 2026-07-22: "the package must contain every relevant change that
  // took place on the board so there are no silent moves"): lines it opened
  // behind it, own sliders it shut in, pieces it walked away from, squares a
  // pawn gave up for good, castling rights surrendered. Each clause computed
  // (boardDelta.ts, pure chess.js), seat-stamped, one [delta] facet per clause
  // so the coverage net guards each independently.
  // The squares come back keyed by the RAW clause, so re-key them onto the
  // finished facet text — that is what `factSelector` looks up. Without this the
  // `[delta]` facts stay geometry-blind and two clauses about one diagonal both
  // speak (David 2026-09-16, ply 23).
  const deltaSquares = new Map<string, readonly string[]>();
  for (const clause of computeBoardDelta(fenBefore, san, deltaSquares)) {
    const seated = ctx.studentColorWB ? seatPieceReferences(clause, fenAfter, ctx.studentColorWB) : clause;
    const f = `[delta] ${seated.charAt(0).toUpperCase()}${seated.slice(1)}.`;
    facets.push(f);
    recSquares(f, deltaSquares.get(clause) ?? []);
  }

  // ── 2. MOVE QUALITY (classification + eval swing + the better move) ──
  // MATE IS NOT A NUMBER OF PAWNS. A mate-encoded eval is a ±30,000 sentinel, so
  // subtracting one from a centipawn score and dividing by 100 told the student
  // "eval swung 300.0" on the move that walked into mate — the same six-figure
  // leak the coach's own callout had. When either side of the comparison is a
  // mate score there is no swing to report; the classification already says
  // 'blunder', and `[eval] mate` facets carry the rest.
  const swing = ctx.evaluation != null && ctx.preMoveEval != null
    && !isMateEval(ctx.evaluation) && !isMateEval(ctx.preMoveEval)
    ? Math.abs(ctx.evaluation - ctx.preMoveEval)
    : null;
  // SUPPRESS a NEGATIVE classification on the student's own move when that move is
  // part of the forced mating run the STUDENT delivers (David 2026-07-20 opera
  // ply-29 bug): 15.Bxd7+ starts a forced mate (…Nxd7 Qb8+ Nxb8 Rd8#) yet a
  // shallow analysis grades it an "inaccuracy" (it sees the sacked bishop before
  // the mate-in-3). Calling a mating move an inaccuracy is false teaching. A
  // GREAT/BRILLIANT label inside the run is real and stays; only inaccuracy/
  // mistake/blunder on the winning side's move is the depth artifact we drop.
  const negativeClass = ctx.classification === 'inaccuracy' || ctx.classification === 'mistake' || ctx.classification === 'blunder';
  const insideStudentForcedMate = isStudent
    && negativeClass
    && ctx.forcedRunStartPly != null
    && ctx.ply >= ctx.forcedRunStartPly
    && matingSideIsStudent(ctx.allSans, studentColorWB);
  if (ctx.classification && ctx.classification !== 'good' && ctx.classification !== 'book' && !insideStudentForcedMate) {
    // COST IS ONLY A COST ON A MOVE THAT COST SOMETHING (found 2026-09-16 by
    // reading the shipped review of David's Alapin: ply 31 spoke "that was a
    // great move, costing about 0.6 points" — a self-contradiction the student
    // reads as the coach not understanding its own verdict). `swing` is
    // |eval delta|, direction-free, so on a GREAT/BRILLIANT move it measures the
    // gain and the word "costing" inverts it. We do not have a computed
    // direction here we trust enough to say "gaining", so the honest move is
    // silence on the positive classes — empty > invented.
    const costsPoints = ctx.classification === 'inaccuracy'
      || ctx.classification === 'mistake'
      || ctx.classification === 'blunder';
    const swingBit = swing != null && costsPoints ? `, costing about ${(swing / 100).toFixed(1)} points` : '';
    // WHY it's a mistake, when we can prove it (a premature central break). Danya
    // leads with the positional reason, THEN names the better move — so does this.
    const whyBad = (ctx.classification === 'mistake' || ctx.classification === 'blunder' || ctx.classification === 'inaccuracy')
      ? prematureBreakWhy(fenBefore, san)
      : null;
    // A "STRONGER MOVE" ONLY WHEN THE MOVE FELL SHORT (walk 2026-09-23, prod
    // tape: "You: that was a great move — the stronger move was Kd7" on a GREAT
    // ply). On great/best/brilliant the engine's top line may still differ by
    // a hair, and naming it as "stronger" contradicts the verdict in the same
    // breath. The comparison earns voice only on a class that cost something.
    const fellShort = costsPoints || ctx.classification === 'miss';
    // THE REASON, from the one computer Learn's verdict uses (checks first,
    // then what the line wins) — review used to name the move and stop.
    const reason = ctx.bestMoveSan && fellShort
      ? betterMoveReason(fenBefore, san, ctx.bestMoveSan, ctx.bestLineUci, ctx.moverColor)
      : null;
    const better = ctx.bestMoveSan && fellShort ? `the stronger move was ${ctx.bestMoveSan}${reason ? ` — ${reason}` : ''}` : '';
    const tail = [whyBad, better].filter(Boolean).join('; ');
    const betterBit = tail ? ` — ${tail}` : '';
    // CARRY THE MOVER'S SUBJECT (David 2026-07-20 opera-ply-14 bug): a quiet move
    // (e.g. …Qe7) yields no [move] mechanics facet, so [quality] was the ONLY
    // clue to whose move it was — and with it subject-less, the LLM voiced Black's
    // great move as "a great move from you" (the White student). Mirror the [move]
    // facet's "You:" / "Your opponent:" tag so attribution is never guessed.
    // A positive verdict is PRAISE, not a reason (WO-TEACH-02): it rides the
    // move's own squares and speaks only beside a teaching fact about them.
    const positive = !costsPoints && !fellShort;
    const qf = `[${positive ? 'praise' : 'quality'}] ${subj}: ${qualityClause(ctx.classification, isStudent)}${swingBit}${betterBit}.`;
    facets.push(qf);
    if (positive) {
      try {
        const pm = new Chess(fenBefore).move(san);
        if (pm) recSquares(qf, [pm.from, pm.to]);
      } catch { /* no squares → it cannot be shown to support anything */ }
    }
    // The cost the move already paid — only on a class that cost something.
    if (costsPoints) recStakes(qf, costStakes(swing));
  }
  // ── 2a. THE FUNDAMENTAL NEGLECTED (David 2026-09-05) — the attributed rule
  // the flagged move crossed, proven on the board; stated as its own facet so
  // the uncapped inventory carries it and the capped cascade can lead with it.
  if (ctx.fundamentals && ctx.fundamentals.length > 0) {
    const pf = `[principle] ${renderFundamentalVerdict(ctx.fundamentals, { ply, seen: ctx.seenFundamentals })}`;
    facets.push(pf);
    // The rule explains the cost the move paid, so it is worth that cost.
    if (negativeClass) recStakes(pf, costStakes(swing));
  }

  // ── 2b. EVAL ATTRIBUTION — when the bar visibly moves on an UNFLAGGED ply,
  // say WHY (David 2026-07-22: "eval moves on every ply. So at the very least
  // we need to state the facts that caused the eval bar to move"). Flagged
  // plies already speak their swing in [quality]; this covers the quiet
  // drifts. Attribution stays computed: the MATERIAL component is exact
  // (chess.js), and when no material moved, the facet points at the computed
  // changes that fired on THIS ply ([does]/[delta]/[tactic]) — the real,
  // board-verified candidates — never an invented cause.
  // A CHECKMATE move is the story itself — "the eval bar dips 300.0 their way,
  // positional" over a mate is nonsense (a mate-sentinel eval read as a
  // 300-pawn positional drift; preview audit ply 33 Rd8#, 2026-07-22). Skip
  // eval attribution on a mate, and on any ply whose evals straddle a
  // mate-sentinel magnitude (the arithmetic there isn't a real pawn count).
  const MATE_SENTINEL_CP = 15000;
  const straddlesMate = studentPovCp !== null
    && (Math.abs(studentPovCp) >= MATE_SENTINEL_CP
      || (ctx.preMoveEval != null && Math.abs(ctx.preMoveEval) >= MATE_SENTINEL_CP));
  if (!san.includes('#') && !straddlesMate
    && studentPovCp !== null && ctx.preMoveEval != null && studentColorWB
    && (ctx.classification === 'good' || ctx.classification === 'book' || ctx.classification === null)) {
    const prevStudentPov = studentColorWB === 'w' ? ctx.preMoveEval : -ctx.preMoveEval;
    const d = studentPovCp - prevStudentPov;
    if (Math.abs(d) >= 30) {
      let materialStudentPov = 0;
      try {
        const c = new Chess(fenBefore);
        const mvv = c.move(san.replace(/[?!]+$/, ''));
        if (mvv?.captured) {
          const pts = PIECE_PTS[mvv.captured] ?? 0;
          materialStudentPov = (mvv.color === studentColorWB ? pts : -pts) * 100;
        }
      } catch { /* attribution stays positional */ }
      const dir = d > 0 ? 'your way' : 'their way';
      const mag = (Math.abs(d) / 100).toFixed(1);
      const materialExplains = materialStudentPov !== 0 && Math.abs(d - materialStudentPov) < Math.abs(d) / 2;
      if (materialExplains) {
        facets.push(`[eval] The eval bar moves ${mag} ${dir} — material changed hands, and the count above is the reason.`);
      } else {
        const fired: string[] = [];
        // A reason must point the SAME WAY as the swing (walk 5, R20). The
        // mover's new pressure and its tactic can only explain the bar moving
        // TOWARD the mover; after the opponent's c4 hit the student's rook the
        // review said the eval moved "your way — that is the new pressure the
        // move creates". A swing against the mover is explained, if at all, by
        // what the move gave up.
        const towardMover = (moverWB === studentColorWB) === (d > 0);
        if (towardMover && facets.some((f) => f.startsWith('[does]'))) fired.push('the new pressure the move creates');
        if (facets.some((f) => f.startsWith('[delta]'))) fired.push('the lines it opened and what it gave up');
        if (towardMover && facets.some((f) => f.startsWith('[tactic]'))) fired.push('the tactic now sitting on the board');
        // Only speak the eval shift when a CONCRETE change explains it. With no
        // grounded reason, the old fallback ("the activity balance moved with no
        // single tactical event") named nothing — pure filler. Silence teaches
        // better than filler (Narration Voice Rules; G3 — don't voice a reason we
        // don't have). David 2026-07-23 narration dial-in.
        // A BAR, AND A ROTATED STEM (WO-STANDARD-01 D-8, prod tape 2026-09-22:
        // "The eval bar ticks 0.4 your way with no material story: the shift
        // is positional" on nearly every review ply). A 0.3-pawn wobble on a
        // quiet ply is engine noise, not a fact worth a sentence; the facet
        // now needs a real positional shift (EVAL_FACET_MIN_CP) and its stem
        // rotates on the ply so the sentence that does earn its place is not
        // the same sentence every time. Still G0: the number and the reasons
        // are computed; only the wording rotates.
        if (fired.length && Math.abs(d) >= EVAL_FACET_MIN_CP) {
          const verb = d > 0 ? 'ticks' : 'dips';
          const stems = [
            `The eval bar ${verb} ${mag} ${dir} with no material story: the shift is positional — ${fired.join(', and ')}.`,
            `No material changed hands, yet the eval ${verb} ${mag} ${dir} — that is ${fired.join(', and ')} being priced in.`,
            `A positional swing of ${mag} ${dir}: nothing was captured, so the difference is ${fired.join(', and ')}.`,
          ];
          facets.push(`[eval] ${stems[ctx.ply % stems.length]}`);
        }
      }
    }
  }

  // ── 3. TACTICS ON THE RESULTING BOARD + LOOSE (undefended) PIECES ──
  // The detector's descriptions are seatless — stamp the deterministic
  // MINE/YOURS onto every piece reference before it enters the package, so
  // the house voice is HANDED the owner instead of inventing one (David
  // 2026-07-21: "ship the correct answer to the LLM").
  try {
    const t = detectTactics(fenAfter);
    // The ONE colour-named description the detector writes ("Black has a
    // checkmate available from c8") is seated here too — walk 6, R13 spoke it
    // to the student in the third person.
    const seat = (s: string): string => {
      if (!ctx.studentColorWB) return s;
      const me = ctx.studentColorWB === 'w' ? 'White' : 'Black';
      const seated = s.replace(/^(White|Black) has mate in one\b/,
        (_m, side: string) => (side === me ? 'You have mate in one' : 'They have mate in one'));
      return seatPieceReferences(seated, fenAfter, ctx.studentColorWB);
    };
    for (const tac of t.tactics) {
      if (tac.type === 'none' || !tac.description) continue;
      // A fork SHAPE is tempo-blind — the static scanner reports it whether or
      // not the owner ever executes it and whether or not it wins anything.
      // Verify it (tempo + SEE) before speaking it as a fact (David 2026-07-23:
      // "tell the computer whose move it is"). Live win / real threat / drop.
      if (tac.type === 'fork') {
        const v = verifyForkOnBoard(fenAfter, tac.involvedSquares[0], tac.involvedSquares.slice(1));
        // COUPLE THE SQUARES (2026-09-16). The detector already knows exactly
        // which squares a tactic involves; not recording them left every
        // [tactic] fact geometry-blind, so four readings of ONE configuration
        // (the pin, the battery, the lone defender, the royal guard on the
        // d1–e2–g4 diagonal) all spoke as if they were four separate findings.
        // Subsumption needs the squares, and scraping them back out of the
        // prose is the anti-pattern that caused this session's other bugs.
        if (v.status === 'live') {
          const f = `[tactic] ${seat(tac.description)} — it's the move, so the material comes off.`;
          facets.push(f); recSquares(f, tac.involvedSquares); recIncoming(f, tac.beneficiary);
          recStakes(f, { points: v.winsPoints, plies: 1 }); recMotif(f, tac.type, tac.involvedSquares, tac.beneficiary);
        } else if (v.status === 'threat') {
          const f = `[tactic] Threat: ${seat(tac.description)} — the defender can't save everything.`;
          facets.push(f); recSquares(f, tac.involvedSquares); recIncoming(f, tac.beneficiary);
          recStakes(f, { points: v.winsPoints || forkPoints(piecesOn(fenAfter, tac.involvedSquares.slice(1))), plies: 2 }); recMotif(f, tac.type, tac.involvedSquares, tac.beneficiary);
        }
        // status 'none' → unproven fork shape, say nothing (G0).
        continue;
      }
      {
        // What it wins by exchange on its own squares, from the side it hurts.
        const stakes = exchangeStakes(fenAfter, tac.involvedSquares, tac.beneficiary ? (tac.beneficiary === 'w' ? 'b' : 'w') : null);
        // A PIN ON A PAWN THAT WINS NOTHING IS SCENERY (walk 6, R5: "their
        // queen on d5 pins your pawn on g2 against your rook on h1" on move
        // two, and the fianchetto bishop "pinning" b7 for thirty moves). It
        // teaches only when the pin actually costs material.
        if (isScenicPawnPin(fenAfter, tac.type, tac.involvedSquares, tac.beneficiary)) continue;
        const f = `[tactic] ${seat(tac.description)}.`;
        facets.push(f); recSquares(f, tac.involvedSquares); recIncoming(f, tac.beneficiary);
        recStakes(f, stakes); recMotif(f, tac.type, tac.involvedSquares, tac.beneficiary);
      }
    }
    // ONLY THE DELTA SPEAKS (WO-STANDARD-01 D-8, prod tape 2026-09-22:
    // "Undefended right now: …" on nearly every ply). A piece that was loose
    // before this move and is still loose is standing state the student has
    // already heard; the sentence carries a new fact only for a piece this
    // move LEFT undefended. Computed against the previous board — the same
    // detector, one ply earlier — never a said-set on prose.
    if (t.hangingPieces.length > 0) {
      let before = new Set<string>();
      try { before = new Set(detectTactics(fenBefore).hangingPieces.map((h) => `${h.piece}${h.square}`)); } catch { before = new Set(); }
      // …and only a MINOR PIECE OR ROOK the opponent can actually win (walk 6,
      // R4: "Newly undefended: your pawn on e4" on move one, and a queen that
      // was merely attacked). A pawn is undefended half the opening and a
      // queen answers an attack by moving; neither is a loose-piece lesson.
      // ONE OWNER PER CLAIM (review tape 2026-09-25: "Newly undefended: your
      // bishop on g4" then "Watch out — that pawn leaves your bishop on g4
      // loose", back to back). A student piece the opponent's move ATTACKS is
      // stated by the opponent read below, which names the attacker.
      let attackedByMover: (sq: string) => boolean = () => false;
      if (!isStudent && studentColorWB) {
        try {
          const b = new Chess(fenAfter);
          const to = new Chess(fenBefore).move(san).to;
          attackedByMover = (sq) => b.get(sq as Square)?.color === studentColorWB && b.attackers(sq as Square, studentColorWB === 'w' ? 'b' : 'w').includes(to);
        } catch { attackedByMover = () => false; }
      }
      const fresh = t.hangingPieces.filter((h) => !before.has(`${h.piece}${h.square}`)
        && 'nbr'.includes(h.piece.toLowerCase())
        && exchangeStakes(fenAfter, [h.square]) !== null
        && !attackedByMover(h.square));
      if (fresh.length > 0) {
        const desc = fresh.map((h) => `${pieceWord(h.piece)} on ${h.square}`).join(', ');
        const f = `[loose] Newly undefended: ${seat(desc)}.`;
        facets.push(f); recSquares(f, fresh.map((h) => h.square));
        recStakes(f, exchangeStakes(fenAfter, fresh.map((h) => h.square)));
      }
    }
  } catch { /* ignore */ }

  // ── 3b. THE STUDENT'S NEW THREAT (David 2026-07-21: "The coach should
  // identify my threat and call it out!!") — null-move scan for the biggest
  // threat this move CREATED: mate-in-one / safe royal fork / clean win.
  if (ctx.studentColorWB && ctx.moverColor === ctx.playerColor) {
    const t = detectNewThreat(ctx.fenBefore, fenAfter, ctx.studentColorWB);
    if (t) {
      const threat = `you're now threatening ${t.san} — it ${t.detail}`;
      const f = `[threat] ${threat.charAt(0).toUpperCase()}${threat.slice(1)}.`;
      facets.push(f);
      // The student's next move cashes it (their opponent moves first: 2 plies).
      recStakes(f, t.kind === 'mate'
        ? { points: MATE_POINTS, plies: 2 }
        : t.kind === 'fork'
          ? { points: forkPoints(piecesOn(fenAfter, t.targetSquares)), plies: 2 }
          : { points: t.rank, plies: 2 });
    }
  }

  // ── 4. POSITIONAL VERDICT + THE FULL ASSET LIST (no cap) ──
  // Skip on a mating move — "checkmate" is the verdict, not "you're balanced"
  // (the eval at the mated position reads 0/odd). The mate is named by [move].
  if (studentColorWB && !san.includes('#')) {
    const assess = assessPositionalEdge(fenAfter, studentColorWB, studentPovCp);
    // A BARE "you're balanced" IN THE OPENING SAYS NOTHING (David 2026-09-16,
    // reading ply 1 of his own game: "You're balanced" after 1.e4). It is
    // trivially true of every opening position — the student knows the game
    // starts level — so it is a sentence spent on no information. Suppressed
    // ONLY when all three hold: it is still book depth, the verdict is the
    // neutral one, AND there is no REASON attached. A verdict with reasons
    // ("balanced: their pawn on d6 is isolated") is real teaching and always
    // speaks, and any non-neutral verdict speaks at any ply.
    const emptyOpeningVerdict = ctx.ply <= OPENING_VERDICT_SILENT_PLY
      && assess.reasons.length === 0
      && /^balanced$/i.test(assess.verdict ?? '');
    if (assess.verdict && !emptyOpeningVerdict) {
      const why = assess.reasons.length ? `: ${assess.reasons.join('; ')}` : '';
      facets.push(`[verdict] You're ${assess.verdict}${why}.`);
    }
  }

  // ── 5. STRUCTURE STATE (open/half-open files, outposts, passed/isolated/doubled) ──
  const struct = describeStructure(fenAfter);
  if (struct) {
    const s: string[] = [];
    if (struct.pawns.openFiles.length) s.push(`open files ${struct.pawns.openFiles.join(',')}`);
    if (struct.outposts.length) s.push(struct.outposts.map((o) => `${o.color === 'w' ? 'White' : 'Black'} ${o.piece === 'n' ? 'knight' : 'bishop'} outpost ${o.square}`).join('; '));
    const passed = [...struct.pawns.passedPawns.w.map((p) => `white ${p}`), ...struct.pawns.passedPawns.b.map((p) => `black ${p}`)];
    if (passed.length) s.push(`passed pawns ${passed.join(', ')}`);
    const iso = [...struct.pawns.isolatedPawns.w.map((p) => `white ${p}`), ...struct.pawns.isolatedPawns.b.map((p) => `black ${p}`)];
    if (iso.length) s.push(`isolated pawns ${iso.join(', ')}`);
    const dbl = [...struct.pawns.doubledFiles.w.map((f) => `white ${f}-file`), ...struct.pawns.doubledFiles.b.map((f) => `black ${f}-file`)];
    if (dbl.length) s.push(`doubled pawns ${dbl.join(', ')}`);
    if (s.length) facets.push(`[structure] ${s.join(' · ')}.`);
  }

  // ── 6. KING SAFETY (enemy king exposed in the centre) ──
  if (studentColorWB && enemyKingStuckInCenter(fenAfter, studentColorWB)) {
    facets.push('[king] Their king is stuck in the centre with a central file open on it.');
  }

  // ── 6a. TRAPPED PIECE — either side (David 2026-07-21: "the trapped piece
  // was the queen!!!"). Story-level event: a rook/queen with no safe square.
  if (studentColorWB) {
    const enemyWB: Color = studentColorWB === 'w' ? 'b' : 'w';
    const trapTheirs = findTrappedPiece(fenAfter, enemyWB);
    if (trapTheirs) { const f = `[trapped] Their ${trapTheirs.piece} on ${trapTheirs.square} is trapped — attacked by the ${trapTheirs.attackerPiece} on ${trapTheirs.attackerSquare}, and every escape square is covered; it's coming off the board.`; facets.push(f); recSquares(f, [trapTheirs.square, trapTheirs.attackerSquare]); recStakes(f, exchangeStakes(fenAfter, [trapTheirs.square])); }
    const trapMine = findTrappedPiece(fenAfter, studentColorWB);
    if (trapMine) { const f = `[trapped] Careful — your ${trapMine.piece} on ${trapMine.square} is trapped: attacked by the ${trapMine.attackerPiece} on ${trapMine.attackerSquare} with no safe square. Look for the cheapest way out.`; facets.push(f); recSquares(f, [trapMine.square, trapMine.attackerSquare]); recStakes(f, exchangeStakes(fenAfter, [trapMine.square])); }
  }

  // ── 6b. THE MISSING TEACHING POINTS (Naroditsky message catalog) ──
  if (studentColorWB) {
    const count = attackerDefenderCount(fenAfter, studentColorWB);
    if (count) facets.push(`[count] ${cap(count)}.`);
    const royal = royalDefenderTarget(fenAfter, studentColorWB);
    if (royal) facets.push(`[royal] ${cap(royal)}.`);
    const rook7 = rookOnSeventh(fenAfter, studentColorWB);
    if (rook7) facets.push(`[rook7] ${cap(rook7)}.`);
    const badB = badEnemyBishop(fenAfter, studentColorWB);
    if (badB) facets.push(`[badbishop] ${cap(badB)}.`);
    const worst = worstPlacedFriendlyPiece(fenAfter, studentColorWB);
    if (worst) facets.push(`[worst] ${cap(worst)}.`);
    const passer = struct?.pawns.passedPawns[studentColorWB][0] ?? null; // reuse §5's struct
    const passNote = passedPawnPush(fenAfter, studentColorWB, passer);
    if (passNote) { const f = `[passer] ${cap(passNote)}.`; facets.push(f); recSquares(f, [passer]); }

    // ── 6c. WIDENED BOARD AWARENESS ON REVIEW (David 2026-09-13: "I also want
    // these changes on review") — the same minority-attack + colour-complex
    // computers the Learn/Play read gained, in the retrospective register. Both
    // sides: a weakness in the opponent's camp is the student's plan; one in the
    // student's own camp is what to shore up. Deduped once per game by the caller.
    const enemyWB2: Color = studentColorWB === 'w' ? 'b' : 'w';
    const myMinority = findMinorityAttack(fenAfter, studentColorWB);
    if (myMinority) { const f = `[minority] You have a minority attack on the ${myMinority.flank} — ${myMinority.leverSan} makes contact and leaves them a weak pawn on ${myMinority.target}.`; facets.push(f); recSquares(f, [myMinority.target]); }
    const theirMinority = findMinorityAttack(fenAfter, enemyWB2);
    if (theirMinority) { const f = `[minority] They have a minority attack on the ${theirMinority.flank} — ${theirMinority.leverSan} is the lever, leaving you a weak pawn on ${theirMinority.target} to watch.`; facets.push(f); recSquares(f, [theirMinority.target]); }
    for (const cc of findColorComplexWeakness(fenAfter)) {
      const sqs = andList([...cc.squares]);
      if (cc.side === enemyWB2) { const f = `[complex] Their ${cc.complex} squares are weak — ${sqs} ${cc.squares.length === 1 ? 'is a hole' : 'are holes'} their bishop can't cover; a knight belongs on one.`; facets.push(f); recSquares(f, cc.squares); break; }
    }
    for (const cc of findColorComplexWeakness(fenAfter)) {
      const sqs = andList([...cc.squares]);
      if (cc.side === studentColorWB) { const f = `[complex] Your ${cc.complex} squares are weak — with no bishop of that colour, nothing covers ${sqs}.`; facets.push(f); recSquares(f, cc.squares); break; }
    }
    // FORWARD PLANS — what to DO from here + exactly HOW (David 2026-07-20: "add
    // in more future plans … and exactly how to do those plans"). EVERY applicable
    // plan, each with its method; deduped to first mention of each distinct plan
    // (see the caller) so the agenda is stated when it becomes relevant and
    // re-stated only when it changes.
    for (const plan of deriveNextPlans(fenAfter, studentColorWB, { studentPovCp })) {
      facets.push(`[plan-now] ${cap(plan)}.`);
    }
    // PLAN VERSUS PLAN — the RACE, in the retrospective register. `deriveNextPlans`
    // above states the student's agenda; it has never stated whose agenda arrives
    // first, which is the actual teaching when both sides are running. Silent
    // unless the two sides are running the SAME kind of plan toward the same kind
    // of terminal event — a cross-kind tempo number (pawn pushes vs rook moves)
    // is incomparable, and a confidently wrong number is worse than silence.
    const race = planRaceClause(fenAfter, studentColorWB, 'review');
    if (race) facets.push(`[plan-race] ${cap(race)}.`);
  }

  // ── 7. SACRIFICE — compensation + mechanism + king-shield removal ──
  try {
    const sb = new Chess(fenBefore);
    const smv = sb.move(san);
    if (smv) {
      // ONE RULE (`isSacrifice`): material handed over AND, when the engine's
      // reply is known, the opponent actually takes it.
      if (isSacrifice(fenBefore, san, ctx.replyBestSan) && studentColorWB) {
        // MOVER's POV, not the student's — the function judges the SAC from
        // the side that made it. Handing it the student's number flipped the
        // sign on every opponent sacrifice (D-4, 2026-09-22).
        const moverPovCp = studentPovCp === null ? null : (moverWB === studentColorWB ? studentPovCp : -studentPovCp);
        const moverPovBeforeCp = ctx.preMoveEval == null || isMateEval(ctx.preMoveEval) ? null
          : (moverWB === 'w' ? ctx.preMoveEval : -ctx.preMoveEval);
        const comp = sacrificeCompensation(fenAfter, moverWB, moverPovCp, moverWB === studentColorWB, moverPovBeforeCp);
        // Seated: "It's a sacrifice" on the opponent's move read as the student's
        // own (prod 2026-09-23, QGD c4). The clauses are already seated.
        if (comp.length) facets.push(`[sac] ${moverWB === studentColorWB ? 'Your' : 'Their'} move is a sacrifice — compensation: ${comp.join('; ')}.`);
        const mech = isStudent ? explainMatingSacMechanism(ctx.allSans, ply - 1) : null;
        if (mech) facets.push(`[sac-why] ${cap(mech)}.`);
        const shield = isStudent ? describeSacBreaksKingShield(fenBefore, san) : null;
        if (shield) facets.push(`[sac-why] ${shield}.`);
      }
    }
  } catch { /* ignore */ }

  // ── 7c. TWO GOOD MOVES, ONE DIFFERENCE (WO-LAYERS-01 step 6). The student's
  // move and the engine's best were both fine; name the one board-true thing
  // that separates them — what one of them leaves undefended.
  const goodish = ctx.classification === null || ctx.classification === 'good' || ctx.classification === 'book'
    || ctx.classification === 'great' || ctx.classification === 'excellent';
  if (isStudent && goodish && ctx.bestMoveSan && ctx.bestMoveSan.replace(/[+#!?]+$/, '') !== san.replace(/[+#!?]+$/, '')) {
    const c = contrastMoves(fenBefore, san, ctx.bestMoveSan);
    // The piece it names must stand on that square on the REAL board after the
    // move played — the other candidate's board is hypothetical.
    const onBoard = c ? (() => { try { const p = new Chess(fenAfter).get(c.square as Square); return !!p && p.type === c.piece && p.color === studentColorWB; } catch { return false; } })() : false;
    if (c && onBoard) {
      const t = `[contrast] ${contrastClause(c)}.`;
      facets.push(t);
      recSquares(t, [c.square]);
    }
  }

  // ── 7d. TIMING (WO-LAYERS-01 step 7) — the student's move, played a turn
  // early, would have lost material to a reply that no longer works.
  if (isStudent && ply >= 3 && ctx.allSans.length >= ply) {
    try {
      const early = new Chess();
      for (const m of ctx.allSans.slice(0, ply - 3)) early.move(m);
      const t = readTiming(early.fen(), fenBefore, san);
      if (t) {
        const f = `[timing] ${timingClause(t)}.`;
        facets.push(f);
        recSquares(f, [t.square]);
      }
    } catch { /* a replay that fails has no earlier board */ }
  }

  // ── 7a. THE BLUFF — "don't buy it" (WO-LAYERS-01 step 4). On the OPPONENT's
  // move: their piece lands in the student's half hitting things, and wins
  // nothing. Beginners spend tempo after tempo answering these.
  if (!isStudent && studentColorWB) {
    const bluff = detectBluff(fenBefore, san);
    if (bluff) {
      const t = `[bluff] ${bluffClause(bluff, ply <= 20)}.`;
      facets.push(t);
      recSquares(t, [bluff.square, ...bluff.targets.map((x) => x.square)]);
    }
  }

  // ── 7b. THE REFUTED ALTERNATIVE — "not X, because Y" (WO-LAYERS-01 step 3).
  // Naroditsky's single most common teaching move at every level: name the
  // move the student was about to play and why it fails. The data is the
  // mined punish-gems — amateur slips at rating bands, with their frequency,
  // an engine-verified punishment and the board-computed payoff (G3). Two
  // shapes: the mover AVOIDED a known slip (student ply — teach why), or the
  // opponent PLAYED one (the crush the student had — restores the review gem
  // note, which sat in the capped branch no real review runs).
  let gemRefuted = false;
  if (ply <= 24 && ctx.allSans.length >= ply) {
    try {
      const crush = computeGemCrush(undefined, ctx.allSans.slice(0, ply - 1));
      if (crush) {
        const strip = (x: string): string => x.replace(/[+#!?]+$/, '');
        const gem = getPunishGemById(crush.gemId);
        const played = strip(san) === strip(crush.inaccuracy);
        const moverSlips = moverColor === crush.opponentSide;
        if (isStudent && moverSlips && !played) {
          // "Often" only when it IS often. The prod tape said "often play c4
          // here in 2% of games" — gems are mined from 2% up, so the share
          // decides the wording; the claim (the slip, its refutation) does not.
          const pct = gem && gem.freqPct > 0 ? Math.round(gem.freqPct) : null;
          const lead = pct !== null && pct >= MIN_ALTERNATIVE_SHARE
            ? `${pct}% of players at your level play ${crush.inaccuracy} here`
            : pct !== null
              ? `The trap here is ${crush.inaccuracy} (${pct}% of games at your level)`
              : `The trap here is ${crush.inaccuracy}`;
          const rf = `[refuted] ${lead} — it loses to ${crush.punish}, ${crush.payoff}.`;
          facets.push(rf);
          // SAID ONCE PER GAME by the alternative itself (review tape
          // 2026-09-25: "Bg5 loses to Nxe4" on two consecutive moves, once from
          // the gem and once from the engine).
          outIdentity?.set(rf, `refuted:${strip(crush.inaccuracy)}`);
          gemRefuted = true;
        } else if (!isStudent && moverSlips && played) {
          const next = ctx.allSans[ply];
          const found = next !== undefined && strip(next) === strip(crush.punish);
          facets.push(found
            ? `[refuted] ${crush.inaccuracy} is a known mistake at club level, and you punished it with ${crush.punish}, ${crush.payoff}.`
            : `[refuted] ${crush.inaccuracy} is a known mistake at club level — ${crush.punish} punishes it, ${crush.payoff}.`);
        }
      }
    } catch { /* no gem here */ }
  }
  // The same fact, from the engine (WO-TEACH-02 S2): where no mined gem covers
  // the ply, the alternative players at the student's level actually reach for,
  // costed by the engine and proven by its own line. One `[refuted]` per ply —
  // the gem, when there is one, is the curated statement of the same claim.
  if (isStudent && !gemRefuted && ctx.teaching.refutedAlt) {
    const r = ctx.teaching.refutedAlt;
    const f = `[refuted] ${r.text}`;
    facets.push(f);
    outIdentity?.set(f, `refuted:${r.alt.replace(/[+#!?]+$/, '')}`);
    recStakes(f, costStakes(r.costCp));
    try {
      const am = new Chess(fenBefore).move(r.alt);
      recSquares(f, [am.from, am.to]);
    } catch { /* no squares → it cannot be collapsed with another claim */ }
  }

  // ── 7c. THE PRINCIPLE A QUIET OPENING MOVE FOLLOWS — once per game (S2).
  // Only where there is nothing to correct: a book/good/unclassified student
  // move inside the opening window, and only a principle not yet SPOKEN this
  // game (the ledger is committed after the door, so a principle the door
  // silenced may speak later).
  if (isStudent && ply <= 24 && (ctx.classification === null || ctx.classification === 'book' || ctx.classification === 'good')) {
    // Full the first time a principle speaks this game, a short stem after —
    // the one helper Learn's composer reads (`principleLine`).
    const lead = principleLine(fenBefore, san, moverColor, ctx.teaching.principlesTaught, stemKeyOf(fenBefore));
    if (lead) {
      const f = `[rule] ${lead.text}`;
      facets.push(f);
      // The FIRST statement of a principle carries its say-once identity; a
      // stem is its own move's fact and must not be eaten by that ledger.
      outIdentity?.set(f, lead.first ? `rule:${lead.id}` : `rule-stem:${ply}`);
      recSquares(f, lead.squares);
    }
  }

  // ── 7d. WHY DID THEY PLAY THAT? (S3) — on the opponent's move, the threat of
  // the student's it took off the board. The same static computer Learn reads.
  if (!isStudent && studentColorWB && ctx.teaching.prevFenBefore) {
    const stop = threatStoppedBy(ctx.teaching.prevFenBefore, fenBefore, san, studentColorWB);
    if (stop) {
      const f = `[stopped] ${stop.text}`;
      facets.push(f);
      recSquares(f, [stop.threat.from, stop.threat.landing]);
    }
  }

  // ── 7e. WHO'S BETTER, AND WHY — at the turn of the game (S4).
  if (studentColorWB && ctx.teaching.phaseTurn) {
    const cp = ctx.evaluation === null ? null : (studentColorWB === 'w' ? ctx.evaluation : -ctx.evaluation);
    const line = phaseVerdictLine(fenAfter, studentColorWB, cp, ctx.teaching.phaseTurn);
    if (line) facets.push(`[stock] ${line}`);
  }

  // ── 8. FORCED MATING RUN — this ply begins a forced checking finish ──
  if (ctx.forcedRunStartPly != null && ply === ctx.forcedRunStartPly) {
    const ff = '[forced] From here it is a forced checking run to mate — every move a check, no escape.';
    facets.push(ff);
    recStakes(ff, { points: MATE_POINTS, plies: 2 });
  }

  // ── 9. PLANS — opening development + middlegame orientation (both sides) ──
  if (studentColorWB) {
    const dev = buildOpeningDevelopmentPlan(fenAfter, studentColorWB, {});
    if (dev) facets.push(`[plan-opening] ${dev.text}`);
    // A slow "advance your majority" plan is a NON-APPLICABLE reason while the
    // enemy king is exposed in the centre — that's a king-hunt, not a majority
    // grind (David 2026-07-20 diagnostic: it fired every move of a mating attack).
    if (!enemyKingStuckInCenter(fenAfter, studentColorWB)) {
      const orient = buildMiddlegameOrientation(fenAfter, studentColorWB, undefined, isStudent ? 'student' : 'opponent');
      if (orient) facets.push(`[plan-middlegame] ${orient.text}`);
    }
  }

  // ── 10. OPENING IDENTITY (the named line so far) ──
  // ONCE, at its final name (walk 6, R16: "King's Pawn Game" → "Scandinavian"
  // → "Mieses-Kotroc" → "Main Line" spoke four times in six plies, because each
  // refinement is new text). The name spoken is the VARIATION: a bare family
  // ("King's Pawn Game", "Sicilian Defense") is a waypoint, and a comma
  // sub-line (", Main Line", ", Smith-Morra Declined") refines a name already
  // given. So every ply of one variation carries the same text and the say-once
  // ledger speaks it on the first ply that actually speaks — a need-silenced
  // ply cannot swallow it.
  // ONLY THE GAME'S FINAL VARIATION (WO-TEACH-02, prod tape 2026-09-24: "the
  // Indian Defense: Normal Variation" → "…: West Indian Defense" → "the King's
  // Indian Defense: Normal Variation" — three names for one opening, each a new
  // string the say-once ledger could not catch). Review sees the whole game,
  // so it names the variation the game SETTLED on, at the first ply it holds.
  const variationOf = (name: string | null): string | null =>
    name && name.includes(':') ? name.split(',')[0].trim() : null;
  const named = variationOf(detectOpening(ctx.allSans.slice(0, ply))?.name ?? null);
  const settled = settledVariation(ctx.allSans, variationOf);
  if (named && named === settled) facets.push(`[opening] The line so far is the ${named}.`);

  // ── 11. OPPONENT READ — what the opponent's move targets + their dev lag ──
  if (!isStudent && studentColorWB) {
    const opp = buildOpponentMoveTeaching(fenBefore, san, studentColorWB);
    // "Their knight on c3 now fights for d5. Your opponent's knight steps in
    // eyeing d5" — ONE claim, two families, spoken back to back on every
    // opponent development move (walk 5, 2026-09-23). The selector keeps
    // different families apart on purpose (B12), so the restatement is dropped
    // here, where both are known: the influence line (`[does]`, or `[delta]` when it hits no piece) already carries the reach.
    const restates = opp?.kind === 'influence' && !!influence;
    if (opp && !restates) { const f = `[opp-target] ${opp.text}`; facets.push(f); recSquares(f, opp.squares ?? []); }
    // The opponent's OWN moves so far (parity from the student's colour): white
    // plays odd ply numbers (even index), black plays even ply numbers (odd index).
    const oppIsWhite = studentColorWB === 'b';
    const oppSans = ctx.allSans.slice(0, ply).filter((_, i) => (i % 2 === 0) === oppIsWhite);
    const devRead = buildOpponentDevelopmentRead(oppSans, fenAfter, studentColorWB);
    if (devRead) facets.push(`[opp-dev] ${devRead.text}`);
  }

  // ── 12. ENDGAME PHASE ──
  const phase = nameEndgamePhase(fenAfter);
  if (phase) facets.push(`[endgame] The position is ${phase}.`);

  return facets;
}

/**
 * THROUGH-LINE THEME LEDGER (David 2026-07-20, future-analysis teaching #3 —
 * "stateful across plies"). A great review doesn't just narrate move-by-move; it
 * names the ONE idea that ran through the whole game ("this game was the story of
 * your isolated-pawn pressure", "the bad bishop never got into the game"). We tally
 * board-true themes across every middlegame ply and name the dominant one — the
 * through-line — as the closing. Pure board-truth (G0); null when no theme recurs
 * enough to be "the story" (empty > invented).
 */
export function computeThroughLine(fensAfter: string[], studentColorWB: Color | null): string | null {
  if (!studentColorWB || fensAfter.length < 12) return null;
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const tally: Record<string, number> = {};
  const bump = (k: string): void => { tally[k] = (tally[k] ?? 0) + 1; };
  let sampled = 0;

  // Sample from the middlegame onward (skip the opening ~ply 12), where a theme
  // is a real structural through-line rather than a fleeting opening detail.
  for (let i = 11; i < fensAfter.length; i += 1) {
    const fen = fensAfter[i];
    const struct = describeStructure(fen);
    if (!struct) continue;
    sampled += 1;
    let chess: Chess;
    try { chess = new Chess(fen); } catch { continue; }
    const all: Located[] = [];
    for (const row of chess.board()) for (const cell of row) if (cell) all.push({ type: cell.type, color: cell.color, square: cell.square });

    // Enemy isolated CENTRAL pawn we keep pressuring (the IQP story).
    if (struct.pawns.isolatedPawns[enemy].some((sq) => 'cde'.includes(sq[0]))) bump('iqp');
    // A student heavy piece owning an open file.
    if (all.some((p) => (p.type === 'r' || p.type === 'q') && p.color === studentColorWB && struct.pawns.openFiles.includes(p.square[0]))) bump('open-file');
    // A student outpost that lives on the board.
    if (struct.outposts.some((o) => o.color === studentColorWB)) bump('outpost');
    // Enemy king stuck in the centre (the king-hunt story).
    if (enemyKingStuckInCenter(fen, studentColorWB)) bump('king-hunt');
    // A student passed pawn.
    if (struct.pawns.passedPawns[studentColorWB].length) bump('passer');
    // The bishop pair held through the middlegame.
    const myB = all.filter((p) => p.type === 'b' && p.color === studentColorWB).length;
    const enemyB = all.filter((p) => p.type === 'b' && p.color === enemy).length;
    if (myB >= 2 && enemyB <= 1) bump('bishops');
    // A durable material edge.
    const bal = struct.material.balance * (studentColorWB === 'w' ? 1 : -1);
    if (bal >= 2) bump('material');
  }
  if (sampled < 8) return null;

  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [theme, count] = entries[0] ?? ['', 0];
  // The theme must have run through a real share of the middlegame to be "the story".
  if (!theme || count < Math.ceil(sampled * 0.4)) return null;

  const PHRASING: Record<string, string> = {
    iqp: "the story of this game was the isolated pawn in their camp — you built the whole middlegame around pressuring it, and that's exactly the right way to play against an isolated pawn",
    'open-file': 'the through-line of this game was the open file — you seized it and used it as the highway into their position, and controlling the only open file is what decided it',
    outpost: 'the story of this game was your outpost — a piece planted on a square no pawn could ever challenge, quietly dominating from the middle of the board',
    'king-hunt': 'the through-line of this game was their king caught in the centre — once it was stuck there with the files opening, the whole game became a hunt',
    passer: 'the story of this game was your passed pawn — a long-term trump that hung over the whole middlegame and had to be watched every move',
    bishops: 'the through-line of this game was the bishop pair — two bishops raking the board, and in an open position that pair is worth more than it looks',
    material: 'the through-line of this game was your material edge — once ahead, the job was to simplify and convert, and keeping it clean is the whole skill',
  };
  const p = PHRASING[theme];
  return p ? `${p.charAt(0).toUpperCase()}${p.slice(1)}.` : null;
}

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1); }


// The move-quality label, spoken as English. The old template read
// "<Classification> move" — so the coach literally said "inaccuracy move" and
// "great move" in the same breath (David 2026-09-15, reading a prod review
// transcript). The classification is still the computer's verdict; only its
// wording changes.
const QUALITY_CLAUSE: Record<string, string> = {
  inaccuracy: 'that was an inaccuracy',
  mistake: 'that was a mistake',
  blunder: 'that was a blunder',
  miss: 'that missed the chance',
  great: 'that was a great move',
  brilliant: 'that was a brilliant move',
  best: 'that was the best move',
};
function qualityClause(classification: string, isStudent: boolean): string {
  const clause = QUALITY_CLAUSE[classification.toLowerCase()];
  if (clause) return clause;
  return `${lowerFirst(cap(classification))}${isStudent ? '' : ''}`;
}
function pieceWord(p: string): string {
  return ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as Record<string, string>)[p.toLowerCase()] ?? 'piece';
}

/** The moved piece's influence from its NEW square: enemy pieces it now eyes,
 *  central squares it now fights for, own pieces it now guards. Pure chess.js
 *  (attackers()) — the quiet-move beat that gives EVERY ply its own computed
 *  content (David 2026-07-22). Null when the move creates none of the three. */
export function describeMoveInfluence(fenBefore: string, fenAfter: string, san: string, squaresOut?: string[], shapeOut?: { hitsPiece: boolean }): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(san.replace(/[?!]+$/, ''));
    if (!mv) return null;
    const a = new Chess(fenAfter);
    const to = mv.to;
    const pc = a.get(to);
    if (!pc) return null;
    const enemyWB: Color = pc.color === 'w' ? 'b' : 'w';
    const eyes: string[] = [];
    for (const row of a.board()) {
      for (const cell of row) {
        if (!cell || cell.square === to) continue;
        if (!a.attackers(cell.square, pc.color).includes(to)) continue;
        // Only the ENEMY targets the moved piece now eyes are teaching — a
        // fresh pressure the student should see. "guards your own pawn on d2"
        // is mechanics, not an idea (David 2026-07-23: cut the per-move filler);
        // a piece that must defend an ATTACKED friend surfaces via the
        // [loose]/count detectors instead.
        if (cell.color === enemyWB && cell.type !== 'k') { eyes.push(`the ${pieceWord(cell.type)} on ${cell.square}`); squaresOut?.push(cell.square); }
      }
    }
    const fights: string[] = [];
    for (const sq of ['d4', 'e4', 'd5', 'e5'] as const) {
      if (sq === to || a.get(sq)) continue;
      if (a.attackers(sq, pc.color).includes(to)) { fights.push(sq); squaresOut?.push(sq); }
    }
    // The moved piece's own square leads the set — the same geometry the
    // opponent read (`[opp-target]`) couples, so the selector can prove the
    // two lines are ONE claim (walk 5, 2026-09-23: "Their knight on c3 now
    // fights for d5. Your opponent's knight steps in eyeing d5" on every ply).
    squaresOut?.unshift(to);
    const bits: string[] = [];
    if (eyes.length) bits.push(`eyes ${andList(eyes)}`);
    if (fights.length) bits.push(`fights for ${andList(fights)}`);
    if (!bits.length) return null;
    if (shapeOut) shapeOut.hitsPiece = eyes.length > 0;
    return `The ${pieceWord(pc.type)} on ${to} now ${bits.join(', ')}.`;
  } catch {
    return null;
  }
}

/** The variation a whole game settled on — the detector's name for the full
 *  move list. Memoized per game (the facet builder runs once per ply). */
const settledCache = new WeakMap<readonly string[], string | null>();
function settledVariation(allSans: readonly string[], variationOf: (n: string | null) => string | null): string | null {
  if (settledCache.has(allSans)) return settledCache.get(allSans) ?? null;
  let v: string | null = null;
  try { v = variationOf(detectOpening([...allSans])?.name ?? null); } catch { v = null; }
  settledCache.set(allSans, v);
  return v;
}
