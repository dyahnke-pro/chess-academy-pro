import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Sicilian Defence, BLACK. 1,351 games (online + OTB), his
// single deepest defence to e4. He plays the whole Sicilian universe; the main
// line here is the sharp Najdorf with Bg5, where Black accepts doubled f-pawns
// for the bishop pair, the open g-file and dynamic counterplay. Variations cover
// the Rossolimo, Taimanov, Open ...Nc6 and the anti-Sicilians he meets as Black.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_SICILIAN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-sicilian',
  title: "Carlsen's Sicilian — the Najdorf Main Line",
  minutes: 12,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'najdorf', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', highlights: [H('a6'), H('c5')], say: "The Sicilian is Black's most ambitious answer to e4 — he unbalances the game from move one and plays for a win, not a draw. The Najdorf's a6 is the most famous move in the opening: prophylaxis and preparation in one, ruling out b5 ideas and readying Black's own queenside counterplay.", sayShort: 'a6 — the Najdorf, play to win.' }),
    b({ id: 'bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5', arrows: [A('g5', 'f6')], highlights: [H('g5')], say: "White chooses the sharpest weapon — Bg5, pinning the f6-knight and threatening to wreck Black's kingside. This is the Main Line, a tabiya soaked in theory and danger. Carlsen welcomes it: the more concrete the position, the more his calculation tells.", sayShort: 'vs Bg5 — the sharpest Najdorf.' }),
    b({ id: 'e6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4', highlights: [H('e6'), H('f4')], say: "Black plays the solid e6, building a small but sturdy pawn chain and opening lines for the dark-squared bishop. White answers with f4, grabbing kingside space and dreaming of e5 and f5 pawn breaks. Both sides commit to opposite-wing aggression.", sayShort: 'e6 then f4 — opposite-wing war.' }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qc7', arrows: [A('c7', 'c3')], highlights: [H('c7')], say: "Qc7 is the modern, flexible choice — the queen eyes the c-file and the e5-square, supporting Black's counterplay against White's centre. Black keeps every option open: castle either side, push the queenside pawns, or strike in the centre. Maximum flexibility, classic Carlsen.", sayShort: 'Qc7 — flexible, eye the centre.' }),
    b({ id: 'gxf6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qc7 Bxf6 gxf6', arrows: [A('f8', 'a3')], highlights: [H('f6'), H('g8')], say: "After Bxf6, Black recaptures with the g-pawn — gxf6. It looks ugly, but it's a famous strategic decision: Black trades clean structure for the two bishops, the half-open g-file pointing at White's king, and a rock-solid centre. Those doubled f-pawns control the key e5 and g5 squares. Dynamic imbalance — exactly what the Sicilian is for.", sayShort: 'gxf6 — bishops and the g-file.' }),
  ],
};

const ROSSOLIMO: LessonScript = {
  openingId: 'pro-carlsen-sicilian', title: "vs Rossolimo Bb5", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'g6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6', highlights: [H('g6')], say: "Against the Rossolimo's Bb5, Carlsen's favourite reply is the calm g6 — fianchetto the bishop and dare White to take on c6. If White trades, Black gets the bishop pair; if not, Black builds a harmonious setup. Either way, no concessions.", sayShort: 'g6 — fianchetto, take the bishops.' }),
    b({ id: 'bxc6', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 Bxc6 dxc6', highlights: [H('e5'), H('c6')], say: "Black grabs the centre with e5, and when White trades on c6, Black recaptures toward the centre with dxc6. The result: a big central pawn presence, the two bishops, and the long-diagonal bishop staring across the board. Black is comfortable and full of resources.", sayShort: 'e5, dxc6 — centre and bishops.' }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 Nc6 Bb5 g6 O-O Bg7 Re1 e5 Bxc6 dxc6 d3 Qc7', highlights: [H('c7'), H('e5')], say: "After d3, Black completes with Qc7, defending e5 and preparing to develop and castle. This is a fully sound, equal middlegame where Black's bishop pair gives genuine winning chances — exactly the kind of rich, balanced fight Carlsen outplays people in.", sayShort: 'Qc7 — solid, two-bishop chances.' }),
  ],
};

const TAIMANOV: LessonScript = {
  openingId: 'pro-carlsen-sicilian', title: "Taimanov ...e6", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6', highlights: [H('e6'), H('a6')], say: "The Taimanov-Kan: a flexible ...e6 and ...a6, the most adaptable Sicilian set-up. Black delays committing the knights and keeps the position fluid, ready to expand on the queenside with ...b5 and develop wherever White's setup invites. Flexibility is the whole point.", sayShort: 'e6, a6 — maximum flexibility.' }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7', arrows: [A('c7', 'c3')], highlights: [H('c7')], say: "Qc7 takes aim down the half-open c-file and supports the coming ...b5 and ...Bb7 fianchetto. Black builds a low-profile, resilient structure with no weaknesses, then unleashes the queenside pawns. White has space, but Black has a coiled spring.", sayShort: 'Qc7 — the c-file, prep ...b5.' }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O', highlights: [H('f6')], say: "Black develops calmly — ...Nf6 and the pieces follow. The Taimanov gives Black a hugely sound, flexible game where one inaccuracy by White can be punished by the ...b5-b4 advance. Carlsen loves these slow Sicilians where understanding beats memorisation.", sayShort: 'Nf6 — sound, spring-loaded.' }),
  ],
};

const OPEN_NC6: LessonScript = {
  openingId: 'pro-carlsen-sicilian', title: "Open vs ...Nc6", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e5', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5', arrows: [A('e5', 'd4')], highlights: [H('e5')], say: "The Sveshnikov-flavoured e5 — Black strikes at the centre immediately, kicking the d4-knight and seizing space. It concedes the d5-square but grabs the initiative and active piece play. This is one of the most respected lines at the very top, and a Carlsen World-Championship weapon.", sayShort: 'e5 — strike the centre.' }),
    b({ id: 'd6', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5', arrows: [A('b5', 'a4')], highlights: [H('b5'), H('d5')], say: "White's knight goes on a journey to b5 and a3, and Black gains queenside space with ...a6 and ...b5, gripping the c4-square and harassing the offside knight. Black accepts a hole on d5 in return for piece activity and a queenside pawn roller. Dynamic balance.", sayShort: 'b5 — space for the d5 hole.' }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Nd5 Be7 Bxf6 Bxf6', highlights: [H('d5'), H('f6')], say: "White plants a knight on d5 and trades on f6; Black keeps the bishop pair and prepares to challenge or undermine the d5-outpost with ...Bg5 and ...Ne7. It's a deeply theoretical, double-edged middlegame where Black's activity fully compensates the d5-square. Pure top-level Sicilian.", sayShort: 'Bxf6 — bishops vs the d5 knight.' }),
  ],
};

const ALAPIN: LessonScript = {
  openingId: 'pro-carlsen-sicilian', title: "vs Alapin c3", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 c5 c3 d5', arrows: [A('d5', 'e4')], highlights: [H('d5')], say: "Against the Alapin's c3, Carlsen hits the centre at once with d5 — the most principled antidote. White's c3 blocks his own knight from c3, so Black gets free, equal development by challenging the e4-pawn immediately. No passivity allowed.", sayShort: 'd5 — challenge the centre.' }),
    b({ id: 'develop', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4', arrows: [A('c8', 'f3')], highlights: [H('d5'), H('g4')], say: "After the trade, the queen recaptures on d5 — and unlike the Scandinavian, she can't be harassed by a knight jumping in, because a pawn sits on c3. Black develops freely with ...Nf6 and ...Bg4, pinning the knight and pressuring White's centre. Comfortable, active equality.", sayShort: 'Bg4 — pin and pressure.' }),
    b({ id: 'nc6', moves: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 e6 O-O Nc6', highlights: [H('c6'), H('c5')], say: "Black completes development with ...e6 and ...Nc6, piling pressure on White's d4-pawn. The position is a comfortable IQP-style fight where Black is fully equal and can even play for more. The Alapin promises White nothing against precise play — and Carlsen is always precise.", sayShort: 'Nc6 — pressure d4, fully equal.' }),
  ],
};

const SMITH_MORRA: LessonScript = {
  openingId: 'pro-carlsen-sicilian', title: "vs Smith-Morra / d4", minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'accept', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3', highlights: [H('c3')], say: "The Smith-Morra Gambit — White sacrifices a pawn for fast development and open lines. Carlsen's approach is the calm, classical one: accept the pawn, then give it back at the right moment to defuse the attack and emerge a clean tempo or a healthy structure ahead.", sayShort: 'Accept — then give it back safely.' }),
    b({ id: 'e6', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6', highlights: [H('e6'), H('a6')], say: "Black develops solidly with ...Nc6, ...e6 and ...a6 — the famous Sicilian-Kan structure that takes all the sting out of the gambit. The ...a6 stops White's pieces from landing on b5, and Black calmly catches up in development. The compensation evaporates.", sayShort: 'e6, a6 — defuse the gambit.' }),
    b({ id: 'develop', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7', highlights: [H('e7')], say: "The clever ...Nge7 keeps the knight off f6, where White's pieces would pressure it, and prepares ...Ng6 and a smooth completion of development. Black is simply up a pawn with a sound position. Against accurate defence, the Smith-Morra is just a pawn down — and Carlsen defends accurately.", sayShort: 'Nge7 — a clean extra pawn.' }),
  ],
};

export const PRO_CARLSEN_SICILIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-sicilian::vs Rossolimo Bb5': ROSSOLIMO,
  'pro-carlsen-sicilian::Taimanov ...e6': TAIMANOV,
  'pro-carlsen-sicilian::Open vs ...Nc6': OPEN_NC6,
  'pro-carlsen-sicilian::vs Alapin c3': ALAPIN,
  'pro-carlsen-sicilian::vs Smith-Morra / d4': SMITH_MORRA,
};
