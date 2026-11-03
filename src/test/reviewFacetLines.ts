// Review's facts as readable lines, for test assertions (WO-STORY-MATRIX-01
// P1-6d). The facts carry their tag, squares, seat, stakes, proof, claims and
// identity; a test that asserts on what Review says reads them as one line
// each (`[tag] words`) and looks a fact's records up by that line.
import type { ReviewFacet } from '../services/reviewFacet';
import { NO_PROOF, type FactProof } from '../services/proof';
import type { FactStakes } from '../services/factStakes';

/** One fact as the line a test reads: its tag, then its words. */
export const facetLine = (f: ReviewFacet): string => `[${f.tag}] ${f.text}`;

/** Every fact of a move as its line. */
export function facetLines(facts: readonly ReviewFacet[]): string[] {
  return facts.map(facetLine);
}

/** What each fact's computer recorded, keyed by its line — only what was
 *  recorded (no default proof, no empty squares). */
export function facetRecords(facts: readonly ReviewFacet[]): {
  squares: Map<string, readonly string[]>;
  incoming: Set<string>;
  stakes: Map<string, FactStakes>;
  identity: Map<string, string>;
  proofs: Map<string, FactProof>;
  claims: Map<string, readonly string[]>;
} {
  const squares = new Map<string, readonly string[]>();
  const incoming = new Set<string>();
  const stakes = new Map<string, FactStakes>();
  const identity = new Map<string, string>();
  const proofs = new Map<string, FactProof>();
  const claims = new Map<string, readonly string[]>();
  for (const f of facts) {
    const line = facetLine(f);
    if (f.squares.length) squares.set(line, f.squares);
    if (f.seat === 'opponent') incoming.add(line);
    if (f.stakes) stakes.set(line, f.stakes);
    if (f.identity) identity.set(line, f.identity);
    if (f.proof !== NO_PROOF.description) proofs.set(line, f.proof);
    if (f.claims.length) claims.set(line, f.claims);
  }
  return { squares, incoming, stakes, identity, proofs, claims };
}
