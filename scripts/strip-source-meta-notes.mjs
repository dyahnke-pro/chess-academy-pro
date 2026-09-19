#!/usr/bin/env node
/**
 * strip-source-meta-notes — a corpus note must teach CHESS, not describe the
 * video it came from.
 *
 * David 2026-09-19, reading real samples: "those we do not need. they were
 * messing up the narration for our coach" … "these notes are ok to delete".
 * The two he pointed at:
 *
 *   "In the early stages of a theoretical speed run, general concepts are
 *    emphasized over specific opening theory…"                    ← the FORMAT
 *   "The opponent played with extremely high accuracy… which left the speaker
 *    with no chances."                                          ← the NARRATOR
 *
 * AND THEY REALLY DID LEAK. `noteTeachesChessNotItsSource` existed, but it was
 * called in only THREE places — `supportNoteForPly`, `noteAtPosition`,
 * `transitionTeachingSourceForGame`. Every tier a floating note is actually
 * reached by (`spokenTacticNote`, `endgameNoteForLesson`, `conceptNotesFor`,
 * `buildDanyaTeachingBlock`, `notesForOpening`) had NO filter, so this prose
 * reached the endgame cards, the tactic drill and the LESSON BACKGROUND block
 * handed to the model. The runtime fix is to filter at LOAD, where every tier
 * inherits it; this script removes the notes from the payload as well, so they
 * are neither shipped nor parsed.
 *
 * THE RULE IS A CONJUNCTION — names the medium AND carries no chess of its own.
 * See `sourceMeta.shared.mjs` for why: three cheaper rules were tried and each
 * deleted real teaching (1,415 / 23 / 2,712 notes respectively). This removes
 * 354 of 65,712 — 0.54% — and measured against the surfaces that consume the
 * floating tier, costs NOTHING: endgame cards 23/27 before and 23/27 after,
 * same four misses.
 *
 * Nothing is deleted: every stripped note is written to
 * `data/archive/corpus-source-meta/`. Re-runnable, and `--check` is the gate.
 *
 *   node scripts/strip-source-meta-notes.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { noteTeachesChess } from '../src/services/sourceMeta.shared.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const ARCHIVE = resolve(root, 'data/archive/corpus-source-meta');
const checkOnly = process.argv.includes('--check');

const registry = JSON.parse(readFileSync(resolve(root, 'src/data/corpora.json'), 'utf8'));
const paths = registry.corpora.flatMap((c) => (c.floatingPath ? [c.path, c.floatingPath] : [c.path]));

if (!checkOnly) mkdirSync(ARCHIVE, { recursive: true });

let keptTotal = 0;
let strippedTotal = 0;

for (const rel of paths) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  const bundle = JSON.parse(readFileSync(path, 'utf8'));
  const notes = bundle.notes ?? [];
  const kept = notes.filter((n) => noteTeachesChess(n));
  const stripped = notes.filter((n) => !noteTeachesChess(n));
  keptTotal += kept.length;
  strippedTotal += stripped.length;

  if (checkOnly) {
    if (stripped.length) {
      console.error(`✗ ${rel}: ${stripped.length} notes describe their source, not chess`);
      process.exitCode = 1;
    }
    continue;
  }
  if (stripped.length === 0) continue;
  writeFileSync(
    resolve(ARCHIVE, basename(rel).replace(/\.json$/, '-source-meta.json')),
    JSON.stringify({ ...bundle, noteCount: stripped.length, notes: stripped }, null, 1),
  );
  writeFileSync(path, JSON.stringify({ ...bundle, noteCount: kept.length, notes: kept }));
  console.log(`  ${rel.padEnd(42)} kept ${String(kept.length).padStart(6)}, stripped ${String(stripped.length).padStart(4)}`);
}

if (checkOnly && !process.exitCode) console.log('✓ every shipped corpus teaches chess, not its source');
else if (!checkOnly) console.log(`\n  TOTAL kept ${keptTotal}, stripped ${strippedTotal} → ${ARCHIVE}`);
