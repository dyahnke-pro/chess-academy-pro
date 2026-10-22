import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { detectTacticLine } from './missedTacticService';
import { bestLineOf, gameLineFrom } from './annotationLine';
import { MOTIFS, MOTIF_OF_TACTIC, tacticTypesOf } from '../data/tacticMotifs';
import { useAppStore } from '../stores/appStore';
import { TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';
import type { ClassifiedTactic, TacticType, GameRecord } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_CP_LOSS = 80;

// ─── Tactic Labels ──────────────────────────────────────────────────────────

export const TACTIC_LABELS: Record<TacticType, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discovered_attack: 'Discovered Attack',
  discovered_check: 'Discovered Check',
  back_rank: 'Back Rank',
  hanging_piece: 'Hanging Piece',
  promotion: 'Promotion',
  deflection: 'Deflection',
  overloaded_piece: 'Overloaded Piece',
  trapped_piece: 'Trapped Piece',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  x_ray: 'X-Ray',
  double_check: 'Double Check',
  removing_the_guard: 'Removing the Guard',
  checkmate: 'Checkmate',
  tactical_sequence: 'Combination',
};

// ─── Lichess Theme Mapping ──────────────────────────────────────────────────

/** Maps Lichess puzzle theme strings to our TacticType enum. */
const LICHESS_THEME_TO_TACTIC: Partial<Record<string, TacticType>> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered_attack',
  backRankMate: 'back_rank',
  hangingPiece: 'hanging_piece',
  promotion: 'promotion',
  deflection: 'deflection',
  overloadedPiece: 'overloaded_piece',
  trappedPiece: 'trapped_piece',
  clearance: 'clearance',
  interference: 'interference',
  zwischenzug: 'zwischenzug',
  xRayAttack: 'x_ray',
  doubleCheck: 'double_check',
  attraction: 'deflection',
  capturingDefender: 'removing_the_guard',
  discoveredCheck: 'discovered_check',
  intermezzo: 'zwischenzug',
  sacrifice: 'tactical_sequence',
};

/** Human-friendly labels for common Lichess themes not in TacticType. */
const LICHESS_THEME_LABELS: Record<string, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discoveredAttack: 'Discovered Attack',
  discoveredCheck: 'Discovered Check',
  backRankMate: 'Back Rank Mate',
  hangingPiece: 'Hanging Piece',
  promotion: 'Promotion',
  underPromotion: 'Under-Promotion',
  deflection: 'Deflection',
  overloadedPiece: 'Overloaded Piece',
  trappedPiece: 'Trapped Piece',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  intermezzo: 'Intermezzo',
  xRayAttack: 'X-Ray Attack',
  doubleCheck: 'Double Check',
  attraction: 'Attraction',
  capturingDefender: 'Removing the Defender',
  sacrifice: 'Sacrifice',
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  mateIn4: 'Mate in 4',
  mateIn5: 'Mate in 5',
  smotheredMate: 'Smothered Mate',
  hookMate: 'Hook Mate',
  arabianMate: 'Arabian Mate',
  anastasiaMate: 'Anastasia Mate',
  exposedKing: 'Exposed King',
  kingsideAttack: 'Kingside Attack',
  queensideAttack: 'Queenside Attack',
  quietMove: 'Quiet Move',
  defensiveMove: 'Defensive Move',
  zugzwang: 'Zugzwang',
  endgame: 'Endgame',
  middlegame: 'Middlegame',
  opening: 'Opening',
  openingTrap: 'Opening Trap',
  enPassant: 'En Passant',
  castling: 'Castling',
  advancedPawn: 'Advanced Pawn',
  attackingF2F7: 'Attack on f2/f7',
  rookEndgame: 'Rook Endgame',
  pawnEndgame: 'Pawn Endgame',
  bishopEndgame: 'Bishop Endgame',
  knightEndgame: 'Knight Endgame',
  queenEndgame: 'Queen Endgame',
  queenRookEndgame: 'Queen and Rook Endgame',
  bodenMate: "Boden's Mate",
  pillsburysMate: "Pillsbury's Mate",
  operaMate: 'Opera Mate',
  epauletteMate: 'Epaulette Mate',
  dovetailMate: 'Dovetail Mate',
  cornerMate: 'Corner Mate',
  swallowstailMate: "Swallow's Tail Mate",
  killBoxMate: 'Kill Box Mate',
  morphysMate: "Morphy's Mate",
  blindSwineMate: 'Blind Swine Mate',
  triangleMate: 'Triangle Mate',
  vukovicMate: 'Vuković Mate',
  doubleBishopMate: 'Double Bishop Mate',
  balestraMate: 'Balestra Mate',
};

/** Tags that say how a puzzle is graded or sized, or which phase it sits in —
 *  never WHAT it teaches. They do not name a heading or a row label. */
const NON_MOTIF_THEMES: ReadonlySet<string> = new Set([
  'advantage', 'crushing', 'equality', 'defensiveMove', 'mate',
  'opening', 'middlegame', 'endgame',
  'short', 'long', 'veryLong', 'oneMove',
  'master', 'masterVsMaster', 'superGM',
]);

/** The human labels of a puzzle's MOTIF tags, in the puzzle's own order —
 *  what a row shows instead of raw DB tags ("advantage · defensiveMove ·
 *  hangingPiece" → "Hanging Piece"). Tags with no label are dropped rather
 *  than shown raw. */
export function motifThemeLabels(themes: readonly string[]): string[] {
  const out: string[] = [];
  for (const t of themes) {
    if (NON_MOTIF_THEMES.has(t)) continue;
    const label = LICHESS_THEME_LABELS[t];
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/**
 * The heading for a puzzle served by a THEMED drill: the drilled theme the
 * puzzle actually carries, so a "Discovered Attacks" card is headed
 * "Discovered Attack" even when the puzzle also holds a fork (live walk
 * 2026-10-03: Discovered Attacks → FORK, Zugzwang → PROMOTION, Endgame
 * Technique → PIN). The tactical priority picks among several matches; a
 * specific tag (Rook Endgame) beats a phase tag (Endgame). Null when the
 * puzzle carries none of the focus themes.
 */
export function focusThemeLabel(themes: readonly string[], focus: readonly string[]): string | null {
  const matches = themes.filter((t) => focus.includes(t));
  if (matches.length === 0) return null;
  const tactical = getPrimaryThemeLabel(matches);
  if (tactical) return tactical;
  const specific = matches.find((t) => !NON_MOTIF_THEMES.has(t) && LICHESS_THEME_LABELS[t]);
  if (specific) return LICHESS_THEME_LABELS[specific];
  const any = matches.find((t) => LICHESS_THEME_LABELS[t]);
  return any ? LICHESS_THEME_LABELS[any] : null;
}

/**
 * Get the best tactic type from a Lichess puzzle's theme array.
 * Returns the first tactical theme found (ignoring phase/style tags), or null.
 */
export function getTacticTypeFromThemes(themes: string[]): TacticType | null {
  for (const theme of themes) {
    const mapped = LICHESS_THEME_TO_TACTIC[theme];
    if (mapped && mapped !== 'tactical_sequence') return mapped;
  }
  return null;
}

/**
 * Get the best human-friendly label from a Lichess puzzle's theme array.
 * Prioritizes tactical themes over phase/style themes.
 */
export function getPrimaryThemeLabel(themes: string[]): string | null {
  // Priority: tactical themes first
  const tacticalPriority = [
    'fork', 'pin', 'skewer', 'discoveredAttack', 'discoveredCheck',
    'backRankMate', 'smotheredMate', 'hookMate', 'arabianMate', 'anastasiaMate',
    'doubleCheck', 'deflection', 'attraction', 'capturingDefender',
    'sacrifice', 'clearance', 'interference', 'zwischenzug', 'intermezzo',
    'xRayAttack', 'overloadedPiece', 'trappedPiece', 'hangingPiece',
    'exposedKing', 'kingsideAttack', 'queensideAttack',
    'promotion', 'underPromotion', 'enPassant',
    'quietMove', 'defensiveMove', 'zugzwang', 'advancedPawn',
    'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
  ];

  for (const priority of tacticalPriority) {
    if (themes.includes(priority)) {
      return LICHESS_THEME_LABELS[priority] ?? priority;
    }
  }
  return null;
}

// ─── Classify & Persist ─────────────────────────────────────────────────────

/**
 * Classify a game's tactics — the ones the student MISSED (persisted as
 * `classifiedTactics` rows) and the ones they FOUND (brilliant/great moves,
 * stored on the game as `foundTacticTypes`) — then stamp the game with the
 * classifier revision (`tacticsClassifiedRev`). Readers take both from here and
 * never re-derive, because re-deriving over every analysed game on every open
 * of /weaknesses is what froze the app (2026-09-29): the Tactics tab ran the
 * classifier over every miss, the Patterns tab over every find, three times.
 *
 * Without `force`, a game already stamped at the current revision is skipped.
 * After a fresh analysis the caller passes `force` so both sides are re-derived
 * from the NEW annotations; drill counters on surviving rows are carried over.
 * A classifier change bumps `TACTIC_TYPE_REV`, which un-stamps every game.
 */
export async function classifyTacticsFromGame(
  gameId: string,
  opts: { force?: boolean; yieldBetween?: () => Promise<void> } = {},
): Promise<number> {
  const game = await db.games.get(gameId);
  if (!game || !game.annotations || game.annotations.length === 0) return 0;
  if (!opts.force && game.tacticsClassifiedRev === TACTIC_TYPE_REV) return 0;

  const existing = await db.classifiedTactics.where('sourceGameId').equals(gameId).toArray();
  const tactics = opts.yieldBetween
    ? await deriveMissedTacticsForGameYielding(game, opts.yieldBetween)
    : deriveMissedTacticsForGame(game);
  const found = await deriveFoundTacticTypes(game, opts.yieldBetween);
  const prior = new Map(existing.map((t) => [t.id, t]));
  for (const t of tactics) {
    const was = prior.get(t.id);
    if (was) {
      t.puzzleAttempts = was.puzzleAttempts;
      t.puzzleSuccesses = was.puzzleSuccesses;
      t.createdAt = was.createdAt;
    }
  }
  const stale = existing.filter((t) => !tactics.some((n) => n.id === t.id)).map((t) => t.id);
  await db.transaction('rw', db.classifiedTactics, db.games, async () => {
    if (stale.length > 0) await db.classifiedTactics.bulkDelete(stale);
    if (tactics.length > 0) await db.classifiedTactics.bulkPut(tactics);
    await db.games.update(gameId, { tacticsClassifiedRev: TACTIC_TYPE_REV, foundTacticTypes: found });
  });
  return tactics.length;
}

/**
 * The tactic types the student FOUND in a game: each of their brilliant/great
 * moves, classified by the move they PLAYED (on such a move `bestMove` is null —
 * the played move already is the best one). `tactical_sequence` is the
 * catch-all bucket and is dropped. Yields between classifier calls when asked.
 */
async function deriveFoundTacticTypes(
  game: GameRecord,
  yieldBetween?: () => Promise<void>,
): Promise<TacticType[]> {
  if (!game.annotations || game.annotations.length === 0) return [];
  const playerColor = resolvePlayerColor(game);
  if (!playerColor) return [];
  const fens = replayPgnToFens(game.pgn);
  const types: TacticType[] = [];
  for (let i = 0; i < game.annotations.length; i++) {
    const ann = game.annotations[i];
    if (ann.color !== playerColor) continue;
    if (ann.classification !== 'brilliant' && ann.classification !== 'great') continue;
    const preFen = fens[i];
    if (!preFen || !ann.san) continue;
    let uci: string;
    try {
      const mv = new Chess(preFen).move(ann.san);
      uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    } catch {
      continue; // illegal/unparseable SAN against the reconstructed FEN
    }
    if (yieldBetween) await yieldBetween();
    // Named off what the game then did with the move, its set-up counted too.
    const line = gameLineFrom(preFen, game.annotations.slice(i).map((a) => a.san));
    const t = detectTacticLine(preFen, uci, line);
    if (t.tacticType !== 'tactical_sequence') types.push(...tacticTypesOf({ tacticType: t.tacticType, setupTacticType: t.setup }));
  }
  return types;
}

/**
 * PURE derivation of a game's missed tactics from its annotations — no DB read
 * or write. The logic classifyTacticsFromGame persists.
 *
 * 🔒 NEVER call this over the whole library on a read path (2026-09-29). The
 * /weaknesses Tactics tab once did, to dodge an unfilled cache (David
 * 2026-09-09, "still seeing 100% tactical awareness"): ~930 games × every
 * mistake × a classifier costing tens of ms on a phone, synchronous on the
 * main thread, on every open — the page froze the app. The tab now reads the
 * cache and `backfillClassifiedTactics` fills it in the background.
 */
export function deriveMissedTacticsForGame(
  game: GameRecord,
  playerColorOverride?: 'white' | 'black',
): ClassifiedTactic[] {
  const plan = planDerivation(game, playerColorOverride);
  if (!plan) return [];
  const tactics: ClassifiedTactic[] = [];
  for (const i of plan.candidates) {
    const t = classifyCandidate(plan, i);
    if (t) tactics.push(t);
  }
  return tactics;
}

/** Same derivation, but hands the thread back between every classifier call
 *  (each is tens of ms on a phone) — for the background fill. */
async function deriveMissedTacticsForGameYielding(
  game: GameRecord,
  yieldBetween: () => Promise<void>,
): Promise<ClassifiedTactic[]> {
  const plan = planDerivation(game);
  if (!plan) return [];
  const tactics: ClassifiedTactic[] = [];
  for (const i of plan.candidates) {
    await yieldBetween();
    const t = classifyCandidate(plan, i);
    if (t) tactics.push(t);
  }
  return tactics;
}

interface DerivationPlan {
  game: GameRecord;
  playerColor: 'white' | 'black';
  context: ReturnType<typeof resolveGameContext>;
  fens: string[];
  /** Annotation indices worth classifying: the player's mistakes/blunders with a
   *  known best move and a real eval swing. Cheap to compute — the expensive
   *  step is `detectTacticType`, run once per candidate. */
  candidates: number[];
  cpLoss: Map<number, number>;
}

function planDerivation(
  game: GameRecord,
  playerColorOverride?: 'white' | 'black',
): DerivationPlan | null {
  if (!game.annotations || game.annotations.length === 0) return null;
  const playerColor = playerColorOverride ?? resolvePlayerColor(game);
  if (!playerColor) return null;

  // Replay PGN to get FENs for each position
  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  const annotations = game.annotations;
  const candidates: number[] = [];
  const cpLossAt = new Map<number, number>();
  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];

    // Only player's mistakes/blunders with a known best move
    if (ann.color !== playerColor) continue;
    const cls = ann.classification;
    if (cls !== 'mistake' && cls !== 'blunder') continue;
    if (!ann.bestMove) continue;

    // Compute cpLoss from eval deltas. `MoveAnnotation.evaluation` is
    // CENTIPAWNS (types/index.ts: "Stockfish evaluation in centipawns";
    // gameAnalysisService writes the engine's cp score straight in). This
    // block used to multiply by 100 on the belief that evals were stored in
    // pawns — so every classified tactic carried a cost 100× too large, the
    // 80cp floor admitted every 1cp wobble, and the coach told a student a
    // missed hanging piece "cost 365.5 points" (WO-STANDARD-01 D-17, prod
    // tape 2026-09-22). One unit, the one the type declares.
    const evalAfter = ann.evaluation;
    const prevAnn = i > 0 ? annotations[i - 1] : null;
    const evalBefore = prevAnn?.evaluation ?? null;
    let cpLoss = 0;
    if (evalBefore !== null && evalAfter !== null) {
      cpLoss = Math.abs(
        playerColor === 'white' ? evalBefore - evalAfter : evalAfter - evalBefore,
      );
    }
    if (cpLoss < MIN_CP_LOSS) continue;
    // FEN before this move was played
    if (!fens[i]) continue;
    candidates.push(i);
    cpLossAt.set(i, cpLoss);
  }
  return {
    game,
    playerColor,
    context: resolveGameContext(game, playerColor),
    fens,
    candidates,
    cpLoss: cpLossAt,
  };
}

function classifyCandidate(plan: DerivationPlan, i: number): ClassifiedTactic | null {
  const ann = plan.game.annotations?.[i];
  const fenBefore = plan.fens[i];
  if (!ann || !ann.bestMove || !fenBefore) return null;
  const cpLoss = plan.cpLoss.get(i) ?? 0;

  // From the best move AND its line — a deflection, an x-ray or a pawn run
  // exists only as a line — with the line's set-up counted beside its name.
  const named = detectTacticLine(fenBefore, ann.bestMove, bestLineOf(ann));
  const tacticType = named.tacticType;
  if (tacticType === 'tactical_sequence') return null; // Skip unclassifiable

  const bestMoveSan = uciToSan(fenBefore, ann.bestMove);
  return {
    id: `ct-${plan.game.id}-${i}`,
    sourceGameId: plan.game.id,
    moveIndex: i,
    fen: fenBefore,
    bestMoveUci: ann.bestMove,
    bestMoveSan: bestMoveSan ?? ann.bestMove,
    playerMoveUci: '', // Not critical for display
    playerMoveSan: ann.san,
    playerColor: plan.playerColor,
    tacticType,
    ...(named.setup ? { setupTacticType: named.setup } : {}),
    evalSwing: cpLoss,
    explanation: generateExplanation(tacticType, bestMoveSan ?? ann.bestMove, cpLoss, named.setup),
    opponentName: plan.context.opponentName,
    gameDate: plan.context.gameDate,
    openingName: plan.context.openingName,
    puzzleAttempts: 0,
    puzzleSuccesses: 0,
    createdAt: new Date().toISOString(),
  };
}

let fillInFlight: Promise<number> | null = null;

/**
 * Fill the classifiedTactics cache for every analysed game not yet classified,
 * scheduled per `backfillSchedule` rules: yield between classifier calls,
 * persist per game (a killed app keeps its progress), never on the boot path.
 * Single-flight — a second caller joins the running fill instead of starting a
 * parallel one. `onGame` fires after each game lands so a surface can refresh.
 * Returns the number of new tactics found.
 */
export function backfillClassifiedTactics(opts: {
  schedule?: BackfillSchedule;
  onGame?: (done: number, total: number) => void;
} = {}): Promise<number> {
  if (fillInFlight) return fillInFlight;
  const schedule = opts.schedule ?? PAGE_BACKFILL_SCHEDULE;
  fillInFlight = (async () => {
    if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
    const pending = await db.games
      .filter((g) => g.tacticsClassifiedRev !== TACTIC_TYPE_REV && !!g.annotations && g.annotations.length > 0)
      .primaryKeys();
    let total = 0;
    let done = 0;
    for (const id of pending) {
      try {
        total += await classifyTacticsFromGame(id, { yieldBetween: schedule.yieldBetweenRows });
      } catch {
        // Continue with remaining games
      }
      done++;
      opts.onGame?.(done, pending.length);
      await schedule.yieldBetweenRows();
    }
    return total;
  })().finally(() => { fillInFlight = null; });
  return fillInFlight;
}

/** A page-triggered fill: the page has already painted, so no boot delay. */
const PAGE_BACKFILL_SCHEDULE: BackfillSchedule = { ...PRODUCTION_BACKFILL_SCHEDULE, startDelayMs: 0 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolvePlayerColor(game: GameRecord): 'white' | 'black' | null {
  // The declared seat first (see `playerIdentity.resolvePlayerColor`; gate
  // `seatResolversReadDeclaredSeat.test.ts`).
  if (game.studentSide === 'white' || game.studentSide === 'black') return game.studentSide;
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return 'white';
  }
  const profile = useAppStore.getState().activeProfile;
  if (profile) {
    const name = profile.name.toLowerCase();
    if (game.white.toLowerCase().includes(name) || name.includes(game.white.toLowerCase())) return 'white';
    if (game.black.toLowerCase().includes(name) || name.includes(game.black.toLowerCase())) return 'black';
  }
  return 'white';
}

function resolveGameContext(
  game: GameRecord,
  playerColor: 'white' | 'black',
): { opponentName: string | null; gameDate: string | null; openingName: string | null } {
  return {
    opponentName: playerColor === 'white' ? game.black : game.white,
    gameDate: game.date,
    openingName: game.eco,
  };
}

function replayPgnToFens(pgn: string): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  try {
    chess.loadPgn(pgn);
    const history = chess.history();
    chess.reset();
    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
    }
  } catch {
    // Return what we have
  }
  return fens;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const result = chess.move({ from, to, promotion });
    return result.san;
  } catch {
    return null;
  }
}

function generateExplanation(tacticType: TacticType, bestMove: string, cpLoss: number, setup: TacticType | null = null): string {
  const pawns = (cpLoss / 100).toFixed(1);
  // COUNT BOTH: the set-up the line opens with is named first, then what it lands.
  const setupMotif = setup ? MOTIF_OF_TACTIC[setup] : null;
  const landsMotif = MOTIF_OF_TACTIC[tacticType];
  if (setupMotif && landsMotif) return `Missed ${MOTIFS[setupMotif].word} with ${bestMove}, setting up the ${MOTIFS[landsMotif].word} (${pawns} points lost)`;
  const labels: Record<TacticType, string> = {
    fork: `Missed fork with ${bestMove} (${pawns} points lost)`,
    pin: `Missed pin with ${bestMove} (${pawns} points lost)`,
    skewer: `Missed skewer with ${bestMove} (${pawns} points lost)`,
    discovered_attack: `Missed discovered attack with ${bestMove} (${pawns} points lost)`,
    discovered_check: `Missed discovered check with ${bestMove} (${pawns} points lost)`,
    back_rank: `Missed back rank tactic with ${bestMove} (${pawns} points lost)`,
    hanging_piece: `Missed capturing hanging piece with ${bestMove} (${pawns} points lost)`,
    promotion: `Missed promotion with ${bestMove} (${pawns} points lost)`,
    deflection: `Missed deflection with ${bestMove} (${pawns} points lost)`,
    overloaded_piece: `Missed overloaded piece exploit with ${bestMove} (${pawns} points lost)`,
    trapped_piece: `Missed trapping a piece with ${bestMove} (${pawns} points lost)`,
    clearance: `Missed clearance sacrifice with ${bestMove} (${pawns} points lost)`,
    interference: `Missed interference tactic with ${bestMove} (${pawns} points lost)`,
    zwischenzug: `Missed zwischenzug with ${bestMove} (${pawns} points lost)`,
    x_ray: `Missed x-ray attack with ${bestMove} (${pawns} points lost)`,
    double_check: `Missed double check with ${bestMove} (${pawns} points lost)`,
    removing_the_guard: `Missed removing the guard with ${bestMove} (${pawns} points lost)`,
    checkmate: `Missed forced checkmate with ${bestMove} (${pawns} points lost)`,
    tactical_sequence: `Missed tactic with ${bestMove} (${pawns} points lost)`,
  };
  return labels[tacticType];
}
