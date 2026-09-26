// Types for the spoken-bake script's testable surface. Both return a REASON
// string when the candidate is refused and null when it passes — null is the
// success case, which is easy to read backwards.

/** The spoken form asserts something the source note does not. */
export declare function fidelityBreach(source: string, out: string): string | null;

/** Every reason this spoken form may not ship for a note of `kind`. */
export declare function gateSpoken(source: string, out: string, kind: 'anchored' | 'floating'): string | null;

/** Every note id a registered corpus (path + floatingPath) still carries. */
export declare function liveNoteIds(): Set<string>;

/** The bake restricted to live note ids. */
export declare function pruneBake<T>(bake: Record<string, T>, live?: Set<string>): Record<string, T>;
