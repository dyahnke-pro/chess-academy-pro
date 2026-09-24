// WO-LAYERS-01 — the teaching layers, from the student's record, through the door.
import { describe, it, expect } from 'vitest';
import { layerStandings, leadLayer, layerBonus, ALL_GREY, TAG_LAYER } from './teachingLayers';
import { decide, GREEN_QUIET_BELOW } from './coachDecider';
import { NO_BOOST } from './studentMomentBoost';
import type { WeaknessSignal } from './weaknessSignal';
import type { CapabilityProfile } from './capabilityEvidence';
import type { ImportanceSignals } from './narrationImportance';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { costStakes } from './factStakes';

const hole = (clusterId: string, openCount = 2): WeaknessSignal => ({
  clusterId, bucket: 'tactical', label: clusterId, openCount, severity: 60, puzzleThemes: [], total: openCount,
} as unknown as WeaknessSignal);
const proven = (...tags: MisconceptionTagId[]): CapabilityProfile =>
  new Map(tags.map((t) => [t, { held: 4, broken: 0, heldStreak: 3, streakGames: 3 }]));

describe('layer standings come from the record, never the rating', () => {
  it('a fresh install is all grey, and grey is taught bottom-up', () => {
    const s = layerStandings([], null);
    expect(s).toEqual(ALL_GREY);
    expect(leadLayer(s)).toBe('safety');
    expect(layerBonus('safety', s)).toBeGreaterThan(layerBonus('principle', s));
    expect(layerBonus('principle', s)).toBeGreaterThan(layerBonus('plan', s));
  });

  it('an open hole turns its layer red, and red keeps the bottom-up order', () => {
    const s = layerStandings([hole('hung-material'), hole('no-plan')], null);
    expect(s.safety).toBe('red');
    expect(s.plan).toBe('red');
    expect(s.principle).toBe('grey');
    expect(layerBonus('safety', s)).toBeGreaterThan(layerBonus('plan', s));
    expect(layerBonus('plan', s)).toBeGreaterThan(layerBonus('principle', s)); // red beats grey
  });

  it('two proven tags make a layer green; one does not', () => {
    expect(layerStandings([], proven('hung-material')).safety).toBe('grey');
    const s = layerStandings([], proven('hung-material', 'missed-opponents-threat'));
    expect(s.safety).toBe('green');
    expect(leadLayer(s)).toBe('principle');
  });

  it('red beats green — a proof never hides an open hole beside it', () => {
    const s = layerStandings([hole('missed-tactic')], proven('hung-material', 'missed-opponents-threat'));
    expect(s.safety).toBe('red');
  });

  it('a hole the lifecycle marks fixed does not turn a layer red', () => {
    const fixed = { ...hole('hung-material'), lifecycleStatus: 'fixed' } as WeaknessSignal;
    expect(layerStandings([fixed], null).safety).toBe('grey');
  });

  it('every tag has a layer (the Record is exhaustive)', () => {
    expect(Object.keys(TAG_LAYER).length).toBeGreaterThan(20);
  });
});

const quiet: ImportanceSignals = { decision: null, cpLossCp: null, threatNet: 0, teachingBeat: true, evalCpWhitePov: 20, wdl: null };
const PLAN = '[plan-now] Your plan is to push the queenside majority.';
const LOOSE = '[loose] Your knight on c6 is loose.';
const PRINCIPLE = '[principle] You developed a knight before the bishop.';
const bundle = { facts: [PLAN, PRINCIPLE, LOOSE], squares: new Map<string, readonly string[]>() };
const student = (layers = ALL_GREY) => ({ rating: 400, weaknesses: [], need: null, momentBoost: NO_BOOST, layers });

describe('the door teaches by layer', () => {
  it('grey: the plan comes after safety and principle (the fundamental still leads — locked 2026-09-05)', () => {
    const d = decide(quiet, student(), bundle, 'walk');
    expect(d.spoken[0]).toBe(PRINCIPLE);
    expect(d.spoken.indexOf(LOOSE)).toBeLessThan(d.spoken.indexOf(PLAN));
    expect(d.spoken.indexOf(PRINCIPLE)).toBeLessThan(d.spoken.indexOf(PLAN));
  });

  it('a RED plan layer lifts the plan over grey principle facts of lower tie rank', () => {
    const OPENING = '[opening] This is the Caro-Kann.';
    const b = { facts: [PLAN, OPENING], squares: new Map<string, readonly string[]>() };
    const grey = decide(quiet, student(), b, 'walk');
    expect(grey.spoken[0]).toBe(OPENING);
    const red = decide(quiet, student({ safety: 'grey', principle: 'grey', plan: 'red' }), b, 'walk');
    expect(red.spoken[0]).toBe(PLAN);
  });

  it('a GREEN layer goes quiet on a routine instance, and says why', () => {
    const layers = { safety: 'grey', principle: 'green', plan: 'grey' } as const;
    const d = decide(quiet, student(layers), bundle, 'walk');
    expect(d.spoken).not.toContain(PRINCIPLE);
    expect(d.quiet.find((q) => q.text === PRINCIPLE)?.why).toBe('proven');
    // Negative control: the same fact speaks when the layer is not proven.
    expect(decide(quiet, student(), bundle, 'walk').spoken).toContain(PRINCIPLE);
  });

  it('big stakes speak even in a proven layer — a hung queen is never outgrown', () => {
    const layers = { safety: 'green', principle: 'grey', plan: 'grey' } as const;
    const stakes = new Map([[LOOSE, costStakes(900)!]]);
    const d = decide(quiet, student(layers), { ...bundle, stakes }, 'walk');
    expect(d.spoken).toContain(LOOSE);
    const small = new Map([[LOOSE, costStakes(40)!]]);
    const d2 = decide(quiet, student(layers), { ...bundle, stakes: small }, 'walk');
    expect(d2.spoken).not.toContain(LOOSE);
    expect(GREEN_QUIET_BELOW).toBeGreaterThan(1000);
  });

  it('a ply whose every fact is in a proven layer closes as "proven"', () => {
    const allGreen = { safety: 'green', principle: 'green', plan: 'green' } as const;
    const d = decide(quiet, student(allGreen), bundle, 'walk');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('proven');
  });
});
