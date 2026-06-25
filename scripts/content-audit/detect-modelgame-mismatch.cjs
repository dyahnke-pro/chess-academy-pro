// Mechanical model-game integrity check across current packets.
const fs = require('fs');
const dir = 'audit-reports/content-packets';
const ids = JSON.parse(fs.readFileSync(`${dir}/_manifest.json`, 'utf8')).map((m) => m.id);
const surnames = (s) => String(s || '').split(/[,\s]+/).filter((w) => w.length > 3).map((w) => w.toLowerCase());

let orphanPlayer = 0, studentLoses = 0, total = 0;
const rows = [];
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));
  const color = p.color; // student side for masterclass
  for (const g of p.modelGames || []) {
    total++;
    const ov = (g.overview || '').toLowerCase();
    const names = [...surnames(g.white), ...surnames(g.black)];
    // overview names a capitalized surname not among the two players?
    const ovCaps = (g.overview || '').match(/\b[A-Z][a-z]{3,}\b/g) || [];
    const known = new Set([...names, 'white', 'black', 'black\'s', 'white\'s']);
    const stray = [...new Set(ovCaps.map((w) => w.toLowerCase()))].filter((w) => !known.has(w) &&
      !['this','that','black','white','with','from','when','then','after','both','note','against','model','master','game','the'].includes(w));
    // student-side-loses: studentSide tagged OR infer from opening color
    const side = g.studentSide || color;
    const loses = (side === 'white' && g.result === '0-1') || (side === 'black' && g.result === '1-0');
    if (loses) { studentLoses++; rows.push({ id, type: 'student-loses', g: g.id, side, result: g.result, players: `${g.white} v ${g.black}` }); }
  }
}
console.log('total model games scanned:', total);
console.log('student-side LOSES (studentSide tag OR opening color):', studentLoses);
console.log(rows.slice(0, 25).map((r) => `  ${r.id}: ${r.players} (${r.result}, side ${r.side})`).join('\n'));
fs.writeFileSync('audit-reports/content-audit/_modelgame-integrity.json', JSON.stringify(rows, null, 2));
