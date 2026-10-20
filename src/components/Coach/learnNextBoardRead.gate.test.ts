// THE NEXT BOARD IS READ FIRST, AND A TURN'S READS DIE WITH THE TURN
// (iOS engine reads, 2026-10-20). On the owner's iPhone (asm engine) 20 of 21
// Learn moves went ungraded: the read of the board the student moves FROM
// waited behind the move's price, the mid read and a warm read, and the last
// turn's late reads still queued ahead of all of them. These hold the order and
// the scope where they are written, in `handleStudentMove`.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const start = src.indexOf('const handleStudentMove = useCallback(');
const end = src.indexOf('\n  }, [', start);
const body = src.slice(start, end);

describe('Learn: the next-board read leads the turn', () => {
  it('is asked through the engine hold BEFORE the move\'s price', () => {
    expect(start).toBeGreaterThan(0);
    const next = body.indexOf('const nextBoardRead');
    const price = body.indexOf('studentMovePrice(');
    expect(next).toBeGreaterThan(0);
    expect(price).toBeGreaterThan(next);
    expect(body.slice(next, price)).toContain('stockfishEngine.holdForQuestion(');
  });

  it('lands in the ref the next move is graded from, the moment it is in', () => {
    expect(body).toMatch(/nextBoardRead\.then\(\(a\) => \{\s*if \(a && nextBoardFen\) studentBestReadRef\.current =/);
  });

  it('is the one read of that board — the facts probe awaits it, it does not search again', () => {
    expect(body).toContain('await nextBoardRead');
    expect(body).not.toMatch(/analyzeWithBudget\(probe\.fen\(\)/);
    expect(body).not.toMatch(/analyzeWithBudget\(warmProbe\.fen\(\)/);
  });
});

describe('Learn: a turn\'s reads are retired by the next move', () => {
  it('the student\'s move aborts the previous turn\'s scope', () => {
    expect(body).toMatch(/turnReadsRef\.current\.abort\(\);\s*turnReadsRef\.current = new AbortController\(\);/);
  });

  it('every budgeted read of the turn carries the turn\'s signal', () => {
    const calls = body.match(/stockfishEngine\.analyzeWithBudget\([^;]*/g) ?? [];
    expect(calls.length).toBeGreaterThan(5);
    for (const c of calls) expect(c, c.slice(0, 120)).toContain('signal: turnSignal');
  });

  it('the eval bar drops the read of a board the game has left', () => {
    expect(src).toMatch(/analyzePosition\(fen, 12, undefined, 'brain', \{ signal: leftBoard\.signal \}\)/);
    expect(src).toContain('leftBoard.abort();');
  });
});
