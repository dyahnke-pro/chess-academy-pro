const fs = require('fs');
const dir = 'audit-reports/content-packets';
const ids = JSON.parse(fs.readFileSync(`${dir}/_manifest.json`, 'utf8')).map((m) => m.id);
const surn = (s) => String(s || '').split(/[,()]/)[0].trim().split(/\s+/).filter((w) => w.length > 3).map((w) => w.toLowerCase());
const STOP = new Set(['this','that','black','white','with','from','when','then','after','both','note','against','model','master','game','the','here','they','their','black’s','white’s','queen','king','rook','bishop','knight','pawn','open','main','line','attack','defense','defence','gambit','variation']);
const flags = [];
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  for (const g of p.modelGames || []) {
    const players = new Set([...surn(g.white), ...surn(g.black)]);
    const caps = [...new Set((g.overview || '').match(/\b[A-Z][a-z]{3,}\b/g) || [])].map((w) => w.toLowerCase());
    const stray = caps.filter((w) => !players.has(w) && !STOP.has(w));
    if (stray.length) flags.push({ id, game: `${g.white} v ${g.black}`, stray });
  }
}
console.log(`model games whose overview names a NON-player capitalized word: ${flags.length}`);
for (const f of flags.slice(0, 30)) console.log(`  ${f.id}: [${f.stray.join(', ')}]  (${f.game})`);
fs.writeFileSync('audit-reports/content-audit/_modelgame-overview.json', JSON.stringify(flags, null, 2));
