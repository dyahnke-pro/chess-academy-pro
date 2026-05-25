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
  // Four Knights Game — quiet, classical White opening. Main-line pill = the
  // Spanish Four Knights / Metger (the showcase, exempt from this list). Tabs
  // ordered by reasoned amateur prevalence: the open Scotch Four Knights and
  // the tricky Italian fork-trick are most-met, then Glek's modern fianchetto,
  // then Black's ambitious Rubinstein counter.
  'four-knights-game': [
    { test: /scotch four knights/i, label: 'Scotch Four Knights' },
    { test: /italian four knights/i, label: 'Italian Four Knights' },
    { test: /glek/i, label: 'Glek System' },
    { test: /rubinstein/i, label: 'Rubinstein' },
  ],
  // London System — quiet, system-based White opening (Carlsen's workhorse).
  // Main-line pill = the London vs ...d5 / ...Qb6 poisoned-pawn line (the
  // showcase, exempt). Tabs are the two DB-anchored, distinct structures with
  // student-winning master games: the fianchetto and the sharp Jobava. (The
  // ...c5-Benoni and ...Bf5-mirror lines lack a ≥6-ply line in
  // openings-lichess.json, so per G3 they are not taught as tabs.)
  'london-system': [
    { test: /king's indian|kings indian/i, label: 'vs KID' },
    { test: /jobava/i, label: 'Jobava' },
  ],
  // Catalan Opening — White's fianchetto bind (Kramnik/Carlsen/Ding weapon).
  // Main-line pill = the Open Catalan (…dxc4) with the pawn-recovery squeeze
  // (the showcase, exempt). The two DB-anchored, structurally-distinct tabs
  // with student-winning master games: the Closed Catalan and the Slav move-
  // order. (Other repertoire sub-lines fold into the Open main structure.)
  'catalan-opening': [
    { test: /closed catalan/i, label: 'Closed' },
    { test: /vs slav|slav setup/i, label: 'vs Slav' },
  ],
  // English Opening — 1.c4, the flexible flank opening. Main-line pill = the
  // Reversed Sicilian (1.c4 e5) with the queenside reversed-Dragon plan (the
  // showcase, exempt). The two DB-anchored, structurally-distinct tabs with
  // student-winning master games: the Symmetrical (1.c4 c5) and the sharp
  // Mikenas Attack.
  'english-opening': [
    { test: /english: symmetrical/i, label: 'Symmetrical' },
    { test: /mikenas/i, label: 'Mikenas' },
  ],
  // Réti Opening — hypermodern 1.Nf3/c4/g3. Main-line pill = the Nimzo-English
  // Hybrid (the b3/Bb2 double-fianchetto, the quintessential Réti, exempt). The
  // one DB-anchored, NON-duplicate distinct tab is the ...Bf5 Anti-Slav. (The
  // Réti "Advance c4-d4" transposes directly into the Catalan — already built
  // — so per §0.1c it folds there rather than duplicating as a Réti tab.)
  'reti-opening': [
    { test: /anti-slav/i, label: 'Anti-Slav' },
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
