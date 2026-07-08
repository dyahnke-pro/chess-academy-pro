import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Caro Fantasy (3.f3) — per-variation master classes. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json.
// Each spine both-sides-sound (full-ply engine scan, no blunder) and engine-
// verified at the terminus from White's side: …e6 ≈ balanced sharp race, …g6
// ≈ equal with the easier game, …Qb6 +0.21. The Fantasy is an honest surprise
// weapon — framed truthfully, never over-claimed. Arrows: non-pawn pieces,
// clear sight-line (lessonIntegrity). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'];
const OID = 'anti-caro-fantasy';

/** vs 3...e6 — Black declines into a French-type structure; opposite-side
 *  castling race, objectively balanced but rich in practical chances. */
const E6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Fantasy vs 3...e6 — the opposite-wings race', minutes: 6,
  beats: [
    b({ id: 'fe6-1', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4',
      say: "Against the Fantasy's f3, Black can sidestep the sharp captures with e6, steering into a solid French-type structure. Bb4 pins your knight on c3. This is the calm road — a maneuvering battle rather than a shootout — where your broad e4-d4-f3 pawn centre and the plan of castling queenside give you a comfortable, purposeful game.",
      sayShort: "…e6 — the solid French-type decline.",
      highlights: [H('b4', SOFT), H('c3', KEY)] }),
    b({ id: 'fe6-2', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3 O-O',
      say: "You develop with purpose: Bf4 takes the fine b8-h2 diagonal, and Qd3 supports the centre while eyeing queenside castling. Black tucks the king away with O-O and brings the knight to e7. The battle lines are drawn — with the kings set to castle on opposite wings, this becomes a race of pawn storms.",
      sayShort: "Bf4, Qd3 — prep the long castle.",
      highlights: [H('f4', KEY), H('d3', SOFT)] }),
    b({ id: 'fe6-3', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3 O-O a3 Ba5 h4 b5',
      say: "a3 nudges the bishop, which slides to a5 to keep the pin; then h4 lights the fuse on the kingside where Black's king now lives. Black must strike back fast, and does — b5, rolling on the queenside toward where you intend to castle. Both attacks are underway at once.",
      sayShort: "h4 vs …b5 — the race is on.",
      highlights: [H('h4', ATK), H('b5', SOFT)] }),
    b({ id: 'fe6-4', moves: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 Bf4 Ne7 Qd3 O-O a3 Ba5 h4 b5 h5 h6 Ne2 Nd7 O-O-O b4',
      say: "h5 clamps the kingside, you reroute with Ne2 toward g3, and castle into the fray with O-O-O; Black hits back with b4. Be honest about this one: it is a genuine double-edged race, objectively balanced, but bursting with practical chances. You know the plan cold — pry open the h-file at his king while he throws pawns at yours. Play the attack you understand best.",
      sayShort: "O-O-O vs …b4 — double-edged, know your plan.",
      highlights: [H('h5', ATK), H('c1', KEY), H('b4', SOFT)] }),
  ],
};

/** vs 3...g6 — modern fianchetto; Na4 harasses the queen, Nc5 lands a fine
 *  outpost, e5 wedge. Roughly equal with the easier, more spatial game. */
const G6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Fantasy vs 3...g6 — the c5 outpost + e5 wedge', minutes: 6,
  beats: [
    b({ id: 'fg6-1', moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6',
      say: "Black chooses a modern fianchetto with g6 and Bg7, training the bishop on your centre along the long diagonal. Be3 shores up d4, and Black probes with Qb6, leaning on both the b2-pawn and the d4-point. The queen sortie looks active, but it will cost Black time — meet it accurately.",
      sayShort: "…g6/…Bg7 met by Be3; …Qb6 probes.",
      highlights: [H('g7', SOFT), H('b6', ATK), H('d4', KEY)] }),
    b({ id: 'fg6-2', moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Na4 Qa5+ c3 e5',
      say: "Na4 hits the queen and gains a tempo; after Qa5+ you interpose c3, which also braces d4. Now Black challenges the centre head-on with e5. The tension peaks — but every piece you have is doing a job while Black's queen has been chased to the edge.",
      sayShort: "Na4 — gain time, chase the queen.",
      highlights: [H('a4', KEY), H('e5', SOFT)] }),
    b({ id: 'fg6-3', moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Na4 Qa5+ c3 e5 dxe5 Ne7 Nc5 Bxe5',
      say: "You take dxe5, Black develops Ne7, and the knight leaps to c5 — a magnificent outpost buried in Black's camp, striking b7 and d7. Black wins the e5-pawn back with the bishop, but that knight on c5 is the finest piece on the board and the whole reason this line is pleasant for White.",
      sayShort: "Nc5 — the dominant outpost.",
      arrows: [A('c5', 'b7')], highlights: [H('c5', KEY), H('d7', SOFT)] }),
    b({ id: 'fg6-4', moves: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Na4 Qa5+ c3 e5 dxe5 Ne7 Nc5 Bxe5 f4 Bg7 e5 f6',
      say: "f4 kicks the bishop back to g7, and you clamp down with e5 — a big pawn wedge cramping Black and seizing space. Black nibbles with f6, but you stand comfortably: the c5-knight dominates, your pawns squeeze, and the game is dynamically balanced with the easier, more spatial position for White.",
      sayShort: "e5 — the cramping wedge, easier game.",
      highlights: [H('e5', ATK), H('c5', KEY)] }),
  ],
};

/** vs 3...Qb6 — early queen sortie; central trades and a queen swap leave White
 *  a centralized knight and a space edge. Engine-verified +0.21. */
const QB6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Fantasy vs 3...Qb6 — trade down to a space edge', minutes: 6,
  beats: [
    b({ id: 'fq6-1', moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5',
      say: "Black's early Qb6 leans on d4 and b2 at once. You develop naturally with Nc3, and after the central trades dxe4 fxe4, Black strikes with e5 to hit your d4-pawn. The centre is about to dissolve into an open, piece-play position — exactly where your quicker development counts.",
      sayShort: "…Qb6 met by Nc3; centre opens.",
      highlights: [H('b6', ATK), H('e5', SOFT), H('d4', KEY)] }),
    b({ id: 'fq6-2', moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5 Nf3 exd4 Qxd4 Qxd4 Nxd4',
      say: "Nf3 attacks the e5-pawn; Black plays exd4 and the queens come off — Qxd4 Qxd4 Nxd4. You reach a pleasant queenless middlegame with a knight beautifully centralized on d4 and a healthy space edge from the e4-pawn. There is simply nothing here for Black to attack.",
      sayShort: "Nxd4 — queens off, knight centralized.",
      highlights: [H('d4', KEY), H('e4', SOFT)] }),
    b({ id: 'fq6-3', moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5 Nf3 exd4 Qxd4 Qxd4 Nxd4 Bc5 Be3 Nd7',
      say: "Black develops with tempo — Bc5 attacks your d4-knight; you calmly defend it and challenge the bishop with Be3. Black brings the knight to d7. You are comfortably better: more space, a sounder structure, and the more harmonious pieces. Trade when it suits you and press the endgame edge.",
      sayShort: "Be3 — defend d4, challenge the bishop.",
      highlights: [H('c5', SOFT), H('e3', KEY), H('d4', KEY)] }),
    b({ id: 'fq6-4', moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 fxe4 e5 Nf3 exd4 Qxd4 Qxd4 Nxd4 Bc5 Be3 Nd7 O-O-O Ngf6 Na4 Nxe4',
      say: "You castle queenside — O-O-O — connecting the rooks and tucking the king safe; Na4 hits the c5-bishop. Black snatches the e4-pawn with Nxe4, but it is only a loan: your a4-knight bites the c5-bishop, your rooks are active, and you win the pawn straight back with a lasting pull. A clean, pleasant edge for White.",
      sayShort: "Na4 — win the pawn back, keep the pull.",
      highlights: [H('a4', KEY), H('c5', ATK), H('e4', SOFT)] }),
  ],
};

export const ANTI_CARO_FANTASY_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Maróczy Variation (e6)`]: E6_LESSON,
  [`${OID}::Maróczy Variation (g6)`]: G6_LESSON,
  [`${OID}::Maróczy Variation (Qb6)`]: QB6_LESSON,
};
