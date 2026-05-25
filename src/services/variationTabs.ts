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
  // The MAIN-line tab already teaches the full Classical system, so the
  // "Classical Variation" tab is a duplicate — omit it (David 2026-05-23:
  // "main line and classical system are identical, remove one, keep the total
  // classical system"). "Short" has no distinct masterclass lesson (it's an
  // Advance sub-line), so it's omitted too — no weak/empty tabs (playbook).
  // The six below are exactly the Caro variations with authored lessons.
  'caro-kann': [
    { test: /advance/i, label: 'Advance' },
    { test: /exchange/i, label: 'Exchange' },
    { test: /two knights/i, label: 'Two Knights' },
    { test: /panov/i, label: 'Panov' },
    { test: /fantasy/i, label: 'Fantasy' },
    { test: /tartakower|breyer/i, label: 'Tartakower' },
  ],
  // Scotch Game — hand-picked tabs, frequency-ordered (repertoire weights).
  // Main-line pill = the Classical 4…Bc5 Be3 Qf6 line (the repertoire pgn), so
  // the "Classical" variation is omitted as a tab (it'd duplicate the pill).
  'scotch-game': [
    { test: /mieses/i, label: 'Mieses' },
    { test: /scotch gambit/i, label: 'Scotch Gambit' },
    { test: /four knights/i, label: 'Four Knights' },
    { test: /nb3|kasparov/i, label: 'Kasparov Nb3' },
    { test: /steinitz|qh4/i, label: 'Steinitz' },
  ],
  // Sicilian Dragon — Black-oriented masterclass. Main-line pill = the
  // Yugoslav Attack main line (the showcase), so it's exempt from this tab
  // list. The Dragadorf is DEFERRED (its sound move order needs deeper theory
  // than the local masters-db carries — no unsound tab). Order: the Yugoslav
  // sub-systems first, then the quieter White tries.
  'sicilian-dragon': [
    { test: /soltis/i, label: 'Soltis' },
    { test: /chinese/i, label: 'Chinese Dragon' },
    { test: /^classical/i, label: 'Classical' },
    { test: /levenfish/i, label: 'Levenfish' },
    { test: /accelerated/i, label: 'Accelerated' },
    { test: /bg5|anti-dragon/i, label: 'Anti-Dragon Bg5' },
  ],
  // Italian Game — hand-picked tabs, ordered by reasoned amateur prevalence
  // (the explorer freq query was unavailable when this was built; ordering is
  // flagged for prod verification). The Giuoco Piano main line is the "Main
  // line" pill (showcase), exempt from this list. Two "Modern …" names exist
  // (the d3 system + the Moller Attack), so the d3 regex is specific.
  'italian-game': [
    { test: /modern d3/i, label: 'Modern' },
    { test: /two knights/i, label: 'Two Knights' },
    { test: /evans/i, label: 'Evans Gambit' },
    { test: /moller/i, label: 'Møller' },
  ],
  // French Defence — all 10 validated variations (David 2026-05-25: "add all
  // validated variation"). Frequency-ordered from the amateur explorer
  // (1600-2000): White's 3rd-move choices Exchange 32% / Advance 30% /
  // Tarrasch 10% lead; then the 3.Nc3 family by its fork share (Rubinstein 27%
  // / Winawer 21%); then the 4.Bg5 lines (Classical / Burn / McCutcheon); then
  // the sub-line weapons (Milner-Barry under Advance, Fort Knox under Nd2). The
  // repertoire main pgn is the Steinitz (3.Nc3 Nf6 4.e5) = the "Main line" pill.
  // Specific regexes so "Advance" doesn't swallow "Advance: Milner-Barry".
  'french-defence': [
    { test: /^exchange/i, label: 'Exchange' },
    { test: /^advance variation$/i, label: 'Advance' },
    { test: /tarrasch/i, label: 'Tarrasch' },
    { test: /rubinstein/i, label: 'Rubinstein' },
    { test: /winawer/i, label: 'Winawer' },
    { test: /classical/i, label: 'Classical' },
    { test: /burn/i, label: 'Burn' },
    { test: /mccutcheon/i, label: 'McCutcheon' },
    { test: /milner-barry/i, label: 'Milner-Barry' },
    { test: /fort knox/i, label: 'Fort Knox' },
  ],
  // King's Gambit — all 8 repertoire variations earn a tab (David 2026-05-25:
  // "add all validated variations"; every line DB-anchors ≥6 plies). Ordered
  // by amateur frequency of the defining branch (Classical …g5 17%, Fischer
  // …d6 16%, then the declines and the sharp gambits). The Main-line pill is
  // the KGA Modern (3…d5) repertoire pgn — exempt from this list.
  'kings-gambit': [
    { test: /knight gambit classical/i, label: 'Classical' },
    { test: /fischer/i, label: 'Fischer' },
    { test: /falkbeer/i, label: 'Falkbeer' },
    { test: /declined/i, label: 'Declined' },
    { test: /bishop/i, label: "Bishop's" },
    { test: /kieseritzky/i, label: 'Kieseritzky' },
    { test: /muzio/i, label: 'Muzio' },
    { test: /allgaier/i, label: 'Allgaier' },
  ],
  // Scandinavian Defence — distinct validated variations (David 2026-05-25:
  // "add all validated variations", complete builds only — each tab has a real
  // Black-win model game). The repertoire main pgn is the Qa5 …Bb4 line = the
  // "Main line" pill; "Qa5 with Bd2 Main Line" folds into it (same Qa5 system),
  // so its regex is excluded. Ordered by amateur prevalence of the 3rd move.
  'scandinavian-defence': [
    { test: /qa5 main line/i, label: 'Qa5 Solid' },
    { test: /tiviakov/i, label: 'Tiviakov' },
    { test: /nf6 modern/i, label: 'Modern' },
    { test: /portuguese/i, label: 'Portuguese' },
    { test: /icelandic/i, label: 'Icelandic' },
    { test: /gubinsky/i, label: 'Gubinsky-Melts' },
  ],
  // Alekhine's Defence — distinct validated variations (complete builds only;
  // each tab has a real Black-win model game). Main pill = the Modern (repertoire
  // pgn), so "Modern Variation" folds in; "Two Pawns Attack" transposes to the
  // Exchange, so it folds into Exchange. Five distinct tabs remain.
  'alekhine-defence': [
    { test: /four pawns/i, label: 'Four Pawns' },
    { test: /^exchange/i, label: 'Exchange' },
    { test: /chase/i, label: 'Chase' },
    { test: /scandinavian transposition/i, label: 'Scandinavian' },
    { test: /voronezh/i, label: 'Voronezh' },
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
