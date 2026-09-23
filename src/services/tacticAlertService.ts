/**
 * Tactic Alert Service — the brain of the across-app coaching system.
 *
 * Two modes:
 * 1. GAMEPLAY: Detect tactic opportunities during coach games / opening free play.
 *    Alert timing adapts to player rating — weaker players get told sooner.
 *    After a move that misses a tactic, coach speaks up so the player can take back.
 *
 * 2. TRAINING: Detect when a player is struggling during tactical puzzles.
 *    Deliver tactic-specific conceptual coaching that teaches the pattern,
 *    not just "try again." Adapts to rating and weakness profile.
 */

import { Chess } from 'chess.js';
import { detectTacticType } from './missedTacticService';
import { getStoredTacticalProfile } from './tacticalProfileService';
import { alertSensitivityMultiplier } from './skillScaling';
import { legalSeeGainFor } from './positionReadingService';
import { tacticInvariant } from './conceptEngine';
import { toTacticPatternType } from './tacticVocabulary';
import type { TacticType, StockfishAnalysis } from '../types';
import type { UpcomingTactic } from '../types/tacticTypes';

// ─── Teaching Content ─────────────────────────────────────────────────────────

/**
 * Conceptual teaching for each tactic type. These explain the PATTERN,
 * not the specific position — they teach the player what to look for
 * so they can find it themselves.
 *
 * ONE VOICE (P4b, 2026-09-15): `concept` — the definition of the motif — is
 * NOT authored here for any motif the live vocabulary can name. It is DERIVED
 * from the concept engine's `TACTIC_INVARIANT` through the vocabulary bridge
 * (see `unifyConceptVoice` below), so the My-Mistakes struggle coaching, the
 * Play tactic alert and the classroom drill all define a fork with the same
 * sentence. The literal below is the fallback for motifs the engine has no
 * invariant for. `lookFor` / `beginnerHint` stay authored: they are WHERE-TO-
 * LOOK registers, not a competing definition.
 */
const TACTIC_TEACHING: Record<TacticType, {
  concept: string;
  lookFor: string;
  beginnerHint: string;
}> = {
  fork: {
    concept: 'A fork attacks two or more pieces at once, forcing your opponent to lose material.',
    lookFor: 'Look for squares where your knight or queen can attack two undefended pieces simultaneously.',
    beginnerHint: 'Check if any of your pieces can jump to a square that threatens two things at once.',
  },
  pin: {
    concept: 'A pin immobilizes a piece because moving it would expose a more valuable piece behind it.',
    lookFor: 'Look along ranks, files, and diagonals for an enemy piece shielding their king or queen.',
    beginnerHint: 'Find an enemy piece that is stuck in front of their king or queen.',
  },
  skewer: {
    concept: 'A skewer forces a valuable piece to move, revealing a piece behind it that can be captured.',
    lookFor: 'Look for a line where a high-value piece stands in front of a lower-value one.',
    beginnerHint: 'Attack a big piece so that when it moves, you can take what is behind it.',
  },
  discovered_attack: {
    concept: 'Moving one piece reveals an attack from another piece behind it.',
    lookFor: 'Look for pieces that are blocked by your own pieces — moving the blocker unleashes the attack.',
    beginnerHint: 'Can you move a piece out of the way to reveal an attack from behind?',
  },
  back_rank: {
    concept: 'When the king is trapped on the back rank with no escape squares, a rook or queen delivers a devastating check.',
    lookFor: 'Check if the enemy king has no pawn shield escape — a rook or queen on the back rank could be checkmate.',
    beginnerHint: 'Is the enemy king stuck on the back row? A rook on that row might be checkmate!',
  },
  hanging_piece: {
    concept: 'A hanging piece is undefended — it can be captured for free.',
    lookFor: 'Scan the board for enemy pieces with no defenders. Can any of your pieces reach them?',
    beginnerHint: 'Look for free pieces you can just take without losing anything.',
  },
  promotion: {
    concept: 'Advancing a pawn to the last rank transforms it into a queen or another powerful piece.',
    lookFor: 'Check if any of your pawns are close to promotion. Can you clear the path?',
    beginnerHint: 'Is one of your pawns close to the other side of the board? Push it!',
  },
  deflection: {
    concept: 'Deflection forces a key defender away from the square or piece it is protecting.',
    lookFor: 'Identify which enemy piece is the critical defender, then attack it or lure it away.',
    beginnerHint: 'One of their pieces is doing an important job. Can you force it to move?',
  },
  overloaded_piece: {
    concept: 'An overloaded piece is defending two things at once — it cannot handle both duties.',
    lookFor: 'Find an enemy piece responsible for multiple defensive tasks. Attack one of its charges.',
    beginnerHint: 'One of their pieces is trying to protect two things. Make it choose!',
  },
  trapped_piece: {
    concept: 'A trapped piece has no safe squares to move to and can be won.',
    lookFor: 'Look for enemy pieces with limited mobility. Can you take away their last escape squares?',
    beginnerHint: 'Is an enemy piece stuck with nowhere to go? You might be able to win it.',
  },
  clearance: {
    concept: 'A clearance sacrifice moves your own piece off a critical square or line to make way for a stronger move.',
    lookFor: 'Is one of your own pieces blocking a powerful attack? Consider sacrificing it to clear the path.',
    beginnerHint: 'Sometimes you need to move your own piece out of the way — even if it means giving it up.',
  },
  interference: {
    concept: 'Interference places a piece between two enemy pieces that need to communicate, cutting off their coordination.',
    lookFor: 'Find two enemy pieces that are defending each other along a line. Can you block that line?',
    beginnerHint: 'Try putting one of your pieces in between two of theirs to break their connection.',
  },
  zwischenzug: {
    concept: 'An in-between move — instead of the expected recapture, you play a surprise forcing move first.',
    lookFor: 'Before recapturing, ask: is there a check, threat, or attack I can play first?',
    beginnerHint: 'Before you take back, see if there is something even better you can do first.',
  },
  x_ray: {
    concept: 'An X-ray attack works through an intervening piece — your piece controls a square behind another piece.',
    lookFor: 'Your rook, bishop, or queen may attack through an enemy piece if it moves or is captured.',
    beginnerHint: 'Your long-range piece can sometimes attack through other pieces like an X-ray.',
  },
  double_check: {
    concept: 'Double check attacks the king with two pieces at once — the king MUST move, no blocking or capturing allowed.',
    lookFor: 'Can you give check with two pieces simultaneously? The king will have very few escape squares.',
    beginnerHint: 'If you can check the king with two pieces at once, it is incredibly powerful!',
  },
  removing_the_guard: {
    concept: 'Removing the guard means capturing a piece that is defending something else — once the guard is gone, the target is left hanging.',
    lookFor: 'Find which enemy piece is the sole defender of a valuable target. Can you capture that defender?',
    beginnerHint: 'One of their pieces is protecting something important. If you take it, the thing it was guarding is free!',
  },
  checkmate: {
    concept: 'A forced checkmate ends the game on the spot — every check, every capture and every escape square counts.',
    lookFor: 'Count the enemy king\'s escape squares, then look for the check that takes the last one away.',
    beginnerHint: 'Can you check the king so it has nowhere to go?',
  },
  tactical_sequence: {
    concept: 'Sometimes the best move involves a combination of ideas — a sequence of forcing moves that work together.',
    lookFor: 'Look for checks, captures, and threats that force your opponent\'s responses. Each move should limit their options.',
    beginnerHint: 'Try to find moves that force your opponent to respond in a specific way. Checks and captures are good starting points.',
  },
};

/** The engine's invariant sentence for a motif, capitalised for a sentence
 *  start — or null when the live vocabulary can't name the motif. */
function engineConceptFor(t: TacticType): string | null {
  const pattern = toTacticPatternType(t);
  const inv = pattern ? tacticInvariant(pattern) : null;
  if (!inv) return null;
  return inv.full.charAt(0).toUpperCase() + inv.full.slice(1);
}

/** Overwrite every bridged motif's `concept` with the engine's invariant, so
 *  there is exactly one definition of each tactic in the app. Runs once at
 *  module load; gated by tacticTypeUnification.test.ts. */
function unifyConceptVoice(): void {
  for (const t of Object.keys(TACTIC_TEACHING) as TacticType[]) {
    const engine = engineConceptFor(t);
    if (engine) TACTIC_TEACHING[t].concept = engine;
  }
}
unifyConceptVoice();

// ─── Coaching Tiers ───────────────────────────────────────────────────────────

export type CoachingTier = 'none' | 'nudge' | 'teach' | 'guide';

export interface StruggleSignals {
  elapsedSeconds: number;
  wrongAttempts: number;
  sameTypeFailed: boolean;
  playerRating: number;
}

/**
 * Rating-adaptive thresholds. Lower-rated players get help sooner.
 * Returns a multiplier (0.5 = half the standard time, 1.5 = more patience).
 */
function ratingMultiplier(rating: number): number {
  if (rating < 800) return 0.5;
  if (rating < 1200) return 0.7;
  if (rating < 1600) return 1.0;
  if (rating < 2000) return 1.3;
  return 1.6;
}

/**
 * Determine the coaching tier based on struggle signals.
 * Higher tiers = more direct help.
 */
export function detectStruggleTier(signals: StruggleSignals): CoachingTier {
  const mult = ratingMultiplier(signals.playerRating);

  // Time thresholds (seconds), scaled by rating
  const nudgeTime = 60 * mult;
  const teachTime = 90 * mult;
  const guideTime = 120 * mult;

  // Wrong attempt thresholds
  const nudgeAttempts = 1;
  const teachAttempts = 2;
  const guideAttempts = Math.max(3, Math.round(3 * mult));

  // Determine tier from strongest signal
  if (
    signals.wrongAttempts >= guideAttempts ||
    signals.elapsedSeconds >= guideTime ||
    (signals.sameTypeFailed && signals.wrongAttempts >= teachAttempts)
  ) {
    return 'guide';
  }

  if (
    signals.wrongAttempts >= teachAttempts ||
    signals.elapsedSeconds >= teachTime ||
    (signals.sameTypeFailed && signals.elapsedSeconds >= nudgeTime)
  ) {
    return 'teach';
  }

  if (
    signals.wrongAttempts >= nudgeAttempts ||
    signals.elapsedSeconds >= nudgeTime
  ) {
    return 'nudge';
  }

  return 'none';
}

/**
 * Get coaching text for the given tier and tactic type.
 * Adapts language complexity to player rating.
 */
export function getCoachingMessage(
  tacticType: TacticType,
  tier: CoachingTier,
  playerRating: number,
): string | null {
  if (tier === 'none') return null;

  const teaching = TACTIC_TEACHING[tacticType];
  const isBeginner = playerRating < 1200;

  switch (tier) {
    case 'nudge':
      // Theme-aware nudge — hints at the pattern without revealing the answer
      return isBeginner ? teaching.beginnerHint : teaching.lookFor;

    case 'teach':
      // Reveal the concept alongside the hint
      return isBeginner
        ? `${teaching.beginnerHint} ${teaching.concept}`
        : `${teaching.concept} ${teaching.lookFor}`;

    case 'guide':
      // Full conceptual teaching — all three layers
      return `${teaching.concept} ${teaching.lookFor}`;
  }
}

// ─── Gameplay Tactic Detection ────────────────────────────────────────────────

export interface GameplayTacticAlert {
  tacticType: TacticType;
  message: string;
  isWeakness: boolean;
}

/**
 * Rating-adaptive lookahead for proactive tactic alerts during gameplay.
 * Returns how many moves AHEAD to scan for upcoming tactics.
 *
 * Weaker players: alerted when the tactic is 1 move away (immediate).
 * Stronger players: alerted 2-3 moves before the tactic appears — giving
 * them time to plan but requiring them to calculate the full sequence.
 *
 * The missed-tactic notification ("you just missed one, take it back")
 * fires for ALL players regardless of rating — that's a separate system.
 */
export function getTacticLookahead(
  playerRating: number,
  tacticsSkill?: number,
): number {
  // How many plies of the engine PV the coach scans for tactics it will
  // surface — scaled to push the player to calculate as far as they can handle.
  //
  // David 2026-07-03: intermediate = 3 full moves, advanced = 5 full moves —
  // and NOT a locked ceiling. The rating band sets a BASELINE; the player's
  // tactics-skill radar (0-100, from real puzzle/game performance) adds plies on
  // top, OPEN-ENDED, so as they get better at tactics the horizon keeps
  // extending and no single number is fixed. (2026-05-18 anchors — 1/2 for
  // beginners, deeper for stronger — kept; intermediate/advanced pushed out.)
  //
  // Bounded in practice by the length of Stockfish's PV: the scan walks what the
  // engine returned and stops at the PV end, so an aggressive horizon degrades
  // gracefully rather than inventing moves (G3).
  let plies: number;
  if (playerRating < 1000) plies = 1;        // Beginner: just the immediate threat
  else if (playerRating < 1400) plies = 2;   // Improver: 1 full move ahead
  else if (playerRating < 1800) plies = 6;   // Intermediate: 3 full moves ahead
  else plies = 10;                           // Advanced (1800+): 5 full moves ahead

  // Adaptive push: a player strong (or improving) at tactics for their level
  // sees further. Every 20 points of tactics skill above 60 adds one full move
  // (2 plies) — open-ended. Not applied to raw beginners (< 1000) so we never
  // over-face them. tacticsSkill omitted → baseline behavior (backward compat).
  if (typeof tacticsSkill === 'number' && playerRating >= 1000) {
    const bonusMoves = Math.max(0, Math.floor((tacticsSkill - 60) / 20));
    plies += bonusMoves * 2;
  }
  return plies;
}

/** Centipawn bar a proactive tactic alert must clear to be spoken. The
 *  opening bar is higher: shallow, non-critical patterns (a harmless
 *  pin) cluster there, and David's directive (2026-06-01) was to stop
 *  calling those out. */
export const CRITICAL_THREAT_CP = 150;          // 1.5 pawns — middlegame+
export const CRITICAL_THREAT_CP_OPENING = 250;  // 2.5 pawns — opening

const MATE_MOTIFS = new Set(['mate_threat', 'back_rank', 'double_check']);

/** The most material (in CENTIPAWNS) `capturingColor` can win off ANY enemy
 *  piece on `fen`, pin-aware and legal-capture-driven (`legalSeeGainFor` returns
 *  pawn units; ×100). This is the per-ply "does the opponent actually win
 *  material HERE" signal that replaces the line's terminal eval (C#6). */
function maxMaterialWinCp(fen: string, capturingColor: 'w' | 'b'): number {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 0; }
  const victimColor = capturingColor === 'w' ? 'b' : 'w';
  let best = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== victimColor || cell.type === 'k') continue;
      const g = legalSeeGainFor(fen, cell.square, capturingColor);
      if (g > best) best = g;
    }
  }
  return best * 100;
}

const CAPTURE_CP: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

/**
 * What the capturer is GUARANTEED to win at `fen` once the side to move has
 * had its say (walk 5, 2026-09-23). `maxMaterialWinCp` forces the turn to the
 * capturer, which is right only when the capturer IS to move. A pattern found
 * in the middle of a PV usually sits one ply BEFORE the victim's reply — after
 * 9…Nc6 10.Nxc6 the knight "forks" d8 and e7, but Black moves next and plays
 * …bxc6, and the fork never existed. The alert said "Watch out — if you play
 * Nc6, I answer Nxc6 and knight on c6 forks queen on d8 and bishop on e7" for a
 * plain even trade. When the victim is to move, every legal reply is tried and
 * the capturer keeps only what it wins against the BEST one, net of anything
 * that reply took.
 */
function guaranteedWinCp(fen: string, capturingColor: 'w' | 'b'): number {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return 0; }
  if (chess.turn() === capturingColor) return maxMaterialWinCp(fen, capturingColor);
  let worst = Number.POSITIVE_INFINITY;
  for (const mv of chess.moves({ verbose: true })) {
    chess.move(mv);
    const taken = mv.captured ? (CAPTURE_CP[mv.captured] ?? 0) : 0;
    const net = maxMaterialWinCp(chess.fen(), capturingColor) - taken;
    chess.undo();
    if (net < worst) worst = net;
    if (worst <= 0) return 0;
  }
  return Number.isFinite(worst) ? Math.max(0, worst) : 0;
}

/**
 * Is an upcoming OPPONENT tactic worth a proactive "Watch out" alert?
 *
 * The tactic detector flags every geometric pattern in the Stockfish PV
 * — including pins that win nothing. Announcing those (David: "it points
 * out every pin even if it's not critical … mainly in the opening") is
 * noise. A threat is CRITICAL only when it actually matters: a forced
 * mate, or the opponent genuinely winning material.
 *
 * 🔒 C#6 (2026-09-13): judge the pattern at its OWN board, not the LINE's
 * terminal eval/mate. `scanUpcomingTactics` stamps every pattern with the
 * whole line's `lineEval`/`lineMate`, so a harmless ply-1 pin sitting in a
 * line that mates at ply 5 inherited the mate and fired. Now: a real MATE
 * MOTIF on this board is critical; any other pattern must WIN MATERIAL past
 * the (rating-scaled) bar at its own position — a pin/fork that wins nothing
 * is not a threat no matter how sharp the line later becomes. When `pattern`
 * + `fen` are absent (a caller with only the line signal) the old
 * line-terminal read is the fallback.
 *
 * @param tactic       The upcoming tactic. `pattern` + `fen` drive the
 *                     per-ply judgment; `lineEval`/`lineMate` are the fallback.
 * @param playerColor  The student's color (the beneficiary is the opponent).
 * @param isOpening    Apply the stricter opening bar.
 */
export function isCriticalThreat(
  tactic: Pick<UpcomingTactic, 'lineEval' | 'lineMate'> & Partial<Pick<UpcomingTactic, 'pattern' | 'fen'>>,
  playerColor: 'w' | 'b',
  isOpening: boolean,
  playerRating?: number,
  tacticsSkill?: number,
): boolean {
  const baseBar = isOpening ? CRITICAL_THREAT_CP_OPENING : CRITICAL_THREAT_CP;
  // Adaptive: weaker players get alerted on smaller swings (more help); stronger
  // players only on bigger ones (less noise) — David 2026-07-03. Omitted rating
  // → fixed baseline (backward compatible).
  const bar = typeof playerRating === 'number'
    ? baseBar * alertSensitivityMultiplier(playerRating, tacticsSkill)
    : baseBar;

  // C#6 — per-ply judgment when the pattern + its board are in hand.
  if (tactic.pattern && tactic.fen) {
    if (MATE_MOTIFS.has(tactic.pattern.type)) return true; // a real mate motif HERE
    const oppWB: 'w' | 'b' = playerColor === 'w' ? 'b' : 'w';
    return guaranteedWinCp(tactic.fen, oppWB) >= bar; // opponent must WIN material here, after your best reply
  }

  // Fallback (no pattern/fen): the original line-terminal signal.
  if (tactic.lineMate !== null) return true;
  const studentEval = playerColor === 'w' ? tactic.lineEval : -tactic.lineEval;
  return studentEval <= -bar; // opponent winning by ≥ the bar
}

/**
 * Check if the current position has a tactic available RIGHT NOW.
 * Uses Stockfish analysis (already computed) + pattern detection.
 * Returns the tactic type if found, null otherwise.
 */
export function detectGameplayTactic(
  fen: string,
  analysis: StockfishAnalysis,
  playerColor: 'white' | 'black',
): TacticType | null {
  if (!analysis.bestMove) return null;

  // Only flag as tactic if eval gap is significant (>= 150cp)
  if (analysis.topLines.length >= 2) {
    const bestEval = analysis.topLines[0].evaluation;
    const secondEval = analysis.topLines[1].evaluation;
    const gap = playerColor === 'white'
      ? bestEval - secondEval
      : secondEval - bestEval;

    if (gap < 150) return null;
  }

  // The engine walks the whole best line (P4b) — a mate or tactic that lands
  // two plies in is still THIS move's motif, and the label matches what the
  // coach will teach.
  const tacticType = detectTacticType(fen, analysis.bestMove, analysis.topLines[0]?.moves);
  // Don't alert on generic tactical_sequence — not specific enough to teach
  if (tacticType === 'tactical_sequence') return null;

  return tacticType;
}

/**
 * Scan Stockfish's best line for upcoming tactics within a lookahead window.
 * Plays through the top engine line move-by-move and checks each player
 * move for a tactic. Returns the first tactic found with its move distance.
 *
 * This enables proactive alerts: "A tactic is brewing — start looking."
 */
export function scanUpcomingTactic(
  fen: string,
  analysis: StockfishAnalysis,
  playerColor: 'white' | 'black',
  lookahead: number,
): { tacticType: TacticType; movesAway: number } | null {
  const bestLine = analysis.topLines[0] as (typeof analysis.topLines)[number] | undefined;
  if (!bestLine || bestLine.moves.length < 2) return null;

  // Same eval-gap gate detectGameplayTactic uses for immediate
  // tactics. Without this, scanUpcomingTactic was firing on
  // EVERY position where the engine had any plausible best line —
  // i.e. essentially every move — and the user reported the
  // tactic-preview popup appearing on almost every move. A tactic
  // is only worth flagging when the best line is materially better
  // than the second-best (>= 150cp), otherwise it's just "good play"
  // and not a teachable concrete pattern.
  if (analysis.topLines.length >= 2) {
    const bestEval = analysis.topLines[0].evaluation;
    const secondEval = analysis.topLines[1].evaluation;
    const gap = playerColor === 'white'
      ? bestEval - secondEval
      : secondEval - bestEval;
    if (gap < 150) return null;
  }

  // We need chess.js to play through the line — dynamic import would be
  // heavy, so we do lightweight FEN analysis. The detectTacticType function
  // just needs FEN + move, and we can simulate by replaying moves.
  try {
    const chess = new Chess(fen);
    const playerTurnChar = playerColor === 'white' ? 'w' : 'b';

    for (let i = 0; i < Math.min(bestLine.moves.length, lookahead * 2); i++) {
      const uci = bestLine.moves[i];
      if (!uci || uci.length < 4) break;

      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      const isPlayerMove = chess.turn() === playerTurnChar;

      if (isPlayerMove && i > 0) {
        // Check if this future player move is a tactic
        const tacticType = detectTacticType(chess.fen(), uci, bestLine.moves.slice(i));
        if (tacticType !== 'tactical_sequence') {
          const movesAway = Math.ceil((i + 1) / 2);
          return { tacticType, movesAway };
        }
      }

      // Play the move to advance position
      try {
        chess.move({ from, to, promotion });
      } catch {
        break; // Invalid move in line — stop scanning
      }
    }
  } catch {
    // chess.js not available or error — skip scanning
  }

  return null;
}

/** Friendly label for a TacticType — used in coach messages so the
 *  popup says "fork building" instead of generic "tactic building". */
export function tacticTypeLabel(t: TacticType): string {
  switch (t) {
    case 'fork': return 'fork';
    case 'pin': return 'pin';
    case 'skewer': return 'skewer';
    case 'discovered_attack': return 'discovered attack';
    case 'back_rank': return 'back-rank tactic';
    case 'hanging_piece': return 'capture on a hanging piece';
    case 'promotion': return 'promotion';
    case 'deflection': return 'deflection';
    case 'overloaded_piece': return 'overload';
    case 'trapped_piece': return 'trapped-piece motif';
    case 'clearance': return 'clearance sacrifice';
    case 'interference': return 'interference';
    case 'zwischenzug': return 'zwischenzug';
    case 'x_ray': return 'x-ray';
    case 'checkmate': return 'checkmate';
    default: return 'tactic';
  }
}

/**
 * Build the coach message when a tactic is available or was just missed.
 */
export function buildTacticAlertMessage(
  tacticType: TacticType,
  mode: 'available' | 'missed',
  playerRating: number,
  isWeakness: boolean,
): string {
  const teaching = TACTIC_TEACHING[tacticType];
  const isBeginner = playerRating < 1200;

  if (mode === 'available') {
    // Proactive: tactic exists right now — player's tactic
    if (isBeginner) {
      return `You have a tactic here! ${teaching.beginnerHint}`;
    }
    if (isWeakness) {
      return `You have a tactic — a pattern you've been working on. ${teaching.lookFor}`;
    }
    return `You have a tactic in this position. ${teaching.lookFor}`;
  }

  // Missed: player played a different move
  if (isBeginner) {
    return `You missed your tactic! ${teaching.beginnerHint} Take it back and try again.`;
  }
  if (isWeakness) {
    return `You missed a tactic — and it is one of your weaker areas. ${teaching.concept} Take the move back and try to find it.`;
  }
  return `You missed a tactic there. ${teaching.lookFor}`;
}

// ─── Weakness-Aware Helpers ───────────────────────────────────────────────────

/**
 * Check if a tactic type is among the player's weakest areas.
 * Uses the cached tactical profile.
 */
export async function isTacticWeakness(tacticType: TacticType): Promise<boolean> {
  const profile = await getStoredTacticalProfile();
  if (!profile) return false;
  return profile.weakestTypes.includes(tacticType);
}

/**
 * Get the player's weakest tactic types from the cached profile.
 */
export async function getWeakestTypes(): Promise<TacticType[]> {
  const profile = await getStoredTacticalProfile();
  if (!profile) return [];
  return profile.weakestTypes;
}

// ─── Session Tracking ─────────────────────────────────────────────────────────

export interface TacticOutcome {
  tacticType: TacticType;
  found: boolean;
  wasCoached: boolean;
  context: 'gameplay' | 'drill' | 'setup' | 'create';
}

/**
 * In-memory session tracking of tactic outcomes.
 * Used to detect same-type failures within a session.
 */
const sessionOutcomes: TacticOutcome[] = [];

export function recordTacticOutcome(outcome: TacticOutcome): void {
  sessionOutcomes.push(outcome);
}

export function hasRecentFailure(tacticType: TacticType): boolean {
  // Check the last 5 outcomes for a failure of the same type
  const recent = sessionOutcomes.slice(-5);
  return recent.some((o) => o.tacticType === tacticType && !o.found);
}

export function getSessionOutcomes(): readonly TacticOutcome[] {
  return sessionOutcomes;
}

export function clearSessionOutcomes(): void {
  sessionOutcomes.length = 0;
}
