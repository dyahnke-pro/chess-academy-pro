import type { LessonScript, LessonBeat, AnnotationHighlight } from '../../types';

// Pro Naroditsky Najdorf — variation lessons for his 1,475-game Najdorf as
// Black, every-step house voice (David 2026-07-02). Covers White's four most-
// faced setups: Be3 English Attack, Be2 Classical, h3 Adams, Bc4 Sozin. Each
// spine board-verified to a middlegame and engine-checked (Black -0.23..-0.60,
// all sound). Original prose; no quoting. Highlights lead the eye (this file
// uses highlights only — pieces/squares the narration names).

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

const NAJ = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6';

// ============================================================
// Be3 English Attack — the sharpest test, opposite-side race.
// ============================================================
const BE3_ENGLISH: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Be3 English Attack — the opposite-castling race',
  minutes: 9,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'be3', moves: `${NAJ} Be3`,
      highlights: [{ square: 'e3', color: KEY }],
      say: "You'll reach this when White plays Be3 — the English Attack, and the sharpest test of the whole Najdorf. The bishop looks modest, but it announces a fierce plan: f3 to brace the centre, Qd2, long castling, and then the g- and h-pawns come storming at our king. We're not going to sit and defend; we're going to race on the other wing.",
      sayShort: 'Be3 — the English Attack.',
    }),
    b({
      id: 'e5', moves: `${NAJ} Be3 e5`,
      highlights: [{ square: 'e5', color: KEY }, { square: 'd4', color: SOFT }],
      say: "e5 — the defining Najdorf strike. We kick the d4-knight away and seize a share of the centre. Yes, it leaves a hole on d5 and the d6-pawn a touch backward, but in return we get active piece play and, crucially, we start dictating the tempo of the game rather than waiting for White's storm.",
      sayShort: 'e5 — the Najdorf strike.',
    }),
    b({
      id: 'nb3-be6', moves: `${NAJ} Be3 e5 Nb3 Be6`,
      highlights: [{ square: 'b3', color: SOFT }, { square: 'e6', color: KEY }],
      say: "The knight retreats to b3, and we develop Be6 — a purposeful square. The bishop guards the d5-hole so a white knight can't settle there comfortably, and it looks toward the queenside where our counterplay will come. Every piece we place has one eye on White's future king.",
      sayShort: 'Be6 — cover d5, eye queenside.',
    }),
    b({
      id: 'f3-nbd7', moves: `${NAJ} Be3 e5 Nb3 Be6 f3 Nbd7`,
      highlights: [{ square: 'f3', color: SOFT }, { square: 'd7', color: KEY }],
      say: "White plays f3, the prophylactic brace that clears the path for g4. We develop Nbd7 — the knight belongs here, ready to reroute to b6 and c4 in the coming race, and keeping the c-file free for our heavy pieces. Both sides are loading their guns for opposite wings.",
      sayShort: 'Nbd7 — reroute toward c4.',
    }),
    b({
      id: 'qd2-b5', moves: `${NAJ} Be3 e5 Nb3 Be6 f3 Nbd7 Qd2 b5`,
      highlights: [{ square: 'b5', color: KEY }],
      say: "Qd2 completes White's setup — and we fire the starting gun with b5. This is the heart of the Najdorf: the moment White commits to the kingside, we strike on the queenside where White's king is heading. The b5-pawn prepares b4 to kick the c3-knight and opens lines toward c1. It's a race, and we've moved first.",
      sayShort: 'b5 — fire the queenside race.',
    }),
    b({
      id: 'ooo-nb6', moves: `${NAJ} Be3 e5 Nb3 Be6 f3 Nbd7 Qd2 b5 O-O-O Nb6`,
      highlights: [{ square: 'c1', color: SOFT }, { square: 'b6', color: KEY }],
      say: "White castles long — the king walks right into the zone we're attacking — and we reroute with Nb6, heading for the c4- and a4-squares that bite into White's position. The signature Najdorf race is fully set: whoever cracks open the enemy king's files first wins, and our attack has a head start down the b- and c-files. The engine reads it near-level, but this is the sharpest, most double-edged fight in chess, and we're the ones already knocking.",
      sayShort: 'O-O-O Nb6 — the race is joined.',
    }),
  ],
};

// ============================================================
// Be2 Classical — the quiet, positional Najdorf.
// ============================================================
const BE2_CLASSICAL: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Be2 Classical — the quiet positional fight',
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'be2', moves: `${NAJ} Be2`,
      highlights: [{ square: 'e2', color: KEY }],
      say: "You'll see Be2 when White wants a quiet life — the Classical Najdorf. The bishop simply develops without pinning or attacking anything; White is content to castle short and play a slow positional game. That suits us fine: with no pawn storm to survive, our sound Najdorf structure and better long-term plans come into their own.",
      sayShort: 'Be2 — the quiet Classical.',
    }),
    b({
      id: 'e5', moves: `${NAJ} Be2 e5`,
      highlights: [{ square: 'e5', color: KEY }],
      say: "e5 — the same central strike, kicking the knight back. In this quieter setting the point is a little different: there's no race, so e5 is about claiming central space and the d4-outpost for our own pieces later. We're playing for a good, comfortable middlegame, not fireworks.",
      sayShort: 'e5 — claim the centre.',
    }),
    b({
      id: 'nb3-be7', moves: `${NAJ} Be2 e5 Nb3 Be7`,
      highlights: [{ square: 'e7', color: KEY }],
      say: "The knight goes to b3, and we develop the bishop to e7 — not e6 this time. In the Classical we're headed for a normal kingside castle and a healthy game, so the bishop takes the flexible e7-square, supporting the kingside and clearing the back rank to castle.",
      sayShort: 'Be7 — flexible, prepare O-O.',
    }),
    b({
      id: 'be3-oo', moves: `${NAJ} Be2 e5 Nb3 Be7 Be3 O-O`,
      highlights: [{ square: 'g8', color: KEY }, { square: 'e3', color: SOFT }],
      say: "White develops Be3 and we castle. Both kings settle on the kingside — this is confirmed as a manoeuvring, positional battle, no opposite-wing storm. From a safe, sound position we can now turn to the plan that quietly favours us.",
      sayShort: 'O-O — a manoeuvring game.',
    }),
    b({
      id: 'qd2-be6', moves: `${NAJ} Be2 e5 Nb3 Be7 Be3 O-O Qd2 Be6`,
      highlights: [{ square: 'e6', color: KEY }, { square: 'd2', color: SOFT }],
      say: "White connects the rooks with Qd2, and we complete development with Be6 — covering d5 and preparing the queenside expansion. The piece placement looks symmetric, but our plan is the clearer one: Nbd7, then Nb6 and b5, rolling on the queenside while White lacks a comparable break. A pleasant, near-level position where understanding decides.",
      sayShort: 'Be6 — prep the queenside plan.',
    }),
  ],
};

// ============================================================
// h3 Adams Attack — freeze the kingside with ...h5.
// ============================================================
const H3_ADAMS: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'h3 Adams Attack — freeze it with ...h5',
  minutes: 7,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'h3', moves: `${NAJ} h3`,
      highlights: [{ square: 'h3', color: KEY }, { square: 'g4', color: SOFT }],
      say: "You'll meet h3 in the modern Adams Attack. It's a quiet-looking move with a sharp idea: White prepares g4 and a kingside pawn storm without committing the king yet, and takes the g4-square away from our pieces. The key is that it's slow — which gives us time to shut the whole plan down before it starts.",
      sayShort: 'h3 — prepares g4 (Adams).',
    }),
    b({
      id: 'e5', moves: `${NAJ} h3 e5`,
      highlights: [{ square: 'e5', color: KEY }],
      say: "e5 — the Najdorf strike, kicking the knight. We grab our central space as always, and now we turn our attention to White's coming g4: we won't sit and let the storm build. The antidote is on the very next move.",
      sayShort: 'e5 — strike, then stop g4.',
    }),
    b({
      id: 'nde2-h5', moves: `${NAJ} h3 e5 Nde2 h5`,
      highlights: [{ square: 'h5', color: KEY }, { square: 'g4', color: SOFT }],
      say: "The knight drops to e2, and we play the precise h5 — the Adams antidote. By planting our own pawn on h5 we freeze the g4-square solid: White simply cannot achieve the g4 pawn break that the whole h3 plan was built around. We've defused the attack before it existed, and now the game flows to our positional strengths.",
      sayShort: 'h5 — freeze g4, defuse the storm.',
    }),
    b({
      id: 'bg5-be6', moves: `${NAJ} h3 e5 Nde2 h5 Bg5 Be6`,
      highlights: [{ square: 'g5', color: SOFT }, { square: 'e6', color: KEY }],
      say: "White tries Bg5, pinning the f6-knight to look for another plan, and we calmly develop Be6 — ignoring the pin. It doesn't bite: our king isn't castled, so the knight isn't tied to defending it, and the bishop gets on with covering d5 and eyeing the queenside. We refuse to be rushed.",
      sayShort: 'Be6 — develop, the pin is harmless.',
    }),
    b({
      id: 'bxf6-qxf6', moves: `${NAJ} h3 e5 Nde2 h5 Bg5 Be6 Bxf6 Qxf6`,
      highlights: [{ square: 'f6', color: KEY }],
      say: "White resolves the pin with Bxf6 and we recapture with the queen. The queen stands beautifully on f6: it guards our kingside, eyes the centre and the b2-pawn, and we keep a rock-solid structure with the two bishops. White's slow attacking scheme has come to nothing, and Black is comfortable — exactly what the ...h5 freeze promised.",
      sayShort: 'Qxf6 — solid, White has nothing.',
    }),
  ],
};

// ============================================================
// Bc4 Sozin / Fischer Attack — meet it with the calm ...e6.
// ============================================================
const BC4_SOZIN: LessonScript = {
  openingId: 'pro-naroditsky-najdorf',
  title: 'Bc4 Sozin / Fischer Attack — the calm ...e6 defence',
  minutes: 8,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'bc4', moves: `${NAJ} Bc4`,
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "Bc4 is the Sozin, or Fischer Attack — White's most bloodthirsty Najdorf try. The bishop aims straight down the diagonal at f7, the tenderest square near our king, dreaming of sacrifices and a direct assault. The antidote is not panic but a calm, precise move that slams the door.",
      sayShort: 'Bc4 — the Sozin aims at f7.',
    }),
    b({
      id: 'e6', moves: `${NAJ} Bc4 e6`,
      highlights: [{ square: 'e6', color: KEY }, { square: 'c4', color: SOFT }],
      say: "e6 — the key move. This little pawn blunts the c4-bishop's diagonal completely: f7 is no longer a target, and the whole Sozin sacrifice-dream evaporates. It also prepares Be7 and a normal, healthy development. Against the scariest-looking attack, the cure is a quiet structural move.",
      sayShort: 'e6 — slam the diagonal shut.',
    }),
    b({
      id: 'bb3', moves: `${NAJ} Bc4 e6 Bb3`,
      highlights: [{ square: 'b3', color: KEY }],
      say: "White tucks the bishop back to b3, keeping it on the a2-g8 diagonal and sidestepping any future d5 fork or a Na5 trade. The bishop still glares toward our king, but with e6 played it bites on granite. We've neutralised the piece White was counting on and can develop in peace.",
      sayShort: 'Bb3 — the bishop bites granite now.',
    }),
    b({
      id: 'be7', moves: `${NAJ} Bc4 e6 Bb3 Be7`,
      highlights: [{ square: 'e7', color: KEY }],
      say: "Be7 develops the bishop and prepares to castle. It's an unassuming move that does quiet work: it shelters the king's approach, covers the f6-knight, and keeps our structure flexible. In the Sozin, solid and sensible beats flashy every time.",
      sayShort: 'Be7 — develop, prepare to castle.',
    }),
    b({
      id: 'oo', moves: `${NAJ} Bc4 e6 Bb3 Be7 O-O O-O`,
      highlights: [{ square: 'g8', color: KEY }, { square: 'g1', color: SOFT }],
      say: "Both sides castle kingside. Our king is safe, the Sozin's initial venom is fully contained, and we've reached a rich middlegame on equal terms. White will look to expand, but we have a sound position and clear plans of our own.",
      sayShort: 'O-O — king safe, venom contained.',
    }),
    b({
      id: 'f4-nc6', moves: `${NAJ} Bc4 e6 Bb3 Be7 O-O O-O f4 Nc6`,
      highlights: [{ square: 'f4', color: SOFT }, { square: 'c6', color: KEY }],
      say: "White grabs kingside space with f4, and we develop Nc6, hitting the d4-knight and gaining time. Now the middlegame battle-lines are drawn: White pushes on the kingside with f4 and e-file play, while we counter on the queenside with b5 and Bb7. It's a balanced, double-edged fight where our solid setup and clear counterplan hold their own.",
      sayShort: 'Nc6 — hit d4, counter on the wing.',
    }),
  ],
};

export const PRO_NARODITSKY_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-najdorf::Be3 English Attack': BE3_ENGLISH,
  'pro-naroditsky-najdorf::Be2 Classical': BE2_CLASSICAL,
  'pro-naroditsky-najdorf::h3 Adams Attack': H3_ADAMS,
  'pro-naroditsky-najdorf::Bc4 Sozin / Fischer Attack': BC4_SOZIN,
};
