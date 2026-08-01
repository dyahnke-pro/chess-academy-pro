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
  // David 2026-07-31 ("Farm"). Two very different shapes:
  //   hangingpawns — one host, playlists that ARE openings ("Complete
  //     Caro-Kann", "Trompowsky Attack Opening Theory"). Titles name the
  //     opening, so distill's code-stamped `openingFromTitle` lands cleanly.
  //   saintlouis  — a CLUB channel: ~260 playlists, most of them tournament
  //     broadcasts (commentary, not teaching). Only the 77 "Lectures with …"
  //     series are corpus material, so this creator filters by playlist TITLE
  //     rather than listing ids — new lecturers are picked up automatically
  //     and no broadcast ever enters the farm.
  hangingpawns: {
    key: 'hangingpawns',
    voiceDir: 'data/sources/hangingpawns-voice',
    corpus: 'public/data/hangingpawns-teachings.json',
    idPrefix: 'hp',
    bannedExtra: ['hanging pawns', 'stjepan', 'tomic', 'this channel', 'the channel', 'patreon'],
    channel: 'https://www.youtube.com/@HangingPawns/playlists',
    // Theory/strategy series only — skip the game-log series (Road to 2500,
    // Daily Chess Test, world-championship recaps) which are play-by-play.
    playlistFilter: '(opening|theory|complete|gambit|defense|defence|attack|system|strategy|endgame|middlegame|traps|lessons|learn from)',
    playlistExclude: '(road to|daily chess test|world championship|vs\\.? gukesh|recap)',
  },
  saintlouis: {
    key: 'saintlouis',
    voiceDir: 'data/sources/saintlouis-voice',
    corpus: 'public/data/saintlouis-teachings.json',
    idPrefix: 'sl',
    // A club channel means MANY named lecturers; every one of them is a
    // depersonalization risk, plus the venue and the medium itself.
    bannedExtra: [
      'saint louis', 'st. louis', 'stl', 'chess club', 'scholastic center',
      'finegold', 'seirawan', 'shahade', 'maurice ashley', 'shankland',
      'yermolinsky', 'khachiyan', 'nemcova', 'shabalov', 'nyzhnyk',
      'bruzon', 'novikov', 'mikhalevski', 'landa', 'quesada', 'edouard',
      'georgiev', 'durarbayli', 'cordova', 'chandra', 'denby', 'lecture',
      'lectures', 'audience', 'the club',
    ],
    channel: 'https://www.youtube.com/@STLChessClub/playlists',
    playlistFilter: '(^lectures with|course|strategy across the board)',
    playlistExclude: '(grand chess tour|championship|cup|classic|rapid|blitz|showdown|today in chess|candidates)',
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
