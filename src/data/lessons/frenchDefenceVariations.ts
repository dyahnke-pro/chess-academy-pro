import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the French Defence masterclass.
// Lead-the-eye colours (playbook §5a): GREEN arrows (vision / intent), YELLOW
// highlights (a key square the narration names), SOFT BLUE (secondary). Move
// squares auto-painted orange. Every arrow originates on a non-pawn with a
// clear sight-line; every marked square is named in the prose. Lines are
// DB-anchored and masters-extended to ≥20 plies.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';

const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit {
  id: string;
  moves: string;
  say: string;
  sayShort?: string;
  arrows?: AnnotationArrow[];
  highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}

export const FRENCH_DEFENCE_VARIATION_LESSONS: Record<string, LessonScript> = {
  'french-defence::Advance Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Advance Variation',
    minutes: 11,
    orientation: 'black',
    beats: [
      b({ id: 'adv1', moves: 'e4 e6 d4 d5 e5 c5', say: "The Advance — White's most direct try, grabbing space at once with 3.e5. The centre is locked, and that suits Black just fine: a fixed pawn chain hands you a fixed target. The base of White's chain is the d4-pawn, and Black strikes it immediately with …c5. From here the whole game is a clean strategic battle over d4.", sayShort: '…c5 — strike the base of the chain, d4.', highlights: [H('e5'), H('d4'), H('c5', SOFT)] }),
      b({ id: 'adv2', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6', say: "c3 props the d4-pawn — White will not give up the chain cheaply — and Black develops …Nc6, a second attacker on d4. Every black piece in the Advance has one early job: add pressure to that one square. The knight on c6 is the first and most natural.", sayShort: '…Nc6 — a second attacker on d4.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'adv3', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6', say: "Nf3 defends; Black uncorks the thematic …Qb6, the most important move of the variation. The queen eyes d4 a third time and simultaneously rakes the b2-pawn down the b-file. White's b2 is suddenly awkward to defend — Bc1 is hemmed in — and this twin pressure is the engine of all Black's queenside play.", sayShort: '…Qb6 — hit d4 and the b2-pawn.', arrows: [A('b6', 'b2')], highlights: [H('b2'), H('d4', SOFT)] }),
      b({ id: 'adv4', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4', say: "a3 prepares b4 to gain queenside space; Black answers with the committal …c4, clamping the queenside and freezing White's pawns. Black surrenders the tension on d4 but gains something bigger: a permanent space advantage on the queenside and the b3-square as a knight outpost. The plan now is …Na5–b3.", sayShort: '…c4 — clamp the queenside, eye b3.', highlights: [H('c4'), H('b3', SOFT)] }),
      b({ id: 'adv5', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5', say: "Nbd2 heads for the blockade; Black reroutes with …Na5, beginning the journey to b3 where the knight would be a monster — forking c1 and d4 and jamming White's queenside forever. White must spend real effort to contest the b3-square, and that effort is time Black uses elsewhere.", sayShort: '…Na5 — reroute toward the b3 outpost.', arrows: [A('a5', 'b3')], highlights: [H('b3')] }),
      b({ id: 'adv6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2 Bd7 O-O Ne7', say: "Be2 and O-O finish White's kingside; Black calmly develops …Bd7 and lifts the other knight with …Ne7, bound for f5. That square is gold in the Advance — a knight on f5 hammers d4 and the dark squares around White's centre, and it cannot be chased by a pawn. Black has a plan on both wings; White is reacting.", sayShort: '…Ne7 — reroute to the great f5-square.', highlights: [H('f5'), H('d4', SOFT)] }),
      b({ id: 'adv7', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4 Nbd2 Na5 Be2 Bd7 O-O Ne7 Rb1 Nf5 Qc2 h6 g4', say: "…Nf5 lands, pressing d4 and the e3-square, and White finally lashes out with g4 to dislodge it — but that lunge loosens White's own king. There's the Advance tabiya in full: Black with a queenside space clamp, the b3-outpost, and the f5-knight; White with kingside pawns that are as much weakness as weapon. Black's structure and clear plan make this one of the most comfortable French battlegrounds.", sayShort: '…Nf5 — the knight lands; g4 loosens White.', arrows: [A('f5', 'd4'), A('f5', 'e3', SOFT)], highlights: [H('f5'), H('g4')] }),
    ],
  },

  'french-defence::Winawer Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Winawer (Poisoned Pawn)',
    minutes: 12,
    orientation: 'black',
    beats: [
      b({ id: 'win1', moves: 'e4 e6 d4 d5 Nc3 Bb4', say: "The Winawer — the sharpest weapon in the whole French. Instead of …Nf6, Black plays …Bb4, pinning the c3-knight and piling a third attacker onto e4. White's centre is under real strain, and the coming forcing sequence produces one of the most imbalanced, theory-soaked battles in chess.", sayShort: '…Bb4 — pin the knight, hit e4.', arrows: [A('b4', 'c3')], highlights: [H('c3'), H('e4', SOFT)] }),
      b({ id: 'win2', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5', say: "e5 grabs space and unpins by blocking; Black strikes the base of the new chain with …c5 at once. The position is already racing: White has the centre and the bishop pair to come, Black has the queenside lever and a structural idea brewing against c3.", sayShort: '…c5 — strike the chain at d4.', highlights: [H('c5'), H('d4')] }),
      b({ id: 'win3', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3', say: "a3 questions the bishop, and Black takes — …Bxc3+ bxc3. This is the Winawer bargain: Black trades his good bishop to shatter White's queenside into doubled, immobile c-pawns. Black accepts a long-term dark-square concession in return for a permanent structural target. The whole variation lives on this trade.", sayShort: '…Bxc3+ — wreck the doubled c-pawns.', highlights: [H('c3')] }),
      b({ id: 'win4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4', say: "…Ne7 develops toward f5 and keeps the kingside compact; White pounces with Qg4, lunging at the undefended g7-pawn. This is the fork in the road that gives the line its name — Black can defend with …O-O or …Kf8, but the boldest, most principled answer is to let the pawns go and play for time.", sayShort: '…Ne7 — develop; Qg4 eyes g7.', arrows: [A('g4', 'g7')], highlights: [H('g7')] }),
      b({ id: 'win5', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7', say: "…Qc7 ignores the threat and eyes the c3-weakling; White gorges with Qxg7 and after …Rg8 grabs again — Qxh7. These are the famous poisoned pawns. White is two pawns up but his queen is marooned on h7, miles from his king, while Black's rook stands on the open g-file pointing at g2 with deadly intent.", sayShort: '…Rg8 — open the g-file at g2; queen marooned.', arrows: [A('g8', 'g2')], highlights: [H('g2'), H('h7', SOFT)] }),
      b({ id: 'win6', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6', say: "…cxd4 rips open the centre while White's queen is offside, and …Nbc6 throws the last piece into the attack. Every black move comes with tempo and threat; White is busy untangling his queen and king while Black's army floods toward the centre. The two-pawn deficit means nothing if the initiative never stops.", sayShort: '…cxd4, …Nbc6 — open the centre, pile in.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'win7', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6 f4 dxc3 Qd3 d4', say: "f4 shores up e5; Black snaps off …dxc3, and that pawn on c3 is a dagger one step from White's king. Then comes …d4 — the central pawn knifes forward, opening lines and gaining yet more space. White's whole position creaks under the passed c3-pawn and the advancing centre.", sayShort: '…dxc3, …d4 — the passer and the central knife.', highlights: [H('c3'), H('d4')] }),
      b({ id: 'win8', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4 Ne2 Nbc6 f4 dxc3 Qd3 d4 Nxd4 Nxd4 Qxd4 Bd7', say: "The centre clears: Nxd4 Nxd4 Qxd4, and Black develops …Bd7, eyeing …O-O-O to swing the last rook onto the open files with check-laden threats. There stands the Poisoned-Pawn tabiya — White nominally up two pawns, Black with a raging initiative, the open g-file, and the safer king. This is the Winawer's promise: hand over material, seize the attack, and never let White breathe.", sayShort: '…Bd7 — prep …O-O-O, the initiative rolls on.', highlights: [H('d7')] }),
    ],
  },

  'french-defence::Classical Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Classical (4.Bg5)',
    minutes: 11,
    orientation: 'black',
    beats: [
      b({ id: 'cla1', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7', say: "The Classical with 4.Bg5 — White pins the f6-knight to add pressure on e4 and d5. Black breaks the pin the principled way with …Be7, declining the sharper McCutcheon. The pieces come out naturally and the game heads for a rich, manoeuvring middlegame with opposite-side ambitions.", sayShort: '…Be7 — break the Bg5 pin calmly.', arrows: [A('g5', 'f6')], highlights: [H('f6')] }),
      b({ id: 'cla2', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7', say: "e5 gains space and shoves the knight to d7; then Bxe7 Qxe7 trades the dark-squared bishops. This trade quietly favours Black — White parts with his good bishop, the one that wasn't blocked by its own pawns, while Black's queen reaches a fine post on e7. The remaining battle is about the chain on d4 and e5.", sayShort: '…Qxe7 — trade off the good bishop.', highlights: [H('e7'), H('e5', SOFT)] }),
      b({ id: 'cla3', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6', say: "f4 braces the e5-spearhead. Rather than rush to castle, Black plays the patient, accurate …a6 — the prelude to …b5. This is the key to the whole plan: against White's coming queenside castling, Black wants a ready-made pawn storm, and …a6-b5 is it.", sayShort: '…a6 — prepare the …b5 storm.', highlights: [H('a6'), H('e5', SOFT)] }),
      b({ id: 'cla4', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5', say: "Now …c5, striking the base of the pawn chain on d4. The familiar French lever: undermine the bottom of the chain and the whole e5/d4 structure starts to wobble. Black's pieces all point at White's centre and queenside.", sayShort: '…c5 — hit the base of the chain.', highlights: [H('c5'), H('d4')] }),
      b({ id: 'cla5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5 Qd2 Nc6 dxc5 Qxc5', say: "…Nc6 piles a second piece onto d4, and White releases the tension with dxc5 — but the recapture is the point: …Qxc5 plants the queen on an active, central post, already eyeing White's queenside and the c1-square where the king is about to land. Black is the one calling the shots.", sayShort: '…Qxc5 — the queen lands actively on c5.', highlights: [H('c5'), H('c6', SOFT)] }),
      b({ id: 'cla6', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7 Bxe7 Qxe7 f4 a6 Nf3 c5 Qd2 Nc6 dxc5 Qxc5 O-O-O b5', say: "White castles long, straight into it — and Black's plan detonates: …b5, the head of the …a6-b5-b4 avalanche rolling at the king on c1, with the queen on c5 already in the attack. This is why this line is the real Classical recommendation: Black's queenside storm arrives faster than White's kingside one, and the practical results bear it out — far better than the slow …f6 break. The quiet 4…Be7 has become a genuine attack on the enemy king.", sayShort: '…b5 — the queenside avalanche, faster attack.', highlights: [H('b5'), H('c1'), H('a6'), H('c5', SOFT)] }),
    ],
  },

  'french-defence::Tarrasch Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Tarrasch (3.Nd2)',
    minutes: 11,
    orientation: 'black',
    beats: [
      b({ id: 'tar1', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7', say: "The Tarrasch — 3.Nd2, Karpov's old workhorse. White develops the knight to d2 instead of c3 for a reason: it sidesteps the …Bb4 pin of the Winawer and keeps the c-pawn free to support d4. Black answers in classical style with …Nf6 and after e5, …Nfd7, ready to assault the chain.", sayShort: '…Nfd7 — retreat, prepare to hit d4.', highlights: [H('e5'), H('d4', SOFT)] }),
      b({ id: 'tar2', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6', say: "Bd3 develops and Black hits the base with …c5; White props with c3 and Black piles on with …Nc6. Because the d2-knight is passive, Black gets an easier game here than in the main line — the standard plan is to win the d4-pawn or saddle White with an isolated queen's pawn after the coming exchanges.", sayShort: '…Nc6 — pressure d4, target the IQP.', arrows: [A('c6', 'd4')], highlights: [H('d4'), H('c5', SOFT)] }),
      b({ id: 'tar3', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6', say: "Ne2 reroutes the knight; Black resolves the tension with …cxd4 cxd4 and then opens fire with the …f6 lever. The point: after the trade White is left with an isolated d4-pawn, and …f6 cracks the e5-support so Black can blockade d5 and lay siege to d4. The IQP is now a permanent target.", sayShort: '…cxd4, …f6 — isolate and attack the d4-pawn.', highlights: [H('d4'), H('d5', SOFT)] }),
      b({ id: 'tar4', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6', say: "exf6 Nxf6 frees Black's game, and …Bd6 develops the bishop to its most aggressive diagonal, aiming straight at h2 and White's king. The cramped French pieces have all sprung loose — knights on c6 and f6, bishop on d6 — and the isolated d4-pawn sits there as a long-term weakness for Black to gnaw at.", sayShort: '…Bd6 — aim the bishop at h2.', arrows: [A('d6', 'h2')], highlights: [H('h2'), H('d4', SOFT)] }),
      b({ id: 'tar5', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6 Nf3 Qc7', say: "Nf3 shores up h2; Black lines up …Qc7 behind the bishop, building the classic battery on the b8–h2 diagonal. Two pieces now bear down on h2 — a standard attacking motif against the castled king — and White must keep one eye on his kingside while nursing the weak d4-pawn.", sayShort: '…Qc7 — load the battery onto h2.', highlights: [H('h2')] }),
      b({ id: 'tar6', moves: 'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6 exf6 Nxf6 O-O Bd6 Nf3 Qc7 Bg5 O-O Bh4 Nh5', say: "Bg5 pins and Black calmly castles; Bh4 keeps the pin, so Black breaks it with …Nh5, eyeing the juicy f4-square and freeing the f6-knight's pressure. There's the Tarrasch tabiya: Black with free, active pieces, the h2-battery, and a clean target on d4 — a textbook example of turning White's space into White's weakness.", sayShort: '…Nh5 — break the pin, eye f4.', arrows: [A('h5', 'f4')], highlights: [H('f4'), H('d4', SOFT)] }),
    ],
  },

  'french-defence::Exchange Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Exchange',
    minutes: 10,
    orientation: 'black',
    beats: [
      b({ id: 'exc1', moves: 'e4 e6 d4 d5 exd5 exd5', say: "The Exchange — White trades on d5 and the structure goes symmetrical. It has a drawish reputation, and an honest one: there are no pawn weaknesses for either side and the position is balanced. But symmetry is not a death sentence — whoever plays the more purposeful pieces gets a real, if small, initiative, and Black is perfectly placed to be that side.", sayShort: '…exd5 — symmetrical, but play for activity.', highlights: [H('d5')] }),
      b({ id: 'exc2', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6', say: "Nf3 and Bd3 are met by the mirror …Nf6 and …Bd6. Black copies White's setup but with a plan: the bishop on d6 eyes h2, and Black intends to be the first to seize the open e-file. In a symmetrical position the side that grabs the key file with tempo holds the only trumps.", sayShort: '…Bd6 — mirror, but eye h2 and the e-file.', arrows: [A('d6', 'h2', SOFT)], highlights: [H('h2')] }),
      b({ id: 'exc3', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4', say: "Both castle, and White's Bg5 pin is answered by the symmetrical …Bg4, pinning White's f3-knight right back. Black gives nothing away and keeps every resource mirrored. The subtle race now is who improves first — and Black, moving in response, often gets to react to White's commitment and pick the better plan.", sayShort: '…Bg4 — mirror the pin on f3.', arrows: [A('g4', 'f3')], highlights: [H('f3')] }),
      b({ id: 'exc4', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4 Nbd2 Nbd7 c3 Re8', say: "Nbd2 and …Nbd7 complete development; then …Re8 grabs the open e-file first. This is the small but real Exchange edge Black hunts for: the rook on e8 controls the only open file, and from there Black can probe, double rooks, and create the lone imbalance in an otherwise level game.", sayShort: '…Re8 — seize the open e-file.', highlights: [H('e8')] }),
      b({ id: 'exc5', moves: 'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O Bg5 Bg4 Nbd2 Nbd7 c3 Re8 Qc2 h6 Bh4 c6', say: "Qc2 eyes the kingside, …h6 puts the question to the bishop, Bh4 keeps the pin, and …c6 shores up d5 and frees the queen. There's the Exchange tabiya — dead level on the surface, but Black holds the e-file and a flexible structure. The lesson of the Exchange is patience: respect the symmetry, grab the small edges, and never overpress a balanced position.", sayShort: '…c6 — solid; nurse the e-file edge.', highlights: [H('d5')] }),
    ],
  },

  'french-defence::Burn Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Burn',
    minutes: 10,
    orientation: 'black',
    beats: [
      b({ id: 'bur1', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4', say: "The Burn Variation — after 4.Bg5, instead of …Be7 Black plays …dxe4, releasing the central tension at once. Black concedes the centre but in return removes White's e4-pawn and heads for a clean, bishop-pair position with no pawn weaknesses. It's the pragmatic, modern way to neutralise the Classical.", sayShort: '…dxe4 — release the tension, head for the bishops.', highlights: [H('e4')] }),
      b({ id: 'bur2', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 Bxf6', say: "Nxe4 recaptures and …Be7 prepares to meet the pin; White trades Bxf6 Bxf6. Crucially, Black recaptures with the bishop, not a pawn — keeping the structure intact and handing Black the two bishops. White gave up his dark-squared bishop, and Black's f6-bishop is a fine, unobstructed piece.", sayShort: '…Bxf6 — keep the bishop pair, clean structure.', highlights: [H('f6')] }),
      b({ id: 'bur3', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 Bxf6 Nf3 Nd7 Qd2 O-O', say: "Nf3 and …Nd7 develop, and Black castles to safety. Black's position is the picture of soundness: two bishops, a healthy pawn structure, and an easy plan — finish developing, then break with …c5 or …e5 to open lines for the bishop pair. White's extra central space is the only imbalance, and it's a manageable one.", sayShort: 'O-O — safe; ready the …c5 break.', highlights: [H('c5', SOFT)] }),
      b({ id: 'bur4', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 Bxf6 Nf3 Nd7 Qd2 O-O O-O-O Be7 Bd3 b6', say: "White castles queenside — O-O-O — signalling a kingside pawn storm and turning the game into an opposite-wings fight. Black regroups …Be7 and plays …b6, preparing to fianchetto the light-squared bishop to b7. With two bishops and a target king on c1, Black's attacking chances down the queenside files are excellent.", sayShort: '…b6 — fianchetto toward the c1-king.', highlights: [H('b6'), H('b7', SOFT)] }),
      b({ id: 'bur5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 dxe4 Nxe4 Be7 Bxf6 Bxf6 Nf3 Nd7 Qd2 O-O O-O-O Be7 Bd3 b6 Kb1 Bb7', say: "Kb1 tucks the king and …Bb7 completes Black's dream setup — the once-bad French bishop now rakes the long diagonal, bearing down through the centre toward the e4-knight and beyond. There's the Burn tabiya: opposite-side castling, the bishop pair, a solid structure, and Black's pieces aimed at the white king. From a humble …dxe4, Black has reached a position full of trumps.", sayShort: '…Bb7 — the bishop rakes the long diagonal.', arrows: [A('b7', 'e4')], highlights: [H('b7'), H('e4', SOFT)] }),
    ],
  },

  'french-defence::Fort Knox Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Fort Knox',
    minutes: 10,
    orientation: 'black',
    beats: [
      b({ id: 'fk1', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Bd7', say: "The Fort Knox — the most solid set-up in the entire French, and the one that finally solves the bad-bishop problem outright. After 3.Nd2 dxe4 4.Nxe4, Black plays the quiet-looking …Bd7. The whole idea is in that move: the problem bishop is heading to c6, the best diagonal it could ever dream of.", sayShort: '…Bd7 — route the bad bishop to c6.', highlights: [H('d7'), H('c6', SOFT)] }),
      b({ id: 'fk2', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Bd7 Nf3 Bc6', say: "Nf3 develops and …Bc6 arrives — the French light-squared bishop, normally entombed behind e6, now sits proudly on c6 staring down the long diagonal at the e4-knight and g2. Black has done in two moves what often takes the French a whole game: activate the bad bishop. The structure is rock-solid and symmetrical.", sayShort: '…Bc6 — the bad bishop, finally great.', arrows: [A('c6', 'e4')], highlights: [H('c6'), H('e4', SOFT)] }),
      b({ id: 'fk3', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Nxf6+ Nxf6', say: "Bd3 and …Nd7 develop; Black castles by hand later and meets Nxf6+ with …Nxf6, trading a pair of knights. Each trade suits Black — fewer pieces means White's slight space edge matters less and Black's fortress becomes ever harder to breach. The name fits: this position is built like a vault.", sayShort: '…Nxf6 — trade down toward the fortress.', highlights: [H('f6')] }),
      b({ id: 'fk4', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Nxf6+ Nxf6 Re1 Be7 c3 Bxf3', say: "Re1 and c3 are calm; Black develops …Be7 and then plays …Bxf3, trading the prized c6-bishop for the f3-knight. That may look odd — why give up the good bishop? — but it removes a key defender, simplifies toward equality, and leaves Black with a completely sound, weakness-free position. Solidity over flash.", sayShort: '…Bxf3 — trade off, keep the fortress sound.', highlights: [H('f3')] }),
      b({ id: 'fk5', moves: 'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Bd7 Nf3 Bc6 Bd3 Nd7 O-O Ngf6 Nxf6+ Nxf6 Re1 Be7 c3 Bxf3 Qxf3 c6', say: "Qxf3 recaptures and …c6 seals the centre. There's the Fort Knox tabiya — utterly symmetrical, not a weakness in sight, and a position White simply cannot crack with force. Black's plan from here is patient: complete development, prepare …Qc7 and an eventual …e5 or …c5 break, and offer White nothing. The Fort Knox is the answer when you want the French's solidity with none of its cramp.", sayShort: '…c6 — seal the vault, no weaknesses.', highlights: [H('c6'), H('e5', SOFT)] }),
    ],
  },

  'french-defence::Advance: Milner-Barry Gambit': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Milner-Barry Gambit',
    minutes: 11,
    orientation: 'black',
    beats: [
      b({ id: 'mb1', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6', say: "We're in an Advance, and White is about to gambit. First the normal moves — e5, …c5 hitting the base, c3 propping it, …Nc6 pressing d4. White's next will offer the d4-pawn for fast development and an attack. Black's task is the eternal gambit question: accept, then prove the pawn is worth more than the activity.", sayShort: '…Nc6 — pressure d4 before the gambit.', arrows: [A('c6', 'd4')], highlights: [H('d4')] }),
      b({ id: 'mb2', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4', say: "…Qb6 hits d4 and b2, and instead of defending, White plays Bd3 — the Milner-Barry. The d4-pawn is hanging and offered as a sacrifice. Black takes: …cxd4. Refusing a sound gambit out of fear is the wrong instinct; the right plan is to grab the material and then defend accurately.", sayShort: '…cxd4 — accept the gambit pawn.', arrows: [A('b6', 'b2')], highlights: [H('d4'), H('b2', SOFT)] }),
      b({ id: 'mb3', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4', say: "cxd4 and now the key accuracy — …Bd7 FIRST, before grabbing the second pawn. This quiet move pre-empts White's whole point: the Nb5 fork ideas and the Bb5+ check that power the attack. Only after …Bd7 takes the sting out does Black snap …Nxd4. Move order is everything here.", sayShort: '…Bd7 first — defuse Nb5/Bb5+, then …Nxd4.', highlights: [H('d7'), H('d4')] }),
      b({ id: 'mb4', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6', say: "Nxd4 Qxd4 — Black is two pawns up — and Nc3 develops with tempo on the queen. Black responds with the cool …a6, taking the b5-square away from White's pieces for good. No panic, no greed for a third pawn: just calmly snuff out every attacking resource while the extra material sits in the bank.", sayShort: '…a6 — deny b5, consolidate the extra pawn.', highlights: [H('a6'), H('b5', SOFT)] }),
      b({ id: 'mb5', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1 Nc6', say: "Qe2 eyes the centre and Black reroutes the knight …Ne7–c6, where it blockades and defends. Every black piece finds a safe, useful square; White's compensation is real but never quite enough against precise defence. The extra pawn is starting to talk.", sayShort: '…Ne7–c6 — reroute, blockade, defend.', highlights: [H('c6')] }),
      b({ id: 'mb6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nxd4 Qxd4 Nc3 a6 Qe2 Ne7 Kh1 Nc6 f4 Nb4 Rd1 Nxd3', say: "f4 tries to drum up kingside play; Black counterpunches with …Nb4, hitting the d3-bishop — White's best attacker — and after Rd1, …Nxd3 trades it off. With the attacking bishop gone and a clean extra pawn in hand, Black emerges into a winning endgame. That's the antidote to the Milner-Barry: accept, play …Bd7 and …a6, trade the attackers, and convert.", sayShort: '…Nb4xd3 — trade the attacker, win the endgame.', highlights: [H('d3')] }),
    ],
  },

  'french-defence::McCutcheon Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The McCutcheon',
    minutes: 11,
    orientation: 'black',
    beats: [
      b({ id: 'mcc1', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4', say: "The McCutcheon — the fighting answer to 4.Bg5. Rather than the meek …Be7, Black slaps down …Bb4, pinning the c3-knight and refusing to be pushed around. This is the combative French player's choice: provoke White into the e5 push and then go to work on the resulting weaknesses.", sayShort: '…Bb4 — pin the knight, invite the fight.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
      b({ id: 'mcc2', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 e5 h6', say: "e5 attacks the f6-knight, and here is the whole point — Black plays …h6, refusing to retreat. The knight stays on f6, defended by the bishop's pin, and Black puts the question to White's g5-bishop. The tension is enormous, and the forcing sequence that follows defines the variation.", sayShort: '…h6 — refuse to retreat, keep the tension.', highlights: [H('f6')] }),
      b({ id: 'mcc3', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 e5 h6 Bd2 Bxc3 bxc3 Ne4', say: "Bd2 unpins, and Black cashes in: …Bxc3 bxc3 saddles White with doubled, crippled c-pawns, and …Ne4 plants a beautiful knight on the outpost, hitting the d2-bishop and the c3-weakling. This is the structural prize the McCutcheon is built around — White's queenside is permanently damaged.", sayShort: '…Bxc3, …Ne4 — wreck the c-pawns, plant the knight.', arrows: [A('e4', 'c3')], highlights: [H('e4'), H('c3')] }),
      b({ id: 'mcc4', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 e5 h6 Bd2 Bxc3 bxc3 Ne4 Qg4 g6', say: "Qg4 lunges at g7; Black answers …g6, calmly defending and refusing to weaken with …Kf8. The g6-pawn shores up the kingside light squares and keeps Black's king able to castle later. White's queen sortie has been parried without concession — and White's structural problems remain.", sayShort: '…g6 — defend g7, keep castling rights.', highlights: [H('g6'), H('g7', SOFT)] }),
      b({ id: 'mcc5', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 e5 h6 Bd2 Bxc3 bxc3 Ne4 Qg4 g6 Bd3 Nxd2 Kxd2', say: "Bd3 challenges the knight and …Nxd2 Kxd2 forces the white king into the open — it cannot castle and must shuffle on d2. Black has traded off into a position where White's king is exposed in the centre and his pawns are wrecked. The bishop trade cost Black nothing he wasn't happy to give.", sayShort: '…Nxd2 — drag the white king out to d2.', highlights: [H('d2')] }),
      b({ id: 'mcc6', moves: 'e4 e6 d4 d5 Nc3 Nf6 Bg5 Bb4 e5 h6 Bd2 Bxc3 bxc3 Ne4 Qg4 g6 Bd3 Nxd2 Kxd2 c5 Nf3 Bd7', say: "…c5 strikes the base of the chain at d4 while White's king is still wandering, and …Bd7 develops the once-bad bishop with …Bc6 to come. There's the McCutcheon tabiya: Black with the better structure, the c5-lever rolling, and White's king denied a safe home. Trading the dark-squared bishop early bought Black a permanent structural and king-safety edge — a fine bargain.", sayShort: '…c5, …Bd7 — hit d4, develop, press the edge.', highlights: [H('c5'), H('d4', SOFT)] }),
    ],
  },

  'french-defence::Rubinstein Variation': {
    openingId: 'french-defence',
    sources: ['book:french-defence', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
    title: 'French Defence — The Rubinstein',
    minutes: 10,
    orientation: 'black',
    beats: [
      b({ id: 'rub1', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4', say: "The Rubinstein — and at club level, the single most popular Black answer to 3.Nc3. Black plays …dxe4 right away, giving up the centre in exchange for a position with no weaknesses and a crystal-clear plan. No memorising twenty-move theory duels here; just sound development and the steady solving of the French's one chronic problem.", sayShort: '…dxe4 — concede the centre for a clean game.', highlights: [H('e4')] }),
      b({ id: 'rub2', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6', say: "…Nd7 and …Ngf6 develop naturally and invite the trade Nxf6+ Nxf6. This is exactly what Black wants — removing White's actively-posted e4-knight and reaching a clean, simple structure. Black's pieces flow out without obstruction; there isn't a weakness on the board.", sayShort: '…Nxf6 — trade off the active knight.', highlights: [H('f6')] }),
      b({ id: 'rub3', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 dxc5 Bxc5', say: "Bd3 develops; Black strikes with …c5 to challenge d4, and after dxc5, …Bxc5 recaptures — developing the dark-squared bishop to an active diagonal with tempo, eyeing f2. The centre has opened just enough for Black's pieces to breathe, and the bishop that's normally a problem child in the French is out and active.", sayShort: '…c5, …Bxc5 — open up, develop with tempo.', arrows: [A('c5', 'f2', SOFT)], highlights: [H('c5'), H('f2', SOFT)] }),
      b({ id: 'rub4', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 dxc5 Bxc5 O-O O-O Bg5 b6', say: "Both castle, White pins with Bg5, and Black prepares the key move …b6 — about to solve the last problem in the position. The light-squared bishop, the French player's perennial headache, is heading to b7 and the long diagonal. Once it's out, Black has no bad pieces at all.", sayShort: '…b6 — prepare …Bb7, free the last piece.', highlights: [H('b6'), H('b7', SOFT)] }),
      b({ id: 'rub5', moves: 'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 c5 dxc5 Bxc5 O-O O-O Bg5 b6 Qe2 Bb7', say: "Qe2 centralises and …Bb7 completes the job — the once-bad bishop now rakes the long diagonal through the centre toward the f3-knight and White's king. There's the Rubinstein tabiya: a sound, harmonious position with both bishops active, no weaknesses, and an easy game to play. It's slightly passive and Black must respect White's extra space — but Black is never worse than a shade, and that reliability is exactly the point.", sayShort: '…Bb7 — the bishop rakes the long diagonal.', arrows: [A('b7', 'f3')], highlights: [H('b7'), H('f3', SOFT)] }),
    ],
  },
};
