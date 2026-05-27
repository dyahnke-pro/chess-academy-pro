#!/usr/bin/env node
/**
 * Variation-level provenance (David 2026-05-27: "make sure the pro actually
 * played it"). The bulk harvest gives family-level frequency; this confirms a
 * SPECIFIC candidate line by walking the Lichess /player explorer to that exact
 * position and reading the pro's game count + score + sample game IDs.
 *
 * Output: docs/audit-runs/2026-05-27-pro-provenance/variations.json — the
 * authoring ground truth (every line we build must clear the floor here OR be a
 * documented taught recommendation).
 *
 * Run: node scripts/confirm-pro-variations.mjs
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';

const BASE = 'https://explorer.lichess.ovh/player';
const OUT = 'docs/audit-runs/2026-05-27-pro-provenance/variations.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Candidate lines per pro: { pro, handle, color, label, uci[] } — uci to the
// named position. Seeded for Eric Rosen (wave-1 first build); extend per pro.
const CANDIDATES = [
  // Eric Rosen — BLACK
  { pro: 'ericrosen', handle: 'EricRosen', color: 'black', label: 'Stafford Gambit', uci: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'b8c6'], taught: 'https://lichess.org/study/SSWMLB7R/K9ptMklR' },
  { pro: 'ericrosen', handle: 'EricRosen', color: 'black', label: 'Stafford: 4.Nxc6 main', uci: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'b8c6', 'e5c6', 'd7c6'] },
  { pro: 'ericrosen', handle: 'EricRosen', color: 'black', label: 'Petrov Classical', uci: ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'f3e5', 'd7d6'] },
  { pro: 'ericrosen', handle: 'EricRosen', color: 'black', label: 'QGD', uci: ['d2d4', 'd7d5', 'c2c4', 'e7e6'] },
  { pro: 'ericrosen', handle: 'EricRosen', color: 'black', label: 'Catalan (as black)', uci: ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'g2g3'] },
  // Eric Rosen — WHITE (London family)
  { pro: 'ericrosen', handle: 'EricRosen', color: 'white', label: 'London System', uci: ['d2d4', 'd7d5', 'g1f3', 'g8f6', 'c1f4'], taught: 'https://lichess.org/video/NKPsysr5Qqw' },
  { pro: 'ericrosen', handle: 'EricRosen', color: 'white', label: 'Accelerated London', uci: ['d2d4', 'g8f6', 'c1f4'] },
];

async function nodeAt(handle, color, uci) {
  const params = new URLSearchParams({ player: handle, color, recentGames: '6', moves: '6', play: uci.join(','), speeds: 'blitz,rapid,classical' });
  for (let a = 0; a < 5; a += 1) {
    try {
      const r = await fetch(`${BASE}?${params}`, { headers: { Accept: 'application/x-ndjson', 'User-Agent': 'ChessAcademyPro provenance (dyahnke@gmail.com)' }, signal: AbortSignal.timeout(120000) });
      if (r.status === 429) { await sleep(6000 * (a + 1)); continue; }
      if (!r.ok) return null;
      const text = await r.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) { try { const o = JSON.parse(lines[i]); if (Array.isArray(o.moves)) return o; } catch { /* partial */ } }
      return null;
    } catch { await sleep(2500 * (a + 1)); }
  }
  return null;
}

async function main() {
  const FLOOR = 20;
  let prior = {};
  try { prior = JSON.parse(await readFile(OUT, 'utf8')).lines ?? {}; } catch { /* first run */ }
  const result = { generatedAt: new Date().toISOString(), floor: FLOOR, lines: { ...prior } };
  const only = (process.env.PRO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const set = only.length ? CANDIDATES.filter((c) => only.includes(c.pro)) : CANDIDATES;
  for (const c of set) {
    const data = await nodeAt(c.handle, c.color, c.uci);
    await sleep(1500);
    if (!data) { process.stderr.write(`  ?? ${c.pro} ${c.label}: no data\n`); continue; }
    const total = data.white + data.draws + data.black;
    const forHim = c.color === 'white' ? data.white : data.black;
    const score = total ? Math.round((forHim + data.draws / 2) / total * 100) : 0;
    const games = (data.recentGames ?? []).map((g) => `https://lichess.org/${g.id}`);
    const replies = (data.moves ?? []).slice(0, 4).map((m) => ({ san: m.san, games: m.white + m.draws + m.black }));
    const key = `${c.pro}::${c.color}::${c.label}`;
    const provenanceKind = total >= FLOOR ? (c.taught ? 'both' : 'plays') : (c.taught ? 'teaches' : 'unverified');
    result.lines[key] = { pro: c.pro, color: c.color, label: c.label, uci: c.uci, games: total, score, provenance: provenanceKind, taughtUrl: c.taught ?? null, sampleGames: games, topReplies: replies };
    process.stderr.write(`  ${provenanceKind === 'unverified' ? '✗' : '✓'} ${c.pro} ${c.label.padEnd(24)} ${String(total).padStart(5)}g ${score}%  -> ${provenanceKind}\n`);
  }
  await mkdir('docs/audit-runs/2026-05-27-pro-provenance', { recursive: true });
  await writeFile(OUT, JSON.stringify(result, null, 2));
  process.stderr.write(`\nwrote ${OUT}\n`);
}

main();
