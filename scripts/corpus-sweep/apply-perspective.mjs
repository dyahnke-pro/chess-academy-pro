/**
 * Apply the we/our -> you/your migration to the voiced corpus SOURCE.
 *
 * David 2026-08-28 locked the standard: the student's own side is "you/your",
 * the opponent is "they/their", and "we/our/us" is BANNED because a live tester
 * cannot tell whose piece a sentence means. The 2026-08-28 migration cleared
 * 8,197 occurrences across the app — but it never reached this corpus, and
 * `perspectiveVoice.test.ts` does not list the two files it builds, so
 * voiced-walkthroughs.json (9,361) and voiced-teachings.json (5,625) have been
 * shipping the banned pronoun on the play surfaces, unseen.
 *
 * Runs LAST in the pipeline: trim -> hand overrides -> perspective -> build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { rewritePerspective, BANNED_PLURAL } from './perspective.mjs';

const DIR = 'data/video-narration-voiced';
const write = process.argv.includes('--write');
const FIELDS = ['spoken', 'teaches', 'plans'];

let files = 0, changed = 0, fields = 0, before = 0, after = 0;
const samples = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const full = path.join(DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const json = JSON.parse(raw);
  let touched = false;
  for (const move of json.moves ?? []) {
    for (const f of FIELDS) {
      const v = move[f];
      const apply = (s) => {
        if (typeof s !== 'string' || !s) return s;
        if (BANNED_PLURAL.test(s)) before += 1;
        const next = rewritePerspective(s);
        if (next !== s) {
          fields += 1; touched = true;
          if (samples.length < 6) samples.push({ before: s, after: next });
        }
        if (BANNED_PLURAL.test(next)) after += 1;
        return next;
      };
      if (Array.isArray(v)) move[f] = v.map(apply);
      else if (typeof v === 'string') move[f] = apply(v);
    }
  }
  files += 1;
  if (!touched) continue;
  changed += 1;
  if (write) {
    const indent = (raw.match(/\n( +)"/) ?? [, ' '])[1];
    fs.writeFileSync(full, `${JSON.stringify(json, null, indent.length)}\n`);
  }
}

for (const s of samples) console.log(`\n  BEFORE: ${s.before.slice(0, 150)}\n  AFTER : ${s.after.slice(0, 150)}`);
console.log(`\n${files} files scanned, ${changed} changed, ${fields} field(s) rewritten`);
console.log(`passages carrying we/our/us: ${before} before -> ${after} after`);
console.log(write ? 'WRITTEN' : 'dry run — pass --write');
