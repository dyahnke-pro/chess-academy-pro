// Types for the handwritten-spoken merge script's testable surface.

/** What the corpus says about one note, keyed by note id. `kind` is derived
 *  from the note's OWN `lineSan`, never from the handwritten file's claim. */
export declare function corpusSources(): Map<string, { explains: string; kind: 'anchored' | 'floating' }>;

/** Every reason the handwritten file would be refused, as `"<id>: <reason>"`.
 *  Empty means it passes. */
export declare function validateHandwritten(
  hand: Record<string, { spoken?: string; kind?: string; unspeakable?: string }>,
  sources: Map<string, { explains: string; kind: 'anchored' | 'floating' }>,
): string[];
