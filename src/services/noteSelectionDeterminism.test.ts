// THE gate for note selection (David 2026-08-04: "All narrations need to be
// deterministically found and handed to llm in the package. There is no room for
// false narrations on this app! Ever!!").
//
// This is deliberately NOT a claim-stripper. A stripper checks the prose after a
// note has already been chosen for a ply, which means the wrong note was chosen
// and something downstream has to notice. The rule here is upstream of that:
//
//   a note may be spoken at a ply only if the note's own taught line PRODUCES
//   that ply's position.
//
// If that holds, prose about a different board cannot reach the model, because a
// note about a different board is never selected. There is nothing left for a
// gate to catch — which is the point (CLAUDE.md G0).
//
// What this replaced: `supportNoteForPly` used to reach notes by OPENING-NAME
// token overlap (score ≥ 0.6 on name tokens) with no reference to the board, and
// `openingGenerator` called it from the per-ply splice — while documenting the
// opposite contract, "never the fuzzy tiers, so a note can't land on the wrong
// ply". That is how a Caro-Kann lesson came to narrate "the tactic Bxf7+ followed
// by Nxe5 works only if Black's bishop on d6 is defended" at move two.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import { noteAtPosition, teachingSourceForBoard, teachingFactLine } from './danyaTeachingService';
import { noteArrowSourceAt } from './openingGenerator';
import { loadFullCorpus } from '../test/loadFullCorpus';
import repertoireRaw from '../data/repertoire.json';

interface Entry { id: string; name: string; pgn: string }
const REPERTOIRE = repertoireRaw as unknown as Entry[];

const normFen = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** SAN prefix + resulting FEN for every ply of a PGN. */
function walk(pgn: string): Array<{ prefix: string[]; fen: string }> {
  const chess = new Chess();
  const out: Array<{ prefix: string[]; fen: string }> = [];
  const prefix: string[] = [];
  const sans = pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (const san of sans) {
    try {
      chess.move(san);
    } catch {
      break;
    }
    prefix.push(san);
    out.push({ prefix: [...prefix], fen: chess.fen() });
  }
  return out;
}

/** The position a note was authored at, or null if its line won't replay. */
function notePositionFen(lineSan: readonly string[]): string | null {
  if (lineSan.length === 0) return null;
  try {
    const chess = new Chess();
    for (const san of lineSan) chess.move(san);
    return normFen(chess.fen());
  } catch {
    return null;
  }
}

describe('note selection is position-determined', () => {
  // 120s: the helper parses ~37 MB of corpus JSON and builds the transposition
  // index in one synchronous pass. Heavy, deliberately — see loadFullCorpus.
  beforeAll(() => {
    // Two of the four corpora are fetched at runtime, so without this the whole
    // suite would pass while exercising a fifth of the data.
    const total = loadFullCorpus().reduce((n, c) => n + c.notes, 0);
    expect(total).toBeGreaterThan(46_000);
  }, 120_000);

  it('never selects a note authored at a different position', () => {
    const offences: string[] = [];
    let selections = 0;

    for (const entry of REPERTOIRE) {
      if (!entry.pgn) continue;
      for (const step of walk(entry.pgn)) {
        const note = noteAtPosition(step.prefix, step.fen, entry.name);
        if (!note) continue;
        selections += 1;
        const authoredAt = notePositionFen(note.lineSan);
        if (authoredAt !== normFen(step.fen)) {
          offences.push(
            `${entry.name} ply ${step.prefix.length} (${step.prefix.join(' ')}) → ${note.id}`
            + ` authored at [${note.lineSan.join(' ') || '(no line — opening-level)'}]`,
          );
        }
      }
    }

    expect(selections).toBeGreaterThan(0);
    expect(
      offences.slice(0, 10),
      `${offences.length} of ${selections} selections were notes about a DIFFERENT position`,
    ).toEqual([]);
  }, 300_000);

  it('never splices a note authored at a different position (the generator path)', () => {
    // Same rule through the function the walkthrough actually calls, so the two
    // cannot drift: `noteArrowSourceAt` is what produces both the spoken beat and
    // the arrows, and it is the site whose documented contract was violated.
    const offences: string[] = [];
    let spliced = 0;

    for (const entry of REPERTOIRE) {
      if (!entry.pgn) continue;
      const seen = new Set<string>();
      for (const step of walk(entry.pgn)) {
        const before = new Set(seen);
        const text = noteArrowSourceAt(step.prefix, step.fen, seen, entry.name);
        if (!text) continue;
        spliced += 1;
        const chosen = [...seen].find((id) => !before.has(id));
        if (!chosen) continue;
        // The id must belong to a note whose line reproduces this board. Resolve
        // it back through the same lookup rather than trusting the text.
        const note = noteAtPosition(step.prefix, step.fen, entry.name, before);
        if (!note || note.id !== chosen) {
          offences.push(`${entry.name} ply ${step.prefix.length}: spliced ${chosen} unreachable by position lookup`);
          continue;
        }
        if (notePositionFen(note.lineSan) !== normFen(step.fen)) {
          offences.push(`${entry.name} ply ${step.prefix.length}: ${note.id} authored elsewhere`);
        }
      }
    }

    expect(spliced).toBeGreaterThan(0);
    expect(
      offences.slice(0, 10),
      `${offences.length} of ${spliced} splices were about a DIFFERENT position`,
    ).toEqual([]);
  }, 300_000);
});

// ── THE SAME RULE, EVERYWHERE ELSE THE CORPUS IS SPOKEN ────────────────────
//
// The walkthrough splice was the loudest instance, not the only one. Three
// other surfaces — the Learn facts package and the play-out narration
// (`CoachTeachPage`), and the deliberation reader (`thinkAloud`) — called
// `teachingNoteForBoard` and announced every result as "Coaching note for THIS
// position", while that selector could also return a note borrowed from
// another opening's matching structure, or a general principle attached to no
// position at all. The note was fine; the CLAIM wrapped around it was false,
// and the model phrased the claim.
//
// The fix is provenance in the package: `teachingSourceForBoard` says WHERE the
// note came from, and `teachingFactLine` writes the label. These pin both ends.
describe('teaching notes carry honest provenance', () => {
  beforeAll(() => {
    loadFullCorpus();
  }, 120_000);

  it('only calls a note "position" when it was authored at that position', () => {
    const offences: string[] = [];
    let claimed = 0;

    for (const entry of REPERTOIRE) {
      if (!entry.pgn) continue;
      for (const step of walk(entry.pgn)) {
        const source = teachingSourceForBoard(step.prefix, step.fen, entry.name);
        if (source?.origin !== 'position') continue;
        claimed += 1;
        if (notePositionFen(source.note.lineSan) !== normFen(step.fen)) {
          offences.push(`${entry.name} ply ${step.prefix.length} → ${source.note.id}`);
        }
      }
    }

    expect(claimed).toBeGreaterThan(0);
    expect(offences.slice(0, 10), `${offences.length} notes labelled 'position' were authored elsewhere`).toEqual([]);
  }, 300_000);

  it('labels a borrowed note as borrowed, never as this board', () => {
    const chess = new Chess();
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) chess.move(san);
    const note = { id: 'x', lineSan: ['d4', 'd5'], opening: null, phase: 'middlegame' as const,
      explains: 'The isolated pawn gives space.', teaches: '', plans: '', concepts: [], sources: [] };

    // Every non-position origin must SAY it is not describing this board — that
    // sentence is the whole mechanism, so assert the disclaimer, not the wording.
    for (const origin of ['structure', 'concept'] as const) {
      const line = teachingFactLine({ note, origin });
      expect(line, `${origin} must disclaim`).toMatch(/NOT a (?:description of this board|claim about this board)/i);
    }
    expect(teachingFactLine({ note, origin: 'position' })).toContain('THIS position');
  });

  it('no surface writes a position claim around an unprovenanced note', async () => {
    // A static guard, because this defect is invisible at runtime: the prose
    // reads perfectly and the board never contradicts a hypothetical. A file
    // that pairs the un-provenanced selector with the word "position" has
    // reintroduced exactly the bug (2026-08-04).
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const offenders: string[] = [];
    const walkDir = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { walkDir(p); continue; }
        if (!/\.(ts|tsx)$/.test(p) || /\.test\.tsx?$/.test(p)) continue;
        if (p.endsWith('danyaTeachingService.ts')) continue; // where both live
        const src = readFileSync(p, 'utf8');
        if (!src.includes('teachingNoteForBoard(')) continue;
        // Strip comments so the explanatory prose above a correct call site
        // (there is plenty) cannot trip this.
        const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
        if (/teachingNoteForBoard\(/.test(code) && /position/i.test(code)) offenders.push(p);
      }
    };
    walkDir('src');
    expect(
      offenders,
      'use teachingSourceForBoard + teachingFactLine so the label matches the note\'s origin',
    ).toEqual([]);
  });
});
