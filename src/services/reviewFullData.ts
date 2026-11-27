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
import { kingWalkReads, weighedReads, knownSlipReads } from './moveThoughtFacts';
import { lastMoveFromSan } from './material';
import { playedUci } from './planSteps';
import { openSentence, continueSentence } from '../utils/openSentence';
import { inFluxAfter } from './boardState';
import { Chess, type Color, type Square } from 'chess.js';
import { uciToSanAt } from './liveFundamental';
import { landedTacticFor, type PrevCaptureContext } from './pvPlayback';
import { captureRunAfterMove } from './captureRun';
import { detectTactics } from './tacticsDetector';
import { seatPieceReferences } from './groundedAnswer';
import { costStakes, exchangeStakes, isSacrifice, mateStakes, isStaked, type Stakes } from './factStakes';
import type { RefutedAlternative } from './refutedAlternative';
import type { ReviewIntent } from './reviewMoveIntent';
import { recordedMoveCost } from './moveCost';
import { lineProofFromUci, proofForStudent, squaresProof, isProof, NO_PROOF, type Proof } from './proof';
import { readBoard, readBoardAll, readKey, principleKey, positionalVerdictOf, influenceShapeOf, oppTeachingKind, exchangeIdeaOf, tacticOf, fundamentalsSaid } from './boardComputers';
import { type KnownSlipIndex } from './knownSlips';
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import type { WeighRead } from './weighedMoves';
import type { CoachFact, ComputerName } from './coachFact';
import { reviewFacet, asIncoming, inRuleFamily, type ReviewFacet } from './reviewFacet';
import type { FacetTag } from './reviewFacetRank';
import { refutedAltProof } from './refutedAlternativeCore';
import { advantageWasMissed } from './reviewWithholding';
import { costWords, isMateEval, storedMate, mateDistanceOf, moverGaveUpMate, costFitsGrade, type SpokenGradeLabel } from './engineConstants';
import { ONLY_MOVE_CP } from './criticalityScan';
import { hangingLine, lostLastGuard } from './hangingLine';
import type { PrincipleAttribution, FundamentalId } from './principleAttribution';
import type { SaidSet } from './gameStory';
import { fundamentalReply, sameReplyAsGrade } from './mistakeTurnLine';
import { errorWhy, priorMoveLeadingTo, replyKeptWin, type SecondReads } from './inaccuracyCall';
import { toOtherSeat } from '../utils/seatPronouns';
import { lineSeatAt } from '../utils/andList';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { minorsAtHome } from './development';
import type { AnalysisLine, HeardVerdict } from '../types';
import { writerFor, namesBetterMoveFor, slipRegister, geometryRegister } from './writerRegister';

/** Review's writer settings (`writerRegister`). */
const REVIEW_WRITER = writerFor('review');

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
/** `seat` is required: the reason is spoken to the student about THEIR break or
 *  about the opponent's, and the review walk of 2026-09-26 told a student their
 *  OPPONENT's …dxe5 opened the centre "before you're ready". */
/** Past this move a central break is judged on the position, not on
 *  development — the opening is over. */
const OPENING_BREAK_MAX_MOVE = 15;
export { positionalVerdictLine } from './reviewPositionalAssessment';

export function prematureBreakWhy(fenBefore: string, san: string, seat: 'student' | 'opponent'): string | null {
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
    // DEVELOPMENT IS AN OPENING FACT, counted by pieces still AT HOME (clean-
    // pass review walk 2026-10-04, G1 29…e5: "a central break still behind in
    // development" — Black simply had fewer minors left after the trades). A
    // side with fewer pieces is not behind in development.
    if (before.moveNumber() > OPENING_BREAK_MAX_MOVE) return null;
    const behindDev = minorsAtHome(before, mover).length > minorsAtHome(before, enemy).length;
    const kingLag = !kingCastled(before, mover) && kingCastled(before, enemy);
    if (!behindDev && !kingLag) return null;                     // the lag must be real
    // Name the CONCRETE lag Danya names ("he doesn't have his bishop out"),
    // board-verified — a specific minor still on its starting square. Prefer a
    // bishop (his emphasis); never claim a home piece that isn't there.
    let homePiece: string | null = null;
    if (behindDev) {
      const homeMinors = minorsAtHome(before, mover);
      const pick = homeMinors.find((p) => p.type === 'b') ?? homeMinors[0];
      if (pick) homePiece = pick.type === 'b' ? 'a bishop' : 'a knight';
    }
    const reason = behindDev
      ? (homePiece ? `with ${homePiece} still at home` : 'still behind in development')
      : 'with the king still uncastled';
    return `a central break ${reason} — premature, opening the centre before ${seat === 'student' ? "you're" : "they're"} ready for it`;
  } catch { return null; }
}

interface MoveFactContext {
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
  /** One-search move cost from the analysis (MoveAnnotation.costCp), or null
   *  on an older annotation. REQUIRED so the spoken cost is never re-derived
   *  from two separate reads when the one-search number exists. */
  costCp: number | null;
  /** The live grade the student heard when the deeper read differs, or null.
   *  REQUIRED so a builder decides whether a correction is owed. */
  heardVerdict: HeardVerdict | null;
  classification: string | null;
  bestMoveSan: string | null;
  /** The engine's line FROM the best move (UCI, the best move first). REQUIRED
   *  so the reason the better move is better is the same computer on every
   *  surface (`betterMoveReason`) — pass [] when the line is unknown. */
  bestLineUci: readonly string[];
  /** The engine's line AFTER the played move (UCI, their reply first).
   *  REQUIRED: what the move let them do is Learn's grade (`punishmentOf`), and
   *  a better move named without its reason says that instead (review walk
   *  2026-10-02, ply 85: "the stronger move was Rd3" and nothing else). Pass []
   *  when the line is unknown. */
  playedLineUci: readonly string[];
  /** The record's second read of the played line (`pv.earlierPlayed`), or null. */
  playedLineEarlierUci: readonly string[] | null;
  /** REQUIRED — the record's own second reads of those two lines (the same
   *  searches two depths shallower, `recordSecondReads`), so a line past two
   *  moves is named on the same rule as every surface (`lineTrust`). A record
   *  with none passes `NO_SECOND_READ`. */
  secondReads: SecondReads;
  /** The engine's best REPLY at `fenAfter` (the next ply's best move), SAN, or
   *  null when there is none. REQUIRED: whether a move gave material depends
   *  on whether the opponent should take it (`isSacrifice`). */
  replyBestSan: string | null;
  /** White-POV eval AFTER THEIR ACTUAL REPLY (the next ply's number), or null
   *  when the game ended there or the reply is unanalysed. REQUIRED: "and they
   *  missed it" is said only when their reply let the win go (`replyKeptWin`
   *  — Review 2026-10-21, 27.Rb3 …Qg6+ was "missed" at +13.8). */
  replyEvaluation: number | null;
  prevCap: PrevCaptureContext;
  /** Full SAN list of the game (for opening ID + forced-run + sac mechanism). */
  allSans: string[];
  /** 1-based ply where a forced mating run begins (from detectForcedMatingSequence), or null. */
  forcedRunStartPly: number | null;
  /** The basket's forced-run fact at this ply (`forcedRun`), or null. */
  forcedRunFact: CoachFact | null;
  /** The fundamentals the (student, flagged) move neglected — attributed on the
   *  board by principleAttribution; the `[principle]` facet speaks them. */
  fundamentals?: PrincipleAttribution[];
  /** The GAME's say-once ledger for fundamentals — each is spoken in full with
   *  its HOW the first time and as a short stem after. Required, and owned by
   *  the caller that walks the game: a fresh set per ply (what this facet used
   *  to build) re-taught the same tempo lesson four times in one review
   *  (walk 5, R19). */
  seenFundamentals: SaidSet<FundamentalId>;
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
  /** What the student's move was FOR, from the engine (`reviewMoveIntent`):
   *  the follow-up it prepares, read along the stored line. Null when the
   *  engine shows none, or no line was stored for the position. */
  intent?: ReviewIntent | null;
  /** The plies (1-based) whose move the grader called sound — never a habit's
   *  evidence (a sacrifice that holds is not "a piece left loose"). REQUIRED;
   *  an empty set where the grades are not in hand. */
  soundPlies: ReadonlySet<number>;
  /** The instances of each tactic motif SPOKEN this game, in the order first
   *  said (the walk's motif ledger, committed after the door,
   *  `motifSaidInstances`). A tactic's sentence rotates on its instance's place
   *  in this list, so one pattern is never said in the same words three times
   *  (the WHY standard's measure 3) while the same standing pin keeps its words
   *  and the repeat ledger still drops it. REQUIRED; an empty map where
   *  nothing was said. */
  motifSaid: ReadonlyMap<string, readonly string[]>;
  /** THE KNOWN MISTAKES AND TRAPS (David 2026-11-04: "it needs to be in
   *  review for sure") — the club gem index, loaded by the caller before the
   *  walk builds (`loadKnownSlipIndex`; null only when it cannot be had), and
   *  the alternative the NEXT move's refuted alternative names (that move says
   *  the same claim itself), and how many the game has said (their words
   *  rotate on it). REQUIRED: a caller with no index says so. */
  knownSlips: { index: KnownSlipIndex | null; nextRefutedAlt: string | null; told: number };
  /** THE MOVES A PLAYER WEIGHS (`weighedMoves`): the student's rating (whose
   *  eye picks the candidates) and the record's one read per candidate from
   *  the board before the move (`MoveAnnotation.weighed`), or null where the
   *  record has none — then only the board's own square reads speak.
   *  REQUIRED, so a caller says which. */
  weigh: { rating: number; reads: readonly WeighRead[] | null };
}

export const NO_TEACHING_CONTEXT: MoveTeachingContext = {
  refutedAlt: null, prevFenBefore: null, phaseTurn: null, principlesTaught: new Set(), intent: null, soundPlies: new Set(), motifSaid: new Map(),
  knownSlips: { index: null, nextRefutedAlt: null, told: 0 },
  weigh: { rating: DEFAULT_STUDENT_RATING, reads: null },
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
const EVAL_FACET_MIN_CP = 80;

/** Did the move land on, or leave, one of these squares? */
function touchedByMove(fenBefore: string, san: string, squares: readonly string[]): boolean {
  try {
    const m = new Chess(fenBefore).move(san);
    return !!m && squares.some((sq) => sq === m.from || sq === m.to);
  } catch { return false; }
}

export function computeMoveFacets(
  ctx: MoveFactContext,
  /** The reason the verdict gave for the better move, exactly as spoken, so a
   *  later pass reading a fresher line of the SAME ply can replace it — one
   *  ply, one line (clean-pass review walk 2026-10-04, G1 15.Ba2). */
  outVerdictReason?: { text: string | null; playedLine?: boolean; punishSan?: string; lostSquare?: string; guardLeft?: string },
): ReviewFacet[] {
  // EVERY FACT OF THE MOVE IS THE ONE FACT (WO-STORY-MATRIX-01 P1-6d): made by
  // the computer that found it, with what that computer knows on it — the KEY
  // SQUARES it names (the yellow highlight leads the eye from the computer's
  // own squares, never scraped from prose — David 2026-09-13), WHOSE it is
  // (the detector's own `beneficiary`: their battery outranks your pin on one
  // diagonal, G0), what it is WORTH (`factStakes.ts`, the door orders by it),
  // its PROOF (one-coach P3), what it CLAIMS beyond its squares, and its
  // say-once identity. A fact with no clean square records none, so a
  // highlight never appears without a board-true square behind it.
  const facets: ReviewFacet[] = [];
  /** The mate this move allowed, once the verdict has said it (its moves). */
  let allowedMateHere: number | null = null;
  const made = (computer: ComputerName, tag: FacetTag, text: string): ReviewFacet => reviewFacet(computer, tag, text, ctx.fenAfter, ctx.fenBefore);
  const put = (computer: ComputerName, tag: FacetTag, text: string): ReviewFacet => { const f = made(computer, tag, text); facets.push(f); return f; };
  /** A basket fact said as one of this move's facets, its squares and stakes
   *  carried (the one writer's words). */
  const basketFacet = <F extends (CoachFact & { kind: FacetTag }) | null>(f: F): F extends null ? null : ReviewFacet => {
    if (!f) return null as F extends null ? null : ReviewFacet;
    const raw = put(f.computer, f.kind, f.text);
    recSquares(raw, f.squares);
    recStakes(raw, f.stakes);
    // Its loose piece rides with it (Alapin ply 22: the count's "nothing
    // guards it" and the influence line's were said in one turn): the
    // `loose:<sq>` claim is the one Review's loose ledger (`looseSquareOf`)
    // and the support rule (`supportedFacts`, a description that claims a
    // loose piece is not a restatement) read. Only that claim: a description
    // carrying the registry's bookkeeping claims (`delta:0`, `verdict:…`)
    // would never read as the restatement it is (decision baseline
    // 2026-11-21: four repeats came back when every claim rode along).
    const loose = f.claims.filter((c) => c.startsWith('loose:'));
    if (loose.length) raw.claims = [...(raw.claims ?? []), ...loose];
    return raw as F extends null ? null : ReviewFacet;
  };
  /** A registry fact said under Review's own tag, with everything it carries. */
  const sayFact = (f: CoachFact | null, tag: FacetTag): ReviewFacet | null => {
    if (!f) return null;
    const raw = put(f.computer, tag, f.text);
    recSquares(raw, f.squares);
    recStakes(raw, f.stakes);
    if (isProof(f.proof)) recProof(raw, f.proof);
    return raw;
  };
  const recIncoming = (facet: ReviewFacet, beneficiary: 'w' | 'b' | undefined): void => {
    if (!beneficiary || !ctx.studentColorWB) return;
    if (beneficiary !== ctx.studentColorWB) asIncoming(facet);
  };
  // A LINE A FACT SAYS RIDES WITH IT (marks sweep 2026-11-08): the proof's
  // line is its board half, played move by move where the words say it. The
  // facets used to keep the proof and drop the line, so Review never drew a
  // kept fact's own line ("A known mistake here: e5, and after dxe5 you win a
  // pawn" lit e5 and drew nothing for dxe5).
  const recProof = (facet: ReviewFacet, proof: Proof | null | undefined): void => {
    if (!proof) return;
    facet.proof = proof;
    if (!facet.lines?.length && proof.line && proof.line.sans.length >= 2) facet.lines = [proof.line];
  };
  const recStakes = (facet: ReviewFacet, stakes: Stakes | null | undefined): void => {
    if (isStaked(stakes) && stakes.points > 0) facet.stakes = stakes;
  };
  // …and on WHOSE idea it is: "your rook pins their pawn — you saw this idea on
  // move 15" referred back to THEIR pin of move 15 (hand walk 2000 review).
  const recMotif = (facet: ReviewFacet, motif: string, squares: readonly string[], side?: 'w' | 'b' | null): void => { facet.identity = `motif:${motif}@${side ?? '-'}:${squares.join('')}`; };
  const recSquares = (facet: ReviewFacet, squares: ReadonlyArray<string | null | undefined>): void => {
    const clean = squares.filter((sq): sq is string => typeof sq === 'string' && /^[a-h][1-8]$/.test(sq));
    if (clean.length) facet.squares = [...new Set(clean)];
  };
  const { fenBefore, fenAfter, san, ply, moverColor, playerColor, studentColorWB } = ctx;
  const isStudent = playerColor ? moverColor === playerColor : false;
  const moverWB: Color = moverColor === 'white' ? 'w' : 'b';
  const studentPovCp = ctx.evaluation != null && studentColorWB
    ? (studentColorWB === 'w' ? ctx.evaluation : -ctx.evaluation)
    : null;

  // ── 1. MOVE MECHANICS + MATERIAL + STRUCTURE DELTAS (the rich PlyFacts) ──
  sayFact(readBoard('plyFacts', { fenBefore, san, prevCap: ctx.prevCap, moverIsStudent: isStudent }), 'move');

  // ── 1b. WHAT THE MOVE NOW DOES — the per-move influence delta (David
  // 2026-07-22: "Each move changes the position and provides new threats and
  // positional challenges. Why doesn't the coach state what those are?").
  // The event computers above only speak on captures/checks/structure events,
  // which left QUIET moves with no beat of their own. This clause computes,
  // with chess.js attackers(), what the moved piece does from its NEW square:
  // enemy pieces it eyes, central squares it fights for, own pieces it now
  // guards. Every claim board-computed; emitted only when non-empty.
  const influenceFact = readBoard('moveInfluence', { fenBefore, fenAfter, san, student: ctx.studentColorWB });
  const influence = influenceFact?.text ?? null;
  const influenceShape = influenceFact ? influenceShapeOf(influenceFact) : { hitsPiece: false };
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
    // A CAPTURE THEY CAN TAKE BACK IS A TRADE, and the trade is the move's
    // reason (2026-09-25): how good it is when the engine says (`tradeJudged`),
    // else what the exchange settles off the engine's line (`tradeSettled`).
    const moverSign = ctx.moverColor === 'white' ? 1 : -1;
    const costCp = ctx.preMoveEval != null && ctx.evaluation != null ? (ctx.preMoveEval - ctx.evaluation) * moverSign : null;
    const moverCostCp = ctx.preMoveEval != null && ctx.evaluation != null && !isMateEval(ctx.preMoveEval) && !isMateEval(ctx.evaluation) ? costCp : null;
    const prior = ply >= 2 && ctx.teaching.prevFenBefore ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : null;
    const tradeCtx = { fenBefore, fenAfter, san, moverIsStudent: isStudent, student: ctx.studentColorWB, lineUci: ctx.playedLineUci, prior, costCp, moverCostCp };
    const judged = readBoard('tradeJudged', tradeCtx);
    if (judged) {
      const jf = sayFact(judged, 'trade');
      if (jf && readKey(judged).startsWith('h|')) jf.headsMove = true;
    } else {
      const ex = readBoard('tradeSettled', tradeCtx);
      const isTrade = !!ex && readKey(ex).startsWith('trade|');
      // "You take on d4 — …" opens with the move itself.
      const ef = sayFact(ex, isTrade ? 'trade' : 'delta');
      if (ef && isTrade) ef.headsMove = true;
    }
  } else if (influence && influenceShape.hitsPiece) {
    // A PIECE'S NEW REACH THAT HITS NOTHING ("now joins the fight for d4,
    // holding back the enemy d-pawn") describes the board without a why
    // (lead 2026-10-20): only a reach that hits a piece is said.
    const f = sayFact(influenceFact, 'does');
    if (f && influenceShape.loose) f.claims = [`loose:${influenceShape.loose}`];
  }

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
  for (const f of readBoardAll('boardDelta', { fenBefore, san, fenAfter, student: ctx.studentColorWB })) sayFact(f, 'delta');

  // ── 2. MOVE QUALITY (classification + eval swing + the better move) ──
  // MATE IS NOT A NUMBER OF PAWNS. A mate-encoded eval is a ±30,000 sentinel, so
  // subtracting one from a centipawn score and dividing by 100 told the student
  // "eval swung 300.0" on the move that walked into mate — the same six-figure
  // leak the coach's own callout had. When either side of the comparison is a
  // mate score there is no swing to report; the classification already says
  // 'blunder', and `[eval] mate` facets carry the rest.
  const swing = ctx.evaluation != null && ctx.preMoveEval != null
    && !isMateEval(ctx.evaluation) && !isMateEval(ctx.preMoveEval)
    ? recordedMoveCost({ costCp: ctx.costCp ?? undefined, preMoveEval: ctx.preMoveEval, evaluation: ctx.evaluation }, ctx.moverColor)
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
  // THE DEEPER READ CORRECTS WHAT WAS HEARD, OUT LOUD (David 2026-10-13). A
  // live Learn grade came from a short read; the review's depth-16 read graded
  // the move differently. The heard grade is never swapped in silence: the
  // correction is said, and it rides the verdict when the move is still a
  // fault, or stands alone when the deeper read says it was fine.
  const heardNow = ctx.heardVerdict && isStudent ? readBoard('heardCorrection', { fen: fenBefore, heard: ctx.heardVerdict, classification: ctx.classification, san }) : null;
  const heardRides = !!heardNow && readKey(heardNow) === 'rides';
  if (heardNow && !heardRides) sayFact(heardNow, 'quality');
  // The punishing reply the verdict names (`errorWhy`'s consequence), so a
  // known slip on this move names the same punishment once (7d2).
  let verdictPunish: string | null = null;
  // The line the verdict's words name, from the board it starts on — so a
  // fundamental naming the same answer of theirs is one claim (`sameReplyAsGrade`).
  let verdictLine: { fen: string; uci: string[] } | null = null;
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
    // The grade is in win chances; the points are centipawns. In a decided
    // position they part ways — "an inaccuracy, costing about 9.2 points"
    // (amateur review walk 2026-09-27). The label stands; the number goes.
    // A cost that rounds to nothing contradicts its own grade too. ONE TABLE
    // decides both (unity U2, `costFitsGrade`) — Learn reads the same one.
    const swingBit = costsPoints && costFitsGrade(ctx.classification as SpokenGradeLabel, swing) ? `, costing ${costWords(swing as number)}` : '';
    // WHY it's a mistake, when we can prove it (a premature central break). Danya
    // leads with the positional reason, THEN names the better move — so does this.
    const whyBad = (ctx.classification === 'mistake' || ctx.classification === 'blunder' || ctx.classification === 'inaccuracy')
      ? prematureBreakWhy(fenBefore, san, isStudent ? 'student' : 'opponent')
      : null;
    // A "STRONGER MOVE" ONLY WHEN THE MOVE FELL SHORT (walk 2026-09-23, prod
    // tape: "You: that was a great move — the stronger move was Kd7" on a GREAT
    // ply). On great/best/brilliant the engine's top line may still differ by
    // a hair, and naming it as "stronger" contradicts the verdict in the same
    // breath. The comparison earns voice only on a class that cost something.
    const fellShort = costsPoints || ctx.classification === 'miss';
    // THE REASON, from the one computer Learn's verdict uses (checks first,
    // then what the line wins) — review used to name the move and stop.
    // The better move comes off the engine LINE when the annotation carries no
    // SAN (review walk 2026-09-27, Carlsen–Aronian: three plies said only
    // "You: that was an inaccuracy, costing about 0.7 points." — a verdict
    // with nothing to learn from it).
    let bestSan = ctx.bestMoveSan;
    if (!bestSan && fellShort && ctx.bestLineUci[0]) {
      try {
        const u = ctx.bestLineUci[0];
        bestSan = new Chess(fenBefore).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
      } catch { bestSan = null; }
    }
    if (bestSan && bestSan === san) bestSan = null;
    // Seated on the board it DESCRIBES — the one before the move. The review's
    // global seating pass reads the board after it, and after 16.Nxe4 "the
    // knight on e4" there was White's: "Qxe4 — it would take your knight on e4"
    // (1200 review walk 2026-09-27). A seated reference is left alone later.
    // THE WHY, FROM THE ONE COMPUTER (David 2026-10-10: "Same in review and
    // everywhere else. Unity!"). `errorWhy` decides what the move allowed,
    // the better move's reason and the proof — the same reads Learn speaks;
    // Review names the better move because the game is over.
    const opponentMoved = ctx.studentColorWB !== null && (ctx.moverColor === 'white' ? 'w' : 'b') !== ctx.studentColorWB;
    // THE MATE THE MOVE ALLOWED (Review prod audit 2026-11-18, ply 68: "Your
    // Ke6 was a blunder. It let them play Qe5#." — the record's own read was
    // a mate against the mover, and the one error computer was handed none, so
    // it worded the mate as an ordinary reply and the mate came second).
    const storedAfter = storedMate(ctx.evaluation);
    const allowedMate = storedAfter !== null && (ctx.moverColor === 'white' ? storedAfter < 0 : storedAfter > 0) ? Math.abs(storedAfter) : null;
    allowedMateHere = allowedMate;
    const ew = bestSan && fellShort
      ? errorWhy({
        secondReads: ctx.secondReads, costCp: ctx.costCp,
        fenBefore, playedSan: san, moverColor: ctx.moverColor,
        bestSan, bestLineUci: ctx.bestLineUci, replyLineUci: costsPoints ? ctx.playedLineUci : [],
        missedMate: null, allowedMate,
        bestMate: moverGaveUpMate(ctx.preMoveEval, ctx.evaluation, ctx.moverColor) ? 'forced' : null,
        quality: ctx.classification === 'inaccuracy' ? 'inaccuracy' : ctx.classification === 'blunder' ? 'blunder' : 'mistake',
        priorMove: priorMoveLeadingTo(ply >= 2 && ctx.teaching.prevFenBefore ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : null, fenBefore),
        replySan: ctx.allSans[ply] ?? null,
        // Their reply's score against their best, from the replying side.
        replyKeptWin: ctx.evaluation != null && ctx.replyEvaluation != null
          ? replyKeptWin(ctx.evaluation * (ctx.moverColor === 'white' ? -1 : 1), ctx.replyEvaluation * (ctx.moverColor === 'white' ? -1 : 1))
          : null,
        namesBetterMove: namesBetterMoveFor(REVIEW_WRITER, true),
      })
      : null;
    // The opponent's better move is THEIR idea, said to the student: "toward
    // their king" in the mover's voice is "toward your king" (review walk
    // 2026-10-01, ply 18). Seated on the board it DESCRIBES — the one before
    // the move (1200 review walk 2026-09-27).
    const seat = (t: string | null): string | null => {
      if (!t) return null;
      const t1 = opponentMoved ? toOtherSeat(t) : t;
      return ctx.studentColorWB ? seatPieceReferences(t1, fenBefore, ctx.studentColorWB) : t1;
    };
    const reason = seat(ew?.reason ?? null);
    if (ew?.consequence && ew.punishFirst) verdictPunish = ew.punishFirst;
    verdictLine = ew?.line ?? null;
    if (outVerdictReason) {
      outVerdictReason.text = reason;
      // The verdict already walked the punishing line — no second producer
      // may say it again (review audit 2026-10-15: "The line starts with
      // Bxe2…" then "Here's how you take advantage: Bxe2, Qxe2, Nxf4…").
      outVerdictReason.playedLine = !!ew?.line;
      // The punishing reply the verdict names, so a later line about the same
      // punishment names the same move.
      if (ew?.consequence && ew.punishFirst) outVerdictReason.punishSan = ew.punishFirst;
      // What the slip lost and the guard it left — the method beat asks the
      // thinking step that would have caught it (`slipHabit`).
      if (ew?.lostSquare) outVerdictReason.lostSquare = ew.lostSquare;
      if (ew?.guardLeft) outVerdictReason.guardLeft = ew.guardLeft;
    }
    // Their error said to the student flips every pronoun ("it let you take
    // their rook"), not only the possessives `seat` flips.
    const seatPieces = (t: string): string => (ctx.studentColorWB ? seatPieceReferences(t, fenBefore, ctx.studentColorWB) : t);
    const consequence = ew?.consequence
      ? (opponentMoved ? seatPieces(toOtherSeat(ew.consequence)) : seat(ew.consequence))
      : null;
    // THEIR SLIP IS THE STUDENT'S CHANCE (clean-win review 2026-10-02): with
    // nothing it allowed and no reason, the teaching is the student's answer
    // and its point — unless the student then MISSED it (U8).
    const answer = opponentMoved && bestSan && fellShort && costsPoints && !reason && !consequence
      && !advantageWasMissed(ctx.allSans[ply] ?? null, ctx.replyBestSan)
      ? readBoard('slipAnswer', { fen: fenAfter, prevCapture: captureRunAfterMove(ctx.prevCap, fenBefore, san), answerSan: ctx.replyBestSan, lineUci: ctx.playedLineUci, register: slipRegister(REVIEW_WRITER) })?.text ?? null
      : null;
    // What it allowed first, then the better move with its reason — the
    // heart of the app's order. A better move with no reason is a bare
    // conclusion (proof rule, 52-errors #47) and is not named.
    const failedSaid = ew?.failed ? (opponentMoved ? seatPieces(toOtherSeat(ew.failed)) : seatPieces(ew.failed)) : null;
    // ONE IDEA A SENTENCE (David 2026-11-08, the human voice): "Their Nxe5 was a
    // mistake, costing more than a point — the stronger move was f6 — it would
    // guard e5" was three clauses on dashes. The verdict, what it allowed and
    // the better move with its reason are each a sentence; the better move
    // leads its own, so the walk's twin check keys it by the move, and its
    // words rotate on the ply.
    const strongerSentence = reason && ew?.bestSan
      ? rotateStem([`${ew.bestSan} was stronger: ${reason}`, `${ew.bestSan} was the better move: ${reason}`, `Better was ${ew.bestSan}: ${reason}`], ply)
      : null;
    // A FORCED MATE LEADS ITS LINE: the verdict and the mate it allowed are one
    // sentence ("Your Ke6 was a blunder — it walks into a forced mate: they
    // play Qe5#"), never the grade alone with the mate a sentence later.
    const mateRides = allowedMate !== null && !!consequence;
    const after = [whyBad, mateRides ? null : consequence, strongerSentence, !consequence && !reason && !failedSaid ? answer : null]
      .filter((t): t is string => !!t)
      .map((t) => ` ${openSentence(t)}.`)
      .join('');
    // CARRY THE MOVER'S SUBJECT (David 2026-07-20 opera-ply-14 bug): a quiet move
    // (e.g. …Qe7) yields no [move] mechanics facet, so [quality] was the ONLY
    // clue to whose move it was — and with it subject-less, the LLM voiced Black's
    // great move as "a great move from you" (the White student). Mirror the [move]
    // facet's "You:" / "Your opponent:" tag so attribution is never guessed.
    // A positive verdict is PRAISE, not a reason (WO-TEACH-02): it rides the
    // move's own squares and speaks only beside a teaching fact about them.
    const positive = !costsPoints && !fellShort;
    // The mechanism is its own sentence — "That left your knight on e5
    // hanging — the pawn on d4 just takes it."
    // The punishing line played out, as Learn and chat say it ("The line: …
    // — they come out two pawns up"); review dropped it.
    const tailSaid = consequence && ew?.tail ? (opponentMoved ? seatPieces(toOtherSeat(ew.tail)) : seatPieces(ew.tail)) : '';
    const praiseBit = positive ? praiseWhy(ctx.classification, ctx.preMoveEval, ctx.evaluation, ctx.moverColor) : '';
    const qf = put('errorWhy', positive ? 'praise' : 'quality', `${verdictSentence(ctx.classification, isStudent, san)}${swingBit}${praiseBit}${mateRides ? ` — ${continueSentence(consequence)}` : ''}.${after}${heardNow && heardRides ? ` ${heardNow.text}` : ''}${failedSaid ? ` ${failedSaid}` : ''}${tailSaid}`);
    // The verdict's proof is the line its words name: the better move's own
    // line when the reason came from it, the line after the move when the
    // punishment did.
    // errorWhy reads from the MOVER's seat; the review speaks from the
    // student's, so its proof is re-said from there (as its text is).
    if (costsPoints || fellShort) recProof(qf, ew?.proof ? proofForStudent(ew.proof, ctx.studentColorWB) : lineProofFromUci(fenBefore, ctx.bestLineUci, lineSeatAt(fenBefore, ctx.studentColorWB)));
    // …and when what it allowed runs past one board ("It let you play Bf6,
    // which threatens Qxg7#"), the board walks the reply and the move its why
    // names, each on its own board (marks sweep 2026-11-19).
    if (consequence && ew?.allowedLines?.length) qf.lines = [...ew.allowedLines];
    // The squares the why names — the piece left hanging and what takes it —
    // lead the eye (David 2026-10-11: "arrows and highlights … when narrating
    // moves and important squares").
    if (ew && (failedSaid || consequence)) recSquares(qf, ew.failedSquares.length ? ew.failedSquares : [ew.lostSquare]);
    if (positive) {
      try {
        const pm = new Chess(fenBefore).move(san);
        if (pm) recSquares(qf, [pm.from, pm.to]);
      } catch { /* no squares → it cannot be shown to support anything */ }
    }
    // The cost the move already paid — only on a class that cost something.
    if (costsPoints) recStakes(qf, costStakes(swing));
    // THE PATTERN MISSED, AND ITS RULE (unify-the-coach B3, parity with Learn's
    // grade): when the stronger move would have landed a tactic, its definition
    // is taught the first time the game meets it — the same say-once ledger as
    // the principles (`rule:` identity, committed only if it spoke).
    const missed = isStudent && bestSan && fellShort ? landedTacticFor(fenBefore, bestSan) : null;
    const rule = missed ? readBoard('tacticRule', { fen: fenBefore, type: missed }) : null;
    const rf = rule && !ctx.teaching.principlesTaught.has(readKey(rule)) ? sayFact(rule, 'rule') : null;
    if (rule && rf) {
      rf.identity = `rule:${readKey(rule)}`;
      inRuleFamily(rf, readKey(rule));
      try {
        const bm = new Chess(fenBefore).move(bestSan ?? '');
        if (bm) recSquares(rf, [bm.from, bm.to]);
      } catch { /* no squares → it supports nothing and stays quiet */ }
    }
  }
  // ── 2a. THE FUNDAMENTAL NEGLECTED (David 2026-09-05) — the attributed rule
  // the flagged move crossed, proven on the board; stated as its own facet so
  // the uncapped inventory carries it and the capped cascade can lead with it.
  if (ctx.fundamentals && ctx.fundamentals.length > 0) {
    const fv = readBoardAll('fundamentalVerdict', { fen: fenBefore, attrs: ctx.fundamentals, ply, seen: ctx.seenFundamentals, replySan: ctx.allSans[ply] ?? null });
    const diagnosis = fv.find((f) => readKey(f).startsWith('diagnosis|')) ?? null;
    const how = fv.find((f) => readKey(f).startsWith('how|')) ?? null;
    // The fundamentals said in full for the first time are this game's now.
    for (const id of diagnosis ? fundamentalsSaid(diagnosis) : []) ctx.seenFundamentals.add(id);
    // ONE ANSWER, ONE CLAIM (Colle replay 2026-11-05, 20.Qxf4: "Another tempo
    // on offer: f6 would hit your bishop on g5" beside the verdict's "it let
    // them play …f6, which attacks your bishop"): a diagnosis naming the
    // answer the verdict already plays out is the verdict's to say; the rule
    // keeps only its habit.
    const sameAnswer = sameReplyAsGrade(
      fundamentalReply(ctx.fundamentals[0].evidence.moves, fenBefore, san),
      verdictLine?.uci[0] ? { fen: verdictLine.fen, uci: verdictLine.uci[0] } : null,
    );
    const pf = sameAnswer ? null : sayFact(diagnosis, 'principle');
    if (pf) {
      // THE LINE IT SAYS IS PLAYED ON THE BOARD (marks sweep 2026-11-08): a
      // rule that plays the punishing line ("That walks into a tactic: they
      // play Nxd4 and, two moves later, Rfxc8") says its shape, so the board
      // walks it in full — the voice says the shape, the board shows the
      // detail. The line runs from the board after the move.
      const lined = ctx.fundamentals.find((f) => typeof f.facts.line === 'string' && (f.evidence.moves[0] ?? '').split(' ').length >= 2);
      if (lined) pf.lines = [{ fen: fenAfter, sans: lined.evidence.moves[0].split(' ') }];
      // The rule explains the cost the move paid, so it is worth that cost.
      if (negativeClass) recStakes(pf, costStakes(swing));
    }
    // ITS HOW IS THE HABIT STEP (WO-ONE-COACH-01): a fact of its own, so the
    // door says it last — after the line it is about, never inside the
    // diagnosis that leads the beat.
    sayFact(how, 'how');
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
        put('computeMoveFacets', 'eval', `The eval bar moves ${mag} ${dir} — material changed hands, and the count above is the reason.`);
      } else {
        const fired: string[] = [];
        // A reason must point the SAME WAY as the swing (walk 5, R20). The
        // mover's new pressure and its tactic can only explain the bar moving
        // TOWARD the mover; after the opponent's c4 hit the student's rook the
        // review said the eval moved "your way — that is the new pressure the
        // move creates". A swing against the mover is explained, if at all, by
        // what the move gave up.
        const towardMover = (moverWB === studentColorWB) === (d > 0);
        if (towardMover && facets.some((f) => f.tag === 'does')) fired.push('the new pressure the move creates');
        if (facets.some((f) => f.tag === 'delta')) fired.push('the lines it opened and what it gave up');
        if (towardMover && facets.some((f) => f.tag === 'tactic')) fired.push('the tactic now sitting on the board');
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
          put('computeMoveFacets', 'eval', stems[ctx.ply % stems.length]);
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
    // THE TACTICS, said by the one registry's read (seated, a fork only when
    // verified, a pin with what it holds); each keeps its motif identity.
    const tacticCtx = {
      fenBefore, san, fenAfter, student: ctx.studentColorWB, lineUci: ctx.playedLineUci, motifSaid: ctx.teaching.motifSaid,
      skipMateAgainst: allowedMateHere !== null && ctx.studentColorWB !== null ? (ctx.moverColor === 'white' ? 'w' : 'b') as Color : null,
    };
    for (const tf of readBoardAll('boardTactics', tacticCtx)) {
      const f = sayFact(tf, 'tactic');
      if (!f) continue;
      const tac = tacticOf(tf);
      recIncoming(f, tac.beneficiary);
      recMotif(f, tac.motif, tf.squares, tac.beneficiary);
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
      // BOTH SEATS (Carlsen–Topalov review walk 2026-09-27: "Newly undefended:
      // their bishop on b5" on …a6, beside "your pawn on a6 now eyes their
      // bishop on b5") — a piece the move just ATTACKED is not newly
      // undefended; the attack line names it, with its attacker.
      let attackedByMover: (sq: string) => boolean = () => false;
      try {
        const b = new Chess(fenAfter);
        const moved = new Chess(fenBefore).move(san);
        const victim: 'w' | 'b' = moved.color === 'w' ? 'b' : 'w';
        attackedByMover = (sq) => b.get(sq as Square)?.color === victim && b.attackers(sq as Square, moved.color).includes(moved.to);
      } catch { attackedByMover = () => false; }
      const fresh = t.hangingPieces.filter((h) => !before.has(`${h.piece}${h.square}`)
        && 'nbr'.includes(h.piece.toLowerCase())
        && exchangeStakes(fenAfter, [h.square]) !== null
        && !attackedByMover(h.square));
      // UNDEFENDED is a claim about a DEFENDER LOST: only a piece that stood
      // on the same square defended before this move. A piece that never had
      // one and is newly hit is "hanging" (review walk 2026-10-04, G3 37…Kc7:
      // "Newly undefended: their rook on d1" — nothing had ever defended it;
      // the king step opened the d-file onto it).
      const lostDefender = fresh.filter((h) => lostLastGuard(fenBefore, h.square));
      const newlyHit = fresh.filter((h) => !lostLastGuard(fenBefore, h.square));
      // Said by the ONE producer Learn's warning speaks too (`hangingLine`,
      // WO-DEPTH-01): the piece, that nothing guards it, and what it means for
      // whoever is to move. Grouped by side, so one sentence is one seat.
      for (const [group0, lost] of [[lostDefender, true], [newlyHit, false]] as const) {
        for (const group of (['w', 'b'] as const).map((c) => group0.filter((h) => h.color === c))) {
          if (group.length === 0) continue;
          const line = hangingLine({ fen: fenAfter, squares: group.map((h) => h.square), viewer: studentColorWB ?? null, lostGuard: lost, still: false });
          if (!line) continue;
          const sqs = group.map((h) => h.square);
          // YOUR pieces with you to move: the threat Learn warns of, with the
          // same proof and stakes (`threatCost`, the one registry).
          const yours = !isStudent && !!studentColorWB && group.every((h) => h.color === studentColorWB);
          const tc = yours && studentColorWB ? readBoardAll('threatCost', { line, fen: fenAfter, student: studentColorWB, squares: sqs })[0] ?? null : null;
          const f = put(tc?.computer ?? 'computeMoveFacets', 'loose', tc?.text ?? line);
          recSquares(f, tc?.squares ?? sqs);
          if (tc && isProof(tc.proof)) recProof(f, tc.proof);
          recStakes(f, tc?.stakes ?? exchangeStakes(fenAfter, sqs));
        }
      }
    }
  } catch { /* ignore */ }

  // ── 3b. THE STUDENT'S NEW THREAT (David 2026-07-21: "The coach should
  // identify my threat and call it out!!") — null-move scan for the biggest
  // threat this move CREATED: mate-in-one / safe royal fork / clean win.
  if (ctx.studentColorWB && ctx.moverColor === ctx.playerColor) {
    basketFacet(readBoard('newThreat', { fenBefore: ctx.fenBefore, fenAfter, mover: ctx.studentColorWB, student: ctx.studentColorWB, answerSan: null }));
    // ── 3c. IF YOU HAD PASSED — the threat their last move left, and that
    // this move answered it (mistakes round 2): the reason a quiet defence was
    // right, said with the square it saved.
    basketFacet(readBoard('passThreat', { fenBefore: ctx.fenBefore, san, student: ctx.studentColorWB }));
  }

  // ── 4. POSITIONAL VERDICT + THE FULL ASSET LIST (no cap) ──
  // Skip on a mating move — "checkmate" is the verdict, not "you're balanced"
  // (the eval at the mated position reads 0/odd). The mate is named by [move].
  if (studentColorWB && !san.includes('#')) {
    // A BARE "you're balanced" IN THE OPENING SAYS NOTHING (David 2026-09-16,
    // reading ply 1 of his own game: "You're balanced" after 1.e4) — the
    // registry's read holds it at book depth (`quietBareBalanced`).
    const pv = readBoard('positionalVerdict', { fenBefore, san, fen: fenAfter, student: studentColorWB, studentCp: studentPovCp, quietBareBalanced: ctx.ply <= OPENING_VERDICT_SILENT_PLY });
    const vf = sayFact(pv, 'verdict');
    if (pv && vf) vf.verdict = positionalVerdictOf(pv);
  }

  // ── 5. STRUCTURE STATE (open/half-open files, outposts, passed/isolated/doubled) ──
  sayFact(readBoard('structureState', { fen: fenAfter }), 'structure');

  // ── 6. KING SAFETY (enemy king exposed in the centre) ──
  if (studentColorWB) basketFacet(readBoard('kingInCentre', { fen: fenAfter, student: studentColorWB }));

  // ── 6a. TRAPPED PIECE — either side (David 2026-07-21: "the trapped piece
  // was the queen!!!"). Story-level event: a rook/queen with no safe square.
  if (studentColorWB) {
    for (const f of readBoardAll('trappedPiece', { fen: fenAfter, student: studentColorWB, lineUci: ctx.playedLineUci })) basketFacet(f);
  }

  // ── 6a. TRADES, DEFENCE, NUGGETS (computers batch 5) — the same reads the
  // live composer speaks, each with its proof, said once per game (`hint:`).
  if (studentColorWB) {
    const moverSign = moverColor === 'white' ? 1 : -1;
    const moveCost = ctx.costCp ?? (ctx.preMoveEval != null && ctx.evaluation != null && !isMateEval(ctx.preMoveEval) && !isMateEval(ctx.evaluation)
      ? Math.max(0, (ctx.preMoveEval - ctx.evaluation) * moverSign) : null);
    for (const f of readBoardAll('exchangeIdeas', {
      fen: fenAfter,
      student: studentColorWB,
      lines: [],
      continuation: isStudent ? ctx.playedLineUci : null,
      studentMove: isStudent ? { fenBefore, san, costCp: moveCost, bestSan: ctx.bestMoveSan, history: ctx.allSans.slice(0, ply) } : null,
      opponentMove: isStudent ? null : { fenBefore, san },
      nameMove: false,
    })) {
      const x = exchangeIdeaOf(f);
      const raw = sayFact(f, x.kind);
      if (raw) raw.identity = `hint:${x.claim}`;
    }
  }

  // ── 6b. THE MISSING TEACHING POINTS (Naroditsky message catalog) ──
  if (studentColorWB) {
    const onBoard = { fen: fenAfter, student: studentColorWB };
    basketFacet(readBoard('count', onBoard));
    basketFacet(readBoard('royal', onBoard));
    basketFacet(readBoard('rook7', onBoard));
    basketFacet(readBoard('badBishop', onBoard));
    // THE PIECE THAT WANTS A BETTER SQUARE — which piece, where it wants to go
    // and why, read by the ONE wish computer Learn's piece-activity behaviour
    // reads (`pieceWish`, wire-19 2026-11-08). The old line here named the
    // piece and "somewhere it actually does a job" — no square, no job. Never
    // the piece the student's own move just put there: that move's point is
    // speaking.
    const movedTo = isStudent ? ((): string | null => { try { return new Chess(fenBefore).move(san).to; } catch { return null; } })() : null;
    basketFacet(readBoard('worstPiece', { fen: fenAfter, student: studentColorWB, movedTo }));
    // Not on the move that PUSHES it — the move's own point says "pushes your
    // passed pawn" (amateur review walk 2026-09-27: both, one ply).
    const pushed = ((): string | null => { try { const pm = new Chess(fenBefore).move(san); return pm.piece === 'p' ? pm.to : null; } catch { return null; } })();
    basketFacet(readBoard('passerPush', { fen: fenAfter, student: studentColorWB, pushed }));

    // ── 6c. WIDENED BOARD AWARENESS ON REVIEW (David 2026-09-13: "I also want
    // these changes on review") — the same minority-attack + colour-complex
    // computers the Learn/Play read gained, in the retrospective register. Both
    // sides: a weakness in the opponent's camp is the student's plan; one in the
    // student's own camp is what to shore up. Deduped once per game by the caller.
    for (const f of readBoardAll('minority', { fen: fenAfter, student: studentColorWB })) basketFacet(f);
    for (const f of readBoardAll('colourComplex', { fen: fenAfter, student: studentColorWB })) basketFacet(f);
    // FORWARD PLANS are not read here: the walk runs the ONE plan thread
    // (`planThreadTurn`, the same as Learn) on each of their moves — the stop
    // with its proof, then one plan, held while it stands.
    // PLAN VERSUS PLAN — the RACE, in the retrospective register. `deriveNextPlans`
    // above states the student's agenda; it has never stated whose agenda arrives
    // first, which is the actual teaching when both sides are running. Silent
    // unless the two sides are running the SAME kind of plan toward the same kind
    // of terminal event — a cross-kind tempo number (pawn pushes vs rook moves)
    // is incomparable, and a confidently wrong number is worse than silence.
    {
      const race = readBoard('raceOfPlans', { fen: fenAfter, student: studentColorWB, register: REVIEW_WRITER.register });
      if (race) { basketFacet(race); const raw = facets[facets.length - 1]; recProof(raw, isProof(race.proof) ? race.proof : null); }
    }
  }

  // ── 7. SACRIFICE — compensation + mechanism + king-shield removal ──
  try {
    const sb = new Chess(fenBefore);
    const smv = sb.move(san);
    if (smv) {
      // ONE RULE (`isSacrifice`): material handed over AND, when the engine's
      // reply is known, the opponent actually takes it.
      // The engine's line after the move, in SAN — a line that wins where a
      // listener can follow it makes the move a combination, not a sacrifice.
      const sacLine: string[] = [];
      try {
        const lc = new Chess(fenAfter);
        for (const u of ctx.playedLineUci) { const m = lc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); if (!m) break; sacLine.push(m.san); }
      } catch { /* the line stops where it stops being legal */ }
      if (isSacrifice(fenBefore, san, ctx.replyBestSan, sacLine) && studentColorWB) {
        // MOVER's POV, not the student's — the function judges the SAC from
        // the side that made it. Handing it the student's number flipped the
        // sign on every opponent sacrifice (D-4, 2026-09-22).
        const moverPovCp = studentPovCp === null ? null : (moverWB === studentColorWB ? studentPovCp : -studentPovCp);
        const moverPovBeforeCp = ctx.preMoveEval == null || isMateEval(ctx.preMoveEval) ? null
          : (moverWB === 'w' ? ctx.preMoveEval : -ctx.preMoveEval);
        // Seated: "It's a sacrifice" on the opponent's move read as the student's
        // own (prod 2026-09-23, QGD c4). The clauses are already seated.
        // A sacrifice that forces mate is said by its mate line, which leads
        // (Review prod audit 2026-11-12, Giri–Carlsen 34…Qe1+: "Your move is a
        // sacrifice — compensation: you're already on top here. You have mate
        // in one with your rook on c1"): the mate is what it gets.
        const matesFor = ctx.evaluation != null && isMateEval(ctx.evaluation) && (moverWB === 'w' ? ctx.evaluation > 0 : ctx.evaluation < 0);
        if (!matesFor) sayFact(readBoard('sacCompensation', { fenBefore, san, fenAfter, mover: moverWB, moverCp: moverPovCp, moverCpBefore: moverPovBeforeCp, student: studentColorWB, line: ctx.playedLineUci ?? [] }), 'sac');
        // WHY A SACRIFICE WORKS is never said of a move graded a mistake or a
        // blunder (review walk 2026-10-01, ply 38): the grade has already said it did not.
        const sacFailed = ctx.classification === 'mistake' || ctx.classification === 'blunder' || ctx.classification === 'miss';
        if (isStudent && !sacFailed) {
          sayFact(readBoard('sacMechanism', { sans: ctx.allSans, sacIdx: ply - 1 }), 'sac-why');
          if (studentColorWB) sayFact(readBoard('sacKingShield', { fenBefore, san, student: studentColorWB }), 'sac-why');
        }
      }
    }
  } catch { /* ignore */ }

  // ── 7c. TWO GOOD MOVES, ONE DIFFERENCE (WO-LAYERS-01 step 6). The student's
  // move and the engine's best were both fine; name the one board-true thing
  // that separates them — what one of them leaves undefended.
  const goodish = ctx.classification === null || ctx.classification === 'good' || ctx.classification === 'book'
    || ctx.classification === 'great' || ctx.classification === 'excellent';
  if (isStudent && goodish && ctx.bestMoveSan && ctx.bestMoveSan.replace(/[+#!?]+$/, '') !== san.replace(/[+#!?]+$/, '')) {
    if (studentColorWB) basketFacet(readBoard('contrast', { fenBefore, san, bestSan: ctx.bestMoveSan, student: studentColorWB, unpricedCredit: REVIEW_WRITER.unpricedCredit,
      costCp: ctx.costCp ?? (ctx.preMoveEval != null && ctx.evaluation != null && !isMateEval(ctx.preMoveEval) && !isMateEval(ctx.evaluation) ? (ctx.preMoveEval - ctx.evaluation) * (studentColorWB === 'w' ? 1 : -1) : null) }));
  }

  // ── 7d. TIMING (WO-LAYERS-01 step 7) — the student's move, played a turn
  // early, would have lost material to a reply that no longer works.
  // Never on a move graded as a mistake: "the timing of Bxf7 matters" beside
  // "that was a blunder" (review walk 2065) credits the move the same breath
  // it condemns it.
  if (isStudent && !negativeClass && ctx.classification !== 'miss' && ply >= 3 && ctx.allSans.length >= ply) {
    if (studentColorWB) basketFacet(readBoard('timing', { fenBefore, san, history: ctx.allSans.slice(0, ply - 1), student: studentColorWB }));
  }

  // ── 7e. ATTACK, SACRIFICES AND KINGS (kingAttackReads, batch 4) — on a
  // student ply whose move was NOT the engine's best, the king read the board
  // posed and the move passed by: mate over material, the castling squares,
  // the king's square by the checks, the diagonal walk. Never on the move they
  // played (G4.5.2); the standing reads are Learn's, said live.
  if (isStudent && studentColorWB && ctx.bestMoveSan && ctx.bestLineUci.length > 0
    && ctx.bestMoveSan.replace(/[+#!?]+$/, '') !== san.replace(/[+#!?]+$/, '')) {
    for (const f of readBoardAll('kingReadsBestLine', { fenBefore, student: studentColorWB, bestUci: ctx.bestLineUci })) sayFact(f, 'king-read');
  }

  // ── 7d+. BATCH 1 — opening equivalence, order and timing. The same
  // computers Learn speaks (`orderTeaching`), each with its proof.
  {
    const cleanCost = ctx.costCp ?? (negativeClass || ctx.classification === 'miss' ? 999 : 0);
    const studentWB = ctx.studentColorWB;
    const reply = ctx.allSans[ply] ?? null;
    if (isStudent && studentWB) {
      // Each with its proof, said once a game under its key.
      const say = (f: CoachFact | null, tag: FacetTag): void => {
        const raw = sayFact(f, tag);
        if (raw && f) raw.identity = readKey(f);
      };
      if (reply && cleanCost < 50) say(readBoard('tradeLedger', { history: ctx.allSans.slice(0, ply + 1), student: studentWB }), 'timing');
      say(readBoard('notYetPlayed', { fenBefore, san, bestSan: ctx.bestMoveSan, cpLoss: cleanCost }), 'timing');
      say(readBoard('heldResource', { fenBefore, san, bestSan: ctx.bestMoveSan, cpLoss: cleanCost, student: studentWB }), 'timing');
      say(readBoard('captureChoice', { fenBefore, san, bestSan: ctx.bestMoveSan, cpLoss: ctx.costCp ?? cleanCost, student: studentWB }), 'capture-choice');
      if (cleanCost < 30) say(readBoard('kickAfterRecapture', { fenBefore, san, reply, bestUci: ctx.bestLineUci, student: studentWB }), 'kick');
      say(readBoard('pawnSquareTaken', { fenBefore, san, cpLoss: cleanCost, student: studentWB }), 'plan-race');
    }
  }

  // ── 7a. THE BLUFF — "don't buy it" (WO-LAYERS-01 step 4). On the OPPONENT's
  // move: their piece lands in the student's half hitting things, and wins
  // nothing. Beginners spend tempo after tempo answering these.
  if (!isStudent && studentColorWB) {
    basketFacet(readBoard('bluff', { fenBefore, san, reply: ctx.replyBestSan, student: studentColorWB }));
  }

  // ── 7b. THE REFUTED ALTERNATIVE — "not X, because Y" (WO-LAYERS-01 step 3,
  // WO-TEACH-02 S2). Naroditsky's single most common teaching move at every
  // level: name the move players at the student's level actually reach for,
  // costed by the engine and proven by its own line. The hand-written gems
  // stay on the opening's page (David 2026-10-29); the club gem index's known
  // mistakes and traps are said in Review through the registry (7d2, David
  // 2026-11-04).
  if (isStudent && ctx.teaching.refutedAlt) {
    const r = ctx.teaching.refutedAlt;
    const f = made('refutedFromFan', 'common-wrong', r.text);
    facets.push(f);
    recProof(f, refutedAltProof(fenBefore, r));
    f.identity = `refuted:${r.alt.replace(/[+#!?]+$/, '')}`;
    recStakes(f, costStakes(r.costCp));
    try {
      const am = new Chess(fenBefore).move(r.alt);
      recSquares(f, [am.from, am.to]);
    } catch { /* no squares → it cannot be collapsed with another claim */ }
  }

  // ── 7c. THE WHY OF A CLEAN MOVE (S2) — the opening principle it kept, or
  // past the opening its lead fundamental (`principleLine` decides, from the
  // board). Only where there is nothing to correct: a book/good/unclassified
  // student move, and in the opening only a principle not yet SPOKEN this
  // game (the ledger is committed after the door, so a principle the door
  // silenced may speak later).
  if (isStudent && (ctx.classification === null || ctx.classification === 'book' || ctx.classification === 'good')) {
    // Full the first time a principle speaks this game, a short stem after —
    // the one helper Learn's composer reads (`principleLine`).
    const seat = moverColor === 'white' ? 'w' : 'b';
    const ownLead = readBoard('principle', { fenBefore, san, student: seat, taught: ctx.teaching.principlesTaught, stemKey: stemKeyOf(fenBefore), namesPlayedMove: REVIEW_WRITER.namesPlayedMove });
    const lead = ownLead
      // A clean move that kept no opening rule: the rule the engine's move
      // kept (review walk 2026-10-02 — h4, g4, h5 were owed and silent). Never
      // on a book move: theory is not corrected.
      ?? (ctx.classification === 'book' ? null : readBoard('principleContrast', { fenBefore, san, bestSan: ctx.bestMoveSan ?? null, student: seat, taught: ctx.teaching.principlesTaught, stemKey: stemKeyOf(fenBefore) }));
    if (lead) {
      const k = principleKey(lead);
      const f = basketFacet(lead);
      if (ownLead && k.headsMove) f.headsMove = true;
      if (lead.alsoText) f.follow = lead.alsoText;
      // The FIRST statement of a principle carries its say-once identity; a
      // stem is its own move's fact and must not be eaten by that ledger.
      f.identity = k.first ? `rule:${k.id}` : `rule-stem:${ply}:${k.id}`;
      inRuleFamily(f, k.id);
    } else {
      // WHAT THE MOVE IS FOR, when it kept no rule — Learn's move-point
      // computer, called (review walk 2026-10-02: 7.g4 owed and silent while
      // Learn says "g4 prepares g5, which would kick their knight off f6").
      // QUIET MOVES ONLY: a capture's point is the trade, and review's own
      // trade/material facets say it (Learn: "a capture's point and the trade
      // verdict are one claim") — and "wins the pawn on g3" said over the
      // board after Kxg3 names a pawn where the king now stands (corpus sweep
      // 2026-10-02, mg-lichess-6YRWrSqn ply 49).
      // The engine's purpose speaks below; the board computer only when the
      // engine showed none.
      const pf = ctx.teaching.intent ? null : sayFact(readBoard('studentMovePoint', { fenBefore, san, prevCap: ctx.prevCap }), 'point');
      if (pf) pf.identity = `point:${ply}`;
    }
  }

  // ── 7c'. WHAT THE MOVE WAS FOR, FROM THE ENGINE (Learn + Review audits
  // 2026-10-15: a good move got "the bishop rakes toward d4 and f2" — a
  // description — because nothing here asked the engine what it prepares).
  // Every clean student move, great and brilliant included, so praise has its
  // reason.
  if (isStudent && ctx.teaching.intent && !['inaccuracy', 'mistake', 'blunder', 'miss'].includes(ctx.classification ?? '')) {
    const f = made('intentWithFallback', 'point', ctx.teaching.intent.text);
    facets.push(f);
    f.identity = `point:${ply}`;
    recSquares(f, ctx.teaching.intent.squares);
  }

  // ── 7c''. WHAT THEY KEEP DOING — the same mistake twice, said on the move
  // that made it a habit, with the plan against it. The one habit computer
  // Learn reads (`opponentHabits`); said once a game per habit (identity).
  if (!isStudent && studentColorWB) {
    const before = new Set(readBoardAll('theirHabit', { history: ctx.allSans.slice(0, ply - 1), student: studentColorWB, sound: ctx.teaching.soundPlies }).map(readKey));
    const fresh = readBoardAll('theirHabit', { history: ctx.allSans.slice(0, ply), student: studentColorWB, sound: ctx.teaching.soundPlies }).find((h) => !before.has(readKey(h)));
    if (fresh) {
      const f = made('opponentHabits', 'their-habit', fresh.text);
      facets.push(f);
      f.identity = `their-habit:${readKey(fresh).split(':')[1]}`;
    }
  }
  // …and the student's own, by the same computer (A-plan P4): the move that
  // made it twice is the one to name it on.
  if (isStudent && studentColorWB) {
    const before = new Set(readBoardAll('yourHabit', { history: ctx.allSans.slice(0, ply - 1), student: studentColorWB, sound: ctx.teaching.soundPlies }).map(readKey));
    const fresh = readBoardAll('yourHabit', { history: ctx.allSans.slice(0, ply), student: studentColorWB, sound: ctx.teaching.soundPlies }).find((h) => !before.has(readKey(h)));
    if (fresh) {
      const f = made('habitsOf', 'your-habit', fresh.text);
      facets.push(f);
      f.identity = `your-habit:${readKey(fresh).split(':')[1]}`;
    }
  }

  // ── 7d. WHY DID THEY PLAY THAT? (S3) — on the opponent's move, the threat of
  // the student's it took off the board. The same static computer Learn reads.
  const stop = !isStudent && studentColorWB && ctx.teaching.prevFenBefore
    ? readBoard('threatStopped', { studentFenBefore: ctx.teaching.prevFenBefore, studentFenAfter: fenBefore, reply: san, student: studentColorWB })
    : null;
  if (stop) {
    const f = made('threatStoppedBy', 'stopped', stop.text);
    facets.push(f);
    recSquares(f, stop.squares.slice(0, 2));
  }
  // …and what THEIR move gave up that the student can use — the same board
  // computer Learn speaks (`theirMoveCost`): a new hole a knight reaches,
  // their bishop shut in, castling lost (David 2026-10-02: "teachings on
  // opponents moves" — Review said what their move stopped, never what it cost).
  if (!isStudent && studentColorWB) {
    const cost = readBoard('theirCost', { fenBefore, san, student: studentColorWB });
    // ONE PRODUCER FOR A HOLE THEIR MOVE GAVE (lead 2026-10-20): the walk's
    // opening story says it ("…e5 has a cost for them"), and only when a knight
    // is two moves from it and would hit something there.
    if (cost && !readKey(cost).startsWith('hole:')) {
      const f = made('theirMoveCost', 'their-cost', cost.text);
      facets.push(f);
      f.identity = `their-cost:${readKey(cost).split(':')[0]}:${cost.squares[0] ?? ''}`;
      recSquares(f, cost.squares);
    }
  }
  // …and the rest of READING THEIR MOVE (computers batch 2) — the same one
  // producer Learn speaks from (`readTheirMove`), handed the review's engine
  // line after their move (your reply first) in place of a live fan.
  if (!isStudent && studentColorWB) {
    const lines = ctx.playedLineUci.length > 0 && ctx.evaluation != null
      ? [{ moves: ctx.playedLineUci, evaluation: ctx.evaluation, mate: storedMate(ctx.evaluation) }] : [];
    const prev = ply >= 2 && ctx.teaching.prevFenBefore && ctx.allSans[ply - 2]
      ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : null;
    // THE VERDICT ALREADY SAID THIS REPLY (prod Review audit 2026-11-08,
    // Carlsen–Caruana 26…Qd4: "It let you play Re4, which attacks the queen on
    // d4", then "Their …Qd4 does you a favour: the rook to e4 now comes with
    // gain of time"). The favour is the engine's reply to their move; when the
    // verdict names that reply as what their move allowed, the favour is the
    // same claim. A verdict that names no reply leaves the favour as the line
    // that says what their move allowed ("it makes the rook to e2 possible").
    const replySan = lines[0] ? uciToSanAt(fenAfter, lines[0].moves[0]) : null;
    const verdictSaidReply = !!verdictPunish && !!replySan && verdictPunish.replace(/^…/, '') === replySan;
    const readCtx = { fenBefore, san, student: studentColorWB, lines, prev, flagged: negativeClass };
    for (const r of [...readBoardAll('theirRead', readCtx), ...readBoardAll('theirPreventTest', readCtx), ...readBoardAll('theirTrigger', readCtx)]) {
      if (readKey(r).startsWith('helped-you|') && verdictSaidReply) continue;
      const f = put('readTheirMove', r.kind, r.text);
      recProof(f, isProof(r.proof) ? r.proof : null);
      recStakes(f, r.stakes);
      recSquares(f, r.squares);
      f.identity = `hint:${r.claims[0]}`;
    }
    // "Can you play it anyway?" — their reply stopped your threat on paper.
    const any = stop && ctx.teaching.prevFenBefore ? readBoard('playItAnyway', { studentFenBefore: ctx.teaching.prevFenBefore, studentFenAfter: fenBefore, reply: san, fenNow: fenAfter, lines, student: studentColorWB }) : null;
    if (any) {
      const f = made('playItAnyway', 'prevent-test', any.text);
      facets.push(f);
      recProof(f, isProof(any.proof) ? any.proof : null);
      recSquares(f, any.squares);
      f.identity = `hint:${readKey(any)}`;
    }
  }
  // A KNOWN ATTACKING STRUCTURE on the board the student moved from, by its
  // conditions — once a game per hook.
  if (isStudent && studentColorWB) {
    const cp = ctx.preMoveEval != null ? ctx.preMoveEval * (studentColorWB === 'w' ? 1 : -1) : null;
    const ka = readBoard('knownAttack', { fen: fenBefore, student: studentColorWB, studentCp: cp });
    if (ka) {
      const f = made('knownAttack', 'attack-pattern', ka.text);
      facets.push(f);
      recProof(f, isProof(ka.proof) ? ka.proof : null);
      recSquares(f, ka.squares);
      f.identity = `hint:${readKey(ka)}`;
    }
  }
  // …and THE STRUCTURE JUDGEMENTS (batch 6, `structureReads`) — the same
  // computers Learn speaks: on the student's move what it did to the structure
  // (and the standing facts of the board it was played on); on theirs what it
  // did to the student's structure and squares. Each carries its proof.
  if (studentColorWB) {
    const reads = isStudent
      ? [
        ...readBoardAll('structureMove', { fenBefore, san, student: studentColorWB, cpLoss: Math.max(0, ctx.costCp ?? 0), bestSan: ctx.bestMoveSan, bestUci: ctx.bestLineUci, reply: ctx.replyBestSan, namesBetterMove: namesBetterMoveFor(REVIEW_WRITER, true), namesStudentMoves: REVIEW_WRITER.namesStudentMoves }),
        // A STANDING FACT OF THE BOARD THE MOVE WAS PLAYED ON is said only
        // where the move left its squares as they were (prod Review
        // 2026-11-09, 39.Rxd6+: "Their d6 pawn is the key pawn: it guards
        // c5" was said as the rook took that pawn — history, not a fact).
        ...readBoardAll('structureBoard', { fen: fenBefore, student: studentColorWB }).filter((r) => !touchedByMove(fenBefore, san, r.squares)),
      ]
      : readBoardAll('structureTheirMove', { fenBefore, san, student: studentColorWB });
    for (const r of reads) {
      const f = put(r.computer, 'judgement', r.text);
      // SAID ONCE BY ITS OWN KEY, as Learn's ledger says it ("Their king went
      // kingside … so the plan changes" spoke on three moves of one game).
      f.identity = `once:${readKey(r)}`;
      // Behind a line that named the move it says "It also …", never the move again.
      if (r.alsoText) f.follow = r.alsoText;
      recSquares(f, r.squares);
      if (isProof(r.proof)) recProof(f, r.proof);
      recStakes(f, r.stakes);
    }
  }
  // …and the fork trick, both seats — the same computer Learn's composer reads
  // (re-walk 1380: 7.Bb3 sidestepping …Nxe4 Nxe4 d5 said nothing).
  if (studentColorWB && !stop) {
    const trick = readBoard('trickSidestepped', { fenBefore, san, student: studentColorWB });
    if (trick) {
      const f = made('trickSidestepped', 'stopped', trick.text);
      facets.push(f);
      recSquares(f, [...trick.squares]);
      // The capture, recapture and fork the words name, drawn move by move.
      if (trick.lines?.length) f.lines = [...trick.lines];
    }
  }

  // …and the PIN OR KICK THE STUDENT COULD HAVE STOPPED (prophylaxis, the
  // computer Learn advises with): their move is exactly the one a quiet move of
  // the student's would have taken away, and the student did not play it.
  if (!isStudent && studentColorWB && ctx.teaching.prevFenBefore && ply >= 2) {
    const miss = readBoard('prophylaxisMissed', { prevFen: ctx.teaching.prevFenBefore, studentSan: ctx.allSans[ply - 2], fenBefore, san, student: studentColorWB });
    if (miss) {
      const f = put(miss.computer, 'timing', miss.text);
      if (isProof(miss.proof)) recProof(f, miss.proof);
      recSquares(f, miss.squares);
    }
  }
  // …and the GUARD THE STUDENT'S MOVE TIED DOWN (tiedDefender), still tied.
  if (isStudent && studentColorWB) {
    // Still tied after their reply (the registry's one read) — a guard their
    // reply untied is not said tied.
    const reply = ctx.allSans[ply];
    const fenAfterReply = reply ? (() => { try { const c = new Chess(fenAfter); return c.move(reply) ? c.fen() : fenAfter; } catch { return fenAfter; } })() : fenAfter;
    const tie = readBoard('tiedDefender', { fenBefore, fenAfterMove: fenAfter, fenAfterReply, student: studentColorWB });
    if (tie) {
      const f = put(tie.computer, 'point', tie.text);
      if (isProof(tie.proof)) recProof(f, tie.proof);
      recSquares(f, tie.squares);
    }
  }

  // …and THE LINE TACTICS (tacticGeometry, via the one registry — the same
  // reads Learn speaks): what the best line had that the move did not play,
  // and the false-mate / discovery audit of the move that WAS played. A read
  // naming the best move never speaks when the student played it (G4.5.2,
  // matched by coordinates, never SAN).
  // A REGISTRY FACT AS A FACET (WO-STORY-MATRIX-01 P1-6a): under the fact's
  // own kind — a computer whose kind is no facet tag fails to compile here —
  // with its proof, squares and stakes, and the identity it is said once under.
  const facetOf = (f: CoachFact & { kind: FacetTag }, identity: string): void => {
    const raw = put(f.computer, f.kind, f.text);
    if (f.lines?.length) raw.lines = [...f.lines];
    recProof(raw, isProof(f.proof) ? f.proof : null);
    recSquares(raw, f.squares);
    recStakes(raw, f.stakes);
    // The claims ride along: two computers that make one claim ("this move
    // presses c2") fold into one at the door, as they do in a lesson.
    if (f.claims.length) raw.claims = [...f.claims];
    raw.identity = identity;
  };
  if (isStudent && studentColorWB) {
    const playedUci = ((): string | null => { try { const m = new Chess(fenBefore).move(san); return m ? `${m.from}${m.to}` : null; } catch { return null; } })();
    const playedBest = !!ctx.bestLineUci[0] && ctx.bestLineUci[0].slice(0, 4) === playedUci;
    const lom = ply >= 2 && ctx.teaching.prevFenBefore ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : undefined;
    for (const g of readBoardAll('tacticGeometry', { fen: fenBefore, me: studentColorWB, pv: ctx.bestLineUci, register: geometryRegister(REVIEW_WRITER), played: san, ...(lom ? { lastOpponentMove: lom } : {}) })) {
      if (g.namesStudentMove && playedBest) continue;
      facetOf(g, readKey(g));
    }
  }

  // ── 7d2. THE REST OF LEARN'S BOARD COMPUTERS, through the one registry
  // (David 2026-10-15: "Make sure no other code is missing from other coach
  // surfaces. Everything gets unified"). Each read where Learn reads it — on
  // their move, with the student to move; or on the student's own move — and
  // each said once a game through the `hint:` ledger.
  if (studentColorWB) {
    // Each fact under its own kind — never a tag picked here: the same read
    // used to be a habit on Review, a choice on Learn and a rule on the live
    // read (WO-STORY-MATRIX-01 P1-4) — said once through the `hint:` ledger.
    const add = (f: (CoachFact & { kind: FacetTag }) | undefined): void => { if (f) facetOf(f, `hint:${readKey(f)}`); };
    // One fact a computer: the first each read found.
    const addFirsts = (rs: ReadonlyArray<{ id: string; f: CoachFact & { kind: FacetTag } }>): void => {
      const seen = new Set<string>();
      for (const r of rs) if (!seen.has(r.id)) { seen.add(r.id); add(r.f); }
    };
    // THE KING WALKED BY HAND, both seats (his Scotch Gambit game, 2026-11-04):
    // where the king goes when it must walk, the castling-by-hand plan and
    // each step of it, the bishop kept home to block a check, and the rule of
    // thumb when the king steps out of the centre.
    addFirsts(kingWalkReads({ fenBefore, san, student: studentColorWB, lines: ctx.bestLineUci.length ? [{ moves: ctx.bestLineUci }] : null, bestUci: ctx.bestLineUci[0] ?? null }));
    // THE MOVES A PLAYER WEIGHS, both seats (weighedMoves, 2026-11-05): the
    // natural move that fails and its line, the move of the same worth and
    // what separates them, the piece's other squares and what goes wrong on
    // each — read off the record's one read per candidate (`weighReads`).
    {
      const w = ctx.teaching.weigh;
      const prior = ctx.teaching.prevFenBefore && ply >= 2 && ctx.allSans[ply - 2] ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : null;
      // The engine's better move when this move cost an inaccuracy or more:
      // the square choice is not asked of a piece it took elsewhere.
      const weighed = weighedReads({ fenBefore, san, student: studentColorWB, rating: w.rating, reads: w.reads, priorMove: prior, bestUci: ctx.bestLineUci[0] ?? null, costCp: ctx.costCp === null ? null : Math.max(0, ctx.costCp), namesStudentMoves: REVIEW_WRITER.namesStudentMoves });
      addFirsts(weighed);
      const choice = weighed.find((r) => r.id === 'squareChoice');
      // Why that square, the other way round: the piece put where nothing can
      // chase it (`outOfReach`). One answer a move — the same claim as the
      // square choice, so it speaks only where that one did not.
      if (!choice) add(readBoardAll('outOfReach', { fenBefore, san, student: studentColorWB, altUcis: (w.reads ?? []).map((l) => l.moves[0] ?? '') })[0]);
    }
    // THE TEACHING MOVES' NEW COMPUTERS, both seats (2026-11-05): the pawn
    // break and what it is for — the pawn it strikes, the file it opens for
    // the rooks, the bishop it frees. `lastTo`: where the move before landed
    // (a recapture is no break).
    {
      const lastTo = ((): string | null => {
        if (!ctx.teaching.prevFenBefore || ply < 2 || !ctx.allSans[ply - 2]) return null;
        try { return new Chess(ctx.teaching.prevFenBefore).move(ctx.allSans[ply - 2]).to; } catch { return null; }
      })();
      add(readBoardAll('pawnBreak', { fenBefore, san, student: studentColorWB, lastTo, namesStudentMoves: REVIEW_WRITER.namesStudentMoves })[0]);
      // Opposite-coloured bishops settled by this move, and what they mean.
      add(readBoardAll('oppositeBishops', { fenBefore, san, student: studentColorWB })[0]);
      // Knight against bishop made by this move, and which minor is better.
      add(readBoardAll('minorMatchup', { fenBefore, san, student: studentColorWB })[0]);
      // A piece in front of a passed or isolated pawn, or the blockader of a
      // passer walking away, both seats.
      add(readBoardAll('blockade', { fenBefore, san, student: studentColorWB })[0]);
      // What the pawn move did to the lines through its squares, and a piece
      // at a chain's base or a pinned pawn guard (S4 pawns), both seats.
      add(readBoardAll('pawnCutsGuard', { fenBefore, san, student: studentColorWB })[0]);
      add(readBoardAll('chainBase', { fenBefore, san, student: studentColorWB })[0]);
      add(readBoardAll('pinnedPawnGuard', { fenBefore, san, student: studentColorWB })[0]);
      // The plan's next steps off the engine's line after the move, and the
      // compensation a side down material is playing for (2026-11-12).
      if (ctx.playedLineUci.length) add(readBoardAll('planSteps', { fenAfter, line: ctx.playedLineUci, student: studentColorWB, played: playedUci(fenBefore, san) })[0]);
      if (ctx.evaluation != null && storedMate(ctx.evaluation) == null) add(readBoardAll('compensation', { fenAfter, student: studentColorWB, studentCp: ctx.evaluation * (studentColorWB === 'w' ? 1 : -1), line: ctx.playedLineUci })[0]);
      // Defence, both seats (Danya's speedruns, 2026-11-17): a pin that will
      // not hold, the queen's escapes counted, two hanging pieces one move
      // saves (the record keeps one line after the move, so a save the engine
      // has to vouch for stays unsaid here).
      add(readBoardAll('harmlessPin', { fenBefore, san, student: studentColorWB, line: ctx.playedLineUci })[0]);
      add(readBoardAll('queenNet', { fenBefore, san, student: studentColorWB })[0]);
      // The pawn no pawn can guard, the pressure on it and the siege the
      // line builds on its file; the break the move readies or takes away,
      // both seats — off the game's line after the move, gated on its cost.
      add(readBoardAll('targetPressure', { fenBefore, san, student: studentColorWB, lineAfter: ctx.playedLineUci, costCp: ctx.costCp })[0]);
      add(readBoardAll('breakPrep', { fenBefore, san, student: studentColorWB, lineAfter: ctx.playedLineUci, costCp: ctx.costCp })[0]);
      add(readBoardAll('breakStopped', { fenBefore, san, student: studentColorWB, costCp: ctx.costCp })[0]);
      // Getting into their camp, both seats (Danya's speedruns).
      add(readBoardAll('intoTheirCamp', { fenBefore, san, student: studentColorWB })[0]);
      // The early queen chased with tempo, both seats, off the game's own
      // moves before this one.
      add(readBoardAll('queenChased', { history: ctx.allSans.slice(0, ply - 1), fenBefore, san, student: studentColorWB })[0]);
      // One piece moved again while the others wait at home, and the castling
      // the move took away or which way the king castled, both seats — the
      // same reads the lesson's thought takes (one coach, unlocked).
      { const again = readBoardAll('pieceMovedAgain', { history: ctx.allSans.slice(0, ply - 1), fenBefore, san, student: studentColorWB, costCp: ctx.costCp })[0]; if (again) add({ ...again, kind: 'principle' }); }
      add(readBoardAll('castlingTaken', { fenBefore, san, student: studentColorWB })[0]);
      add(readBoardAll('castlingWing', { fenBefore, san, student: studentColorWB })[0]);
      // THE DANYA HAVE-CHECK COMPUTERS (2026-11-19), both seats on the board
      // after the move: who owns the centre with pawns, a central duo against
      // a deformed centre, a bent structure that does not matter (off the
      // stored score), checks that all give the piece away, the kings' race,
      // and the hole the pawn move leaves that nothing reaches.
      add(readBoardAll('pawnCentre', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('centreDuo', { fen: fenAfter, student: studentColorWB })[0]);
      if (ctx.evaluation != null) add(readBoardAll('harmlessWeakPawns', { fen: fenAfter, student: studentColorWB, best: { cp: storedMate(ctx.evaluation) == null ? ctx.evaluation : null, mate: storedMate(ctx.evaluation) } })[0]);
      add(readBoardAll('noSafeChecks', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('kingRace', { fen: fenAfter, student: studentColorWB })[0]);
      // BATCH 2 (2026-11-19), on the board after the move with the record's
      // one line there (the played line, its score White's view, unpriced on a
      // mate): a misplaced queen, their worst piece, a king in the open, the two
      // kings, the zugzwang theirs only if they move, the lever to a passer, the
      // two armies, the verdict, the defender in time. (The strike that has to
      // come now and the equal move that asks questions compare top lines the
      // record does not keep.)
      add(readBoardAll('zugzwangIfPassed', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('keySquareRead', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('kpDrawRead', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('wonEndingRead', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('shoulderRead', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('connectedPassers', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('queenlessMate', { fen: fenAfter, student: studentColorWB })[0]);
      // The mate the move allowed is the verdict's own sentence; the net
      // around the same king would say it a second time.
      if (allowedMateHere === null) add(readBoardAll('matingNet', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('frozenTarget', { fen: fenAfter, student: studentColorWB })[0]);
      add(readBoardAll('theirWorstPiece', { fen: fenAfter, student: studentColorWB, bestLine: ctx.playedLineUci.length ? ctx.playedLineUci : null })[0]);
      add(readBoardAll('seventhRankMate', { fen: fenAfter, lines: null, student: studentColorWB })[0]);
      add(readBoardAll('pieceTempo', { fen: fenAfter, lines: null, student: studentColorWB })[0]);
      if (ctx.evaluation != null && !isMateEval(ctx.evaluation) && ctx.playedLineUci.length) {
        const lines = [{ moves: ctx.playedLineUci, cp: ctx.evaluation, mate: null }];
        add(readBoardAll('misplacedQueen', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('kingInOpen', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('kingActivityGap', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('leverPasser', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('coordinationGap', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('endgameVerdict', { fen: fenAfter, lines, student: studentColorWB })[0]);
        for (const f of readBoardAll('defenderInTime', { fen: fenAfter, lines, student: studentColorWB })) add(f);
        // Batch 3 (2026-11-19), on the record's one line.
        add(readBoardAll('secondFront', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('lateralRookDefence', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('squareForPiece', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('tradeRelievesCramp', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('queenKnightNet', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('selfBlock', { fen: fenAfter, lines, student: studentColorWB })[0]);
        add(readBoardAll('mateThreatLever', { fen: fenAfter, lines, student: studentColorWB })[0]);
      }
      add(readBoardAll('inaccessibleHole', { fenBefore, san, student: studentColorWB })[0]);
      // Both seats, worded from the student's: the box shrunk, the promotion
      // that comes with check, the lever with no pieces near it, and the
      // tension released too early (off the record's best line and the score
      // before and after the move, White's view, unpriced on a mate).
      {
        add(readBoardAll('kingBox', { fenBefore, san, student: studentColorWB, namesPlayedMove: REVIEW_WRITER.namesPlayedMove })[0]);
        add(readBoardAll('promotionWithCheck', { fenBefore, san, reply: ctx.allSans[ply] ?? null, student: studentColorWB, namesPlayedMove: REVIEW_WRITER.namesPlayedMove })[0]);
        add(readBoardAll('wingWithoutPieces', { fenBefore, san, student: studentColorWB })[0]);
        if (ctx.preMoveEval != null && ctx.evaluation != null && !isMateEval(ctx.preMoveEval) && !isMateEval(ctx.evaluation) && ctx.bestLineUci.length) {
          const sign = moverWB === 'w' ? 1 : -1;
          const released = readBoardAll('tensionReleased', { fenBefore, san, lines: [{ moves: ctx.bestLineUci, cp: ctx.preMoveEval, mate: null }], playedCp: ctx.evaluation * sign, reply: ctx.allSans[ply] ?? null, student: studentColorWB })[0];
          if (released) add(released);
        }
      }
      add(readBoardAll('stalemateTrick', { fenBefore, san, student: studentColorWB })[0]);
      add(readBoardAll('bothSaved', { fenBefore, san, student: studentColorWB, replies: ctx.playedLineUci.length ? [{ cp: ctx.evaluation != null && storedMate(ctx.evaluation) == null ? ctx.evaluation : null, mate: null, moves: ctx.playedLineUci }] : [] })[0]);
      // A windmill and a perpetual check, both seats (repeatingChecks), one
      // claim between them; the stored score keeps a perpetual quiet where its
      // side is winning anyway.
      add(readBoardAll('windmill', { fenBefore, san, student: studentColorWB })[0]);
      add(readBoardAll('perpetualCheck', { fenBefore, san, student: studentColorWB, replies: ctx.evaluation == null ? [] : [{ cp: storedMate(ctx.evaluation) == null ? ctx.evaluation : null, mate: storedMate(ctx.evaluation), moves: ctx.playedLineUci }] })[0]);
      // The kings (WO-DANYA-READS-01 group 1), both seats: a king the move
      // leaves outnumbered, a back rank one piece holds, a loaded discovery,
      // and a sacrifice at the king proven by the played line.
      {
        const replies = ctx.evaluation == null ? [] : [{ cp: storedMate(ctx.evaluation) == null ? ctx.evaluation : null, mate: storedMate(ctx.evaluation), moves: ctx.playedLineUci }];
        add(readBoardAll('kingSiege', { fenBefore, san, student: studentColorWB, replies })[0]);
        add(readBoardAll('backRankWeakness', { fenBefore, san, student: studentColorWB })[0]);
        add(readBoardAll('loadedDiscovery', { fenBefore, san, student: studentColorWB })[0]);
        const seconds = ctx.playedLineEarlierUci && ctx.playedLineEarlierUci.length > 0 ? [ctx.playedLineEarlierUci] : [];
        add(readBoardAll('kingSacrifice', { fenBefore, san, student: studentColorWB, replies, seconds })[0]);
        // The hidden combination (group 8): material given away from the
        // king and won back with interest, or mate, by the played line.
        add(readBoardAll('deepCombination', { fenBefore, san, student: studentColorWB, replies, seconds })[0]);
      }
      // The flexible move, both seats (the option principle): of moves the
      // engine holds as good as each other, the one that keeps the important
      // moves open — off the record's one read per candidate.
      add(readBoardAll('flexibleMove', { fenBefore, san, student: studentColorWB, reads: ctx.teaching.weigh.reads })[0]);
      // The exchange sacrifice, both seats: the rook given on purpose and what
      // it buys, off the same read per candidate.
      add(readBoardAll('exchangeSacrifice', { fenBefore, san, student: studentColorWB, reads: ctx.teaching.weigh.reads })[0]);
      // The pawn majority, both seats: made, crippled, given up or set moving,
      // a recapture read against the board before the trade began.
      add(readBoardAll('pawnMajority', { fenBefore, san, student: studentColorWB, prior: ply >= 2 && ctx.teaching.prevFenBefore ? { fenBefore: ctx.teaching.prevFenBefore, san: ctx.allSans[ply - 2] } : null })[0]);
      // The fortress, both seats: a piece down and a draw the board explains,
      // off the stored score after the move.
      add(readBoardAll('fortress', { fenBefore, san, student: studentColorWB, replies: ctx.evaluation == null ? [] : [{ cp: storedMate(ctx.evaluation) == null ? ctx.evaluation : null, mate: storedMate(ctx.evaluation), moves: ctx.playedLineUci }] })[0]);
      // ENDGAME TECHNIQUE, both seats (WO-DANYA-READS-01 #5): the opposition
      // taken, the zugzwang made (the bounded count — the record keeps no
      // null-move read), the named ending reached, the race counted, the piece
      // a promotion makes — off the stored score after the move.
      {
        const m = ctx.evaluation == null ? null : storedMate(ctx.evaluation);
        const afterCp = ctx.evaluation == null ? null : m != null ? (m > 0 ? 100000 : -100000) : ctx.evaluation;
        add(readBoardAll('oppositionRead', { fenBefore, san, student: studentColorWB, afterCp })[0]);
        add(readBoardAll('zugzwangRead', { fenBefore, san, student: studentColorWB, after: null, passAfter: null })[0]);
        add(readBoardAll('theoreticalEnding', { fenBefore, san, student: studentColorWB, afterCp })[0]);
        add(readBoardAll('raceCount', { fenBefore, san, student: studentColorWB })[0]);
        add(readBoardAll('promotionChoice', { fenBefore, san, student: studentColorWB, before: null })[0]);
      }
      // THE KEY DEFENDER and PRACTICAL CHANCES, both seats (WO-DANYA-READS-01
      // #6, #7): the trade that takes off the piece doing a job alone, and the
      // worse side's move that makes the way through long — off the stored
      // cost, the score before the move and the line after it. The record
      // keeps one line after the move, so only the long way through can be
      // proved here; one good reply and the free-looking grab need the
      // engine's ranked replies, which the lesson and chat hand in.
      {
        const m = ctx.evaluation == null ? null : storedMate(ctx.evaluation);
        const afterLine: AnalysisLine | null = ctx.evaluation == null ? null
          : { rank: 1, evaluation: m != null ? (m > 0 ? 100000 : -100000) : ctx.evaluation, mate: m, moves: [...ctx.playedLineUci] };
        add(readBoardAll('keyDefender', { fenBefore, san, student: studentColorWB, costCp: ctx.costCp, after: afterLine })[0]);
        const pm = ctx.preMoveEval == null ? null : storedMate(ctx.preMoveEval);
        const standCp = ctx.preMoveEval == null || pm != null ? null : ctx.preMoveEval * (moverWB === 'w' ? 1 : -1);
        add(readBoardAll('practicalChance', { fenBefore, san, student: studentColorWB, reads: { moverCp: standCp, costCp: ctx.costCp, after: afterLine ? [afterLine] : [] } })[0]);
      }
    }
    if (!isStudent) {
      // Their move took an attacker off a piece you had to look after.
      add(readBoardAll('obligationLifted', { fenBefore, fenAfter, student: studentColorWB })[0]);
      // Your pinned piece walks out with tempo — the pin is not what it looks.
      add(readBoardAll('pinBreakOwn', { fen: fenAfter, student: studentColorWB })[0]);
      // Their piece you pin can walk out the same way.
      try {
        for (const t of detectTactics(fenAfter).tactics) {
          if (t.type !== 'pin' || t.beneficiary !== studentColorWB || !t.involvedSquares[1]) continue;
          add(readBoardAll('pinBreakTheirs', { fen: fenAfter, student: studentColorWB, pinned: t.involvedSquares[1] })[0]);
        }
      } catch { /* no tactic read, no pin break */ }
      // A capture that looks free and leaves your queen with no way out.
      add(readBoardAll('queenGrabTrap', { fen: fenAfter })[0]);
    } else {
      // The engine's line plays A first because A clears the road B needs.
      if (ctx.bestLineUci.length >= 2) add(readBoardAll('enablingMove', { fen: fenBefore, pv: ctx.bestLineUci })[0]);
      // The count, only when the student's move lost it; the priority they faced.
      add(readBoardAll('countMethod', { fenBefore, playedSan: san, student: studentColorWB, costCp: swing })[0]);
      if (ctx.bestLineUci[0]) add(readBoardAll('priorityFirst', { fen: fenBefore, student: studentColorWB, bestUci: ctx.bestLineUci[0] })[0]);
    }
    // THE KNOWN MISTAKES AND TRAPS, both seats (David 2026-11-04: "it needs
    // to be in review for sure"), from the club gem index: the slip this move
    // played, said as why it was a mistake — never against the move's own
    // grade when that grade called it sound — or else the slip ahead on the
    // board this move reached, when the game went another way. One a move;
    // each said once a game per position (its `hint:` key is the board and
    // the slip).
    const slips = ctx.teaching.knownSlips;
    if (slips.index) {
      const gradedSound = ctx.classification === 'good' || ctx.classification === 'book' || ctx.classification === 'great' || ctx.classification === 'brilliant';
      add(knownSlipReads({ fenBefore, fenAfter, san, next: ctx.allSans[ply] ?? null, student: studentColorWB, index: slips.index, graded: { sound: gradedSound, punish: verdictPunish, nextAlt: slips.nextRefutedAlt }, told: slips.told })[0]);
    }
  }

  // ── 7e. WHO'S BETTER, AND WHY — at the turn of the game (S4).
  if (studentColorWB && ctx.teaching.phaseTurn) {
    const cp = ctx.evaluation === null ? null : (studentColorWB === 'w' ? ctx.evaluation : -ctx.evaluation);
    sayFact(readBoard('phaseVerdict', { fen: fenAfter, student: studentColorWB, studentCp: cp, phase: ctx.teaching.phaseTurn, heard: new Set(), lastMove: lastMoveFromSan(fenBefore, san) }), 'stock');
  }

  // ── 8. FORCED MATING RUN — this ply begins a forced checking finish ──
  if (ctx.forcedRunFact) {
    const ff = made('detectForcedMatingSequence', 'forced', ctx.forcedRunFact.text);
    facets.push(ff);
    recStakes(ff, mateStakes(matingSideIsStudent(ctx.allSans, studentColorWB) ? 'you' : 'them', 2, true));
  }

  // ── 9. PLANS — middlegame orientation (both sides; the opening's plan is the
  // Theory button's) ──
  if (studentColorWB) {
    // Never while their king is stuck in the centre — a king hunt, not a
    // majority grind (the registry's read decides).
    sayFact(readBoard('middlegameOrientation', { fen: fenAfter, student: studentColorWB, seat: isStudent ? 'student' : 'opponent', san: null }), 'plan-middlegame');
  }

  // ── 10. OPENING IDENTITY — the name and what the opening is are the
  // walk's announcement and its openingStory identity beat; what the line is
  // FOR from master games (the masters' plan) is opening theory, the Theory
  // button's (David 2026-11-06), never a walk facet.

  // ── 11. OPPONENT READ — what the opponent's move targets + their dev lag ──
  if (!isStudent && studentColorWB) {
    const oppFact = readBoard('opponentMoveTeaching', { fenBefore, san, student: studentColorWB });
    const opp = oppFact ? { kind: oppTeachingKind(oppFact), squares: oppFact.squares } : null;
    // "Their knight on c3 now fights for d5. Your opponent's knight steps in
    // eyeing d5" — ONE claim, two families, spoken back to back on every
    // opponent development move (walk 5, 2026-09-23). The selector keeps
    // different families apart on purpose (B12), so the restatement is dropped
    // here, where both are known: the influence line (`[does]`, or `[delta]` when it hits no piece) already carries the reach.
    const restates = (opp?.kind === 'influence' && !!influence)
      // …and the weak pawn it trains on, when the reach already names that
      // square (prod Review audit 2026-11-08, Carlsen–Caruana 26…Qd4: "Their
      // queen now hits your d-pawn, which is loose" then "Your opponent's queen
      // trains on your weak pawn on d5"): the reach keeps it, with its loose
      // claim for the count.
      || (!!opp && opp.kind === undefined && opp.squares.length > 1
        && facets.some((x) => x.computer === 'describeMoveInfluence' && x.squares.includes(opp.squares[1])));
    // ONE LOOSE PIECE, ONE LINE (Review baseline 2026-11-08: "Their bishop now
    // attacks your light-squared bishop, which is loose … Watch out — that
    // bishop attacks your bishop on b7, and nothing defends it"). The reach
    // and the hanging read are one claim about one square; the threat read
    // keeps it, since it carries the threat voice (quiet on a proven skill)
    // and the threat arrow, and the reach's line goes with it.
    if (opp?.kind === 'hanging' && influenceShape.loose && opp.squares[1] === influenceShape.loose) {
      const k = facets.findIndex((x) => x.computer === 'describeMoveInfluence' && x.claims?.includes(`loose:${influenceShape.loose}`));
      if (k >= 0) facets.splice(k, 1);
    }
    const f = opp && !restates ? sayFact(oppFact, 'opp-target') : null;
    if (opp && f) {
      // The threatened square, coupled for the walk's threat voice (one table
      // with Learn: a simple threat on a skill the student has proven is quiet).
      if (opp.kind === 'hanging' && opp.squares[1]) f.identity = `opp-threat:hanging:${opp.squares[1]}`;
    }
    // The opponent's OWN moves so far (parity from the student's colour): white
    // plays odd ply numbers (even index), black plays even ply numbers (odd index).
    const oppIsWhite = studentColorWB === 'b';
    const oppSans = ctx.allSans.slice(0, ply).filter((_, i) => (i % 2 === 0) === oppIsWhite);
    sayFact(readBoard('opponentDevelopment', { oppSans, fen: fenAfter, student: studentColorWB }), 'opp-dev');
  }

  // ── 12. ENDGAME PHASE ──
  if (studentColorWB) basketFacet(readBoard('endgamePhase', { fen: fenAfter, student: studentColorWB }));

  // THE SQUARES ARE THE PROOF of a claim whose computer handed in no line
  // (one-coach P3): the squares it read off the board, marked on Why. Never
  // scraped from the words — only the squares the computer coupled above.
  // A fact whose computer brought no proof rests on the squares it names.
  for (const f of facets) {
    if (f.proof !== NO_PROOF.description || f.squares.length === 0) continue;
    const p = squaresProof(f.text, f.squares);
    if (p) f.proof = p;
  }

  return facets;
}

function cap(s: string): string { return openSentence(s); }
function lowerFirst(s: string): string { return continueSentence(s); }


// The move-quality label, spoken as English. The old template read
// "<Classification> move" — so the coach literally said "inaccuracy move" and
// "great move" in the same breath (David 2026-09-15, reading a prod review
// transcript). The classification is still the computer's verdict; only its
// wording changes.
const QUALITY_CLAUSE: Record<string, string> = {
  inaccuracy: 'was an inaccuracy',
  mistake: 'was a mistake',
  blunder: 'was a blunder',
  miss: 'missed the chance',
  great: 'was a great move',
  brilliant: 'was a brilliant move',
  best: 'was the best move',
};
/** THE VERDICT AS A SENTENCE WITH ITS MOVER (review of chesscom-1040709576,
 *  2026-10-13: "You: that was a mistake" / "Your opponent: that was a
 *  mistake" read as a speaker label, not speech). The move is named with its
 *  owner — "Your d6 was a mistake", "Their c3 was a mistake" — so whose move
 *  it was is never guessed, in the one perspective (you / their). */
export function verdictSentence(classification: string, isStudent: boolean, san: string): string {
  const owner = isStudent ? 'Your' : 'Their';
  const clause = QUALITY_CLAUSE[classification.toLowerCase()] ?? `was ${lowerFirst(cap(classification))}`;
  return `${owner} ${san} ${clause}`;
}
/** PRAISE CARRIES ITS WHY (review of chesscom-1040709576, 2026-10-13: "that
 *  was a great move." and nothing else). Each positive grade has one computed
 *  reason, and the reason is what earned the grade: Great is a forced mate
 *  found where there was none, or the only move (`onlyMoveGapCp` ≥
 *  ONLY_MOVE_CP); Brilliant is a sacrifice that holds (`detectBrilliancy`).
 *  Empty when the grade has no reason this computer can state. */
export function praiseWhy(
  classification: string,
  evalBefore: number | null,
  evalAfter: number | null,
  mover: 'white' | 'black',
): string {
  const sign = mover === 'white' ? 1 : -1;
  const mateAfter = evalAfter !== null && isMateEval(evalAfter) && evalAfter * sign > 0;
  const mateBefore = evalBefore !== null && isMateEval(evalBefore) && evalBefore * sign > 0;
  if (classification === 'brilliant') return ' — a sacrifice, and it holds up';
  if (classification !== 'great') return '';
  if (mateAfter && !mateBefore) {
    const n = mateDistanceOf(evalAfter);
    return n ? ` — it finds a forced mate in ${n}` : ' — it finds a forced mate';
  }
  return ` — the only move here: every other move costs ${costWords(ONLY_MOVE_CP)} or more`;
}
export { correctionAgainstHeard } from './heardCorrection';

export { seatMoveSubject } from './pvPlayback';
export { describeMoveInfluence, INFLUENCE_LOOSE_TAIL_RE } from './moveInfluence';

export { studentAnswer } from './playCommentary';
