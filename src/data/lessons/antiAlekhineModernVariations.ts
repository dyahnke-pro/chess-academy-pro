import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Alekhine (Modern, 4.Nf3) — per-variation master classes. The student
// plays WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json.
// Spines rebuilt with build-sound-spine.mjs (masters-DB most-played, engine-
// checked each ply, no both-sides blunder) to a middlegame: Larsen …dxe5 +0.55,
// Alburt …g6 +0.53, Schmid …Nb6 +0.41 — all healthy White space edges. The
// "Modern, Main Line" tab was dropped (a 9-ply prefix of the main lesson).
// Highlights mark named squares (lessonIntegrity: no pawn-origin arrows).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'];
const OID = 'anti-alekhine-modern';

/** vs 4...dxe5 (Larsen) — recapture Nxe5, keep the centre, c4 clamp (+0.55). */
const LARSEN_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Alekhine vs 4...dxe5 (Larsen) — the central clamp', minutes: 6,
  beats: [
    b({ id: 'alk-lar-1', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5',
      say: "The Larsen: Black rushes dxe5 to trade off your advanced e-pawn early. You recapture Nxe5, and the knight sits proudly in the centre. Black has relieved a little space pressure, but at the cost of time — and your easy, harmonious development gives you a stable, pleasant edge.",
      sayShort: "…dxe5, Nxe5 — a proud central knight.",
      highlights: [H('e5', KEY), H('d5', SOFT)] }),
    b({ id: 'alk-lar-2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O',
      say: "Black shores up the knight with c6 and develops the light bishop actively to f5, getting it outside the pawn chain before e6. You develop calmly — Be2 and O-O — king safe, no weaknesses. The knight on e5 remains a proud central anchor and you keep the freer game.",
      sayShort: "Be2, O-O — calm, king safe.",
      highlights: [H('f5', SOFT), H('e5', KEY)] }),
    b({ id: 'alk-lar-3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7 Nf3 e6 c4',
      say: "Black challenges the centralized knight with Nd7; you simply retreat it to f3, keeping everything intact, and Black plays e6. Now you strike with c4 — kicking the d5-knight and claiming a broad centre with pawns on c4 and d4. Your space advantage steadily grows.",
      sayShort: "c4 — kick the knight, big centre.",
      highlights: [H('c4', KEY), H('d5', ATK), H('d4', SOFT)] }),
    b({ id: 'alk-lar-4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7 Nf3 e6 c4 N5f6 Bf4 Nh5 Be3 Bd6',
      say: "The knight retreats to f6 and lunges to h5 trying to trade your dark bishop; you sidestep with Be3, keeping the pair. Black develops the bishop to d6. You stand comfortably better: the big c4-d4 centre, more space, and Black's knight stranded on the rim at h5. A clean, durable pull.",
      sayShort: "Be3 — dodge the trade, knight stuck on h5.",
      highlights: [H('e3', KEY), H('h5', ATK), H('c4', SOFT), H('d4', SOFT)] }),
  ],
};

/** vs 4...g6 (Alburt) — Bc4-b3 on f7, Ng5+Qf3 pressure, Ne4 outpost (+0.53). */
const ALBURT_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Alekhine vs 4...g6 (Alburt) — pressure f7, then e4', minutes: 6,
  beats: [
    b({ id: 'alk-alb-1', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7',
      say: "The Alburt: Black fianchettoes with g6 and Bg7, planning to pressure your centre from afar. You develop the bishop to c4 and, after Nb6, tuck it back to b3 where it eyes f7 and the a2-g8 diagonal. Your big e5-d4 centre cramps Black and your pieces are already the more active.",
      sayShort: "Bb3 — aim at f7 behind the big centre.",
      highlights: [H('b3', KEY), H('e5', SOFT), H('d4', SOFT)] }),
    b({ id: 'alk-alb-2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7 Ng5 e6 Qf3',
      say: "You pounce with Ng5, hitting f7, and Qf3 piles onto the same weak point — the f7-pawn, forever the Achilles' heel of an uncastled black king. Black must cover with e6, conceding a hole and a tempo. Your initiative is real and growing move by move.",
      sayShort: "Ng5, Qf3 — double up on f7.",
      highlights: [H('g5', KEY), H('f3', KEY), H('f7', ATK)] }),
    b({ id: 'alk-alb-3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7 Ng5 e6 Qf3 Qe7 Ne4 h6 exd6 cxd6',
      say: "Black defends with Qe7 and challenges the g5-knight, which leaps to the fine e4-outpost. After the central trade exd6 cxd6, the position opens with your knight dominating the centre and your pieces the more active. Black's d6-pawn and airy kingside are lasting concerns.",
      sayShort: "Ne4 — the dominant central outpost.",
      highlights: [H('e4', KEY), H('d6', ATK)] }),
    b({ id: 'alk-alb-4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7 Ng5 e6 Qf3 Qe7 Ne4 h6 exd6 cxd6 Bf4 d5',
      say: "You develop Bf4, leaning on the weak d6-pawn, and Black defends by pushing d5. That nudges your e4-knight, but it leaves Black with a static pawn on d5 to babysit. You remain clearly better — the two bishops, the safer structure, and pressure all across the board.",
      sayShort: "Bf4 — hit d6, keep the bind.",
      highlights: [H('f4', KEY), H('d5', ATK)] }),
  ],
};

/** vs 4...Nb6 (Schmid) — a4-a5 space, Bb5+ disruption, Ne4 outpost (+0.41). */
const SCHMID_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Alekhine vs 4...Nb6 (Schmid) — space and the e4 outpost', minutes: 6,
  beats: [
    b({ id: 'alk-sch-1', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 a4 a5 Bb5+',
      say: "The Schmid: Black retreats the knight to b6 rather than keep it fighting in the centre. You seize the chance to expand with a4, and after a5 fixes the queenside, you check with Bb5+ — developing with tempo and disrupting Black's coordination before he can finish developing.",
      sayShort: "a4, Bb5+ — space and a nagging check.",
      highlights: [H('b5', KEY), H('a4', SOFT), H('a5', SOFT)] }),
    b({ id: 'alk-sch-2', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 a4 a5 Bb5+ c6 Bd3 Bg4',
      say: "Black blocks the check with c6, and you redeploy the bishop to d3, training it toward the kingside. Black pins your knight with Bg4. You enjoy a comfortable space edge behind the e5-d4 pawns with easy development — there is simply nothing here for Black to feel good about.",
      sayShort: "Bd3 — redeploy toward the king.",
      highlights: [H('d3', KEY), H('g4', SOFT), H('e5', SOFT)] }),
    b({ id: 'alk-sch-3', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 a4 a5 Bb5+ c6 Bd3 Bg4 exd6 Qxd6 O-O',
      say: "You clarify with exd6, and after Qxd6 you castle to safety. The e5-pawn is gone, but so is Black's cramping burden — now it is a straight race of development, and you are ahead: castled, the more active pieces, and the d4-pawn anchoring the centre.",
      sayShort: "exd6, O-O — ahead in development.",
      highlights: [H('d6', SOFT), H('d4', KEY)] }),
    b({ id: 'alk-sch-4', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 Nb6 a4 a5 Bb5+ c6 Bd3 Bg4 exd6 Qxd6 O-O e6 Nbd2 Qc7 Ne4 N8d7',
      say: "Black develops with e6 and Qc7; you bring the knight to the powerful e4-outpost. You hold a small but pleasant, durable edge: more space, the safer king, and the more active knights. Black is solid but passive — squeeze him patiently and the extra room will tell.",
      sayShort: "Ne4 — outpost, a durable pull.",
      highlights: [H('e4', KEY)] }),
  ],
};

export const ANTI_ALEKHINE_MODERN_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Modern Variation, Larsen Variation`]: LARSEN_LESSON,
  [`${OID}::Modern Variation, Alburt Variation`]: ALBURT_LESSON,
  [`${OID}::Modern Variation, Schmid Variation`]: SCHMID_LESSON,
};
