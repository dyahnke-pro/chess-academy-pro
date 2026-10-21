import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { BOSSES, bossCards, bossTargetPatterns, bossUnlocked, isBossId } from './index';
import { GRABBER } from './grabber';
import { MISSIONS, type MissionRecordRow } from '../registry';
import { scoreCandidates } from '../moveScoring';
import type { MissionCard, MissionId, MissionPhase } from '../missionCard';
import '../scorers';

const fenOf = (sans: string): string => { const b = new Chess(); for (const s of sans.split(' ')) b.move(s); return b.fen(); };

describe('the bosses', () => {
  it('the Grabber closes Tier 1 (Levels 1–4) with its fixed intro, and never rewinds', () => {
    expect(BOSSES.grabber).toBe(GRABBER);
    expect(GRABBER).toMatchObject({ tier: 1, levels: [1, 2, 3, 4], name: 'The Grabber' });
    expect(GRABBER.intro).toBe("The Grabber takes everything you leave lying around, and it's studied your games: it will go after your weak spots. Develop, castle, and take what it leaves loose.");
    expect(GRABBER.dials).toMatchObject({ rewinds: 'none', plantFreePiece: 'off' });
    expect(GRABBER.weights.luft).toBeLessThan(0);
    expect(isBossId('grabber')).toBe(true);
    expect(isBossId('nobody')).toBe(false);
    expect(isBossId(null)).toBe(false);
  });

  it('never plays outside its acceptable window — however much it likes the move', () => {
    // 1.e4 d5: the pawn grab exd5 is everything the Grabber wants.
    const fen = fenOf('e4 d5');
    const ctx = { fen, coach: 'w' as const, windowCp: 100, coachEvalCp: 0, pattern: null, phase: null, bossId: 'grabber' as const, targets: [], focus: null };
    const outside = scoreCandidates([{ uci: 'b1c3', cpLoss: 0 }, { uci: 'e4d5', cpLoss: 150 }], ctx, GRABBER.weights);
    expect(outside.map((c) => c.uci)).toEqual(['b1c3']);
    const inside = scoreCandidates([{ uci: 'b1c3', cpLoss: 0 }, { uci: 'e4d5', cpLoss: 40 }], ctx, GRABBER.weights);
    expect(inside[0].uci).toBe('e4d5');
  });

  it('unlocks only when every mission of its levels exists and has graduated', () => {
    const graduated = (ids: MissionId[]): MissionRecordRow[] => ids.flatMap((id, i) => [1, 2, 3].map((k) => ({ missionId: id, outcome: 'pass-first-try' as const, at: i * 10 + k })));
    // Today Levels 2–4 are not built: locked even with Level 1 learned.
    expect(bossUnlocked(GRABBER, graduated(['develop-and-castle', 'free-piece-stay-ahead']))).toBe(false);
    // A full Levels 1–4 set (stand-ins), every card graduated → open; one short → locked.
    const phases: MissionPhase[] = ['opening', 'middlegame', 'endgame'];
    const source: Record<string, MissionCard> = {};
    const ids: MissionId[] = [];
    for (const level of [1, 2, 3, 4]) for (const phase of phases) {
      const id = `${level}-${phase}` as MissionId;
      source[id] = { ...MISSIONS['develop-and-castle'], id, level, phase };
      ids.push(id);
    }
    expect(bossCards(GRABBER, source)).toHaveLength(12);
    expect(bossUnlocked(GRABBER, graduated(ids), source)).toBe(true);
    expect(bossUnlocked(GRABBER, graduated(ids.slice(1)), source)).toBe(false);
  });

  it('a free piece is never steered at — inside the window it would be a poisoned one', () => {
    const t = (pattern: 'free-piece' | 'knight-fork') => ({ cardId: 'free-piece-stay-ahead' as const, title: 'x', skill: 'threats' as const, pattern, score: 1, misses: 1, games: 1, meterRating: null });
    expect(bossTargetPatterns([t('free-piece')])).toEqual([]);
    expect(bossTargetPatterns([t('knight-fork'), t('free-piece'), t('knight-fork')])).toEqual(['knight-fork']);
  });

  it('a target with no pattern adds nothing to steer toward', () => {
    expect(bossTargetPatterns([])).toEqual([]);
    expect(bossTargetPatterns([{ cardId: 'develop-and-castle', title: 'x', skill: 'development', pattern: null, score: 1, misses: 1, games: 1, meterRating: null }])).toEqual([]);
  });
});
