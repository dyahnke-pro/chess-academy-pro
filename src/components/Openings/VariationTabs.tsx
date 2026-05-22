import { buildVariationTabs, type VariationTab } from '../../services/variationTabs';

export { buildVariationTabs, type VariationTab };

interface VariationTabsProps {
  tabs: VariationTab[];
  /** Selected variation index, or -1 for the main line. */
  selectedIndex: number;
  onSelect: (index: number) => void;
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
