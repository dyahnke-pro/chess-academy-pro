import { describe, it, expect } from 'vitest';
import { buildPicture, linkBetween, linkedTo, PICTURE_ROLE } from './positionPicture';
import { COMPUTER_CATALOG } from './coachFact';
import { doorFact } from '../test/doorFact';
import { decide } from './coachDecider';
import { CALM_BOARD } from './boardState';
import { ALL_GREY } from './teachingLayers';
import { NO_BOOST } from './studentMomentBoost';
import type { ImportanceSignals } from './narrationImportance';

// After 1.e4 e5 2.Nf3 Nc6 — White's knight on f3, Black's knight on c6, e5 pawn.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

describe('the picture (WO-PICTURE-01)', () => {
  it('every computer in the catalog has a role', () => {
    for (const name of Object.keys(COMPUTER_CATALOG)) expect(PICTURE_ROLE[name as keyof typeof COMPUTER_CATALOG]).toBeTruthy();
  });

  it('keeps every fact and indexes it by the piece it is about', () => {
    const a = doorFact('[tactic] Your knight on f3 hits their pawn on e5.', { squares: ['f3', 'e5'], fen: FEN });
    const b = doorFact('[delta] Your knight on f3 is your only developed piece.', { squares: ['f3'], fen: FEN });
    const pic = buildPicture([a, b]);
    expect(pic.entries.size).toBe(2);
    expect(pic.byObject.get('wN@f3')).toEqual([a.id, b.id]);
    expect(linkedTo(pic, a.id).map((l) => l.kind)).toEqual(['object']);
  });

  it('a shared EMPTY square is not a link — overlap alone proves nothing', () => {
    const a = doorFact('[delta] Their knight can land on d4.', { squares: ['d4'], fen: FEN });
    const b = doorFact('[delta] Your c-pawn can take on d4 later.', { squares: ['d4'], fen: FEN });
    const [ea, eb] = [...buildPicture([a, b]).entries.values()];
    expect(linkBetween(ea, eb)).toBeNull();
  });

  it('the same square on a DIFFERENT board is not the same object', () => {
    const other = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3';
    const a = doorFact('[tactic] Your knight on f3 hits their pawn on e5.', { squares: ['f3', 'e5'], fen: FEN });
    const b = doorFact('[delta] Something about c3.', { squares: ['f3'], fen: other });
    const [ea, eb] = [...buildPicture([a, b]).entries.values()];
    expect(linkBetween(ea, eb)).toBeNull();
  });
});

describe('the door keeps the detail a picture link proves (P4)', () => {
  const student = { rating: 1500, weaknesses: [], need: null, moveAdvice: null, momentBoost: NO_BOOST, layers: ALL_GREY, fade: new Map() };
  const calm: ImportanceSignals = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: false, evalCpWhitePov: 20, wdl: null };
  const POINT = '[tactic] Your knight on f3 hits their pawn on e5.';
  const DETAIL = '[consequence] Your knight on f3 is your only developed piece.';
  const STRAY = '[consequence] It nudged the balance your way.';

  it('a swept description about the same piece speaks right after its point; trivia about nothing stays swept', () => {
    const facts = [
      doorFact(POINT, { squares: ['f3', 'e5'], fen: FEN }),
      doorFact(DETAIL, { squares: ['f3'], fen: FEN }),
      doorFact(STRAY, { fen: FEN }),
    ];
    const d = decide(calm, student, { board: CALM_BOARD, facts }, 'walk');
    expect(d.spoken.indexOf(DETAIL)).toBe(d.spoken.indexOf(POINT) + 1);
    expect(d.spoken).not.toContain(STRAY);
  });

  it('a shared claim key is a duplicate, not a detail — it stays subsumed', () => {
    const facts = [
      doorFact(POINT, { squares: ['f3', 'e5'], claims: ['e5-hit'], fen: FEN }),
      doorFact('[delta] Your knight eyes the e5 pawn.', { squares: ['f3', 'e5'], claims: ['e5-hit'], fen: FEN }),
    ];
    const d = decide(calm, student, { board: CALM_BOARD, facts }, 'walk');
    expect(d.quiet.find((q) => q.text.startsWith('[delta]'))?.why).toBe('subsumed');
  });
});
