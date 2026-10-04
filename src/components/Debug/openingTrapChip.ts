import { motifThemeLabels } from '../../services/tacticClassifierService';

// ─── Puzzle-type chip palette ────────────────────────────────────────────────
//
// The chip names the MOTIF in the app's one tag vocabulary
// (`motifThemeLabels`). It used to print grading tags raw — a "CRUSHING"
// badge is a Lichess eval bucket, not something the student can look for on
// the board (hand walk 2026-10-04, D12). A puzzle with no motif tag gets NO
// chip rather than a raw or generic one.

interface ChipStyle { bg: string; border: string; text: string }

const CHIP_STYLE: Array<{ match: (tag: string) => boolean; style: ChipStyle }> = [
  { match: (t) => /^mateIn\d$/.test(t) || /Mate$/.test(t), style: { bg: 'bg-red-500/15', border: 'border-red-500/40', text: 'text-red-400' } },
  { match: (t) => t === 'fork', style: { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', text: 'text-cyan-400' } },
  { match: (t) => t === 'pin' || t === 'skewer', style: { bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-400' } },
  { match: (t) => t === 'hangingPiece', style: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-400' } },
  { match: (t) => t === 'attackingF2F7', style: { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-400' } },
  { match: (t) => t === 'deflection' || t === 'attraction', style: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-400' } },
];

const FALLBACK_CHIP: ChipStyle = { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400' };

/** The chip for a puzzle: its first styled motif, else its first labelled
 *  motif, else null (no chip). Never a raw DB tag. */
export function chipFor(themes: string[]): ({ label: string } & ChipStyle) | null {
  for (const s of CHIP_STYLE) {
    const tag = themes.find(s.match);
    if (!tag) continue;
    const label = motifThemeLabels([tag])[0];
    if (label) return { label, ...s.style };
  }
  const first = motifThemeLabels(themes)[0];
  return first ? { label: first, ...FALLBACK_CHIP } : null;
}
