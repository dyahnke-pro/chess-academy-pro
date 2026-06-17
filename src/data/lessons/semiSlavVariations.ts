import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Semi-Slav Defence. Lead-the-eye §5a.
// Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose only.
// Deepest beat ≥20 plies (lessonDepth gate).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'];

export const SEMI_SLAV_VARIATION_LESSONS: Record<string, LessonScript> = {
  'semi-slav::Anti-Meran Bd3 Line': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Anti-Meran (Bd3)', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'as1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3', say: "The Semi-Slav: Black builds the famous …d5/…c6/…e6 triangle, the soundest structure against 1.d4 — Slav solidity plus the option to grab the c4-pawn and play sharply. White develops Bd3, the Anti-Meran handling.", sayShort: 'the …d5/…c6/…e6 triangle.', highlights: [H('d5', KEY)] }),
      b({ id: 'as2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6 e4 c5 e5 cxd4 Nxb5 axb5', say: "Black grabs …dxc4 and expands with the Meran pawns …b5 and …a6. White throws everything forward — e4-e5 and the piece sacrifice Nxb5 — but after …axb5 the smoke clears with Black a clean piece ahead for a couple of pawns. The position is razor-sharp, but the material favours Black.", sayShort: '…axb5 — Black is up a piece.', highlights: [H('b5', KEY)] }),
      b({ id: 'as3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6 e4 c5 e5 cxd4 Nxb5 axb5 exf6 gxf6', say: "White grabs material back with exf6, and Black recaptures …gxf6 — yes, the kingside pawns are shattered, but the g-file rips open pointing at White's king, and Black keeps the extra material. Concrete play: structure traded for force.", sayShort: '…gxf6 — open the g-file, keep the edge.', highlights: [H('f6', KEY)] }),
      b({ id: 'as4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6 e4 c5 e5 cxd4 Nxb5 axb5 exf6 gxf6 O-O Qb6 Qe2 Bb7 Rd1 Rg8', say: "Black centralises …Qb6 to guard the extra d4-pawn, develops …Bb7 onto the long diagonal, and swings …Rg8 onto the open g-file straight at White's king. There is the Anti-Meran tabiya: Black has the extra material, the bishop pair, the b7-bishop raking the long diagonal, and the more dangerous attack — sharp, but objectively better for Black.", sayShort: '…Bb7, …Rg8 — material plus attack.', highlights: [H('b7', KEY), H('g8', SOFT), H('d4', SOFT)] }),
    ],
  },
  'semi-slav::Reynolds Variation': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Reynolds (…Bd6)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'rn1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6', say: "The active Semi-Slav with …Bd6 — instead of grabbing the pawn, Black develops the dark-squared bishop to its best square, aiming at White's kingside and preparing quick castling and a central break. Solid and harmonious.", sayShort: '…Bd6 — the active bishop, eyeing the king.', highlights: [H('d6', KEY)] }),
      b({ id: 'rn2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6 O-O O-O e4 dxe4 Nxe4 Nxe4 Bxe4 Nf6', say: "Both castle, White expands with e4, and Black resolves the centre crisply: …dxe4 and the knight trades, then …Nf6 hits the e4-bishop with tempo. Black neutralises White's central ambitions and develops with gain of time.", sayShort: '…Nf6 — hit the bishop, gain time.', highlights: [H('f6', KEY), H('e4', SOFT)] }),
      b({ id: 'rn3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6 O-O O-O e4 dxe4 Nxe4 Nxe4 Bxe4 Nf6 Bc2 c5 dxc5 Bxc5 Bg5 h6 Bh4 b6', say: "White retreats Bc2, and Black completes equality with the …c5 break, recapturing …Bxc5; after Bg5 …h6 Bh4, Black plays …b6 to fianchetto the last piece. There is the Reynolds tabiya: the freeing break achieved, active bishops on c5 and soon b7, and not a weakness in sight — clean, comfortable equality.", sayShort: '…c5, …b6 — the freeing break, full equality.', highlights: [H('c5', KEY), H('b6', SOFT)] }),
    ],
  },
  'semi-slav::Romih ...Bd6 System': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Romih (…Bd6 + …e5)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'ro1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6', say: "The Semi-Slav with the active …Bd6 again, the bishop trained on White's kingside. The Romih treatment aims to combine this development with grabbing queenside space and the central …e5 break.", sayShort: '…Bd6 — active bishop, …e5 in mind.', highlights: [H('d6', KEY)] }),
      b({ id: 'ro2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6 O-O O-O Qc2 dxc4 Bxc4 b5 Bd3 Bb7', say: "Black castles, then grabs …dxc4 and gains real queenside space with …b5, fianchettoing …Bb7 onto the long diagonal where it bears down on White's centre. Black's pieces are busy and well-placed.", sayShort: '…b5, …Bb7 — space and the long diagonal.', highlights: [H('b5', KEY), H('b7', SOFT)] }),
      b({ id: 'ro3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 Bd6 O-O O-O Qc2 dxc4 Bxc4 b5 Bd3 Bb7 a3 a6 e4 e5', say: "White props the centre with a3, Black replies …a6, and then the key …e5! break strikes White's centre and frees Black completely. There is the Romih tabiya: the active bishops on d6 and b7, queenside space, and the …e5 break achieved — a dynamic position where Black is comfortable and even a shade better.", sayShort: '…e5 — the freeing central break.', highlights: [H('e5', KEY), H('a6', SOFT), H('d6', SOFT)] }),
    ],
  },
  'semi-slav::Meran Variation Deeper': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Meran', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'm1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5', say: "The Meran — the great positional main line. When White develops quietly with e3 and Bd3, Black strikes: …dxc4 followed by …b5 gains a big chunk of queenside space and gets ready to free the light bishop. This is the classical Semi-Slav at its purest.", sayShort: '…b5 — Meran queenside expansion.', highlights: [H('b5')] }),
      b({ id: 'm2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6', say: "Bd3 retreats; …Bb7 develops the bishop behind the c6-pawn and …a6 buttresses the b5-point, all preparing the central break. The bishop is loaded — it will roar to life down the long diagonal the instant Black plays …c5.", sayShort: '…a6 — buttress b5, prepare …c5.', highlights: [H('b7'), H('a6')] }),
      b({ id: 'm3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5', say: "e4 claims the centre, and …c5! the Meran freeing break, striking at d4 and blasting open the long diagonal for the b7-bishop. This is the thematic moment the whole variation builds toward — the position bursts into dynamic life.", sayShort: '…c5 — the Meran freeing break.', highlights: [H('c5'), H('d4')] }),
      b({ id: 'm4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5 d5 Qc7 dxe6 fxe6', say: "White meets …c5 with d5; after …Qc7 and dxe6 …fxe6 Black gets a broad central pawn duo on e6 and c5 plus the half-open f-file for the rook. The structure is dynamic and double-edged — Black's pawns and bishops generate real play.", sayShort: '…fxe6 — central pawn duo, open f-file.', highlights: [H('e6'), H('c5')] }),
      b({ id: 'm5', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 Bb7 O-O a6 e4 c5 d5 Qc7 dxe6 fxe6 Bc2 Bd6 Ng5 Nf8 Qf3', say: "…Bd6 swings the bishop toward the kingside, and …Nf8 calmly defends the e6-pawn and the king. There is the Meran tabiya: Black with the bishop pair, a mobile central duo, and active piece play balancing White's lead in development — a rich middlegame Black plays for the win.", sayShort: '…Nf8 — defend, bishop pair, full play.', highlights: [H('d6'), H('e6', SOFT)] }),
    ],
  },

  'semi-slav::Botvinnik Variation Deep': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Botvinnik', minutes: 11, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'bo1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5', say: "The Botvinnik — the single most analysed variation in all of chess. Black grabs the pawn with …dxc4 and holds it with …b5, accepting an enormous theoretical battle. Both sides walk a knife-edge of forced lines memorised dozens of moves deep.", sayShort: '…b5 — enter the great theoretical maze.', highlights: [H('c4'), H('b5')] }),
      b({ id: 'bo2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7', say: "e5 hits the f6-knight, …h6 and …g5 attack the bishop — and White sacrifices the knight with Nxg5! After …hxg5 Bxg5 the famous Botvinnik position is on the board: White has two pawns and an attack for the piece, Black the extra material and a fortress to build.", sayShort: '…Nbd7 — take the piece, brace for the storm.', highlights: [H('g5')] }),
      b({ id: 'bo3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7 exf6 Bb7 g3 c5', say: "exf6 grabs back a piece, and …Bb7 develops the freed bishop down the long diagonal, glaring at the h1-corner and White's uncastled king, with …c5 ripping open the centre. Black's bishops and queenside pawns become a thundering counter-attack — the defence turns into offence.", sayShort: '…c5 — rip open the centre, attack.', arrows: [A('b7', 'h1')], highlights: [H('b7'), H('c5')] }),
      b({ id: 'bo4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7 exf6 Bb7 g3 c5 d5 Qb6 Bg2 O-O-O O-O b4 Na4 Qa6', say: "d5 …Qb6 and …O-O-O tuck the king behind the pawn avalanche; …b4 chases the knight to a4 and …Qa6 steps off the fork, keeping the queenside storm rolling. There is the Botvinnik tabiya: bedlam — White's central pawns and attack against Black's extra piece, queenside pawn storm, and bishop pair. Be honest before you wield it: this is the sharpest forced territory in all of chess, and along this most-played continuation the engine and modern practice favour White. Black is defending under real pressure, leaning on the extra piece as a long-term hope. Enter only with deep, memorised preparation — a high-risk surprise weapon, not a comfortable equaliser.", sayShort: '…Qa6 — sharpest chaos; White holds the edge.', highlights: [H('b4'), H('a6')] }),
    ],
  },

  'semi-slav::Moscow Variation Bxf6': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Moscow (Bxf6)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'mo1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6', say: "The Moscow — White avoids the wild …g5 lines by simply trading on f6. After …Qxf6 Black has the bishop pair and a sound, flexible structure. White gives up a bishop to dodge the Botvinnik chaos; Black is happy to take the long-term asset.", sayShort: '…Qxf6 — take the bishop pair.', highlights: [H('f6')] }),
      b({ id: 'mo2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6', say: "Black develops …Nd7, releases the centre with …dxc4, and prepares …g6 — the dark bishop will fianchetto to g7, the ideal post now that its partner is gone. Black builds a harmonious King's-Indian-flavoured set-up around the bishop pair.", sayShort: '…g6 — prep the g7 fianchetto.', highlights: [H('g6')] }),
      b({ id: 'mo3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6 O-O Bg7 e4 e5', say: "…Bg7 completes the fianchetto and Black strikes the centre with …e5! Backed by the queen on f6 and the bishop on g7, the break opens the position exactly where Black's pieces are strongest. The bishop pair starts to tell.", sayShort: '…e5 — strike the centre, bishops awake.', highlights: [H('g7'), H('e5')] }),
      b({ id: 'mo4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 h6 Bxf6 Qxf6 e3 Nd7 Bd3 dxc4 Bxc4 g6 O-O Bg7 e4 e5 d5 O-O Bb3', say: "White closes with d5; Black castles into a sound, King's-Indian-like position. There is the Moscow tabiya: the bishop pair, a fianchettoed dark bishop on g7, the queen actively placed on f6, and a flexible structure where Black is comfortable and plays for the two bishops in an eventual opening of the game.", sayShort: '…O-O — bishop pair, comfortable game.', highlights: [H('d5'), H('g7', SOFT)] }),
    ],
  },

  'semi-slav::Stoltz Qc2 Variation': {
    openingId: 'semi-slav', title: 'Semi-Slav — The Stoltz (Qc2)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'st1', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6', say: "The Stoltz — White develops the queen to c2 instead of the bishop, a flexible anti-Meran. Black responds with the active …Bd6, the bishop pointing straight at the h2-square and White's kingside. Black develops with purpose rather than passively.", sayShort: '…Bd6 — active bishop, aim at h2.', arrows: [A('d6', 'h2')], highlights: [H('d6'), H('h2')] }),
      b({ id: 'st2', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5', say: "Black castles, then frees with …dxc4 and grabs queenside space with …b5 — the familiar Semi-Slav expansion, gaining room and clearing b7 for the bishop. The light bishop's liberation is always the central theme.", sayShort: '…b5 — free the bishop, take space.', highlights: [H('b5')] }),
      b({ id: 'st3', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5 Bd3 Bb7 e4 e5', say: "…Bb7 takes the long diagonal, and when White plays e4 Black strikes back in the centre with …e5! Striking immediately at d4 before White consolidates, opening lines for the well-placed bishops on b7 and d6.", sayShort: '…e5 — counterstrike the centre.', highlights: [H('b7'), H('e5')] }),
      b({ id: 'st4', moves: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Qc2 Bd6 Bd3 O-O O-O dxc4 Bxc4 b5 Bd3 Bb7 e4 e5 dxe5 Nxe5 Nxe5 Bxe5 f3', say: "dxe5 …Nxe5 Nxe5 …Bxe5 trades into the centre, and …Bxe5 leaves a powerful bishop dominating the centre. There is the Stoltz tabiya: Black fully developed, both bishops active, the centre resolved, and easy equality with the more harmonious pieces.", sayShort: '…Bxe5 — dominant bishop, full equality.', highlights: [H('e5')] }),
    ],
  },
};
