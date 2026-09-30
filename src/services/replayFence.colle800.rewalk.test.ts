/**
 * REPLAY FENCE — Colle, 800-rated (lichess MdVCIY3J, student White), re-walked
 * by hand 2026-09-27 on the branch build.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { detectBehaviors } from './danyaBehaviors';
import { gapEchoedByVerdict } from './opponentGap';

const GAME = 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 O-O Be7 Nbd2 a6 e4 O-O e5 Nd7 Re1 b5 Nf1 Re8 Ng3 Nf8 Nh5 cxd4 Ng5 Bxg5 Qg4 Nxe5 Qg3 Nfg6 Bxg5 Qb6 Bxg6 Nxg6 Nf4 Nxf4 Qxf4 dxc3 bxc3 Bb7 Qg3 Rac8 Bh6 g6 Bg5 Rc7 Qh3 Rec8 Qh6 Rxc3 Bf6 Rf8'.split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const m of GAME.slice(0, n)) c.move(m); return c.fen(); };

describe('the keep-your-minor line names what it outclasses', () => {
  it('never "their minor" — it says every minor they have', () => {
    const texts: string[] = [];
    for (let n = 10; n <= 30; n += 2) {
      for (const h of detectBehaviors({ fen: fenAt(n), studentColor: 'w' })) if (h.id === 'piece-preservation') texts.push(h.fact);
    }
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t).not.toMatch(/outclasses their minor;/);
      expect(t).toMatch(/does more than any minor piece they have/);
    }
    // Eleven full behaviour reads: 3.5s alone, over 5s under the pre-commit
    // load — a budget, not a race.
  }, 20000);
});

describe('ply 52 — the gap line and the weighing name Bf6 once', () => {
  const verdict = { kind: 'deliberation', text: 'Qe4? Then Rc1 and the back rank falls. The move is Bf6 — it lands on the f6 outpost, a square none of their pawns can attack.' };
  it('the gap line is the echo of a verdict on the same move', () => {
    expect(gapEchoedByVerdict('Bf6', [verdict])).toBe(true);
  });
  it('NEGATIVE CONTROL: a verdict on a different move leaves the gap line', () => {
    expect(gapEchoedByVerdict('Bf6', [{ ...verdict, text: verdict.text.replace('The move is Bf6', 'The move is Qe3') }])).toBe(false);
    expect(gapEchoedByVerdict('Bf6', [{ kind: 'fundamental', text: verdict.text }])).toBe(false);
    expect(gapEchoedByVerdict(null, [verdict])).toBe(false);
  });
});

describe('ply 27 — Ng5 hangs the knight, and the coach says so', () => {
  const VERDICT = "Loose pieces drop off: the knight on g5 is left hanging, and Bxg5 just takes it.";
  const AFTER_MOVE = fenAt(27);  // Ng5 on the board, Black to move
  const AFTER_REPLY = fenAt(28); // …Bxg5 taken
  it('the verdict is true on the board it describes, and dies on the board after their reply', async () => {
    const { gradeNarrationText } = await import('./coachAnswerGates');
    expect(gradeNarrationText(VERDICT, AFTER_MOVE, 'fence') ?? '').toMatch(/knight on g5 is left hanging/);
    // Why the grade board matters: graded after …Bxg5 the sentence is deleted.
    expect(gradeNarrationText(VERDICT, AFTER_REPLY, 'fence') ?? '').not.toMatch(/knight on g5/);
  });
  it('Learn grades the backward look on the student-move board', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/queueSpokenHint\(fenAfterReply, line, look\.kind,\s*\/\^\[a-h\]\[1-8\]\$\/\.test\(look\.square\) \? \[look\.square\] : \[\], winClaim, move\.fen, undefined,/);
    expect(src).toMatch(/queueSpokenHint\(fenAfterReply, bookSaidAlone \? fundamental\.howOnly : fundamental\.verdict, 'fundamental', \[\], [^,]*\? \['convert-method'\] : undefined, move\.fen, undefined, bookSaidAlone \? undefined : fundamental\.lines\)/);
    expect(src).toMatch(/fen: gradeFen \?\? pending\.fen/);
  });
});
