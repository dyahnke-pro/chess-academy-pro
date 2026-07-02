import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky — all remaining opening lessons. Spines + variations
// pulled from his actual chess.com game corpus (140k games scanned,
// trees under data/sources/danielnaroditsky-trees/). Every beat carries
// both `say` (full Watch) and `sayShort` (≤8-word Learn cue) per the
// G5 verbosity contract. Voice paraphrases his recurring teaching
// framing (sourced: listudy.org speedrun principles + game corpus).

const ATK = 'rgba(40,185,95,0.92)';
const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SOURCES_ALAPIN = ['https://www.chess.com/openings/Alapin-Sicilian-Defense'];
const SOURCES_NAJDORF = ['https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];
const SOURCES_KID = ['https://www.chess.com/openings/Kings-Indian-Defense'];
const SOURCES_ALEK = ['https://www.chess.com/openings/Alekhines-Defense'];
const SOURCES_KIA = ['https://www.chess.com/openings/Kings-Indian-Attack'];
const SOURCES_ROSS = ['https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
const SOURCES_JOB = ['https://www.chess.com/openings/Jobava-London-System'];
const SOURCES_RUY = ['book:ruy-lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];

// ============================================================
// ALAPIN SICILIAN (white) — his most-played anti-Sicilian, 2,752
// games, 73.8% score. The 2...Nf6 spine going into the Smith-Morra-
// Botvinnik centre push.
// ============================================================
export const PRO_NAR_ALAPIN_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  title: "This repertoire's Alapin — c3 against the Sicilian",
  minutes: 14,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_ALAPIN,
  beats: [
    b({
      id: 'open', moves: 'e4 c5 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "This repertoire's anti-Sicilian. c3 isn't theory — it's a setup move. The whole point is move three: d4, with the pawn supported. We sidestep heavy Sicilian theory entirely and head for a position where practical chances to outplay matter more than memorisation. Solid, flexible, and surprisingly aggressive once the pieces find their squares.",
      sayShort: 'c3 — sets up the d4 push.',
    }),
    b({
      id: 'response', moves: 'e4 c5 c3 Nf6 e5 Nd5',
      arrows: [{ from: 'e5', to: 'd6', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black's main answer is Nf6 attacking e4. We push e5, kicking the knight to d5 where it sits awkwardly — no support, no good retreat squares. Black has bought one tempo for the next ten moves of awkwardness.",
      sayShort: 'e5 — kick the knight to d5.',
    }),
    b({
      id: 'centre', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4',
      arrows: [{ from: 'c4', to: 'd5', color: ATK }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Nf3 + Bc4. The bishop attacks the knight on d5 directly — once Black moves the knight, the diagonal opens up toward f7 for the long-term attacking plan. Black has to react; we keep the initiative throughout the opening.",
      sayShort: 'Bc4 — hit the d5-knight.',
    }),
    b({
      id: 'displace', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5',
      highlights: [{ square: 'b3', color: KEY }, { square: 'd5', color: KEY }],
      say: "Nb6 chases the bishop, Bb3 keeps the diagonal. Now …d5 looks active for Black but it's exactly the response we wanted. The e5-pawn gets a target, and our next move opens the position favorably.",
      sayShort: 'Bb3 — stay on the diagonal.',
    }),
    b({
      id: 'open-it-up', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O',
      arrows: [{ from: 'd1', to: 'd6', color: VIS }],
      highlights: [{ square: 'd6', color: KEY }, { square: 'g1', color: SOFT }],
      say: "exd6 en passant! Then Qxd6 and we castle short. Black's queen is exposed in the centre, our king is safe, our bishop on b3 stares at f7, and we're ahead in development by a tempo. From here this repertoire's plan is a4-a5-a6 cramping Black's queenside.",
      sayShort: 'exd6, O-O — centre open, king safe.',
    }),
    b({
      id: 'trade-bishops', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6',
      arrows: [{ from: 'b3', to: 'e6', color: ATK }],
      highlights: [{ square: 'e6', color: KEY }, { square: 'b3', color: SOFT }],
      say: "Black develops with Be6 offering the bishop trade. We take it — Bxe6 Qxe6 — because Black's light-squared bishop was their best piece, and the queen now sits awkwardly on e6 blocking the e-file for the rook. Trade your good piece for theirs whenever it removes their best defender.",
      sayShort: 'Bxe6 — remove their best piece.',
    }),
    b({
      id: 'crawl-a4', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4',
      arrows: [{ from: 'a4', to: 'a5', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'a5', color: SOFT }],
      say: "Now THE this repertoire signature: a4 starting the queenside crawl. This sequence — a4, then a5, then a6 — is the structural feature he plays for, the move-pattern that appears in roughly a quarter of the Alapin games at this position. There's no single tactical shot; it's logical piece development meeting positional smothering, and Black's pieces can't coordinate while we just methodically expand.",
      sayShort: 'a4 — queenside crawl begins.',
    }),
    b({
      id: 'crawl-a5', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5',
      arrows: [{ from: 'a5', to: 'a6', color: VIS }],
      highlights: [{ square: 'a5', color: KEY }, { square: 'b6', color: SOFT }],
      say: "Black retreats Qd7 trying to reorganise. We push a5 attacking the Nb6, forcing it back. The knight has nowhere good — Nd5 is fine but blockable; Nc8 is passive. Every move we make is a question Black can't answer cleanly.",
      sayShort: 'a5 — the knight has nowhere.',
    }),
    b({
      id: 'crawl-a6', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5 Nd5 a6',
      arrows: [{ from: 'a6', to: 'b7', color: ATK }],
      highlights: [{ square: 'a6', color: KEY }, { square: 'b7', color: SOFT }],
      say: "a6 — the crawl reaches its peak. We attack b7, fix Black's queenside pawns permanently, and create a long-term passed-pawn threat the moment Black has to deal with the …b6 weakness. The knight on d5 looks centralised but it can't help on the queenside.",
      sayShort: 'a6 — fix the queenside.',
    }),
    b({
      id: 'd4-finally', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5 Nd5 a6 b6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Black plays …b6 forced to stop a7, and NOW we open with d4 — the move c3 was setting up since move two. The centre opens with our king safe, our pieces developed, and Black's queenside cramped. Patience pays off.",
      sayShort: 'd4 — the centre opens at last.',
    }),
    b({
      id: 'central-piece', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5 Nd5 a6 b6 d4 e6 Ne5',
      arrows: [{ from: 'f3', to: 'e5', color: ATK }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Black completes development with …e6 and we plant Ne5 — central outpost attacking Nc6 and dominating the dark squares. Black's structural weaknesses are obvious: the doubled c-pawn, the cramped queenside, the awkward Nd5 position.",
      sayShort: 'Ne5 — central outpost.',
    }),
    b({
      id: 'queen-swing', moves: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bxe6 Qxe6 a4 Qd7 a5 Nd5 a6 b6 d4 e6 Ne5 Nxe5 dxe5 Be7 Qg4',
      arrows: [{ from: 'd1', to: 'g4', color: VIS }],
      highlights: [{ square: 'g4', color: KEY }, { square: 'g7', color: SOFT }],
      say: "After the knight trade and Be7, this is where the opening hands off to the middlegame — and look at what we have. The queen swings to g4 staring down at g7, the bishop on e7 is stuck defending, the king is still in the centre, the queenside is choked from the a6-push. From here the dominant ending across the decisive games is rook + minor + pawn, where the queenside passer becomes the conversion. The c3 setup was building toward exactly this for twelve moves.",
      sayShort: 'Qg4 — every piece working.',
    }),
  ],
};

// ============================================================
// NAJDORF (black) — 1,475 games, 65.3%, English Attack spine
// ============================================================
export const PRO_NAR_NAJDORF_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: "This repertoire's Najdorf — the sharpest fight",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_NAJDORF,
  beats: [
    b({
      id: 'sicilian', moves: 'e4 c5',
      highlights: [{ square: 'c5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "The Najdorf begins the way every Sicilian does — White claims the centre with e4, and we answer on the wing with c5. That refusal to mirror is the whole point: instead of a symmetrical e5, the c-pawn fights for the d4-square from the side and hands us an unbalanced game where Black plays for the full point, not a draw.",
      sayShort: 'c5 — the Sicilian imbalance.',
    }),
    b({
      id: 'd6', moves: 'e4 c5 Nf3 d6',
      highlights: [{ square: 'd6', color: KEY }, { square: 'e5', color: SOFT }],
      say: "White develops the knight to f3 and we play d6 — small, but it does two jobs at once. It takes the e5-square away from White's pieces so nothing can land there and cramp us, and it opens the diagonal for our light-squared bishop later. Flexible and solid, the Najdorf keeps every plan alive.",
      sayShort: 'd6 — deny e5, stay flexible.',
    }),
    b({
      id: 'open-sicilian', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4',
      arrows: [{ from: 'd4', to: 'e6', color: VIS }, { from: 'd4', to: 'f5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say: "White breaks with d4, we trade, and the knight recaptures on d4 — the Open Sicilian. That knight is White's pride, sitting in the centre eyeing e6 and f5. But we have the half-open c-file to work with and a healthy queenside majority. Both sides have their trumps; this is the sharpest battleground in chess.",
      sayShort: 'Nxd4 — the Open Sicilian centre.',
    }),
    b({
      id: 'najdorf-a6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "Nf6 pokes at e4 and forces Nc3 to defend it — and then the move that names the whole defense: a6. It develops nothing, and that's the genius of it. It claims the b5-square forever: no white knight or bishop can ever use b5 to harass us, and we've quietly prepared our own b5 to unroll the queenside. Patience now, fire later.",
      sayShort: 'a6 — claim b5 forever.',
    }),
    b({
      id: 'bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5',
      arrows: [{ from: 'g5', to: 'f6', color: ATK }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "Bg5 — the English Attack, White's most aggressive try and the one you'll meet most often. The bishop pins our f6-knight against the queen and threatens to take it, wrecking our kingside pawns. It also signals White's whole plan: castle long and throw the h- and g-pawns at our king. We must meet fire with a cool, prepared head.",
      sayShort: 'Bg5 — the English Attack pin.',
    }),
    b({
      id: 'e6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'e7', color: SOFT }],
      say: "e6 — small and unflashy, and exactly right. We refuse to weaken our structure with anything loose, we open the door for the bishop to come to e7 and break the pin, and we keep the position compact. The Najdorf's discipline: don't panic at the pin, just solve it move by move.",
      sayShort: 'e6 — refuse to weaken, prep Be7.',
    }),
    b({
      id: 'f4-be7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7',
      highlights: [{ square: 'f4', color: SOFT }, { square: 'e7', color: KEY }, { square: 'f6', color: SOFT }],
      say: "White plays f4, grabbing kingside space and preparing the pawn storm — and we calmly develop Be7. That bishop does the quiet, essential work: it defends the pinned knight and stands ready to break the pin entirely. We're not slowing down; we're building the springboard for our own counterattack.",
      sayShort: 'Be7 — support the knight, break the pin.',
    }),
    b({
      id: 'qf3-qc7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7',
      arrows: [{ from: 'c7', to: 'c3', color: ATK }],
      highlights: [{ square: 'c7', color: KEY }, { square: 'c3', color: SOFT }],
      say: "Qf3 lines White's queen up behind the coming storm; we answer Qc7. Look at where that queen points — straight down the half-open c-file at the c3-knight and toward the square White is about to castle into. That's the Najdorf's promise: the same file White wants to attack on is the file we already own. Our counterplay writes itself.",
      sayShort: 'Qc7 — seize the open c-file.',
    }),
    b({
      id: 'castle-long', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O',
      highlights: [{ square: 'c1', color: KEY }, { square: 'c7', color: SOFT }],
      say: "White castles queenside, and now the nature of the game is settled: opposite-side castling, which means a race. There's no maneuvering for a small edge here — both sides throw pawns and pieces at the enemy king, and whoever lands the blow first wins. The key fact in our favour: our queen already stares down the c-file at White's freshly-castled king. We have a head start.",
      sayShort: 'O-O-O — the race is on.',
    }),
    b({
      id: 'nbd7-g4-h6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6',
      highlights: [{ square: 'h6', color: KEY }, { square: 'g5', color: ATK }, { square: 'g4', color: SOFT }],
      say: "We develop Nbd7, White launches g4 to start the storm, and we play the precise h6 — poking the bishop and forcing White to decide right now. Either it takes on f6 (doubling our pawns but handing us the open g-file to attack along) or it retreats to the rim on h4. Making the opponent commit on our terms is how we win the tempo battle.",
      sayShort: 'h6 — force the bishop to decide.',
    }),
    b({
      id: 'bxf6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6 Bxf6',
      arrows: [{ from: 'f6', to: 'd4', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White takes and we recapture with the bishop — crucially, not the pawn. Our structure stays whole, and the bishop lands on f6 pointing straight down the long diagonal at the d4-knight and the heart of White's position. What looked like a concession becomes a strong piece aiming at the enemy king's cover.",
      sayShort: 'Bxf6 — recapture toward d4, keep structure.',
    }),
    b({
      id: 'nb6-plan', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6 Bxf6 h4 Nb6',
      arrows: [{ from: 'b6', to: 'c4', color: VIS }, { from: 'f6', to: 'd4', color: VIS }],
      highlights: [{ square: 'b6', color: KEY }, { square: 'c4', color: KEY }, { square: 'a4', color: SOFT }],
      say: "White pushes h4 to keep storming; we reroute with Nb6, heading for the c4- and a4-squares where the knight bites into White's queenside. Now count the attackers: the queen on the c-file, the bishop on the long diagonal, the knight swinging to c4, and our own a- and b-pawns ready to roll. Black is a tempo up in the race — engine-level near-equal, but at human speed this is the attacker's dream, and we're the attacker.",
      sayShort: 'Nb6 — knight to c4, race won.',
    }),
  ],
};

// ============================================================
// KID (black) — 4,432 games, 65%, Classical mainline
// ============================================================
export const PRO_NAR_KID_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "This repertoire's King's Indian — Mar del Plata fight",
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_KID,
  beats: [
    b({
      id: 'fianchetto', moves: 'd4 Nf6 c4 g6',
      arrows: [{ from: 'g7', to: 'a1', color: VIS }],
      highlights: [{ square: 'g6', color: KEY }],
      say: "The King's Indian. …Nf6 + …g6 starting the fianchetto. The Bg7 will be our most important piece — pointing down the long diagonal at White's queenside, holding our king, and supporting every kingside attack we'll launch. The whole opening is built around this bishop.",
      sayShort: '…g6 — fianchetto, the Bg7 is everything.',
    }),
    b({
      id: 'classical', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2',
      highlights: [{ square: 'e2', color: KEY }],
      say: "The Classical mainline — White builds the broad pawn centre with c4-d4-e4 and develops Be2 (passive but solid). Our setup is automatic: Bg7, O-O, then we strike at the centre.",
      sayShort: 'Classical — broad centre + Be2.',
    }),
    b({
      id: 'central-strike', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',
      arrows: [{ from: 'e5', to: 'd4', color: ATK }],
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say: "e5 — THE move. We challenge the d4 centre directly. White must choose: push d5 locking the position (and inviting our kingside attack), or trade with dxe5 / O-O, accepting a balanced game. Either way we've committed to the KID's identity.",
      sayShort: '…e5 — challenge the centre.',
    }),
    b({
      id: 'mar-del-plata', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3',
      highlights: [{ square: 'd4', color: KEY }, { square: 'c6', color: SOFT }],
      say: "exd4 / Nxd4 / Re8 — the modern Mar del Plata mainline. Our rook lifts to the open e-file, the knight on c6 hits the d4-knight, and the kingside expansion …Nh5 + …Nf4 is coming next. This repertoire's classical KID treatment.",
      sayShort: 'Mar del Plata — Re8, attack queued.',
    }),
    b({
      id: 'kingside-storm', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4',
      arrows: [{ from: 'f4', to: 'e2', color: ATK }, { from: 'f4', to: 'g2', color: ATK }],
      highlights: [{ square: 'f4', color: KEY }, { square: 'h5', color: SOFT }],
      say: "Nh5 reroutes the knight, then Nf4 lands on the prize square hitting both the Be2 and the g2-pawn. From here the kingside attack writes itself: the queen comes to h4 or g5, the …f5 break opens lines, and the Bg7 we've been protecting all opening finally finds its target on the white king.",
      sayShort: '…Nf4 — knight on the prize square.',
    }),
  ],
};

// ============================================================
// ALEKHINE (black) — 2,830 games, 68.7%, Modern variation
// ============================================================
export const PRO_NAR_ALEKHINE_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: "This repertoire's Alekhine — provoke the over-extension",
  minutes: 6,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_ALEK,
  beats: [
    b({
      id: 'provoke', moves: 'e4 Nf6',
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "The Alekhine. Move ONE we attack the e4-pawn — provoking White to over-extend. Every chess principle says 'develop knights to natural squares,' and the Alekhine asks: what if instead we make the OPPONENT over-extend by chasing us? This opening lives by a different rule.",
      sayShort: '…Nf6 — provoke the over-extension.',
    }),
    b({
      id: 'chase', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      arrows: [{ from: 'e5', to: 'd6', color: ATK }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'd6', color: KEY }],
      say: "e5 chases the knight to d5, d4 follows, and now …d6 hits the centre. White's pawn chain looks impressive — c2-d4-e5 — but every pawn forward is one less piece able to defend it. We're not afraid of space; we're going to undermine it.",
      sayShort: '…d6 — undermine the e5 wedge.',
    }),
    b({
      id: 'develop', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6',
      highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Nf3 develops, dxe5 trades the wedge for piece play, Nxe5 recaptures, and now …c6 supports the Nd5 and prepares queenside development. The centre is gone, our knight is well-placed, and we're already equal in development with much more flexibility.",
      sayShort: '…c6 — support the d5-knight.',
    }),
    b({
      id: 'modern-mainline', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
      arrows: [{ from: 'f5', to: 'b1', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }, { square: 'd7', color: KEY }],
      say: "Be2 / Bf5 / O-O / Nd7 — the Modern Alekhine mainline. Our Bf5 develops actively, no problem-bishop like in the Caro, and Nd7 prepares the …e6 spine that holds the rest of the position together. The structure is sound, the pieces are coordinated, and we've reached a real game from a move that the textbooks still call a provocation.",
      sayShort: '…Bf5 + …Nd7 — Modern mainline.',
    }),
  ],
};

// ============================================================
// KIA (white) — 18,216 games, 69.7%, his most-played opening
// ============================================================
export const PRO_NAR_KIA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-kia',
  title: "This repertoire's King's Indian Attack — system, not theory",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_KIA,
  beats: [
    b({
      id: 'system', moves: 'Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 — and here is the whole philosophy of this weapon: it is a SYSTEM, not a body of theory to memorise. Whatever Black does, we build the same King's Indian Attack setup — g3, Bg2, castle, d3, Nbd2, e4 — every single game. You learn the ideas once and play them forever; Black is the one who has to solve a fresh problem each time.",
      sayShort: 'Nf3 — a system, not theory.',
    }),
    b({
      id: 'fianchetto-start', moves: 'Nf3 Nf6 g3',
      highlights: [{ square: 'g3', color: KEY }, { square: 'g2', color: SOFT }],
      say: "Black mirrors with Nf6, and we start the fianchetto with g3. The bishop is headed for g2, where it will sit on the long light diagonal and become the quiet hero of the whole setup — pressuring Black's centre and queenside from a safe distance for the entire game.",
      sayShort: 'g3 — begin the fianchetto.',
    }),
    b({
      id: 'bishops', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7',
      highlights: [{ square: 'g2', color: KEY }, { square: 'g7', color: SOFT }],
      say: "g6, Bg2, Bg7 — both sides fianchetto and the bishops eye each other down the long diagonal. It looks symmetric, but it isn't a dead draw in waiting: we get to choose the central plan, and that first-move initiative is exactly the small, durable edge the system is built to nurse.",
      sayShort: 'Bg2 Bg7 — the long-diagonal bishops.',
    }),
    b({
      id: 'castle', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'g8', color: SOFT }],
      say: "Both kings castle into safety behind the fianchettoed bishops — the soundest shelter in chess. With the kings tucked away, neither side is rushing an attack yet; this becomes a patient battle for the centre and the better plan, which is precisely the terrain the KIA player wants.",
      sayShort: 'O-O — kings safe, now manoeuvre.',
    }),
    b({
      id: 'restraint', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5',
      highlights: [{ square: 'd3', color: KEY }, { square: 'd5', color: SOFT }],
      say: "d3 — the KIA's signature restraint. We keep the pawn modest, refusing to commit the centre, and let Black over-extend with d5 grabbing more space. That space can become a target: the more Black commits, the more levers we get to strike at it later with our own e4 break.",
      sayShort: 'd3 — restraint; let Black over-commit.',
    }),
    b({
      id: 'reroute', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5',
      arrows: [{ from: 'd2', to: 'c4', color: VIS }],
      highlights: [{ square: 'd2', color: KEY }, { square: 'c5', color: SOFT }],
      say: "Nbd2 develops the knight where it belongs in this system — not blocking the c-pawn, but ready to reroute to c4 or f1-e3 depending on where the action is. Black grabs still more space with c5. We're inviting the big centre precisely so we can undermine it.",
      sayShort: 'Nbd2 — the reroute knight.',
    }),
    b({
      id: 'e4-break', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4',
      highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: KEY }],
      say: "e4 — the thematic break that gives the King's Indian Attack its bite. We strike at Black's d5-pawn and open lines for the Bg2. From here the position pivots into the classic KIA plans: e4-e5 to gain a kingside space-grip, or a central resolution that hands our long-diagonal bishop open lines.",
      sayShort: 'e4 — the thematic KIA break.',
    }),
    b({
      id: 'plans', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4 Nc6 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Black develops Nc6 and we play c3, bracing the centre and preparing d4. Now the three classic KIA plans all run at once off the same setup: d4 to crack the centre, a4 to expand on the queenside, and Nh4 with f4 to storm the kingside. Black has to guard everywhere because we've committed to nothing. The engine calls it roughly level — a flexible, one-sided game to play where our understanding does the work.",
      sayShort: 'c3 — prep d4; three plans at once.',
    }),
  ],
};

// ============================================================
// ROSSOLIMO (white) — 4,151 games, 65.5%, vs ...d6 Sicilian
// ============================================================
export const PRO_NAR_ROSSOLIMO_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: "This repertoire's Rossolimo — sidestep the Sicilian theory",
  minutes: 5,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_ROSS,
  beats: [
    b({
      id: 'sidestep', moves: 'e4 c5 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Against the Sicilian, sidestep the mainlines. Nf3 develops normally; if Black plays …d6 we play Bb5+ (Moscow), if …Nc6 we play Bb5 (Rossolimo). Same idea, different move-orders.",
      sayShort: 'Nf3 — sidestep, wait for d6/Nc6.',
    }),
    b({
      id: 'moscow', moves: 'e4 c5 Nf3 d6 Bb5+',
      arrows: [{ from: 'b5', to: 'd7', color: ATK }],
      highlights: [{ square: 'b5', color: KEY }],
      say: "Bb5+ — the Moscow Variation. Black has THREE responses: …Bd7 (trade and accept passivity), …Nd7 (blockade and play solid), or …Nc6 (most-played, transposes to Rossolimo). Each one denies Black the theoretical fight they prepared for.",
      sayShort: 'Bb5+ — Moscow check.',
    }),
    b({
      id: 'plan', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1',
      arrows: [{ from: 'e1', to: 'e5', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'e1', color: KEY }],
      say: "Nd7 blockade, we castle, develop a-pawn-kicked Bd3 (back to the centre), Ngf6 from Black, and our rook lifts to e1 backing up the e-pawn. The plan is patient: build slowly, exchange bishops if they offer, transition to a small but persistent advantage.",
      sayShort: 'O-O + Bd3 + Re1 — patient build.',
    }),
    b({
      id: 'pressure', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1 b6 c4 Bb7 Nc3',
      highlights: [{ square: 'c4', color: KEY }, { square: 'c3', color: KEY }],
      say: "c4 / Nc3 — the Maroczy Bind structure. White owns the broad centre, has more space, easier development. Black's pieces are coordinated but cramped, and that cramp doesn't go away. From here we expand on the queenside with b4 or a4-a5, choking Black's bishop pair while our pieces find their best squares slowly.",
      sayShort: 'Maroczy bind — cramped, advantage.',
    }),
  ],
};

// ============================================================
// JOBAVA LONDON (white) — 2,170 games, 70.3%
// ============================================================
export const PRO_NAR_JOBAVA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  title: "This repertoire's Jobava London — aggressive d4 surprise",
  minutes: 5,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_JOB,
  beats: [
    b({
      id: 'open', moves: 'd4 d5 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "The Jobava London. Nc3 instead of the boring Nf3 — we're saying we want a tactical fight, not a positional grind. This repertoire popularized this for amateur play because it leads to sharp middlegames that punish under-prepared opponents.",
      sayShort: 'Nc3 — tactical fight, not London grind.',
    }),
    b({
      id: 'bishop', moves: 'd4 d5 Nc3 Nf6 Bf4',
      arrows: [{ from: 'f4', to: 'b8', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say: "Nf6 / Bf4 — the Jobava bishop placement. From f4 the bishop covers the long diagonal AND eyes c7 (Black's queenside hangs on its support). This is the bishop's natural square in this system, unlike the regular London where it sits on the meek e3-d2 diagonal.",
      sayShort: 'Bf4 — eye c7, the long diagonal.',
    }),
    b({
      id: 'central-strike', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4',
      arrows: [{ from: 'd4', to: 'd8', color: ATK }],
      highlights: [{ square: 'd4', color: KEY }],
      say: "Black tries the classical break …c5, we exchange and recapture with the queen — Qxd4 sitting in the centre, aiming at d8, threatening Nb5 and a6/d6 fork ideas. The queen is exposed but coordinated; Black's tempo to attack it costs them development.",
      sayShort: 'Qxd4 — centre queen, threatens tactics.',
    }),
    b({
      id: 'consolidate', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "…Nc6 hits our queen, we slide to d3 — the queen lands on a beautiful diagonal aiming at h7. From here e4 opens lines, the Bf4 holds the dark squares, and the whole kingside is loaded for one tempo we don't have to wait long for. Every Jobava game funnels into this exact position eventually.",
      sayShort: 'Qd3 — diagonal to h7, attack queued.',
    }),
    b({
      id: 'develop', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6 e3',
      highlights: [{ square: 'e3', color: KEY }],
      say: "...e6 e3 — Black develops the e-pawn supporting d5 and preparing ...Bd6 (the canonical Jobava bishop trade offer). We solidify with e3, keeping the structure flexible. KEY SQUARE: c7 (the Bf4 still aims here through any future trades).",
      sayShort: 'e3 — solidify the centre.',
    }),
    b({
      id: 'middlegame', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6 e3 Bd6 Bxd6 Qxd6 O-O-O',
      highlights: [{ square: 'c1', color: KEY }, { square: 'd6', color: SOFT }],
      say: "...Bd6 Bxd6 ...Qxd6 O-O-O — Black offers the bishop trade, we accept giving Black the doubled-d-pawn vulnerability (well, actually they keep structural integrity here, but the trade is fine for us), then castle long. STRUCTURAL TARGET: the kingside attack via g4-g5 + h-pawn storm. PAWN BREAK: e4 in the centre, g4 on the wing. The Jobava middlegame is on.",
      sayShort: 'O-O-O — kingside attack on.',
    }),
  ],
};

// ============================================================
// RUY LOPEZ (white) — 2,922 games, 62.5%, Closed Spanish
// ============================================================
export const PRO_NAR_RUY_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: "This repertoire's Ruy Lopez — pressure without commitment",
  minutes: 10,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_RUY,
  beats: [
    b({
      id: 'open-game', moves: 'e4 e5',
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: KEY }],
      say: "We open the game the classical way — e4, and Black meets us head-on with e5. This is the Open Game, the oldest argument in chess: both sides stake a claim in the centre and fight for it directly. The Ruy Lopez is our weapon here, the deepest and most respected way to squeeze an edge out of this symmetrical start.",
      sayShort: 'e4 e5 — the Open Game.',
    }),
    b({
      id: 'develop', moves: 'e4 e5 Nf3 Nc6',
      arrows: [{ from: 'f3', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: SOFT }],
      say: "Nf3 develops with a threat — it attacks Black's e5-pawn immediately, so Black must react. Nc6 is the natural defence, guarding e5 and developing a piece. Now the stage is set for the move that has defined top-level chess for over a century.",
      sayShort: 'Nf3 Nc6 — hit and defend e5.',
    }),
    b({
      id: 'ruy', moves: 'e4 e5 Nf3 Nc6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: ATK }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "Bb5 — the Ruy Lopez. Notice the idea: the bishop attacks the c6-knight, and that knight is the defender of Black's e5-pawn. We're not winning a pawn yet, but we're leaning on the whole point of Black's centre. This indirect pressure on e5, kept up move after move, is the soul of the Spanish.",
      sayShort: 'Bb5 — lean on the e5 defender.',
    }),
    b({
      id: 'morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4',
      arrows: [{ from: 'a4', to: 'c6', color: ATK }],
      highlights: [{ square: 'a4', color: KEY }],
      say: "a6 asks the bishop the question, and we answer with Ba4 — the Morphy, the main line by a mile. We keep the bishop on the a4-e8 diagonal, still eyeing the c6-knight, and refuse to trade it off. Black's a6 wasn't a waste, but it committed a pawn; we've kept all our pressure and lost nothing.",
      sayShort: 'Ba4 — keep the pin on c6.',
    }),
    b({
      id: 'nf6', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Black develops Nf6, striking at our e4-pawn. It looks like we must defend — but the Ruy's cool secret is that e4 is not really hanging: if Black grabs it, we get the initiative back with interest. So instead of a fearful defence, we just keep developing and castle.",
      sayShort: 'Nf6 — Black hits e4, we stay calm.',
    }),
    b({
      id: 'castle', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7',
      highlights: [{ square: 'g1', color: SOFT }, { square: 'e7', color: KEY }],
      say: "We castle, tucking the king away, and Black develops the bishop to e7 and prepares to castle too. Both sides are building the classical Closed Spanish structure — no early fireworks, just sound development and a long, rich middlegame ahead where small edges decide.",
      sayShort: 'O-O Be7 — the Closed Spanish.',
    }),
    b({
      id: 're1', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1',
      arrows: [{ from: 'e1', to: 'e4', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }],
      say: "Re1 — quiet but essential. The rook backs up the e4-pawn so any …Nxe4 ideas lose their sting, and it clears the way for the plan we're really after: c3 and then d4, the big central break. Everything in the Ruy points toward that break; this is us loading the spring.",
      sayShort: 'Re1 — back e4, prepare d4.',
    }),
    b({
      id: 'bb3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3',
      arrows: [{ from: 'b3', to: 'f7', color: VIS }],
      highlights: [{ square: 'b3', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Black plays b5 to shove the bishop, and we drop it back to b3 — its best home. Look where it points now: straight down the a2-g8 diagonal at f7, the softest square in Black's camp. The bishop that started on b5 pressuring c6 has quietly become an attacker aimed at the king.",
      sayShort: 'Bb3 — re-aim at f7.',
    }),
    b({
      id: 'tabiya', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O',
      highlights: [{ square: 'g8', color: SOFT }, { square: 'd4', color: SOFT }],
      say: "Black castles, and we've reached the great tabiya of the Closed Ruy — the position more grandmaster games have started from than almost any other. Everything is developed, both kings are safe, and now the real fight begins in the centre. Our move has been prepared since Re1.",
      sayShort: 'O-O — the Closed Ruy tabiya.',
    }),
    b({
      id: 'd4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4',
      arrows: [{ from: 'd4', to: 'e5', color: ATK }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say: "d4 — the central break lands at last. We strike at e5 with a supported pawn, opening the centre now that our pieces are ready for it. The tension between d4 and e5 is the heart of the position; how it resolves shapes the whole middlegame, and we're the ones who chose the moment.",
      sayShort: 'd4 — the central break.',
    }),
    b({
      id: 'trades', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4 Nxd4 Nxd4 exd4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e4', color: SOFT }],
      say: "Black releases the tension with Nxd4, we recapture, and Black takes back with the e-pawn. The dust settles: Black has a pawn on d4, but it's isolated and will become a target, while our e4-pawn stands proud and ready to advance. We've traded a pair of knights and come out with the more comfortable structure.",
      sayShort: 'exd4 — the d4-pawn is a target.',
    }),
    b({
      id: 'e5-space', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4 Nxd4 Nxd4 exd4 e5 Ne8 c3',
      highlights: [{ square: 'e5', color: KEY }, { square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "e5 grabs space and kicks the f6-knight back to e8, cramping Black's kingside, and c3 turns to undermine that isolated d4-pawn. This is the Ruy in a nutshell: no single knockout blow, but space, the bishop pair aimed at Black's king, and a structural target to work against. The engine calls it near-level — which for White out of the opening is a healthy, pressing pull, and it's the kind of position we're happy to grind for a long time.",
      sayShort: 'e5, c3 — space and a target.',
    }),
  ],
};
