import type { LessonScript } from '../../types';

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's King's Indian Defence (Black, E90). chess.js + explorer-verified,
// deeply DB-anchored (Mar del Plata). Black-oriented.
export const PRO_NARODITSKY_KID_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  sources: SRC,
  title: "The King's Indian — Naroditsky Master Class",
  minutes: 11,
  orientation: 'black',
  beats: [
    {
      id: 'setup',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
      highlights: [{ square: 'e5', color: SOFT }],
      say: "The King's Indian is a deal with the devil. Black calmly lets White build a giant pawn centre — d4, c4, e4 — and fianchettoes the bishop on g7, biding time. The whole opening is a bet: hand over the centre and the space, and in return get a kingside attack so fast and so violent that none of White's extra territory will matter. The coming break is …e5.",
      sayShort: 'Fianchetto and wait — the …e5 break is coming.',
    },
    {
      id: 'e5-d5',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5'],
      highlights: [{ square: 'd5', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Black castles and strikes with e5, challenging the centre. White's principled reply is d5, slamming the door and gaining space. But closing the centre is exactly what Black wants — now the position has fixed battle lines, and both sides know where they must attack. White heads for the queenside; Black heads for White's king.",
      sayShort: 'd5 closes the centre — battle lines drawn.',
    },
    {
      id: 'reroute',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'Be3'],
      highlights: [{ square: 'e7', color: SOFT }],
      say: "Now the famous regrouping: the c6-knight drops back to e7, the f6-knight to d7. It looks slow, even ugly — but it's clearing the decks. The knights get out of the way of the f- and g-pawns, which are about to become a battering ram. Patience first; the violence comes next.",
      sayShort: 'Reroute the knights — clear the pawns’ path.',
    },
    {
      id: 'f4-storm',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7', 'Ne1', 'Nd7', 'Be3', 'f5', 'f3', 'f4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'f5', color: SOFT }],
      say: "Here it is: f5, then f4. The pawn locks on f4 and the storm begins. Next comes g5–g4, prying open the g- and h-files straight at White's king, and Black throws pieces and pawns at the target without a second thought for material. White will be fast on the queenside — but this is the King's Indian, and Black's attack is usually faster. That single idea, …f4 and the pawn storm, is the whole reason to play it.",
      sayShort: '…f4 — lock it, then storm with …g5–g4.',
    },
  ],
};
