// THE STRONG-ONLINE GAMES (WO-ALL-OPENINGS-01 O9): the Lichess Elite Database
// (database.nikonoel.fr — Lichess's own CC0 games, filtered to 2400+ vs 2200+
// with no bullet; 2500+ vs 2300+ from December 2021), one zip per month, into
// data/sources/lichess-elite/ (gitignored). The online tree is built from them
// offline (`build-master-tree.mjs --source elite`), so a lesson walk past the
// masters reads a file instead of the rate-limited explorer.
//
//   node scripts/all-openings/fetch-lichess-elite.mjs --last 12
//   node scripts/all-openings/fetch-lichess-elite.mjs --months 2024-12,2025-01
import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = root + 'data/sources/lichess-elite/';
const BASE = 'https://database.nikonoel.fr/';
mkdirSync(OUT, { recursive: true });

const page = execFileSync('curl', ['-sS', '--max-time', '60', BASE]).toString();
const listed = [...new Set(page.match(/lichess_elite_\d{4}-\d{2}\.zip/g) ?? [])].sort();
if (listed.length === 0) throw new Error('the Elite Database lists no months');
const months = arg('months', null)?.split(',').map((m) => `lichess_elite_${m}.zip`)
  ?? listed.slice(-Number(arg('last', 12)));

for (const [k, name] of months.entries()) {
  if (!listed.includes(name)) { console.log(`[elite] ${name} is not listed — skipped`); continue; }
  if (existsSync(OUT + name)) { console.log(`[elite] ${k + 1}/${months.length} ${name} already here`); continue; }
  const t0 = Date.now();
  // Into a part file, renamed only when whole: a killed run never leaves a
  // truncated zip that looks finished.
  execFileSync('curl', ['-sS', '--fail', '--retry', '4', '--retry-delay', '5', '-C', '-', '-o', `${OUT}${name}.part`, BASE + name], { stdio: 'inherit' });
  renameSync(`${OUT}${name}.part`, OUT + name);
  console.log(`[elite] ${k + 1}/${months.length} ${name} ${(statSync(OUT + name).size / 1e6).toFixed(0)} MB in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
console.log(`[elite] done: ${months.length} month(s) in ${OUT}`);
