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
