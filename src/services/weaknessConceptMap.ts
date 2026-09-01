/**
 * weaknessConceptMap — roll a specific motif up into a BEHAVIOR and a teachable
 * CONCEPT (David 2026-09-01: "if coach can bring it back to a set of behaviors
 * or a larger CONCEPT/theme and teach that — that would be amazing").
 *
 * A student doesn't want to hear "you missed a fork on move 14" twenty times;
 * they want "you overlook loose pieces — here's the principle." This maps the
 * cluster ids that weaknessSpine.bucketForMistake produces (analysis:tactic:*,
 * analysis:transform:*, analysis:phase:*) to a one-line behavior + a corpus
 * query the theory search can ground the teaching on (chess-concepts.json —
 * Capablanca/Lasker). G0/G3: the concept TEXT still comes from the book corpus
 * (searchTheoryPassage), never from the model; this only names WHICH concept.
 */
import type { MisconceptionBucket } from '../data/misconceptionTags';

export interface WeaknessConcept {
  /** The behavior pattern in plain English (the "so what"). */
  behavior: string;
  /** Free-text fed to searchTheoryPassage / detectConceptsInText to pull the
   *  grounding passage. */
  conceptQuery: string;
  /** Display name of the concept/theme. */
  conceptName: string;
}

// Tactic-motif clusters (analysis:tactic:<TacticType>).
const TACTIC_CONCEPTS: Record<string, WeaknessConcept> = {
  fork: { behavior: 'you overlook forks — one piece hitting two targets at once', conceptQuery: 'fork knight attacks two pieces double attack', conceptName: 'the fork / double attack' },
  pin: { behavior: 'you miss pins — a piece stuck in front of a more valuable one', conceptQuery: 'pin pinned piece cannot move king behind', conceptName: 'the pin' },
  skewer: { behavior: 'you miss skewers — a valuable piece forced to move off a lesser one', conceptQuery: 'skewer attack valuable piece behind', conceptName: 'the skewer' },
  hanging_piece: { behavior: 'you leave pieces undefended — loose pieces drop off', conceptQuery: 'undefended piece protection hanging attack', conceptName: 'protecting loose pieces' },
  discovered_attack: { behavior: 'you miss discovered attacks — moving one piece unveils another', conceptQuery: 'discovered attack unveil piece behind', conceptName: 'the discovered attack' },
  back_rank: { behavior: 'you overlook back-rank weaknesses — your king boxed in by its own pawns', conceptQuery: 'back rank weakness king trapped luft', conceptName: 'back-rank safety' },
  deflection: { behavior: 'you miss deflections — driving a defender off its post', conceptQuery: 'deflection remove defender', conceptName: 'the deflection' },
  overloaded_piece: { behavior: 'you overload defenders — asking one piece to guard too much', conceptQuery: 'overloaded piece defender too many duties', conceptName: 'the overloaded defender' },
  trapped_piece: { behavior: 'you let pieces get trapped — no safe square to retreat to', conceptQuery: 'trapped piece no escape square', conceptName: 'trapped pieces' },
  removing_the_guard: { behavior: 'you miss remove-the-defender shots', conceptQuery: 'remove the defender capture guard', conceptName: 'removing the defender' },
};

// Positional-transformation clusters (analysis:transform:<motif>).
const TRANSFORM_CONCEPTS: Record<string, WeaknessConcept> = {
  'unfavorable-trade': { behavior: 'you trade into worse positions — swapping your better piece or damaging your structure', conceptQuery: 'exchange value of pieces when to trade good bishop bad bishop', conceptName: 'the value of the exchange' },
  'missed-favorable-trade': { behavior: 'you miss good trades — you keep pieces you should swap off', conceptQuery: 'exchange simplification trade when ahead', conceptName: 'trading correctly' },
};

// Phase clusters (analysis:phase:<phase>) — the catch-all fallback per bucket.
const PHASE_CONCEPTS: Record<string, WeaknessConcept> = {
  opening: { behavior: 'you slip in the opening — development or the centre', conceptQuery: 'opening principles develop pieces control centre king safety', conceptName: 'opening principles' },
  middlegame: { behavior: 'you drift in the middlegame — no clear plan or weak squares', conceptQuery: 'middlegame plan weak square outpost pawn structure', conceptName: 'middlegame planning' },
  endgame: { behavior: 'you lose the thread in endgames — technique and king activity', conceptQuery: 'endgame king activity passed pawn opposition technique', conceptName: 'endgame technique' },
};

const BUCKET_FALLBACK: Partial<Record<MisconceptionBucket, WeaknessConcept>> = {
  tactical: { behavior: 'you miss tactics — the forcing shot on the board', conceptQuery: 'tactics combination forcing move calculation', conceptName: 'tactical alertness' },
  positional: { behavior: 'you misjudge positional trades and structure', conceptQuery: 'positional pawn structure weak square piece activity', conceptName: 'positional judgment' },
  opening: PHASE_CONCEPTS.opening,
  endgame: PHASE_CONCEPTS.endgame,
  general: PHASE_CONCEPTS.middlegame,
};

/** Roll a weakness cluster up to its behavior + teachable concept, or null when
 *  we have no honest mapping (never guess a concept). */
export function conceptForCluster(clusterId: string, bucket: MisconceptionBucket): WeaknessConcept | null {
  const tactic = /^analysis:tactic:(.+)$/.exec(clusterId);
  if (tactic && TACTIC_CONCEPTS[tactic[1]]) return TACTIC_CONCEPTS[tactic[1]];
  const transform = /^analysis:transform:(.+)$/.exec(clusterId);
  if (transform && TRANSFORM_CONCEPTS[transform[1]]) return TRANSFORM_CONCEPTS[transform[1]];
  const phase = /^analysis:phase:(.+)$/.exec(clusterId);
  if (phase && PHASE_CONCEPTS[phase[1]]) return PHASE_CONCEPTS[phase[1]];
  return BUCKET_FALLBACK[bucket] ?? null;
}
