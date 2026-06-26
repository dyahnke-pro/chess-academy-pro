const fs = require('fs');
const { Chess } = require('chess.js');
const dir = 'audit-reports/content-packets';
const ids = JSON.parse(fs.readFileSync(`${dir}/_manifest.json`, 'utf8')).map((m) => m.id);
const toks = (s) => String(s || '').trim().split(/\s+/).map((m) => m.replace(/^\d+\.+/, '')).filter((m) => m && !/^\d+\.+$/.test(m));
function fen(list) { const g = new Chess(); for (const m of list) { try { if (!g.move(m)) return null; } catch { return null; } } return g.fen(); }
const key = (f) => (f || '').split(' ').slice(0, 4).join(' ');
function sharedPrefix(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
const flags = [];
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  for (const v of p.variations || []) {
    const beats = v.watchLearnBeats || []; if (!beats.length) continue;
    const card = toks(v.sanLine), beat = toks(beats[beats.length - 1].moves);
    if (!card.length || !beat.length) continue;
    const cs = card.join(' '), bs = beat.join(' ');
    if (cs === bs || bs.startsWith(cs) || cs.startsWith(bs)) continue;
    if (key(fen(card)) && key(fen(card)) === key(fen(beat))) continue; // transposition
    const sp = sharedPrefix(card, beat);
    flags.push({ id, variation: v.name, divergePly: sp, cardLen: card.length, beatLen: beat.length });
  }
}
flags.sort((a, b) => a.divergePly - b.divergePly);
const early = flags.filter((f) => f.divergePly <= 6), late = flags.filter((f) => f.divergePly > 6);
console.log(`lesson!=pgn total: ${flags.length} | EARLY-diverge(<=6 ply, real different-line): ${early.length} | LATE(>6, sub-line/tail): ${late.length}`);
console.log('\n-- EARLY (priority) --');
for (const f of early) console.log(`  @${f.divergePly}  ${f.id} :: ${f.variation}`);
fs.writeFileSync('audit-reports/content-audit/_lesson-pgn.json', JSON.stringify(flags, null, 2));
