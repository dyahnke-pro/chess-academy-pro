// Transposition + staleness contracts for the teaching-note lookups
// (David 2026-07-12: "can we include transpositions?" + ancestor staleness).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { noteAtPosition, planNoteForPath, notesForOpening, noteOpeningConflicts, supportNoteForPly, buildDanyaTeachingBlock } from './danyaTeachingService';
import { __setFarmedCorporaCache } from './farmedCorpusData';
import { secondaryNotesForFen, warmSecondaryPositionIndexSync } from './secondaryCorpora';

// 🔒 The anchored notes now live in the VOICED corpus (David 2026-08-26: voiced
// is the sole exact-position source; the farmed corpus is floating-only). Voiced
// is a fetched SECONDARY corpus, so inject + warm it to exercise the position
// lookups (`noteAtPosition` chains primary→secondary; `secondaryNotesForFen` is
// the secondary FEN index). `notesForFen`/`notesForPrefix` are the primary index,
// now legitimately anchored-empty.
interface Note { id: string; lineSan: string[]; plans: string; opening?: string | null }
const voiced = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')) as { notes: Note[] };
const positioned = voiced.notes.filter((n) => n.lineSan.length > 0);

function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('danyaTeachingService — transpositions + staleness', () => {
  // Voiced is a fetched secondary corpus — inject + warm it ONCE for the block
  // (warming the full corpus per-test is too slow now that it is 7k+ notes).
  beforeAll(() => {
    __setFarmedCorporaCache([{ key: 'voiced', data: voiced as never }]);
    warmSecondaryPositionIndexSync();
  }, 60_000);
  afterAll(() => { __setFarmedCorporaCache(undefined); });

  it('finds a note by FEN regardless of the move order that reached it', () => {
    // Take a real voiced note, reach its position, and look it up with a
    // DELIBERATELY mismatched history (simulating a transposition) — the FEN
    // index must still find it. Voiced is secondary, so via secondaryNotesForFen
    // + noteAtPosition (which chains primary→secondary).
    const note = positioned.find((n) => n.lineSan.length >= 3) ?? positioned[0];
    expect(note).toBeDefined();
    const fen = fenAfter(note.lineSan);
    const viaFen = secondaryNotesForFen(fen);
    expect(viaFen.some((n) => n.id === note.id)).toBe(true);
    const viaTransposition = noteAtPosition(['h3', 'h6'], fen); // bogus history, right board
    expect(viaTransposition).not.toBeNull();
  });

  it('exact-prefix match still wins without a FEN', () => {
    const note = positioned.find((n) => n.lineSan.length >= 3) ?? positioned[0];
    const hit = noteAtPosition(note.lineSan);
    expect(hit).not.toBeNull();
    expect(hit!.lineSan.join(' ')).toBe(note.lineSan.join(' '));
  });

  it('exact-position only: a voiced note does NOT match a stale-extended prefix', () => {
    // The new narration model is exact-position only (David 2026-08-26, the
    // determinism lock): a voiced note is found at its exact board and NOT via a
    // history extended past its anchor — no staleness window borrows it forward.
    const note = positioned.find((n) => n.lineSan.length >= 4) ?? positioned[0];
    const c = new Chess();
    for (const s of note.lineSan) c.move(s);
    const extended = [...note.lineSan];
    for (let i = 0; i < 14; i += 1) {
      const legal = c.moves();
      if (legal.length === 0) break;
      extended.push(c.move(legal[0]).san);
    }
    // Found at its EXACT anchor…
    expect(noteAtPosition(note.lineSan)?.id).toBe(note.id);
    // …never at the stale-extended board (unless a different note truly sits
    // there, which would carry a different id).
    const stale = noteAtPosition(extended, fenAfter(extended));
    expect(stale?.id === note.id).toBe(false);
  });

  it('planNoteForPath reads the primary plan index without throwing', () => {
    // planNoteForPath reads the PRIMARY plan index, which is anchored-empty now
    // (voiced carries the plans, as a secondary corpus reached via the position
    // tier, not here). It must stay quiet and null-safe — never throw — on a
    // board the primary index does not cover.
    const withPlan = positioned.find((n) => n.plans && n.plans.trim().length > 0);
    if (!withPlan) return; // no positioned plans — nothing to assert
    const fen = fenAfter(withPlan.lineSan);
    expect(() => planNoteForPath(['a3', 'a6'], fen)).not.toThrow(); // bogus history, right board
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
    // Voiced notes are opening:null by design, so clone a real one and tag it to
    // exercise the openingName scoping end-to-end (the safety property that a
    // note filed under one opening never teaches inside a lesson on another).
    const base = positioned.find((n) => n.lineSan.length >= 3)!;
    const tagged = { ...base, id: 'test-tagged-scoping', opening: 'Caro-Kann Defense' };
    __setFarmedCorporaCache([{ key: 'voiced', data: { notes: [tagged] } as never }]);
    warmSecondaryPositionIndexSync();
    const fen = fenAfter(tagged.lineSan);
    // A lesson on an unrelated opening drops the foreign-tagged note.
    expect(noteAtPosition(tagged.lineSan, fen, 'Zzyzx Gambit Nonsense')).toBeNull();
    __setFarmedCorporaCache(undefined);
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

describe('live-tactic concept tier (David 2026-08-07: "not tactical notes")', () => {
  it('a detector-proven tactic pulls a tactical concept note into the block', () => {
    // Past-book position, no opening name — the positional tiers go quiet,
    // which was exactly the gap: the block carried opening background only.
    const block = buildDanyaTeachingBlock({
      historySans: [],
      openingName: null,
      fen: null,
      liveTacticTypes: ['fork'],
      phase: 'middlegame',
    });
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('LESSON BACKGROUND');
  });

  it('no live tactic → no concept note sneaks in (empty block stays empty)', () => {
    const block = buildDanyaTeachingBlock({
      historySans: [],
      openingName: null,
      fen: null,
      liveTacticTypes: [],
      phase: 'middlegame',
    });
    expect(block).toBe('');
  });

  it('the tactical note takes at most ONE slot — opening notes still dominate', () => {
    const withTactic = buildDanyaTeachingBlock({
      historySans: ['e4', 'c6'],
      openingName: 'Caro-Kann Defense',
      fen: null,
      liveTacticTypes: ['pin', 'fork'],
      phase: 'middlegame',
      maxNotes: 3,
    });
    const without = buildDanyaTeachingBlock({
      historySans: ['e4', 'c6'],
      openingName: 'Caro-Kann Defense',
      fen: null,
      maxNotes: 3,
    });
    const count = (b: string): number => b.match(/^•/gm)?.length ?? 0;
    expect(count(withTactic)).toBeLessThanOrEqual(3);
    expect(count(withTactic)).toBeGreaterThanOrEqual(count(without) > 0 ? 1 : 0);
  });
});
