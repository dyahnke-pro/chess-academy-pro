// Types for the test-only-exports scanner (G8.5 gate: src/test/testOnlyExports.gate.test.ts).

/** A src/ module comment-stripped for word counting. */
export declare function stripComments(src: string): string;

/** Every exported value in src/ no production code reads, and every src/
 *  module no production file imports. */
export declare function scan(): {
  unused: Array<{ file: string; name: string }>;
  deadModules: string[];
};

/** The files among `candidates` a production `file` loads through
 *  `import.meta.glob(...)` (negated patterns excluded). */
export declare function globbedFiles(file: string, text: string, candidates: readonly string[]): string[];
