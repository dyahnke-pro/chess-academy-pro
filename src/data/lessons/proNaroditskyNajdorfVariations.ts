import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Najdorf — variation lessons for his 1,475-game
// Najdorf as Black. The sharpest defense in chess; this set covers
// the three most-faced White setups: Be3 English Attack, Be2
// Classical, and h3 Adams Attack.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort: string;
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

const SRC = [
  'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ============================================================
// Be3 English Attack — 237g 67.3%
// White plays the English Attack mainline: Be3 + f3 + Qd2 + O-O-O.
// Black answers with ...e5, ...Be6, ...Nbd7, then ...b5 racing.
// ============================================================
const BE3_ENGLISH: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Be3 English Attack — opposite castling race',
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'eng-open', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3',
      highlights: [{ square: 'e3', color: KEY }],
      say: "Be3 — the English Attack opener. White's setup is forcing: Be3 + f3 + Qd2 + O-O-O, then g4-g5 kingside storm. The Najdorf's defining race begins. Black must counter on the queenside faster than White can break through.",
      sayShort: 'Be3 — English Attack.',
    }),
    b({
      id: 'eng-e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5',
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "…e5! The defining Najdorf move. Black strikes the d4-knight forcing it to move. The …e5 controls the d4 outpost AND gives Black a knight outpost on d5 once the c-knight reroutes. Slightly weakens the d6 pawn but the activity compensates.",
      sayShort: '…e5! — kick the knight.',
    }),
    b({
      id: 'eng-nb3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6',
      highlights: [{ square: 'b3', color: SOFT }, { square: 'e6', color: KEY }],
      say: "Nb3 retreats, Black plays …Be6 developing toward the queenside. The Be6 supports d5 AND prepares queenside expansion. The position is balanced: White has the centre and the kingside attack plan; Black has the queenside attack plan.",
      sayShort: '…Be6 — develop queenside.',
    }),
    b({
      id: 'eng-f3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Nbd7',
      highlights: [{ square: 'f3', color: SOFT }, { square: 'd7', color: KEY }],
      say: "f3 Nbd7 — White prepares g4 with the f3 prophylaxis, Black develops the queen knight. The Nbd7 keeps the c-file flexible for the queen and rook coordination that comes next.",
      sayShort: 'f3 …Nbd7 — both prep.',
    }),
    b({
      id: 'eng-qd2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Nbd7 Qd2 b5',
      highlights: [{ square: 'b5', color: KEY }],
      say: "Qd2 …b5! The queen finishes White's English Attack setup, and we IMMEDIATELY play b5 starting the queenside race. The b5 hits c4 ideas AND prepares b4 driving the c3-knight off.",
      sayShort: '…b5! — race begins.',
    }),
    b({
      id: 'eng-castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Nbd7 Qd2 b5 O-O-O Nb6',
      highlights: [{ square: 'c1', color: SOFT }, { square: 'b6', color: KEY }],
      say: "O-O-O …Nb6 — White castles long (the king goes RIGHT into Black's attack zone) and Black's knight reroutes to b6 supporting a4 and eyeing c4/a4 outposts. The Najdorf's signature race position is reached. Whoever opens the queenside files first wins.",
      sayShort: 'O-O-O …Nb6 — race set.',
    }),
  ],
};

// ============================================================
// Be2 Classical — 214g 64.5%
// Quieter — White castles short, both sides play classical chess.
// ============================================================
const BE2_CLASSICAL: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Be2 Classical — quiet positional fight',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'be2-open', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2',
      highlights: [{ square: 'e2', color: KEY }],
      say: "Be2 — White's Classical setup. The bishop on e2 doesn't pin or attack; it just develops. This is the quietest Najdorf treatment — White accepts a positional middlegame instead of the English Attack race. We're happy: positional games favour our solid structure.",
      sayShort: 'Be2 — Classical setup.',
    }),
    b({
      id: 'be2-e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "…e5 — same Najdorf strike, kicking the knight to b3 or f3. The Be2 means White can recapture with a piece if we ever push f5, so the centre tension is different than in the English Attack.",
      sayShort: '…e5 — Najdorf strike.',
    }),
    b({
      id: 'be2-nb3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7',
      highlights: [{ square: 'e7', color: KEY }],
      say: "Nb3 …Be7 — knight retreats, we develop the bishop to e7 (not e6, because we're going for a classical game here). The Be7 supports the kingside, prepares O-O, and stays flexible.",
      sayShort: '…Be7 — classical development.',
    }),
    b({
      id: 'be2-castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 Be3 O-O',
      highlights: [{ square: 'g8', color: KEY }],
      say: "Be3 …O-O — White develops the dark-square bishop to e3, we castle short. Both kings will end up on the kingside, the position is positional. Plans diverge from here: White might play Qd2 + Rad1, we play …Be6 + …Nbd7 + queenside expansion.",
      sayShort: 'O-O — both kingside.',
    }),
    b({
      id: 'be2-qd2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 Be3 O-O Qd2 Be6',
      highlights: [{ square: 'd2', color: SOFT }, { square: 'e6', color: KEY }],
      say: "Qd2 …Be6 — White connects the rooks, we develop the bishop. The position is symmetric in piece placement but Black has the better structural plan: queenside expansion with …Nbd7-Nb6-…b5.",
      sayShort: '…Be6 — develop bishop.',
    }),
  ],
};

// ============================================================
// h3 Adams Attack — 164g 59.5%
// White plays h3 preparing g4 without committing to long castling.
// Black answers with ...e5 and ...h5 freezing the kingside.
// ============================================================
const H3_ADAMS: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'h3 Adams Attack — kingside expansion prep',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'h3-open', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3',
      highlights: [{ square: 'h3', color: KEY }, { square: 'g4', color: SOFT }],
      say: "h3 — Adams Attack. White prepares g4 expansion without committing to a king position yet. The h3 controls g4 (Black can't play …Bg4) and supports the g4 push. We need to react before the kingside locks up.",
      sayShort: 'h3 — Adams Attack.',
    }),
    b({
      id: 'h3-e5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5',
      highlights: [{ square: 'e5', color: KEY }],
      say: "…e5 — same Najdorf strike. The knight retreats to e2 or b3, but the …e5 has commited Black's structure and now we need a kingside plan to match White's coming g4.",
      sayShort: '…e5 — same strike.',
    }),
    b({
      id: 'h3-nde2', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5 Nde2 h5',
      highlights: [{ square: 'e2', color: SOFT }, { square: 'h5', color: KEY }],
      say: "Nde2 …h5! The knight retreats to e2 keeping the c3-knight's natural defender, and we play …h5 freezing the kingside before White can push g4. The …h5 is the Adams Attack antidote: deny White the pawn storm.",
      sayShort: '…h5 — freeze g4.',
    }),
    b({
      id: 'h3-bg5', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5 Nde2 h5 Bg5',
      highlights: [{ square: 'g5', color: SOFT }, { square: 'f6', color: KEY }],
      say: "Bg5 — White pins the f6-knight, trying to find a way to break our setup. The pin doesn't hurt us — our king isn't castled yet so the knight isn't tied down.",
      sayShort: 'Bg5 — pin attempt.',
    }),
    b({
      id: 'h3-be6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5 Nde2 h5 Bg5 Be6',
      highlights: [{ square: 'e6', color: KEY }],
      say: "…Be6 — develop the bishop ignoring the pin. The Be6 supports the d5-square, prepares …Nbd7, and the pin on the f6-knight isn't actually dangerous because Black doesn't need to castle yet.",
      sayShort: '…Be6 — develop, ignore pin.',
    }),
    b({
      id: 'h3-nbd7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 h3 e5 Nde2 h5 Bg5 Be6 Bxf6 Qxf6',
      highlights: [{ square: 'f6', color: KEY }],
      say: "Bxf6 …Qxf6 — White trades the pin for piece activity, we recapture with the queen. The queen on f6 is well-placed: defends the king, supports central play, and we still have all our pieces ready.",
      sayShort: '…Qxf6 — queen recapture.',
    }),
  ],
};

// ============================================================
// Bc4 Sozin (Fischer Attack) — 124 games, 67.3% score
// White's sharpest Najdorf attempt: Bc4 hitting e6 + f7. We answer
// with ...e6 classical setup, ...Be7 development.
// ============================================================
const BC4_SOZIN: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Bc4 Sozin / Fischer Attack — classical defense',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'sozin-open', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4',
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Bc4 — the Sozin / Fischer Attack. White aims the bishop directly at f7, threatening tactics with Bxf7+ in some lines. This is the most aggressive Najdorf treatment. The correct response is the calm ...e6 closing the diagonal.",
      sayShort: 'Bc4 — Sozin/Fischer.',
    }),
    b({
      id: 'sozin-e6', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6',
      highlights: [{ square: 'e6', color: KEY }, { square: 'c4', color: SOFT }],
      say: "...e6 — Black closes the Bc4 diagonal AND prepares ...Be7 development. The standard French-like defense to the Sozin.",
      sayShort: '...e6 — close the diagonal.',
    }),
    b({
      id: 'sozin-bb3', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3',
      highlights: [{ square: 'b3', color: SOFT }],
      say: "Bb3 — White retreats the bishop to b3, keeping the f7-pressure alive while avoiding the imminent ...d5 fork. The Bb3 also avoids being captured by ...Nxc4 trade.",
      sayShort: 'Bb3 — keep the diagonal.',
    }),
    b({
      id: 'sozin-be7', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 Be7',
      highlights: [{ square: 'e7', color: KEY }],
      say: "...Be7 — Black develops the bishop to e7, preparing castling AND defending the d6-pawn indirectly. The Be7 also covers f6 for the eventual ...Nbd7 development.",
      sayShort: '...Be7 — classical setup.',
    }),
    b({
      id: 'sozin-castle', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 Be7 O-O O-O',
      highlights: [{ square: 'g8', color: KEY }, { square: 'g1', color: SOFT }],
      say: "O-O ...O-O — both sides castle kingside. The classical Sozin position with both kings safe. Now the middlegame is decided by piece coordination AND the central pawn break timing.",
      sayShort: 'O-O — both safe.',
    }),
    b({
      id: 'sozin-middlegame', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bc4 e6 Bb3 Be7 O-O O-O f4 Nc6',
      highlights: [{ square: 'f4', color: SOFT }, { square: 'c6', color: KEY }],
      say: "f4 ...Nc6 — White starts the kingside expansion with f4, Black develops the knight to c6 hitting Nd4. The middlegame structural fight: White's f4-e4 kingside attack vs Black's queenside ...b5 + ...Bb7 setup. 67.3% score for Naroditsky across 124 games.",
      sayShort: '...Nc6 — central attack.',
    }),
  ],
};

export const PRO_NARODITSKY_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-najdorf::Be3 English Attack': BE3_ENGLISH,
  'pro-naroditsky-najdorf::Be2 Classical': BE2_CLASSICAL,
  'pro-naroditsky-najdorf::h3 Adams Attack': H3_ADAMS,
  'pro-naroditsky-najdorf::Bc4 Sozin / Fischer Attack': BC4_SOZIN,
};
