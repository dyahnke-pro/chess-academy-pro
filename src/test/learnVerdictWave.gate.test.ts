// THE VERDICT IS HEARD WITH THE MOVE (OS-18, David's Smith-Morra 2026-10-19:
// Bxf7+ was called a mistake 18s after the move and Rd5 14s after; Bf4, which
// cost 112cp, was praised by the instant wave because its cost was not known
// yet). The verdict pass was chained on the NEXT board's facts and the late
// package was decided once, after every engine read of the turn. Now:
//   - the move's cost is ONE search, started at the reply, read by the instant
//     wave and the verdict alike;
//   - the verdict pass starts on the two reads it needs, not on factsReady;
//   - a costly move's verdict (its 'but' beats) is spoken as its own wave the
//     moment it is built, and only then does the pass wait for the next facts;
//   - the held move revealed after the move is the one captured AT the move.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const at = (needle: string | RegExp): number => {
  const i = typeof needle === 'string' ? src.indexOf(needle) : src.search(needle);
  expect(i, `missing: ${needle}`).toBeGreaterThanOrEqual(0);
  return i;
};

describe('Learn: the verdict is not queued behind the next board', () => {
  it('the cost is one search, started at the reply, before the board between the moves is read', () => {
    const cost = at(/const priceRead: Promise<MovePrice \| null> = preStudentRead[\s\S]{0,120}studentMovePrice\(fenBefore/);
    expect(cost).toBeLessThan(at('const midTurnRead = midTurnReadEarly ??'));
    expect(cost).toBeGreaterThan(at('const reply = await resolveCoachReplyMove(move.fen);'));
  });

  it('the instant wave waits a moment for the cost, so a costly move is never praised', () => {
    const wait = at(/await Promise\.race\(\[priceRead,/);
    expect(wait).toBeLessThan(at(/const instant = computeInstantTeaching\(/));
  });

  it('the verdict pass starts on its own reads, not on the next board\'s facts', () => {
    expect(src).not.toMatch(/const verdictPass = factsReady\.then/);
    expect(src).toMatch(/const verdictPass = Promise\.all\(\[midTurnRead, priceRead\]\)\.then/);
    // …and reads the same price — one memoized search, never a second one,
    // and an unpriced move stays unpriced (#2 root cause 4: no `?? 0`).
    expect(src).toMatch(/const studentPrice = bothCp \? await priceRead : null/);
    expect(src).not.toMatch(/liveMoveCost\(/);
  });

  it('a costly move\'s verdict is spoken as its own wave before the pass waits for the facts', () => {
    const pass = at('const verdictPass = Promise.all([midTurnRead, priceRead]).then');
    const early = at('speakLateWave(p, verdictLines);');
    const facts = src.indexOf('await factsReady;', pass);
    expect(early).toBeGreaterThan(pass);
    expect(facts).toBeGreaterThan(early);
    expect(src).toMatch(/const verdictLines = p\.lines\.filter\(\(l\) => DNA_BEAT\[l\.lane\] === 'but'\)/);
    // one speaking path for every late wave
    expect(src.match(/const lateDecision = coachTurn\(/g) ?? []).toHaveLength(1);
  });

  it('the held move revealed after the move is the one captured at the move', () => {
    expect(at('const heldAtMove = learnMemRef.current.heldMove;')).toBeLessThan(at('const reply = await resolveCoachReplyMove(move.fen);'));
    expect(src).toMatch(/const heldNow = heldAtMove;/);
  });
});
