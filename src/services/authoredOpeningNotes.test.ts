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
import { Chess } from 'chess.js';
import { gradeNarrationText } from './coachAnswerGates';
import { authoredNoteAt, authoredEntryFor, divergencePly, sansOf } from './authoredOpeningNotes';
import repertoire from '../data/repertoire.json';
import openingsDb from '../data/openings-lichess.json';

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

  it('still introduces itself when the departing ply was taken by something else', () => {
    // 🔒 THE CORPUS CONSULTS FIRST AND RETURNS AS SOON AS IT FINDS A NOTE, so on
    // a well-covered opening the divergence ply never reaches this tier at all.
    // With one eligible ply per variation that was silently fatal: the French
    // Exchange went quiet on prod for exactly this reason while firing every
    // time offline, where the replay called this selector directly and no
    // corpus stood in the way. The introduction now survives a ply or two.
    const used = new Set<string>();
    const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7', 'd4'];
    // Ply 5 is the departure; pretend it was claimed and ask at ply 6.
    const hit = authoredNoteAt(ENTRY, line, used);
    expect(hit?.variationName).toBe('Hungarian');
  });

  it('closes the window before the introduction stops being one', () => {
    // Deep inside the line, an "introduction" is a comment on a position the
    // student has been in for a while. It does not open there.
    const used = new Set<string>();
    const deep = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Be7', 'd4', 'd6', 'O-O', 'Nf6', 'Re1'];
    expect(authoredNoteAt(ENTRY, deep, used)).toBeNull();
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

  it('reaches the British-spelled entries too', () => {
    // 🔒 42% OF THE REPERTOIRE WAS UNREACHABLE. repertoire.json is written in
    // British English ("Caro-Kann Defence", "Grünfeld Defence", "Alekhine's
    // Defence"); the canonical name arrives from the Lichess database in
    // American English with no possessive. Matching raw strings meant the tier
    // resolved on 25 openings and returned null on the other 18 — silently
    // handing those lessons back to the model with the hand-written prose
    // sitting one file away.
    for (const [canonical, filedAs] of [
      ['Caro-Kann Defense', 'Caro-Kann Defence'],
      ['French Defense', 'French Defence'],
      ['Grunfeld Defense', 'Grünfeld Defence'],
      ['Alekhine Defense', "Alekhine's Defence"],
      ['Caro-Kann Defense: Classical Variation', 'Caro-Kann Defence'],
    ] as const) {
      expect(authoredEntryFor(canonical, all)?.name, canonical).toBe(filedAs);
    }
  });

  it('every repertoire entry is reachable by its own name', () => {
    // The floor: whatever spelling a future entry lands in, it must resolve.
    for (const e of all) {
      expect(authoredEntryFor(e.name, all), `unreachable: ${e.name}`).toBeTruthy();
    }
  });

  it('normalising spelling does not make one opening match another', () => {
    // Normalisation is not fuzziness. These are genuinely different openings
    // and must stay apart no matter how the spelling is folded.
    expect(authoredEntryFor('French Defense', all)?.name).toBe('French Defence');
    expect(authoredEntryFor('Sicilian Defense', all)?.name).not.toBe('French Defence');
    expect(authoredEntryFor('Not A Real Opening', all)).toBeNull();
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

describe('the tier reaches most of what was written', () => {
  // A coverage FLOOR, not a description. The tier only speaks a variation's
  // prose at the ply that variation begins, and only if it is true of that
  // board — two conditions that could quietly starve it as the repertoire
  // grows. This measures both against the shipped file so a regression shows
  // up as a number rather than as silence nobody notices.
  const entries = repertoire as unknown as {
    name: string; pgn?: string;
    variations?: { name: string; pgn?: string; explanation?: string }[];
  }[];

  it('almost every authored explanation survives grading at its entry ply', () => {
    let eligible = 0;
    let survived = 0;
    for (const e of entries) {
      const main = sansOf(e.pgn);
      for (const v of (e.variations ?? [])) {
        const sans = sansOf(v.pgn);
        const at = divergencePly(main, sans);
        if (at === null || !(v.explanation ?? '').trim()) continue;
        const g = new Chess();
        let legal = true;
        for (const san of sans.slice(0, at + 1)) {
          try { g.move(san); } catch { legal = false; break; }
        }
        if (!legal) continue;
        eligible += 1;
        if (gradeNarrationText(v.explanation ?? '', g.fen(), 'authoredTierReach')?.trim()) survived += 1;
      }
    }
    expect(eligible).toBeGreaterThan(280);
    // Measured 304/305 = 99.7% on 2026-08-12. The floor is deliberately well
    // under that: the point is to catch a collapse, not to freeze a number.
    expect(survived / eligible, `only ${survived}/${eligible} survived grading`).toBeGreaterThan(0.9);
  });

  it('every opening has at least one variation that can introduce itself', () => {
    for (const e of entries) {
      const main = sansOf(e.pgn);
      const any = (e.variations ?? []).some((v) => (v.explanation ?? '').trim()
        && divergencePly(main, sansOf(v.pgn)) !== null);
      expect(any, `no variation of "${e.name}" can ever speak`).toBe(true);
    }
  });
});

describe('the moves decide, not the name', () => {
  // 🔒 NAMES LEAKED TWICE IN ONE DAY. First British spelling (18 of 43 silent),
  // then — after that was fixed — the repertoire's own naming conventions:
  // families in shorthand ("Sicilian: Najdorf" vs the database's "Sicilian
  // Defense: Najdorf Variation, Opocensky Variation, Traditional Line"), and
  // sub-openings filed as their own entry here but under a parent there
  // ("Evans Gambit" → "Italian Game: Evans Gambit, Morphy Attack"), which
  // resolved to the PARENT — worse than a miss, because the lesson is then
  // offered the wrong opening's prose to choose from.
  //
  // A line that walks an entry IS that entry, in any language and under any
  // convention. This measures the whole file against the names the database
  // actually produces.
  const all = repertoire as unknown as Parameters<typeof authoredEntryFor>[1];
  const rep = repertoire as unknown as { name: string; pgn?: string }[];
  const db = openingsDb as unknown as { name?: string; moves?: string[]; pgn?: string }[];

  /** The database name a lesson for this repertoire entry would carry. */
  const canonicalNameFor = (pgn?: string): string | null => {
    const want = sansOf(pgn);
    let best: { name: string; len: number } | null = null;
    for (const o of db) {
      const m = o.moves ?? sansOf(o.pgn);
      if (m.length === 0 || m.length > want.length) continue;
      if (!m.every((x, i) => x === want[i])) continue;
      if (!best || m.length > best.len) best = { name: o.name ?? '', len: m.length };
    }
    return best?.name ?? null;
  };

  it('every opening resolves from the database name its lesson would carry', () => {
    const misses: string[] = [];
    for (const e of rep) {
      const canonical = canonicalNameFor(e.pgn);
      if (!canonical) { misses.push(`${e.name}: no database line matches its pgn`); continue; }
      const got = authoredEntryFor(canonical, all, sansOf(e.pgn));
      if (got?.name !== e.name) misses.push(`"${canonical}" → ${got?.name ?? 'nothing'} (wanted ${e.name})`);
    }
    expect(misses, `${misses.length} openings unreachable:\n${misses.join('\n')}`).toEqual([]);
  });

  it('the spine wins when the name would have picked the parent', () => {
    // The Evans Gambit is its own authored entry; the database files it under
    // the Italian Game. Name matching alone hands this lesson the Italian's
    // variations.
    const evans = rep.find((e) => e.name === 'Evans Gambit');
    expect(evans).toBeTruthy();
    const got = authoredEntryFor('Italian Game: Evans Gambit, Morphy Attack', all, sansOf(evans!.pgn));
    expect(got?.name).toBe('Evans Gambit');
  });

  it('a spine too short to identify anything falls back to the name', () => {
    // Three plies are shared by half the 1.e4 e5 world; picking on them would
    // hand the Italian's prose to the Ruy.
    expect(authoredEntryFor('Ruy Lopez', all, ['e4', 'e5', 'Nf3'])?.name).toBe('Ruy Lopez');
    expect(authoredEntryFor(undefined, all, ['e4', 'e5'])).toBeNull();
  });

  it('folds the diacritics that do not decompose', () => {
    // ø, æ, å and ß carry the mark INSIDE the glyph, so NFD has no combining
    // character to strip and leaves them exactly as they were. The database
    // already ships ø today; the rest are one keystroke away in any
    // Scandinavian or German opening name, and each would be a silent miss of
    // the same kind British spelling already caused once.
    //
    // Each case files the entry under one spelling and asks for it in the
    // other — which is the situation that actually occurs, the two sources
    // being written by different people.
    for (const [filedAs, askedAs] of [
      ['Bjorn Defense', 'Bjørn Defence'],
      ['Bjørn Defence', 'Bjorn Defense'],
      ['Gruenfeld Defense', 'Grünfeld Defence'],
      ['Kadas Opening', 'Kádas Opening'],
      ['Duesseldorf Gambit', 'Düsseldorf Gambit'],
    ] as const) {
      const probe: Parameters<typeof authoredEntryFor>[1] = [{ name: filedAs, pgn: 'e4 e5', variations: [] }];
      expect(authoredEntryFor(askedAs, probe)?.name, `${askedAs} → ${filedAs}`).toBe(filedAs);
    }
  });
});
