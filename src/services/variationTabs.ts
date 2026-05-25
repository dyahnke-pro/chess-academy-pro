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
  // King's Indian Attack — the universal d3/Nd2/g3/Bg2/e4 system. Main-line
  // pill = the vs-French treatment (the e5-wedge + Nf1-h2-g4 kingside storm,
  // the KIA archetype, exempt). The one DB-anchored distinct tab is the ...g6
  // KID-style response, where White pivots to the centre and queenside.
  'kings-indian-attack': [
    { test: /kid-style/i, label: 'KID-style' },
  ],
  // Evans Gambit — the romantic 4.b4 attacking gambit. Main-line pill = the
  // Accepted main (...Bxb4 c3 Ba5 d4, the f7 attack, exempt). Three DB-anchored
  // distinct tabs: Declined (...Bb6), the wild Compromised Defence (...dxc3),
  // and Lasker's solid antidote (...Be7).
  'evans-gambit': [
    { test: /declined/i, label: 'Declined' },
    { test: /compromised/i, label: 'Compromised' },
    { test: /lasker/i, label: 'Lasker' },
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
  // Sicilian Najdorf — Black-oriented. Main-line pill = the English Attack
  // (6.Be3) main line, so it's exempt from this tab list. The rest are the
  // White 6th-move branches a Najdorf player must know.
  'sicilian-najdorf': [
    { test: /classical/i, label: 'Classical' },
    { test: /6\.bg5 main/i, label: '6.Bg5' },
    { test: /poisoned/i, label: 'Poisoned Pawn' },
    { test: /6\.f3/i, label: '6.f3' },
    { test: /fischer/i, label: 'Fischer-Sozin' },
    { test: /adams|6\.g3/i, label: '6.g3' },
    { test: /ng4/i, label: 'Ng4' },
    { test: /anti-najdorf|6\.a4/i, label: '6.a4' },
  ],
  // Sicilian Sveshnikov — Black-oriented. Main-line pill = the 9.Nd5 (c3)
  // main line. Only the structurally DISTINCT branches get tabs (playbook
  // §0.5c): 11.c4 folds into Chelyabinsk, Novosibirsk/…Rb8 fold into the main
  // line + its plans (all share the same 20-ply prefix — no near-dup tabs).
  'sicilian-sveshnikov': [
    { test: /9\.bxf6|early exchange/i, label: '9.Bxf6' },
    { test: /chelyabinsk/i, label: 'Chelyabinsk c4' },
    { test: /anti-sveshnikov|6\.nf3/i, label: 'Anti-Svesh 6.Nf3' },
    { test: /kalashnikov/i, label: 'Kalashnikov' },
  ],
  // Sicilian Alapin — Black-oriented (the student meets White's 2.c3).
  // Main-line pill = the 2...Nf6 mainline. Only 2...d5 is a distinct, canonical
  // DB-anchored second mainline; 2...e6 (French structure) and 2...g6 are not in
  // the canonical DB in the 2.c3 order, so they are deferred (G3), not shipped.
  'sicilian-alapin': [
    { test: /central counter/i, label: '2...d5' },
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
  // Petrov (Russian) Defence — Black's symmetric equaliser. Main-line pill =
  // the Classical 3.Nxe5 symmetric main (…Nc6/…Bf5, White's doubled c-pawns).
  // Tabs = the structurally-distinct tries Black faces, by reasoned amateur
  // prevalence: White's modern 3.d4 Steinitz, the dxc3 bishop-pair complex
  // (covers the Kaufmann sub-line), the 3.Nc3 Three Knights, the …Bd6 5.Bd3
  // setup. (The "Classical Variation" repertoire entry IS the main pill, so no
  // duplicate tab; the Cochrane Nxf7 sac is a sideline, not a structural tab.)
  'petrov-defence': [
    { test: /steinitz/i, label: 'Steinitz 3.d4' },
    { test: /^italian/i, label: 'dxc3 Lines' },
    { test: /three knights/i, label: 'Three Knights' },
    { test: /5\.bd3|bd3 line/i, label: '5.Bd3' },
  ],
  // Philidor Defence — Black's solid …d6 system. Main-line pill = the Improved
  // Hanham (…Nbd7/…c6/…d5 break, repertoire pgn). Tabs = the structurally-
  // distinct tries Black faces: the open Exchange, the Petrov-like Antoshin
  // (dxe5 Nxe4), the Qe2/Nf5 Nimzowitsch, the sharp …f5 Counter-Gambit, and
  // and the sharp …f5 Counter-Gambit. (The Hanham and Lion repertoire entries
  // share the main pill's solid Hanham structure, so they fold into it. The
  // "Modern d3 Hybrid" is dropped — its 3.d3 spine anchors only 4 plies in
  // openings-lichess.json, so per G3 it is not taught as a tab.)
  'philidor-defence': [
    { test: /^exchange/i, label: 'Exchange' },
    { test: /antoshin/i, label: 'Antoshin' },
    { test: /nimzowitsch/i, label: 'Nimzowitsch' },
    { test: /counter-gambit|counter gambit/i, label: 'Counter-Gambit' },
  ],
  // Queen's Gambit Declined — the classical 1.d4 d5 defence. Main-line pill =
  // the Orthodox / Capablanca freeing system (…dxc4/…Nd5/…e5, repertoire pgn).
  // Tabs = the structurally-distinct mainstream lines: the modern Tartakower
  // (…b6 hanging pawns), the Lasker (…Ne4 simplification), the Exchange
  // (Carlsbad minority attack), and the engine-era Bf4 lines. (Ragozin and
  // Cambridge Springs anchor <20 plies in the curated repertoire pgn, so per
  // the depth gate they fold in rather than getting thin tabs.)
  'qgd': [
    { test: /tartakower/i, label: 'Tartakower' },
    { test: /lasker/i, label: 'Lasker' },
    { test: /^exchange/i, label: 'Exchange' },
    { test: /bf4/i, label: 'Bf4 Lines' },
  ],
  // Queen's Gambit Accepted — Black takes c4, then develops freely. Main-line
  // pill = the calm Classical tabiya (…c5/…b5/…Bb7, repertoire pgn). Tabs = the
  // distinct mainstream tries: the flexible Smyslov 3…a6, the Sadler …Bg4
  // (bishop out before …e6), and the Janowski dxc5 lines. (The Central 3.e4
  // and Alekhine 4.Nc3 repertoire lines anchor <20 plies in the curated pgn,
  // so per the depth gate they fold in rather than getting thin tabs.)
  'qga': [
    { test: /smyslov/i, label: 'Smyslov' },
    { test: /sadler/i, label: 'Sadler' },
    { test: /janowski/i, label: 'Janowski' },
  ],
  // Slav Defence — the …c6 solid system. Main-line pill = the classical a4 …Bf5
  // main (good bishop out before …e6, repertoire pgn). Tabs = the two lines
  // whose curated pgn reaches the ≥20-ply depth gate AND are structurally
  // distinct: the sharp Geller Gambit (5.e4) and the Schlechter fianchetto.
  // (Exchange/Quiet/Chebanenko anchor <20 plies in the curated pgn / the DB,
  // so per G3 + the depth gate they fold into the main pill — not invented.)
  'slav-defence': [
    { test: /geller/i, label: 'Geller Gambit' },
    { test: /schlechter/i, label: 'Schlechter' },
  ],
  // Semi-Slav — the …c6/…e6 wall, solid and sharp. Main-line pill = the sharp
  // Anti-Moscow (…dxc4/…g5/…b5, repertoire pgn). Tabs = the structurally-
  // distinct mainstream battlegrounds, all ≥20-ply: the positional Meran, the
  // famous Botvinnik gambit, the calm Moscow (Bxf6 → bishop pair), and the
  // Stoltz Qc2 anti-Meran. (Anti-Meran/Reynolds/Romih fold into the Meran
  // e3-complex; no near-duplicate tabs.)
  'semi-slav': [
    { test: /meran/i, label: 'Meran' },
    { test: /botvinnik/i, label: 'Botvinnik' },
    { test: /moscow/i, label: 'Moscow' },
    { test: /stoltz/i, label: 'Stoltz' },
  ],
  // King's Indian Defence — the great hypermodern fighting defence. Main-line
  // pill = the Classical Mar del Plata (…f5/…f4/…g5 kingside storm, repertoire
  // pgn). Tabs = the structurally-distinct ≥20-ply White systems: the Bayonet
  // (9.b4 queenside race), the Four Pawns (max-centre over-extension), and the
  // positional Fianchetto. (Sämisch/Petrosian/Averbakh deferred pending engine-
  // soundness verification of their sharp curated lines; Makogonov <20p folds in.)
  'kings-indian-defence': [
    { test: /bayonet/i, label: 'Bayonet' },
    { test: /four pawns/i, label: 'Four Pawns' },
    { test: /fianchetto/i, label: 'Fianchetto' },
  ],
  // Grünfeld Defence — the boldest hypermodern counter, …d5 vs the centre. Main-
  // line pill = the Exchange main (e4/d4 vs …Bg7/…c5/…Nc6 on the IQP, repertoire
  // pgn). Tabs = the distinct ≥20-ply White systems: the Russian System (Qb3,
  // no doubled pawns), the Classical Bc4 (with the Bxf7+ try), and the modern
  // Rb1 Exchange. (Fianchetto/Neo-Grünfeld <20p; Taimanov folds into Bc4.)
  'grunfeld-defence': [
    { test: /russian/i, label: 'Russian System' },
    { test: /bc4/i, label: 'Classical Bc4' },
    { test: /rb1/i, label: 'Modern Rb1' },
  ],
  // Benoni Defence — the unbalanced fighting defence. Main-line pill = the
  // Modern Main (…c5/…d6/…g6/…Bg7, …b5 queenside race, repertoire pgn). Tabs =
  // the distinct ≥20-ply White systems: the solid Fianchetto, the aggressive
  // Taimanov (f4/Bb5+), and the Four Pawns Attack. (Classical Bf4/Czech/Snake
  // anchor <20p in the curated pgn, so they fold into the main.)
  'benoni-defence': [
    { test: /fianchetto/i, label: 'Fianchetto' },
    { test: /taimanov/i, label: 'Taimanov' },
    { test: /four pawns/i, label: 'Four Pawns' },
  ],
  // Queen's Indian Defence — the soundest Indian, a fight for the e4-square.
  // Main-line pill = the g3 Fianchetto with …Ne4/…f5 (repertoire pgn). Tabs =
  // the distinct ≥20-ply systems: the a3 Petrosian (…d5 central strike; the
  // Kasparov Nc3/a3 line shares its structure and folds in), the …Bb4+
  // simplification, and the modern Miles …Ba6.
  'queens-indian': [
    { test: /petrosian/i, label: 'Petrosian a3' },
    { test: /nimzowitsch/i, label: '…Bb4+' },
    { test: /miles/i, label: 'Miles …Ba6' },
  ],
  // Old Indian Defence — the restrained …d6/…e5 cousin of the KID (bishop on e7,
  // no …g6). Main-line pill = the classical …Nc5-outpost manoeuvring main
  // (repertoire pgn). Tabs = the two ≥20-ply White setups: the Czech (…c6/…c5
  // closed centre) and the Be2/Qc2 development. (Janowski/Tartakower/Ukrainian/
  // Seirawan/Main-d5 anchor <20p in the curated pgn, so they fold into the main.)
  'old-indian-defence': [
    { test: /czech/i, label: 'Czech' },
    { test: /be2/i, label: 'Be2 System' },
  ],
  // Two Knights Defence — Black's combative …Nf6 answer to the Italian. Main-
  // line pill = the quiet 4.d3 Ruy-style manoeuvring main (repertoire pgn).
  // Tabs = the distinct ≥20-ply battlegrounds: the 4.d4 Italian, the …Na5
  // antidote to the Fried Liver (4.Ng5), and the wild Max Lange Attack.
  // (Ulvestad/Polerio/Traxler are sharp sidelines deferred pending soundness
  // verification; the <20p 4.d3 …Be7 line folds into the main.)
  'two-knights-defence': [
    { test: /italian two knights d4/i, label: '4.d4 Italian' },
    { test: /fried liver/i, label: 'Fried Liver' },
    { test: /max lange/i, label: 'Max Lange' },
  ],
  // Budapest Gambit — Black's surprise 2…e5 gambit. Main-line pill = the Bf4
  // main (…Ng4/…Bb4+/…Ngxe5 recoup, repertoire pgn). Tabs = the two distinct
  // approaches: the Adler (3.Nf3 / …Bc5) and the wild Fajarowicz (3…Ne4). These
  // are short gambit lines that resolve before the middlegame, authored as
  // `kind: 'roadmap'` (sanctioned depth opt-out).
  'budapest-gambit': [
    { test: /adler/i, label: 'Adler' },
    { test: /fajarowicz/i, label: 'Fajarowicz' },
  ],
  // Benko Gambit — distinct validated variations (complete builds only). Main
  // pill = the Fully Accepted g3 line (repertoire pgn); the Fianchetto, King
  // Walk, Fully-Accepted-Main and "Modern f3" entries all fold into it (same
  // Fully-Accepted complex). Three distinct White approaches remain.
  'benko-gambit': [
    { test: /declined/i, label: 'Declined' },
    { test: /zaitsev/i, label: 'Zaitsev' },
    { test: /half-accepted/i, label: 'Half-Accepted' },
  ],
  // Dutch Defence — distinct validated variations (complete builds only). Main
  // pill = the Leningrad g6 main line (repertoire pgn); "Leningrad g6 Main Line"
  // folds in, and the "Hopton" transposes to the …e5 break. Five distinct tabs.
  'dutch-defence': [
    { test: /stonewall/i, label: 'Stonewall' },
    { test: /classical/i, label: 'Classical' },
    { test: /ilyin/i, label: 'Ilyin-Zhenevsky' },
    { test: /e5 break/i, label: 'Leningrad …e5' },
  ],
  // Nimzo-Indian — Black. Main pill = the Classical 4.Qc2 (repertoire pgn), so
  // the "Classical Variation (4.Qc2)" folds in. The 7 distinct White 4th-move
  // systems each earn a tab; each has a real Black-win model game.
  'nimzo-indian': [
    { test: /rubinstein/i, label: 'Rubinstein' },
    { test: /huebner|hübner/i, label: 'Hübner' },
    { test: /leningrad/i, label: 'Leningrad' },
    { test: /kasparov/i, label: 'Kasparov' },
    { test: /saemisch|sämisch/i, label: 'Sämisch' },
    { test: /aggressive center/i, label: '4.f3' },
    { test: /fischer/i, label: 'Fischer' },
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
