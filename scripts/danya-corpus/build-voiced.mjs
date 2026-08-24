// Build a voiced file from the bank + a beats JSON, guaranteeing bank-fidelity:
// {ply,t,fen,line} are copied straight from data/video-narration/<id>.json; only
// spoken/kind/teaches/plans/reanchor are injected, keyed by move index.
//
// beats file shape: { openingName, studentSide, title?, beats: { "<idx>": {spoken, kind?, teaches?, plans?, reanchor?}, ... } }
// Every index NOT in beats becomes a silent move (spoken:"").
//
// Usage: node scripts/danya-corpus/build-voiced.mjs <id> <beatsJsonPath>
import fs from 'node:fs';
import path from 'node:path';

const [id, beatsPath] = process.argv.slice(2);
if (!id || !beatsPath) { console.error('usage: build-voiced.mjs <id> <beatsJsonPath>'); process.exit(2); }

const bank = JSON.parse(fs.readFileSync(path.join('data/video-narration', `${id}.json`), 'utf8'));
const spec = JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
const beats = spec.beats || {};
const bMoves = bank.moves || bank;

const moves = bMoves.map((b, i) => {
  const out = { ply: b.ply, t: b.t, fen: b.fen, line: b.line || [] };
  const beat = beats[String(i)];
  if (beat && (beat.spoken || '').trim()) {
    out.spoken = beat.spoken.trim();
    if (beat.kind) out.kind = beat.kind;
    if (beat.teaches) out.teaches = beat.teaches;
    if (beat.plans !== undefined && beat.plans !== '') out.plans = beat.plans;
    if (beat.reanchor) out.reanchor = true;
  } else {
    out.spoken = '';
  }
  return out;
});

const voiced = {
  videoId: id,
  title: spec.title || bank.title || '',
  openingName: spec.openingName,
  studentSide: spec.studentSide,
  voice: 'danya-dna',
  rewrittenAt: '2026-08-24',
  source: `yt:${id}`,
  moves,
};

fs.mkdirSync('data/video-narration-voiced', { recursive: true });
fs.writeFileSync(path.join('data/video-narration-voiced', `${id}.json`), JSON.stringify(voiced, null, 1) + '\n');
const narrated = moves.filter((m) => m.spoken).length;
console.log(`wrote ${id}.json — ${moves.length} moves, ${narrated} narrated`);
