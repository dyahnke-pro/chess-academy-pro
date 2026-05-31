// Finalize round-2: remove every FIXED/ALREADY key from the allowlist (those
// lines now pass the gate after fix-real-traps --write extended them). LEAVE
// keys stay allowlisted (real positional/sacrificial traps the material proxy
// can't score). Reads /tmp/fix-report.txt.
import fs from 'node:fs';
const report = fs.readFileSync('/tmp/fix-report.txt', 'utf8').split('\n').filter(Boolean);
const clearKeys = report
  .filter((l) => l.startsWith('FIXED ') || l.startsWith('ALREADY '))
  .map((l) => l.replace(/^(FIXED|ALREADY) /, '').split('  (')[0].trim());
const leaveKeys = report.filter((l) => l.startsWith('LEAVE ')).map((l) => l.replace(/^LEAVE /, '').split('  (')[0].trim());

const blFile = 'src/data/repertoire-orientation-baseline.json';
const bl = JSON.parse(fs.readFileSync(blFile, 'utf8'));
let removed = 0;
for (const k of clearKeys) { if (bl.allowlist[k]) { delete bl.allowlist[k]; removed++; } }
fs.writeFileSync(blFile, JSON.stringify(bl, null, 2) + '\n');
console.log(`cleared ${removed} fixed/already keys from allowlist`);
console.log(`remaining allowlist: ${Object.keys(bl.allowlist).length}`);
console.log(`LEAVE keys (${leaveKeys.length}): ${leaveKeys.join(' | ')}`);
console.log(`remaining keys: ${Object.keys(bl.allowlist).join(' | ')}`);
