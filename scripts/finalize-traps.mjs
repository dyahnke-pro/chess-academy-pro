// Finalize: after fix-real-traps --write extended the 27 real traps, (a) remove
// those 27 now-passing keys from the allowlist, (b) toss the 4 toothless
// warnings (a warning must show the student punished; these show the student
// winning), (c) leave the 2 sacrificial/positional traps (Dragon, Muzio)
// allowlisted — real traps whose win the crude material proxy can't see.
import fs from 'node:fs';

const report = fs.readFileSync('/tmp/fix-report.txt', 'utf8').split('\n');
const fixedKeys = report.filter((l) => l.startsWith('FIXED ')).map((l) => l.slice(6).split('  ')[0].trim());

const toothlessWarnings = [
  'ruy-lopez::warning::Open Ruy Lopez Counterattack',
  'scandinavian-defence::warning::Queen Wandering Danger',
  'caro-kann::warning::Two Knights Early e6 Mistake',
  'italian-game::warning::Traxler Counterattack',
];

// (a)+(b) allowlist edits
const blFile = 'src/data/repertoire-orientation-baseline.json';
const bl = JSON.parse(fs.readFileSync(blFile, 'utf8'));
let rmFixed = 0, rmWarn = 0;
for (const k of fixedKeys) { if (bl.allowlist[k]) { delete bl.allowlist[k]; rmFixed++; } }
for (const k of toothlessWarnings) { if (bl.allowlist[k]) { delete bl.allowlist[k]; rmWarn++; } }
fs.writeFileSync(blFile, JSON.stringify(bl, null, 2) + '\n');

// (b) delete the 4 toothless warning lines from repertoire.json
const repFile = 'src/data/repertoire.json';
const rep = JSON.parse(fs.readFileSync(repFile, 'utf8'));
const tossSet = new Set(toothlessWarnings);
let rmLines = 0;
for (const op of rep) {
  if (!Array.isArray(op.warningLines)) continue;
  const before = op.warningLines.length;
  op.warningLines = op.warningLines.filter((l) => !tossSet.has(`${op.id}::warning::${l.name}`));
  rmLines += before - op.warningLines.length;
}
fs.writeFileSync(repFile, JSON.stringify(rep, null, 2) + '\n');

console.log(`removed ${rmFixed} fixed-trap keys + ${rmWarn} toothless-warning keys from allowlist`);
console.log(`deleted ${rmLines} toothless warning lines from repertoire.json`);
console.log(`allowlist remaining: ${Object.keys(bl.allowlist).length}`);
console.log(`remaining keys: ${Object.keys(bl.allowlist).join(', ')}`);
