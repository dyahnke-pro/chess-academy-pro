import { describe, it, expect, beforeEach } from 'vitest';
import { namedShotTag, namedShotTags } from './motifNaming';
import { capabilityOutcomes, recordLaneEvidence } from './capabilityEvidence';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { THREAT_SKILL } from './learnRecordTerms';
import { FOCUS_CARDS } from '../coach/focus/focusCard';
import { db } from '../db/schema';

// White knight d5, black king e8 and rook a8: Nc7+ forks king and rook.
const FORK = 'r3k3/8/8/3N4/8/8/8/2K5 w - - 0 1';

describe('a shot is named by its motif (WO-MOTIFS-01 M2)', () => {
  it('names the fork, the free piece, the mate and the promotion; a quiet move stays "a shot"', () => {
    expect(namedShotTag(FORK, 'Nc7+')).toBe('missed-your-fork');
    expect(namedShotTag('4k3/8/8/n7/8/8/8/R3K3 w - - 0 1', 'Rxa5')).toBe('missed-your-free-piece');
    expect(namedShotTag('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', 'Ra8#')).toBe('missed-your-mate');
    expect(namedShotTag('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a8=Q+')).toBe('missed-your-promotion');
    expect(namedShotTag('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'Kd2')).toBe('missed-tactic');
    expect(namedShotTag(FORK, null)).toBe('missed-tactic');
  });

  it('the move is SCORED under the named row — missed (from the best move) and held alike', () => {
    const posed = [{ tag: 'missed-tactic' as const, posedImportance: 90 }];
    const missed = capabilityOutcomes({ fenBefore: FORK, playedSan: 'Kd2', moverColor: 'white', cpLoss: 500, bestSan: 'Nc7+', alsoPosed: posed, slipTag: 'missed-tactic' });
    expect(missed).toContainEqual(expect.objectContaining({ tag: 'missed-your-fork', outcome: 'broken' }));
    expect(missed.some((r) => r.tag === 'missed-tactic')).toBe(false);
    const held = capabilityOutcomes({ fenBefore: FORK, playedSan: 'Nc7+', moverColor: 'white', cpLoss: 0, bestSan: 'Nc7+', alsoPosed: posed });
    expect(held).toContainEqual(expect.objectContaining({ tag: 'missed-your-fork', outcome: 'held' }));
  });

  it('a slip the classifier files as a missed shot carries the motif', () => {
    const r = classifyMisconceptionNow({ fen: FORK, playedSan: 'Kd2', bestSan: 'Nc7+' });
    expect(r?.tag).toBe('missed-your-fork');
  });
});

describe('count both (David 2026-10-22, WO-MOTIFS-01 M3d)', () => {
  // Lichess 0D5yL: …exd4 lures the king to d4 (Kxd4) and Nb3+ forks it with
  // the c1 rook. The decoy is a deflection by the master list's vocabulary.
  const FEN = '8/4k1p1/4p2p/2n1p3/2NBP3/2K2P2/r5PP/2R5 b - - 0 32';
  const LINE = ['e5d4', 'c3d4', 'c5b3', 'd4e3', 'b3c1'];
  const posed = [{ tag: 'missed-tactic' as const, posedImportance: 90 }];

  it('a shot whose line opens with a set-up is named twice: the line, then the set-up', () => {
    expect(namedShotTags(FEN, 'exd4', LINE)).toEqual(['missed-your-fork', 'missed-your-deflection']);
    expect(namedShotTag(FEN, 'exd4', LINE)).toBe('missed-your-fork');
  });

  it('a costly move breaks BOTH rows, and a find holds both', () => {
    const missed = capabilityOutcomes({ fenBefore: FEN, playedSan: 'Kd7', moverColor: 'black', cpLoss: 500, bestSan: 'exd4', alsoPosed: posed, slipTag: 'missed-tactic', shotLine: LINE });
    expect(missed).toContainEqual(expect.objectContaining({ tag: 'missed-your-fork', outcome: 'broken' }));
    expect(missed).toContainEqual(expect.objectContaining({ tag: 'missed-your-deflection', outcome: 'broken' }));
    const held = capabilityOutcomes({ fenBefore: FEN, playedSan: 'exd4', moverColor: 'black', cpLoss: 0, bestSan: 'exd4', alsoPosed: posed, shotLine: LINE });
    expect(held).toContainEqual(expect.objectContaining({ tag: 'missed-your-fork', outcome: 'held' }));
    expect(held).toContainEqual(expect.objectContaining({ tag: 'missed-your-deflection', outcome: 'held' }));
  });

  it('a slip filed under the fork itself breaks the deflection too (the same shot)', () => {
    const missed = capabilityOutcomes({ fenBefore: FEN, playedSan: 'Kd7', moverColor: 'black', cpLoss: 500, bestSan: 'exd4', alsoPosed: posed, slipTag: 'missed-your-fork', shotLine: LINE });
    expect(missed.filter((r) => r.outcome === 'broken').map((r) => r.tag)).toEqual(expect.arrayContaining(['missed-your-fork', 'missed-your-deflection']));
  });

  it('without the line the shot is named from its first move alone, once', () => {
    expect(namedShotTags(FEN, 'exd4')).toHaveLength(1);
  });

  it('the slip classifier files the set-up beside the missed shot', () => {
    // Lichess 0Dao0: Rxh7+ Kxh7 Qh5# — b3 walks past the decoy and the mate.
    const MATE = 'r6k/pp2q1pp/2p2p2/4n3/2B1P2R/2P5/PP4PP/3Q2K1 w - - 3 21';
    const r = classifyMisconceptionNow({ fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+', pvAfterBest: ['Kxh7', 'Qh5#'] });
    expect(r?.tag).toBe('missed-your-mate');
    expect(r?.setupTag).toBe('missed-your-deflection');
    // Without the line, the old record: one row.
    expect(classifyMisconceptionNow({ fen: MATE, playedSan: 'b3', bestSan: 'Rxh7+' })?.setupTag).toBeUndefined();
  });
});

describe('a lane that credits a found shot names it', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });
  it('writes the motif row, not the catch-all', async () => {
    await recordLaneEvidence({ lane: 'teaching', tag: 'missed-tactic', outcome: 'held', fen: FORK, playedSan: 'Nc7+', posedImportance: 90, origin: 'learn', prompted: false });
    const rows = await db.capabilityEvidence.toArray();
    expect(rows.map((r) => r.tag)).toEqual(['missed-your-fork']);
  });
});

describe('their side reads the master list', () => {
  it('a double check is its own row; removing the guard and overload have rows at last', () => {
    expect(THREAT_SKILL.double_check.motifTag).toBe('missed-their-double-check');
    expect(THREAT_SKILL.removal_of_guard.motifTag).toBe('missed-their-guard-removal');
    expect(THREAT_SKILL.overload.motifTag).toBe('missed-their-overload');
    expect(THREAT_SKILL.fork.motifTag).toBe('missed-their-fork');
    expect(THREAT_SKILL.hanging.motifTag).toBeNull();
  });
});

describe('the three lessons no longer share one "your side"', () => {
  it('their exploit seats are disjoint (they all read missed-tactic before)', () => {
    const loose = new Set(FOCUS_CARDS['loose-pieces'].seats.exploit.tags);
    const tactics = new Set(FOCUS_CARDS.tactics.seats.exploit.tags);
    const kings = new Set(FOCUS_CARDS.kings.seats.exploit.tags);
    for (const t of loose) expect(tactics.has(t) || kings.has(t), t).toBe(false);
    for (const t of kings) expect(tactics.has(t), t).toBe(false);
    expect([...loose]).toEqual(['missed-your-free-piece']);
    expect([...kings]).toContain('missed-your-mate');
    expect([...tactics]).toEqual(expect.arrayContaining(['missed-your-fork', 'missed-your-pin', 'missed-tactic']));
  });
});
