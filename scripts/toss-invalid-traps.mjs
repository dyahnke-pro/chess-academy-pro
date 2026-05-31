// Toss the 139 invalid trap/warning lines (David 2026-05-31: rerun broken →
// remine → if still not a valid trap, toss). Engine re-validation in
// /tmp/decision.json classified each flagged line; here we DELETE the toss set
// from repertoire.json (trapLines/warningLines) and remove them from the
// orientation allowlist. The 22 engine-confirmed real traps (KEEP) stay and are
// fixed separately.
import fs from 'node:fs';
const decision = JSON.parse(fs.readFileSync('/tmp/decision.json', 'utf8'));
const tossKeys = new Set(decision.toss.map((t) => t.key));

const repFile = 'src/data/repertoire.json';
const rep = JSON.parse(fs.readFileSync(repFile, 'utf8'));
let removedTrap = 0, removedWarn = 0;
for (const op of rep) {
  if (Array.isArray(op.trapLines)) {
    const before = op.trapLines.length;
    op.trapLines = op.trapLines.filter((l) => !tossKeys.has(`${op.id}::trap::${l.name}`));
    removedTrap += before - op.trapLines.length;
  }
  if (Array.isArray(op.warningLines)) {
    const before = op.warningLines.length;
    op.warningLines = op.warningLines.filter((l) => !tossKeys.has(`${op.id}::warning::${l.name}`));
    removedWarn += before - op.warningLines.length;
  }
}
fs.writeFileSync(repFile, JSON.stringify(rep, null, 2) + '\n');

const blFile = 'src/data/repertoire-orientation-baseline.json';
const bl = JSON.parse(fs.readFileSync(blFile, 'utf8'));
let removedBl = 0;
for (const key of tossKeys) { if (bl.allowlist[key]) { delete bl.allowlist[key]; removedBl++; } }
fs.writeFileSync(blFile, JSON.stringify(bl, null, 2) + '\n');

console.log(`tossed: ${removedTrap} trap + ${removedWarn} warning lines from repertoire.json`);
console.log(`removed ${removedBl} keys from allowlist; remaining allowlist size: ${Object.keys(bl.allowlist).length}`);
