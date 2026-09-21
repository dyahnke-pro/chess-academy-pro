// Types for the anchor-derivation script's testable surface.

/** Maximal runs of consecutive SAN-shaped tokens in prose, each run a
 *  space-joined string. `min` is the shortest run worth returning. */
export declare function sanRuns(text: string, min?: number): string[];

/** The line a note's own prose proves it sits on, as SAN, or null when no
 *  single line is provable — which is the answer far more often than not. */
export declare function deriveAnchor(
  note: { explains?: string; teaches?: string; plans?: string; lineSan?: string[] },
  dbPrefixes: ReadonlySet<string>,
): string[] | null;
