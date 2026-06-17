import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Nimzo-Indian Defence. Lead-the-eye
// §5a. DB-anchored + masters-extended ≥20 plies.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

export const NIMZO_INDIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'nimzo-indian::Classical Variation (4.Qc2)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Classical (4.Qc2)', minutes: 11, orientation: 'black',
    sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'ncl1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2', say: "The Classical, or Capablanca Variation — 4.Qc2. White's idea is pure: if Black trades on c3, the queen recaptures, so White keeps a clean pawn structure and the bishop pair, with no doubled pawns to nurse. It is the most respected, ambitious anti-Nimzo.", sayShort: 'Qc2 — recapture on c3 with the queen.', highlights: [H('c3', SOFT)] }),
      b({ id: 'ncl2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3', say: "Black castles, and after a3 makes the principled trade …Bxc3+. Yes, this hands White the bishop pair — but in return Black gets the easiest development in chess and a clear target in White's centre. That is the whole Nimzo bargain: give up a bishop to play against the pawns.", sayShort: '…Bxc3+ — trade for the structure.', highlights: [H('c3')] }),
      b({ id: 'ncl3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6', say: "…d5 challenges the centre at once; …dxc4 drags the queen to c4, and …b6 prepares the key idea — …Ba6, developing the light-squared bishop with tempo straight at the exposed queen. Black gains time on almost every move.", sayShort: '…b6 — prepare …Ba6 with tempo.', highlights: [H('c4')] }),
      b({ id: 'ncl4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Ba6 Qa4 h6 Bh4 c5', say: "…Ba6! hits the queen and drives it to a4; then …c5 strikes the centre. Black's pieces pour out with gain of tempo — the a6-bishop pressures c4 and the light squares, and the c-pawn challenges d4. White's extra bishop has nothing to bite on yet.", sayShort: '…Ba6, …c5 — develop and strike.', highlights: [H('a6'), H('c5')] }),
      b({ id: 'ncl5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 d5 Nf3 dxc4 Qxc4 b6 Bg5 Ba6 Qa4 h6 Bh4 c5 dxc5 bxc5 Rd1 Qb6', say: "…bxc5 leaves Black with active hanging pawns on c5, and …Qb6 centralises the queen, defending and eyeing both wings. There is the Classical Nimzo tabiya: Black fully developed, the a6-bishop and the queen on b6 active, the structure sound. White's bishop pair gives a tiny pull, but Black's piece activity keeps it a comfortable, fully equal fight — exactly the Nimzo's promise.", sayShort: '…Qb6 — active, equal, the Nimzo balance.', highlights: [H('b6'), H('c5')] }),
    ],
  },
  'nimzo-indian::Rubinstein System (4.e3)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Rubinstein (4.e3)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'ru1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3', say: "The Rubinstein — 4.e3, the most flexible and popular system. White develops modestly, keeps options open, and waits to see how Black commits. Black answers with classical development, ready to strike the centre with …d5 and …c5 and to trade on c3 when it damages White.", sayShort: 'e3 — the flexible main system.', highlights: [H('c3', SOFT)] }),
      b({ id: 'ru2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5', say: "…O-O, …d5 and …c5 — Black contests the centre directly, the classical Nimzo plan against e3. The position resembles a Queen's Gambit but with the bishop already active on b4, pinning the knight and pressuring White's centre.", sayShort: '…d5, …c5 — contest the centre.', highlights: [H('d5'), H('c5')] }),
      b({ id: 'ru3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 Nbd7 Qe2 b6 Rd1 Bb7', say: "Both castle; Black clarifies with …dxc4 and fianchettoes …b6 and …Bb7, the light bishop raking the long diagonal at e4 and White's king. Every black piece has a job — the b7-bishop, the b4-bishop, the knights — all bearing on the centre and the light squares.", sayShort: '…Bb7 — trained on e4 and the king.', arrows: [A('b7', 'e4', SOFT)], highlights: [H('e4')] }),
      b({ id: 'ru4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 Nbd7 Qe2 b6 Rd1 Bb7 d5 Bxc3', say: "White lunges d5 to break the bind, and Black takes the moment to trade …Bxc3 — damaging White's structure exactly when it counts. There is the Rubinstein tabiya: Black has the bishop on b7, harmonious pieces, and pressure on White's centre and queenside. A rich, balanced battle where Black is fully comfortable.", sayShort: '…Bxc3 — trade at the right moment.', highlights: [H('c3')] }),
    ],
  },

  'nimzo-indian::Huebner Variation (4.e3 c5)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Hübner (doubled pawns + blockade)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'hu1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3', say: "The Hübner — the purest expression of the Nimzo idea. Black strikes with …c5, develops …Nc6, then trades …Bxc3+ bxc3, saddling White with doubled c-pawns. This is the structural prize Nimzowitsch sought: a fixed weakness Black will blockade and besiege.", sayShort: '…Bxc3+ — double the c-pawns.', highlights: [H('c3')] }),
      b({ id: 'hu2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6', say: "…d6 — the key restraining move. Black fixes the structure and prepares …e5, clamping the dark squares. The doubled c-pawns are now a permanent target, and Black's knights will dominate the light squares in front of them.", sayShort: '…d6 — fix the structure, prepare …e5.', highlights: [H('d6')] }),
      b({ id: 'hu3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6 O-O e5', say: "…e5! The Hübner blockade. Black clamps the centre, fixing White's c4-pawn as a chronic weakness and killing the d3-bishop's scope. White's bishop pair is neutralised by the locked pawns; Black's knights are the better minor pieces.", sayShort: '…e5 — clamp the centre, fix c4.', highlights: [H('e5'), H('c4', SOFT)] }),
      b({ id: 'hu4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6 O-O e5 Nd2 O-O Nb3 Re8', say: "White reroutes the knight toward c4 and Black completes with …O-O and …Re8, supporting …e4 and the kingside. There is the Hübner tabiya: White has the bishop pair but doubled, blockaded c-pawns; Black has the superior structure and the knights' grip on the light squares. The textbook Nimzo strategic win.", sayShort: '…Re8 — support …e4, press the weak pawns.', highlights: [H('c4')] }),
    ],
  },

  'nimzo-indian::Leningrad Variation (4.Bg5)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Leningrad (4.Bg5)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'le1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4', say: "The Leningrad — 4.Bg5, the aggressive try, pinning the f6-knight to add pressure on the centre. Black immediately puts the question with …h6, and after Bh4 the bishop is committed. Black will exploit its absence from the queenside with the thematic doubling of White's pawns.", sayShort: '…h6 — question the g5-bishop.', highlights: [H('f6', SOFT)] }),
      b({ id: 'le2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 d6 e3 Bxc3+ bxc3', say: "…c5 strikes the centre, White locks with d5, and Black trades …Bxc3+ bxc3 — the doubled c-pawns appear again. With the dark-squared bishop gone, Black will blockade and target the weak pawns, just like the Hübner.", sayShort: '…Bxc3+ — double the c-pawns.', highlights: [H('c3')] }),
      b({ id: 'le3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 d6 e3 Bxc3+ bxc3 e5', say: "…e5! The blockade. Black clamps the centre and fixes White's doubled c-pawns as a permanent weakness. The position is closed in Black's favour — White's bishops have no scope, and Black's plan is clear: pile on the queenside pawns and play on the kingside.", sayShort: '…e5 — clamp and fix the weak pawns.', highlights: [H('e5')] }),
      b({ id: 'le4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Bg5 h6 Bh4 c5 d5 d6 e3 Bxc3+ bxc3 e5 Bd3 Nbd7 Ne2 Qe7 O-O g5 Bg3', say: "…Nbd7, …Qe7, and then …g5! — Black gains kingside space and shuts the h4-bishop out of the game, forcing it back to g3 where it bites on the e5-granite. There is the Leningrad tabiya: doubled white c-pawns, a clamped centre, and Black launching a kingside pawn storm with …g5-g4. Black holds all the trumps.", sayShort: '…g5 — grab space, entomb the bishop.', highlights: [H('g5')] }),
    ],
  },

  'nimzo-indian::Kasparov Variation (4.Nf3)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Kasparov (4.Nf3)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'ka1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3', say: "The Kasparov Variation — 4.Nf3 followed by a kingside fianchetto with g3. White avoids the doubled pawns and aims for a smooth, harmonious setup. Black hits the centre with …c5 and prepares to fight for the central light squares with …d5.", sayShort: '…c5 — strike the centre vs the fianchetto.', highlights: [H('c5')] }),
      b({ id: 'ka2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5', say: "…cxd4 opens the centre and …d5! challenges White's grip head-on. Black refuses to be squeezed by the fianchetto — by striking in the centre at once, the light-squared battle is joined on equal terms.", sayShort: '…d5 — challenge the fianchetto centre.', highlights: [H('d5')] }),
      b({ id: 'ka3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5 Qb3 Qa5 Bd2 Nc6 Nxc6 bxc6', say: "The centre clears: …Nxd5 centralises, and after the knight trade …bxc6 Black gets a solid pawn mass and the half-open b-file. White's fianchettoed bishop bites on Black's firm centre; the position is balanced and full of life.", sayShort: '…bxc6 — solid centre, open b-file.', highlights: [H('c6'), H('d5', SOFT)] }),
      b({ id: 'ka4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 Nf3 c5 g3 cxd4 Nxd4 O-O Bg2 d5 cxd5 Nxd5 Qb3 Qa5 Bd2 Nc6 Nxc6 bxc6 O-O Bxc3 bxc3 Ba6 Rfd1 Qc5', say: "Black trades …Bxc3 to fracture White's queenside, then …Ba6 activates the light bishop on the open a6-f1 diagonal and …Qc5 centralises. There is the Kasparov tabiya: doubled white c-pawns, Black's bishop raking the light squares, and full equality with active piece play. Even against the smoothest setup, the Nimzo's structural ideas deliver.", sayShort: '…Ba6, …Qc5 — activate, hit the weak pawns.', highlights: [H('c3')] }),
    ],
  },

  'nimzo-indian::Saemisch Variation (4.a3)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Sämisch (4.a3)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'sa1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3', say: "The Sämisch — White plays 4.a3 at once, forcing …Bxc3+ bxc3. White voluntarily accepts doubled c-pawns to gain the bishop pair and a big pawn centre. It is the sharpest test of the Nimzo bargain: White's centre and bishops versus Black's structural targets.", sayShort: '…Bxc3+ — doubled pawns vs the bishop pair.', highlights: [H('c3')] }),
      b({ id: 'sa2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6', say: "…c5 and …Nc6 attack the d4-centre and the doubled pawns immediately. Black's strategy is clear: blockade White's pawns on the light squares, trade off White's good pieces, and prove the doubled c-pawns a long-term liability before White's centre rolls.", sayShort: '…c5, …Nc6 — attack the doubled pawns.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'sa3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8', say: "White builds with e4 and Black regroups …b6 and …Ne8 — the knight reroutes to d6 to blockade c4 and watch e4/f5. Black sets up the classic Sämisch blockade: pieces on the light squares in front of White's pawn chain, ready to exploit the doubled c-pawns once the centre is contained.", sayShort: '…Ne8 — reroute to blockade c4 and d6.', highlights: [H('c4')] }),
      b({ id: 'sa4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 a3 Bxc3+ bxc3 c5 e3 Nc6 Bd3 O-O Ne2 b6 e4 Ne8 O-O Ba6 f4', say: "…Ba6 trains the light bishop on c4 and the f1-rook, and White lashes out with f4 to animate the centre. There is the Sämisch tabiya: a tense battle of White's big centre and bishop pair against Black's blockade and the doubled c-pawn target. Hold the blockade, trade White's attackers, and the structure tells.", sayShort: '…Ba6 — pressure c4; the blockade holds.', arrows: [A('a6', 'c4')], highlights: [H('c4')] }),
    ],
  },

  'nimzo-indian::4.f3 (Aggressive Center)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The 4.f3 (Aggressive Centre)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'f1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5', say: "4.f3 — the most ambitious try. White prepares e4 to build a huge pawn centre, ignoring development. Black hits back immediately with …d5, refusing to let White set up unchallenged. The position becomes sharp and concrete at once.", sayShort: '…d5 — challenge before e4 lands.', highlights: [H('d5')] }),
      b({ id: 'f2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Bxc3+ bxc3 c5', say: "a3 forces …Bxc3+ bxc3, and Black strikes with …c5. White has the doubled c-pawns and a centre that is not yet built; Black's plan is to open lines against the structure before White can consolidate the e4-push.", sayShort: '…c5 — open lines vs the doubled pawns.', highlights: [H('c5'), H('c3', SOFT)] }),
      b({ id: 'f3m', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Bxc3+ bxc3 c5 cxd5 exd5 e3 c4', say: "cxd5 exd5, and …c4! — Black clamps the queenside, fixing White's doubled c-pawns and gaining space. White's centre is blunted, and the c4-pawn cramps White while Black prepares to develop the pieces against the static weaknesses.", sayShort: '…c4 — clamp, fix the doubled pawns.', highlights: [H('c4')] }),
      b({ id: 'f4m', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 f3 d5 a3 Bxc3+ bxc3 c5 cxd5 exd5 e3 c4 Nh3 Bxh3 gxh3 Nc6 Bg2 Na5', say: "White's knight detours to h3, and Black snaps it off — …Bxh3! gxh3 wrecks White's kingside pawns. Then …Nc6 and …Na5 swarm the c4-clamp and White's shattered queenside. There is the 4.f3 tabiya: White's grand central ambitions have produced doubled c-pawns, a ruined kingside, and a clamped queenside — Black is clearly better with a dream Nimzo position.", sayShort: '…Bxh3, …Na5 — wreck White, swarm the pawns.', arrows: [A('a5', 'c4')], highlights: [H('c4'), H('h3', SOFT)] }),
    ],
  },

  'nimzo-indian::Fischer Variation (4.e3 b6)': {
    openingId: 'nimzo-indian', title: 'Nimzo — The Fischer (4.e3 b6)', minutes: 10, orientation: 'black',
    sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
    beats: [
      b({ id: 'fi1', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 b6', say: "The Fischer Variation — against 4.e3 Black plays …b6 at once, preparing the light-squared fianchetto …Bb7. The idea is to control e4 with the bishop rather than commit the centre early. Fischer favoured this flexible, light-square-focused treatment.", sayShort: '…b6 — fianchetto, control e4 by piece.', highlights: [H('b6'), H('e4', SOFT)] }),
      b({ id: 'fi2', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 b6 Bd3 Bb7 Nf3 O-O O-O d5', say: "…Bb7 rakes the long diagonal at e4, Black castles, and only now plays …d5 — having first secured control of e4 with the bishop. The Nimzo and the Queen's Indian blend: the b4-bishop pins, the b7-bishop watches the centre, and Black is rock-solid.", sayShort: '…Bb7, …d5 — control e4, then strike.', highlights: [H('e4')] }),
      b({ id: 'fi3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 b6 Bd3 Bb7 Nf3 O-O O-O d5 cxd5 exd5 a3 Bd6', say: "cxd5 exd5 and a3 — but Black retreats …Bd6! rather than trade, keeping the bishop pair and aiming it at h2 and White's kingside. With the d5-pawn supported and both bishops active, Black has a harmonious, dynamic position.", sayShort: '…Bd6 — keep the bishop, eye the kingside.', arrows: [A('d6', 'h2', SOFT)], highlights: [H('h2')] }),
      b({ id: 'fi4', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 b6 Bd3 Bb7 Nf3 O-O O-O d5 cxd5 exd5 a3 Bd6 b4 Nbd7 Qb3 a5', say: "b4 grabs queenside space, but Black hits back with …Nbd7 and …a5, challenging the b4-pawn and opening lines. There is the Fischer tabiya: Black has the two bishops, a sound centre, and active play on both wings. The flexible …b6 setup gives Black a comfortable, fighting game with no weaknesses.", sayShort: '…a5 — challenge b4, open lines.', highlights: [H('a5'), H('b4', SOFT)] }),
    ],
  },
};
