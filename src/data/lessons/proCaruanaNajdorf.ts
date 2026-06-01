import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Sicilian Najdorf MAIN Watch lesson. Student = BLACK. Spine is
// his real data line (caruana-najdorf-classical-be2), tree-extended to a 20-ply
// middlegame — the line that reaches a real middlegame in his online games (the
// sharp Bg5/Be3 lines are played too rarely online to build an honest deep
// spine). Board-accurate, two registers, G9.4 voice. The Najdorf: ...a6 first,
// then ...e5 to grab the centre against the quiet Be2 setup.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_NAJDORF_LESSON: LessonScript = {
  openingId: 'pro-caruana-najdorf',
  title: "Caruana's Najdorf",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'a6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', say: "The Najdorf — the most-analysed defence in chess and Caruana's fighting weapon against e4. The little move a6 is its soul: it controls b5, denies White the natural squares, and waits to see how White commits.", sayShort: '…a6 — the Najdorf move.', arrows: [A('a7', 'a6')], highlights: [H('a6')] }),
    b({ id: 'e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5', say: "Against the solid Be2, Black plays the principled e5, grabbing central space and kicking the d4-knight. This is the heart of the Najdorf — claiming the centre and accepting a slight hole on d5 in return for activity and counterplay.", sayShort: '…e5 — grab the centre.', arrows: [A('d6', 'e5')], highlights: [H('e5')] }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O', say: "The knight retreats to b3, Black develops the bishop to e7 and both sides castle. A calm, classical Najdorf where Black has a sound, harmonious setup and a clear plan: pressure the centre and expand on the queenside.", sayShort: '…Be7, …O-O — sound and safe.', arrows: [A('f8', 'e7')], highlights: [H('e7')] }),
    b({ id: 'be6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6', say: "White develops the bishop to e3 and Black answers with Be6, controlling the key d5-square and preparing to contest the centre. Both sides complete development around the e5/d5 tension.", sayShort: '…Be6 — fight for d5.', arrows: [A('c8', 'e6')], highlights: [H('e6')] }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O Be3 Be6 Nd5 Nbd7', say: "White plants a knight on the d5-outpost and Black develops the last knight to d7, ready to challenge or recapture on d5. The classic Najdorf battle: White's d5-knight against Black's queenside play and the half-open c-file. A rich, fully sound middlegame for Black.", sayShort: '…Nbd7 — contest d5, full game.', arrows: [A('b8', 'd7')], highlights: [H('d7')] }),
  ],
};
