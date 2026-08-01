// gemPunishLessons — put the CURATED WEAPONS into the coach's punish stage.
//
// David 2026-08-01: "we are building out the gem/punish lines in coach."
//
// The coach's punish stage mined the Lichess puzzle DB and nothing else, so the
// 388 hand-curated gems — the opponent slips your rating actually plays, each
// refutation engine-verified and tiered, each played out to a quiet position
// where the material is on the board, each narrated ply by ply by hand — were
// invisible on the coach tab. They only ever surfaced on the opening tab's
// weapon section. The coach was teaching tactics puzzles that merely mention
// the opening while the real weapons for that exact opening sat unused.
//
// A gem is strictly better raw material than a puzzle here:
//   • its inaccuracy is what opponents at this level really play (explorer
//     frequency), not a puzzle position that happens to be tagged;
//   • its punish is the engine's, graded at a quiet terminus, tiered ≥ +0.5;
//   • its continuation ALREADY plays the advantage out (`demonstrationPlies`);
//   • its prose is hand-authored, so no LLM call is needed to label it.
//
// So this conversion is pure code with no model in the loop at all (G0), and
// nothing is invented (G3): every move comes from the gem, replayed through
// chess.js, and any gem that fails to replay is dropped rather than repaired.
import { Chess } from 'chess.js';
import {
  getPunishGemsForOpening,
  isSurfaceableGem,
  gemId,
  gemNarrationFor,
  type PunishGem,
} from '../data/lessons/punishGems';
import { narrateContinuationMove } from './continuationMoveNarration';
import repertoireData from '../data/repertoire.json';
import type { PunishLesson } from '../types';

/** How many weapons the coach's punish stage carries. Matches the puzzle
 *  path's own ceiling so the two sources produce a stage of the same size. */
const MAX_COACH_LESSONS = 5;

/** Rank a legal alternative as a plausible-but-wrong choice. Mirrors the
 *  puzzle path's scorer: forcing, central and developing moves read as real
 *  candidates, edge shuffles do not — a distractor nobody would consider
 *  teaches nothing. */
function scoreDistractor(san: string): number {
  let score = 0;
  if (san.includes('x')) score += 3;
  if (san.includes('+')) score += 3;
  if (/^[NB]/.test(san)) score += 2;
  if (/[cde][45]/.test(san)) score += 2;
  if (/^O-O/.test(san)) score += 1;
  if (/^[ah]/.test(san)) score -= 2;
  if (/^K/.test(san)) score -= 3;
  return score;
}

/** Trim the trailing "…" / whitespace a cue can carry, so two joined beats do
 *  not read as one run-on sentence. */
function tidy(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Convert one curated gem into the coach's `PunishLesson` shape.
 * Returns null when the gem cannot be replayed exactly as recorded.
 */
export function gemToPunishLesson(gem: PunishGem): PunishLesson | null {
  const setupMoves = gem.lineMoves.split(/\s+/).filter(Boolean);
  const narration = gemNarrationFor(gemId(gem));

  const chess = new Chess();
  for (const san of setupMoves) {
    try {
      if (!chess.move(san)) return null;
    } catch {
      return null;
    }
  }
  const setupFen = chess.fen();

  // The opponent's slip.
  try {
    if (!chess.move(gem.inaccuracy)) return null;
  } catch {
    return null;
  }
  const postInaccuracyFen = chess.fen();

  // The refutation.
  try {
    if (!chess.move(gem.punish)) return null;
  } catch {
    return null;
  }

  // THE PLAY-OUT. `punishSeq` already runs to a quiet position where the
  // material is on the board (extend-punish-gems), so the coach inherits a
  // line that lands instead of one that stops on the punish — the whole point
  // of this wiring. Authored prose per ply where it exists; past the authored
  // beats the board composes its own, exactly as the opening tab's gem tail
  // does, so the tail explains rather than replaying moves in silence.
  const inaccuracyPly = setupMoves.length;
  const punishPly = inaccuracyPly + 1;
  const followup: PunishLesson['followup'] = [];
  const tail = (gem.punishSeq ?? []).slice(1);
  for (let i = 0; i < tail.length; i += 1) {
    const fenBefore = chess.fen();
    let san = tail[i];
    let from = '';
    let to = '';
    try {
      const mv = chess.move(tail[i]);
      if (!mv) break;
      san = mv.san;
      from = mv.from;
      to = mv.to;
    } catch {
      break;
    }
    const ply = punishPly + 1 + i;
    const authored = tidy(narration?.watch[ply] ?? '');
    const authoredShort = tidy(narration?.learn[ply] ?? '');
    const computed = authored && authoredShort
      ? null
      : narrateContinuationMove(fenBefore, chess.fen(), san, from, to);
    followup.push({
      san,
      idea: authored || computed?.say || '',
      shortIdea: authoredShort || computed?.short || '',
    });
  }

  // Plausible wrong answers at the moment of choice.
  const probe = new Chess(postInaccuracyFen);
  const distractors = probe
    .moves()
    .filter((san) => san !== gem.punish)
    .map((san) => ({ san, score: scoreDistractor(san) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => ({
      san: c.san,
      label: 'Plausible, but not the punish',
      // Deliberately NOT a claim about what happens after this move — no
      // engine has looked at it. Saying "this loses a pawn" would be the model
      // deciding chess content; saying what IS known (it is not the refutation)
      // is honest and still teaches the choice.
      explanation: `${c.san} is legal and looks natural, but it lets the position settle instead of punishing ${gem.inaccuracy}.`,
    }));
  // ONE alternative is enough. The puzzle path demands two because a mined
  // puzzle with fewer is usually junk, but a gem is curated and its refutation
  // is often a FORCED recapture — the Caro's Bxf7+ leaves Black exactly one
  // other legal move (Ke7). Dropping those would throw away the cleanest
  // weapons in the set for having too few wrong answers, and a two-way choice
  // is still a choice. The runtime's own gate (`isStartablePunishLesson`) also
  // asks for one, so this matches what the walkthrough will actually accept.
  if (distractors.length < 1) return null;

  const whyBad = tidy(narration?.watch[inaccuracyPly] ?? '')
    || `${gem.inaccuracy} is a common try here, and at your level it scores worse for your opponent than the main move.`;
  const whyPunish = tidy(narration?.watch[punishPly] ?? '') || `Punish with ${gem.punish}.`;

  return {
    name: `Punish ${gem.inaccuracy} with ${gem.punish}`,
    // The locked trap taxonomy, read off the ENGINE's tier rather than guessed:
    // `confirmed` (≥ +1.0) is a concrete refutation — a red TRAP; `positional`
    // (+0.5..+1.0) is "now you are better" by principle — an amber MISTAKE.
    // Never surface an unvetted entry as a red trap.
    kind: gem.tier === 'confirmed' ? 'trap' : 'mistake',
    setupFen,
    setupMoves,
    inaccuracy: gem.inaccuracy,
    punishment: gem.punish,
    whyBad,
    shortWhyBad: tidy(narration?.learn[inaccuracyPly] ?? '') || undefined,
    whyPunish,
    shortWhyPunish: tidy(narration?.learn[punishPly] ?? '') || undefined,
    distractors,
    followup,
  };
}

/** Every curated weapon for this opening, in the coach's punish shape.
 *  Surfaceable gems only — the same bar the opening tab applies, so an
 *  unnarrated or sub-weapon gem never reaches a student here either. */
export function gemPunishLessonsForOpening(
  openingId: string | undefined | null,
  limit = MAX_COACH_LESSONS,
): PunishLesson[] {
  if (!openingId) return [];
  // STRONGEST FIRST, and stop converting once the stage is full. The coach
  // shows a handful of lessons, so converting every gem for a well-mined
  // opening burns replay work nobody sees — and ordering by tier means the
  // ones that DO show are the confirmed crushes, not whichever happened to be
  // mined first.
  const ranked = getPunishGemsForOpening(openingId)
    .filter(isSurfaceableGem)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === 'confirmed' ? -1 : 1;
      // Then by how often the slip actually appears — a weapon your opponent
      // never walks into is a worse lesson than one they play every game.
      return b.freqPct - a.freqPct;
    });
  const out: PunishLesson[] = [];
  for (const gem of ranked) {
    if (out.length >= limit) break;
    const lesson = gemToPunishLesson(gem);
    if (lesson) out.push(lesson);
  }
  return out;
}

/** Gems are keyed by kebab opening id, but the coach's stage generator works
 *  from the canonical NAME, so the two have to be joined. `repertoire.json`
 *  carries both, which makes it the join table — no new mapping to drift. */
const ID_BY_NAME = new Map<string, string>(
  (repertoireData as Array<{ id?: string; name?: string }>)
    .filter((e) => e.id && e.name)
    .map((e) => [(e.name as string).toLowerCase(), e.id as string]),
);

/** The curated weapons for an opening named the way the coach names it.
 *  Returns [] for any opening with no gems — most of the 3,000 DB entries —
 *  and the puzzle path then runs exactly as before. */
export function gemPunishLessonsForOpeningName(
  openingName: string | undefined | null,
): PunishLesson[] {
  if (!openingName) return [];
  const name = openingName.toLowerCase().trim();
  const direct = ID_BY_NAME.get(name);
  if (direct) return gemPunishLessonsForOpening(direct);
  // A coach session often resolves to a VARIATION ("Vienna Game: Falkbeer
  // Variation"), while gems are keyed at the family. Fall back to the longest
  // family name that prefixes it, so a variation still gets its family's
  // weapons rather than none.
  let best: string | null = null;
  for (const [famName, famId] of ID_BY_NAME) {
    if (name.startsWith(famName) && (!best || famName.length > best.length)) {
      best = famName;
      void famId;
    }
  }
  return best ? gemPunishLessonsForOpening(ID_BY_NAME.get(best) as string) : [];
}
