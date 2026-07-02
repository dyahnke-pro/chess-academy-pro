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
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_KID,
  beats: [
    b({
      id: 'fianchetto', moves: 'd4 Nf6 c4 g6',
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "The King's Indian Defence. Against d4 we develop Nf6 and then play g6, clearing the way for the bishop to come to g7. That fianchettoed bishop is going to be the soul of the whole opening — it points down the long dark diagonal at White's centre and queenside, it shelters our king, and it underwrites the kingside attack we're aiming for. Everything we do is built around it.",
      sayShort: 'g6 — clear the way for Bg7.',
    }),
    b({
      id: 'bg7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7',
      highlights: [{ square: 'g7', color: KEY }],
      say: "White develops Nc3 and we complete the fianchetto with Bg7. For now the bishop's diagonal is masked by our own f6-knight, but that's temporary — the King's Indian is a coiled spring. We deliberately let White build a big pawn centre, planning to strike back at it later and unleash the bishop when the centre cracks open.",
      sayShort: 'Bg7 — the coiled dragon bishop.',
    }),
    b({
      id: 'big-centre', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6',
      highlights: [{ square: 'e4', color: KEY }, { square: 'd6', color: SOFT }],
      say: "White grabs the full classical centre with e4 — pawns on c4, d4 and e4, an imposing wall. We answer with d6, the modest move that defines the King's Indian: it supports the coming e5 break and keeps our structure flexible. We're not going to meet that centre head-on; we're going to undermine it from the flank.",
      sayShort: 'd6 — support the coming e5 break.',
    }),
    b({
      id: 'develop', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O',
      highlights: [{ square: 'g8', color: SOFT }],
      say: "White develops Nf3 and we castle, tucking the king safely behind the fianchetto. Both sides finish mobilising; the calm before the storm. The whole King's Indian plan hinges on the next few moves, where we throw the gauntlet down in the centre.",
      sayShort: 'O-O — king safe behind the bishop.',
    }),
    b({
      id: 'e5-strike', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: KEY }],
      say: "White develops Be2 — the solid Classical setup — and we play e5, the defining strike of the whole opening. We challenge the d4-pawn head-on and force White to make a decision that shapes the entire game: push d5 and lock the centre (which hands us a kingside pawn-storm), or resolve the tension in the centre. Either way, we've committed to the King's Indian's fighting soul.",
      sayShort: 'e5 — the defining central strike.',
    }),
    b({
      id: 'exchange', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4',
      highlights: [{ square: 'd4', color: KEY }, { square: 'e8', color: SOFT }],
      say: "White castles, and we release the central tension with exd4 — the modern, flexible treatment. Rather than let White fix the structure with d5, we open the e-file for our rook and hand ourselves fast, active piece play. This is the up-to-date King's Indian: dynamic piece activity over the old locked-centre grind.",
      sayShort: 'exd4 — open the e-file, play actively.',
    }),
    b({
      id: 're8', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8',
      arrows: [{ from: 'e8', to: 'e4', color: VIS }],
      highlights: [{ square: 'e8', color: KEY }, { square: 'e4', color: SOFT }],
      say: "White recaptures on d4 with the knight, and we swing the rook to e8. Instantly it bears down the open e-file at White's e4-pawn — the head of the centre. Our pieces spring to life the moment the position opens; the passive-looking King's Indian setup was loaded all along.",
      sayShort: 'Re8 — the rook hits e4.',
    }),
    b({
      id: 'nc6', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6',
      arrows: [{ from: 'c6', to: 'd4', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White braces the centre with f3, propping up e4 — but that move quietly weakens the dark squares around the king, which is grist for our mill. We develop Nc6, hitting the d4-knight and gaining time. Every piece we bring out comes with a threat; White is kept busy while we build.",
      sayShort: 'Nc6 — hit d4 with tempo.',
    }),
    b({
      id: 'nh5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5',
      arrows: [{ from: 'h5', to: 'f4', color: VIS }],
      highlights: [{ square: 'h5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "White develops Be3, and we begin the knight's journey to glory with Nh5 — heading for the f4-square. It looks like the knight is drifting to the rim, but it's aiming at a magnificent outpost. In the King's Indian, a knight on f4 is worth its weight in gold.",
      sayShort: 'Nh5 — reroute toward the f4 outpost.',
    }),
    b({
      id: 'nf4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 Nc6 Be3 Nh5 Qd2 Nf4',
      arrows: [{ from: 'f4', to: 'e2', color: ATK }, { from: 'f4', to: 'g2', color: ATK }],
      highlights: [{ square: 'f4', color: KEY }],
      say: "Qd2 develops the queen, and Nf4 lands on the prize square — a monster knight hitting the Be2 and the g2-pawn right next to White's king. From here the attack plays itself: the queen swings to h4 or g5, an f5 break tears the kingside open, and the Bg7 we sheltered all opening finally roars down the long diagonal. The engine calls it near-level, but this is the King's Indian attacker's dream, and the initiative is ours.",
      sayShort: 'Nf4 — the outpost, attack ignites.',
    }),
  ],
};

// ============================================================
// ALEKHINE (black) — 2,830 games, 68.7%, Modern variation
// ============================================================
export const PRO_NAR_ALEKHINE_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-alekhine',
  title: "This repertoire's Alekhine — provoke the over-extension",
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SOURCES_ALEK,
  beats: [
    b({
      id: 'provoke', moves: 'e4 Nf6',
      arrows: [{ from: 'f6', to: 'e4', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }, { square: 'e4', color: SOFT }],
      say: "The Alekhine, and it breaks the rules on move one. Instead of meeting e4 in the centre, we attack it with Nf6 and invite White to chase us. The whole opening rests on one contrarian idea: let the opponent grab space and push pawns, because every pawn that advances is a pawn that can be undermined and a square left behind it. We provoke on purpose.",
      sayShort: 'Nf6 — provoke, invite the chase.',
    }),
    b({
      id: 'e5', moves: 'e4 Nf6 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd5', color: SOFT }],
      say: "White takes the bait with e5, kicking our knight and grabbing the big central space. This is exactly what we wanted to see. That advanced e5-pawn looks proud, but it is also a target we will chip at, and the square in front of it can never be defended by a pawn again.",
      sayShort: 'e5 — White grabs space (the bait).',
    }),
    b({
      id: 'nd5-d4-d6', moves: 'e4 Nf6 e5 Nd5 d4 d6',
      highlights: [{ square: 'd5', color: KEY }, { square: 'd6', color: KEY }],
      say: "Our knight hops to d5, White expands with d4, and now we strike at the chain with d6. White's pawns look like a wall — d4 and e5 side by side — but we hit them at once. The moment we open the centre, all that space White invested becomes over-extension we can exploit.",
      sayShort: 'd6 — strike the d4-e5 chain.',
    }),
    b({
      id: 'trade-wedge', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "White develops Nf3, we trade the e5-wedge off with dxe5, and White recaptures with the knight. The imposing pawn centre is already gone, swapped for piece play, and White's edge in space has shrunk to almost nothing. The knight sits on e5 for now, but we can challenge it whenever we like.",
      sayShort: 'dxe5 — dissolve the pawn wedge.',
    }),
    b({
      id: 'c6', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6',
      highlights: [{ square: 'c6', color: KEY }, { square: 'd5', color: SOFT }],
      say: "c6 — a small move doing big jobs. It gives our d5-knight a rock-solid home by covering the b5- and e4-squares an enemy piece might use to evict it, and it opens the door for our queen and prepares the whole queenside. Quiet, prophylactic, and typically Alekhine: no weaknesses, just steady improvement.",
      sayShort: 'c6 — anchor the d5-knight.',
    }),
    b({
      id: 'bf5', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5',
      arrows: [{ from: 'f5', to: 'c2', color: VIS }],
      highlights: [{ square: 'f5', color: KEY }],
      say: "White develops Be2, and we play the key move Bf5 — getting the light-squared bishop OUTSIDE the pawn chain before we ever play e6. This is the whole point that makes the Alekhine pleasant to play: unlike the Caro-Kann, our light bishop never gets buried behind its own pawns. It stands active on f5, eyeing the b1-c2 corner.",
      sayShort: 'Bf5 — the bishop out before e6.',
    }),
    b({
      id: 'oo-nd7', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
      arrows: [{ from: 'd7', to: 'e5', color: VIS }],
      highlights: [{ square: 'd7', color: KEY }, { square: 'e5', color: SOFT }],
      say: "White castles, and we play Nd7 — immediately questioning that knight on e5 and preparing the e6 move that will complete our fortress. Every piece now has a job, the structure is rock-solid, and we have reached a full, healthy middlegame from an opening the textbooks still politely call a provocation. That is the Alekhine's quiet triumph.",
      sayShort: 'Nd7 — challenge e5, prepare e6.',
    }),
    b({
      id: 'plan', moves: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 dxe5 Nxe5 c6 Be2 Bf5 O-O Nd7',
      arrows: [{ from: 'd7', to: 'e5', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }, { square: 'f5', color: SOFT }],
      say: "So what is the plan from here? Everything points at White's remaining central pawn on d4. We challenge the e5-knight with Nd7, complete development with e6 and Be7, and then chip at d4 with pieces and, when it helps, a c5 or f6 break. Our active f5-bishop and sound structure mean the engine reads this as near-level — a comfortable game where White's early space has quietly become nothing special.",
      sayShort: 'Plan: pressure d4, chip the centre.',
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
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_ROSS,
  beats: [
    b({
      id: 'sidestep', moves: 'e4 c5 Nf3',
      highlights: [{ square: 'f3', color: KEY }],
      say: "Against the Sicilian we sidestep the ocean of Open-Sicilian theory. Nf3 develops naturally, and depending on how Black continues we deploy the same bishop-check idea: against d6 we have Bb5+, the Moscow, and against Nc6 the Bb5 Rossolimo. One coherent plan that dodges the sharpest preparation Black owns.",
      sayShort: 'Nf3 — sidestep the Open Sicilian.',
    }),
    b({
      id: 'moscow', moves: 'e4 c5 Nf3 d6 Bb5+',
      arrows: [{ from: 'b5', to: 'e8', color: ATK }],
      highlights: [{ square: 'b5', color: KEY }],
      say: "Black plays d6 and we check with Bb5+ — the Moscow. It's an annoying little check that forces Black to make a small concession right away: block with the bishop and accept a trade, block with the knight and be slightly passive, or block with the knight to d7. Whatever they choose, we have steered the game onto our quiet, strategic ground.",
      sayShort: 'Bb5+ — the Moscow check.',
    }),
    b({
      id: 'nd7-oo', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6',
      highlights: [{ square: 'd7', color: KEY }, { square: 'a6', color: SOFT }],
      say: "Black interposes the knight on d7 — solid but a touch passive — and we castle to safety. Black nudges the bishop with a6. The key decision is coming: most players would trade on d7, but that hands Black easy development, so we do the opposite and keep our good bishop.",
      sayShort: 'Nd7 O-O — solid but passive for Black.',
    }),
    b({
      id: 'bd3', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3',
      highlights: [{ square: 'd3', color: KEY }],
      say: "Bd3 — retreat, but keep the bishop. This is the whole finesse: instead of trading on d7 and relieving Black's cramped position, we tuck the bishop back where it still eyes the kingside and stays a long-term asset. Denying the opponent the trade they want is a strategic weapon in its own right.",
      sayShort: 'Bd3 — keep the bishop, deny the trade.',
    }),
    b({
      id: 'develop', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1',
      arrows: [{ from: 'e1', to: 'e4', color: VIS }],
      highlights: [{ square: 'e1', color: KEY }],
      say: "Black develops the second knight to f6, and we lift the rook to e1 — backing the e4-pawn and quietly claiming the e-file for the future. Every move is low-commitment and improving; we are in no hurry, because Black's cramped setup will not fix itself.",
      sayShort: 'Re1 — back e4, claim the e-file.',
    }),
    b({
      id: 'bf1', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1',
      highlights: [{ square: 'f1', color: KEY }, { square: 'e6', color: SOFT }],
      say: "Black plays e6 to shore up the centre and free a bishop; we regroup with Bf1 — the modern maneuver. The bishop steps back to its starting square, but with the knight already off b1 it now guards the light squares flexibly and clears the d-file. Patience and re-routing over forcing play: that is the Rossolimo way.",
      sayShort: 'Bf1 — the modern regroup.',
    }),
    b({
      id: 'maroczy', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1 b6 c4',
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black fianchettos with b6, and we clamp down with c4 — the Maroczy Bind. This is the structural prize: the c4- and e4-pawns together lock a vice on the d5-square, so Black can never free the position with the thematic d5 break. A bind Black cannot break is a bind that decides the game slowly.",
      sayShort: 'c4 — the Maroczy Bind clamps d5.',
    }),
    b({
      id: 'bind-plan', moves: 'e4 c5 Nf3 d6 Bb5+ Nd7 O-O a6 Bd3 Ngf6 Re1 e6 Bf1 b6 c4 Bb7 Nc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Bb7 and Nc3 complete the picture: the Maroczy Bind is locked in. We own more space, the d5-square is ours forever, and Black's pieces are coordinated but permanently cramped. The plan from here writes itself — expand on the queenside with b4 and a4-a5, and improve our pieces at leisure while Black struggles for a break that never comes. Objectively near-level, but a one-sided position to play.",
      sayShort: 'Nc3 — the bind is locked, we squeeze.',
    }),
  ],
};

// ============================================================
// JOBAVA LONDON (white) — 2,170 games, 70.3%
// ============================================================
export const PRO_NAR_JOBAVA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  title: "This repertoire's Jobava London — aggressive d4 surprise",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SOURCES_JOB,
  beats: [
    b({
      id: 'open', moves: 'd4 d5 Nc3',
      highlights: [{ square: 'c3', color: KEY }, { square: 'e4', color: SOFT }],
      say: "The Jobava London — and the whole attitude is in this third move. Instead of the quiet Nf3 of the ordinary London, we throw the knight to c3. It's a declaration: we want a tactical fight, not a slow positional grind. The knight eyes e4 and b5, and against an under-prepared opponent this offbeat aggression pays off fast.",
      sayShort: 'Nc3 — the aggressive London hybrid.',
    }),
    b({
      id: 'bishop', moves: 'd4 d5 Nc3 Nf6 Bf4',
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'f4', color: KEY }],
      say: "Black develops Nf6 and we bring the bishop to f4 — the London bishop, but with teeth here. From f4 it rakes down toward c7, a square that often becomes tender in Black's camp. Paired with the knight on c3, we're not just developing; we're already leaning on Black's position with real threats.",
      sayShort: 'Bf4 — the bishop rakes toward c7.',
    }),
    b({
      id: 'c5', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3',
      highlights: [{ square: 'c5', color: SOFT }, { square: 'f3', color: KEY }],
      say: "Black hits back at the centre with the natural c5 break, and we simply develop with Nf3. We don't fear the challenge to d4 — if Black trades there, our pieces are ready to spring into active posts and our lead in development starts to tell.",
      sayShort: 'Nf3 — develop, welcome the c5 break.',
    }),
    b({
      id: 'qxd4', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4',
      highlights: [{ square: 'd4', color: KEY }],
      say: "Black trades on d4 and we recapture with the queen. Normally you avoid bringing the queen out early, but here it's excellent: she sits proudly in the centre, eyeing both wings, and there's no easy way for Black to chase her off without conceding ground. Any tempo Black spends harassing the queen is a tempo not spent developing.",
      sayShort: 'Qxd4 — the centralised queen.',
    }),
    b({
      id: 'qd3', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3',
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "Nc6 develops and nudges our queen, and we slide her to d3 — onto a gorgeous attacking diagonal that stares all the way down at h7, the doorstep of Black's king. This is the position nearly every Jobava funnels into: the queen and bishop trained on the kingside, ready for e4 to blast the centre open.",
      sayShort: 'Qd3 — aim the queen at h7.',
    }),
    b({
      id: 'e6', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6',
      highlights: [{ square: 'e6', color: SOFT }, { square: 'd5', color: KEY }],
      say: "Black plays e6, buttressing the d5-pawn and opening a path for the dark-squared bishop to come to d6 and offer a trade of our strong f4-bishop. Solid and sensible from Black — but it commits the pawn structure and leaves the h7-square just as tender as before.",
      sayShort: 'e6 — Black shores up d5.',
    }),
    b({
      id: 'e3', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6 e3',
      highlights: [{ square: 'e3', color: KEY }],
      say: "We solidify with e3, giving the position a firm base and keeping our options flexible — the centre stays ready for a later e4 break. There's no rush: our pieces are already better placed for the coming middlegame, and a sound structure lets us pick our moment to strike.",
      sayShort: 'e3 — a firm, flexible base.',
    }),
    b({
      id: 'trade', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6 e3 Bd6 Bxd6 Qxd6',
      highlights: [{ square: 'd6', color: KEY }],
      say: "Black offers the bishop trade with Bd6 and we accept, swapping the dark-squared bishops. That's fine for us: the trade pulls Black's queen to d6 where we can gain time hitting it later, and it clears the way for our own plan. We've traded a piece but kept the initiative and the more purposeful setup.",
      sayShort: 'Bxd6 — trade, keep the initiative.',
    }),
    b({
      id: 'castle-long', moves: 'd4 d5 Nc3 Nf6 Bf4 c5 Nf3 cxd4 Qxd4 Nc6 Qd3 e6 e3 Bd6 Bxd6 Qxd6 O-O-O',
      highlights: [{ square: 'c1', color: KEY }, { square: 'h7', color: SOFT }],
      say: "O-O-O — we castle long and declare our intentions. The king is safe on the queenside, and now the kingside pawns are free to storm: g4-g5 to pry open lines, the h-pawn to follow, with the queen already aimed at h7 and the rooks swinging over. It's engine-level balanced, but this is a fierce, one-directional attacking position — exactly the practical fight the Jobava was chosen to create.",
      sayShort: 'O-O-O — castle long, storm the kingside.',
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
