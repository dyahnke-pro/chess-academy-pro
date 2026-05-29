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
  title: "Naroditsky's Alapin — c3 against the Sicilian",
  minutes: 14,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_ALAPIN,
  beats: [
    b({
      id: 'open', moves: 'e4 c5 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Naroditsky's anti-Sicilian. c3 isn't theory — it's setup. The whole point is move three: d4, with the pawn supported. We refuse the Sicilian's tactical mess and build a classical centre instead. Opponents prepare a sharp fight and get a structural game they don't know how to play.",
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
      say: "exd6 en passant! Then Qxd6 and we castle short. Black's queen is exposed in the centre, our king is safe, our bishop on b3 stares at f7, and we're ahead in development by a tempo. From here Naroditsky's plan is a4-a5-a6 cramping Black's queenside.",
      sayShort: 'exd6 + O-O — open the centre, king safe.',
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
      say: "Now THE plan: a4 starting the queenside crawl. The whole point of the Alapin from here is space. We push a4, then a5, then a6 — Black's pieces can't coordinate while we just methodically expand. There's no single tactical shot; it's positional smothering.",
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
      say: "After the knight trade and Be7, this is the moment the opening hands off to the middlegame — and look at what we have. The queen swings to g4 and suddenly we're staring at g7 with the bishop on e7 stuck defending, the king still in the centre, the queenside choked from the a6-push. This is what c3 was building toward all twelve moves: every white piece is doing something, and Black is just reacting.",
      sayShort: 'Qg4 — every piece working.',
    }),
  ],
};

// ============================================================
// NAJDORF (black) — 1,475 games, 65.3%, English Attack spine
// ============================================================
export const PRO_NAR_NAJDORF_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: "Naroditsky's Najdorf — the sharpest fight",
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_NAJDORF,
  beats: [
    b({
      id: 'open', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6',
      highlights: [{ square: 'a6', color: KEY }, { square: 'b5', color: SOFT }],
      say: "The Najdorf — the sharpest, most-analyzed defense in chess. We play …a6 as our 5th move, not to develop anything yet, but to claim b5 forever. That single square defines the whole opening: …b5 expanding queenside, blocking Bb5 ideas from White, preparing …Bb7. Patience and theory.",
      sayShort: '…a6 — claim b5, classic Najdorf.',
    }),
    b({
      id: 'english', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6',
      arrows: [{ from: 'g5', to: 'f6', color: ATK }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'e6', color: KEY }],
      say: "Bg5 — the English Attack, White's sharpest weapon. They pin our knight, threaten Bxf6 doubling our pawns, and prepare opposite-side castling. Our reply: e6, refuse to weaken, prepare …Be7 to break the pin.",
      sayShort: '…e6 — refuse to weaken.',
    }),
    b({
      id: 'castling-race', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O',
      arrows: [{ from: 'c1', to: 'g7', color: VIS }],
      highlights: [{ square: 'c1', color: KEY }, { square: 'g7', color: SOFT }],
      say: "f4 + Qf3 + O-O-O — White's classic English Attack setup. Castling opposite sides means a race: whoever attacks first wins. We're Black, our queenside is solid (the c-file is half-open AGAINST White now), and our queen on c7 already aims at White's king. The race is on.",
      sayShort: 'O-O-O — race begins, our side is faster.',
    }),
    b({
      id: 'develop', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6',
      arrows: [{ from: 'd7', to: 'b6', color: VIS }, { from: 'h6', to: 'g5', color: ATK }],
      highlights: [{ square: 'h6', color: KEY }, { square: 'g4', color: SOFT }],
      say: "Nbd7 develops, then g4 from White starts their pawn storm. Our reply: h6 forcing the bishop decision RIGHT NOW. Either White takes on f6 (doubling our pawns but giving us the open g-file), or retreats Bh4 (leaving the bishop on the rim and weakening the diagonal).",
      sayShort: '…h6 — force the bishop decision.',
    }),
    b({
      id: 'counterattack', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Be7 Qf3 Qc7 O-O-O Nbd7 g4 h6 Bxf6 Bxf6 h4 Nb6',
      arrows: [{ from: 'b6', to: 'c4', color: VIS }, { from: 'c7', to: 'c1', color: ATK }],
      highlights: [{ square: 'b6', color: KEY }, { square: 'c-file', color: SOFT }],
      say: "Bxf6 trade, we recapture with the bishop keeping our pawn structure intact, and now Nb6 reroutes the knight toward c4 or a4. The c-file is ours, the queen on c7 has a clear shot at the white king, and we're a full tempo ahead in the race. Castle opposite sides and the side that attacks first wins — and we attack first.",
      sayShort: '…Nb6 — knight joins the attack, race won.',
    }),
  ],
};

// ============================================================
// KID (black) — 4,432 games, 65%, Classical mainline
// ============================================================
export const PRO_NAR_KID_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-kid',
  title: "Naroditsky's King's Indian — Mar del Plata fight",
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
      say: "exd4 / Nxd4 / Re8 — the modern Mar del Plata mainline. Our rook lifts to the open e-file, the knight on c6 hits the d4-knight, and the kingside expansion …Nh5 + …Nf4 is coming next. Naroditsky's classical KID treatment.",
      sayShort: 'Mar del Plata — rook to e8, attack queued.',
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
  title: "Naroditsky's Alekhine — provoke the over-extension",
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
  title: "Naroditsky's King's Indian Attack — system, not theory",
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_KIA,
  beats: [
    b({
      id: 'system', moves: 'Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Nf3 — Naroditsky's most-played first move across his ENTIRE career. This is a SYSTEM, not theory. We're going to develop into a King's Indian Attack setup regardless of what Black does: g3, Bg2, O-O, d3, Nbd2, e4. Same plan every game.",
      sayShort: 'Nf3 — system, not theory.',
    }),
    b({
      id: 'fianchetto', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O',
      arrows: [{ from: 'g2', to: 'a8', color: VIS }],
      highlights: [{ square: 'g2', color: KEY }],
      say: "Nf6 g3 g6 Bg2 Bg7 O-O O-O — mirror fianchettos, both kings castled. Looks symmetric, isn't. The system gives us the FLEXIBILITY: depending on where Black places their pieces, we'll go d3 + Nbd2 + e4 (King's Indian style), or c4 + Nc3 (English style). The choice depends on them.",
      sayShort: 'Bg2 + O-O — flexibility queued.',
    }),
    b({
      id: 'centre-claim', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4',
      arrows: [{ from: 'e4', to: 'd5', color: ATK }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'd5', color: KEY }],
      say: "d3 / Nbd2 / e4 — the KIA centre. Black has built up with d5 and c5, and now e4 challenges them. The position will resolve into either an open centre (e4-e5 push later) or a complex middlegame where our Bg2 dominates the long diagonal.",
      sayShort: 'e4 — challenge the centre.',
    }),
    b({
      id: 'middlegame', moves: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d5 Nbd2 c5 e4 Nc6 c3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…Nc6 from Black, our c3 supports an eventual d4 push. White's plan from here is the classical KIA chain: d3-d4 cracks the centre, a4 expands queenside, Nh4 and f4 storm the kingside. Three plans running at once, all on the same setup — and Black has to defend everywhere because nothing committed yet.",
      sayShort: 'c3 — prep d4, the system pays off.',
    }),
  ],
};

// ============================================================
// ROSSOLIMO (white) — 4,151 games, 65.5%, vs ...d6 Sicilian
// ============================================================
export const PRO_NAR_ROSSOLIMO_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-rossolimo',
  title: "Naroditsky's Rossolimo — sidestep the Sicilian theory",
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
  title: "Naroditsky's Jobava London — aggressive d4 surprise",
  minutes: 5,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_JOB,
  beats: [
    b({
      id: 'open', moves: 'd4 d5 Nc3',
      highlights: [{ square: 'c3', color: KEY }],
      say: "The Jobava London. Nc3 instead of the boring Nf3 — we're saying we want a tactical fight, not a positional grind. Naroditsky popularized this for amateur play because it leads to sharp middlegames that punish under-prepared opponents.",
      sayShort: '2.Nc3 — tactical fight, not London grind.',
    }),
    b({
      id: 'bishop', moves: 'd4 d5 Nc3 Nf6 Bf4',
      arrows: [{ from: 'f4', to: 'b8', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say: "Nf6 / Bf4 — the Jobava bishop placement. From f4 the bishop covers the long diagonal AND eyes c7 (Black's queenside hangs on its support). This is the bishop's natural square in this system, unlike the regular London where it sits on the meek e3-d2 diagonal.",
      sayShort: 'Bf4 — aim at c7 and the long diagonal.',
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
  ],
};

// ============================================================
// RUY LOPEZ (white) — 2,922 games, 62.5%, Closed Spanish
// ============================================================
export const PRO_NAR_RUY_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-ruy-lopez',
  title: "Naroditsky's Ruy Lopez — pressure without commitment",
  minutes: 6,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_RUY,
  beats: [
    b({
      id: 'open', moves: 'e4 e5 Nf3 Nc6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: ATK }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "The Ruy Lopez. Bb5 pins Black's c6-knight against the e5-pawn — classical, deep, and the most theoretical opening in chess. Naroditsky's repertoire here is the modern mainline: pressure, develop, wait for Black to crack.",
      sayShort: 'Bb5 — pin the knight, classical.',
    }),
    b({
      id: 'morphy', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4',
      highlights: [{ square: 'a4', color: KEY }],
      say: "Morphy Defense — a6 / Ba4. Black kicks the bishop, we retreat keeping the diagonal. The bishop is back on a4 and still pinning toward c6 (just less directly), and Black's …a6 cost them a tempo. The opening is still ours to drive.",
      sayShort: 'a6 Ba4 — Morphy Defense.',
    }),
    b({
      id: 'closed', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1',
      arrows: [{ from: 'e1', to: 'e5', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }],
      say: "Nf6, O-O, Be7, Re1 — the Closed Spanish. Both sides develop classically. Re1 supports e4 in case of …Nxe4 ideas and prepares the c3 + d4 break. Patience is everything in the Ruy.",
      sayShort: 'Re1 — support e4, prep d4.',
    }),
    b({
      id: 'open-it', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4',
      arrows: [{ from: 'd4', to: 'e5', color: ATK }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: KEY }],
      say: "b5 / Bb3 (back to b3) / O-O / d4 — and the central break lands. Now the position opens, our developed pieces find targets, and the bishop on b3 stares at f7 with new urgency. The whole Ruy strategy crystallizes in this moment.",
      sayShort: 'd4 — central break, position opens.',
    }),
    b({
      id: 'middlegame', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O d4 Nxd4 Nxd4 exd4 e5 Ne8 c3',
      highlights: [{ square: 'e5', color: KEY }, { square: 'c3', color: KEY }],
      say: "Nxd4 trade, our e5 pushes, Black's knight retreats to e8 with nowhere else to go, and c3 supports the centre. From here we have space, the bishop pair, and a positional advantage that converts patiently. The Ruy is not a one-blow opening — it's a slow strangulation, and we just got the grip.",
      sayShort: 'e5 c3 — space, bishop pair, advantage.',
    }),
  ],
};
