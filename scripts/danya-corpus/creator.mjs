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
  // David 2026-08-14 ("get all of them"). Six pros identified for voice-corpus
  // expansion; Caruana was checked and dropped — his channel
  // (UCCqT1qXkh8DvMmJ6NN1xYBw) has NO playlists tab at all, so there is no
  // personal teaching source to farm (empty > invented — see CLAUDE.md).
  // Every include/exclude regex below was derived from the REAL playlist
  // titles returned by `yt-dlp --flat-playlist` against each channel, never
  // guessed from training recall.
  gothamchess: {
    key: 'gothamchess',
    voiceDir: 'data/sources/gothamchess-voice',
    corpus: 'public/data/gothamchess-teachings.json',
    idPrefix: 'gc',
    bannedExtra: ['gotham', 'levy', 'rozman', 'gothamchess', 'this channel', 'the channel', 'chess.com', 'subscribe'],
    channel: 'https://www.youtube.com/@GothamChess/playlists',
    playlistFilter: '(gotham chess (openings|guide)|chess steps|^endgames$|win at chess|how to solve chess tactics|chess tips|chess lesson collabs|rating climb|chess slowrun|how to lose at chess)',
    playlistExclude: '(candidates|recap|chatbot|mlb|wife plays|pogchamp|cheater|shorts)',
  },
  hikaru: {
    key: 'hikaru',
    voiceDir: 'data/sources/hikaru-voice',
    corpus: 'public/data/hikaru-teachings.json',
    idPrefix: 'hk',
    bannedExtra: ['hikaru', 'nakamura', 'gmhikaru', 'chess.com', 'subscribe', 'chat'],
    channel: 'https://www.youtube.com/@GMHikaru/playlists',
    playlistFilter: '(speedrun|educational)',
    playlistExclude: '(bongcloud|chessle)',
  },
  imrosen: {
    key: 'imrosen',
    voiceDir: 'data/sources/imrosen-voice',
    corpus: 'public/data/imrosen-teachings.json',
    idPrefix: 'ir',
    bannedExtra: ['eric rosen', 'im rosen', 'rosen', 'chessmood', 'subscribe', 'chat', 'twitch'],
    channel: 'https://www.youtube.com/@eric-rosen/playlists',
    playlistFilter: "(^chess opening lessons$|chessmood openings|tricks and traps speedrun|^opening traps$|stafford gambit|budapest gambit|o'sullivan gambit|ponziani opening|beginner to master speedrun|^endgames$|chess games everyone should know)",
  },
  magnuscarlsen: {
    key: 'magnuscarlsen',
    voiceDir: 'data/sources/magnuscarlsen-voice',
    corpus: 'public/data/magnuscarlsen-teachings.json',
    idPrefix: 'mgc',
    bannedExtra: ['magnus', 'carlsen', 'play magnus', 'chess24', 'subscribe'],
    channel: 'https://www.youtube.com/channel/UCbdcpQ5uPPymv7Ea0nnFfOw/playlists',
    playlistFilter: "(chess tutorials by magnus carlsen|chess commentary by magnus carlsen|magnus.?kingdom of chess)",
  },
  samayraina: {
    key: 'samayraina',
    voiceDir: 'data/sources/samayraina-voice',
    corpus: 'public/data/samayraina-teachings.json',
    idPrefix: 'sr',
    bannedExtra: ['samay', 'raina', 'chess.com', 'subscribe', 'chat', 'stream'],
    channel: 'https://www.youtube.com/@samayrainachess/playlists',
    playlistFilter: '(ta.ching chess|chess gambit)',
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
