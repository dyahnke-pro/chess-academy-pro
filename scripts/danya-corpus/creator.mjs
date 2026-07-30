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
  chessbrah: {
    key: 'chessbrah',
    voiceDir: 'data/sources/chessbrah-voice',
    corpus: 'src/data/chessbrah-teachings.json',
    idPrefix: 'cb',
    bannedExtra: ['aman', 'hambleton', 'chessbrah', 'eric hansen', 'building habits', 'speedrun', 'botez'],
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
