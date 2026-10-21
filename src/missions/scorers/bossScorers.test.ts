import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { scoreCandidates, type ScoringContext, type ScorerId } from '../moveScoring';
import type { PatternId } from '../missionCard';
import './bossGreed';
import './bossLoose';
import './bossLuft';
import './bossTargets';


const fenOf = (sans: string): string => { const b = new Chess(); for (const s of sans.split(' ')) b.move(s); return b.fen(); };
const ctxFor = (fen: string, targets: readonly PatternId[] = []): ScoringContext => ({
  fen, coach: fen.split(' ')[1] === 'b' ? 'b' : 'w', windowCp: 100, coachEvalCp: 0, pattern: null, phase: null, bossId: 'grabber', targets, focus: null,
});
/** One scorer's liking for one move, read through the seam itself. */
const liking = (id: ScorerId, fen: string, uci: string, targets: readonly PatternId[] = []): number =>
  scoreCandidates([{ uci, cpLoss: 0 }], ctxFor(fen, targets), { [id]: 1 })[0].score;

/** Both sides castled, White to move (chess.js-verified). */
const CASTLED = fenOf('e4 e5 Nf3 Nc6 Bc4 Nf6 Nc3 Bc5 O-O O-O');

describe('the Grabber scorers', () => {
  it('greed: a pawn most of all, any other capture half', () => {
    expect(liking('greed', fenOf('e4 d5'), 'e4d5')).toBe(1);
    expect(liking('greed', fenOf('e4 e5 Nf3 Nc6 Bb5 a6'), 'b5c6')).toBe(0.5);
    expect(liking('greed', fenOf('e4 d5'), 'b1c3')).toBe(0);
  });

  it('loose: likes a move that leaves its own piece undefended, dislikes tidying up', () => {
    expect(liking('loose', CASTLED, 'f3g5')).toBe(1);
    expect(liking('loose', CASTLED, 'd2d3')).toBe(-1);
    expect(liking('loose', CASTLED, 'a2a3')).toBe(0);
  });

  it('luft: a pawn move beside a back-rank king; nothing else', () => {
    expect(liking('luft', CASTLED, 'h2h3')).toBe(1);
    expect(liking('luft', CASTLED, 'g2g3')).toBe(1);
    expect(liking('luft', CASTLED, 'a2a3')).toBe(0);
    // A king still in the centre makes no luft: …e5 / f3 beside it are not luft.
    expect(liking('luft', fenOf('e4'), 'e7e5')).toBe(0);
    expect(liking('luft', fenOf('e4 e5'), 'f2f3')).toBe(0);
    expect(liking('luft', fenOf('e4 e5'), 'g1f3')).toBe(0);
  });

  it('targets: likes a move that hands the student a target pattern (the library, move-aware)', () => {
    // Bc4-a6 leaves the bishop free for …bxa6; a3 leaves nothing.
    expect(liking('targets', CASTLED, 'c4a6', ['free-piece'])).toBe(1);
    expect(liking('targets', CASTLED, 'a2a3', ['free-piece'])).toBe(0);
    expect(liking('targets', CASTLED, 'c4a6', [])).toBe(0);
  });

  it('an illegal candidate scores nothing (never a throw)', () => {
    expect(liking('greed', fenOf('e4 d5'), 'a1a8')).toBe(0);
  });
});
