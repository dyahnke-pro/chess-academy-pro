// The register guard: a Watch-register beat may not speak on a live board.
//
// Sibling of the seat guard (`curatedBeatSource.test.ts`, 2026-09-17). The seat
// asks WHOSE lesson this is; the register asks WHO IS BEING SPOKEN TO. Both are
// part of what identifies a teaching claim, and neither is visible on the board
// — which is why every other guard passed the prose this one refuses.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { beatRegister, curatedBeatAt, curatedBeatStats, warmCuratedBeatIndexSync } from './curatedBeatSource';
import { getAllLessonScripts } from '../data/lessons/index';

beforeAll(() => { warmCuratedBeatIndexSync(); });

describe('beatRegister — the classification', () => {
  it('refuses the student\'s own side named as an actor', () => {
    // Verbatim from `ruyLopez.ts`, heard by a WHITE student on their own move.
    expect(beatRegister('White does not attack the pawn. White attacks its defender — the c6-knight.', 'white'))
      .toBe('spectator');
    // The SAME sentence is correct for a Black student: it names the opponent,
    // which is a fact about the board, not the student talked about.
    expect(beatRegister('White pushes d4 and the centre opens.', 'black')).toBe('live-safe');
  });

  it('refuses a personal pronoun standing in for a player', () => {
    expect(beatRegister('Before the big central break, he takes away Black\'s pin on g4.', 'white'))
      .toBe('spectator');
  });

  it('does NOT sweep up a historical aside — the pronoun must sit beside a colour', () => {
    // A gate that fired on every "his" would silence real teaching for a
    // reference to a named player, which is not the defect.
    expect(beatRegister('Fischer made this line famous in his 1972 match.', 'white')).toBe('live-safe');
  });

  it('refuses lesson theatre wherever it appears, not only at the start', () => {
    // The old check was anchored to ^, so mid-beat theatre sailed through.
    expect(beatRegister('So let\'s rewind. The bishop slides back but never leaves the diagonal.', 'black'))
      .toBe('spectator');
    expect(beatRegister('Welcome. We study the oldest opening still played at the top.', 'white'))
      .toBe('spectator');
  });

  it('keeps the beats that teach the POSITION — Narration Voice Rule 3', () => {
    // Verbatim from `italianGame.ts`. Nothing about a player; everything about
    // the board. This is what still speaks live.
    expect(beatRegister(
      'Bc4 — the Italian bishop. From c4 it stares straight down the long light diagonal at f7, the only square near the king defended by nothing but the king.',
      'white',
    )).toBe('live-safe');
  });
});

describe('the live surface admits only live-safe beats', () => {
  it('a spectator beat that would have spoken live no longer does', () => {
    // The Ruy at ply 3 fired "The first thing White does is lean on the center…
    // How he defends will shape the entire game" at a WHITE student. Measured
    // 2026-09-17 on the live tape.
    const chess = new Chess();
    const hist: string[] = [];
    for (const san of ['e4', 'e5', 'Nf3']) { chess.move(san); hist.push(san); }
    const live = curatedBeatAt(hist, chess.fen(), undefined, 'Ruy Lopez', 'white', 'live');
    const watch = curatedBeatAt(hist, chess.fen(), undefined, 'Ruy Lopez', 'white', 'watch');
    // Watch still hears it — the beat is CORRECT where it was authored.
    expect(watch?.text).toMatch(/White/);
    // Live hears either nothing, or a different beat that is clean.
    if (live) expect(beatRegister(live.text, 'white')).toBe('live-safe');
    expect(live?.text).not.toBe(watch?.text);
  });

  it('falls THROUGH to a clean beat at the same position rather than going silent', () => {
    // The guard is a `continue`, not a `return null` — a position carrying both
    // a spectator beat and a clean one still teaches. Proven by finding one.
    let fellThrough = 0;
    for (const line of [
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O'],
    ]) {
      const c = new Chess();
      const hist: string[] = [];
      for (const san of line) {
        c.move(san); hist.push(san);
        const w = curatedBeatAt(hist, c.fen(), undefined, null, 'white', 'watch');
        const l = curatedBeatAt(hist, c.fen(), undefined, null, 'white', 'live');
        if (w && l && w.id !== l.id) fellThrough += 1;
      }
    }
    expect(fellThrough).toBeGreaterThan(0);
  });

  it('live teaching is REDUCED, not extinguished — the honest floor', () => {
    // Shrink-only in the other direction: if a future change drops this below
    // the floor, the live coach has gone quiet and someone must know.
    const { beats, liveSafe } = curatedBeatStats();
    expect(liveSafe).toBeGreaterThanOrEqual(900);
    expect(liveSafe).toBeLessThan(beats); // the guard does something
  });
});

describe('the census, so the owed bake has a number', () => {
  it('reports how much of the masterclass is Watch-only', () => {
    let deep = 0, safe = 0;
    for (const { lesson } of getAllLessonScripts()) {
      for (const b of lesson.beats ?? []) {
        const say = (b.say ?? '').trim();
        if (!say || (b.moves?.length ?? 0) < 3) continue;
        deep += 1;
        if (beatRegister(say, lesson.orientation) === 'live-safe') safe += 1;
      }
    }
    // Recorded, not asserted tightly: this number should RISE as the live
    // rendering is baked (BACKLOG §4.6). It must never be zero.
    expect(safe).toBeGreaterThan(0);
    expect(deep).toBeGreaterThan(safe);
    console.log(`[curated-beat register] ${safe}/${deep} live-safe (${(safe / deep * 100).toFixed(1)}%) — ${deep - safe} owed a live rendering`);
  });
});
