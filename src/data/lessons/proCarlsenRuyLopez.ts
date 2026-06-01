import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Ruy Lopez / Open Games, WHITE. 1,113 games (online + OTB),
// 73%. The Spanish is Carlsen's lifelong main weapon vs 1...e5; in his hands it's
// the ultimate slow-squeeze opening — a tiny structural edge nursed for fifty
// moves. Main line = the Closed Ruy with the modern anti-Marshall a4. Spine
// reaches the Spanish middlegame tabiya. Variations cover his complete 1.e4 e5.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_RUY_LOPEZ_LESSON: LessonScript = {
  openingId: 'pro-carlsen-ruy-lopez',
  title: "Carlsen's Ruy Lopez — the Spanish Squeeze",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bb5', moves: 'e4 e5 Nf3 Nc6 Bb5', arrows: [A('b5', 'c6')], highlights: [H('c6'), H('e5')], say: "The Ruy Lopez — the oldest and richest answer to e5, and Magnus Carlsen's lifelong main weapon. Bb5 pressures the c6-knight that defends the e5-pawn. There's no immediate threat, but the question is permanent: every move, Black must keep that knight and that pawn alive.", sayShort: 'Bb5 — pressure the e5 defender.' }),
    b({ id: 'morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6', highlights: [H('a6'), H('e4')], say: "The Morphy Defence: a6 puts the question to the bishop, which slides to a4 keeping the pin alive. Black develops the knight to f6, attacking e4. Standard, sound, and the gateway to the deepest strategic battleground in classical chess.", sayShort: 'a6 Ba4 Nf6 — the Morphy main.' }),
    b({ id: 'oore1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1', arrows: [A('e1', 'e4')], highlights: [H('e4')], say: "White castles and Black tucks the bishop to e7. Then Re1 — the quiet, vital move that overprotects the e4-pawn so the bishop can keep its eye on c6 instead of dropping back to defend. Every Carlsen Ruy runs on this kind of unhurried efficiency.", sayShort: 'Re1 — overprotect e4.' }),
    b({ id: 'bb3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O', arrows: [A('b3', 'f7')], highlights: [H('b3'), H('f7')], say: "Black gains space with b5 and the bishop retreats to b3 — the famous Spanish bishop, now aimed straight down at f7, the soft spot in Black's castled position. Both sides castle and the real game, the manoeuvring war, begins.", sayShort: 'Bb3 — the Spanish bishop eyes f7.' }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4', highlights: [H('a4'), H('b5')], say: "a4 — the modern anti-Marshall. Rather than walk into the razor-sharp Marshall Gambit, Carlsen pokes at the b5-pawn first, keeping the game positional. It's a small, annoying probe on the wing, exactly the kind of low-risk pressure he thrives on.", sayShort: 'a4 — dodge the Marshall.' }),
    b({ id: 'squeeze', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 d3 d6 Nbd2', arrows: [A('d2', 'f1')], highlights: [H('d3'), H('f1')], say: "Black locks the queenside with b4; White settles the centre with d3 and begins the signature Spanish manoeuvre — the knight from d2 heading to f1 and then g3, swinging the whole army toward the kingside. Slow, harmonious, relentless. This is how Carlsen wins game after game from almost nothing.", sayShort: 'Nbd2 — the Spanish knight tour.' }),
  ],
};
