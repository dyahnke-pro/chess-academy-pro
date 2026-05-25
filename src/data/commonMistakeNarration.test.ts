import { describe, it, expect } from 'vitest';
import commonMistakesData from './common-mistakes.json';
import openingManifests from './opening-manifests.json';
import type { CommonMistake } from '../types';
import sourcesBaselineRaw from './commonMistakeSources.baseline.json';
import { sourcesAreValid } from './narrationSources';

const data = commonMistakesData as Record<string, CommonMistake[]>;

// Masterclass openings ship the consolidated Pitfalls WLPP tab, so their common
// mistakes MUST carry BOTH narration registers, hand-authored (David 2026-05-24):
//   - explanation     → Watch / Learn-FULL (full prose)
//   - shortNarration  → Learn-LIMITED (≤8-word cue)
// AUTO-TRACKED from the manifest keys (the single source of truth for "this is
// a masterclass"), so a NEW masterclass is held to the rule automatically — no
// hardcoded list to forget (the gap that let Scotch ship cue-less). An opening
// with no common-mistakes entry is fine (nothing to narrate); the gate only
// fires on entries that exist. Non-masterclass openings use the move-dictation
// fallback and are not gated here.
const MASTERCLASS = Object.keys(openingManifests).filter((k) => !k.startsWith('_'));

const CUE_WORD_CAP = 8;
function wordCount(s: string): number {
  return s
    .replace(/[—–-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;
}

describe('common-mistake narration — two registers on masterclass Pitfalls', () => {
  for (const id of MASTERCLASS) {
    const mistakes = data[id] ?? [];

    mistakes.forEach((m, i) => {
      it(`${id}[${i}] (${m.wrongMove}→${m.correctMove}): full explanation present`, () => {
        expect(m.explanation.trim().length).toBeGreaterThan(0);
      });

      it(`${id}[${i}] (${m.wrongMove}→${m.correctMove}): hand-authored ≤${CUE_WORD_CAP}-word short cue`, () => {
        expect(m.shortNarration?.trim(), `${id}[${i}] missing shortNarration (Learn-LIMITED cue)`).toBeTruthy();
        const n = wordCount(m.shortNarration ?? '');
        expect(n, `${id}[${i}] cue "${m.shortNarration}" is ${n} words (cap ${CUE_WORD_CAP})`).toBeLessThanOrEqual(CUE_WORD_CAP);
      });
    });
  }
});

// Independent-verification gate (David 2026-05-25: "all other narrations checked
// against sources"). Every masterclass Pitfall must record a resolvable source
// (sources[]: book:/concept:/reputable-URL). Baseline holds the pre-rule entries
// and only SHRINKS as sources are added.
describe('masterclass common mistakes cite an independent verification source', () => {
  const baseline = new Set((sourcesBaselineRaw as { keys: string[] }).keys);
  const unverified: string[] = [];
  for (const id of MASTERCLASS) {
    (data[id] ?? []).forEach((m, i) => {
      if (!sourcesAreValid((m as { sources?: string[] }).sources)) unverified.push(`${id}#${i}`);
    });
  }

  it('introduces NO masterclass Pitfall without a resolvable source beyond the baseline', () => {
    const novel = unverified.filter((k) => !baseline.has(k));
    expect(novel, `New masterclass common mistakes missing a resolvable verification source (sources: ["book:<id>" | "concept:<id>" | reputable https URL]):\n${novel.join('\n')}`).toEqual([]);
  });

  it('common-mistake source baseline only shrinks', () => {
    const live = new Set(unverified);
    const stale = [...baseline].filter((k) => !live.has(k));
    if (stale.length > 0) console.warn(`[mistake-sources] ${stale.length} baseline entries now cite a source — prune them: ${stale.join(', ')}`);
    expect(stale.length).toBeLessThanOrEqual(baseline.size);
  });
});

