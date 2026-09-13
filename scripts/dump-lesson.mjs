#!/usr/bin/env node
/**
 * dump-lesson — print one lesson's beats: the moves and the spoken narration.
 *
 * The companion to the engine tools. `soundness-sweep` says a line's eval is
 * negative and `diagnose-lesson-ply` says which move made it so, but NEITHER
 * can tell you whether that is a defect: a labelled gambit showcase is SUPPOSED
 * to be negative, and the doctrine says leave it. The only way to tell is to
 * read the moves and what the coach actually says about them.
 *
 * This exists because classifying by the lesson KEY is unreliable and cost a
 * wrong call (2026-09-13): "vienna-game::Vienna vs 2...Nc6" carries no gambit
 * word, so it was triaged as a quiet line and reported as the cleanest real
 * soundness defect. The moves are the Vienna Gambit into the Hamppe-Allgaier,
 * and the narration says "the pawn is bait" — an honest sacrifice, not a bug.
 * Read the beats before calling anything a defect.
 *
 * Usage: KEY='vienna-game::Vienna vs 2...Nc6' node scripts/dump-lesson.mjs
 */
import { build } from 'esbuild'; import { tmpdir } from 'os'; import { join } from 'path';
const o = join(tmpdir(), 'dump' + Date.now() + '.mjs');
await build({ entryPoints: ['src/data/lessons/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: o, loader: { '.json': 'json' }, logLevel: 'error' });
const m = await import(o);
const l = new Map(m.getAllLessonScripts().map(x => [x.key, x.lesson])).get(process.env.KEY);
console.log('title:', l.title ?? '(none)');
for (const b of l.beats) { console.log('---', JSON.stringify(b.moves)); console.log('  say:', (b.say ?? '').slice(0, 260)); }
