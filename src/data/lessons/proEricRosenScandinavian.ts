import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Scandinavian Defense (Black). 192 games, 64%. His modern
// …Nf6 Scandinavian: after exd5, …Nf6 and …Bg4 to regain d5 with fast,
// harmonious development. Two registers; no move-number prefixes; green arrows.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-development', 'concept:pos-bishop-pair', 'https://www.chess.com/openings/Scandinavian-Defense', 'https://api.chess.com/pub/player/imrosen/games/archives'];

export const PRO_ERICROSEN_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-scandinavian', title: "This repertoire's Modern Scandinavian (…Nf6)", minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 d5 exd5 Nf6',
      arrows: [A('f6', 'd5')], highlights: [{ square: 'd5', color: KEY }, { square: 'f6', color: KEY }],
      say: "The modern Scandinavian. Instead of recapturing with the queen (and getting it chased around), we play …Nf6 — preparing to win the d5-pawn back with a piece and keeping our queen safely at home. Fast, clean development is the whole idea.",
      sayShort: '…Nf6 — regain d5 with a piece.' }),
    b({ id: 'bg4', moves: 'e4 d5 exd5 Nf6 d4 Bg4',
      arrows: [], highlights: [{ square: 'g4', color: KEY }],
      say: "When White holds the pawn with d4, we develop …Bg4 — pinning a future Nf3 and, crucially, solving the Scandinavian's eternal problem of the light-squared bishop by getting it OUTSIDE the pawn chain before …e6 ever locks it in.",
      sayShort: '…Bg4 — free the light bishop early.' }),
    b({ id: 'trade', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5',
      arrows: [], highlights: [{ square: 'd5', color: KEY }],
      say: "We trade the light bishops with …Bxe2 — happily giving up the 'bad' bishop for White's good one — and only NOW recapture the pawn with …Qxd5. The queen comes out when it is safe, not when it can be harassed. Material is level and Black is fully developed.",
      sayShort: '…Bxe2, …Qxd5 — pawn back, safe queen.' }),
    b({ id: 'develop', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 Nc6 O-O O-O-O',
      arrows: [], highlights: [{ square: 'c6', color: KEY }, { square: 'c8', color: SOFT }],
      say: "…Nc6 hits d4 and we castle queenside, throwing our king's rook into the game on the open d-file against White's centre. Black has a harmonious, active position with no weaknesses and an easy plan — a long way from the Scandinavian's dubious reputation.",
      sayShort: '…Nc6, O-O-O — pressure the d-file.' }),
    b({ id: 'plan', moves: 'e4 d5 exd5 Nf6 d4 Bg4 Be2 Bxe2 Qxe2 Qxd5 Nf3 Nc6 O-O O-O-O',
      arrows: [A('d8', 'd4')], highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "The plan: pile rooks and queen on the d-file against White's d4-pawn, prepare …e5 to break the centre open, and use the lead in development before White consolidates. This repertoire plays the Scandinavian as a fighting, fully-sound counter-attacking defense.",
      sayShort: 'Plan: pressure d4, break with …e5.' }),
  ],
};
