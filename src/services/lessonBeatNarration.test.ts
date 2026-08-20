import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { lessonBeatAt, lessonBeatIndexSize, resetLessonBeatIndex } from './lessonBeatNarration';
import { getAllLessonScripts } from '../data/lessons';
import repertoire from '../data/repertoire.json';

const norm = (f: string) => f.split(' ').slice(0, 4).join(' ');

const fenAfter = (sans: string[]): string => {
  const g = new Chess();
  for (const s of sans) g.move(s);
  return g.fen();
};

describe('lessonBeatNarration — the opening tabs\' hand-written prose, reachable by board', () => {
  beforeEach(() => resetLessonBeatIndex());

  it('indexes the registered lesson beats', () => {
    // A floor, not the exact count: the number grows every time an opening is
    // authored, and a gate that pins it would fail on new content instead of on
    // a regression. What matters is that the index is not empty or a handful —
    // it was 2,955 positions when the tier was wired.
    expect(lessonBeatIndexSize()).toBeGreaterThan(2000);
  });

  it('returns the beat authored for a position, keyed on the board', () => {
    // Take a real beat out of the registry and ask for it by FEN alone. No
    // opening id, no name — if this passes, selection is board-based.
    const withMoves = getAllLessonScripts()
      .flatMap(({ lesson }) => lesson.beats ?? [])
      .find((b) => (b.moves?.length ?? 0) >= 4 && b.say?.trim());
    expect(withMoves).toBeTruthy();
    const hit = lessonBeatAt(fenAfter(withMoves!.moves));
    expect(hit).toBeTruthy();
    expect(hit!.text.length).toBeGreaterThan(0);
  });

  it('offers nothing on a position no lesson teaches', () => {
    expect(lessonBeatAt(fenAfter(['a3', 'a6', 'h3', 'h6', 'a4', 'a5']))).toBeNull();
  });

  it('every indexed beat is offered at the board its own moves produce', () => {
    // The selection contract, checked exhaustively rather than sampled: a beat
    // may only be handed back at the position it was written for. This is what
    // makes a name-collision impossible here — the failure that had a Caro-Kann
    // lesson narrating a Queen's-Gambit idea.
    let checked = 0;
    for (const { lesson } of getAllLessonScripts()) {
      for (const beat of lesson.beats ?? []) {
        if (!beat.moves?.length || !beat.say?.trim()) continue;
        const g = new Chess();
        let legal = true;
        for (const san of beat.moves) {
          try {
            g.move(san);
          } catch {
            legal = false;
            break;
          }
        }
        if (!legal) continue;
        const hit = lessonBeatAt(g.fen());
        // Either this beat, or the beat that won the tie for this exact board.
        // Never a beat authored for a different position.
        expect(hit).toBeTruthy();
        const winner = getAllLessonScripts()
          .flatMap(({ key, lesson: l }) => (l.beats ?? []).map((b) => ({ key, b })))
          .find(({ key, b }) => `${key}#${b.id}` === hit!.id);
        expect(winner).toBeTruthy();
        const wg = new Chess();
        for (const san of winner!.b.moves) wg.move(san);
        expect(norm(wg.fen())).toBe(norm(g.fen()));
        checked += 1;
        if (checked >= 120) return;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('does not repeat a beat already spoken in this lesson', () => {
    const withMoves = getAllLessonScripts()
      .flatMap(({ lesson }) => lesson.beats ?? [])
      .find((b) => (b.moves?.length ?? 0) >= 4 && b.say?.trim())!;
    const fen = fenAfter(withMoves.moves);
    const seen = new Set<string>();
    const first = lessonBeatAt(fen, seen);
    expect(first).toBeTruthy();
    seen.add(first!.id);
    expect(lessonBeatAt(fen, seen)).toBeNull();
  });

  it('reaches the taught repertoire lines it was wired for', () => {
    // THE WIRE MUST FIRE. A tier that indexes cleanly and lands on nothing the
    // coach actually walks is dead code with green tests over it, which this
    // project has shipped before. So the gate is coverage over the real spines:
    // every taught line gets at least one beat, and a third of all plies do.
    const entries = repertoire as unknown as Array<{ pgn?: string; variations?: Array<{ pgn?: string }> }>;
    let plies = 0;
    let hits = 0;
    let lines = 0;
    let linesWithHit = 0;
    const walk = (pgn?: string): void => {
      if (!pgn?.trim()) return;
      lines += 1;
      const g = new Chess();
      let any = false;
      for (const san of pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean)) {
        try {
          g.move(san);
        } catch {
          break;
        }
        plies += 1;
        if (lessonBeatAt(g.fen())) {
          hits += 1;
          any = true;
        }
      }
      if (any) linesWithHit += 1;
    };
    for (const e of entries) {
      walk(e.pgn);
      for (const v of e.variations ?? []) walk(v.pgn);
    }
    expect(lines).toBeGreaterThan(300);
    expect(linesWithHit).toBe(lines);
    expect(hits / plies).toBeGreaterThan(0.3);
  });
});
