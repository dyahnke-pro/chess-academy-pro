// C4 (WO-STANDARD-01): a LIVE ply with a proven fundamental reaches the need
// score with its id — by OUTPUT (the `coach-need-scores` row the door emits)
// and by STATEMENT (no `fundamentalId: null` literal on the live lane).
//
// The live composer passed `fundamentalId: null` to `computeNeed` until C4,
// so route 1 of the weakness term — the EXACT `fundamental:<id>` row the
// Fundamentals tab counts — was dead on every live surface. The reads were in
// scope; Learn attributed the same move 1,300 lines later to SPEAK it.
//
// Fixture: the review's Alapin, 6...Nb6 (best 6...e6), a Black student, the
// board after White's 7.Nf3 reply with Black to move — the shape Learn hands
// over (the student's own last move, two plies back). The student's spine
// carries `fundamental:same-piece-twice` as a persistent hole.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { computePositionFacts } from './positionFacts';
import { onNeedScore, type NeedScoreRow } from './coachDecisionEvents';
import type { StudentNeedContext } from './needScore';
import type { WeaknessSignal } from './weaknessSignal';

const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];
const fenAt = (plies: number): string => { const c = new Chess(); for (const s of SANS.slice(0, plies)) c.move(s); return c.fen(); };
const FEN_BEFORE_NB6 = fenAt(11);
const FEN_NOW = fenAt(13); // after 7.Nf3, Black to move

const samePieceTwice = {
  clusterId: 'fundamental:same-piece-twice', bucket: 'positional', label: 'Moving the same piece twice',
  openCount: 6, severity: 80, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [], total: 12,
  capabilityTag: null, proven: false,
} as unknown as WeaknessSignal;

const ctx: StudentNeedContext = {
  rating: 1400, gamesPlayed: 20, signals: [samePieceTwice], bookDepartures: [], capabilities: new Map(),
};

const line = (rank: number, evaluation: number) => ({ rank, evaluation, moves: [], mate: null });
const analysis = {
  topLines: [line(1, 90), line(2, 80), line(3, 70)],
  evaluation: 90, isMate: false, mateIn: null, seldepth: 20, depth: 18, wdl: { win: 500, draw: 350, loss: 150 },
};

const reads = {
  historySans: SANS.slice(0, 12), bestMoveUci: 'e7e6', bestPvUci: ['e7e6'], playedPvUci: [] as string[],
  evalBeforeWhiteCp: -30, evalAfterWhiteCp: 90, missedMate: null, allowedMate: null,
};

async function needRows(withReads: boolean): Promise<NeedScoreRow[]> {
  const rows: NeedScoreRow[] = [];
  const off = onNeedScore((r) => { rows.push(r); });
  try {
    await computePositionFacts({
      posture: 'walk', fen: FEN_NOW, moverColor: 'b', studentColor: 'b', analysis,
      lastMove: { fenBefore: FEN_BEFORE_NB6, san: 'Nb6', cpLoss: 120, inBook: false, reads: withReads ? reads : null },
      studentNeedContext: ctx,
    });
  } finally { off(); }
  return rows;
}

describe('C4 — the live ply\'s fundamental reaches need (by output)', () => {
  it('with the raw reads, the weakness term fires on the student\'s exact fundamental row', async () => {
    const rows = await needRows(true);
    expect(rows.length, 'the door emitted no need row — the wire is dead').toBeGreaterThan(0);
    expect(Math.max(...rows.map((r) => r.terms.weakness ?? 0))).toBeGreaterThan(0);
  });

  it('NEGATIVE CONTROL: the same ply with reads: null never reaches that row', async () => {
    const rows = await needRows(false);
    expect(rows.length).toBeGreaterThan(0);
    expect(Math.max(...rows.map((r) => r.terms.weakness ?? 0))).toBe(0);
  });
});

describe('C4 — by statement: the live lane computes the id, and every live surface answers for its reads', () => {
  const read = (p: string): string => readFileSync(p, 'utf8');

  it('positionFacts passes a computed fundamentalId to computeNeed, never a literal null', () => {
    const src = read('src/services/positionFacts.ts');
    const i = src.indexOf('computeNeed({');
    const call = src.slice(i, src.indexOf('}, input.studentNeedContext)', i));
    expect(call).toMatch(/fundamentalId:\s*liveFundamentalId/);
    expect(call).not.toMatch(/fundamentalId:\s*null/);
    // ONE live attributor, shared with the sentence Learn speaks.
    expect(src).toMatch(/attributeLiveFundamental\(/);
    expect(read('src/services/learnFundamentalNarration.ts')).toMatch(/attributeLiveFundamental\(/);
  });

  it('Learn hands the composer its reads; the two PGN-driven hooks say reads: null through the one replay helper', () => {
    const teach = read('src/components/Coach/CoachTeachPage.tsx');
    expect(teach).toMatch(/lastMove: \{\s*fenBefore, san: move\.san, cpLoss: studentCpLoss, inBook: studentMoveInBook,\s*reads: preStudentRead \? \{/);
    expect(read('src/services/lastMoveOfLine.ts')).toMatch(/reads: null \}/);
    expect(read('src/hooks/useLiveCoach.ts')).toMatch(/playedPvUci: n\.replyPvUci,/);
    // Play hands the hook the lines it graded on.
    expect(read('src/components/Coach/CoachGamePage.tsx')).toMatch(/historySans: moveResult\.history,\s*bestMoveUci: engineBestMoveUci,/);
  });
});
