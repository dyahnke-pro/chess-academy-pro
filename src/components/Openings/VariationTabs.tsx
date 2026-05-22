import type { OpeningVariation } from '../../types';

export interface VariationTab {
  /** Index into opening.variations. */
  index: number;
  /** Short tab label. */
  label: string;
}

interface VariationTabsProps {
  tabs: VariationTab[];
  /** Selected variation index, or -1 for the main line. */
  selectedIndex: number;
  onSelect: (index: number) => void;
}

// Per-opening curated tab sets (matched by name substring → short
// label, in display order). The Ruy shows its 7 first-class variations.
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
};

/** Short tab label from a variation name: the parenthetical if present
 *  ("Closed Ruy Lopez (Breyer)" → "Breyer"), else the full name. Do NOT
 *  string-truncate here: the returned label is used as BOTH the visible
 *  tab text AND the canonical routing key flowing into the URL `?line=`
 *  param + the per-tab plan lookup (PIRC_TAB_PLAN_IDS etc.). Truncating
 *  with an ellipsis character (…) silently broke lookups for every long
 *  variation name (e.g. "Austrian Attack with e5 c5" → "Austrian Attack w…"
 *  no longer matched its routing key, leaving tab 7 on /openings/pirc-defence
 *  with 0 plan cards). Visual overflow is the tab strip's job (CSS scroll
 *  in the parent container), not this helper. */
function shortLabel(name: string): string {
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

/**
 * Gold-glow variation tab bar. Selected tab gets the full gold-glow
 * highlight; the rest carry a gold glow on their left + bottom edges
 * (David's spec). A leading "Main line" pill returns to the showcase
 * (the main line is the template, not one of the 7 variation tabs).
 */
export function VariationTabs({ tabs, selectedIndex, onSelect }: VariationTabsProps): React.ReactNode {
  if (tabs.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1" role="tablist" data-testid="variation-tabs">
      <button
        type="button"
        role="tab"
        aria-selected={selectedIndex === -1}
        onClick={() => onSelect(-1)}
        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
          selectedIndex === -1
            ? 'bg-amber-500/20 text-amber-200 border-2 border-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,0.55),0_0_22px_rgba(251,191,36,0.3)]'
            : 'bg-theme-surface border border-theme-border text-theme-text-muted hover:text-amber-300'
        }`}
        data-testid="variation-tab-main"
      >
        Main line
      </button>
      {tabs.map((tab) => {
        const selected = tab.index === selectedIndex;
        return (
          <button
            key={tab.index}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab.index)}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selected
                ? 'bg-amber-500/20 text-amber-100 border-2 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.6),0_0_26px_rgba(251,191,36,0.35)]'
                : 'bg-theme-surface text-theme-text-muted border border-theme-border hover:text-amber-300 shadow-[-3px_3px_8px_rgba(251,191,36,0.28)]'
            }`}
            data-testid={`variation-tab-${tab.index}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
