// Pure variation-tab helpers, extracted from components/Openings/VariationTabs
// so non-component code (the coach line picker in openingDetectionService) can
// build the SAME variation list the opening detail tab shows — keeping every
// picker in lockstep with the opening tab (David 2026-05-22).

import type { OpeningVariation } from '../types';

export interface VariationTab {
  /** Index into opening.variations. */
  index: number;
  /** Short tab label. */
  label: string;
}

// Per-opening curated tab sets (matched by name substring → short label, in
// display order). The Ruy shows its 7 first-class variations; the Vienna its
// 4 (amateur-frequency order, playbook §1); everything else shows all of its
// variations.
const CURATED: Record<string, { test: RegExp; label: string }[]> = {
  'ruy-lopez': [
    { test: /berlin/i, label: 'Berlin' },
    { test: /open/i, label: 'Open' },
    { test: /marshall attack/i, label: 'Marshall' },
    { test: /exchange/i, label: 'Exchange' },
    { test: /breyer/i, label: 'Breyer' },
    { test: /chigorin/i, label: 'Chigorin' },
    { test: /zaitsev/i, label: 'Zaitsev' },
  ],
  'vienna-game': [
    { test: /^vienna gambit$/i, label: 'Gambit' },
    { test: /vienna vs 2/i, label: 'vs 2…Nc6' },
    { test: /frankenstein|falkbeer/i, label: 'Frankenstein-Dracula' },
    { test: /paulsen/i, label: 'Paulsen' },
  ],
};

/** Short tab label from a variation name: the parenthetical if present
 *  ("Closed Ruy Lopez (Breyer)" → "Breyer"), else the trimmed name. */
export function shortLabel(name: string): string {
  const paren = /\(([^)]+)\)/.exec(name);
  if (paren) return paren[1];
  return name;
}

/** Build the variation tabs for an opening. Curated openings (Ruy) show
 *  their first-class set; every other opening shows ALL its variations,
 *  so removing the old bottom Variations zone never strands them.
 *  Indices point into opening.variations so index-keyed handlers work. */
export function buildVariationTabs(
  openingId: string,
  variations: OpeningVariation[] | null | undefined,
): VariationTab[] {
  if (!variations || variations.length === 0) return [];
  const curated = CURATED[openingId];
  if (curated) {
    const tabs: VariationTab[] = [];
    for (const m of curated) {
      const index = variations.findIndex((v) => m.test.test(v.name));
      if (index >= 0) tabs.push({ index, label: m.label });
    }
    if (tabs.length > 0) return tabs;
  }
  return variations.map((v, index) => ({ index, label: shortLabel(v.name) }));
}
