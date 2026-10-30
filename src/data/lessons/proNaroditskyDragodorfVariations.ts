import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky DRAGODORF — variation tabs, every-step Watch lessons in the
// house voice (David 2026-07-02: "continue the sublines and other variations at
// this standard"). Student plays BLACK. The Dragodorf (a6 + g6/Bg7) is Black's
// system in the OPEN Sicilian, played against ALL of White's setups — these tabs
// are those setups. Every spine board-verified to a real middlegame and
// engine-checked from Black's side (sound: worse than -1.0 is never taught; in
// the English Attack castling into O-O-O and g4 is -1.3 at depth 20, so …b5
// comes first and the king castles once the queenside opens, 2026-10-29).
// Original prose from the established ideas — no quoting (plagiarism guard).

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  'https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation',
];

const HUB = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';

const ENGLISH_ATTACK: LessonScript = {
  openingId: 'pro-naroditsky-dragodorf',
  title: 'Dragodorf vs the English Attack (Be3/f3)',
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'hub', moves: HUB,
      highlights: [{ square: 'a6', color: KEY }, { square: 'g6', color: SOFT }],
      say: "You reach the Najdorf crossroads — a6 played, the Open Sicilian on the board — and you're about to fianchetto with g6 into the Dragodorf. This is the sharpest test of the whole system: White's English Attack. Meet it with a clear head and Dragon-tested technique, and Black is fine.",
      sayShort: 'a6 — into the Dragodorf.' }),
    b({ id: 'be3', moves: `${HUB} Be3`,
      highlights: [{ square: 'e3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Be3 — the English Attack begins. White's whole plan is written in this one move: the bishop supports the d4-knight, and behind it come f3, Qd2, and long castling, followed by the h- and g-pawns storming your king. It's the same plan that gives the Dragon nightmares, so you borrow the Dragon's cures.",
      sayShort: 'Be3 — the English Attack setup.' }),
    b({ id: 'g6', moves: `${HUB} Be3 g6`,
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "g6 — you commit to the Dragodorf even against the sharpest try. The bishop is coming to g7 to fight for the long dark diagonal, and the a6 you already played means your queenside counterattack with b5 is primed. Your queenside break is how you answer White's kingside storm.",
      sayShort: 'g6 — fianchetto, race White.' }),
    b({ id: 'f3-bg7', moves: `${HUB} Be3 g6 f3 Bg7`,
      highlights: [{ square: 'f3', color: SOFT }, { square: 'g7', color: KEY }],
      say: "White plays f3, bracing the centre and clearing the way for the g- and h-pawn storm; you complete the fianchetto with Bg7. The bishop now eyes the long diagonal toward White's queenside — the side where White's king goes if it castles long. Every trade that opens that diagonal works for you.",
      sayShort: 'Bg7 — bishop eyes the queenside.' }),
    b({ id: 'qd2-b5', moves: `${HUB} Be3 g6 f3 Bg7 Qd2 b5`,
      highlights: [{ square: 'b5', color: KEY }, { square: 'b4', color: SOFT }, { square: 'c3', color: SOFT }],
      say: "Qd2 completes the English Attack set-up: the queen guards the e3-bishop and backs a later Bh6 to trade off your g7-bishop, with long castling and the g- and h-pawns to follow. Here you resist the natural castling. Castle now and White plays O-O-O and g4, and the storm reaches your king first. So …b5 comes first: it grabs queenside space and threatens …b4 against the c3-knight, while your king waits to see where White's goes.",
      sayShort: '…b5 first — don\'t castle into it.' }),
    b({ id: 'a4-oo', moves: `${HUB} Be3 g6 f3 Bg7 Qd2 b5 a4 bxa4 Nxa4 O-O`,
      highlights: [{ square: 'b2', color: KEY }, { square: 'a4', color: SOFT }],
      say: "White hits back with a4, striking at the b5-pawn. Take it with …bxa4: after Nxa4 the b-file is half-open for your rook and points at the b2-pawn. Now you castle — the queenside files are open, and a white king that castled long would sit right beside them.",
      sayShort: '…bxa4, then castle — the b-file opens.' }),
    b({ id: 'bd7', moves: `${HUB} Be3 g6 f3 Bg7 Qd2 b5 a4 bxa4 Nxa4 O-O Be2 Bd7`,
      arrows: [{ from: 'd7', to: 'a4', color: VIS }],
      highlights: [{ square: 'a4', color: KEY }, { square: 'a1', color: SOFT }, { square: 'b8', color: SOFT }],
      say: "Be2 develops, and …Bd7 hits the knight on a4 along the diagonal; only the rook on a1 guards it. Your plan from here: a rook to b8 on the half-open file and the g7-bishop raking the long diagonal toward White's queenside. White keeps a small edge, but every one of your pieces has a job.",
      sayShort: '…Bd7 — hit the a4-knight.' }),
  ],
};

const CLASSICAL: LessonScript = {
  openingId: 'pro-naroditsky-dragodorf',
  title: 'Dragodorf vs the Classical (Be2)',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'hub', moves: HUB,
      highlights: [{ square: 'a6', color: KEY }],
      say: "The Open Sicilian again, a6 in, and you head for the Dragodorf. Against White's quiet Classical setup the game is calmer than the English Attack — no headlong pawn storm — so this becomes a battle of plans and squares, exactly the kind of position where understanding beats memorisation.",
      sayShort: 'a6 — into the Dragodorf.' }),
    b({ id: 'be2', moves: `${HUB} Be2`,
      highlights: [{ square: 'e2', color: KEY }],
      say: "Be2 — the Classical, the calmest and most common try. White simply develops the bishop and castles, avoiding sharp theory and hoping to outplay you slowly. That suits you fine: with no storm to survive, you set up the Dragodorf comfortably and play for your own long-diagonal and queenside ideas.",
      sayShort: 'Be2 — the quiet Classical.' }),
    b({ id: 'g6', moves: `${HUB} Be2 g6`,
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "g6 — the Dragodorf fianchetto. The bishop is bound for g7 and its long diagonal, and because White has played so calmly, that bishop will get real scope. You're building a harmonious, flexible position with all the standard Sicilian levers — b5 on the queenside, and an eventual central break — kept in reserve.",
      sayShort: 'g6 — fianchetto, flexible plans.' }),
    b({ id: 'oo-bg7', moves: `${HUB} Be2 g6 O-O Bg7`,
      highlights: [{ square: 'g1', color: SOFT }, { square: 'g7', color: KEY }],
      say: "White castles; you complete the fianchetto with Bg7. Same-side kings this time, which confirms the character — this is a manoeuvring middlegame, not a race. Your bishop settles onto the diagonal, your king gets safe next, and you start eyeing the queenside expansion.",
      sayShort: 'Bg7 — settle the dragon bishop.' }),
    b({ id: 'be3-oo', moves: `${HUB} Be2 g6 O-O Bg7 Be3 O-O`,
      highlights: [{ square: 'e3', color: SOFT }, { square: 'g8', color: KEY }],
      say: "Be3 develops White's last minor piece; you castle and complete your setup. Both sides are fully mobilised now, kings safe on the same wing. The position is close to level — a healthy Sicilian middlegame where Black has the queenside majority and the long-diagonal bishop to work with.",
      sayShort: 'O-O — both sides fully developed.' }),
    b({ id: 'f4-nbd7', moves: `${HUB} Be2 g6 O-O Bg7 Be3 O-O f4 Nbd7`,
      arrows: [{ from: 'd7', to: 'c5', color: VIS }],
      highlights: [{ square: 'f4', color: SOFT }, { square: 'c5', color: KEY }],
      say: "White grabs central space with f4, and you develop the knight to d7 — headed for the beautiful c5-square, where it pressures e4 and eyes the d3- and b3-holes. From here your plan is clear and thematic: b5 to expand, Bb7 to add to the long diagonal, and a rook to c8. White's f4 grabbed space but also loosened the e4-pawn you'll be gunning for.",
      sayShort: 'Nbd7 — knight heads for c5.' }),
  ],
};

const H3_ADAMS: LessonScript = {
  openingId: 'pro-naroditsky-dragodorf',
  title: 'Dragodorf vs h3 (Adams Attack)',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'hub', moves: HUB,
      highlights: [{ square: 'a6', color: KEY }],
      say: "Open Sicilian, a6 played, Dragodorf incoming. Against the modern h3 line White wants a slow-motion kingside pawn storm — g4 without ever allowing your pieces the g4-square. You meet it in true Dragodorf fashion and turn White's advancing pawns into targets as much as attackers.",
      sayShort: 'a6 — into the Dragodorf.' }),
    b({ id: 'h3', moves: `${HUB} h3`,
      highlights: [{ square: 'h3', color: KEY }, { square: 'g4', color: SOFT }],
      say: "h3 — the Adams Attack, a quietly venomous idea. The little pawn move prepares g4 and takes the g4-square away from your knight and bishop forever. White intends g4, Bg2, and a kingside expansion. It's slow, so you have time to set up your own play and to remember that every pawn White pushes is a pawn that can't come back.",
      sayShort: 'h3 — prepares g4, denies g4.' }),
    b({ id: 'g6', moves: `${HUB} h3 g6`,
      highlights: [{ square: 'g6', color: KEY }, { square: 'g7', color: SOFT }],
      say: "g6 — the Dragodorf fianchetto. The bishop heads to g7, and notice the point: if White commits the whole kingside to a pawn storm, your Bg7 and the eventual central break give you counterplay right through the squares White is weakening. You invite the storm because you know how to counter it.",
      sayShort: 'g6 — fianchetto, invite the storm.' }),
    b({ id: 'g4-bg7', moves: `${HUB} h3 g6 g4 Bg7`,
      highlights: [{ square: 'g4', color: SOFT }, { square: 'g7', color: KEY }],
      say: "White pushes g4, grabbing space and starting the advance; you calmly play Bg7. The bishop takes its diagonal, and White's committal g4 already leaves lasting holes — the f4- and h4-squares, and a kingside that can be pried open with a timely break later. Space is not the same as an attack.",
      sayShort: 'Bg7 — calm; note the holes.' }),
    b({ id: 'bg2-oo', moves: `${HUB} h3 g6 g4 Bg7 Bg2 O-O`,
      highlights: [{ square: 'g2', color: SOFT }, { square: 'g8', color: KEY }],
      say: "White fianchettos with Bg2 to shore up the long light diagonal, and you castle. Your king is safe, your development smooth. White has more space on the kingside, but you have the more flexible position and the standard Sicilian trumps — the queenside majority and the c-file — ready to activate.",
      sayShort: 'O-O — king safe, stay flexible.' }),
    b({ id: 'be3-nc6', moves: `${HUB} h3 g6 g4 Bg7 Bg2 O-O Be3 Nc6`,
      arrows: [{ from: 'c6', to: 'd4', color: VIS }],
      highlights: [{ square: 'c6', color: KEY }, { square: 'd4', color: SOFT }],
      say: "Be3 develops White's bishop; you play Nc6, hitting the d4-knight and completing development. Now the Dragodorf plan runs on rails: pressure d4, expand with b5, bring a rook to c8, and use the long diagonal. White's kingside pawns are advanced but static — your play flows on the other wing and through the centre, and Black is comfortable.",
      sayShort: 'Nc6 — hit d4, Black is comfortable.' }),
  ],
};

export const PRO_NARODITSKY_DRAGODORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-dragodorf::English Attack (Be3)': ENGLISH_ATTACK,
  'pro-naroditsky-dragodorf::Classical (Be2)': CLASSICAL,
  'pro-naroditsky-dragodorf::h3 Adams Attack': H3_ADAMS,
};
