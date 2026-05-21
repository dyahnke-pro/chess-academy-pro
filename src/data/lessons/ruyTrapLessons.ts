import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Ruy trap lessons — show→snap-back walkthroughs (David 2026-05-21).
// WARNINGS: play the trap to the danger, then snap the board BACK to the
// avoiding move (a beat with a shorter move list rewinds the board).
// WEAPONS: show the opponent's slip, then play the punishment to material.
// Every shown move is DB-grounded or chess.js-legal; consequences beyond
// the DB line are NARRATED, never fabricated as forced sequences (G3).

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const RUY = 'e4 e5 Nf3 Nc6 Bb5';
const TARRASCH_BASE = `${RUY} a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6 c3 Be7 Re1`;
const NOAH_BASE = `${RUY} a6 Ba4 b5 Bb3 d6 d4 Nxd4 Nxd4 exd4`;
const MORT_BASE = `${RUY} Nf6 d3 Ne7`;
const FISH_BASE = `${RUY} Nf6 O-O Ng4`;
const MARSH_BASE = `${RUY} a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6 d4 Bd6 Re1 Qh4`;

/** WEAPON — Open Ruy: Black castles too early and drops the e4-knight. */
const TARRASCH: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Weapon: The Tarrasch Trap',
  minutes: 3,
  orientation: 'white',
  beats: [
    b({ id: 'tt1', moves: TARRASCH_BASE,
      say: "The Open Ruy. Black has grabbed e4 and developed — but the e4-knight is loose and your rook is loaded on e1. Castling here would be a mistake; watch what your pieces are aimed at.",
      sayShort: 'Open Ruy — the e4-knight is loose, the e1-rook loaded.',
      highlights: [H('e4', KEY), H('e1', SOFT)] }),
    b({ id: 'tt2', moves: `${TARRASCH_BASE} O-O`,
      say: "Black castles — and walks straight into it. Now the e4-knight has no extra defender and the e-file is primed. The Tarrasch Trap springs.",
      sayShort: 'O-O?? — Black castles into the Tarrasch Trap.',
      highlights: [H('e4', KEY)] }),
    b({ id: 'tt3', moves: `${TARRASCH_BASE} O-O Nd4 Qd7 Nxe6 fxe6 Rxe4`,
      say: "Nd4 hits the e6-bishop and clears the file; after Nxe6 fxe6, Rxe4 simply collects the knight. White is a clean piece up. That is the Tarrasch Trap — castle too soon in the Open and the e4-knight falls.",
      sayShort: 'Nd4, Nxe6, Rxe4 — White wins the e4-knight. A clean piece.',
      highlights: [H('e4', KEY)] }),
  ],
};

/** WARNING — Main: grabbing the d-pawn with the queen lets Black cage Bb3. */
const NOAH: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Watch out: Noah\'s Ark Trap',
  minutes: 3,
  orientation: 'white',
  beats: [
    b({ id: 'na1', moves: NOAH_BASE,
      say: "A free pawn sits on d4, and your bishop sits on b3 — both of those facts matter. The greedy grab here is the road to ruin: this is the Noah's Ark Trap.",
      sayShort: 'A tempting free pawn on d4 — and a vulnerable bishop on b3.',
      highlights: [H('d4', KEY), H('b3', SOFT)] }),
    b({ id: 'na2', moves: `${NOAH_BASE} Qxd4 c5 Qd5 Be6 Qc6+ Bd7 Qd5 c4`,
      say: "Qxd4 snatches the pawn — and c5! chases the queen. She wanders: Qd5, Be6, Qc6+, Bd7, Qd5, and now c4 slams the door. Look at the b3-bishop — walled in by a6, b5, and c4 with no escape square. White must give it up. That is the Noah's Ark, sprung in full.",
      sayShort: 'Qxd4 c5! and the queen is hounded until c4 entombs the b3-bishop.',
      highlights: [H('b3', KEY), H('c4', ATK), H('a6', SOFT), H('b5', SOFT)] }),
    b({ id: 'na3', moves: `${NOAH_BASE} Bd5`,
      say: "Now rewind. Do not snatch the pawn with the queen — Bd5 keeps the bishop active and far from the cage. And in the closed main lines, Bc2 tucks the bishop safely off b3 long before Black can ever build this trap. The maneuver IS the antidote.",
      sayShort: 'Rewind: Bd5 (or Bc2 in the main lines) keeps the bishop out of the cage.',
      highlights: [H('d5', KEY), H('c2', SOFT)] }),
  ],
};

/** WARNING — Berlin: taking the e5-pawn loses a piece to ...c6. */
const MORTIMER: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Watch out: Mortimer Trap',
  minutes: 2,
  orientation: 'white',
  beats: [
    b({ id: 'mt1', moves: MORT_BASE,
      say: "The Berlin, and Black plays the odd-looking Ne7 — the Mortimer Defense. It is bait. The e5-pawn looks completely free.",
      sayShort: 'The Mortimer: ...Ne7 dangles the e5-pawn as bait.',
      highlights: [H('e5', KEY)] }),
    b({ id: 'mt2', moves: `${MORT_BASE} Nxe5 c6 Nc4 d6 Ba4 b5`,
      say: "Nxe5?? grabs it — but c6 hits the bishop, the knight scrambles to c4, and after d6 and Ba4, the b5-push forks bishop and knight at once. White cannot save both and drops a piece. The free pawn was poisoned all along.",
      sayShort: 'Nxe5?? c6, and ...b5 forks the a4-bishop and c4-knight. White loses a piece.',
      highlights: [H('b5', ATK), H('a4', KEY), H('c4', KEY)] }),
    b({ id: 'mt3', moves: `${MORT_BASE} Nc3`,
      say: "Rewind. Leave the pawn alone — Nc3 just develops and keeps the pull. The whole point of the Mortimer is to tempt the capture; decline it and Black's Ne7 is merely passive.",
      sayShort: 'Rewind: decline the pawn. Nc3 develops and Black\'s Ne7 is just passive.',
      highlights: [H('c3', KEY)] }),
  ],
};

/** WARNING — Berlin: grabbing the g4-knight opens the h-file for mate. */
const FISHING_POLE: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Watch out: Fishing Pole',
  minutes: 2,
  orientation: 'white',
  beats: [
    b({ id: 'fp1', moves: FISH_BASE,
      say: "Black flings the knight to g4 — the Fishing Pole. It dares you to win the 'trapped' knight with h3. Do not reach for the bait.",
      sayShort: 'The Fishing Pole: ...Ng4 dares you to grab it with h3.',
      highlights: [H('g4', KEY)] }),
    b({ id: 'fp2', moves: `${FISH_BASE} h3 h5 hxg4 hxg4 Ne1 Qh4 f3 g3 Rf2 Qh1#`,
      say: "h3 attacks the knight — but h5! is the hook. Take it and hxg4 hxg4 rips the h-file open. The queen lands on h4, and even Ne1, f3, Rf2 can't plug the file — g3 and Qh1 is mate. The 'free' knight was a fishing line straight to your king.",
      sayShort: "h3 h5! — grab the knight and the h-file opens; it ends in Qh1 mate.",
      arrows: [{ from: 'h1', to: 'g1', color: ATK }],
      highlights: [H('h1', ATK), H('g1', KEY)] }),
    b({ id: 'fp3', moves: `${FISH_BASE} d4`,
      say: "Rewind. Ignore the knight entirely — d4 strikes the centre and the g4-knight has no real threat to back up its bravado. Never reach for the hook; play in the middle and the Fishing Pole snaps.",
      sayShort: 'Rewind: ignore the knight, play d4 in the centre. The hook snaps.',
      highlights: [H('d4', KEY)] }),
  ],
};

/** WARNING — Marshall: one square (g3, not h3) is the only-move that holds. */
const MARSHALL_WARNING: LessonScript = {
  openingId: 'ruy-lopez',
  title: 'Watch out: the Marshall only-move',
  minutes: 2,
  orientation: 'white',
  beats: [
    b({ id: 'mw1', moves: MARSH_BASE,
      say: "Deep in the Marshall, Black's queen lands on h4 and the attack is at full roar — pieces aimed at f2, g2, and the h-file. This is the moment of truth: White has exactly one move that holds.",
      sayShort: "The Marshall storm: ...Qh4. White has one move that holds.",
      highlights: [H('h4', KEY), H('g2', SOFT)] }),
    b({ id: 'mw2', moves: `${MARSH_BASE} h3`,
      say: "The natural-looking h3?? — and it is already too late. It does nothing about the threats against f2 and g2, and the attack crashes through. In the Marshall, a natural move is a losing move.",
      sayShort: 'h3?? — natural and losing; it ignores the f2/g2 threats.',
      highlights: [H('h3', ATK)] }),
    b({ id: 'mw3', moves: `${MARSH_BASE} g3`,
      say: "Rewind. The only-move: g3. It blocks the queen's diagonal and forces her to the worse h3-square, buying the tempo to consolidate. One square — g3, not h3 — is the whole difference between holding a pawn up and getting mated.",
      sayShort: 'The only-move: g3 — blocks the diagonal, forces the queen back. Not h3.',
      highlights: [H('g3', KEY), H('h4', SOFT)] }),
  ],
};

/** Trap lessons keyed by trap id. */
export const RUY_TRAP_LESSONS: Record<string, LessonScript> = {
  tarrasch: TARRASCH,
  'noahs-ark': NOAH,
  mortimer: MORTIMER,
  'fishing-pole': FISHING_POLE,
  'marshall-onlymove': MARSHALL_WARNING,
};

export type RuyTrapKind = 'weapon' | 'warning';
export interface RuyTrapDef {
  id: string;
  name: string;
  kind: RuyTrapKind;
  /** Hand-picked tab labels (lower-case) this trap appears on. */
  appliesTo: string[];
}

/** HAND-PICKED routing — which trap shows on which tab. No algo. */
export const RUY_TRAP_DEFS: RuyTrapDef[] = [
  { id: 'tarrasch', name: 'The Tarrasch Trap', kind: 'weapon', appliesTo: ['open'] },
  { id: 'noahs-ark', name: "Noah's Ark Trap", kind: 'warning', appliesTo: ['main'] },
  { id: 'mortimer', name: 'Mortimer Trap', kind: 'warning', appliesTo: ['berlin'] },
  { id: 'fishing-pole', name: 'Fishing Pole', kind: 'warning', appliesTo: ['berlin'] },
  { id: 'marshall-onlymove', name: 'The only-move trap', kind: 'warning', appliesTo: ['marshall'] },
];

/** Trap defs for a given tab label ('main' for the main line). */
export function getRuyTrapsForTab(tabKey: string): RuyTrapDef[] {
  return RUY_TRAP_DEFS.filter((t) => t.appliesTo.includes(tabKey));
}
