import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { COMPUTER_CATALOG, FACT_GROUP, GROUP_STEP, stepOf, type ComputerName } from './coachFact';
import { moveThoughtFacts } from './moveThoughtFacts';
import { afterCapture, NO_PREV_CAPTURE, type PrevCaptureContext } from './captureRun';
import { BRIEFING_LINE_PLIES } from './reviewMoveBriefing';
import type { ThoughtFact } from './thoughtComposer';

/** Every move of Danya's notes, sampled (the Danya bench's positions, no reads
 *  needed): the board before the note's move, the move, the capture run, their
 *  last move and the taught line ahead — the lesson composer's own inputs. */
interface Note { id: string; lineSan: string[] }
function benchMoves(every: number): Array<{ fenBefore: string; san: string; prev: PrevCaptureContext; theirLast: { fenBefore: string; san: string } | null; line: string[]; own: boolean }> {
  const notes: Note[] = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8')).notes;
  const out: ReturnType<typeof benchMoves> = [];
  notes.forEach((n, k) => {
    if (k % every !== 0 || n.lineSan.length === 0) return;
    const c = new Chess();
    let prev: PrevCaptureContext = NO_PREV_CAPTURE;
    let theirLast: { fenBefore: string; san: string } | null = null;
    try {
      for (let i = 0; i < n.lineSan.length - 1; i++) {
        const fb = c.fen();
        const mv = c.move(n.lineSan[i]);
        prev = afterCapture(prev, mv);
        if (i === n.lineSan.length - 2) theirLast = { fenBefore: fb, san: mv.san };
      }
      const fenBefore = c.fen();
      const san = c.move(n.lineSan[n.lineSan.length - 1]).san;
      // Both seats: the same move as the student's and as the opponent's.
      out.push({ fenBefore, san, prev, theirLast, line: n.lineSan.slice(-BRIEFING_LINE_PLIES), own: k % 2 === 0 });
    } catch { /* an illegal note line is skipped, as the bench skips it */ }
  });
  return out;
}

/** The step every lesson fact carried before the one fact shape (`5e4b632`):
 *  the in-between move in `notYet`, every other fact in the mover's step. */
function stepBefore(f: ThoughtFact): string {
  return f.source === 'notYet' ? 'notYet' : f.seat === 'student' ? 'yours' : 'theirs';
}

describe('CoachFact — the one fact shape (WO-STORY-MATRIX-01 P1-3)', () => {
  it('every lesson fact\'s derived step equals the step it carried, on the bench\'s positions', () => {
    // Every 250th note: ~30 moves here, both seats; the cross-commit identity
    // run walks every move of every 8th video (the P1-3 commit message).
    const moves = benchMoves(250);
    expect(moves.length).toBeGreaterThan(25);
    let facts = 0;
    const kinds = new Set<string>();
    for (const m of moves) {
      for (const f of moveThoughtFacts({ fenBefore: m.fenBefore, san: m.san, moverIsStudent: m.own, prev: m.prev, line: m.line, theirLast: m.theirLast, phrases: null })) {
        facts += 1;
        kinds.add(f.kind);
        expect(f.group).toBe(FACT_GROUP[f.kind]);
        expect(f.step).toBe(GROUP_STEP[f.group](f.seat));
        expect(f.step).toBe(stepBefore(f));
        expect(COMPUTER_CATALOG[f.computer]).toBeDefined();
      }
    }
    // Not vacuous: hundreds of facts, of many kinds, from both seats.
    expect(facts).toBeGreaterThan(60);
    expect(kinds.size).toBeGreaterThan(6);
  }, 120_000);

  it('a seat-free caller (moverIsStudent undefined) keeps the student\'s step', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const facts = moveThoughtFacts({ fenBefore: fen, san: 'Nf3', moverIsStudent: undefined, prev: NO_PREV_CAPTURE, line: null, theirLast: null, phrases: null });
    expect(facts.length).toBeGreaterThan(0);
    for (const f of facts) expect(f.step).toBe('yours');
  });

  it('the move group is the mover\'s step; every other group is seat-free', () => {
    expect(stepOf('move-job', 'student')).toBe('yours');
    expect(stepOf('move-job', 'opponent')).toBe('theirs');
    for (const g of Object.keys(GROUP_STEP) as Array<keyof typeof GROUP_STEP>) {
      if (g === 'move') continue;
      expect(GROUP_STEP[g]('student')).toBe(GROUP_STEP[g]('opponent'));
    }
  });

  it('every catalog row names a function its file really exports', async () => {
    for (const name of Object.keys(COMPUTER_CATALOG) as ComputerName[]) {
      const mod = (await import(/* @vite-ignore */ `../${COMPUTER_CATALOG[name].file.replace(/\.ts$/, '')}`)) as Record<string, unknown>;
      expect(typeof mod[name], `${name} in ${COMPUTER_CATALOG[name].file}`).toBe('function');
    }
  });
});
