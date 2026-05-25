import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented main lesson for the Scandinavian Defence masterclass.
// Lead-the-eye (playbook §5a): GREEN arrows (vision/intent), YELLOW highlights
// (a named key square), SOFT BLUE (secondary). Move squares auto-painted orange.
// Every arrow originates on a non-pawn with a clear sight-line; every marked
// square is named in the prose. Lines are DB-anchored, masters-extended ≥20p.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const SCANDINAVIAN_DEFENCE_LESSON: LessonScript = {
  openingId: 'scandinavian-defence',
  sources: ['book:scandinavian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
  title: 'The Scandinavian Defence — A Master Class',
  minutes: 12,
  orientation: 'black',
  beats: [
    b({ id: 'open', moves: 'e4 d5', say: "The Scandinavian — Black answers 1.e4 with the immediate 1…d5, challenging the centre on the very first move. No slow build-up and no waiting: Black strikes at e4 at once and forces White to resolve the tension. It is the oldest recorded reply to 1.e4, and one of the most direct.", sayShort: '…d5 — challenge e4 at once.', highlights: [H('d5'), H('e4', SOFT)] }),
    b({ id: 'qxd5', moves: 'e4 d5 exd5 Qxd5', say: "exd5 Qxd5 — and here is the modern idea: Black recaptures with the QUEEN, reaching an open, uncramped position with no weaknesses. Yes, the queen will be hit and cost a tempo — but Black spends that time developing with purpose, not scrambling.", sayShort: '…Qxd5 — recapture actively, no cramp.', highlights: [H('d5')] }),
    b({ id: 'qa5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5', say: "Nc3 develops with a hit on the queen; Black retreats …Qa5 — the main line. From a5 the queen stays active, rakes the a5-e1 diagonal, and supports a quick …Bb4 and …c6. Black has handed over one tempo but kept a sound, flexible, piece-friendly position.", sayShort: '…Qa5 — active retreat on the diagonal.', highlights: [H('a5')] }),
    b({ id: 'nf6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6', say: "d4 stakes out the centre; Black develops …Nf6, eyeing e4 and the central squares. The pieces flow out naturally — and the next move is the one that makes the whole Scandinavian work.", sayShort: '…Nf6 — develop, prep the key move.', highlights: [H('f6')] }),
    b({ id: 'bf5', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5', say: "Nf3 develops, and Black plays …Bf5 — the move. Exactly as in the Caro-Kann, Black gets the light-squared bishop OUTSIDE the pawn chain to f5 BEFORE committing to …e6. This sidesteps the French's eternal bad-bishop problem before it can even begin. From f5 the bishop rakes the b1-h7 diagonal toward c2.", sayShort: '…Bf5 — bishop out before …e6.', arrows: [A('f5', 'c2')], highlights: [H('f5'), H('c2', SOFT)] }),
    b({ id: 'e6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6', say: "Bc4 develops with an eye on f7; now Black plays …e6 in total comfort. Because the light bishop is already outside on f5, the …e6 pawn blocks nothing — Black ends up with the solid structure of the French but with no bad piece at all.", sayShort: '…e6 — safe now, no bad bishop.', highlights: [H('e6'), H('f5', SOFT)] }),
    b({ id: 'bb4', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4', say: "Bd2 readies a response to the pin, and Black obliges with …Bb4, pinning the c3-knight and piling pressure on it together with the a5-queen. Every black piece is now active and pointed at White's queenside.", sayShort: '…Bb4 — pin the c3-knight.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
    b({ id: 'nc6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4 O-O Nc6', say: "White castles; Black develops …Nc6, a second attacker on d4 and a step toward queenside castling. With the queen already on a5 and the pieces aimed at White's king, Black is ready for an opposite-side fight.", sayShort: '…Nc6 — pressure d4, prep …O-O-O.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
    b({ id: 'qb6', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4 O-O Nc6 a3 Bxc3 Bxc3 Qb6', say: "a3 questions the bishop; …Bxc3 Bxc3 trades it off, and …Qb6 swings the queen to hit both b2 and d4. Black keeps needling the dark squares and the queenside while White must keep one eye on the loose b2-pawn.", sayShort: '…Qb6 — hit b2 and d4.', arrows: [A('b6', 'b2')], highlights: [H('b2'), H('d4', SOFT)] }),
    b({ id: 'ooo', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4 O-O Nc6 a3 Bxc3 Bxc3 Qb6 Re1 O-O-O', say: "Re1 centralises a rook; Black castles long with …O-O-O, dropping the rook onto the open d-file and tucking the king safely on the queenside. The position is balanced and rich, both sides with a clear front.", sayShort: '…O-O-O — rook to the open d-file.' }),
    b({ id: 'close', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bf5 Bc4 e6 Bd2 Bb4 O-O Nc6 a3 Bxc3 Bxc3 Qb6 Re1 O-O-O Qc1 Nd5 Bxd5 Rxd5 h3 h6', say: "Qc1 sidesteps, …Nd5 leaps to the centre, and after Bxd5 Rxd5 the rook stands proudly on d5. There is the Scandinavian middlegame in full: an active queen, a centralised rook, the good bishop humming on f5, and a structure without a single weakness — everything the early …Qxd5 and …Bf5 promised. The other tabs show the opening's other faces: the rock-solid …c6 Qa5, the KID-like …Nf6 Modern, the dashing Icelandic and Portuguese gambits, the flexible …Qd6 Tiviakov, and the patient …Qd8 Gubinsky-Melts.", sayShort: '…Rxd5 — the active Scandinavian middlegame.', highlights: [H('d5'), H('f5')] }),
  ],
};
