// Transposition + staleness contracts for the teaching-note lookups
// (David 2026-07-12: "can we include transpositions?" + ancestor staleness).

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import teachings from '../data/danya-teachings.json';
import { notesForFen, noteAtPosition, planNoteForPath, notesForPrefix, notesForOpening, noteOpeningConflicts, supportNoteForPly, buildDanyaTeachingBlock } from './danyaTeachingService';

interface Note { id: string; lineSan: string[]; plans: string }
const positioned = (teachings as { notes: Note[] }).notes.filter((n) => n.lineSan.length > 0);

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('danyaTeachingService — transpositions + staleness', () => {
  it('finds a note by FEN regardless of the move order that reached it', () => {
    // Take a real corpus note, reach its position, and look it up with a
    // DELIBERATELY mismatched history (simulating a transposition) — the FEN
    // index must still find it.
    const note = positioned[0];
    expect(note).toBeDefined();
    const fen = fenAfter(note.lineSan);
    const viaFen = notesForFen(fen, 5);
    expect(viaFen.some((n) => n.id === note.id)).toBe(true);
    const viaTransposition = noteAtPosition(['h3', 'h6'], fen); // bogus history, right board
    expect(viaTransposition).not.toBeNull();
  });

  it('exact-prefix match still wins without a FEN', () => {
    const note = positioned[0];
    const hit = noteAtPosition(note.lineSan);
    expect(hit?.lineSan.join(' ')).toBe(note.lineSan.join(' '));
  });

  it('notesForPrefix honors the staleness window', () => {
    const note = positioned.find((n) => n.lineSan.length >= 4) ?? positioned[0];
    // Extend the history far past the note's anchor with legal filler moves.
    const c = new Chess();
    for (const s of note.lineSan) c.move(s);
    const extended = [...note.lineSan];
    for (let i = 0; i < 14; i += 1) {
      const legal = c.moves();
      if (legal.length === 0) break;
      // Deterministic filler: first legal move.
      const mv = c.move(legal[0]);
      extended.push(mv.san);
    }
    if (extended.length - note.lineSan.length >= 13) {
      // Anchored >12 plies back → windowed lookup must skip it…
      const windowed = notesForPrefix(extended, 6, 12);
      expect(windowed.some((n) => n.id === note.id)).toBe(false);
      // …while the unwindowed lookup still finds it.
      const unwindowed = notesForPrefix(extended, 50);
      expect(unwindowed.some((n) => n.id === note.id)).toBe(true);
    }
  });

  it('planNoteForPath prefers the exact position over stale ancestors', () => {
    const withPlan = positioned.find((n) => n.plans && n.plans.trim().length > 0);
    if (!withPlan) return; // corpus wave without positioned plans — nothing to assert
    const fen = fenAfter(withPlan.lineSan);
    const hit = planNoteForPath(['a3', 'a6'], fen); // bogus history, right board
    expect(hit).not.toBeNull();
    expect(hit!.plans.trim().length).toBeGreaterThan(0);
  });
});

// ── Opening-name matching across the app's vocabulary and the corpus's.
// The app writes British spellings + diacritics; corpus tags come from the
// Lichess DB in American ASCII. Before the fold, "French Defence" scored 0.50
// against "French Defense" and matched NOTHING, while "Réti Opening" degraded
// to the single token "opening" and matched 344 notes from a dozen unrelated
// openings at a perfect score.
describe('notesForOpening — name vocabulary', () => {
  it('matches British spellings against American corpus tags', () => {
    for (const name of ['French Defence', 'Pirc Defence', 'Dutch Defence', 'Slav Defence']) {
      const hits = notesForOpening(name, 5);
      expect(hits.length, `${name} should reach its corpus notes`).toBeGreaterThan(0);
    }
  });

  it('matches diacritic names against their ASCII corpus tags', () => {
    expect(notesForOpening('Grünfeld Defence', 5).length).toBeGreaterThan(0);
  });

  it('never matches on a generic token alone', () => {
    // "Réti Opening" shares only "opening" with these, so each must be absent.
    const hits = notesForOpening('Réti Opening', 40);
    const wrong = hits.filter((n) => /Ponziani|Catalan|Bishop's Opening|Polish|Van't Kruijs/i.test(n.opening ?? ''));
    expect(wrong.map((n) => n.opening)).toEqual([]);
  });

  it('still matches the opening it actually names', () => {
    const hits = notesForOpening('Caro-Kann Defence', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((n) => /caro/i.test(n.opening ?? ''))).toBe(true);
  });
});

// ── The Vienna-taught-the-Caro-Kann incident (David 2026-08-02) ────────────
// Teaching the Vienna Copycat, the first ply was narrated with a note anchored
// at ["e4"] and tagged "Caro-Kann Defense: Advance Variation, Botvinnik-Carls
// Defense", so the coach opened a Vienna lesson by recounting a Caro-Kann game.
describe('noteAtPosition — stays on the opening being taught', () => {
  it('rejects a note tagged with a different opening than the lesson', () => {
    expect(noteOpeningConflicts('Caro-Kann Defense: Advance Variation', 'Vienna Game: Copycat Variation')).toBe(true);
    expect(noteOpeningConflicts('Sicilian Defense: Najdorf', "King's Indian Defense")).toBe(true);
  });

  it('accepts a note from the same opening family, including sub-variations', () => {
    expect(noteOpeningConflicts('Vienna Game', 'Vienna Game: Copycat Variation')).toBe(false);
    expect(noteOpeningConflicts('Sicilian Defense: Scheveningen', 'Sicilian Defense: Najdorf Variation')).toBe(false);
    // British/American vocabulary must not read as a different opening.
    expect(noteOpeningConflicts('French Defense: Winawer', 'French Defence')).toBe(false);
  });

  it('has nothing to contradict when either side is untagged', () => {
    expect(noteOpeningConflicts(null, 'Vienna Game')).toBe(false);
    expect(noteOpeningConflicts('Vienna Game', null)).toBe(false);
  });

  it('does not teach a corpus note through a lesson on another opening', () => {
    const tagged = positioned.find((n) => (n as unknown as { opening: string | null }).opening);
    expect(tagged).toBeDefined();
    const opening = (tagged as unknown as { opening: string }).opening;
    const fen = fenAfter(tagged.lineSan);
    // Same position, two different lessons: its own opening keeps the note,
    // an unrelated one drops it.
    expect(noteAtPosition(tagged.lineSan, fen, opening)?.opening).toBe(opening);
    expect(noteAtPosition(tagged.lineSan, fen, 'Zzyzx Gambit Nonsense')).toBeNull();
  });

  it('never teaches from an anchor too short to identify a position', () => {
    for (const shallow of [['e4'], ['d4'], ['e4', 'e5'], ['d4', 'd5']]) {
      const hit = noteAtPosition(shallow, fenAfter(shallow));
      expect(hit, `a ${shallow.length}-ply anchor is not position teaching`).toBeNull();
    }
  });
});

// David 2026-08-02: "tighten the narration notes just a touch… make sure the
// coach stays scoped to the opening that it was asked to teach."
describe('scoped to the taught opening', () => {
  it('does not borrow another opening\'s teaching inside a named lesson', () => {
    // Mid-lesson position, an opening the student named. Structure transfer is
    // for a board past book, not for a lesson requested by name.
    const sans = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5'];
    const fen = fenAfter(sans);
    const note = supportNoteForPly(sans, fen, 'Vienna Game: Vienna Gambit');
    if (note) {
      expect(noteOpeningConflicts(note.opening, 'Vienna Game: Vienna Gambit')).toBe(false);
    }
  });

  it('keeps off-opening notes out of the teaching block', () => {
    const sans = ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5'];
    const block = buildDanyaTeachingBlock({
      historySans: sans,
      fen: fenAfter(sans),
      openingName: 'Vienna Game: Vienna Gambit',
      maxNotes: 4,
    });
    // Whatever it picked, nothing in it may advertise a different opening.
    for (const other of ['Caro-Kann', 'Najdorf', 'Grünfeld', 'Stonewall']) {
      expect(block, `block must not teach the ${other}`).not.toContain(other);
    }
  });
});

// The support tier needs the same anchor floor as the exact tier (David
// 2026-08-02, verifying the first fix): the Vienna came back clean, but a
// Caro-Kann lesson still opened move ONE with `hp-5d5` — the ["e4"]-anchored
// note recounting a game six moves deep. The exact tier refused it; the support
// tier picked it straight back up, because its only scope check was the opening
// tag, and for a Caro-Kann lesson the tag agrees.
describe('the first few moves of a lesson', () => {
  it('never teaches from an anchor too short to be about the position', () => {
    for (const [lesson, line] of [
      ['Caro-Kann Defense: Advance Variation', ['e4', 'c6', 'd4']],
      ['Vienna Game: Copycat Variation', ['e4', 'e5', 'Nc3']],
      ["King's Indian Defense", ['d4', 'Nf6', 'c4']],
    ] as Array<[string, string[]]>) {
      const chess = new Chess();
      const prefix: string[] = [];
      for (const san of line) {
        chess.move(san);
        prefix.push(san);
        const note = noteAtPosition(prefix, chess.fen(), lesson)
          ?? supportNoteForPly(prefix, chess.fen(), lesson);
        if (note) {
          expect(
            note.lineSan.length,
            `${lesson} ply ${prefix.length}: note ${note.id} is anchored at ${note.lineSan.length} ply`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
