// A FACT AS THE DECIDING DOOR TAKES IT, for tests (WO-STORY-MATRIX-01 P1-5).
// The door takes objects: every record it weighs rides on the fact. A test
// names the records it cares about; the kind comes from `kind` or the text's
// own `[tag]`, as Review's facets carry it — a fact with neither is a broken
// fixture, never a guess.
import { toCoachFact } from '../services/coachFact';
import { facetTag, type FactKind } from '../services/reviewFacetRank';
import { NO_PROOF } from '../services/proof';
import type { DoorFact } from '../services/coachDecider';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
let next = 0;

type Records = Partial<Pick<DoorFact, 'id' | 'squares' | 'stakes' | 'proof' | 'claims' | 'seat' | 'skill' | 'hole' | 'fen'>> & { kind?: FactKind };

export function doorFact(text: string, r: Records = {}): DoorFact {
  const kind = r.kind ?? facetTag(text);
  if (kind === null) throw new Error(`doorFact: "${text}" names no kind`);
  return toCoachFact({
    id: r.id ?? `test:${next++}`, kind, text, fen: r.fen ?? FEN,
    squares: r.squares ?? [], claims: r.claims ?? [], stakes: r.stakes ?? null,
    proof: r.proof ?? NO_PROOF.description, seat: r.seat ?? 'student', namesStudentMove: false,
    ...(r.skill ? { skill: r.skill } : {}), ...(r.hole !== undefined ? { hole: r.hole } : {}),
  });
}
