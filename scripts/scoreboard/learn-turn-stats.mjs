// WHAT LEARN'S DOOR SAID, IN NUMBERS (WO-LEARN-SWING-01 P0). Reads browser
// replays (`scripts/audit-learn-replay.mjs`, hand driver with EVERYTHING=1)
// and reports per game: turns the door spoke on, words per spoken turn, the
// most lines in one turn, the kinds said, and every idea said twice in a game
// (same kind + same claim — the claims ride the owner's "everything" rows; a
// replay older than that falls back to the line's text, and says so).
//
//   node scripts/scoreboard/learn-turn-stats.mjs <learn-replay.json …> [--lines] [--json out.json]
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const showLines = args.includes('--lines');
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
const files = args.filter((a, i) => !a.startsWith('--') && (jsonAt < 0 || i !== jsonAt + 1));
if (!files.length) { console.error('usage: node learn-turn-stats.mjs <learn-replay.json …> [--lines] [--json out.json]'); process.exit(2); }

const words = (s) => s.split(/\s+/).filter(Boolean).length;
const report = {};
for (const f of files) {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  const turns = r.turns.filter((t) => typeof t.ply === 'number');
  let spokenTurns = 0; let wordSum = 0; let maxLines = 0; let claimSource = 'claims';
  const kinds = {}; const seen = new Map(); const repeats = []; const lines = [];
  for (const t of turns) {
    const said = (t.everything ?? []).filter((e) => e.door === 'learn-turn').flatMap((e) => e.lines.filter((l) => l.said));
    // One fact said in two waves of a turn is one line.
    const uniq = [...new Map(said.map((l) => [l.text, l])).values()];
    if (uniq.length) spokenTurns += 1;
    maxLines = Math.max(maxLines, uniq.length);
    for (const l of uniq) {
      wordSum += words(l.text);
      kinds[l.kind ?? '?'] = (kinds[l.kind ?? '?'] ?? 0) + 1;
      const claims = l.claims?.length ? l.claims : null;
      if (!claims) claimSource = 'text';
      const keys = (claims ?? [l.text]).map((c) => `${l.kind}|${c}`);
      const hit = keys.find((k) => seen.has(k));
      if (hit) repeats.push(`${hit} (${seen.get(hit)} and ${t.move})`);
      for (const k of keys) if (!seen.has(k)) seen.set(k, t.move);
      lines.push(`${t.move}  [${l.kind}] ${l.text}`);
    }
  }
  const id = r.game ?? f;
  report[id] = {
    turns: turns.length, turnsSpoken: spokenTurns,
    wordsPerSpokenTurn: spokenTurns ? Math.round(wordSum / spokenTurns) : 0,
    maxLinesInTurn: maxLines, kinds, repeats, repeatKey: claimSource,
  };
  console.log(`${id}: door spoke on ${spokenTurns}/${turns.length} turns · ${report[id].wordsPerSpokenTurn} words a spoken turn · max ${maxLines} lines · ${repeats.length} repeats (by ${claimSource})`);
  if (showLines) for (const l of lines) console.log(`   ${l}`);
}
if (jsonOut) writeFileSync(jsonOut, `${JSON.stringify(report, null, 1)}\n`);
