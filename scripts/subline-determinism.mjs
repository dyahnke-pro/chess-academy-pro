// Determinism map for course sublines (David 2026-07-07: "Any way of telling
// which sublines are non deterministic?"). Each subline is built game-backed
// (deterministic — the most-played master move) up to where real master games
// stop, then ENGINE-EXTENDED (Stockfish best move) to a middlegame. The `games`
// field is only the count at the trigger deviation, not per ply. This walks
// every line against the offline masters DB and reports, per line, the ply
// where the played move drops to 0 master games (= the off-book / determinism
// boundary). Everything at/after that ply is the generated (non-deterministic)
// tail — where fabrications like the Frankenstein hanging queen live.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const data = JSON.parse(readFileSync(ROOT + 'src/data/course-sublines.json', 'utf8'));
const db = JSON.parse(readFileSync(ROOT + 'public/data/openings-masters-db.json', 'utf8')).positions;
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const MINGAMES = Number(process.env.MINGAMES || 1); // "on-book" = played in >= this many games
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;

let total = 0;
const rows = [];
for (const [opening, group] of Object.entries(data)) {
  if (only && !only.has(opening)) continue;
  for (const [k, list] of Object.entries(group)) {
    const arr = Array.isArray(list) ? list : [list];
    for (const sl of arr) {
      if (!sl || !Array.isArray(sl.moves)) continue;
      total++;
      const chess = new Chess();
      let offBookPly = null;   // 1-indexed ply where the played move had 0 games
      let gamesAtLastBook = null;
      for (let i = 0; i < sl.moves.length; i++) {
        const entries = db[key(chess.fen())] || [];
        const hit = entries.find((e) => e.san === sl.moves[i]);
        if (!hit || hit.games < MINGAMES) { offBookPly = i + 1; break; }
        gamesAtLastBook = hit.games;
        try { chess.move(sl.moves[i]); } catch { offBookPly = i + 1; break; }
      }
      const bookPlies = offBookPly == null ? sl.moves.length : offBookPly - 1;
      const tailPlies = sl.moves.length - bookPlies;
      rows.push({
        opening, key: k, name: sl.name, len: sl.moves.length,
        bookPlies, tailPlies, offBookPly, gamesAtTrigger: sl.games,
        gamesAtLastBook, moves: sl.moves,
      });
    }
  }
}

// summary
const fullyBook = rows.filter((r) => r.tailPlies === 0).length;
const bigTail = rows.filter((r) => r.tailPlies >= 6).sort((a, b) => b.tailPlies - a.tailPlies);
console.log(`Total sublines: ${total}`);
console.log(`Fully game-backed (0 generated plies): ${fullyBook} (${(100 * fullyBook / total).toFixed(0)}%)`);
console.log(`Have a generated tail (>=1 off-book ply): ${total - fullyBook}`);
console.log(`Long generated tail (>=6 off-book plies): ${bigTail.length}`);
const tailHist = {};
for (const r of rows) { const b = r.tailPlies; tailHist[b] = (tailHist[b] || 0) + 1; }
console.log('\ntail-length histogram (generated plies -> #lines):');
for (const t of Object.keys(tailHist).map(Number).sort((a, b) => a - b)) console.log(`  ${t}: ${tailHist[t]}`);

if (process.env.LIST) {
  console.log('\n=== longest generated tails (most non-deterministic) ===');
  for (const r of bigTail.slice(0, Number(process.env.LIST))) {
    console.log(`[${r.opening} :: ${r.key}] ${r.name}`);
    console.log(`   book ${r.bookPlies} plies (last on-book had ${r.gamesAtLastBook} games) | generated tail ${r.tailPlies} plies`);
    console.log(`   ${r.moves.slice(0, r.bookPlies).join(' ')}  ||  ${r.moves.slice(r.bookPlies).join(' ')}`);
  }
}
if (process.env.JSON) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.JSON, JSON.stringify(rows, null, 2));
  console.error(`wrote ${rows.length} rows to ${process.env.JSON}`);
}
