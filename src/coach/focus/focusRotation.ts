/**
 * ONE FOCUS PER PHASE, ROTATED BY THE RECORD (Coach Build Board "4. Focuses",
 * David 2026-11-24): develop and castle in the opening, then tactics or attack
 * the king in the middlegame, then endgame technique in the endgame. Each
 * phase rotates through the student's RED and GREY skills, worst first, and
 * never the same one twice running. The one hold-rate computer (`holdRate`)
 * says red, grey and how bad.
 *
 * The pick is the skill SPOKEN in its phase (its misses are taught); every
 * other skill of the phase is still scored and recorded silently, so the
 * record keeps measuring them. The tactics guarantee — one real motif planted
 * every game (`focusPlant`) — runs whatever the middlegame pick is.
 *
 * Pure: the holds and the last game's picks in, the phase plan out.
 */
import type { MisconceptionTagId } from '../../data/misconceptionTags';
import { MOTIFS, tagOpenAt, type MotifLevel } from '../../data/tacticMotifs';
import { holdState, type HeatState, type HoldRecord } from '../../services/holdRate';
import type { MissionPhase } from '../../missions/missionCard';

/** The focus a phase runs. A new member fails to compile until `PHASE_FOCUS`,
 *  `FOCUS_SKILLS` and `FOCUS_WORDS` answer for it. */
export type PhaseFocusId = 'develop-and-castle' | 'tactics' | 'attack-king' | 'endgame-technique';

export const PHASES: readonly MissionPhase[] = ['opening', 'middlegame', 'endgame'];

/** Which foci each phase may run. */
export const PHASE_FOCUS: Record<MissionPhase, readonly PhaseFocusId[]> = {
  opening: ['develop-and-castle'],
  middlegame: ['tactics', 'attack-king'],
  endgame: ['endgame-technique'],
};

/** The tactics focus's skills: your side of every motif except the free piece
 *  (David: "a real motif, never just a free piece"). */
const TACTIC_SKILLS: readonly MisconceptionTagId[] = Object.values(MOTIFS)
  .filter((m) => m.id !== 'free-piece')
  .map((m) => m.yours);

/** The skills each focus teaches — the record tags its judge writes. Each is
 *  scored BOTH ways: the opening by the develop rule (`breaksDevelopRule`),
 *  tactics by the chance reader, the attack by `kingAttackJudge`, the endgame
 *  by `endgameTechniqueJudge`. */
export const FOCUS_SKILLS: Record<PhaseFocusId, readonly MisconceptionTagId[]> = {
  'develop-and-castle': ['neglected-development', 'king-stuck-center'],
  tactics: TACTIC_SKILLS,
  'attack-king': ['missed-king-attack'],
  'endgame-technique': ['passive-king-endgame', 'passed-pawn-neglected', 'passive-rook'],
};

/** The focus a skill belongs to (one skill, one focus). */
export function focusOfSkill(tag: MisconceptionTagId): PhaseFocusId | null {
  for (const [id, tags] of Object.entries(FOCUS_SKILLS) as [PhaseFocusId, readonly MisconceptionTagId[]][]) {
    if (tags.includes(tag)) return id;
  }
  return null;
}

export interface PhasePick {
  focus: PhaseFocusId;
  /** The skill taught out loud in this phase. */
  skill: MisconceptionTagId;
  /** The skill's record state when the game began. */
  state: HeatState;
}

export type PhasePlan = Record<MissionPhase, PhasePick>;

/** Worse first: red (lowest hold first), then grey, then amber, then green
 *  (lowest hold first). */
const STATE_ORDER: Record<HeatState, number> = { red: 0, grey: 1, short: 2, green: 3 };

/** The phase's skills, worst first. */
export function worstFirst(skills: readonly MisconceptionTagId[], holds: ReadonlyMap<MisconceptionTagId, HoldRecord>): MisconceptionTagId[] {
  return skills
    .map((tag, i) => ({ tag, i, state: holdState(holds.get(tag)), rate: holds.get(tag)?.rate ?? null }))
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]
      || (a.state === 'grey' ? 0 : (a.rate ?? 0) - (b.rate ?? 0))
      || a.i - b.i)
    .map((x) => x.tag);
}

/**
 * THE ROTATION: the phase's red and grey skills, worst first; the next one
 * after the one the last game taught (round the list), so the rotation goes
 * through every skill the record needs and never repeats the last. With no
 * red or grey skill, every skill of the phase, worst first, the same way.
 */
export function pickPhase(
  phase: MissionPhase,
  holds: ReadonlyMap<MisconceptionTagId, HoldRecord>,
  open: ReadonlySet<MotifLevel>,
  last: MisconceptionTagId | null,
): PhasePick {
  const skills = PHASE_FOCUS[phase].flatMap((f) => FOCUS_SKILLS[f]).filter((t) => tagOpenAt(t, open));
  const ranked = worstFirst(skills, holds);
  const needed = ranked.filter((t) => { const s = holdState(holds.get(t)); return s === 'red' || s === 'grey'; });
  const pool = needed.length > 0 ? needed : ranked;
  const at = last ? pool.indexOf(last) : -1;
  const skill = pool.length > 1 && at >= 0 ? pool[(at + 1) % pool.length] : pool[0];
  return { focus: focusOfSkill(skill) ?? PHASE_FOCUS[phase][0], skill, state: holdState(holds.get(skill)) };
}

export function planPhases(
  holds: ReadonlyMap<MisconceptionTagId, HoldRecord>,
  open: ReadonlySet<MotifLevel>,
  last: Partial<Record<MissionPhase, MisconceptionTagId>>,
): PhasePlan {
  return {
    opening: pickPhase('opening', holds, open, last.opening ?? null),
    middlegame: pickPhase('middlegame', holds, open, last.middlegame ?? null),
    endgame: pickPhase('endgame', holds, open, last.endgame ?? null),
  };
}

/** How each skill is named in the pre-game line — FIXED words (repetition
 *  builds the habit), so the line changes only when the pick does. */
const SKILL_WORDS: Partial<Record<MisconceptionTagId, string>> = {
  'neglected-development': 'developing each knight and bishop once',
  'king-stuck-center': 'castling early',
  'missed-king-attack': 'attacking the king',
  'passive-king-endgame': 'an active king',
  'passed-pawn-neglected': 'pushing passed pawns',
  'passive-rook': 'active rooks',
};

/** A phase's focus in words: the skill's own words, or a motif's label
 *  ("forks", "removing the guard"). */
export function skillWords(tag: MisconceptionTagId): string {
  const own = SKILL_WORDS[tag];
  if (own) return own;
  const motif = Object.values(MOTIFS).find((m) => m.yours === tag);
  return motif ? motif.label.toLowerCase() : 'tactics';
}

/** THE PRE-GAME LINE NAMES THE GAME'S FOCUS AND ROTATES WITH IT (David
 *  2026-11-24). The tactics promise closes it every game: a real motif is
 *  planted whatever the middlegame's pick. */
export function pregameLine(plan: PhasePlan): string {
  return `Today's focus: in the opening, ${skillWords(plan.opening.skill)}; in the middlegame, ${skillWords(plan.middlegame.skill)}; in the endgame, ${skillWords(plan.endgame.skill)}. `
    + 'You will have at least one chance this game for a winning tactic, but your opponent will also be trying to set up its own tactics. Stay vigilant!';
}
