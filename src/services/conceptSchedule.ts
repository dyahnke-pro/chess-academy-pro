// CONCEPT-LEVEL SPACED RETRIEVAL, folded into the mistake drills (David
// 2026-09-30: "Fold into mistake drills" — no new screen, no new store).
//
// Every mistake card already carries its concept: `bucketForMistake` files it
// under the idea it missed (a fork, an unfavourable trade, a rook ending). The
// card-level SRS schedules the POSITION; this schedules the IDEA. When the
// student misses one card of a concept, the idea failed — not only that board —
// so the concept's other open cards come due today and the drill queue (which
// already groups by concept) retests the idea on fresh positions.
//
// A generic phase bucket ("mistakes in the middlegame") is not a concept: it
// names when the slip happened, not what was missed, so it never pulls.
import { bucketForMistake } from './weaknessSpine';
import type { MistakePuzzle } from '../types';

/** The concept a card teaches, or null when its bucket is only a phase. */
export function mistakeConcept(p: MistakePuzzle): string | null {
  const key = bucketForMistake(p).clusterId.replace(/^analysis:/, '');
  return key.startsWith('phase:') ? null : key;
}

/** The ids of the cards to bring due today after `missed` was failed: the
 *  same concept, not mastered, not already due. Pure. */
export function conceptSiblingsToPull(missed: MistakePuzzle, all: readonly MistakePuzzle[], today: string): string[] {
  const concept = mistakeConcept(missed);
  if (!concept) return [];
  return all
    .filter((p) => p.id !== missed.id && p.status !== 'mastered' && p.srsDueDate > today && mistakeConcept(p) === concept)
    .map((p) => p.id);
}
