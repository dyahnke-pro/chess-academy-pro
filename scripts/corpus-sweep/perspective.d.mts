// Types for the corpus-sweep perspective rewriter.
//
// The implementation is plain ESM so the sweep script and the TypeScript gate
// consume the SAME module (the repo's `*.mjs` + `*.d.mts` convention). Without
// this, the import is an implicit `any` and every call an unsafe call.
// Signature read off the implementation — keep both in step in one commit.

/** Rewrite narration into the app's one perspective (student "you/your",
 *  opponent "they/their"). Returns the input unchanged when it is not a
 *  non-empty string. */
export declare function rewritePerspective(text: string): string;
