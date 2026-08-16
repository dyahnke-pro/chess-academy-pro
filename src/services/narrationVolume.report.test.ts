// How LONG does a ply actually speak now that the count cap is gone?
//
// Removing the cap was right — 766 of 1,310 plies have nothing to say, so the
// worry about flooding was never about the average ply. It is about the tail:
// one ply reached 29 usable notes, and 37 plies carry four or more. Nobody
// wants a two-minute monologue on move six because the corpus happens to be
// deep there.
//
// Before writing a budget, measure the thing the budget would govern: SPOKEN
// WORDS per ply, not notes per ply. Two notes of eleven words each is a normal
// sentence; one note of 140 is a lecture. A count cap cannot tell those apart,
// which is exactly why David asked for a matrix instead of a cap.
//
// Instrument only. No assertions beyond the walk completing.
import { describe, it, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { loadFullCorpus } from '../test/loadFullCorpus';
import { loadSpokenBake } from '../test/loadSpokenBake';
import { noteArrowSourceAt } from './openingGenerator';

interface Entry { name?: string; pgn?: string }
const sansOf = (pgn: string): string[] =>
  (pgn || '').trim().split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

describe('narration volume', () => {
  beforeAll(() => {
    loadFullCorpus();
    loadSpokenBake();
  }, 180_000);

  it('measures spoken words per ply across the repertoire walk', () => {
    const rep = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8')) as
      | Entry[] | Record<string, Entry[]>;
    const entries: Entry[] = Array.isArray(rep) ? rep : Object.values(rep).flat();

    const perPly: number[] = [];
    const perLesson: Array<{ opening: string; plies: number; spoke: number; words: number }> = [];
    const worst: Array<{ opening: string; ply: number; words: number; text: string }> = [];

    for (const entry of entries) {
      const sans = sansOf(entry.pgn ?? '');
      if (!sans.length) continue;
      const board = new Chess();
      const history: string[] = [];
      const seen = new Set<string>();
      let lessonWords = 0;
      let spoke = 0;

      for (const san of sans) {
        try { board.move(san); } catch { break; }
        history.push(san);
        const text = noteArrowSourceAt(history, board.fen(), seen, entry.name ?? null);
        if (!text) continue;
        const w = words(text);
        perPly.push(w);
        lessonWords += w;
        spoke += 1;
        worst.push({ opening: entry.name ?? '?', ply: history.length, words: w, text });
      }
      if (spoke > 0) {
        perLesson.push({
          opening: entry.name ?? '?', plies: history.length, spoke, words: lessonWords,
        });
      }
    }

    perPly.sort((a, b) => a - b);
    const pct = (p: number): number => perPly[Math.min(perPly.length - 1, Math.floor(perPly.length * p))] ?? 0;
    worst.sort((a, b) => b.words - a.words);

    // Seconds of speech, at the ~150 wpm a TTS voice runs at — the unit a
    // student actually experiences, and the one a budget should be set in.
    const secs = (w: number): number => Number((w / 2.5).toFixed(1));

    const report = {
      generatedAt: new Date().toISOString().slice(0, 10),
      question: 'How many words does a ply speak with the count cap removed?',
      speakingPlies: perPly.length,
      totalWords: perPly.reduce((a, b) => a + b, 0),
      wordsPerSpeakingPly: {
        min: perPly[0] ?? 0,
        p50: pct(0.5),
        p75: pct(0.75),
        p90: pct(0.9),
        p99: pct(0.99),
        max: perPly[perPly.length - 1] ?? 0,
      },
      secondsPerSpeakingPly: {
        p50: secs(pct(0.5)), p90: secs(pct(0.9)), max: secs(perPly[perPly.length - 1] ?? 0),
      },
      pliesOver60Words: perPly.filter((w) => w > 60).length,
      pliesOver120Words: perPly.filter((w) => w > 120).length,
      pliesOver200Words: perPly.filter((w) => w > 200).length,
      heaviestLessons: perLesson.sort((a, b) => b.words - a.words).slice(0, 8),
      heaviestPlies: worst.slice(0, 6).map((w) => ({
        opening: w.opening, ply: w.ply, words: w.words, seconds: secs(w.words),
        text: `${w.text.slice(0, 220)}…`,
      })),
    };
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync('audit-reports/narration-volume.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }, 900_000);
});
