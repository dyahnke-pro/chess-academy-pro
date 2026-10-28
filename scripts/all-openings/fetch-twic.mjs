// Download The Week in Chess PGN issues (twic<N>g.zip, 920–latest) into
// data/sources/twic/ (gitignored) for the offline master tree
// (WO-ALL-OPENINGS-01 P1). One file at a time with a pause between, so the
// free site is never hammered; a file already on disk is skipped, so a killed
// run resumes. Progress every 25 issues.
//
//   node scripts/all-openings/fetch-twic.mjs [--from 920] [--to 1668]
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';

const root = new URL('../..', import.meta.url).pathname;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? Number(process.argv[i + 1]) : d; };
const FROM = arg('from', 920);
const TO = arg('to', 1668);
const DIR = root + 'data/sources/twic/';
mkdirSync(DIR, { recursive: true });

let got = 0; let skipped = 0; let missing = 0; let bytes = 0;
const t0 = Date.now();
for (let n = FROM; n <= TO; n += 1) {
  const file = `${DIR}twic${n}g.zip`;
  if (existsSync(file) && statSync(file).size > 1000) { skipped += 1; continue; }
  let ok = false;
  for (let a = 0; a < 3 && !ok; a += 1) {
    const r = await fetch(`https://theweekinchess.com/zips/twic${n}g.zip`).catch(() => null);
    if (r?.status === 404) { missing += 1; break; }
    if (r?.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      writeFileSync(file, buf);
      bytes += buf.length; got += 1; ok = true;
    } else {
      await new Promise((res) => setTimeout(res, 5000 * (a + 1)));
    }
  }
  await new Promise((res) => setTimeout(res, 700));
  if ((n - FROM + 1) % 25 === 0) console.log(`[twic] ${n}/${TO}: ${got} fetched, ${skipped} on disk, ${missing} missing, ${(bytes / 1e6).toFixed(0)} MB, ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
console.log(`[twic] done: ${got} fetched, ${skipped} on disk, ${missing} missing, ${(bytes / 1e6).toFixed(0)} MB`);
