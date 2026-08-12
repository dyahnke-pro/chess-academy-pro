// The hand-written tier: it must reach the voice, and it must land on the right
// board.
//
// 🔒 DAVID 2026-08-12: "I still want the computer narrations to fire after the
// handwritten narrations." All 318 variations in repertoire.json carry authored
// prose and none of it reached the walkthrough — the splice went straight from
// corpus note to model output.
//
// THE RISK THIS GATE EXISTS FOR: an `explanation` is about a VARIATION, not a
// ply. Dropping it on whichever ply happened to be silent is exactly the
// mis-anchoring that once put a Caro-Kann tactic on move two and cost this
// project a locked rule. Being hand-written earns no exemption — a true
// sentence on the wrong board is still a lie. So it speaks once, at the ply its
// own line departs from the main line, selected by moves and never by name.
import { describe, it, expect } from 'vitest';
import { authoredNoteAt, authoredEntryFor, divergencePly, sansOf } from './authoredOpeningNotes';
import repertoire from '../data/repertoire.json';

const ENTRY = {
  pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4',
  variations: [
    { name: 'Main Line', pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4', explanation: 'The main battleground.' },
    { name: 'Hungarian', pgn: 'e4 e5 Nf3 Nc6 Bc4 Be7 d4 d6', explanation: 'Black tucks the bishop away on e7.' },
    { name: 'No prose', pgn: 'e4 e5 Nf3 Nc6 Bc4 Nf6', explanation: '' },
  ],
};

describe('an authored explanation speaks where its line begins', () => {
  it('fires at the departing move, not before it', () => {
    // The Hungarian departs at ply 5 (…Be7 instead of …Bc5). Every earlier ply
    // is still shared with the main line, so the text is not yet about anything.
    const used = new Set<string>();
    for (const upto of [1, 2, 3, 4, 5]) {
      expect(authoredNoteAt(ENTRY, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7'].slice(0, upto), used))
        .toBeNull();
    }
    const hit = authoredNoteAt(ENTRY, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7'], used);
    expect(hit?.variationName).toBe('Hungarian');
    expect(hit?.text).toContain('e7');
  });

  it('does not speak a variation the game is not actually in', () => {
    // Sharing a prefix is not being on the line. After …Bc5 the Hungarian is
    // ruled out, and its prose must never appear.
    const used = new Set<string>();
    const hit = authoredNoteAt(ENTRY, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], used);
    expect(hit?.variationName).not.toBe('Hungarian');
  });

  it('introduces a variation once per lesson', () => {
    const used = new Set<string>();
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7'];
    expect(authoredNoteAt(ENTRY, line, used)).not.toBeNull();
    // Same ply reached again (a replay, a fork rejoining) must stay quiet.
    expect(authoredNoteAt(ENTRY, line, used)).toBeNull();
  });

  it('never speaks a variation with no authored prose', () => {
    const used = new Set<string>();
    const hit = authoredNoteAt(ENTRY, ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], used);
    expect(hit).toBeNull();
  });

  it('has no moment for a line that never departs from the main line', () => {
    // A variation identical to (or a truncation of) the main line has no move
    // of its own to be introduced at. Picking one would be arbitrary.
    expect(divergencePly(sansOf(ENTRY.pgn), sansOf(ENTRY.pgn))).toBeNull();
    const used = new Set<string>();
    const onMain = authoredNoteAt(
      { pgn: ENTRY.pgn, variations: [{ name: 'Same', pgn: ENTRY.pgn, explanation: 'x' }] },
      ['e4'], used,
    );
    expect(onMain).toBeNull();
  });
});

describe('against the real repertoire', () => {
  const entries = (repertoire as unknown as { pgn?: string; name: string; variations?: unknown[] }[]);

  it('every variation carries prose for this tier to speak', () => {
    // If this ever drops, the tier silently thins and the model takes back the
    // plies — the exact regression that made this work necessary.
    let withProse = 0;
    let total = 0;
    for (const e of entries) {
      for (const v of ((e.variations ?? []) as { explanation?: string }[])) {
        total += 1;
        if ((v.explanation ?? '').trim()) withProse += 1;
      }
    }
    expect(total).toBeGreaterThan(300);
    expect(withProse, 'authored prose went missing from repertoire.json').toBe(total);
  });

  it('reaches a real opening at a real ply', () => {
    // Proof the tier FIRES on shipped data, not just on a fixture. A wire that
    // does not fire is not a wire.
    const italian = entries.find((e) => e.name === 'Italian Game');
    expect(italian, 'Italian Game missing from repertoire.json').toBeTruthy();
    const main = sansOf(italian!.pgn);
    const vars = (italian!.variations ?? []) as { name: string; pgn?: string; explanation?: string }[];

    let fired = 0;
    for (const v of vars) {
      const sans = sansOf(v.pgn);
      const at = divergencePly(main, sans);
      if (at === null) continue;
      const used = new Set<string>();
      const hit = authoredNoteAt(italian!, sans.slice(0, at + 1), used);
      if (hit) fired += 1;
    }
    expect(fired, 'no Italian variation could introduce itself').toBeGreaterThan(0);
  });
});

describe('the wire, not just the function', () => {
  const all = (repertoire as unknown as Parameters<typeof authoredEntryFor>[1]);

  // 🔒 THE FIRST CUT OF THIS TIER SHIPPED DEAD. It passed the generator's own
  // `entry` — a DB record of { canonicalName, eco, moves } with no `variations`
  // — so the lookup could never return anything. Every test above still passed,
  // because they exercise `authoredNoteAt` against a correct fixture and none of
  // them proved the CALLER hands it the right object. Only the build's type
  // check caught it. These cases close that hole.

  it('resolves a real repertoire entry from a lesson name', () => {
    const hit = authoredEntryFor('Italian Game', all);
    expect(hit, 'the lookup found no entry for a real opening').toBeTruthy();
    expect((hit!.variations ?? []).length).toBeGreaterThan(0);
  });

  it('falls back to the parent when the lesson name carries a variation suffix', () => {
    // A generated lesson is often named "Italian Game: Giuoco Piano"; the
    // repertoire files it under the parent. Without this the tier goes quiet on
    // exactly the specific lessons it is most wanted for.
    const hit = authoredEntryFor('Italian Game: Giuoco Piano', all);
    expect(hit?.name).toBe('Italian Game');
  });

  it('refuses an object that carries no authored prose', () => {
    // The exact shape that was wired in by mistake.
    const dbRecord = { canonicalName: 'Italian Game', eco: 'C50', moves: ['e4', 'e5'] };
    expect(authoredEntryFor((dbRecord as { canonicalName?: string }).canonicalName, [dbRecord as never]))
      .toBeNull();
  });

  it('an unknown opening resolves to nothing rather than the wrong entry', () => {
    expect(authoredEntryFor('Not A Real Opening', all)).toBeNull();
    expect(authoredEntryFor(undefined, all)).toBeNull();
    expect(authoredEntryFor('   ', all)).toBeNull();
  });

  it('end to end: a lesson name reaches authored prose on a real line', () => {
    // Name → entry → walked moves → text. This is the whole tier, and it is what
    // "the wire fires" actually means.
    const entry = authoredEntryFor('Italian Game', all)!;
    const main = sansOf(entry.pgn);
    let spoke = 0;
    for (const v of (entry.variations ?? [])) {
      const sans = sansOf(v.pgn);
      const at = divergencePly(main, sans);
      if (at === null) continue;
      const hit = authoredNoteAt(entry, sans.slice(0, at + 1), new Set<string>());
      if (hit && hit.text.length > 0) spoke += 1;
    }
    expect(spoke, 'no authored prose reached the voice for a real opening').toBeGreaterThan(0);
  });
});
