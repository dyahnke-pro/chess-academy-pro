/**
 * gameThemeClassifier — Phase 5 of the Danya review build: the emergent
 * theme of the game.
 *
 * Tape-calibrated (2026-07-18 second pass): Danya NEVER opens with the
 * theme — it EMERGES, named at the moment the evidence peaks ("this is
 * the thread of the game"), reprised at the turning-point reveal. So the
 * classifier returns the PEAK-EVIDENCE PLY along with the theme, and the
 * intro stays factual — a borderline theme is simply never spoken.
 *
 * G0: a CLOSED theme set, multi-evidence predicates over the computed
 * eval trace + classifications + board structure, a hard confidence
 * floor with a margin over the runner-up, and an honest no-theme null.
 * The spoken lines are curated templates carrying computed numbers.
 */
import { describeStructure } from './boardStructure';
import type { ReviewMoveSegment } from './coachFeatureService';

export type GameTheme =
  | 'squandered-advantage'
  | 'comeback'
  | 'one-slip'
  | 'tactical-slugfest'
  | 'opposite-wing-race'
  | 'endgame-grind'
  | 'positional-squeeze';

export interface GameThemeResult {
  theme: GameTheme;
  /** The ply where the theme became undeniable — name it HERE. */
  peakPly: number;
  confidence: number;
  /** The full "thread of the game" line, spoken at the peak. */
  line: string;
  /** Short reprise for the turning-point reveal / closing beat. */
  reprise: string;
}

const CONFIDENCE_FLOOR = 0.7;
const RUNNER_UP_MARGIN = 0.1;

type Candidate = GameThemeResult;

const pawns = (cp: number): string => (Math.abs(cp) / 100).toFixed(1);
const moveOf = (ply: number): number => Math.ceil(ply / 2);

export function classifyGameTheme(
  segments: ReadonlyArray<ReviewMoveSegment>,
  playerColor: 'white' | 'black',
): GameThemeResult | null {
  if (segments.length < 10) return null; // too short for a thread

  const pov = (cp: number): number => (playerColor === 'white' ? cp : -cp);
  const evals = segments
    .filter((s) => s.evalAfter !== null)
    .map((s) => ({ ply: s.ply, cp: pov(s.evalAfter as number) }));
  if (evals.length < 8) return null;

  const isPlayer = (s: ReviewMoveSegment): boolean => s.playerColor === playerColor;
  const slips = (who: 'player' | 'opp', kinds: string[]): ReviewMoveSegment[] =>
    segments.filter(
      (s) => (who === 'player' ? isPlayer(s) : !isPlayer(s)) && s.classification !== null && kinds.includes(s.classification),
    );
  const playerErrors = slips('player', ['mistake', 'blunder']);
  const oppErrors = slips('opp', ['mistake', 'blunder']);
  const allBlunders = [...slips('player', ['blunder']), ...slips('opp', ['blunder'])];

  const final = evals[evals.length - 1];
  const max = evals.reduce((a, b) => (b.cp > a.cp ? b : a));
  const min = evals.reduce((a, b) => (b.cp < a.cp ? b : a));

  const candidates: Candidate[] = [];

  // ── squandered-advantage: winning, then handed back by the player ──
  if (max.cp >= 250 && final.cp <= 50) {
    const slip = playerErrors.find((s) => s.ply > max.ply);
    if (slip) {
      candidates.push({
        theme: 'squandered-advantage',
        peakPly: slip.ply,
        confidence: Math.min(1, 0.7 + (max.cp - 250) / 1000),
        line: `This is the thread of the game — you were ${pawns(max.cp)} pawns up by move ${moveOf(max.ply)}, and ${slip.san} handed it back.`,
        reprise: `the ${pawns(max.cp)}-pawn advantage that slipped away`,
      });
    }
  }

  // ── comeback: lost, then taken back off the opponent's errors ──
  if (min.cp <= -250 && final.cp >= 150) {
    const gift = oppErrors.find((s) => s.ply > min.ply);
    if (gift) {
      candidates.push({
        theme: 'comeback',
        peakPly: gift.ply,
        confidence: Math.min(1, 0.7 + (-min.cp - 250) / 1000),
        line: `This is the thread of the game — ${pawns(min.cp)} pawns down at move ${moveOf(min.ply)}, and you took it all back after ${gift.san}.`,
        reprise: 'the comeback from a lost position',
      });
    }
  }

  // ── one-slip: a clean game decided by a single error. The position
  //    must have been roughly BALANCED before it — a lone blunder from
  //    an already-lost game is a comeback's final act, not the story. ──
  const allErrors = [...playerErrors, ...oppErrors];
  const preSlipBalanced = (slipPly: number): boolean => {
    const before = [...evals].reverse().find((e) => e.ply < slipPly);
    return before !== undefined && Math.abs(before.cp) < 150;
  };
  if (allErrors.length === 1 && Math.abs(final.cp) >= 150 && preSlipBalanced(allErrors[0].ply)) {
    const slip = allErrors[0];
    candidates.push({
      theme: 'one-slip',
      peakPly: slip.ply,
      confidence: 0.9,
      line: `This is the thread of the game — clean chess on both sides, decided by one moment: ${slip.san} at move ${moveOf(slip.ply)}.`,
      reprise: `the one slip that decided it`,
    });
  }

  // ── tactical-slugfest: errors both ways, eval swinging ──
  if (allErrors.length >= 4 && playerErrors.length >= 2 && oppErrors.length >= 2) {
    let swings = 0;
    let biggest = { ply: evals[0].ply, delta: 0 };
    for (let i = 1; i < evals.length; i++) {
      const delta = evals[i].cp - evals[i - 1].cp;
      if (Math.abs(delta) >= 150) swings++;
      if (Math.abs(delta) > Math.abs(biggest.delta)) biggest = { ply: evals[i].ply, delta };
    }
    if (swings >= 3) {
      candidates.push({
        theme: 'tactical-slugfest',
        peakPly: biggest.ply,
        confidence: Math.min(1, 0.65 + swings * 0.05),
        line: `This is the thread of the game — a slugfest: the advantage changed hands over and over, the biggest swing at move ${moveOf(biggest.ply)}.`,
        reprise: 'the slugfest where the advantage kept changing hands',
      });
    }
  }

  // ── opposite-wing-race: kings on opposite wings for a real stretch ──
  {
    let wingPlies = 0;
    let firstWingPly: number | null = null;
    let sampled = 0;
    for (let i = 8; i < segments.length; i += 4) {
      const s = describeStructure(segments[i].fenAfter);
      if (!s) continue;
      sampled++;
      if (s.kings.oppositeWings) {
        wingPlies++;
        if (firstWingPly === null) firstWingPly = segments[i].ply;
      }
    }
    const hadSwing = Math.abs(max.cp) >= 200 || Math.abs(min.cp) >= 200;
    if (sampled >= 3 && wingPlies / sampled >= 0.5 && firstWingPly !== null && hadSwing) {
      candidates.push({
        theme: 'opposite-wing-race',
        peakPly: firstWingPly,
        confidence: 0.6 + (wingPlies / sampled) * 0.3,
        line: 'This is the thread of the game — kings on opposite wings, both sides racing their pawns at the other king. Whoever arrives first wins.',
        reprise: 'the opposite-wing race',
      });
    }
  }

  // ── endgame-grind: the game was decided deep in an endgame ──
  {
    const tailStart = Math.max(0, segments.length - 12);
    const tail = segments.slice(tailStart);
    const endgamePlies = tail.filter((s) => describeStructure(s.fenAfter)?.material.endgameType != null);
    if (
      segments.length >= 30 &&
      endgamePlies.length >= Math.ceil(tail.length * 0.8) &&
      Math.abs(final.cp) >= 150
    ) {
      const entry = endgamePlies[0];
      candidates.push({
        theme: 'endgame-grind',
        peakPly: entry.ply,
        confidence: 0.72,
        line: `This is the thread of the game — it was always heading for the endgame, and the endgame is where it was decided.`,
        reprise: 'the endgame grind that decided it',
      });
    }
  }

  // ── positional-squeeze: no tactics, the eval just walks one way ──
  if (allBlunders.length === 0 && allErrors.length <= 1 && Math.abs(final.cp) >= 200) {
    const winnerSign = Math.sign(final.cp);
    const counterSwing = evals.some((e, i) => i > 0 && (e.cp - evals[i - 1].cp) * winnerSign <= -200);
    if (!counterSwing) {
      const crossing = evals.find((e) => e.cp * winnerSign >= 150);
      if (crossing) {
        candidates.push({
          theme: 'positional-squeeze',
          peakPly: crossing.ply,
          confidence: 0.75,
          line: `This is the thread of the game — no fireworks, just a squeeze: the advantage built one small step at a time and never came back.`,
          reprise: 'the slow squeeze',
        });
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];
  if (!best || best.confidence < CONFIDENCE_FLOOR) return null;
  const runnerUp = candidates[1];
  if (runnerUp && best.confidence - runnerUp.confidence < RUNNER_UP_MARGIN && runnerUp.theme !== best.theme) {
    return null; // ambiguous evidence — no theme beats a wrong theme
  }
  return best;
}
