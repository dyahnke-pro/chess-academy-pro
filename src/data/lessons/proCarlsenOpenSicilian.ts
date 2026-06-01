import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Open Sicilian, WHITE. 1,118 games (online + OTB), 77%.
// His most-played and best-scoring White weapon across his whole career. Main
// line = the Najdorf English Attack (6.Be3, f3, Qd2, O-O-O, g4-storm) — the
// modern positional-attacking treatment Magnus rides into a kingside avalanche
// or a superior structure. Spine reaches the English Attack middlegame tabiya
// (18 plies). Variations cover his complete answer to every Sicilian try.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_OPEN_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-open-sicilian',
  title: "Carlsen's Open Sicilian — the Najdorf English Attack",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'open', moves: 'e4 c5 Nf3 d6 d4', highlights: [H('d4')], say: "The Sicilian is the most combative answer to e4, and Magnus meets it head-on with the Open — the principled d4 break. No sidesteps: he opens the centre, takes the d4-square for a piece, and plays for the full board. This is his single most-played White weapon, scoring nearly seventy-seven percent across more than a thousand games.", sayShort: 'd4 — open it, play for everything.' }),
    b({ id: 'najdorf', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', arrows: [A('c3', 'd5')], highlights: [H('d5'), H('a6')], say: "We reach the Najdorf, the deepest battleground in all of chess. Black's a6 is the famous prophylactic move — it stops anything landing on b5 and prepares queenside expansion. Notice the d5-square: that hole is the heart of the fight. Whoever controls it controls the game.", sayShort: 'Najdorf — a6, and the d5 fight.' }),
    b({ id: 'be3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3', highlights: [H('e3')], say: "Be3 — the English Attack. The bishop eyes the queenside dark squares and the whole setup says one thing: castle long and hurl the kingside pawns forward. This is the line Magnus trusts most, because it lets him attack and keep a sound structure at the same time.", sayShort: 'Be3 — the English Attack.' }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6', arrows: [A('b3', 'd4')], highlights: [H('e5'), H('e6')], say: "Black grabs central space with e5, kicking the knight, and it drops back to b3 — keeping options, eyeing the c5 and d4 squares. Black's bishop comes to e6 to fight for d5. The pawn on e5 is double-edged: it claims space but concedes the d5-hole forever.", sayShort: 'Nb3 retreats; the d5-hole is set.' }),
    b({ id: 'f3qd2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2', highlights: [H('f3'), H('d2')], say: "Here's the English Attack engine: f3 props up e4 and clears the path for g4, and the queen swings to d2 connecting the rooks and pointing at the kingside. Every piece is loading toward one plan — long castling and a pawn storm in front of Black's king.", sayShort: 'f3 and Qd2 — load the storm.' }),
    b({ id: 'castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O', highlights: [H('g7'), H('h7')], say: "Both sides finish developing, and now the race is drawn. White's plan writes itself: O-O-O, then g4, g5, h4-h5, prying open the files toward g7 and h7. Black counters on the other wing with the minority of pawns and the open c-file. It's a knife-fight — and Magnus is the sharpest knife in the room.", sayShort: 'The race: g4-g5 storm vs queenside.' }),
  ],
};
