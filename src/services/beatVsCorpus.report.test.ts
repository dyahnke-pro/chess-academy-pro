// Which source actually teaches more: the hand-written beats or the farmed
// corpus? (David 2026-08-14: "I THINK! DOUBLE CHECK ME!")
//
// Raw totals make the answer look obvious — 64,973 notes against 1,659 beats —
// and that comparison is wrong twice over. Only 6,738 notes carry a POSITION at
// all, while every beat does; and a note that cannot be spoken teaches nothing,
// which is true of 5,327 of them today. What matters for per-ply narration is
// how often each source can actually say something at the board in front of the
// student, so that is what this counts.
//
// Walks the same 1,310 plies of `repertoire.json` every other coverage report
// uses, and at each ply asks BOTH sources the same question through their real
// selectors — `curatedBeatAt` and `noteAtPosition` — never a reimplementation.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { noteAtPosition, spokenBeatText } from './danyaTeachingService';
import { curatedBeatAt, warmCuratedBeatIndexSync, curatedBeatStats } from './curatedBeatSource';

interface Entry { name?: string; pgn?: string }

const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

describe('beats vs corpus — which one can speak, and where', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
    // The beat index is built by the boot prewarm, which nothing calls in
    // vitest — without it curatedBeatAt answers null for every ply and this
    // report would score the beats at zero. Same trap as loadFullCorpus.
    warmCuratedBeatIndexSync();
    const s = curatedBeatStats();
    if (!s.built || s.beats === 0) throw new Error('beat index empty — the comparison would be meaningless');
    console.log();
  }, 180_000);

  it('counts both sources over the repertoire walk', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[]
      | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const t = { plies: 0, beatOnly: 0, corpusOnly: 0, both: 0, neither: 0 };
    const byPhase: Record<string, { plies: number; beat: number; corpus: number }> = {
      opening: { plies: 0, beat: 0, corpus: 0 },
      middlegame: { plies: 0, beat: 0, corpus: 0 },
      endgame: { plies: 0, beat: 0, corpus: 0 },
    };
    /** Where BOTH speak — the positions an ordering decision actually changes. */
    const overlap: Array<{ opening: string; ply: number; beat: string; note: string }> = [];

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (sans.length === 0) continue;
      const board = new Chess();
      const history: string[] = [];
      // Fresh per entry: both selectors take a seen-set, and sharing one across
      // openings would let the first opening starve the rest.
      const beatSeen = new Set<string>();

      for (const san of sans) {
        try { board.move(san); } catch { break; }
        history.push(san);
        const fen = board.fen();
        const ply = history.length;
        const phase = ply <= 20 ? 'opening' : ply <= 60 ? 'middlegame' : 'endgame';
        t.plies += 1;
        byPhase[phase].plies += 1;

        const beat = curatedBeatAt(history, fen, beatSeen, entry.name ?? null);
        const note = noteAtPosition(history, fen, entry.name ?? null);
        // A note that cannot be spoken has not taught anything, so require
        // speakable text on both sides rather than mere existence.
        const beatText = beat ? String((beat as { text?: string }).text ?? '').trim() : '';
        const noteText = note ? spokenBeatText(note).trim() : '';
        const hasBeat = beatText.length > 0;
        const hasNote = noteText.length > 0;

        if (hasBeat) byPhase[phase].beat += 1;
        if (hasNote) byPhase[phase].corpus += 1;
        if (hasBeat && hasNote) {
          t.both += 1;
          if (overlap.length < 25) {
            overlap.push({
              opening: entry.name ?? '?', ply,
              beat: beatText.slice(0, 200), note: noteText.slice(0, 200),
            });
          }
        } else if (hasBeat) t.beatOnly += 1;
        else if (hasNote) t.corpusOnly += 1;
        else t.neither += 1;
      }
    }

    const pct = (n: number): string => `${((100 * n) / t.plies).toFixed(1)}%`;
    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'Per ply, which source can actually SPEAK — hand-written beat, farmed corpus, both, neither?',
      plies: t.plies,
      beatSpeaks: t.beatOnly + t.both,
      corpusSpeaks: t.corpusOnly + t.both,
      beatOnly: t.beatOnly,
      corpusOnly: t.corpusOnly,
      both: t.both,
      neither: t.neither,
      /** The ONLY plies an ordering change affects. Everywhere else, whichever
       *  source has something is the one that speaks regardless of priority. */
      pliesOrderingActuallyChanges: t.both,
      byPhase,
      overlapSamples: overlap,
    };

    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/beat-vs-corpus.json', JSON.stringify(report, null, 2));

    console.log(`\n════ ${t.plies} plies of repertoire.json ════`);
    console.log(`  beat can speak    ${String(t.beatOnly + t.both).padStart(5)}  ${pct(t.beatOnly + t.both)}`);
    console.log(`  corpus can speak  ${String(t.corpusOnly + t.both).padStart(5)}  ${pct(t.corpusOnly + t.both)}`);
    console.log(`  ─────`);
    console.log(`  beat ONLY         ${String(t.beatOnly).padStart(5)}  ${pct(t.beatOnly)}   (corpus silent — beats are load-bearing here)`);
    console.log(`  corpus ONLY       ${String(t.corpusOnly).padStart(5)}  ${pct(t.corpusOnly)}   (no beat — corpus is load-bearing here)`);
    console.log(`  BOTH              ${String(t.both).padStart(5)}  ${pct(t.both)}   <-- the only plies the ORDER changes`);
    console.log(`  neither           ${String(t.neither).padStart(5)}  ${pct(t.neither)}`);
    console.log(`\nby phase:`);
    for (const [k, v] of Object.entries(byPhase)) {
      console.log(`  ${k.padEnd(11)} plies ${String(v.plies).padStart(4)}   beat ${String(v.beat).padStart(4)}   corpus ${String(v.corpus).padStart(4)}`);
    }
  }, 900_000);
});
