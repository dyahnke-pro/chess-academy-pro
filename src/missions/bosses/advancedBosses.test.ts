import { describe, expect, it } from 'vitest';
import { BOSSES, bossIntroFor, bossTargetCards, bossTargetPatterns, bossUnlocked } from './index';
import { bossGate } from './attempts';
import { GRABBER } from './grabber';
import { ATTACKER } from './attacker';
import { DYNAMO } from './dynamo';
import { GRINDER } from './grinder';
import { MIRROR, MIRROR_STRENGTH } from './mirror';
import { MISSIONS, type MissionRecordRow } from '../registry';
import { rankWeaknesses, MAX_TARGETS, type MeterReading } from '../weakness';
import type { BossAttemptRecord, BossId, MissionCard, MissionId, MissionOutcome, PatternId } from '../missionCard';
import type { SkillMeterId } from '../../services/skillMeters';

const ADVANCED = [ATTACKER, DYNAMO, GRINDER, MIRROR];

describe('the advanced track\'s bosses (docs/CAMPAIGN.md §7, §9)', () => {
  it('one per tier, closing Levels 37–50 between them, every one in BOSSES', () => {
    expect(ADVANCED.map((b) => [b.id, b.tier, b.levels])).toEqual([
      ['attacker', 11, [37, 38, 39, 40]],
      ['dynamo', 12, [41, 42, 43, 44]],
      ['grinder', 13, [45, 46, 47, 48]],
      ['mirror', 14, [49, 50]],
    ]);
    for (const b of ADVANCED) expect(BOSSES[b.id]).toBe(b);
    expect(ADVANCED.flatMap((b) => b.levels)).toEqual(Array.from({ length: 14 }, (_, i) => 37 + i));
  });

  it('every boss: no rewinds, nothing planted, no planned trap, and its targets weighted', () => {
    for (const b of Object.values(BOSSES)) {
      expect(b.dials).toMatchObject({ rewinds: 'none', plantFreePiece: 'off', plannedTrap: 'off' });
      expect(b.weights.targets).toBeGreaterThan(0);
    }
  });

  it('the Mirror: +150 over the student, and no personality but the student\'s own record', () => {
    expect(MIRROR.dials.strengthOffset).toBe(MIRROR_STRENGTH);
    expect(MIRROR_STRENGTH).toBe(150);
    expect(MIRROR.weights).toEqual({ targets: 1 });
    // The others climb toward it, each a step up from the one before.
    expect([ATTACKER, DYNAMO, GRINDER, MIRROR].map((b) => b.dials.strengthOffset)).toEqual([50, 75, 100, 150]);
  });

  it('each personality is its own scorer', () => {
    expect(ATTACKER.weights.kingPressure).toBeGreaterThan(0);
    expect(DYNAMO.weights.imbalance).toBeGreaterThan(0);
    expect(GRINDER.weights.simplify).toBeGreaterThan(0);
    // Behind, the Grinder keeps the pieces on: the trades scorer, reversed.
    expect(GRINDER.weights.trades).toBeLessThan(0);
  });

  it('every intro is fixed, 2–3 plain sentences, to "you", never "we"; the no-target intro never promises a hunt', () => {
    const sentences = (s: string): number => s.split(/[.!?](?:\s|$)/).filter((x) => x.trim()).length;
    for (const b of Object.values(BOSSES)) {
      for (const line of [b.intro, b.introNoTargets]) {
        expect(sentences(line)).toBeGreaterThanOrEqual(2);
        expect(sentences(line)).toBeLessThanOrEqual(3);
        expect(line).toMatch(/\byou(r)?\b/i);
        expect(line).not.toMatch(/\b(we|our|us)\b/i);
        expect(line).not.toMatch(/\d+\./);
      }
      expect(b.intro).toMatch(/weak spots/);
      expect(b.introNoTargets).not.toMatch(/go after your weak|goes straight at your weak|studied your games/);
    }
    expect(MIRROR.intro).toBe('The Mirror is built from your own games. It plays a little stronger than you, and it goes straight at your weak spots. Show it they are not weak any more.');
    expect(MIRROR.introNoTargets).toBe('The Mirror is built from your own games, and your record shows no weak spot for it to use yet. It plays a little stronger than you. Beat it as you are.');
  });
});

describe('when a boss opens', () => {
  const attempt = (bossId: BossId, result: BossAttemptRecord['result'], at: number): Pick<BossAttemptRecord, 'bossId' | 'result' | 'targeted' | 'at'> => ({ bossId, result, targeted: [], at });

  it('a chapter of silent games: the Attacker is open from the start, each next one once the last is BEATEN', () => {
    expect(bossUnlocked(ATTACKER, [], [])).toBe(true);
    expect(bossUnlocked(DYNAMO, [], [])).toBe(false);
    // A loss or a draw against the Attacker opens nothing.
    expect(bossUnlocked(DYNAMO, [], [attempt('attacker', 'loss', 1), attempt('attacker', 'draw', 2)])).toBe(false);
    const beatAttacker = [attempt('attacker', 'loss', 1), attempt('attacker', 'win', 2)];
    expect(bossUnlocked(DYNAMO, [], beatAttacker)).toBe(true);
    expect(bossUnlocked(GRINDER, [], beatAttacker)).toBe(false);
    // A win over a DIFFERENT boss never opens the next one.
    expect(bossUnlocked(MIRROR, [], [attempt('grabber', 'win', 1), attempt('dynamo', 'win', 2)])).toBe(false);
    expect(bossUnlocked(MIRROR, [], [attempt('grinder', 'win', 3)])).toBe(true);
  });

  it('read through the gate: ready once open, locked before', () => {
    expect(bossGate(bossUnlocked(ATTACKER, [], []), [], [])).toEqual({ kind: 'ready', attempts: 0 });
    expect(bossGate(bossUnlocked(DYNAMO, [], []), [], [])).toEqual({ kind: 'locked' });
  });

  it('the advanced chain runs Attacker → Dynamo → Grinder → Mirror, and nothing else opens that way', () => {
    expect(ADVANCED.map((b) => b.opens)).toEqual([
      { kind: 'after-boss', after: null },
      { kind: 'after-boss', after: 'attacker' },
      { kind: 'after-boss', after: 'dynamo' },
      { kind: 'after-boss', after: 'grinder' },
    ]);
  });

  it('a chapter of cards is unchanged: the Grabber still waits on every card of Levels 1–4, whatever the attempts', () => {
    expect(GRABBER.opens).toEqual({ kind: 'missions' });
    expect(bossUnlocked(GRABBER, [], [attempt('grinder', 'win', 1)])).toBe(false);
  });
});

/** Stand-in cards with a pattern each, at chosen levels (the advanced bosses
 *  read every card taught at or below their chapter). */
const card = (id: string, level: number, skill: SkillMeterId, pattern: PatternId): MissionCard =>
  ({ ...MISSIONS['free-piece-stay-ahead'], id: id as MissionId, level, skill, pattern });
const SOURCE: Record<string, MissionCard> = Object.fromEntries([
  card('l1-fork', 1, 'tactics', 'knight-fork'),
  card('l6-pin', 6, 'tactics', 'pin'),
  card('l20-back-rank', 20, 'king-safety', 'back-rank-mate'),
  card('l33-kp', 33, 'endgames', 'kp-king-in-front'),
  card('l45-rooks', 45, 'development', 'connect-rooks'),
  card('l51-smother', 51, 'tactics', 'smothered-mate'),
].map((c) => [c.id, c]));
let clock = 0;
const rows = (id: string, ...outcomes: MissionOutcome[]): MissionRecordRow[] =>
  outcomes.map((outcome) => ({ missionId: id as MissionId, outcome, at: ++clock }));
const targetsOf = (boss: typeof MIRROR, record: readonly MissionRecordRow[], meters: readonly MeterReading[] = []) =>
  rankWeaknesses(bossTargetCards(boss, SOURCE), Math.max(...boss.levels), record, meters);

describe("the Mirror's targets — the student's own record", () => {
  it('reads every habit taught at or below Level 50, never one above', () => {
    expect(bossTargetCards(MIRROR, SOURCE).map((c) => c.id)).toEqual(['l1-fork', 'l6-pin', 'l20-back-rank', 'l33-kp', 'l45-rooks']);
    // The Attacker closes Level 40: Level 45 is not taught yet.
    expect(bossTargetCards(ATTACKER, SOURCE).map((c) => c.id)).toEqual(['l1-fork', 'l6-pin', 'l20-back-rank', 'l33-kp']);
    // The Grabber's set is unchanged: Levels 1–4 only.
    expect(bossTargetCards(GRABBER, SOURCE).map((c) => c.id)).toEqual(['l1-fork']);
  });

  it('the three weakest, weakest first, out of everything it can read', () => {
    const record = [
      ...rows('l1-fork', 'missed', 'missed', 'pass-first-try', 'pass-first-try'), // 0.5
      ...rows('l6-pin', 'pass-first-try', 'pass-first-try'), // 0 — not weak
      ...rows('l20-back-rank', 'missed', 'missed', 'missed', 'pass-retry'), // 0.875
      ...rows('l33-kp', 'pass-retry', 'pass-first-try'), // 0.25
      ...rows('l45-rooks', 'missed', 'miss-shown'), // 1
      ...rows('l51-smother', 'missed', 'missed'), // above Level 50 — never read
    ];
    const t = targetsOf(MIRROR, record);
    expect(t).toHaveLength(MAX_TARGETS);
    expect(t.map((x) => x.cardId)).toEqual(['l45-rooks', 'l20-back-rank', 'l1-fork']);
    expect(bossTargetPatterns(t)).toEqual(['connect-rooks', 'back-rank-mate', 'knight-fork']);
    expect(bossIntroFor(MIRROR, t)).toBe(MIRROR.intro);
  });

  it('a habit the student never played as a mission still counts when the wider record (its skill meter) says it is weak', () => {
    const meters: MeterReading[] = [
      { id: 'tactics', rating: 1500, rated: true },
      { id: 'endgames', rating: 1100, rated: true },
      { id: 'king-safety', rating: 1500, rated: true },
    ];
    expect(targetsOf(MIRROR, [], meters).map((x) => x.cardId)).toEqual(['l33-kp']);
  });

  it('an empty record: no targets, nothing to steer at, and the intro says so', () => {
    const t = targetsOf(MIRROR, []);
    expect(t).toEqual([]);
    expect(bossTargetPatterns(t)).toEqual([]);
    expect(bossIntroFor(MIRROR, t)).toBe(MIRROR.introNoTargets);
  });

  it('weak spots it cannot steer at promise no hunt: the free piece and Develop & Castle are watched, never steered toward', () => {
    const record = [...rows('free-piece-stay-ahead', 'missed', 'missed'), ...rows('develop-and-castle', 'missed')];
    const t = rankWeaknesses(bossTargetCards(MIRROR), 50, record, []);
    expect(t.map((x) => x.cardId)).toEqual(['develop-and-castle', 'free-piece-stay-ahead']);
    expect(bossTargetPatterns(t)).toEqual([]);
    expect(bossIntroFor(MIRROR, t)).toBe(MIRROR.introNoTargets);
    expect(bossIntroFor(GRABBER, t)).toBe(GRABBER.introNoTargets);
  });

  it('a clean record is not a weak one: passes alone give no targets', () => {
    const record = [...rows('l1-fork', 'pass-first-try', 'pass-first-try'), ...rows('l20-back-rank', 'pass-first-try')];
    expect(targetsOf(MIRROR, record)).toEqual([]);
  });
});
