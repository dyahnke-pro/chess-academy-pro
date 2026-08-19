#!/usr/bin/env node
/**
 * next-round — pick the NEXT videos to download, by what the app still lacks.
 *
 * rank-queue.mjs answers "does this video name an opening we teach". That was
 * the right question when nothing was banked; it is the wrong one now, because
 * it puts SIX Four Knights Scotch uploads at the head of a queue that already
 * carries three tracked ones, while openings we teach and have never covered sit
 * behind them. Same download budget, far less teaching.
 *
 * So this ranks by GAP: a taught opening with no track outranks one with a
 * track, and each opening contributes its best video before any opening
 * contributes a second. Coverage across the taught set, not depth on whichever
 * opening the channel uploaded most about.
 *
 * Usage: node scripts/video-align/next-round.mjs [queue.txt] [--count N] [--write]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const countAt = args.indexOf('--count');
const count = countAt === -1 ? 30 : Number(args[countAt + 1]) || 30;
const positional = args.filter((a, i) => !a.startsWith('--') && i !== countAt + 1);
const queuePath = positional[0] ?? 'data/video-queues/naroditsky.txt';
const write = args.includes('--write');

const load = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const manifest = load('data/sources/naroditsky-voice/manifest.json') ?? [];
const videos = Array.isArray(manifest) ? manifest : (manifest.videos ?? []);
const byId = new Map(videos.map((v) => [v.id, v]));

// The openings a note can attach to — the same two surfaces rank-queue reads.
const taught = new Set();
const addName = (n) => { if (typeof n === 'string' && n.length > 2) taught.add(n.toLowerCase()); };
for (const r of load('src/data/repertoire.json') ?? []) addName(r?.name);
for (const r of (load('src/data/pro-repertoires.json')?.openings ?? [])) addName(r?.name);

const GENERIC = new Set(['defense','defence','attack','game','opening','variation','system','gambit',
  'line','main','classical','modern','accepted','declined','the','and','with','of','a','an','vs',
  'king','queen','pawn']);
const hasWord = (t, tok) => new RegExp(`\\b${tok}\\b`).test(t);
const titles = videos.map((v) => (v.title ?? '').toLowerCase());
const TOO_COMMON = Math.max(3, Math.floor(titles.length * 0.05));
const keywords = new Map();
for (const name of taught) for (const tok of name.split(/[^a-zà-ÿ]+/i).filter(Boolean)) {
  if (GENERIC.has(tok) || tok.length < 4 || keywords.has(tok)) continue;
  if (titles.filter((t) => hasWord(t, tok)).length > TOO_COMMON) continue;
  keywords.set(tok, name);
}

// EVERY WAY A VIDEO IS FINISHED WITH, not just success — the same skip test the
// download loop uses, so a refused or no-game video is never re-queued.
const handled = new Set();
for (const d of ['data/video-tracks', 'data/video-pending']) if (existsSync(d))
  for (const f of readdirSync(d)) if (f.endsWith('.json')) handled.add(f.replace('.json', ''));
for (const q of ['data/video-queues/no-game.txt', 'data/video-queues/needs-hand-geometry.txt'])
  if (existsSync(q)) for (const l of readFileSync(q, 'utf8').split('\n')) if (l.trim()) handled.add(l.trim());

// What is already covered, counted per taught opening.
//
// NORMALISE THE SPELLING BEFORE MATCHING. `repertoire.json` writes British
// ("Caro-Kann Defence"); the ECO names in by-opening.json write American
// ("Caro-Kann Defense: Panov Attack"). A raw `includes` therefore matched
// NEITHER, and the first run of this script reported Caro-Kann, French, King's
// Indian and Scandinavian as having no track at all — the four openings with
// the MOST tracks — and would have sent the whole next round at material
// already banked.
const norm = (s) => s.toLowerCase().replace(/defence/g, 'defense').replace(/[^a-z0-9]+/g, ' ').trim();
const covered = new Map();
const taughtNorm = new Map([...taught].map((n) => [n, norm(n)]));
for (const [opening, entries] of Object.entries(load('data/video-tracks/by-opening.json') ?? {})) {
  const key = norm(opening);
  for (const [name, nn] of taughtNorm) if (key.includes(nn) || nn.includes(key))
    covered.set(name, (covered.get(name) ?? 0) + entries.length);
}

const ids = readFileSync(queuePath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const byOpening = new Map();
ids.forEach((id, i) => {
  if (handled.has(id)) return;
  const v = byId.get(id) ?? { id, title: '' };
  const title = (v.title ?? '').toLowerCase();
  const hits = [...keywords.entries()].filter(([tok]) => hasWord(title, tok));
  if (!hits.length) return;                       // nowhere for a note to land
  const opening = hits.map(([, n]) => n)[0];
  // One opening per video tracks cleanly; a speedrun wanders across games.
  const quality = (v.playlist === 'opening-lab' ? 10 : 0) + hits.length;
  if (!byOpening.has(opening)) byOpening.set(opening, []);
  byOpening.get(opening).push({ id, title: v.title ?? '', opening, quality, i });
});
for (const list of byOpening.values()) list.sort((a, b) => b.quality - a.quality || a.i - b.i);

// Round-robin: every opening's best video before any opening's second, and
// uncovered openings ahead of covered ones inside each round.
const picked = [];
for (let round = 0; picked.length < ids.length; round += 1) {
  const slice = [...byOpening.entries()]
    .filter(([, list]) => list.length > round)
    .map(([opening, list]) => ({ ...list[round], have: covered.get(opening) ?? 0 }))
    .sort((a, b) => a.have - b.have || b.quality - a.quality || a.i - b.i);
  if (!slice.length) break;
  picked.push(...slice);
}

const gaps = [...byOpening.keys()].filter((o) => !covered.get(o)).length;
console.log(`${picked.length} unharvested videos across ${byOpening.size} taught openings — ${gaps} of those openings have NO track yet`);
console.log('---');
for (const r of picked.slice(0, count)) {
  console.log(`${String(r.have).padStart(2)} have  ${r.id}  ${r.opening.slice(0, 24).padEnd(26)} ${r.title.slice(0, 58)}`);
}
if (write) {
  const out = 'data/video-queues/next-round.txt';
  writeFileSync(out, picked.slice(0, count).map((r) => r.id).join('\n') + '\n');
  console.log(`\nwrote ${out} — ${Math.min(count, picked.length)} ids`);
}
