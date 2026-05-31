import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Budapest Gambit (Black). 258 games, 63% — his signature
// gambit answer to d4: 1.d4 Nf6 2.c4 e5!?, sacrificing a pawn for fast,
// active piece play and tricks on f2/the kingside. Two registers; no
// move-number prefixes in spoken text; green vision arrows only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:tac-trap', 'concept:pos-development', 'https://www.chess.com/openings/Budapest-Gambit', 'https://api.chess.com/pub/player/imrosen/games/archives'];

export const PRO_ERICROSEN_BUDAPEST_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-budapest', title: "Rosen's Budapest Gambit", minutes: 7,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'd4 Nf6 c4 e5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say: "The Budapest Gambit — e5! Against d4 and c4 we strike in the centre and offer the pawn. It is a Rosen kind of opening: a little dubious, hugely fun, and packed with traps that punish a White player who grabs material and relaxes.",
      sayShort: '…e5 — the gambit strike.' }),
    b({ id: 'ng4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4',
      arrows: [A('g4', 'e5'), A('g4', 'f2')], highlights: [{ square: 'g4', color: KEY }, { square: 'e5', color: KEY }],
      say: "White takes on e5; we hop the knight to g4, hitting the e5-pawn and eyeing f2 and h2. This is the heart of the gambit — the g4-knight will either win the pawn back or spearhead a kingside attack. Black is never passive here.",
      sayShort: '…Ng4 — chase e5, eye f2.' }),
    b({ id: 'bf4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'f4', color: SOFT }],
      say: "White defends the pawn with Bf4; we develop with check — Bb4+. The bishop gets out actively, forces White to block, and gains a tempo. Every Black piece comes flying out while White is busy hanging onto the extra pawn.",
      sayShort: '…Bb4+ — develop with tempo.' }),
    b({ id: 'nd2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+ Nd2 Nc6 Ngf3 Qe7',
      arrows: [A('c6', 'e5')], highlights: [{ square: 'e5', color: KEY }, { square: 'e7', color: KEY }],
      say: "After Nd2 blocks the check, we pile on the e5-pawn: …Nc6 adds a second attacker and …Qe7 a third, also pinning ideas down the e-file. White cannot comfortably hold the pawn AND finish developing — something has to give.",
      sayShort: '…Nc6, …Qe7 — gang up on e5.' }),
    b({ id: 'regain', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+ Nd2 Nc6 Ngf3 Qe7 a3 Ngxe5 Nxe5 Nxe5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }],
      say: "We regain the pawn with …Ngxe5, and after the trades a knight lands on the great central e5-square. Material is level, our pieces are far more active than White's, and the bishop on b4 and knight on e5 already cramp White. The gambit has paid off.",
      sayShort: '…Nxe5 — pawn back, monster knight.' }),
    b({ id: 'plan', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bb4+ Nd2 Nc6 Ngf3 Qe7 a3 Ngxe5 Nxe5 Nxe5',
      arrows: [A('e5', 'd3'), A('e5', 'f3')], highlights: [{ square: 'd3', color: KEY }, { square: 'f2', color: SOFT }],
      say: "The plan from here is pure activity: the e5-knight eyes the d3- and f3-holes, …O-O and …Re8 pile on the e-file, and the bishops rake White's kingside. Watch for the recurring tricks — …Nd3 forking, …Bxf2+ shots — that win games when White is careless. This is Rosen's playground.",
      sayShort: 'Plan: …Nd3 tricks, …Re8 pressure.' }),
  ],
};
