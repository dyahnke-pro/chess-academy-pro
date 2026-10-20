// Which creator's corpus a pipeline stage is operating on.
//
// The pipeline was built Naroditsky-pathed. A second creator needs the same
// stages against different directories and — per the runbook's standing rule —
// a SEPARATE corpus file. Voices are never mixed into one corpus: the house
// narration voice stays Naroditsky-register regardless, and another creator's
// corpus supplies IDEAS only.
//
// Every stage takes `--creator <key>` and defaults to naroditsky, so existing
// invocations behave exactly as before.

// ONE SOURCE (David 2026-09-21: "there are only one source of corpus notes.
// and its the danya ones that we have tied exactly to positions. nothing
// else!"). The seven other farmed creators were removed from the registry
// that day; their entries here are deleted too (2026-10-20), because a
// farming run on 2026-10-11 re-created saintlouis-teachings.json from this
// table. A creator that is not in src/data/corpora.json cannot be farmed.
export const CREATORS = {
  naroditsky: {
    key: 'naroditsky',
    voiceDir: 'data/sources/naroditsky-voice',
    corpus: 'src/data/danya-teachings.json',
    // Note-id prefix. Must differ per creator: the coach dedupes notes by id
    // across corpora, so a shared prefix would silently drop one corpus's note.
    idPrefix: 'dt',
    // Extra depersonalization terms beyond the shared ban, per creator: the
    // corpus must leak neither the teacher's name nor the medium.
    bannedExtra: [],
  },
};

export function resolveCreator(argv = process.argv) {
  const i = argv.indexOf('--creator');
  const key = i >= 0 ? argv[i + 1] : 'naroditsky';
  const c = CREATORS[key];
  if (!c) {
    console.error(`unknown --creator ${key}; known: ${Object.keys(CREATORS).join(', ')}`);
    process.exit(1);
  }
  return {
    ...c,
    transcripts: `${c.voiceDir}/transcripts`,
    distilled: `${c.voiceDir}/distilled`,
    distilledV2: `${c.voiceDir}/distilled-v2`,
    manifest: `${c.voiceDir}/manifest.json`,
    // Anchor artifacts are per-creator: merge assigns ids per corpus, so
    // applying one creator's report to the other's corpus is meaningless.
    anchorDir: `audit-reports/${c.key}-anchor`,
  };
}
