// A borrowed note may only be SELECTED if the text it will SPEAK is true of
// the board it is borrowed onto.
//
// The defect this pins (David's K+P sample, 2026-08-05): the transition path
// speaks ONLY `note.plans` for non-position origins — and `plans` was the one
// field the structure tier never board-checked (it filtered explains+teaches),
// while the concept tier checked nothing at all. Result: "black should trade
// rooks" selected for a king-and-pawn ending. Selection owns board-truth now;
// the caller's `gradeNarrationText` is the backup that should never fire.
import { describe, it, expect, beforeAll } from 'vitest';
import { Chess } from 'chess.js';
import {
  namedPiecesExistOnBoard,
  transitionTeachingSourceForGame,
  notesForStructure,
} from './danyaTeachingService';
import { loadFullCorpus } from '../test/loadFullCorpus';

const KP_ENDGAME = '8/6k1/5p2/8/5K2/6P1/8/8 w - - 0 50';
const RP_ENDGAME = '8/5pk1/6p1/8/1R6/6P1/5PK1/3r4 w - - 0 40';

describe('namedPiecesExistOnBoard', () => {
  it('refuses rook prose on a rookless board, allows it where rooks live', () => {
    expect(namedPiecesExistOnBoard('black should trade rooks to simplify', KP_ENDGAME)).toBe(false);
    expect(namedPiecesExistOnBoard('keep the rook active behind the pawn', RP_ENDGAME)).toBe(true);
  });

  it('judges every named piece type, not just rooks', () => {
    expect(namedPiecesExistOnBoard('the queen infiltrates', RP_ENDGAME)).toBe(false);
    expect(namedPiecesExistOnBoard('the bishop pair tells', KP_ENDGAME)).toBe(false);
    expect(namedPiecesExistOnBoard('king activity decides pawn endings', KP_ENDGAME)).toBe(true);
  });

  it('passes when there is nothing to judge', () => {
    expect(namedPiecesExistOnBoard('', KP_ENDGAME)).toBe(true);
    expect(namedPiecesExistOnBoard('activity is everything', 'not a fen')).toBe(true);
  });

  it('is not fooled by substrings', () => {
    // "outpawned"/"kingside" must not read as piece words.
    expect(namedPiecesExistOnBoard('press on the kingside', KP_ENDGAME)).toBe(true);
  });
});

describe('selection refuses notes whose SPOKEN field is false of the board', () => {
  beforeAll(async () => { await Promise.resolve(loadFullCorpus()); }, 120_000);

  it('the K+P transition never selects a note that talks about absent pieces', () => {
    // The real corpus, the real selector, the exact position class that
    // produced the defect. Whatever is selected (including nothing — honest
    // silence), its PLANS text must only name pieces this board still has.
    const src = transitionTeachingSourceForGame({ historySans: [], fen: KP_ENDGAME, openingName: null });
    if (src) {
      expect(
        namedPiecesExistOnBoard(src.note.plans ?? '', KP_ENDGAME),
        `selected ${src.note.id} (${src.origin}) whose plans talk about pieces not on the board: "${src.note.plans}"`,
      ).toBe(true);
    }
  });

  it('structure transfer filters the plans field, not just explains+teaches', () => {
    // Sweep: every structure-transferred note for the R+P ending must carry
    // plans that survive the piece-existence check — the field it will speak.
    const picked = notesForStructure(RP_ENDGAME, 25);
    for (const n of picked) {
      expect(
        namedPiecesExistOnBoard(n.plans ?? '', RP_ENDGAME),
        `${n.id} passed structure selection with board-false plans: "${n.plans}"`,
      ).toBe(true);
    }
  });

  it('a middlegame with all pieces on remains freely served', () => {
    // The filter must not starve normal positions — everything exists here.
    const fen = new Chess().fen();
    expect(namedPiecesExistOnBoard('rooks, bishops, knights, queen and pawns all coordinate', fen)).toBe(true);
  });
});
