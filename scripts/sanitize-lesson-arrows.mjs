#!/usr/bin/env node
// Auto-sanitize pro-rep lesson ARROWS to the lead-the-eye doctrine.
//
// Green vision arrows must originate on a RESTING NON-PAWN piece. An arrow from
// an empty square (a move-trail) or from a pawn (a pawn push) is a defect —
// move/pawn squares are shown by orange highlights, not arrows. This codemod
// replays each beat's moves with chess.js and DROPS any arrow whose `from`
// square is empty or holds a pawn at the beat's resolved position. Idempotent.
//
// SCOPE: pro-ericrosen-* lesson files by default (the Eric Rosen build follows
// the strict masterclass arrow standard). The legacy Gotham/Naroditsky lessons
// legitimately use pawn-push intent arrows (per the narrationAccuracy note), so
// they are NOT touched unless added to SCOPE_RE.
//
// Used two ways:
//   - `node scripts/sanitize-lesson-arrows.mjs`         → fix in place, report
//   - `node scripts/sanitize-lesson-arrows.mjs --check` → exit 1 if any defect
//     remains (for CI / the proEricRosenLessonArrows gate). No writes.
// Runs automatically via the PostToolUse hook in .claude/settings.json whenever
// a matching lesson file is edited.

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const LESSON_DIR = path.join('src', 'data', 'lessons');
const SCOPE_RE = /^proEricRosen.*\.ts$/;
const CHECK = process.argv.includes('--check');

function sanitizeFile(file) {
  const p = path.join(LESSON_DIR, file);
  let src = fs.readFileSync(p, 'utf8');
  const parts = src.split('b({');
  let dropped = 0;
  for (let i = 1; i < parts.length; i++) {
    let chunk = parts[i];
    const mMoves = chunk.match(/moves:\s*'([^']*)'/);
    const mArrows = chunk.match(/arrows:\s*\[([^\]]*)\]/);
    if (!mMoves || !mArrows) continue;
    const moves = mMoves[1].trim().split(/\s+/).filter(Boolean);
    const c = new Chess();
    let ok = true;
    for (const mv of moves) { try { c.move(mv); } catch { ok = false; break; } }
    if (!ok) continue;
    const tokens = mArrows[1].match(/A\([^)]*\)/g) || [];
    const kept = tokens.filter((t) => {
      const sq = t.match(/'([a-h][1-8])'/);
      if (!sq) return true;
      const pc = c.get(sq[1]);
      return pc && pc.type !== 'p';
    });
    dropped += tokens.length - kept.length;
    const replacement = kept.length ? `arrows: [${kept.join(', ')}]` : 'arrows: []';
    chunk = chunk.replace(/arrows:\s*\[[^\]]*\]/, replacement);
    parts[i] = chunk;
  }
  const out = parts.join('b({');
  if (dropped > 0 && !CHECK) fs.writeFileSync(p, out);
  return dropped;
}

const files = fs.readdirSync(LESSON_DIR).filter((f) => SCOPE_RE.test(f) && !f.endsWith('.test.ts'));
let total = 0;
for (const f of files) {
  const n = sanitizeFile(f);
  if (n > 0) { total += n; console.log(`${CHECK ? 'WOULD FIX' : 'fixed'} ${f}: ${n} arrow(s) from empty/pawn origin`); }
}
if (total === 0) {
  console.log(`lesson arrows clean (${files.length} files scanned)`);
} else if (CHECK) {
  console.error(`\n${total} arrow(s) violate the lead-the-eye doctrine. Run: node scripts/sanitize-lesson-arrows.mjs`);
  process.exit(1);
} else {
  console.log(`\nsanitized ${total} arrow(s) across ${files.length} files`);
}
