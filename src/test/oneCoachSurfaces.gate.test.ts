// ONE COACH ON EVERY SURFACE (David 2026-11-18: "Unify the other coach
// surfaces as well"). The opening Play rung's slip reveal kept its own copy of
// the error computer (a hanging-piece read, the engine walk reworded, no
// habit), and the puzzle family's wrong-try reader said "what it allowed" in
// private templates before it asked the one error computer. Both now speak
// through the one computer; this fails if either drifts back.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

describe('one coach on the other surfaces', () => {
  it('the Play rung slip reveal is the one error computer and the one habit', () => {
    const src = code('src/services/discussionPractice.ts');
    const body = src.slice(src.indexOf('export function buildSlipReveal'), src.indexOf('export function gradeReasonLead'));
    expect(body).toMatch(/errorCallFor\(/);
    expect(body).toMatch(/correctionHabit\(/);
    expect(body).not.toMatch(/assembleEngineReasoning|hangingPieces/);
  });
  it('a puzzle wrong try asks the one error computer before any private template', () => {
    const src = code('src/services/puzzleTeaching.ts');
    const body = src.slice(src.indexOf('export async function refuteWrongTry'));
    expect(body.indexOf('errorWhyFor(')).toBeGreaterThan(-1);
    expect(body.indexOf('errorWhyFor(')).toBeLessThan(body.indexOf('lineWins('));
  });
});

// THE UNIFIED COACH MAY NOT REGRESS (David 2026-11-18: "make sure the unified
// coach is gated so it never regresses"). A surface that grades or reveals a
// move in its own words is a second coach. The answer has one wording
// (`answerShown`), the why of a mistake has one computer (`errorCallFor` /
// `errorWhy`, gate oneErrorComputer), and a grade said with a mover is said by
// the files named here, each with its reason. A new file that writes its own
// verdict fails here until it is moved onto the one computer or named.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { answerShown } from '../services/discussionPractice';

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'test') sources(p, out); continue; }
    if (/\.(ts|tsx)$/.test(f) && !/\.test\.|\.d\.ts$/.test(f)) out.push(p);
  }
  return out;
}
const ALL = sources('src');

/** Files that may write "The best move was <move>", and why. */
const ANSWER_WORDING: Record<string, string> = {
  'src/services/discussionPractice.ts': 'answerShown — the one wording of the shown answer',
  'src/components/Puzzles/MistakePuzzleBoard.tsx': 'the solved-puzzle confirmation: the student just played that move',
};
/** Files that may say a grade with its mover ("… was a mistake / a blunder"), and why. */
const GRADE_WORDING: Record<string, string> = {
  'src/services/inaccuracyCall.ts': 'the one error computer',
  'src/services/reviewFullData.ts': 'Review\'s grade label with its mover; the why comes from errorWhy',
  'src/services/groundedAnswer.ts': 'chat "rate my move": errorCall first, the bare ladder only with no engine line',
  'src/services/mistakeNarration.ts': 'the My Mistakes question: it asks the student to find the move, it explains nothing',
  'src/data/lessons/watch/twoKnightsDefence.ts': 'a hand-written lesson beat',
};

describe('the unified coach never grows a second voice', () => {
  it('"The best move was …" is said only through answerShown', () => {
    const hits = ALL.filter((p) => /The best move was \$\{/.test(code(p))).map((p) => p.replace(/\\/g, '/'));
    expect(hits.length).toBeGreaterThan(0); // the scan reads real files
    expect(hits.filter((p) => !(p in ANSWER_WORDING))).toEqual([]);
  });
  it('a grade with its mover is said only by the named files', () => {
    const re = /['"`][^'"`\n]*\bwas an? (mistake|blunder)\b/;
    const hits = ALL.filter((p) => re.test(code(p))).map((p) => p.replace(/\\/g, '/'));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.filter((p) => !(p in GRADE_WORDING))).toEqual([]);
  });
  it('the practice reveal says the answer in SAN with its job, never raw engine notation', () => {
    const src = code('src/hooks/usePracticePosition.ts');
    expect(src).toMatch(/answerShown\(/);
    expect(src).not.toMatch(/The best move was/);
    const said = answerShown('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'e5');
    expect(said).toMatch(/^The best move was e5\./);
    expect(said).not.toMatch(/[a-h][1-8][a-h][1-8]/);
  });
});
