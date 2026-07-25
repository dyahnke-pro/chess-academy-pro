/**
 * engineDeltaLines — the review's per-move "delta" (what a move THREATENS + the
 * engine's best line), ported to Learn's Watch + Play as ARROWS on a static
 * board, in the present-tense in-game register.
 *
 * David 2026-07-24: "Add engine delta to watch and play." His speedrun voice
 * constantly traces the delta — "this now threatens the fork" / "the best line
 * here runs …" — with arrows, without moving the pieces. Same locked mechanism:
 * arrows show the line, the board never moves.
 *
 * Two parts, both returning { arrows, say } like the gem aside:
 *   - computeThreatDelta  — PURE (chess.js null-move scan via detectNewThreat):
 *     what the move just played now threatens. No engine, no async.
 *   - bestLineDeltaFromPv — takes an already-computed Stockfish PvLine (the
 *     caller owns the async engine call — Play reuses its live eval; Watch
 *     computes per node) and traces the best move as an arrow.
 *
 * G0/G3: every square is board-derived (chess.js / the engine PV); the voice
 * only phrases computed facts, never decides them. Present-tense, side-framed.
 */
import { Chess } from 'chess.js';
import { detectNewThreat } from './groundedAnswer';
import type { PvLine } from './pvPlayback';
import type { NarrationArrow } from '../types/walkthroughTree';
import type { AnalysisLine } from '../types';

export interface DeltaAside {
  arrows: NarrationArrow[];
  say: string;
  short: string;
}

function sideWord(wb: 'w' | 'b'): string {
  return wb === 'w' ? 'White' : 'Black';
}

function cleanSan(san: string): string {
  return san.replace(/[!?]+$/g, '');
}

/**
 * The THREAT delta — what the move just played (by `moverWB`) now threatens.
 * Pure: a chess.js null-move scan, no engine. Draws the threatening move as one
 * arrow (origin → landing) and voices it present-tense. Null when the move
 * creates no concrete threat (a fork / mate / winning capture).
 */
export function computeThreatDelta(
  fenBefore: string,
  fenAfter: string,
  moverWB: 'w' | 'b',
): DeltaAside | null {
  const t = detectNewThreat(fenBefore, fenAfter, moverWB);
  if (!t) return null;
  const side = sideWord(moverWB);
  const san = cleanSan(t.san);
  // detail already reads as a clause ("a fork winning the queen on d1", "mate on
  // h7", "wins the rook on a8") — phrase it as a live threat.
  const say = `And now ${side} is threatening ${san} — ${t.detail}.`;
  const short = `Threat: ${san}.`;
  return {
    arrows: [{ from: t.from, to: t.landing, color: 'blue' }],
    say,
    short,
  };
}

/**
 * The BEST-LINE delta — the engine's top move at this position, as an arrow +
 * the line named. Takes an already-computed `PvLine` (the caller owns the async
 * Stockfish call). Draws the first move (green); the board stays put, so it does
 * NOT fan out multi-ply arrows whose later origins are empty on the static board
 * — it shows the KEY move and names the short continuation, the way he traces
 * "the idea is …" with one arrow. Null when the PV is empty.
 */
export function bestLineDeltaFromPv(pv: PvLine | null): DeltaAside | null {
  if (!pv || pv.plies.length === 0) return null;
  const first = pv.plies[0];
  if (!first.uci || first.uci.length < 4) return null;
  const from = first.uci.slice(0, 2);
  const to = first.uci.slice(2, 4);
  // Name the next up-to-3 plies so the "line" is heard even though only the key
  // move is drawn (the board is static; later arrows would start on empty
  // squares). Danya says the line and draws the first move.
  const line = pv.plies.slice(0, 3).map((p) => cleanSan(p.san)).join(', ');
  const say = `The strongest line here runs ${line}.`;
  const short = `Best: ${cleanSan(first.san)}.`;
  return {
    arrows: [{ from, to, color: 'green' }],
    say,
    short,
  };
}

// ─── LIVE engine punishment — a punish available RIGHT NOW, from the eval ────
/**
 * A punishing shot the STUDENT (to move) has available, detected from the engine
 * eval the Play surface ALREADY computes every position (David 2026-07-24: "call
 * out when a punishment line is found for the user … quick enough before the user
 * moves?"). No new engine call — reads `latestTopLines` — so the callout adds
 * ZERO latency beyond the eval that was going to run anyway.
 *
 * Fires ONLY on a genuine tactical shot: the position is clearly winning for the
 * student AND one move stands out (a real find-the-move, not a quiet edge where
 * many moves are fine). The `callout` WITHHOLDS the move; the `reveal` names it.
 *
 * PAYOFF DISCIPLINE (same as the gem packaging fix): the eval does NOT tell us
 * WHAT is won, so the reveal speaks an eval-magnitude verdict ("you're winning",
 * "clearly better") — NEVER "wins a pawn"/material, which we cannot prove here.
 */
export interface EnginePunishCue {
  callout: string;
  reveal: string;
  arrows: NarrationArrow[];
  /** Dedup / speak-once key (the best move's UCI). */
  key: string;
}

const ENGINE_CALLOUTS = [
  'Hold on — there is a strong shot for you right here. Can you find it?',
  'This is your moment — there is a punish in the position. Look for it.',
  'There is a real chance here. One move stands out — do you see it?',
];

/** WIN margin (student-POV cp) to call a position "clearly winning" for a shot. */
const PUNISH_WIN_CP = 150;
/** How much the best move must beat the runner-up to count as ONE clear shot. */
const PUNISH_GAP_CP = 150;
/** Chess.js caps eval near mate; anything past this reads as decisive. */
const DECISIVE_CP = 1000;

export function detectEnginePunish(
  fen: string,
  topLines: AnalysisLine[],
  studentWB: 'w' | 'b',
): EnginePunishCue | null {
  if (topLines.length === 0) return null;
  const best = topLines[0];
  if (!best.moves || best.moves.length === 0) return null;
  const toStudent = (cpWhitePov: number): number => (studentWB === 'w' ? cpWhitePov : -cpWhitePov);
  const bestCp = toStudent(best.evaluation);
  const bestMate = best.mate; // plies to mate, sign = white-POV; null when none
  const studentMating = bestMate != null && (studentWB === 'w' ? bestMate > 0 : bestMate < 0);

  // Must be clearly winning for the student.
  if (!studentMating && bestCp < PUNISH_WIN_CP) return null;

  // Must be ONE clear shot (a tactic), not a position where lots of moves win.
  if (topLines.length >= 2 && !studentMating) {
    const secondCp = toStudent(topLines[1].evaluation);
    if (bestCp - secondCp < PUNISH_GAP_CP) return null;
  }

  const uci = best.moves[0];
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);

  // Name the best move + a short continuation in SAN (board stays put; draw only
  // the first move's arrow).
  let sanLine = '';
  try {
    const c = new Chess(fen);
    const sans: string[] = [];
    for (const u of best.moves.slice(0, 3)) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u.slice(4) : undefined });
      if (!m) break;
      sans.push(cleanSan(m.san));
    }
    sanLine = sans.join(', ');
  } catch {
    return null;
  }
  if (sanLine.length === 0) return null;

  const verdict = studentMating
    ? "and it's a forced mate"
    : bestCp >= DECISIVE_CP
      ? "and you're completely winning"
      : bestCp >= 300
        ? "and you're winning"
        : "and you're clearly better";
  const callout = ENGINE_CALLOUTS[from.charCodeAt(0) % ENGINE_CALLOUTS.length];
  return {
    callout,
    reveal: `The strongest shot is ${sanLine}, ${verdict}.`,
    arrows: [{ from, to, color: 'green' }],
    key: uci,
  };
}
