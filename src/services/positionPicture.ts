/**
 * THE PICTURE OF THE POSITION (WO-PICTURE-01, David 2026-11-19: "There is
 * nothing that aggregates the information to form a coherent picture" → "We
 * also need to not drop the lesser valued facts then … Otherwise we just have
 * an outline").
 *
 * Every fact computed for a board goes into ONE picture, the lesser ones
 * included. A fact is indexed by the objects it is about (the piece standing on
 * each of its squares on its own board, or the empty square) and by its ROLE —
 * what kind of piece of the argument it is. A fact attaches to another only
 * through a COMPUTED link (a shared claim key, or the same piece on the same
 * square of the same board);
 * square overlap alone is never a link.
 *
 * A leaf: chess.js and the fact shape, nothing else.
 */
import { Chess, type Square } from 'chess.js';
import type { CoachFact, ComputerName } from './coachFact';

/** What part of the argument a computer's facts play. One answer per
 *  computer, so a new computer fails to compile until someone decides it. */
export type PictureRole =
  /** who stands better and how much, the verdict and its character */
  | 'standing'
  /** a side's working plus: a good piece, a file, a passer, the centre */
  | 'asset'
  /** a side's liability: a weak pawn or square, a bad or idle piece, an exposed king */
  | 'weakness'
  /** a tactic or threat on the board, for either side */
  | 'threat'
  /** a defensive or counterplay resource: a break, a perpetual, a stop */
  | 'resource'
  /** a move a player weighs, and what happens to it */
  | 'try'
  /** a plan: a goal and its way */
  | 'plan'
  /** what one move does */
  | 'move'
  /** a consequence read down an engine line */
  | 'line'
  /** a standing description of the board */
  | 'board'
  /** the habit that finds it next time */
  | 'habit'
  /** opening knowledge */
  | 'theory'
  /** the whole game's story */
  | 'story';

export const PICTURE_ROLE: Record<ComputerName, PictureRole> = {
  moveAspects: 'move',
  moveJob: 'move',
  computeMoveFundamentals: 'move',
  buildReviewMoveTeachingFact: 'move',
  deepFact: 'line',
  bindingFact: 'move',
  theirTarget: 'threat',
  pieceRoute: 'move',
  explainTemptingCapture: 'try',
  threatPurpose: 'threat',
  itineraryAt: 'move',
  pieceOutFirst: 'move',
  lineCut: 'move',
  pieceCage: 'move',
  opensCheck: 'move',
  captureOrder: 'move',
  knightSquareTaken: 'move',
  namedStructureFormed: 'move',
  orderByThreat: 'move',
  stopsBreak: 'resource',
  preparesBreakClause: 'resource',
  onlyMove: 'standing',
  moveStops: 'resource',
  openingTheoryFacts: 'theory',
  inBetweenMove: 'move',
  findProphylaxis: 'resource',
  findPinBreaks: 'resource',
  findEnablingMove: 'move',
  newTiedDefender: 'move',
  obligationLifted: 'move',
  openingStoryAt: 'theory',
  openingSlip: 'theory',
  countWarning: 'try',
  oppositeWingsRace: 'plan',
  countMethod: 'habit',
  buildPriorityFirst: 'plan',
  lastTimeHere: 'habit',
  findQueenGrabTraps: 'threat',
  trappedOnBoard: 'weakness',
  provenThreatLine: 'threat',
  studentMoveStructure: 'move',
  theirMoveStructure: 'move',
  boardStructure: 'board',
  linesStructure: 'try',
  planThreadTurn: 'plan',
  geometryReads: 'line',
  recaptureChoice: 'try',
  mateLine: 'line',
  lineWins: 'line',
  kneeJerk: 'move',
  strongChoice: 'plan',
  fileClaimed: 'asset',
  blunderCheck: 'habit',
  autopilotGuard: 'try',
  keepPressing: 'habit',
  spareTempoWasted: 'plan',
  pawnEndingTrade: 'plan',
  outsidePasserDecoy: 'plan',
  kingCourse: 'plan',
  tradeJudgement: 'move',
  readTiming: 'move',
  kingAttack: 'weakness',
  ruleException: 'move',
  falseAlarm: 'resource',
  pushOrHold: 'standing',
  theirMoveCost: 'move',
  counterThreat: 'threat',
  playedConcept: 'move',
  tempoCount: 'move',
  stalemateWatch: 'resource',
  checkMethod: 'resource',
  planChoice: 'try',
  criticalMomentFound: 'standing',
  readZugzwang: 'standing',
  tradeLedger: 'move',
  notYetPlayed: 'move',
  heldResource: 'resource',
  captureChoice: 'try',
  kickAfterRecapture: 'move',
  pawnSquareTaken: 'move',
  patternFails: 'try',
  openingEquivalence: 'theory',
  statusBandChange: 'standing',
  buildDeliberation: 'try',
  detectTradeCreatesPin: 'threat',
  detectLatentDanger: 'weakness',
  pawnHit: 'threat',
  detectLatentFork: 'weakness',
  detectSetUpChance: 'threat',
  detectKingExposure: 'weakness',
  computeMustDefend: 'threat',
  detectBluff: 'resource',
  refutedFromFan: 'try',
  decisiveReason: 'move',
  principleLine: 'move',
  principleContrastLine: 'move',
  threatStoppedBy: 'resource',
  trickSidestepped: 'resource',
  phaseVerdictLine: 'standing',
  detectCentralKingDanger: 'weakness',
  readConversion: 'standing',
  computeImportance: 'standing',
  conceptForBoard: 'board',
  pinPressureConcept: 'board',
  guardRemovalConcept: 'board',
  readCriticalMoment: 'standing',
  buildOpponentIntent: 'plan',
  computeLeansOn: 'asset',
  strategicReason: 'move',
  structurePlanFact: 'plan',
  liveMethodBeat: 'habit',
  readTrade: 'move',
  findTradeTarget: 'plan',
  boardPlanFacts: 'plan',
  readPosition: 'board',
  depthClauses: 'line',
  exchangeIdeas: 'plan',
  plyFactsForMove: 'move',
  settledExchange: 'move',
  describeMoveInfluence: 'move',
  computeBoardDelta: 'move',
  correctionAgainstHeard: 'line',
  errorWhy: 'line',
  gambitIdea: 'move',
  moveThreat: 'threat',
  allowedClause: 'line',
  tacticInvariant: 'board',
  renderFundamentalVerdict: 'habit',
  computeMoveFacets: 'story',
  detectTactics: 'threat',
  detectNewThreat: 'threat',
  assessPositionalEdge: 'standing',
  describeStructure: 'board',
  enemyKingStuckInCenter: 'weakness',
  findTrappedPiece: 'weakness',
  attackerDefenderCount: 'weakness',
  royalDefenderTarget: 'weakness',
  rookOnSeventh: 'asset',
  badEnemyBishop: 'weakness',
  pieceWish: 'weakness',
  passedPawnPush: 'asset',
  findMinorityAttack: 'plan',
  findColorComplexWeakness: 'weakness',
  planRaceClause: 'plan',
  sacrificeCompensation: 'move',
  explainMatingSacMechanism: 'move',
  describeSacBreaksKingShield: 'move',
  contrastMoves: 'try',
  kingReadsForBestLine: 'weakness',
  studentMovePoint: 'move',
  intentWithFallback: 'move',
  moveIntent: 'move',
  opponentHabits: 'habit',
  habitsOf: 'habit',
  readTheirMove: 'move',
  playItAnyway: 'resource',
  knownAttack: 'threat',
  detectForcedMatingSequence: 'threat',
  buildMiddlegameOrientation: 'standing',
  mastersPlanLine: 'plan',
  buildOpponentMoveTeaching: 'move',
  buildOpponentDevelopmentRead: 'move',
  nameEndgamePhase: 'standing',
  openingAnnouncementForGame: 'theory',
  whatItAsks: 'threat',
  moveThoughtFacts: 'move',
  theirOpeningVerdict: 'move',
  whyItEnded: 'story',
  idlePiece: 'weakness',
  quietDecider: 'story',
  exploreInvite: 'story',
  murkyRead: 'standing',
  gameArcSteps: 'story',
  renderThesis: 'story',
  speakDeepestLookahead: 'line',
  structureNamingLine: 'board',
  pieceQualityLines: 'asset',
  opponentGapClause: 'threat',
  buildRejectedTempting: 'try',
  characterTurn: 'standing',
  buildCausalChain: 'line',
  threatAnswer: 'resource',
  payoffFor: 'plan',
  openingBreak: 'resource',
  backwardLook: 'line',
  mistakeTurnLine: 'habit',
  learnFundamentalVerdict: 'habit',
  studentMovePointFact: 'move',
  moveOrder: 'move',
  learnMoveReason: 'move',
  kingPawnUnderFire: 'weakness',
  cheaperAttackerHit: 'threat',
  gambitPoint: 'move',
  detectImmediateTactics: 'threat',
  detectHangingPieces: 'weakness',
  scanUpcomingTactics: 'threat',
  prizeTeaching: 'threat',
  temptingTurnClause: 'try',
  uncertaintyClause: 'standing',
  candidateCompareRead: 'try',
  stepArc: 'plan',
  heldFoundText: 'habit',
  slipAnswerText: 'habit',
  buildPlayCommentary: 'move',
  detectBehaviors: 'asset',
  buildPositionalRead: 'board',
  castleByHandMove: 'resource',
  kingFromCentre: 'plan',
  keptHome: 'plan',
  kingSquares: 'resource',
  knownSlip: 'try',
  ifTheyPlay: 'try',
  baitBranch: 'try',
  temptingRefuted: 'try',
  temptingOnBoard: 'try',
  alsoGood: 'try',
  squareChoice: 'try',
  oppositeBishops: 'standing',
  planOfTheBoard: 'plan',
  planSteps: 'plan',
  evalReading: 'standing',
  compensation: 'standing',
  emptyCheckAt: 'try',
  harmlessPin: 'try',
  queenNet: 'threat',
  flexibleMove: 'try',
  intoTheirCamp: 'asset',
  oppositionTaken: 'move',
  zugzwangMade: 'standing',
  theoreticalEndingMade: 'standing',
  raceCountMade: 'plan',
  promotionPlayed: 'move',
  defenderTradeMade: 'move',
  keyDefenderPlan: 'plan',
  practicalChance: 'resource',
  fortress: 'standing',
  pawnMajority: 'asset',
  exchangeSacrifice: 'move',
  stalemateTrick: 'resource',
  bothSaved: 'resource',
  perpetualCheck: 'resource',
  windmill: 'threat',
  breakPrep: 'resource',
  breakStopped: 'resource',
  pressureOf: 'plan',
  kingSiege: 'weakness',
  backRankWeakness: 'weakness',
  loadedDiscovery: 'threat',
  deepCombination: 'move',
  kingSacrifice: 'move',
  minorMatchup: 'asset',
  desperadoAt: 'resource',
  pawnCutsGuard: 'move',
  chainBase: 'move',
  pinnedPawnGuard: 'threat',
  castlingTakenAway: 'move',
  castlingWing: 'move',
  blockade: 'asset',
  queenChased: 'move',
  pieceMovedAgain: 'move',
  tradeOfferAt: 'plan',
  fileTradeAt: 'plan',
  pawnEndingTradeAt: 'plan',
  tradeKeptAt: 'plan',
  pawnBreak: 'resource',
  queenHunt: 'threat',
  secondAttacker: 'plan',
  outOfReach: 'asset',
  poisonedPiece: 'threat',
  everyMate: 'move',
  pawnCentre: 'asset',
  centreDuo: 'asset',
  harmlessWeakPawns: 'standing',
  noSafeChecks: 'threat',
  kingRace: 'plan',
  kingBoxMove: 'plan',
  promotionWithCheck: 'plan',
  inaccessibleHole: 'weakness',
  wingWithoutPieces: 'move',
  tensionKept: 'move',
  tensionReleased: 'move',
  urgentStrike: 'plan',
  misplacedQueen: 'weakness',
  theirWorstPiece: 'weakness',
  kingInOpen: 'weakness',
  kingActivityGap: 'standing',
  zugzwangIfPassed: 'standing',
  leverPasser: 'plan',
  coordinationGap: 'standing',
  endgameVerdict: 'standing',
  defenderInTime: 'resource',
  tactify: 'try',
  seventhRankMate: 'asset',
  secondFront: 'plan',
  lateralRookDefence: 'resource',
  squareForPiece: 'plan',
  tradeRelievesCramp: 'plan',
  queenKnightNet: 'threat',
  selfBlock: 'plan',
  mateThreatLever: 'threat',
  queenlessMate: 'threat',
  matingNet: 'threat',
  frozenTarget: 'weakness',
  pieceTempo: 'plan',
  keySquaresOn: 'asset',
  shoulderOn: 'asset',
  connectedPassersOn: 'threat',
};

/** One thing on the board a fact is about: a piece where it stands on the
 *  fact's own board ("wN@f3"), or an empty square ("-@d5"). */
export type PictureObject = string;

function objectsOf(f: CoachFact): PictureObject[] {
  let board: Chess;
  try { board = new Chess(f.fen); } catch { return []; }
  const out: PictureObject[] = [];
  for (const sq of f.squares) {
    let p: ReturnType<Chess['get']>;
    try { p = board.get(sq as Square); } catch { continue; }
    out.push(p ? `${p.color}${p.type.toUpperCase()}@${sq}` : `-@${sq}`);
  }
  return out;
}

/** WHY one fact belongs with another — each is computed, never a guess:
 *  - `claim`: the two computers declared one claim key between them — the
 *    SAME idea, so one is a duplicate of the other, never its detail;
 *  - `object`: both are about the same piece standing on the same square of
 *    the same board.
 *  A piece of one merely touching a piece of the other is NOT a link: on a
 *  busy board every piece touches something, and a detail stapled to the
 *  wrong claim is worse than none. */
export type PictureLinkKind = 'claim' | 'object';

export interface PictureLink {
  from: string;
  to: string;
  kind: PictureLinkKind;
}

export interface PictureEntry {
  fact: CoachFact;
  role: PictureRole;
  objects: PictureObject[];
}

export interface PositionPicture {
  /** Every fact handed in, none dropped, by id. */
  entries: Map<string, PictureEntry>;
  /** The facts about each object. */
  byObject: Map<PictureObject, string[]>;
  /** Every computed link between two facts, both directions listed once. */
  links: PictureLink[];
}

/** The link between two facts, or null when nothing computed ties them. */
export function linkBetween(a: PictureEntry, b: PictureEntry): PictureLinkKind | null {
  if (a.fact.claims.some((c) => b.fact.claims.includes(c))) return 'claim';
  const sameBoard = a.fact.fen.split(' ')[0] === b.fact.fen.split(' ')[0];
  if (sameBoard) {
    const shared = a.objects.filter((o) => !o.startsWith('-@') && b.objects.includes(o));
    if (shared.length > 0) return 'object';
  }
  return null;
}

export function buildPicture(facts: readonly CoachFact[]): PositionPicture {
  const entries = new Map<string, PictureEntry>();
  const byObject = new Map<PictureObject, string[]>();
  for (const f of facts) {
    const e: PictureEntry = { fact: f, role: PICTURE_ROLE[f.computer], objects: objectsOf(f) };
    entries.set(f.id, e);
    for (const o of e.objects) {
      const list = byObject.get(o) ?? [];
      list.push(f.id);
      byObject.set(o, list);
    }
  }
  const links: PictureLink[] = [];
  const all = [...entries.values()];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const k = linkBetween(all[i], all[j]);
      if (k) links.push({ from: all[i].fact.id, to: all[j].fact.id, kind: k });
    }
  }
  return { entries, byObject, links };
}

/** A DETAIL of `of`: a different fact about the same piece on the same board.
 *  A shared claim key is the same idea said twice, so it never counts here. */
export function isDetailOf(pic: PositionPicture, of: string, detail: string): boolean {
  const a = pic.entries.get(of);
  const b = pic.entries.get(detail);
  return !!a && !!b && linkBetween(a, b) === 'object';
}

/** The facts in the picture linked to `id`, with how. */
export function linkedTo(pic: PositionPicture, id: string): Array<{ entry: PictureEntry; kind: PictureLinkKind }> {
  const out: Array<{ entry: PictureEntry; kind: PictureLinkKind }> = [];
  for (const l of pic.links) {
    const other = l.from === id ? l.to : l.to === id ? l.from : null;
    if (!other) continue;
    const e = pic.entries.get(other);
    if (e) out.push({ entry: e, kind: l.kind });
  }
  return out;
}
