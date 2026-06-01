import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Scandinavian Defence, BLACK. 499 games (online + OTB),
// 67%. A surprise weapon he wheels out to dodge theory: take on d5, recapture
// with the queen, tuck it to d6, and play a sound ...a6/...b5 setup with a quick
// queenside expansion. Main line = the modern 3…Qd6. Variations cover 3…Qa5,
// the 2.Nc3 move-order, the modern 2…Nf6 and 3…Qd8.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Scandinavian_Defense', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-scandinavian',
  title: "Carlsen's Scandinavian — the 3…Qd6 Surprise",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'qxd5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6', highlights: [H('d6'), H('d5')], say: "The Scandinavian — Black hits the centre with d5 on move one, trades, and recaptures with the queen. The modern touch is Qd6: the queen sits safely out of the way of the c3-knight, eyeing the centre and the kingside. A low-theory surprise Carlsen uses to drag opponents out of their preparation.", sayShort: 'Qd6 — the modern, safe square.' }),
    b({ id: 'nf6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6', highlights: [H('a6'), H('f6')], say: "Black develops the knight to f6 and plays the useful a6 — ruling out Nb5 ideas against the queen and preparing the queenside expansion. The structure is solid and symmetrical; Black has no weaknesses and a clear plan. Patience first, activity later.", sayShort: 'Nf6, a6 — solid, prep ...b5.' }),
    b({ id: 'b5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 b5', arrows: [A('b5', 'b4')], highlights: [H('b5')], say: "The point of the setup — b5, grabbing queenside space and preparing to fianchetto the light-squared bishop to b7. Black builds a harmonious position where every piece has a natural home, then plays for the …b4 break and pressure down the long diagonal.", sayShort: 'b5 — queenside space, prep ...Bb7.' }),
    b({ id: 'bb7', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 g3 b5 Bg2 Bb7 O-O e6', arrows: [A('b7', 'g2')], highlights: [H('b7'), H('e6')], say: "Bishop to b7, raking the long light diagonal toward White's king, and …e6 completes a rock-solid pawn shell. Black has reached a comfortable, fully-developed middlegame with the bishop pair and easy play — exactly the kind of low-risk, slightly-unusual position Carlsen outplays people in.", sayShort: 'Bb7, e6 — the long diagonal, solid.' }),
  ],
};

const QA5: LessonScript = {
  openingId: 'pro-carlsen-scandinavian', title: '3…Qa5 Main', minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5', arrows: [A('a5', 'e1')], highlights: [H('a5')], say: "The classical Qa5 — the queen pins nothing but eyes the e1-h4 diagonal and stays active on the queenside. It's the oldest main line of the Scandinavian, sound and well-mapped, giving Black a quick, harmonious development.", sayShort: 'Qa5 — the classical main.' }),
    b({ id: 'bf5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Bf5', arrows: [A('f5', 'b1')], highlights: [H('c6'), H('f5')], say: "Black plays …c6 to make a luft square for the queen and develops the bishop OUTSIDE the pawn chain to f5 — the whole point of the Scandinavian over the French. Black gets the good bishop active before locking the centre.", sayShort: 'c6, Bf5 — free the good bishop.' }),
    b({ id: 'e6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 c6 Nf3 Bf5 Bc4 e6 O-O Nf6', highlights: [H('e6'), H('f6')], say: "…e6 and …Nf6 complete a sturdy setup. Black is solid as a rock with the bishop pair developed and the queen ready to drop back to c7. White's lead in space is minimal, and Black has a clear, comfortable middlegame ahead.", sayShort: 'e6, Nf6 — finish solidly.' }),
  ],
};

const VS_NC3: LessonScript = {
  openingId: 'pro-carlsen-scandinavian', title: 'vs 2.Nc3', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'dxe4', moves: 'e4 d5 Nc3 dxe4 Nxe4 Nf6', arrows: [A('f6', 'e4')], highlights: [H('e4')], say: "When White defends e4 with Nc3 instead of taking, Black grabs the pawn — …dxe4 — and after Nxe4 develops with …Nf6, hitting the centralised knight and forcing a trade or retreat. Black equalises by simple, forcing development.", sayShort: 'dxe4, Nf6 — hit the knight.' }),
    b({ id: 'exf6', moves: 'e4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 d4 Bd6 Nf3 O-O Bd3 Re8', arrows: [A('d6', 'h2')], highlights: [H('f6'), H('d6')], say: "After Nxf6+ exf6 Black recaptures toward the centre, opening the e-file and the diagonal for the bishop to d6, which aims at White's kingside. The doubled f-pawns are no weakness — they control e5 and g5 — and Black's bishop pair gives a comfortable, active game.", sayShort: 'exf6, Bd6 — active bishop pair.' }),
  ],
};

const MODERN_NF6: LessonScript = {
  openingId: 'pro-carlsen-scandinavian', title: 'Modern 2…Nf6', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 d5 exd5 Nf6', arrows: [A('f6', 'd5')], highlights: [H('d5')], say: "The modern move-order — Nf6, delaying the queen. Black will regain the d5-pawn with the knight, avoiding the early …Qxd5 that lets White gain tempo. It's the most flexible, theory-light way into the Scandinavian.", sayShort: 'Nf6 — regain d5 with the knight.' }),
    b({ id: 'nxd5', moves: 'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 Be2 Bg7 O-O O-O c4 Nb6', arrows: [A('g7', 'a1')], highlights: [H('d5'), H('g6')], say: "Black recaptures on d5 with the knight and fianchettoes with …g6. The knight sits actively in the centre, the bishop heads to g7 on the long diagonal, and Black gets a comfortable, modern position — a kind of reversed-centre setup he understands deeply.", sayShort: 'Nxd5, g6 — central knight, fianchetto.' }),
  ],
};

const QD8: LessonScript = {
  openingId: 'pro-carlsen-scandinavian', title: '3…Qd8 Solid', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'qd8', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8', highlights: [H('d8')], say: "The ultra-solid Qd8 — the queen simply returns home. Black concedes a little time but keeps a completely sound, weakness-free position, planning …Nf6, …Bg4 or …Bf5, …e6 and …c6. No targets for White to hit.", sayShort: 'Qd8 — back home, rock-solid.' }),
    b({ id: 'bg4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qd8 d4 Nf6 Nf3 Bg4', arrows: [A('g4', 'f3')], highlights: [H('g4')], say: "Black develops …Nf6 and pins the knight with …Bg4, the active light-squared bishop again deployed outside the chain. Black follows with …e6, …Be7 and castling, reaching a sound, slightly-cramped-but-resilient position where his solidity wears White down.", sayShort: 'Bg4 — pin, develop the good bishop.' }),
  ],
};

export const PRO_CARLSEN_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-scandinavian::3…Qa5 Main': QA5,
  'pro-carlsen-scandinavian::vs 2.Nc3': VS_NC3,
  'pro-carlsen-scandinavian::Modern 2…Nf6': MODERN_NF6,
  'pro-carlsen-scandinavian::3…Qd8 Solid': QD8,
};
