// Mechanical, current-data detectors for the systemic bug classes the judge
// surfaced. These don't trust the judge's wording — they re-derive each defect
// straight from the rebuilt packets, so every hit is a confirmed, current bug.
const fs = require('fs');
const dir = 'audit-reports/content-packets';
const ids = JSON.parse(fs.readFileSync(`${dir}/_manifest.json`, 'utf8')).map((m) => m.id);
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

const dupModelGames = [];
const dupVariations = [];
const cwFtbClash = [];
const dupPlans = [];

for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${id}.json`, 'utf8'));

  // 1) duplicate model games: same players+result+year+openingSan, different id
  const seen = new Map();
  for (const g of p.modelGames || []) {
    const key = norm(`${g.white}|${g.black}|${g.result}|${g.year}|${g.openingSan}`);
    if (seen.has(key)) dupModelGames.push({ id, a: seen.get(key), b: g.id, who: `${g.white} v ${g.black} ${g.result} ${g.year}` });
    else seen.set(key, g.id);
  }

  // 2) variation tabs sharing an identical first beat OR identical sanLine
  const vs = p.variations || [];
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const a = vs[i], b = vs[j];
    const beatA = norm(a.watchLearnBeats?.[0]?.say), beatB = norm(b.watchLearnBeats?.[0]?.say);
    const sameBeat = beatA && beatA === beatB;
    const sameLine = a.sanLine && norm(a.sanLine) === norm(b.sanLine);
    if (sameBeat || sameLine) dupVariations.push({ id, a: a.name, b: b.name, sameBeat: !!sameBeat, sameLine: !!sameLine });
  }

  // 3) classic-wisdom passage text == a from-the-books passage text, diff author
  for (const cw of p.classicWisdom || []) {
    for (const fb of p.fromTheBooks || []) {
      const ct = norm(cw.text), ft = norm(fb.text);
      if (ct && ft && (ct === ft || ct.slice(0, 80) === ft.slice(0, 80))) {
        if (norm(cw.author) !== norm(fb.author)) cwFtbClash.push({ id, cwAuthor: cw.author, fbAuthor: fb.author, text: (cw.text || '').slice(0, 60) });
      }
    }
  }

  // 4) two middlegame plans with identical overview OR identical lineSan
  const pl = [...(p.middlegamePlans || []), ...(p.endgamePlans || [])];
  for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
    if (norm(pl[i].overview) && norm(pl[i].overview) === norm(pl[j].overview)) dupPlans.push({ id, a: pl[i].id, b: pl[j].id, kind: 'overview' });
    else if (norm(pl[i].lineSan) && norm(pl[i].lineSan) === norm(pl[j].lineSan)) dupPlans.push({ id, a: pl[i].id, b: pl[j].id, kind: 'lineSan' });
  }
}

const show = (title, arr) => {
  console.log(`\n=== ${title}: ${arr.length} ===`);
  for (const x of arr) console.log('  ' + JSON.stringify(x));
};
show('DUPLICATE MODEL GAMES (field-for-field)', dupModelGames);
show('DUPLICATE VARIATION TABS (same beat or same line)', dupVariations);
show('CLASSIC-WISDOM == FROM-THE-BOOKS, conflicting author', cwFtbClash);
show('DUPLICATE PLANS (same overview or same line)', dupPlans);
fs.writeFileSync('audit-reports/content-audit/_systemic.json', JSON.stringify({ dupModelGames, dupVariations, cwFtbClash, dupPlans }, null, 2));
