// Types for the shared narration-quality module.
//
// The implementation is plain ESM so the corpus-sweep script and the runtime
// selector consume the SAME module (the repo's `*.shared.mjs` convention). This
// declaration is what lets the TypeScript side call it without a suppression —
// a `@ts-expect-error` import made every call an unsafe call, which ship-check
// correctly refused.

/** Where a clause landed, and why. */
export type NarrationClass =
  | 'teaching'
  | 'principle'
  | 'fragment'
  | 'rating'
  | 'session'
  | 'author'
  | 'priorVid'
  | 'audience'
  | 'namedPerson';

export interface ClauseVerdict {
  disposition: 'keep' | 'cut';
  class: NarrationClass;
  /** Present only on a `namedPerson` verdict: the name that triggered it. */
  name?: string;
}

export declare const BOARD_RE: RegExp;
export declare const PRED_RE: RegExp;
export declare const OPEN_REFERENCE: Readonly<Record<string, RegExp>>;

/** Names a board referent AND predicates something about chess. The veto that
 *  protects real teaching from every cut rule. */
export declare function teachesChess(clause: string): boolean;

/** A capitalised non-chess word acting like a person → the name, else null. */
export declare function namedPerson(clause: string): string | null;

/** Classify one spoken clause. */
export declare function classifyClause(clause: string): ClauseVerdict;

/** Split narration prose into spoken clauses (one utterance each). */
export declare function toClauses(text: string): string[];

/** Rank a candidate note for a ply — higher speaks. Pure and deterministic. */
export declare function scoreNarration(text: string, openingName: string | null): number;

// 🔒 KEEP THIS FILE IN STEP WITH THE .mjs (2026-09-21). The two below existed
// in the implementation and were missing here, so TypeScript reported "no
// exported member" for symbols the runtime happily provides — a hand-written
// declaration beside a JS module drifts, and the drift reads as a broken
// import rather than a stale type. When you add an export to the .mjs, add it
// here in the same commit.

/** The clause classes `trimPassage` removes by default — the ones a read of
 *  real output showed are safe to cut without taking teaching with them. */
export declare const CONFIDENT_CUT_CLASSES: readonly NarrationClass[];

/** Drop every clause whose class is in `classes`, keeping the rest in order. */
export declare function trimPassage(text: string, classes?: readonly NarrationClass[]): string;
