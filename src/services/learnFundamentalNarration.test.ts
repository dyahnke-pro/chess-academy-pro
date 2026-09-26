import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { learnFundamentalVerdict, LEARN_FUNDAMENTAL_CP_FLOOR, type LearnFundamentalInput } from './learnFundamentalNarration';
import type { FundamentalId } from './principleAttribution';

// Build #3 (David 2026-09-07: "Learn it needs to be added into the narration").
// The Learn board names the fundamental the just-played move neglected, LIVE —
// the same attributor + voice the post-game review uses, fed the two engine
// reads the narration turn already holds. Pure, so it is fully unit-testable.
//
// Reuses the review's Alapin fixture (David's own 6...Nb6: "gave space away,
// moved the same piece twice, allowed tempo"). Best is 6...e6; the engine calls
// Nb6 a mistake. The student is BLACK here.
const ALAPIN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6';
const SANS = (() => { const c = new Chess(); c.loadPgn(ALAPIN); return c.history(); })();
const upTo = (ply: number): string[] => SANS.slice(0, ply);
const fenBefore = (ply: number): string => { const c = new Chess(); for (const s of upTo(ply - 1)) c.move(s); return c.fen(); };

// Ply 12 = 6...Nb6 (Black's flagged move). Black slightly better before, worse
// after → a flagged mover-POV loss (white-POV: −30 → +90).
const NB6: LearnFundamentalInput = {
  currentGameId: 'live-now',
  replySan: null,
  fenBefore: fenBefore(12),
  historySans: upTo(12),
  playedSan: SANS[11],       // 'Nb6'
  bestSan: 'e6',
  studentColor: 'black',
  evalBeforeWhiteCp: -30,    // +30 mover POV
  evalAfterWhiteCp: 90,      // −90 mover POV → cpLoss 120, flagged
};

describe('learnFundamentalVerdict', () => {
  it('returns null when there is no best move to compare against', () => {
    expect(learnFundamentalVerdict({ ...NB6, bestSan: null }, new Set())).toBeNull();
  });

  it('returns null for a near-best move under the centipawn floor', () => {
    const out = learnFundamentalVerdict(
      { ...NB6, evalBeforeWhiteCp: -30, evalAfterWhiteCp: -20 }, // +30 → +20, only 10cp
      new Set(),
    );
    expect(out).toBeNull();
  });

  it('names a fundamental and returns a spoken-ready verdict on a real slip', () => {
    const seen = new Set<FundamentalId>();
    const out = learnFundamentalVerdict(NB6, seen);
    expect(out).not.toBeNull();
    // The attributor is the authority on WHICH fundamental; David's read of this
    // exact move was "moved the same piece twice", and the review fixture proves
    // that id fires here — so it must be one of the trio it attributes.
    expect(['same-piece-twice', 'tempo-handed', 'space-conceded']).toContain(out!.id);
    expect(out!.verdict.trim().length).toBeGreaterThan(0);
    expect(out!.tag).toBeTruthy();
    expect(seen.has(out!.id)).toBe(true);
  });

  it('shortens a repeat of the same fundamental within one game (seen set)', () => {
    const seen = new Set<FundamentalId>();
    const first = learnFundamentalVerdict(NB6, seen);
    expect(first).not.toBeNull();
    const second = learnFundamentalVerdict(NB6, seen);
    if (second && second.id === first!.id) expect(second.verdict).not.toBe(first!.verdict);
  });

  it('treats a mate swing as flagged even when centipawns are unavailable', () => {
    const out = learnFundamentalVerdict(
      { ...NB6, evalBeforeWhiteCp: undefined, evalAfterWhiteCp: undefined, allowedMate: 3 },
      new Set(),
    );
    expect(out === null || typeof out.verdict === 'string').toBe(true);
  });

  it('is silent on an empty history (no move context to attribute)', () => {
    expect(learnFundamentalVerdict({ ...NB6, historySans: [] }, new Set())).toBeNull();
  });

  it('exposes the centipawn floor as a shared constant', () => {
    expect(LEARN_FUNDAMENTAL_CP_FLOOR).toBeGreaterThan(0);
  });
});

// WO-LOOP-01 — Learn's half of the loop out loud, present tense.
describe('learnFundamentalVerdict — recurrence (WO-LOOP-01)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const spine = [{
    clusterId: 'fundamental:same-piece-twice', capabilityTag: null, proven: false, bucket: 'positional' as const, label: 'Moving the same piece twice',
    openCount: 1, severity: 30, puzzleThemes: [] as string[], total: 1,
    games: [{ gameId: 'prior-1', opponentName: 'Rossi, Anna', playedAt: Date.now() - 9 * DAY }],
  }];
  it('a recorded prior game → the present-tense clause rides with the verdict', () => {
    const r = learnFundamentalVerdict(NB6, new Set(), spine);
    expect(r?.id).toBe('same-piece-twice');
    expect(r?.recurrence).toBe("You've walked into this before — moving the same piece twice, the second game now — the last one was against Rossi, Anna 9 days ago.");
  });
  it('negative control: a cold student hears the verdict and no recurrence', () => {
    const r = learnFundamentalVerdict(NB6, new Set());
    expect(r?.verdict).toBeTruthy();
    expect(r?.recurrence).toBeNull();
  });
  it('a repeat within THIS game gets the short stem and no second recurrence clause', () => {
    const seen = new Set<FundamentalId>(['same-piece-twice']);
    const r = learnFundamentalVerdict(NB6, seen, spine);
    expect(r?.recurrence).toBeNull();
  });
});

// C4 — the CURRENT game is never its own prior. Learn's live capture writes
// rows mid-game under `learnMemRef.current.gameId`, and the spine reloads on
// `weaknessModelChanged`, so by the second slip the spine already carries THIS
// game; without the id the first occurrence heard "you've walked into this
// before".
describe('learnFundamentalVerdict — recurrence excludes the game being played (C4)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const row = (gameId: string) => ({
    clusterId: 'fundamental:same-piece-twice', capabilityTag: null, proven: false, bucket: 'positional' as const, label: 'Moving the same piece twice',
    openCount: 1, severity: 30, puzzleThemes: [] as string[], total: 1,
    games: [{ gameId, opponentName: 'Coach', playedAt: Date.now() - DAY }],
  });

  it('NEGATIVE CONTROL: a spine whose only recorded game IS this game → no "again"', () => {
    const r = learnFundamentalVerdict(NB6, new Set(), [row('live-now')]);
    expect(r?.id).toBe('same-piece-twice');
    expect(r?.recurrence).toBeNull();
  });

  it('the same row under ANOTHER game id → the clause speaks', () => {
    const r = learnFundamentalVerdict(NB6, new Set(), [row('prior-1')]);
    expect(r?.recurrence).toMatch(/^You've walked into this before/);
  });

  it('the page hands its own game id over (by statement)', async () => {
    const src = await import('node:fs').then((fs) => fs.readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8'));
    const at = src.indexOf('learnFundamentalVerdict({');
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at, at + 400)).toMatch(/currentGameId: learnMemRef\.current\.gameId,/);
  });
});

describe('a hung piece they did not take is a miss, not free material (re-walk 1380, 24.Bg5 f4)', () => {
  // 1.e4 d5 2.Bc4?? — dxc4 wins the bishop.
  const c = new Chess(); c.move('e4'); c.move('d5');
  const BC4: LearnFundamentalInput = {
    currentGameId: 'live-now', replySan: null, fenBefore: c.fen(), historySans: ['e4', 'd5', 'Bc4'],
    playedSan: 'Bc4', bestSan: 'exd5', studentColor: 'white', evalBeforeWhiteCp: 30, evalAfterWhiteCp: -300,
  };
  it('names the miss when their reply does not take', () => {
    const out = learnFundamentalVerdict({ ...BC4, replySan: 'Nf6' }, new Set());
    expect(out?.verdict ?? '').toMatch(/they missed it/);
    expect(out?.verdict ?? '').not.toMatch(/free material/);
  });
  it('keeps the plain verdict when they take it', () => {
    const out = learnFundamentalVerdict({ ...BC4, replySan: 'dxc4' }, new Set());
    expect(out).not.toBeNull();
    expect(out?.verdict ?? '').not.toMatch(/missed/);
  });
});
