import { describe, it, expect } from 'vitest';
import {
  MOTIFS, MOTIF_OF_TACTIC, MOTIF_TAGS, MOTIF_LEVELS, motifsAt, motifOfTag, parentSkillTag, yoursTagForTactic,
  type MotifId,
} from './tacticMotifs';
import { isMisconceptionTagId } from './misconceptionTags';
import { METER_OF_TAG } from '../services/skillMeters';
import { listedOnTab } from '../services/heatMap';
import { skillDifficulty } from '../services/skillMetersLoader';
import { NEVER_POSED } from '../services/holdRate';

describe('the master motif list (WO-MOTIFS-01)', () => {
  it('every motif names two real tags (their side may be an honest null), each owned by one motif', () => {
    const owner = new Map<string, MotifId>();
    for (const m of Object.values(MOTIFS)) {
      expect(isMisconceptionTagId(m.yours), m.yours).toBe(true);
      if (m.theirs) expect(isMisconceptionTagId(m.theirs), m.theirs).toBe(true);
      expect(m.yours).not.toBe(m.theirs);
      for (const t of [m.yours, m.theirs]) {
        if (!t) continue;
        expect(owner.get(t), `${t} owned twice`).toBeUndefined();
        owner.set(t, m.id);
        expect(motifOfTag(t)).toBe(m.id);
      }
    }
  });

  it('the catch-all is never a motif row — a shot the classifier cannot name stays "a shot"', () => {
    expect(MOTIF_TAGS.has('missed-tactic')).toBe(false);
    expect(yoursTagForTactic('tactical_sequence')).toBe('missed-tactic');
  });

  it('the readers M3 added have their own rows (2026-10-22)', () => {
    expect(yoursTagForTactic('x_ray')).toBe('missed-your-x-ray');
    expect(yoursTagForTactic('discovered_check')).toBe('missed-your-discovered-check');
    expect(yoursTagForTactic('discovered_attack')).toBe('missed-your-discovery');
  });

  it('the classifier names land on their own rows (one name → one row)', () => {
    expect(yoursTagForTactic('fork')).toBe('missed-your-fork');
    expect(yoursTagForTactic('hanging_piece')).toBe('missed-your-free-piece');
    expect(yoursTagForTactic('back_rank')).toBe('missed-your-mate');
    expect(yoursTagForTactic('checkmate')).toBe('missed-your-mate');
    expect(yoursTagForTactic('removing_the_guard')).toBe('missed-your-guard-removal');
    for (const [t, m] of Object.entries(MOTIF_OF_TACTIC)) if (m) expect(MOTIFS[m].id, t).toBe(m);
  });

  it('every level has motifs, and the beginner level holds the first three every course teaches', () => {
    for (const l of MOTIF_LEVELS) expect(motifsAt(l).length, l).toBeGreaterThan(0);
    const beginner = motifsAt('beginner').map((m) => m.id);
    expect(beginner).toEqual(expect.arrayContaining(['fork', 'pin', 'skewer']));
  });

  it('every motif tag sits on a meter: their side Threats, your side Tactics', () => {
    for (const m of Object.values(MOTIFS)) {
      expect(METER_OF_TAG[m.yours as keyof typeof METER_OF_TAG]).toBe('tactics');
      if (m.theirs && m.theirs !== 'hung-material') expect(METER_OF_TAG[m.theirs as keyof typeof METER_OF_TAG]).toBe('threats');
    }
  });
});

describe('a motif tag with no population row borrows its parent', () => {
  it('maps your side to the catch-all and their side to the threat it refines', () => {
    expect(parentSkillTag('missed-your-fork')).toBe('missed-tactic');
    expect(parentSkillTag('missed-their-fork')).toBe('missed-opponents-threat');
    expect(parentSkillTag('neglected-development')).toBeNull();
  });

  it('their fork moves the Threats meter (it had no difficulty, so its weight was 0)', () => {
    const own = skillDifficulty('missed-their-fork');
    expect(own).not.toBeNull();
    expect(own).toEqual(skillDifficulty('missed-opponents-threat'));
    expect(skillDifficulty('missed-your-clearance')).toEqual(skillDifficulty('missed-tactic'));
  });
});

describe('the Weaknesses tab lists a motif row once the board has posed it', () => {
  const tile = (tag: string, posed: number, openCount: number) => ({ tag: tag as never, hold: { ...NEVER_POSED, posed }, openCount });
  it('hides a motif never posed, shows it once posed or once a slip is open', () => {
    expect(listedOnTab(tile('missed-your-interference', 0, 0))).toBe(false);
    expect(listedOnTab(tile('missed-your-interference', 1, 0))).toBe(true);
    expect(listedOnTab(tile('missed-your-fork', 0, 1))).toBe(true);
  });
  it('a skill that is not a motif row is always listed (grey teaches)', () => {
    expect(listedOnTab(tile('neglected-development', 0, 0))).toBe(true);
  });
});
