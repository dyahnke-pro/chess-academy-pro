import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Nimzo (Classical, 4.Qc2) — per-variation master classes. The student
// plays WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json.
// Noa …d5 (+0.11, a nagging pull) and Berlin …c5 (+0.44, big-centre edge).
// Spines rebuilt with build-sound-spine.mjs (no both-sides blunder). The
// "Classical Variation" tab was dropped (an 8-ply prefix of the main lesson).
// Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'];
const OID = 'anti-nimzo-qc2';

/** vs 4...d5 (Noa) — trade, target the loose d5-pawn, contain the …g5/…h5
 *  kingside lash-out; a nagging pull (+0.11). */
const NOA_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Nimzo 4.Qc2 vs …d5 (Noa) — press d5, absorb the storm', minutes: 6,
  beats: [
    b({ id: 'nim-noa-1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 d5 cxd5 exd5',
      say: "The Noa: against your Qc2 Nimzo, Black hits back in the centre with d5. After cxd5 exd5 Black is left with a slightly loose d5-pawn to nurse. The bishop on b4 still pins your knight, but the whole game will revolve around pressure on that d5-point — and Qc2 keeps your structure clean.",
      sayShort: "…d5, cxd5 exd5 — target the d5-pawn.",
      highlights: [H('d5', ATK), H('b4', SOFT)] }),
    b({ id: 'nim-noa-2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 d5 cxd5 exd5 Bg5 h6 Bh4 Nc6',
      say: "You develop Bg5, and after h6 retreat to h4 — keeping the pin on the f6-knight, a key defender of d5. Black develops Nc6. You are steadily building pressure against the d5-pawn while your pieces come out with tempo. Black must stay accurate to hold his centre together.",
      sayShort: "Bh4 — keep the pin on d5's defender.",
      highlights: [H('h4', KEY), H('d5', ATK)] }),
    b({ id: 'nim-noa-3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 d5 cxd5 exd5 Bg5 h6 Bh4 Nc6 e3 g5',
      say: "Black lashes out on the kingside with g5, chasing your bishop and starting a pawn storm; you solidify with e3. It looks aggressive, but those advancing pawns loosen Black's OWN king — the g5-h5 push is a double-edged sword that cuts the attacker as often as the defender.",
      sayShort: "e3 — solid; …g5 loosens Black's king.",
      highlights: [H('g5', SOFT), H('e3', KEY)] }),
    b({ id: 'nim-noa-4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 d5 cxd5 exd5 Bg5 h6 Bh4 Nc6 e3 g5 Bg3 h5 Bb5 h4 Be5 O-O',
      say: "You pin the c6-knight with Bb5 and plant your bishop powerfully on e5, dominating the centre and the dark squares while Black's kingside pawns hang overextended on g5 and h4. Black castles into it. The engine calls it roughly balanced with a nagging pull for White — the Noa's counterplay is contained and the initiative is yours.",
      sayShort: "Be5 — dominate; a nagging pull.",
      highlights: [H('b5', KEY), H('e5', KEY), H('g5', SOFT), H('h4', SOFT)] }),
  ],
};

/** vs 4...c5 (Berlin) — dxc5, a3 wins the tempo back, then Bf4/Rd1/e4 for a
 *  big-centre space edge (+0.44). */
const BERLIN_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Nimzo 4.Qc2 vs …c5 (Berlin) — big centre, more space', minutes: 6,
  beats: [
    b({ id: 'nim-ber-1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 c5 dxc5 O-O',
      say: "The Berlin: Black meets Qc2 with c5, and after dxc5 castles, planning to regain the pawn later. For now you are a pawn up, with the c5-pawn cramping Black's queenside. The bishop on b4 still pins your knight, but you have a healthy extra pawn and time to organise.",
      sayShort: "…c5, dxc5 — a pawn up for now.",
      highlights: [H('c5', KEY), H('b4', SOFT)] }),
    b({ id: 'nim-ber-2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 c5 dxc5 O-O a3 Bxc5 Nf3 b6',
      say: "a3 puts the question to the pinning bishop, which recaptures on c5 — Black regains the pawn, but you've won a tempo and smooth development in return. Nf3 develops and Black fianchettoes with b6. Material is level and you have the freer, more purposeful game.",
      sayShort: "a3 — win the tempo, easy development.",
      highlights: [H('c5', SOFT), H('c4', SOFT)] }),
    b({ id: 'nim-ber-3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 c5 dxc5 O-O a3 Bxc5 Nf3 b6 Bf4 Bb7 Rd1 Nc6',
      say: "You develop with purpose: Bf4 takes the fine b8-h2 diagonal, and Rd1 seizes the half-open d-file, eyeing Black's d7-pawn. Black completes the fianchetto with Bb7 and develops Nc6. Your pieces are the more active and the pressure builds down the d-file.",
      sayShort: "Bf4, Rd1 — active pieces, d-file pressure.",
      highlights: [H('f4', KEY), H('d1', KEY), H('d7', ATK)] }),
    b({ id: 'nim-ber-4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 c5 dxc5 O-O a3 Bxc5 Nf3 b6 Bf4 Bb7 Rd1 Nc6 b4 Be7 e4 Nh5',
      say: "You expand with b4 on the queenside and crown the setup with e4 — a broad, dominating pawn centre. Black's Nh5 pokes at your bishop, but you simply reposition it. With the big centre and more space, you hold a clear edge. The Berlin's early c5 has left Black passive and cramped.",
      sayShort: "e4 — big centre, clear edge.",
      highlights: [H('b4', SOFT), H('e4', KEY), H('f4', SOFT)] }),
  ],
};

export const ANTI_NIMZO_QC2_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Classical Variation, Noa Variation`]: NOA_LESSON,
  [`${OID}::Classical Variation, Berlin Variation, Pirc Variation`]: BERLIN_LESSON,
};
