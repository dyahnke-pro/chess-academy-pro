/**
 * ONE STANDARD BUNDLE EVERY COMPUTER READS (WO-PICTURE-01 P2/P3 infrastructure,
 * David 2026-11-19: "We pull all information from many computers but they are
 * only read as single sources of information").
 *
 * Each computer takes its own hand-made context, so nothing could ask EVERY
 * computer about a board — the picture, the refuter's "why does the result
 * change", the board at the end of a try. This table builds each computer's
 * context from one bundle: the board, the student, the engine's lines on it,
 * and the move that reached it. A computer whose context the bundle cannot
 * fill says which fields it needs (`needs`), never silently dropped; a new
 * computer fails to compile here until it answers (a `Record` over every id).
 *
 * Pure. Generated from `BoardContexts`, then held by the compiler.
 */
import { Chess, type Color } from 'chess.js';
import { readBoardAll, type BoardContexts, type ComputerId } from './boardComputers';
import type { CoachFact } from './coachFact';
import type { EngineLine } from './engineLineRead';
import type { AnalysisLine } from '../types';

export interface BoardBundle {
  /** The board read. */
  fen: string;
  /** Whose seat the words are for. */
  student: Color;
  /** The engine's lines from `fen`, best first, White's seat. */
  lines: readonly EngineLine[];
  rating: number;
  /** The game's moves to `fen`, SAN. */
  history: readonly string[];
  /** The move that reached `fen`, when there is one. */
  priorMove: { fenBefore: string; san: string } | null;
  /** Whose move that was. */
  priorMoveSeat: Color | null;
  /** The engine's lines from `priorMove.fenBefore`, best first, White's seat:
   *  what the mover could have played instead. */
  priorLines: readonly EngineLine[] | null;
}

type Adapter<K extends ComputerId> = ((b: BoardBundle) => BoardContexts[K] | null) | { needs: readonly string[] };

function studentCp(b: BoardBundle): number | null {
  const l = b.lines[0];
  if (!l || l.mate !== null || l.cp === null) return null;
  return b.student === 'w' ? l.cp : -l.cp;
}
function analysisOf(b: BoardBundle): AnalysisLine[] {
  return b.lines.map((l, i) => ({ rank: i + 1, evaluation: l.mate !== null ? (l.mate > 0 ? 100000 : -100000) : (l.cp ?? 0), mate: l.mate, moves: [...l.moves], depth: 0 })) as AnalysisLine[];
}
function replySan(b: BoardBundle): string | null {
  const u = b.lines[0]?.moves[0];
  if (!u) return null;
  try { return new Chess(b.fen).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return null; }
}
function moveOf(b: BoardBundle): { fenBefore: string; san: string; mover: Color } | null {
  if (!b.priorMove) return null;
  const mover: Color = b.priorMove.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w';
  return { ...b.priorMove, mover };
}

function lineCp(l: EngineLine | undefined): number | null {
  if (!l) return null;
  if (l.mate !== null) return l.mate > 0 ? 100000 : -100000;
  return l.cp;
}
/** The engine's best move for the mover, from `fenBefore`. */
function priorBest(b: BoardBundle): string | null {
  const u = b.priorLines?.[0]?.moves[0];
  if (!u || !b.priorMove) return null;
  try { return new Chess(b.priorMove.fenBefore).move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san; } catch { return null; }
}
/** What the move cost its mover: the best line before, against the board after. */
function cpLossOf(b: BoardBundle): number | null {
  const MOVE = moveOf(b);
  const before = lineCp(b.priorLines?.[0]);
  const after = lineCp(b.lines[0]);
  if (!MOVE || before === null || after === null) return null;
  const sign = MOVE.mover === 'w' ? 1 : -1;
  return Math.max(0, Math.min(2000, (before - after) * sign));
}

/** Every computer, by id: how to build its context from the bundle, or what it needs. */
export const BUNDLE_ADAPTERS: { [K in ComputerId]: Adapter<K> } = {
  pinBreakOwn: (b) => ({ fen: b.fen, student: b.student }),
  pinBreakTheirs: { needs: ["pinned"] },
  prophylaxis: (b) => ({ fen: b.fen, engineFirstMoves: b.lines.map((l) => l.moves[0]).filter((m): m is string => !!m) }),
  prophylaxisMissed: { needs: ["prevFen", "studentSan"] },
  enablingMove: (b) => ({ fen: b.fen, pv: b.lines[0]?.moves ?? [] }),
  tradeLedger: (b) => ({ history: b.history, student: b.student }),
  notYetPlayed: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss } : null; },
  heldResource: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss, student: b.student } : null; },
  captureChoice: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss, student: b.student } : null; },
  kickAfterRecapture: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), bestUci: b.lines[0]?.moves ?? [], student: b.student } : null; },
  pawnSquareTaken: { needs: ["cpLoss"] },
  kingReadsBestLine: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, student: b.student, bestUci: b.lines[0]?.moves ?? [] } : null; },
  sacCompensation: { needs: ["moverCp", "moverCpBefore"] },
  sacMechanism: { needs: ["sans", "sacIdx"] },
  sacKingShield: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  structureState: (b) => ({ fen: b.fen }),
  phaseVerdict: { needs: ["phase", "heard", "lastMove"] },
  middlegameOrientation: { needs: ["seat", "san"] },
  opponentDevelopment: { needs: ["oppSans"] },
  studentMovePoint: { needs: ["prevCap"] },
  positionalVerdict: { needs: ["quietBareBalanced"] },
  plyFacts: { needs: ["prevCap", "moverIsStudent"] },
  boardDelta: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, fenAfter: b.fen, student: b.student } : null; },
  fundamentalVerdict: { needs: ["attrs", "ply", "seen"] },
  tacticRule: { needs: ["type"] },
  moveInfluence: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, fenAfter: b.fen, san: MOVE.san, student: b.student } : null; },
  heardCorrection: { needs: ["heard", "classification"] },
  opponentMoveTeaching: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  boardTactics: { needs: ["motifSaid", "skipMateAgainst"] },
  tiedDefender: { needs: ["fenAfterMove", "fenAfterReply"] },
  obligationLifted: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, fenAfter: b.fen, student: b.student } : null; },
  queenGrabTrap: (b) => ({ fen: b.fen }),
  bookMove: { needs: ["plain"] },
  openingTheory: { needs: ["student"] },
  moveGains: { needs: ["student"] },
  opensCheck: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, line: b.lines[0]?.moves ?? null, student: b.student, tense: 'now' } : null; },
  captureOrder: { needs: ["reads"] },
  knightSquareTaken: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  slipsOnLine: (b) => ({ history: b.history, student: b.student }),
  lastTimeHere: { needs: ["rows", "currentGameId"] },
  trapped: (b) => ({ fen: b.fen, student: b.student }),
  countMethod: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, playedSan: MOVE.san, student: b.student, costCp: null } : null; },
  priorityFirst: { needs: ["bestUci"] },
  threatCost: { needs: ["line", "squares"] },
  threatAnswer: { needs: ["squares", "shape", "whiteCp", "ply", "namesMove"] },
  planThread: { needs: ["thread", "ply", "holdPlayable", "studentBestUci"] },
  structureMove: { needs: ["cpLoss", "bestSan", "namesBetterMove"] },
  structureTheirMove: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  statusBand: { needs: ["prevStudentCp"] },
  latentDanger: (b) => ({ fen: b.fen, student: b.student }),
  tradeDanger: (b) => ({ fen: b.fen, student: b.student }),
  latentFork: (b) => ({ fen: b.fen, student: b.student }),
  centralKingDanger: (b) => ({ fen: b.fen, student: b.student, namesMoves: true }),
  conversion: (b) => ({ fen: b.fen, student: b.student }),
  opponentIntent: (b) => ({ fen: b.fen, topLines: analysisOf(b) }),
  criticalMoment: { needs: ["ply", "anchor", "critical"] },
  leansOn: { needs: ["read", "seat"] },
  strategicPlan: (b) => { const best = replySan(b); return best && b.fen.split(' ')[1] === b.student ? { fen: b.fen, bestSan: best, student: b.student } : null; },
  structurePlan: { needs: ["heard", "said"] },
  tradeTarget: (b) => ({ fen: b.fen, student: b.student, bestLine: b.lines[0]?.moves ?? null }),
  tradeRead: { needs: ["priorMove"] },
  refutedAlt: { needs: ["popular", "fan"] },
  trapChance: (b) => ({ fen: b.fen, student: b.student, line: b.lines[0]?.moves ?? null, priorMove: b.priorMove }),
  setUpChance: { needs: ["read"] },
  mustDefend: { needs: ["read", "looseSpells"] },
  liveMethod: { needs: ["signals", "ply", "said"] },
  boardPlans: { needs: ["withTrump"] },
  boardConcept: { needs: ["analysis"] },
  pinPressure: (b) => ({ fen: b.fen, student: b.student }),
  guardRemoval: (b) => ({ fen: b.fen, student: b.student }),
  deliberation: { needs: ["read", "said", "saysBestLine", "prev", "deep"] },
  structureBoard: (b) => ({ fen: b.fen, student: b.student }),
  structureLines: { needs: ["lines"] },
  openingStory: { needs: ["theory"] },
  castleByHand: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingFromCentre: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  keptHome: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSquares: { needs: ["lines"] },
  ifTheyPlay: { needs: ["replies", "seconds", "played", "tense", "liveBoard", "madeBy"] },
  temptingRefuted: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, rating: b.rating, reads: null, priorMove: b.priorMove } : null; },
  temptingNow: (b) => ({ fen: b.fen, student: b.student, rating: b.rating, reads: null, priorMove: b.priorMove }),
  alsoGood: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, rating: b.rating, reads: null } : null; },
  squareChoice: { needs: ["beaten"] },
  pawnBreak: { needs: ["lastTo"] },
  oppositeBishops: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  planSteps: { needs: ["played"] },
  planOfTheBoard: { needs: ["lines"] },
  compensation: (b) => ({ fenAfter: b.fen, student: b.student, studentCp: studentCp(b) ?? 0, line: b.lines[0]?.moves ?? [] }),
  harmlessPin: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? [] } : null; },
  queenNet: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  bothSaved: { needs: ["replies"] },
  stalemateTrick: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  perpetualCheck: { needs: ["replies"] },
  windmill: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  minorMatchup: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSiege: { needs: ["replies"] },
  backRankWeakness: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  loadedDiscovery: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  kingSacrifice: { needs: ["replies", "seconds"] },
  deepCombination: { needs: ["replies", "seconds"] },
  intoTheirCamp: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  targetPressure: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lineAfter: b.lines[0]?.moves ?? [], costCp: null } : null; },
  breakPrep: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, lineAfter: b.lines[0]?.moves ?? [], costCp: null } : null; },
  breakStopped: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  flexibleMove: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, reads: null } : null; },
  exchangeSacrifice: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, reads: null } : null; },
  pawnMajority: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, prior: b.priorMove } : null; },
  fortress: { needs: ["replies"] },
  pieceItinerary: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, history: b.history } : null; },
  forcedRun: { needs: ["evalsAfter"] },
  threatPurpose: { needs: ["line"] },
  temptingCapture: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? null } : null; },
  count: (b) => ({ fen: b.fen, student: b.student }),
  royal: (b) => ({ fen: b.fen, student: b.student }),
  rook7: (b) => ({ fen: b.fen, student: b.student }),
  badBishop: (b) => ({ fen: b.fen, student: b.student }),
  whyItEnded: { needs: ["plies"] },
  idlePiece: { needs: ["plies"] },
  quietDecider: { needs: ["plies"] },
  exploreInvite: { needs: ["plies", "index"] },
  murkyRead: { needs: ["plies", "index"] },
  pawnEndingCount: { needs: ["cpLoss", "evalAfterCp"] },
  spareTempo: (b) => { const MOVE = moveOf(b); const loss = cpLossOf(b); return MOVE && loss !== null ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), cpLoss: loss } : null; },
  passerDecoy: (b) => ({ fen: b.fen, student: b.student }),
  zugzwangAt: { needs: ["read"] },
  mateLineAt: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, lineUci: b.lines[0]?.moves ?? [], student: b.student, san: MOVE.san } : null; },
  lineWinsAt: { needs: ["seconds"] },
  attackAsks: { needs: ["target"] },
  theirOpeningChoice: { needs: ["cpLoss", "coachChose"] },
  openingNamed: { needs: ["det", "spokenName", "transposed"] },
  sacPayoff: { needs: ["moverPovEvalCp", "moverPovBeforeCp", "kingCentreTaught"] },
  sacShield: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  takeStock: { needs: ["studentPovCp"] },
  kingHuntCue: (b) => ({ fen: b.fen, student: b.student }),
  opponentTarget: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  causalChain: { needs: ["sans", "ply"] },
  endgamePhase: (b) => ({ fen: b.fen, student: b.student }),
  recapture: { needs: ["theirLast", "faultCp"] },
  mateLine: (b) => { const MOVE = moveOf(b); return MOVE && b.priorLines ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: priorBest(b), lineUci: b.priorLines[0]?.moves ?? [], reply: replySan(b) } : null; },
  winsLine: { needs: ["bestSan", "seconds"] },
  kneeJerk: { needs: ["theirLast", "bestSan", "faultCp"] },
  strongChoice: { needs: ["ply"] },
  fileClaimed: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, cpLoss: null } : null; },
  blunderCheck: { needs: ["faultCp", "again", "ply"] },
  autopilot: { needs: ["faultCp", "popularTopSan"] },
  pawnEndingCounted: { needs: ["faultCp"] },
  outsidePasserDecoy: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san } : null; },
  keepPressing: { needs: ["bestSan", "faultCp"] },
  tradeDeal: { needs: ["faultCp", "values", "prior", "ply"] },
  kingAttack: { needs: ["linesAfter"] },
  ruleException: { needs: ["bothCp"] },
  falseAlarm: { needs: ["theirFenBefore", "studentSan", "bestLine"] },
  pushOrHold: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, cpAfter: studentCp(b) } : null; },
  counterThreat: { needs: ["studentMoveCostCp"] },
  playedConcept: { needs: ["define"] },
  tempoCount: (b) => ({ history: b.history, student: b.student }),
  stalemateWatch: (b) => ({ fen: b.fen, student: b.student }),
  checkMethod: (b) => ({ fen: b.fen, student: b.student, bestUci: b.lines[0]?.moves[0] ?? null }),
  planChoice: { needs: ["lines", "lastMove"] },
  zugzwang: { needs: ["read"] },
  kingCourse: (b) => ({ fen: b.fen, student: b.student }),
  foundMove: { needs: ["preLines", "prevCapture"] },
  theirDeepFact: { needs: ["theirSan", "lineAfter", "student"] },
  studentDeepFact: { needs: ["lineAfterReply"] },
  binding: { needs: ["plainSeen", "ply", "plainSeen", "point"] },
  boardTeacherOwn: { needs: ["spokenIdeas", "phrases"] },
  boardTeacherTheirs: { needs: ["spokenIdeas", "phrases"] },
  prize: { needs: ["square", "stem"] },
  gambitPoint: { needs: ["fenAfterMove", "fenAfterReply", "to"] },
  structureNaming: { needs: ["openingName"] },
  quietMovePoint: { needs: ["prevCapture"] },
  slipAnswer: { needs: ["prevCapture", "answerSan", "lineUci", "register"] },
  countWarning: (b) => ({ fen: b.fen, student: b.student }),
  wingsRace: (b) => ({ fen: b.fen, student: b.student }),
  kingInCentre: (b) => ({ fen: b.fen, student: b.student }),
  notYet: { needs: ["bestSan", "student"] },
  obviousStop: { needs: ["lines"] },
  keyDefenderNow: { needs: ["line"] },
  positionRead: (b) => ({ fen: b.fen, student: b.student }),
  kingExposure: { needs: ["side", "owner"] },
  shelterCracked: (b) => ({ fen: b.fen, student: b.student }),
  trappedPiece: (b) => ({ fen: b.fen, student: b.student, lineUci: b.lines[0]?.moves ?? [] }),
  worstPiece: { needs: ["movedTo"] },
  passerPush: { needs: ["pushed"] },
  minority: (b) => ({ fen: b.fen, student: b.student }),
  colourComplex: (b) => ({ fen: b.fen, student: b.student }),
  raceOfPlans: (b) => ({ fen: b.fen, student: b.student }),
  theirCost: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  threatStopped: { needs: ["studentFenBefore", "studentFenAfter", "reply"] },
  playItAnyway: { needs: ["studentFenBefore", "studentFenAfter", "reply", "lines"] },
  trickSidestepped: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  theirHabit: { needs: ["sound"] },
  yourHabit: { needs: ["sound"] },
  knownAttack: (b) => ({ fen: b.fen, student: b.student, studentCp: studentCp(b) }),
  timing: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, history: b.history, student: b.student } : null; },
  bluff: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), student: b.student } : null; },
  contrast: (b) => { const MOVE = moveOf(b); const best = priorBest(b); return MOVE && best ? { fenBefore: MOVE.fenBefore, san: MOVE.san, bestSan: best, student: b.student } : null; },
  newThreat: { needs: ["answerSan"] },
  moveAspect: { needs: ["words", "prev", "follow", "phrases"] },
  moveThreatDeep: { needs: ["words", "reads"] },
  moveAllows: { needs: ["words", "costCp", "after", "against"] },
  moveJobRead: { needs: ["words", "follow", "phrases"] },
  moveFundamentals: { needs: ["words", "follow"] },
  theirAim: { needs: ["words", "plainSeen"] },
  outFirst: { needs: ["words"] },
  orderFirst: { needs: ["words"] },
  desperadoMove: { needs: ["words"] },
  emptyCheckMove: { needs: ["words", "replyUci"] },
  transposition: { needs: ["words"] },
  mastersBreak: { needs: ["words"] },
  structureFormed: { needs: ["words"] },
  moveCut: { needs: ["words"] },
  moveCage: { needs: ["words"] },
  moveStopsBreak: { needs: ["words"] },
  moveRoute: { needs: ["words", "skipFrom"] },
  followUpFirst: { needs: ["words", "followFirst"] },
  takesAway: { needs: ["words"] },
  gambitOffer: { needs: ["words", "after"] },
  standingRead: { needs: ["words", "before", "after", "lines"] },
  movePurpose: { needs: ["words", "reads", "ruleBoard"] },
  onlyMoveRead: { needs: ["words"] },
  principle: { needs: ["taught", "stemKey"] },
  principleContrast: { needs: ["bestSan", "taught", "stemKey"] },
  oppositionRead: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, afterCp: studentCp(b) } : null; },
  zugzwangRead: { needs: ["after", "passAfter"] },
  theoreticalEnding: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, afterCp: studentCp(b) } : null; },
  raceCount: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  promotionChoice: { needs: ["before"] },
  keyDefender: { needs: ["after"] },
  practicalChance: { needs: ["reads"] },
  pawnCutsGuard: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  chainBase: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pinnedPawnGuard: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  castlingTaken: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  castlingWing: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pieceMovedAgain: (b) => { const MOVE = moveOf(b); return MOVE ? { history: b.history, fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null } : null; },
  queenChased: (b) => { const MOVE = moveOf(b); return MOVE ? { history: b.history, fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  blockade: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  tradeOffer: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null, afterCp: studentCp(b) } : null; },
  fileTrade: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, costCp: null, line: b.lines[0]?.moves ?? null } : null; },
  pawnEndingTrade: { needs: ["after"] },
  queenHunt: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, line: b.lines[0]?.moves ?? null } : null; },
  secondAttacker: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  outOfReach: { needs: ["altUcis"] },
  poisonedPiece: { needs: ["fan"] },
  everyMate: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  pawnCentre: (b) => ({ fen: b.fen, student: b.student }),
  centreDuo: (b) => ({ fen: b.fen, student: b.student }),
  harmlessWeakPawns: { needs: ["best"] },
  noSafeChecks: (b) => ({ fen: b.fen, student: b.student }),
  kingRace: (b) => ({ fen: b.fen, student: b.student }),
  kingBox: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student, namesPlayedMove: true } : null; },
  promotionWithCheck: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, reply: replySan(b), student: b.student, namesPlayedMove: true } : null; },
  inaccessibleHole: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  wingWithoutPieces: (b) => { const MOVE = moveOf(b); return MOVE ? { fenBefore: MOVE.fenBefore, san: MOVE.san, student: b.student } : null; },
  urgentStrike: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  misplacedQueen: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  theirWorstPiece: (b) => ({ fen: b.fen, student: b.student, bestLine: b.lines[0]?.moves ?? null }),
  kingInOpen: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  kingActivityGap: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  kingSiegeNow: (b) => ({ fen: b.fen, student: b.student, studentCp: studentCp(b) }),
  zugzwangIfPassed: (b) => ({ fen: b.fen, student: b.student }),
  leverPasser: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  coordinationGap: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  endgameVerdict: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  defenderInTime: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  tactify: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  seventhRankMate: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  pieceTempo: (b) => ({ fen: b.fen, lines: b.lines.length ? b.lines : null, student: b.student }),
  tensionKept: { needs: ["lines"] },
  secondFront: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  lateralRookDefence: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  squareForPiece: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  tradeRelievesCramp: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  queenKnightNet: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  selfBlock: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  mateThreatLever: (b) => ({ fen: b.fen, lines: b.lines, student: b.student }),
  queenlessMate: (b) => ({ fen: b.fen, student: b.student }),
  keySquareRead: (b) => ({ fen: b.fen, student: b.student }),
  shoulderRead: (b) => ({ fen: b.fen, student: b.student }),
  connectedPassers: (b) => ({ fen: b.fen, student: b.student }),
  tensionReleased: { needs: ["lines", "playedCp"] },
  exchangeIdeas: { needs: ["its own context type (named, not an object literal)"] },
  tradeJudged: { needs: ["its own context type (named, not an object literal)"] },
  tradeSettled: { needs: ["its own context type (named, not an object literal)"] },
  tacticGeometry: { needs: ["its own context type (named, not an object literal)"] },
  knownSlip: { needs: ["its own context type (named, not an object literal)"] },
  trapAhead: { needs: ["its own context type (named, not an object literal)"] },
  baitSet: { needs: ["its own context type (named, not an object literal)"] },
  theirRead: { needs: ["its own context type (named, not an object literal)"] },
  theirPreventTest: { needs: ["its own context type (named, not an object literal)"] },
  theirTrigger: { needs: ["its own context type (named, not an object literal)"] },
  tradeKept: { needs: ["its own context type (named, not an object literal)"] },
};

/** Every computer the bundle can fill, read on it. A computer that throws is
 *  skipped (its own `safe` already guards it). */
export function readEveryComputer(b: BoardBundle): CoachFact[] {
  const out: CoachFact[] = [];
  for (const id of Object.keys(BUNDLE_ADAPTERS) as ComputerId[]) {
    const a = BUNDLE_ADAPTERS[id] as Adapter<typeof id>;
    if (typeof a !== 'function') continue;
    let ctx: BoardContexts[typeof id] | null = null;
    try { ctx = a(b); } catch { ctx = null; }
    if (!ctx) continue;
    try { out.push(...(readBoardAll(id, ctx) as CoachFact[])); } catch { /* a computer that cannot read this board says nothing */ }
  }
  return out;
}
