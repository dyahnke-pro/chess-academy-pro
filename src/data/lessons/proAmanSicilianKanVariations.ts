import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Sicilian Kan variation lessons. Keyed
// `${openingId}::${variation.name}` to match pro-repertoires.json names exactly.
// Each spine is his real data line walked to a middlegame; two registers,
// lead-the-eye arrows on non-pawn pieces only.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:chess-fundamentals',
  'concept:pos-development',
  'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_SICILIAN_KAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Open Kan main line: Bd3 + f4 (127 games at this spine, 78%) ──
  'pro-aman-sicilian-kan::Open Kan (Bd3 + f4)': {
    openingId: 'pro-aman-sicilian-kan',
    title: 'Open Kan — Bd3, f4, and the …b5 Race',
    minutes: 9,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'a6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6', highlights: [H('d6'), H('a6'), H('b5')],
        say: "The Kan's signature: …a6. It slams the door on Nb5 so White gets no knight hop into d6 or b5, and it clears the way for …b5, the queenside expansion that powers Black's whole plan.",
        sayShort: '…a6 — stop Nb5, prep …b5.' }),
      b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('e5'), H('b5'), H('c7')],
        say: "…Qc7, the Bastrikov setup — the queen eyes the e5-square and the half-open c-file, discouraging White's e5 break and supporting the coming …b5 and …Bb7.",
        sayShort: '…Qc7 — eye e5, back …b5.' }),
      b({ id: 'nf6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6', arrows: [A('g8', 'f6')], highlights: [H('e4')],
        say: "White develops the bishop to d3; Black answers …Nf6, hitting the e4-pawn and making White attend to the centre before launching anything.",
        sayShort: '…Nf6 — hit e4, develop.' }),
      b({ id: 'd6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6', highlights: [H('d6'), H('e5')],
        say: "Both sides castle and …d6 builds the small Scheveningen shell — it controls e5 and gives the pieces a stable home. Solid first; the expansion comes next.",
        sayShort: '…d6 — control e5, solid shell.' }),
      b({ id: 'nbd7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7', arrows: [A('b8', 'd7')], highlights: [H('b5'), H('e5'), H('d7')],
        say: "White grabs kingside space with f4; Black stays unfazed with …Nbd7 — flexible development ready to support the …b5 and …e5 breaks. The classic opposite-wings picture.",
        sayShort: '…Nbd7 — flexible, ready to break.' }),
      b({ id: 'b5', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Bd3 Nf6 O-O d6 f4 Nbd7 Kh1 b5', highlights: [H('b4'), H('b5'), H('b7')],
        say: "White tucks the king with Kh1 and Black strikes …b5! The queenside expansion is the point of …a6 and …Qc7 — push where you're strong, ready for …Bb7 on the long diagonal and …b4 to kick the c3-knight. Both sides race on opposite wings, and Black is fully in the fight.",
        sayShort: '…b5 — expand, race the queenside.' }),
    ],
  },

  // ── Taimanov with ...Nc6 (200 games, 81%) ──
  'pro-aman-sicilian-kan::Taimanov (...Nc6)': {
    openingId: 'pro-aman-sicilian-kan',
    title: 'Kan into Taimanov — the ...Nc6 Pin Plan',
    minutes: 9,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'nc6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6', arrows: [A('b8', 'c6')], highlights: [H('a6'), H('d4')],
        say: "When Black develops …Nc6 instead of …a6, it's the Taimanov — the knight pressures the d4-knight immediately and keeps the structure fluid. His best-scoring Kan branch at 81%. Same family, sharper piece play.",
        sayShort: '…Nc6 — pressure d4, Taimanov.' }),
      b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('e5'), H('a6'), H('c7')],
        say: "…Qc7 again — the Bastrikov queen, eyeing e5 and the c-file. The setup is consistent across the whole Kan-Taimanov complex: knight out, queen to c7, then …a6 and the pawn breaks.",
        sayShort: '…Qc7 — eye e5, c-file.' }),
      b({ id: 'a6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6', highlights: [H('a6'), H('b5')],
        say: "White develops to e3 and Black slots in …a6 — the same anti-Nb5, pro-…b5 move as the pure Kan. Black keeps every Sicilian trump: the half-open c-file, the queenside majority, the dark-square play.",
        sayShort: '…a6 — stop Nb5, prep …b5.' }),
      b({ id: 'nf6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6', arrows: [A('g8', 'f6')], highlights: [H('e4')],
        say: "…Nf6 develops and hits e4. Every piece comes out with a job — nothing passive, nothing loose. This is the Building-Habits discipline: sound development before any commitment.",
        sayShort: '…Nf6 — hit e4, develop.' }),
      b({ id: 'bb4', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6 O-O Bb4', arrows: [A('f8', 'b4')], highlights: [H('a3'), H('c3')],
        say: "Castled and ready, Black plays the active …Bb4 — pinning the c3-knight and pressuring e4. It provokes White into committing the queenside and hands Black the bishop pair if White breaks the pin with a3. Black is comfortable and fighting.",
        sayShort: '…Bb4 — pin c3, pressure e4.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6 O-O Bb4 Na4 O-O', highlights: [H('b5'), H('d5'), H('e4'), H('g8')],
        say: "White sidesteps with Na4, eyeing the c5-square; Black calmly castles into a healthy middlegame. The pieces are coordinated, the king is safe, and the …b5 and …d5 breaks loom. A typical Taimanov: flexible, equal, full of play for both sides.",
        sayShort: '…O-O — safe, breaks loom.' }),
    ],
  },

  // ── Maróczy Bind with 5.c4 (189 games, 73%) ──
  'pro-aman-sicilian-kan::Maróczy Bind (5.c4)': {
    openingId: 'pro-aman-sicilian-kan',
    title: 'Kan vs the Maróczy Bind — Patient Pressure',
    minutes: 9,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'c4', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4', highlights: [H('c4'), H('d5')],
        say: "White plays the Maróczy Bind, clamping the d5-square with two pawns to deny Black the freeing …d5 break. Against a bind, you don't panic; you develop, pressure the pawns, and pick your moment.",
        sayShort: 'c4 — the Maróczy clamp on d5.' }),
      b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6', arrows: [A('g8', 'f6')], highlights: [H('c7')],
        say: "…Qc7 and …Nf6 — the familiar setup, plus the queen leans on the c4-pawn down the half-open file. The c4-pawn is a target as much as a clamp; Black builds pressure on it.",
        sayShort: '…Qc7, …Nf6 — lean on c4.' }),
      b({ id: 'd6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6 Be2 d6', highlights: [H('b5'), H('d5'), H('d6'), H('e5')],
        say: "…d6 takes a small, solid centre and clamps the e5-square shut. The structure is the hedgehog's cousin: low, springy, hard to break — and ready to uncoil with …b5 or …d5 when prepared.",
        sayShort: '…d6 — low, springy centre.' }),
      b({ id: 'b6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6 Be2 d6 O-O b6', highlights: [H('b6'), H('b7')],
        say: "…b6 prepares …Bb7, fianchettoing the bishop onto the long diagonal to bear down on e4 and contest the light squares the bind tries to own. This is the hedgehog plan against the Maróczy — patient, coiled.",
        sayShort: '…b6 — fianchetto, hit e4.' }),
      b({ id: 'bb7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6 Be2 d6 O-O b6 Be3 Bb7', arrows: [A('c8', 'b7')], highlights: [H('e4')],
        say: "…Bb7 lands on the long diagonal, staring straight at e4 through the centre. Both Black bishops and the c7-queen now eye White's centre; the bind looks impressive but it's under quiet, constant pressure.",
        sayShort: '…Bb7 — long diagonal on e4.' }),
      b({ id: 'middlegame', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 c4 Qc7 Nc3 Nf6 Be2 d6 O-O b6 Be3 Bb7 f3 Nbd7 Qd2', highlights: [H('b5'), H('d5')],
        say: "White props the centre with f3 and lines up Qd2; Black completes with …Nbd7, the full hedgehog. The position is coiled and patient — Black waits for the right moment to uncoil with …b5 or …d5, breaking the bind on Black's terms. Equal, rich, and exactly the kind of slow grind Aman thrives in.",
        sayShort: '…Nbd7 — full hedgehog, await the break.' }),
    ],
  },

  // ── vs the Alapin 2.c3 (211 games, 73%) ──
  'pro-aman-sicilian-kan::vs Alapin (2.c3)': {
    openingId: 'pro-aman-sicilian-kan',
    title: 'Sicilian vs the Alapin — Free and Equal',
    minutes: 8,
    orientation: 'black',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'nf6', moves: 'e4 c5 c3 Nf6', arrows: [A('g8', 'f6')], highlights: [H('d4'), H('e4')],
        say: "The Alapin, with c3, wants a big pawn centre with d4. Black hits back instantly with …Nf6, attacking e4 and forcing White to push, which costs a tempo. Meet a slow system with an active piece.",
        sayShort: '…Nf6 — hit e4 at once.' }),
      b({ id: 'nd5', moves: 'e4 c5 c3 Nf6 e5 Nd5', arrows: [A('f6', 'd5')], highlights: [H('d5')],
        say: "White chases with e5, Black hops to d5 — a strong central outpost that the c3-pawn can't kick. The knight sits proudly in the middle of the board while White's centre commits.",
        sayShort: '…Nd5 — strong central outpost.' }),
      b({ id: 'nc6', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6', arrows: [A('b8', 'c6')], highlights: [H('d4')],
        say: "After the centre trade Black develops …Nc6, piling on d4 and the centre. Black's pieces come out fast and free — exactly the easy, active game the Alapin was trying to avoid.",
        sayShort: '…Nc6 — pile on d4.' }),
      b({ id: 'nb6', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 Bc4 Nb6', arrows: [A('d5', 'b6')], highlights: [H('d6'), H('c4')],
        say: "White attacks the d5-knight with Bc4; Black retreats …Nb6, gaining a tempo by hitting the bishop and clearing the d-file for the coming …d5 or …d6 break. Every tempo counts.",
        sayShort: '…Nb6 — hit the bishop, gain time.' }),
      b({ id: 'd5break', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 Bc4 Nb6 Bb3 d5', highlights: [H('d5')],
        say: "…d5! The freeing break. Black strikes at the centre, opens lines for the pieces, and dissolves White's space advantage. This is the thematic equalizer against the Alapin — once …d5 lands, Black is fully free.",
        sayShort: '…d5 — the freeing break.' }),
      b({ id: 'middlegame', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6', arrows: [A('c8', 'e6')], highlights: [H('e6'), H('b3')],
        say: "White takes en passant and Black recaptures with the queen, then develops …Be6 — offering to trade off White's active light-squared bishop. The position is open, symmetrical, and dead equal, with Black's pieces every bit as active as White's. The Alapin's space dream is gone.",
        sayShort: '…Be6 — trade bishops, equal.' }),
    ],
  },
};
