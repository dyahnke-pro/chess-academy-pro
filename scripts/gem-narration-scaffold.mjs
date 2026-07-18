// Prints each un-narrated masterclass gem for an opening, replaying its
// playLine ply-by-ply with board state, so narration is authored against the
// REAL position (never memory). Usage: node scripts/gem-narration-scaffold.mjs <openingId>
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const openingId = process.argv[2];
if (!openingId) { console.error('usage: node scripts/gem-narration-scaffold.mjs <openingId>'); process.exit(1); }
const gems = JSON.parse(readFileSync('src/data/punish-gems.json', 'utf-8'));
const forOpening = gems.filter((g) => g.openingId === openingId && (g.tier === 'confirmed' || g.tier === 'positional'));
console.log(`# ${openingId}: ${forOpening.length} weapon-tier gems (confirmed/positional)\n`);
for (const g of forOpening) {
  const gemId = `${g.openingId}:${g.lineMoves.replace(/\s+/g, '_')}:${g.inaccuracy}`;
  const setupLen = g.lineMoves.split(' ').length;
  const play = g.playLine.split(' ');
  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`gemId: ${gemId}`);
  console.log(`tier=${g.tier}  engineCp=${g.engineCp}  freq=${g.freqPct}% games=${g.games}  inaccuracy=${g.inaccuracy} punish=${g.punish}`);
  console.log(`why: ${g.why ?? ''}`);
  const c = new Chess();
  play.forEach((m, i) => {
    const before = c.fen();
    const r = c.move(m);
    const marker = i === setupLen ? '  ⟵ INACCURACY' : i === setupLen + 1 ? '  ⟵ PUNISH' : i < setupLen ? '  (spine)' : '';
    const mover = r.color === 'w' ? 'W' : 'B';
    console.log(`  [${i}] ${mover} ${m}${marker}`);
  });
  console.log(`  final FEN: ${c.fen()}   plies=${play.length}`);
}
