// EVERY VERIFIED FIND IS SAID, EACH CLAIM ONCE (David 2026-11-12). With the
// composer's floor and gap gone, a claim two computers word differently has to
// be caught as one claim at its producers: the squares a kick names, the check
// a move-job already says, the standing a lesson already gave.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { replayPlies, linesOf, lessonLines, reviewSegments, type ReplayGame } from './replayGame';
import { lessonThought } from '../services/moveThoughtFacts';
import { newLessonVoice } from '../services/reviewMoveBriefing';

const game: ReplayGame = { ...(JSON.parse(readFileSync('src/test/fixtures/gotham-jelena.json', 'utf8')) as ReplayGame) };
function said(ply: number): string {
  const p = replayPlies(game)[ply - 1];
  return lessonThought({ story: false, theory: true, fenBefore: p.fenBefore, san: p.san, prev: p.prev, moverIsStudent: p.own, line: p.line, theirLast: p.theirLast, history: p.history,
    reads: p.before.length || p.after.length ? { before: linesOf(p.before), after: linesOf(p.after), passBefore: [], passAfter: [] } : null, costCp: p.costCp }, newLessonVoice(), null);
}

describe('one claim, said once', () => {
  it('g4 against the bishop on f5: the attack and the kick are one claim', () => {
    expect(said(9).match(/f5/g)?.length).toBe(1);
  }, 30_000);
  it('Qc8+: the check is said once', () => {
    const t = said(23);
    expect(t).toMatch(/gives check/);
    expect(t).not.toMatch(/checks the king/);
  });
  it('Bxf7+: a line that only restates the check is not said behind the move\'s point', () => {
    expect(said(25)).not.toMatch(/It also gives check/);
  });
  it('a lesson says each standing once, not move after move', () => {
    const standings = lessonLines(game).flatMap((l) => l.match(/You're (?:winning|losing|clearly better|clearly worse|slightly better|slightly worse)\b/g) ?? []);
    expect(new Set(standings).size).toBe(standings.length);
  }, 60_000);
});

// THE DECISION BASELINE READ, 2026-11-12 — each fixed at its producer.
const colle = (JSON.parse(readFileSync('src/test/fixtures/learn-replay-games.json', 'utf8')) as { games: (ReplayGame & { id: string })[] }).games.find((g) => g.id === 'colle800')!;
describe('what the baseline read found', () => {
  const jl = lessonLines(game);
  const cl = lessonLines(colle);
  it('a recapture whose "completes the trade" is dropped says what the piece does there (Bxc4: f7)', () => {
    expect(jl[12]).toMatch(/f7/);
    expect(cl[38]).not.toBe('');
  }, 60_000);
  it('their attack is said once, not "aimed at" and "attacks" on the same queen (Qd8)', () => {
    expect(jl[23].match(/queen on c8/g)?.length).toBe(1);
  });
  it('a move a reply forces is not the earlier move\'s plan (Qg4 retreating, Qe7 blocking a check)', () => {
    expect(cl[28]).not.toMatch(/heads on to g3/);
    expect(jl[19]).not.toMatch(/heading on to d8/);
  });
  it('the ask never makes a second "and" in one sentence', () => {
    for (const l of [...jl, ...cl]) expect(l).not.toMatch(/, and [^,.]*, and it needs an answer/);
  });
  it('a flank strike at a centre pawn is a point, not a centre platitude (Review, …c5 at d4)', () => {
    const seg = reviewSegments(colle, 800).find((x) => x.ply === 8);
    expect(seg?.narration ?? '').toMatch(/strikes at your pawn on d4 from the flank/);
  }, 120_000);
});
