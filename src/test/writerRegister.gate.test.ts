// THE WRITER'S SETTINGS ARE READ FROM THE TABLE, never typed at a call site
// (`writerRegister.ts`). Two halves:
//  1. a known writer/decider setting passed as a LITERAL at a call site in a
//     converted file fails — the value belongs to the surface's row; the few
//     sites whose literal is not a surface setting are named with the reason;
//  2. the rows hold the CLAUDE.md rules (LEARN NAMES NO MOVE UNASKED, Review
//     names both, Play volunteers nothing, chat names what was asked …).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  WRITER, DECIDER, COACH_SURFACE, BARE_READ,
  namesBetterMoveFor, namesPlayedMoveFor, namesStudentMovesFor,
  slipRegister, geometryRegister, treeTense, momentPosture, averageWordsOf,
} from '../services/writerRegister';

const CONVERTED = [
  'src/services/reviewFullData.ts',
  'src/services/coachFeatureService.ts',
  'src/services/positionFacts.ts',
  'src/services/learnBoardTeaching.ts',
  'src/services/groundedAnswer.ts',
  'src/services/learnSharedFacts.ts',
  'src/coach/questionThought.ts',
  'src/hooks/useTeachWalkthrough.ts',
  'src/services/gamesCourse.ts',
  'src/services/walkthroughLlmNarrator.ts',
  'src/services/openingGenerator.ts',
  'src/services/boardReadFacts.ts',
];

const FIELDS = [
  'tense', 'register', 'namesPlayedMove', 'namesStudentMoves', 'namesBetterMove', 'namesMoves', 'namesMove',
  'theory', 'story', 'owner', 'plain', 'plainThreatsSeen', 'posture',
];
const LITERAL = String.raw`(?:true|false|'past'|'now'|'live'|'review'|'walk'|'interrupt'|'asked')`;
const SITE = new RegExp(String.raw`\b(${FIELDS.join('|')})\s*:\s*${LITERAL}(?:\s+as\s+const)?(?=\s*[,})\n])`, 'g');

/** Literals that are not a surface's setting, each with its reason. A new
 *  entry is a decision someone has to write down. */
const ALLOWED: ReadonlyArray<{ file: string; field: string; count: number; why: string }> = [
  { file: 'src/services/groundedAnswer.ts', field: 'namesBetterMove', count: 1,
    why: 'the answer says the better move itself (`bestClause`); errorWhy only says its cost — dedupe, not a surface setting' },
  { file: 'src/services/learnBoardTeaching.ts', field: 'namesBetterMove', count: 1,
    why: 'studentMoveTeaching takes no better-move setting and is shared by Learn, Review, lessons and chat; Review names the better move through its own structureMove read (reviewFullData) — an OPEN disagreement, reported' },
  { file: 'src/services/boardReadFacts.ts', field: 'theory', count: 1,
    why: 'the shown best move\'s own thought inside an asked read: who stands better and what the move does, never the opening' },
  { file: 'src/services/boardReadFacts.ts', field: 'story', count: 1,
    why: 'the shown best move\'s own thought inside an asked read carries no opening story' },
];

/** The source with comments blanked (line numbers kept). */
function code(path: string): string {
  return readFileSync(resolve(path), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p: string) => p + ' '.repeat(m.length - p.length));
}

describe('writer settings come from the table (writerRegister)', () => {
  it('no converted call site passes a writer setting as a literal', () => {
    const bad: string[] = [];
    for (const file of CONVERTED) {
      const src = code(file);
      const found = new Map<string, number[]>();
      for (const m of src.matchAll(SITE)) {
        const line = src.slice(0, m.index).split('\n').length;
        found.set(m[1], [...(found.get(m[1]) ?? []), line]);
      }
      for (const [field, lines] of found) {
        const allow = ALLOWED.find((a) => a.file === file && a.field === field);
        if (!allow || lines.length > allow.count) bad.push(`${file}:${lines.join(',')} ${field}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every allowed literal is still there (an allowlist entry never outlives its site)', () => {
    for (const a of ALLOWED) {
      const n = [...code(a.file).matchAll(SITE)].filter((m) => m[1] === a.field).length;
      expect(n, `${a.file} ${a.field}`).toBe(a.count);
    }
  });

  it('negative control: the scanner catches a literal setting', () => {
    expect([...`f({ namesPlayedMove: true, tense: 'past' as const })`.matchAll(SITE)].map((m) => m[1])).toEqual(['namesPlayedMove', 'tense']);
    expect([...`type X = { tense: 'past' | 'now' }`.matchAll(SITE)]).toEqual([]);
  });
});

describe('the rows hold the CLAUDE.md rules', () => {
  it('Learn names no student move unasked; the better move only once past', () => {
    const l = WRITER.learn;
    expect(l.namesStudentMoves).toBe(false);
    expect(l.namesPlayedMove).toBe(false);
    expect(namesPlayedMoveFor(l, false)).toBe(true); // their move is named
    expect(namesStudentMovesFor(l, false)).toBe(true);
    expect(namesBetterMoveFor(l, false)).toBe(false);
    expect(namesBetterMoveFor(l, true)).toBe(true); // carve-out 3
    expect(l.plainBookMove).toBe(true);
    expect(l.register).toBe('live');
    expect(DECIDER.learn).toMatchObject({ posture: 'learn', steps: 'one-thread' });
  });

  it('Review names both moves and the better move, retrospectively, as a walk', () => {
    const r = WRITER.review;
    expect(r.namesPlayedMove && r.namesStudentMoves).toBe(true);
    expect(namesBetterMoveFor(r, false)).toBe(true);
    expect([r.tense, slipRegister(r), geometryRegister(r), treeTense(r)]).toEqual(['past', 'review', 'review', 'past']);
    expect(r.storyTheory).toBe(false); // the story's statistics stay behind the Theory button
    expect(momentPosture('review')).toBe('walk');
    expect(DECIDER.review.steps).toBe('all');
  });

  it('Play volunteers nothing', () => {
    expect(DECIDER.play.volunteers).toBe(false);
    expect(DECIDER.play.steps).toBe('asked');
  });

  it('chat answers what was asked, names it, and names the king\'s owner', () => {
    const c = WRITER.chat;
    expect(c.namesPlayedMove && c.namesStudentMoves && c.owner).toBe(true);
    expect(namesBetterMoveFor(c, false)).toBe(true);
    expect(momentPosture('chat')).toBe('asked');
    expect(c.tense).toBe('now');
  });

  it('a lesson shows the move now, named, with its theory and story', () => {
    expect(WRITER.lesson).toMatchObject({ tense: 'now', namesPlayedMove: true, theory: true, story: true });
  });

  it('a puzzle and a thinking question never hand over the answer', () => {
    for (const s of ['tactics', 'think'] as const) {
      expect(WRITER[s].namesStudentMoves).toBe(false);
      expect(namesBetterMoveFor(WRITER[s], true)).toBe(false);
    }
  });

  it('only chat names the owner; only Learn says the book move plainly; the bare read is neither', () => {
    expect(Object.entries(WRITER).filter(([, w]) => w.owner).map(([s]) => s)).toEqual(['chat']);
    expect(Object.entries(WRITER).filter(([, w]) => w.plainBookMove).map(([s]) => s)).toEqual(['learn']);
    expect(BARE_READ).toEqual({ owner: false, plainBookMove: false });
  });

  it('no length field is a cap: an average, or reported only', () => {
    expect(averageWordsOf('learn')).toBe(80);
    expect(averageWordsOf('review')).toBe(100);
    expect(() => averageWordsOf('chat')).toThrow();
  });

  it('the one table pairs each surface\'s two halves', () => {
    for (const s of Object.keys(COACH_SURFACE) as Array<keyof typeof COACH_SURFACE>) {
      expect(COACH_SURFACE[s]).toEqual({ writer: WRITER[s], decider: DECIDER[s] });
    }
  });
});
