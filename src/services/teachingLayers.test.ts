// WO-LAYERS-01 — the teaching layers, from the student's record, through the door.
import { CALM_BOARD } from './boardState';
import { describe, it, expect } from 'vitest';
import { layerStandings, layerBonus, ALL_GREY, TAG_LAYER } from './teachingLayers';
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
  new Map(tags.map((t) => [t, { held: 20, broken: 0, heldStreak: 20, streakGames: 3, hold: { posed: 20, held: 20, heldWeight: 20, missed: 0, rate: 1 } }]));

describe('layer standings come from the record, never the rating', () => {
  it('a fresh install is all grey, and grey is taught bottom-up', () => {
    const s = layerStandings([], null);
    expect(s).toEqual(ALL_GREY);
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
const bundle = { board: CALM_BOARD, proofs: new Map(), facts: [PLAN, PRINCIPLE, LOOSE], squares: new Map<string, readonly string[]>() };
const student = (layers = ALL_GREY) => ({ rating: 400, weaknesses: [], need: null, moveAdvice: null, momentBoost: NO_BOOST, layers, fade: new Map() as ReadonlyMap<string, 'lighter' | 'short'> });

describe('the door teaches by layer', () => {
  it('grey: the plan comes after safety and principle (the fundamental still leads — locked 2026-09-05)', () => {
    const d = decide(quiet, student(), bundle, 'walk');
    expect(d.spoken[0]).toBe(PRINCIPLE);
    expect(d.spoken.indexOf(LOOSE)).toBeLessThan(d.spoken.indexOf(PLAN));
    expect(d.spoken.indexOf(PRINCIPLE)).toBeLessThan(d.spoken.indexOf(PLAN));
  });

  it('a RED plan layer lifts the plan over grey principle facts of lower tie rank', () => {
    const OPENING = '[opening] This is the Caro-Kann.';
    const b = { board: CALM_BOARD, proofs: new Map(), facts: [PLAN, OPENING], squares: new Map<string, readonly string[]>() };
    const grey = decide(quiet, student(), b, 'walk');
    expect(grey.spoken[0]).toBe(OPENING);
    const red = decide(quiet, student({ safety: 'grey', principle: 'grey', plan: 'red' }), b, 'walk');
    expect(red.spoken[0]).toBe(PLAN);
  });

  // SHORTEN, NEVER SILENCE A REASON (David 2026-10-17: "Agreed"). A teaching
  // fact in a proven layer speaks its short form; a DESCRIPTION still goes quiet.
  const PRAISE = '[praise] That knight move looks natural.';
  it('a GREEN layer shortens its teaching facts and quiets its descriptions', () => {
    const layers = { safety: 'green', principle: 'green', plan: 'grey' } as const;
    const d = decide(quiet, student(layers), { ...bundle, facts: [...bundle.facts, PRAISE] }, 'walk');
    expect(d.spoken).toContain(PRINCIPLE);
    expect(d.faded.get(PRINCIPLE)).toBe('short');
    expect(d.spoken).not.toContain(PRAISE);
    expect(d.quiet.find((q) => q.text === PRAISE)?.why).toBe('proven');
    // Negative control: nothing fades when the layer is not proven.
    expect(decide(quiet, student(), bundle, 'walk').faded.size).toBe(0);
  });

  it('a skill shown at the record fades per skill, before its layer is green', () => {
    const fadeStudent = { ...student(), fade: new Map([['neglected-development', 'lighter' as const]]) };
    const d = decide(quiet, fadeStudent, { ...bundle, skillOf: new Map([[PRINCIPLE, 'neglected-development']]) }, 'walk');
    expect(d.faded.get(PRINCIPLE)).toBe('lighter');
    expect(d.faded.has(PLAN)).toBe(false);
  });

  it('big stakes speak even in a proven layer — a hung queen is never outgrown', () => {
    const layers = { safety: 'green', principle: 'grey', plan: 'grey' } as const;
    const stakes = new Map([[PRAISE, costStakes(900)!]]);
    const d = decide(quiet, student(layers), { ...bundle, facts: [PRAISE], stakes }, 'walk');
    expect(d.quiet.find((q) => q.text === PRAISE)?.why).not.toBe('proven');
    const small = new Map([[PRAISE, costStakes(40)!]]);
    const d2 = decide(quiet, student(layers), { ...bundle, facts: [PRAISE], stakes: small }, 'walk');
    expect(d2.quiet.find((q) => q.text === PRAISE)?.why).toBe('proven');
    expect(GREEN_QUIET_BELOW).toBeGreaterThan(1000);
  });

  it('a ply whose every fact is a description in a proven layer closes as "proven"', () => {
    const allGreen = { safety: 'green', principle: 'green', plan: 'green' } as const;
    const d = decide(quiet, student(allGreen), { ...bundle, facts: [PRAISE] }, 'walk');
    expect(d.speak).toBe(false);
    expect(d.reason).toBe('proven');
  });
});
