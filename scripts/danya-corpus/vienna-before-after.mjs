#!/usr/bin/env node
/**
 * vienna-before-after — the same Vienna Gambit walk, run twice: against the
 * corpus as it stands on `main`, and against the corpus as it stands now.
 *
 * David asked for a before/after example rather than another percentage, and
 * he is right that it is the only thing that can answer "is the matrix even
 * necessary". A rate tells you how often the coach speaks; it cannot tell you
 * whether the silence is a GATE refusing good teaching or an empty shelf.
 *
 * BEFORE is read straight out of git (`git show <ref>:<path>`) so nothing in
 * the working tree is disturbed — no checkout, no stash, no risk to an
 * in-flight pipeline. Both runs use the same retrieval logic, written here
 * against the raw JSON rather than importing the app's TypeScript, because the
 * point of comparison is the DATA: the app code is identical in both runs, so
 * holding it fixed and swapping only the corpus is what isolates the change.
 *
 * Selection here deliberately mirrors the shape of `noteAtPosition`'s
 * position/prefix tiers (exact FEN, then move-prefix) and applies the two
 * scope gates that can be evaluated without the app's private state. It is not
 * a substitute for the in-app walk (viennaNarrationExample.report.test.ts runs
 * the real selector) — it is the A/B that the in-app walk cannot do, since the
 * app can only ever see one corpus at a time.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const LINE = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Be7', 'd4', 'O-O', 'Bd3', 'f5', 'exf6', 'Bxf6'];
const LESSON = 'Vienna Gambit';
const BEFORE_REF = process.argv[2] ?? 'origin/main';

const PATHS = [
  'src/data/danya-teachings.json',
  'src/data/chessbrah-teachings.json',
  'public/data/hangingpawns-teachings.json',
  'public/data/saintlouis-teachings.json',
  'public/data/gothamchess-teachings.json',
  'public/data/hikaru-teachings.json',
  'public/data/imrosen-teachings.json',
  'public/data/magnuscarlsen-teachings.json',
];

function loadAt(ref) {
  const notes = [];
  for (const p of PATHS) {
    let raw;
    try {
      raw = ref === null
        ? readFileSync(p, 'utf8')
        : execFileSync('git', ['show', `${ref}:${p}`], { maxBuffer: 1 << 30, encoding: 'utf8' });
    } catch {
      continue; // the file may not exist at that ref — that IS part of the before
    }
    try { notes.push(...(JSON.parse(raw).notes ?? [])); } catch { /* unreadable at that ref */ }
  }
  return notes;
}

/** FEN for a prefix of the line, computed — never remembered (G3). */
function fensAlong(sans) {
  const b = new Chess();
  const out = [];
  for (const san of sans) { b.move(san); out.push(b.fen()); }
  return out;
}

// Same two prose gates the app applies at selection, reimplemented here only
// because this script cannot import the app's TS. Kept deliberately simple:
// any divergence would show up as this script and the in-app walk disagreeing
// on the AFTER column, which is why both are run.
const NAMED_VARIATION = /\b([A-Z][a-zA-Z'-]+(?:[ -][A-Z][a-zA-Z'-]+){0,2})\s+(?:Variation|Defense|Defence|Attack|Gambit|System|Opening|Game)\b/g;
const CLASS_WORDS = new Set(['defense', 'defence', 'variation', 'attack', 'gambit', 'system', 'opening', 'game']);
const lessonTokens = new Set(LESSON.toLowerCase().split(/[^a-z']+/).filter((t) => t.length > 2));

function staysInScope(note) {
  const prose = `${note.explains ?? ''} ${note.teaches ?? ''} ${note.plans ?? ''}`;
  NAMED_VARIATION.lastIndex = 0;
  for (const m of prose.matchAll(NAMED_VARIATION)) {
    const toks = (m[1] ?? '').toLowerCase().split(/[^a-z']+/).filter((t) => t.length > 2 && !CLASS_WORDS.has(t));
    if (toks.length === 0) continue;
    if (!toks.some((t) => lessonTokens.has(t))) return false;
  }
  return true;
}

function walk(notes) {
  const byFen = new Map();
  const byPrefix = new Map();
  for (const n of notes) {
    const line = n.lineSan ?? [];
    if (line.length === 0) continue;
    const key = line.join(' ');
    if (!byPrefix.has(key)) byPrefix.set(key, []);
    byPrefix.get(key).push(n);
    try {
      const b = new Chess();
      let ok = true;
      for (const san of line) { try { b.move(san); } catch { ok = false; break; } }
      if (!ok) continue;
      const f = b.fen();
      if (!byFen.has(f)) byFen.set(f, []);
      byFen.get(f).push(n);
    } catch { /* unreplayable line — not selectable either way */ }
  }

  const fens = fensAlong(LINE);
  return LINE.map((san, i) => {
    const prefix = LINE.slice(0, i + 1).join(' ');
    const pool = new Map();
    for (const n of byFen.get(fens[i]) ?? []) pool.set(n.id, n);
    for (const n of byPrefix.get(prefix) ?? []) pool.set(n.id, n);
    const all = [...pool.values()];
    const inScope = all.filter(staysInScope);
    const pick = inScope[0] ?? null;
    return {
      ply: i + 1,
      move: san,
      candidates: all.length,
      afterScope: inScope.length,
      text: pick ? [pick.explains, pick.teaches].filter(Boolean).join(' ').trim() : null,
      opening: pick?.opening ?? null,
    };
  });
}

const before = walk(loadAt(BEFORE_REF));
const after = walk(loadAt(null));

const spoke = (rows) => rows.filter((r) => r.text).length;
console.log(`\n╔══ VIENNA GAMBIT — ${LINE.join(' ')}`);
console.log(`║  BEFORE = ${BEFORE_REF}   AFTER = working tree`);
console.log(`╚══ plies with teaching:  before ${spoke(before)}/${LINE.length}   after ${spoke(after)}/${LINE.length}\n`);

for (let i = 0; i < LINE.length; i++) {
  const b = before[i], a = after[i];
  const changed = (b.text ?? '') !== (a.text ?? '');
  console.log(`── ply ${String(a.ply).padStart(2)}  ${a.move.padEnd(6)}  cand ${b.candidates}→${a.candidates}${changed ? '   ★ CHANGED' : ''}`);
  console.log(`   BEFORE: ${b.text ? `[${b.opening ?? '—'}] ${b.text.slice(0, 220)}` : '(silent)'}`);
  console.log(`   AFTER : ${a.text ? `[${a.opening ?? '—'}] ${a.text.slice(0, 220)}` : '(silent)'}`);
}
