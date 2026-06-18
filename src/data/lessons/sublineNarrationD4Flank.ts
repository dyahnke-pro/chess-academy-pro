import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration } from '../../services/sublineLesson';

// GROUP C — d4 / flank families (QG, Slav, Nimzo, QID, KID, Grünfeld, Benoni,
// Benko, Budapest, Dutch, Catalan, London, Trompowsky, Old Indian, English, Réti,
// KIA, Bird's, Albin, Englund) + their counter-weapons. Hand-authored, board-
// grounded subline narration keyed `${openingId}::${variationIndex}::${trigger}@${atPly}`.
// Each entry frames the IDEA/PLAN of the position the deviation reaches (per the
// narration voice rules — carry the idea, not "you play X") so it teaches the same
// truth whichever side made the move. Strategic situations are authored once as a
// const and mapped to every subline that reaches them. Keys already authored in
// sublineNarration.ts are intentionally NOT duplicated here.

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const _H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const _A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
void SOFT;

// queens-gambit :: orthodox
const C0: SublineNarration = {
  intro: { say: "The Orthodox Queen's Gambit Declined, the most respected way to meet d4. Black is solid as a rock behind …e6, …Be7, …O-O — there is nothing to refute, so you squeeze. The two healthy plans are the central e3-e4 break once you're fully developed, or trading on d5 and grinding the minority attack. Patience and a small, durable space edge are the whole game.", sayShort: "QGD — squeeze with e4 or minority." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// queens-gambit :: catalan
const C1: SublineNarration = {
  intro: { say: "With g3 and Bg2 this has slid into Catalan waters — the fianchettoed bishop rakes the long light diagonal straight at d5 and b7. Black's eternal problem is freeing the queenside; yours is simply to keep the pressure. Castle, regain the c4-pawn at leisure with Qc2 or a4, and let that bishop choke Black's development.", sayShort: "Catalan — the g2-bishop chokes the long diagonal." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// queens-gambit :: carlsbad
const C2: SublineNarration = {
  intro: { say: "The Carlsbad structure — White has taken on d5 and Black recaptured with the e-pawn, leaving that classic pawn skeleton. Your plan writes itself: the minority attack. Push b4-b5 on the queenside to chew at Black's c6-pawn, and when it falls you inherit a long-term target on the half-open c-file while your own centre stays sound.", sayShort: "Carlsbad — launch the minority attack b4-b5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// queens-gambit :: ragozin
const C3: SublineNarration = {
  intro: { say: "Black pins with …Bb4 — the Ragozin/Vienna complex, mixing Nimzo ideas into the Queen's Gambit. Stay principled: you can break the pin with the e4 push backed by your big centre, or accept doubled c-pawns for the bishop pair and the half-open files. Either way your central pawn mass and easy development give you the more comfortable side.", sayShort: "Bb4 pin — break e4 or take c3." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// queens-gambit :: qga
const C4: SublineNarration = {
  intro: { say: "Black has grabbed the c4-pawn — the Queen's Gambit Accepted. Don't chase it; you'll win it back with Bxc4 while building the ideal centre. The fight is about that centre: complete development, meet …a6 and …b5 with the timely a4 to crack the queenside, and when you land e4 your space advantage becomes real pressure.", sayShort: "QGA — rebuild centre, meet …b5 with a4." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// queens-gambit :: tarrasch
const C5: SublineNarration = {
  intro: { say: "Black strikes with …c5, the Tarrasch — accepting an isolated d-pawn for free, active piece play. Your job is to make that isolani a weakness, not a strength. Fianchetto with g3 and Bg2 to bear down the long diagonal on d5, blockade the pawn with a knight, trade pieces, and steer toward an endgame where the lone d-pawn simply drops.", sayShort: "Tarrasch — blockade and pressure the d5-isolani." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// queens-gambit :: harrwitz
const C6: SublineNarration = {
  intro: { say: "Bf4 instead of Bg5 — the modern Harrwitz treatment. The bishop sits outside the pawn chain eyeing the b8-h2 diagonal and the e5-square, and you'll build with e3, Bd3 and the knight to d2. Your plan is a kingside-flavoured setup: clamp e5, and look for the central break or a minority push depending on how Black reacts.", sayShort: "Bf4 — clamp e5, build the Bd3 battery." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// qgd :: exchange_be7
const C7: SublineNarration = {
  intro: { say: "White trades on d5 and you're in a calm, symmetrical-flavoured QGD. The bishop belongs on e7, the knight on d7, and the long-term lever is …c5 or the …Ne4 jump that frees your game. Solid and resilient — White's edge is microscopic and you equalise by simply finishing development and contesting the c-file.", sayShort: "Exchange QGD — finish developing, lever …c5." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// qgd :: main
const C8: SublineNarration = {
  intro: { say: "The heart of the Queen's Gambit Declined — your fortress. Pieces go to their natural homes: …Be7, …O-O, …Nbd7, …c6, and the freeing break is always …dxc4 followed by …c5 or the …e5 thrust when White's pieces drift. You have no weaknesses and no bad bishop worries once you trade light bishops; just complete development and pick your freeing break.", sayShort: "QGD — free with …c5 or …e5." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// qgd :: carlsbad
const C9: SublineNarration = {
  intro: { say: "White has clarified with cxd5 — the Carlsbad. Expect the minority attack, b4-b5 against your c6-pawn. Don't sit and suffer it: meet queenside play with central counter-energy. Reroute the knight Nd7-f8-g6 toward the kingside, prepare …Ne4 and …f5, and turn the game toward White's king while he chips at your pawns.", sayShort: "Carlsbad — answer b4-b5 with kingside play." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// qgd :: semitarr
const C10: SublineNarration = {
  intro: { say: "With …c5 in this structure you're pressing the centre Tarrasch-style. The play is active: trade in the centre, develop your pieces to their most aggressive posts, and use the open lines. You accept a slightly looser pawn structure in return for piece activity and easy development — a fighting equality.", sayShort: "…c5 — active piece play for the structure." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// qgd :: ragozin
const C11: SublineNarration = {
  intro: { say: "You've gone for …Bb4, the Ragozin — pinning the c3-knight to inject Nimzo bite into the QGD. The bishop pressures e4 and is ready to take on c3 to fracture White's pawns. Combine the pin with …dxc4 and …c5 hits; you reach a dynamic, fully equal middlegame where White's centre is under constant question.", sayShort: "Ragozin …Bb4 — pin, then strike …c5." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// qga :: main
const C12: SublineNarration = {
  intro: { say: "Queen's Gambit Accepted — you grabbed the pawn on c4 not to keep it, but to free your game. Your plan is clean: return the pawn, strike the centre with …c5 and …a6 followed by …b5 to gain queenside space, and get the light bishop active outside the chain. White owns a little centre; you own easy development and no weaknesses.", sayShort: "QGA — …c5, then …a6 and …b5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// qga :: big_centre
const C13: SublineNarration = {
  intro: { say: "White has built the broad e4-d4 centre against your QGA. The critical test, and your method is undermining: hit with …c5 and …b5, pile on d4 with …Nc6 and the b7-bishop, and watch the overextended pawns become targets. Trade White's space for your piece activity and the centre cracks.", sayShort: "Undermine the big centre with …c5 and …b5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// qga :: bg4
const C14: SublineNarration = {
  intro: { say: "You've developed the light bishop to g4 before …e6, the modern QGA antidote that solves the problem piece. The bishop pins or trades White's f3-knight, easing the pressure on your centre. Follow with …e6, …c5 and quick development; with your worst piece already settled outside the pawn chain, the rest of the game flows comfortably.", sayShort: "…Bg4 first — the bishop is solved." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// qga :: queenless
const C15: SublineNarration = {
  intro: { say: "White goes for the early queen trade, steering toward a tiny-edge endgame. That suits you fine — recapture, keep your structure clean, and remember the endgame is held with active rooks and a quick …b5/…a6 grab of queenside space. There is nothing to fear and, with accurate piece placement, real winning chances of your own.", sayShort: "Queens off — activity holds the endgame." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// slav-defence :: dxc4_a4
const C16: SublineNarration = {
  intro: { say: "You've taken on c4 and White recaptures the central tension with a4, the main-line Slav. The point of …dxc4 was to free …Bf5 first; now you simply complete development. White's a4 weakens b4 and the queenside dark squares — a square your knight or bishop will be glad to use later. Equal, rich, and famously solid.", sayShort: "…dxc4 then …Bf5 — a4 weakens b4." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// slav-defence :: quiet_e3
const C17: SublineNarration = {
  intro: { say: "White plays the quiet e3, locking his OWN light bishop behind the pawn chain. That's a gift — your …Bf5 steps outside and you simply own the better bishop for the whole game. Develop naturally, keep the structure flexible, and look to break with …c5 or …e5 once your pieces are home.", sayShort: "e3 — your bishop is the good one." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// slav-defence :: exchange
const C18: SublineNarration = {
  intro: { say: "The Exchange Slav — White released with cxd5 and signals for a quiet, symmetrical game. The drawish reputation is a trap for the lazy: develop the bishop actively to f5, contest the half-open c-file with your rooks, and out-coordinate him. Symmetry favours the better-placed army, and that can be yours.", sayShort: "Exchange Slav — …Bf5, fight the c-file." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// slav-defence :: nh4
const C19: SublineNarration = {
  intro: { say: "White's Nh4 hunts your active f5-bishop, the Slav's pride. Don't let it be chased for nothing: meet it with …Bg6, and if Nxg6 hxg6 you get the half-open h-file pointing at White's king plus a strengthened centre. The trade of your 'good' bishop comes with real compensation in open lines and attacking chances.", sayShort: "Nh4 — …Bg6; trade opens the h-file." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// slav-defence :: sharp_e4
const C20: SublineNarration = {
  intro: { say: "White lunges with e4 in the sharp …dxc4 Slav, sacrificing structure for the broad centre and rapid development. Hold your nerve and your extra pawn: …b5 props the booty, …e6 and …a6 build the queenside wall, and the centre, for all its menace, can be hit with …c5 in due course. Theory-heavy, fully sound for Black.", sayShort: "Sharp e4 — hold the pawn with …b5." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// slav-defence :: main_bf5
const C21: SublineNarration = {
  intro: { say: "The pure Slav — and your trump is already on the board: the light-squared bishop gets out to f5 OUTSIDE the pawn chain before …e6 ever shuts it in. That solves the one problem every …e6 defence struggles with. Develop behind the bishop, hold the …dxc4 with …b5 if White lets you, and you reach a sound, comfortable middlegame with the good bishop.", sayShort: "Slav — get …Bf5 out, then settle." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// semi-slav :: botvinnik
const C22: SublineNarration = {
  intro: { say: "White pins with Bg5 and you can plunge into the Botvinnik — …dxc4 and …b5, grabbing the pawn and lashing out with …g5 to smash the h4-bishop. It is the sharpest forest in chess: both kings get hunted, every move is theory, and the verdict is that Black holds. Know the line and you wield a genuine weapon.", sayShort: "Bg5 — the Botvinnik: …dxc4, …b5, …g5." },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// semi-slav :: anti_meran
const C23: SublineNarration = {
  intro: { say: "White avoids the sharpest lines with the quiet Qc2/e3 setup. No fireworks means you equalise comfortably: complete the …Bd6 and …O-O development, prepare the …e5 break (the key freeing move in this structure), and contest the centre. A healthy, balanced middlegame with both breaks, …c5 and …e5, in reserve.", sayShort: "Quiet line — prepare the …e5 break." },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// semi-slav :: meran
const C24: SublineNarration = {
  intro: { say: "The Semi-Slav — solid as the Slav but with bite. After …Nbd7 you prepare the great freeing break: …dxc4 followed by …b5 and …c5, the Meran, blowing the centre open with your pieces ready. White's pieces look active but your structure is bombproof and your counterplay on the queenside is real.", sayShort: "Semi-Slav — free with …dxc4, …b5, …c5." },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// semi-slav :: stonewall_e4
const C25: SublineNarration = {
  intro: { say: "White has built and pushed the e4-e5 centre. The critical Semi-Slav battleground: undermine it. …c5 hits the base, your pieces swarm d4 and e5, and White's proud pawns become a row of targets. You invited the centre precisely so you could tear it down with timely pawn breaks.", sayShort: "e4-e5 — undermine with …c5." },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// nimzo-indian :: rubinstein_e3
const C26: SublineNarration = {
  intro: { say: "The Rubinstein, e3 — White's most flexible Nimzo. Your bishop already pins the c3-knight, the guardian of e4. The Nimzo bargain is yours to set: take on c3 to saddle White with doubled pawns and play against them, or keep the pin and strike the centre with …c5 and …d5. Either road gives you a rich, equal fight on the light squares.", sayShort: "Rubinstein — pin, then …c5 or c3." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// nimzo-indian :: fianchetto_g3
const C27: SublineNarration = {
  intro: { say: "White fianchettoes with g3, declining the doubled-pawn structure for a calm light-square game. Meet it classically: …d5 and …Be7, or …O-O and …d5, contesting the long diagonal. The bishop on g2 is strong but slow, and with sound development you reach an easy, balanced middlegame.", sayShort: "g3 — contest the long diagonal, …d5." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// nimzo-indian :: classical_qc2
const C28: SublineNarration = {
  intro: { say: "The Classical Qc2 — White avoids doubled pawns by recapturing on c3 with the queen, and keeps the bishop pair as his trump. You answer with the centre: …d5 and …c5, or the quick …O-O and …d5, fixing a target. White's bishops want open lines, so keep the position closed enough to neutralise them while you press the queenside.", sayShort: "Qc2 — strike with …d5 and …c5." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// nimzo-indian :: saemisch_f3
const C29: SublineNarration = {
  intro: { say: "White plays the Sämisch with a3 and f3, accepting doubled c-pawns to build a huge e4 centre. Hand over the bishop — bxc3 leaves White with crippled pawns — then blockade and besiege: …d5 or …c5, …Nc6, and pile on the fixed c4/c3 weaknesses. Your knights and the light squares are worth more than his bishops here.", sayShort: "Sämisch — take c3, blockade the doubled pawns." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// nimzo-indian :: ne2
const C30: SublineNarration = {
  intro: { say: "White's Ne2 recaptures on c3 with the knight to dodge the doubled pawns. That costs him time and central control: strike at once with …c5 and …d5, exploiting the awkwardly-placed knight. With faster, more harmonious development you seize the initiative in the centre while White untangles.", sayShort: "Ne2 — punish with …c5 and …d5." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// nimzo-indian :: bg5
const C31: SublineNarration = {
  intro: { say: "White pins back with Bg5 — the Leningrad. The pressure on your f6-knight is real, so meet it head-on: …h6 puts the question, and …c5 or …d5 hits the centre while the dark-squared tension resolves. Trade the right pieces and your structure holds; the bishop pair White covets never gets to bite.", sayShort: "Bg5 Leningrad — …h6 and strike the centre." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// queens-indian :: fianchetto_g3
const C32: SublineNarration = {
  intro: { say: "White fianchettoes with g3 and Bg2, the main Queen's Indian battleground on the long light diagonal. Place your bishop on b7 (or ride …Ba6 to provoke first), castle, and contest e4 — the …Ne4 trade and the …d5 break are your equalisers. Patient, principled, and a fortress once your pieces are home.", sayShort: "g3 — contest e4, …d5 or …Ne4." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// queens-indian :: petrosian_a3
const C33: SublineNarration = {
  intro: { say: "White plays a3, the Petrosian — pre-empting …Bb4 and preparing Nc3 with tempo. No matter: complete the …Bb7 and …d5 setup, and meet the eventual cxd5 with the knight recapture and …c5, fighting for the centre. White's a3 is a small loosening you'll target later on the queenside.", sayShort: "a3 Petrosian — develop …Bb7 and break …d5." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// queens-indian :: bb7
const C34: SublineNarration = {
  intro: { say: "The classical Queen's Indian with …Bb7 — your bishop mirrors White's on the long diagonal, fighting for e4 and the light squares. Develop with …Be7 and …O-O, then challenge the centre with …d5 or the …Ne4 jump that trades into comfort. A famously sound, control-based defence where you simply refuse White any target.", sayShort: "…Bb7 — mirror, then …d5 or …Ne4." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// queens-indian :: ba6
const C35: SublineNarration = {
  intro: { say: "The modern Queen's Indian — …Ba6, biting at the c4-pawn and forcing White to make a concession before the g2-bishop can settle. The light-square fight is the whole opening: contest the long diagonal that both sides crave, complete development with …Be7 and …O-O, and break with …d5 or …c5 at the right moment. Rock-solid and richly strategic.", sayShort: "…Ba6 — contest c4 and the light squares." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// kings-indian-defence :: saemisch
const C36: SublineNarration = {
  intro: { say: "The Sämisch — White plops the pawn on f3 to brace e4 and prepare a queenside-and-centre clamp. Two great answers: the classical …e5 strike, or the sharp …c5 gambit hitting the broad centre. Castle first, then choose your break; the f3-pawn means White's own kingside is committed, so your …f5 storm gains extra force.", sayShort: "Sämisch f3 — break with …e5 or …c5." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// kings-indian-defence :: fianchetto
const C37: SublineNarration = {
  intro: { say: "White fianchettoes with g3 — the Fianchetto KID, the most solid anti-King's-Indian. The g2-bishop blunts your long-diagonal pressure, so adapt: …Nbd7 and …e5, or the …c6 and …e5 setup, and contest the centre patiently. The kingside storm is harder here, so play for the central break and a balanced, manoeuvring fight.", sayShort: "Fianchetto g3 — patient …e5, central play." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// kings-indian-defence :: classical
const C38: SublineNarration = {
  intro: { say: "The Classical King's Indian, the main road. You've fianchettoed and castled; now comes the soul of the opening — …e5 striking the centre. Once White locks with d5, the race is on: he expands on the queenside with c5 and the minority push, while you throw everything at his king — …Nd7, …f5, …f4, and the kingside avalanche. Trust the attack; it usually arrives first.", sayShort: "Classical KID — …e5, then the …f5-f4 storm." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// kings-indian-defence :: main_tabiya
const C39: SublineNarration = {
  intro: { say: "You've landed the key …e5 break and reached the Classical main tabiya. Now the King's Indian truly begins: White swings c5 and the queenside minority push, and you commit to the attack — …Nd7, …f5, …f4, …g5-g4, the kingside avalanche. Burn your boats and race; in the King's Indian, the king-hunter usually crowns first.", sayShort: "Tabiya — commit to the …f5-f4-g5 storm." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// kings-indian-defence :: four_pawns
const C40: SublineNarration = {
  intro: { say: "The Four Pawns Attack — White throws four pawns across the board, the most violent KID try. Its flaw is overextension: don't flinch. Counterstrike with …c5 and …dxe5 hitting the centre, develop with tempo, and those proud pawns become targets while White's loose front crashes down. Sharpest of all, but Black is doing well.", sayShort: "Four Pawns — counterstrike …c5, …dxe5." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// kings-indian-defence :: averbakh_bg5
const C41: SublineNarration = {
  intro: { say: "White pins with Bg5 (Averbakh-flavoured), eyeing your kingside before you can castle into the storm. Put the question to the bishop and keep the …e5 break in hand; if White trades on f6 you get the bishop pair and open lines toward the centre. Stay flexible and the standard …e5/…c5 plans still deliver counterplay.", sayShort: "Bg5 — question the bishop, keep …e5." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// grunfeld-defence :: russian_nf3
const C42: SublineNarration = {
  intro: { say: "White develops Nf3 toward the modern main lines, keeping the centre flexible. Stay true to the Grünfeld creed: …Bg7 on the long diagonal, …c5 hitting d4, …Qa5 and …Nc6 piling on. You let White build so you can undermine — meet the central pawns with piece pressure and dynamic equality is yours.", sayShort: "Nf3 — …Bg7 and …c5, undermine d4." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// grunfeld-defence :: exchange
const C43: SublineNarration = {
  intro: { say: "The Exchange Grünfeld, the critical main line and the whole point of the opening. White builds the broad d4-e4 centre; your entire strategy is to demolish it. The g7-bishop rakes the long diagonal at d4, and …c5, …Nc6, …Bg4, …Qa5 all pour onto that pawn. Invite the big centre — then tear it down.", sayShort: "Exchange — demolish the d4-e4 centre." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// grunfeld-defence :: classical_main
const C44: SublineNarration = {
  intro: { say: "You've reached the great Exchange Grünfeld tabiya with …c5 and the pieces poised. White's centre is the target of your life: trade on d4, hit with …Qa5 and …Bg4, and if the d4-e4 pawns ever crack, White is simply worse. The position the whole opening is built to reach — keep hammering the centre.", sayShort: "Tabiya — keep hammering the centre." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// grunfeld-defence :: bf4
const C45: SublineNarration = {
  intro: { say: "White's Bf4 supports the centre and eyes c7. No problem for the Grünfeld plan: …Bg7, …O-O, …c5 and …dxc4 or …Nbd7 hitting back. The bishop on f4 is exposed to …Nh5 or …c5-c4 ideas later; develop naturally and strike d4 with your usual piece pressure for comfortable equality.", sayShort: "Bf4 — …Bg7 and …c5 as ever." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// grunfeld-defence :: bg5
const C46: SublineNarration = {
  intro: { say: "White pins with Bg5 early, hoping to disrupt your …d5 setup. Hit back immediately — …Ne4 challenges the bishop and the c3-knight at once, the standard Grünfeld counter-thrust. Trade into clarity and continue with …Bg7 and …c5; the bishop sortie costs White time you'll use to strike the centre.", sayShort: "Bg5 — counter with …Ne4." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// grunfeld-defence :: fianchetto_g3
const C47: SublineNarration = {
  intro: { say: "White fianchettoes with g3 — the quiet Fianchetto Grünfeld. He declines the big centre, so equalise cleanly: castle, hit with …d5 and …c5, and if White grabs on c4 you regain it comfortably with …Na6 or …Nbd7. A balanced, healthy game where your fianchettoed bishop and central breaks keep everything in harmony.", sayShort: "Fianchetto g3 — castle, break …d5 / …c5." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// benoni-defence :: modern_main
const C48: SublineNarration = {
  intro: { say: "The Modern Benoni — you've traded the structure for dynamism: White's big d5-e4 pawn front against your queenside pawn majority and the long-diagonal g7-bishop. Your plan is all energy: …a6 and …b5 to roll the queenside, …Re8 and …Nbd7 pressure on e4, and the …c4 lever. Sharpest defence in the book, and a joy to attack with.", sayShort: "Modern Benoni — roll …a6-b5, press e4." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benoni-defence :: czech_e5
const C49: SublineNarration = {
  intro: { say: "A Czech-Benoni flavoured structure with …e5 locking the centre. The play turns slow and manoeuvring: pieces reroute behind the locked pawns, and the breaks are …f5 on the kingside or …b5 on the queen's wing. Patience is everything — set up the right break and the cramped position uncoils with venom.", sayShort: "Locked centre — prepare …f5 or …b5." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benoni-defence :: fianchetto_g3
const C50: SublineNarration = {
  intro: { say: "White fianchettoes with g3, the positional anti-Benoni. The g2-bishop guards e4 and the long diagonal, blunting your usual …b5 fireworks. Adapt: …a6 and …b5 still come, but more patiently, and …Re8 with …Nbd7 keeps the central tension. A slower Benoni where you grind the queenside majority instead of storming.", sayShort: "g3 — patient …a6-b5, grind the majority." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benoni-defence :: classical_e4
const C51: SublineNarration = {
  intro: { say: "The Classical Benoni with e4 and the pieces developing naturally — White claims the centre, you claim the wings. The main tabiya: complete the fianchetto, castle, and unleash the queenside with …a6 and …b5 while pressuring e4 along the e-file. Dynamic imbalance where your activity answers his space.", sayShort: "Classical — …a6-b5 against his centre." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benoni-defence :: taimanov_bb5
const C52: SublineNarration = {
  intro: { say: "White checks with Bb5+ — the dangerous Taimanov, the critical anti-Benoni. Block with …Nbd7 (or …Nfd7), tuck the king away, and ride out the early pressure: White's f4-e5 push is the threat, so neutralise it with …a6, …Re8 and accurate defence. Survive the storm and your queenside majority tells in the long game.", sayShort: "Bb5+ Taimanov — block …Nbd7, weather f4-e5." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benoni-defence :: snake_dxe6
const C53: SublineNarration = {
  intro: { say: "White captures dxe6, opening the f-file and handing you a half-open file and a mobile centre. Recapture and develop with purpose: …Nc6, …e5 to claim the centre, and the rooks love the open lines. White traded his space for activity — match it and the dynamic balance favours the better-coordinated side, which is yours.", sayShort: "dxe6 — open the f-file, claim the centre." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// benko-gambit :: declined_e4
const C54: SublineNarration = {
  intro: { say: "White declines or plays e4-Nb5 lines, returning the pawn for space and a clamp. Stay true to the Benko spirit: …d6, …g6, …Bg7, and contest the queenside files anyway. Even without the pawn sacrifice landing cleanly, your dark-squared bishop and the half-open b-file give you the easy, active game the gambit promises.", sayShort: "Declined — …g6, …Bg7, fight the b-file." },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// benko-gambit :: b6_declined
const C55: SublineNarration = {
  intro: { say: "White declines with the b6 push, returning the pawn to keep lines closed. Recapture and develop normally — …d6, …g6, …Bg7, …Nbd7 — and the position resembles a comfortable Benoni where your queenside play comes for free. White's b6-pawn is a target as much as a wedge; nudge it and the files reopen.", sayShort: "b6 declined — develop, target the wedge." },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// benko-gambit :: accepted_main
const C56: SublineNarration = {
  intro: { say: "The Benko Gambit accepted — you've given a pawn for the clearest long-term compensation in chess. The a- and b-files open like cannon barrels for your rooks, the g7-bishop rakes the long diagonal, and White's queenside is permanently under siege. You don't need to win the pawn back; the pressure simply never lets up. Pure positional gambit, fully sound.", sayShort: "Benko accepted — the open a/b-files are forever." },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// benko-gambit :: fianchetto_g3
const C57: SublineNarration = {
  intro: { say: "White returns the pawn and fianchettoes with g3, meeting your queenside pressure on the long diagonal. Adapt patiently: …Bg7, …d6, …Nbd7, double rooks on the a- and b-files, and probe. White's setup is solid but passive on the queenside — exactly the wing where your whole army is aimed.", sayShort: "g3 — double rooks on the queenside." },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// benko-gambit :: kingwalk
const C58: SublineNarration = {
  intro: { say: "White grabs on f1 and walks the king after Bxf1 Kxf1, keeping the extra pawn at the cost of castling. That's your dream Benko: the king is stuck in the centre, your rooks swing to a8 and b8, and …Bg7, …d6, …Nbd7 complete a textbook squeeze. The pawn is a memory; the queenside pressure is permanent.", sayShort: "King stuck — pile rooks on a/b-files." },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// budapest-gambit :: rubinstein_bf4
const C59: SublineNarration = {
  intro: { say: "The main Budapest with Bf4 — White clings to the e5-pawn and you set about regaining it. …Nc6 and …Bb4+ develop with tempo, and …Ngxe5 wins the pawn back cleanly, leaving a lively, equal middlegame. Your pieces leap out fast; White's small space edge is balanced by your activity and the open lines you generate.", sayShort: "Bf4 main — …Nc6, …Bb4+, regain with …Ngxe5." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// budapest-gambit :: declined_d5
const C60: SublineNarration = {
  intro: { say: "White declines with d5, pushing past rather than grabbing on e5. You keep your central pawn and still get the Budapest's real idea — roll the e-pawn forward to e4 and e3, cramping White's kingside before he untangles. You sacrificed nothing and you still own the initiative.", sayShort: "d5 declined — roll …e4-e3 and cramp." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// budapest-gambit :: fajarowicz_ne4
const C61: SublineNarration = {
  intro: { say: "The Fajarowicz — …Ne4 instead of …Ng4, planting the knight aggressively and eyeing tricks on c3 and f2. It's a sharp surprise weapon: develop quickly with …Nc6 and …Bb4+, and look for the tactical chances the centralised knight creates. Double-edged, but full of venom against an unprepared White.", sayShort: "Fajarowicz …Ne4 — sharp, central knight." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// budapest-gambit :: kf2
const C62: SublineNarration = {
  intro: { say: "White has been greedy and the king is dragged to f2 — exactly the chaos the Budapest dreams of. The pawns may be even but White can't castle and his king sits in the crossfire. Keep developing with check and tempo, open lines toward f2, and let the exposed monarch be the weakness that decides.", sayShort: "King on f2 — hunt the king." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// budapest-gambit :: adler_e4
const C63: SublineNarration = {
  intro: { say: "White grabs the centre with e4, the Adler — keeping the pawn and the broad front. Hit back: …Nxe5 regroups the knight, then …Bb4+ and …Nec6 develop while you target d4 and the slightly loose centre. White has space, you have piece activity and the open e-file ideas; a fighting, balanced game.", sayShort: "Adler e4 — …Nxe5, develop with tempo." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// dutch-defence :: leningrad
const C64: SublineNarration = {
  intro: { say: "The Leningrad Dutch — …f5 paired with the King's-Indian fianchetto. The g7-bishop and the …f5 pawn point at White's centre and kingside together. Castle, contest the centre with …d6 and the …e5 break, and when the position opens your dark-squared bishop and the half-open f-file drive a genuine kingside attack. Sharp, ambitious, and fun.", sayShort: "Leningrad — castle, break …e5, attack the king." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// dutch-defence :: staunton_bg5
const C65: SublineNarration = {
  intro: { say: "White lunges with the Bg5 anti-Dutch (Staunton-flavoured), hunting your kingside before you settle. Don't panic: …e6 and …Be7 break the pin, …d5 claims the centre, and once the early aggression is parried your Dutch plans return in full. Weather the first wave and Black is comfortably fine.", sayShort: "Bg5 anti-Dutch — …e6, …Be7, then …d5." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// dutch-defence :: stonewall
const C66: SublineNarration = {
  intro: { say: "The Stonewall Dutch — …f5, …e6, …d5, …c6, that famous pawn wall. You cede e5 but seize e4: the knight lands there as an unshakeable outpost, and the b8-c1 bishop reroutes via d6 toward the kingside for the classic …Qe8-h5 attack. Slow to build, lethal once the storm breaks over White's king.", sayShort: "Stonewall — outpost e4, swing the attack." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// dutch-defence :: classical_be7
const C67: SublineNarration = {
  intro: { say: "The Classical Dutch with …e6 and …Be7 — solid and flexible. Castle, keep the centre fluid, and choose your break: …d5 for a Stonewall feel, or …e5 to open lines for the f-file rook. White's quiet development gives you time to set up the kingside expansion that is every Dutch player's dream.", sayShort: "Classical — castle, pick …d5 or …e5." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// dutch-defence :: nh3
const C68: SublineNarration = {
  intro: { say: "White's Nh3 heads for f4 to bolster the kingside light squares against your …f5. Meet it calmly: complete the fianchetto, castle, and play the standard …d6 and …e5 break. The knight on h3 is offside for now; develop in good order and your central counterplay comes through on schedule.", sayShort: "Nh3 — develop, hit …e5 on schedule." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// catalan-opening :: open_dxc4
const C69: SublineNarration = {
  intro: { say: "The Open Catalan — Black grabs c4, but the pawn is a loan, not a gain. Your whole game is the g2-bishop scything down the long light diagonal at b7 and d5, plus the easy recapture with Qa4+, Qc2 or a later Ne5/a4. Castle, regain the pawn at leisure, and squeeze: Black's queenside is forever cramped under that bishop's gaze.", sayShort: "Open Catalan — the g2-bishop owns the diagonal." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// catalan-opening :: closed_be7
const C70: SublineNarration = {
  intro: { say: "The Closed Catalan — Black holds the centre with …d5 and …Be7 rather than grabbing c4. Solid, but passive: build the bind with Qc2, b3, Bb2 and Nbd2, prepare the e4 break, and use your space and the long-diagonal bishop to slowly suffocate Black's light-squared bishop, the eternal problem piece in this structure.", sayShort: "Closed Catalan — bind, then break e4." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// catalan-opening :: bb4_check
const C71: SublineNarration = {
  intro: { say: "Black interposes …Bb4+, the Catalan check, the most reliable equalising try. Block with Bd2 — and welcome the trade: you regain time, keep the long-diagonal bishop that defines the Catalan, and emerge with the same pleasant space and pressure. Don't fear the check; it removes one of Black's pieces, not your advantage.", sayShort: "…Bb4+ — block Bd2, keep the big bishop." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// catalan-opening :: ne5
const C72: SublineNarration = {
  intro: { say: "You've planted the knight on e5, the Catalan's most aggressive post — reinforcing the g2-bishop's pressure and eyeing c6 and f7. Black must react to the central knight; meanwhile you reclaim the c4-pawn and keep the initiative on the queenside and the long diagonal. A model Catalan squeeze with extra bite.", sayShort: "Ne5 — the knight reinforces the diagonal." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// catalan-opening :: slav_catalan
const C73: SublineNarration = {
  intro: { say: "This is a Slav-Catalan hybrid — Black props the centre with …c6 before fianchetto pressure builds. Develop the bishop to g2, castle, and prepare e4 or the queenside expansion with a4. Black is solid but cramped; lean on the long diagonal and the central break and the small, durable edge grows.", sayShort: "Slav-Catalan — g2-bishop, prepare e4 / a4." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// london-system :: cxd4
const C74: SublineNarration = {
  intro: { say: "Black has released the central tension with …cxd4. Recapture and you reach the London's ideal: a healthy centre, the Bf4-Bd3 battery aimed at the king, and open lines for your pieces. Develop, castle, and turn to the kingside — Ne5 and the queen lift are the standard attacking plan once the structure clarifies.", sayShort: "…cxd4 — recapture, aim the battery kingside." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// london-system :: benoni_push
const C75: SublineNarration = {
  intro: { say: "Black hits with an early …c5 and you've pushed d5 (or held), steering into a Benoni-flavoured London. Now your space and the Bf4-bishop count: brace the centre, prepare e4 or the queenside clamp, and keep the dark-squared bishop on its diagonal. The London's flexibility means you reach a comfortable, familiar middlegame whatever Black tries.", sayShort: "Early …c5 — push or hold." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// london-system :: accel_indian
const C76: SublineNarration = {
  intro: { say: "The Indian-flavoured London where Black plays …g6 and …d6 and you've set up the full Bf4-e3-Be2-h3-c3-Nbd2 machine. Your plan is patient and proven: complete the bind, watch for …e5 or …c5, and answer with the central tension held and the kingside pieces ready. Same setup, same comfortable pull, every single game.", sayShort: "Indian London — complete the bind, watch …e5." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// london-system :: vs_kid
const C77: SublineNarration = {
  intro: { say: "Black fianchettoes King's-Indian-style with …g6 and …Bg7 against your London. Keep your shape: e3, Be2, h3 to save the bishop a tempo, c3 to brace d4, and castle. The Bf4-bishop eyes the long diagonal's blind spots; when Black commits …c5 or …e5, meet it calmly and use your solid centre to play on both wings.", sayShort: "London vs KID — keep shape, h3." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// london-system :: bf5_mirror
const C78: SublineNarration = {
  intro: { say: "Black mirrors with …Bf5, getting his bishop outside the chain just as you did. No problem — your structure is so solid it barely matters: c3, e3, Bd3 to challenge the bishop or Nbd2 to develop, and the same kingside plans apply. If bishops trade, the resulting position is dead-equal but eminently playable for the better-prepared side: you.", sayShort: "Mirror …Bf5 — challenge with Bd3, play on." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// london-system :: main_qgd
const C79: SublineNarration = {
  intro: { say: "The classic London setup against …d5 and …e6 — your reliable machine. The Bf4-Bd3 battery trains on h7, c3 braces d4, and Nbd2 completes the harmony. Meet …c5 by holding the tension or recapturing toward the centre, keep the dark-squared bishop healthy, and play for the kingside: Ne5, Qf3 or the f-pawn, the same plan every game.", sayShort: "London — Bf4-Bd3 battery, play the kingside." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// trompowsky-attack :: ne4_main
const C80: SublineNarration = {
  intro: { say: "The main Trompowsky — Black hits the bishop with …Ne4 and you retreat to f4, keeping the pair and the tempo-gaining f3 push in hand. Build with f3 kicking the knight, then e4 or d5 to claim the centre. You've sidestepped all of Black's prepared d4 theory and reach an unbalanced middlegame on your own terms.", sayShort: "…Ne4 — Bf4, kick f3, take centre." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// trompowsky-attack :: c5_qb6
const C81: SublineNarration = {
  intro: { say: "Black counters with …c5, and after d5 the queen often grabs on b2 — the critical Trompowsky gambit line. Don't fear it: Nc3 and Bd2 trap-or-harass the wandering queen, and your lead in development plus the open lines are worth far more than the pawn. Sharp, forcing, and a known good bargain for White.", sayShort: "…c5 — let the queen roam." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// trompowsky-attack :: d5_bxf6
const C82: SublineNarration = {
  intro: { say: "Black challenges with …d5 and you take on f6, the structural Trompowsky. Whether Black recaptures with the e- or g-pawn, he gets doubled pawns and you keep a clean structure plus the bishop pair. Play against the pawn weaknesses: a queenside pawn break, piece pressure on the open lines, and a small, lasting endgame edge.", sayShort: "…d5 — Bxf6, play against doubled pawns." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// trompowsky-attack :: e6_e4
const C83: SublineNarration = {
  intro: { say: "Black plays the solid …e6, and you grab the centre with e4, a big-space Trompowsky. After the …h6 question you take on f6, doubling Black's pawns or trading into a comfortable pawn-centre game with the bishop pair. Your space and the half-open lines give a pleasant, aggressive pull with little theory for Black to lean on.", sayShort: "…e6 — take the centre with e4." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// trompowsky-attack :: qb6_centre
const C84: SublineNarration = {
  intro: { say: "Black has grabbed a pawn or jabbed with …Qb6 and you've castled the issue with Nc3-Bd2 development. Your trumps are the lead in development and the open b-file the queen left behind: harass the queen, complete development with tempo, and convert the initiative. The Trompowsky's pawn is cheap rent for a roaring position.", sayShort: "…Qb6 — harass the queen, lead in development." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// trompowsky-attack :: endgame_grind
const C85: SublineNarration = {
  intro: { say: "The line has simplified into the queenless Trompowsky structure — bishop pair, sounder pawns, Black's doubled f-pawns as the target. This is a classic technical edge: centralise, occupy the open files, and grind. With no queens to create counterplay, Black's structural defects become a long-term liability you patiently squeeze.", sayShort: "Queenless — grind the doubled-pawn weakness." },
  sources: ['concept:pos-development', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// old-indian-defence :: classical_be2
const C86: SublineNarration = {
  intro: { say: "The Classical Old Indian with Be2 and the standard development — White takes space, you take solidity. After …e5 and …O-O the plan is the …c6 and …Re8 regroup, preparing …exd4 or …d5 at the right moment. White's edge is space alone; neutralise it with accurate piece placement and a timely central break.", sayShort: "Classical Be2 — regroup, time the break." },
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// old-indian-defence :: main_e5
const C87: SublineNarration = {
  intro: { say: "The Old Indian main line — …d6 and …e5, the cramped-but-bombproof cousin of the King's Indian. You strike the centre with …e5, complete with …Be7 and …O-O, and bide your time. The freeing breaks are …exd4 followed by …Re8 and …Bf8 regrouping, or a later …c6 and …d5. Patient manoeuvring behind a solid wall, then a well-timed break.", sayShort: "Old Indian — …e5, regroup, break …c6/…d5." },
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// old-indian-defence :: bf5_janowski
const C88: SublineNarration = {
  intro: { say: "You've developed the bishop to f5 first — the Janowski/Czech treatment, getting the light bishop active outside the chain before …e5. White may chase with Nh4 or grab space with f3-e4; meet it with …Bg6 and the standard …e5 strike. Solving the bishop early is the whole point: no bad piece, comfortable development.", sayShort: "…Bf5 — bishop out first, then …e5." },
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// old-indian-defence :: e4_clamp
const C89: SublineNarration = {
  intro: { say: "White builds the full e4 centre against your …d6/…e5 setup, the classical clamp. Don't be passive: …Nbd7, …Be7, …O-O, then …exd4 and …Re8 to fight for the open lines, or …c6 preparing …d5. Your position is springy, not just solid — pick the freeing break carefully and the cramp uncoils into a fully equal game.", sayShort: "e4 clamp — free with …exd4 or …c6-d5." },
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// old-indian-defence :: fianchetto_g3
const C90: SublineNarration = {
  intro: { say: "White meets your Old Indian with the quiet g3 fianchetto. Adapt to a King's-Indian-lite: …Bg7, …O-O, …Nbd7 and …e5, contesting the centre. The g2-bishop blunts long-diagonal play, so lean on the …e5 break and patient manoeuvring. Cramped but sound — equalise by completing development and choosing the right central lever.", sayShort: "g3 — …Bg7 and …e5, patient play." },
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// english-opening :: reversed_dragon
const C91: SublineNarration = {
  intro: { say: "Black sets up …d5 and a Reversed-Dragon structure, propping the centre. You're playing a Dragon a tempo to the good: fianchetto, chip at the centre, contest the long light diagonal with the g2-bishop, and use the extra move to grab exactly the initiative White can only envy in the real Dragon. Press on the queenside and the long diagonal.", sayShort: "Reversed Dragon — press with the extra tempo." },
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// english-opening :: reversed_sicilian
const C92: SublineNarration = {
  intro: { say: "Black answers c4 with …e5 — a Sicilian with colours reversed, and you're the one a full tempo up. Play it like an extra-move Sicilian: g3 and Bg2 on the long diagonal, Nc3, and the d3/d4 break in good time. That spare tempo lets you reach the attacking setups Black only dreams of in the real Sicilian.", sayShort: "Reversed Sicilian — a Sicilian up a tempo." },
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// english-opening :: symmetrical
const C93: SublineNarration = {
  intro: { say: "The Symmetrical English — Black mirrors with …c5 and the double fianchetto. Balanced, so make the first imbalance yourself: Rb1 and b4 to roll the queenside, lean on the long diagonal with Bg2, and turn your move-one head start into a lasting space grab. The symmetry breaks in favour of whoever expands first — that's you.", sayShort: "Symmetrical — make the first imbalance, b4." },
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// english-opening :: botvinnik_e4
const C94: SublineNarration = {
  intro: { say: "You've built the Botvinnik English setup — c4, Nc3, g3, Bg2, e4, Nge2 — the great clamp. The pawns on c4 and e4 grip d5, the g2-bishop rakes the long diagonal, and the plan is a kingside expansion with f4 in due course. A powerful, harmonious structure that squeezes Black off the key central squares.", sayShort: "Botvinnik clamp — grip d5, expand f4." },
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// english-opening :: mikenas_e4
const C95: SublineNarration = {
  intro: { say: "The Mikenas-flavoured line — after …e6 you've struck with e4, claiming a big centre. The play sharpens: the exf6/e5 thrusts and the central pawn mass give you space and attacking chances. Develop quickly behind the pawns and use the central majority to cramp Black before he can untangle. Aggressive and concrete.", sayShort: "Mikenas e4 — claim the big centre." },
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// reti-opening :: kia_e4
const C96: SublineNarration = {
  intro: { say: "You've reached a King's-Indian-Attack flavoured Réti — d3, Nbd2, e4, the central expansion behind the fianchetto. Now the kingside beckons: the e4-e5 clamp, the Nf1-g3 or Nh4 reroute, and the f4 lever. Black's solid centre simply becomes the thing you expand around. A rich, plan-rich middlegame on your terms.", sayShort: "KIA Réti — expand e4, swing the kingside." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// reti-opening :: main_fianchetto
const C97: SublineNarration = {
  intro: { say: "The pure Réti — Nf3, c4 and the g3 fianchetto against Black's …d5. The hypermodern bet: let Black hold the centre so you can lean on it from the wings. The g2-bishop rakes the long diagonal, c4 pressures d5, and the d3/e4 or b4 breaks come at your leisure. Flexible, low-theory, and built to undermine what Black builds.", sayShort: "Réti — fianchetto, undermine the centre." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// reti-opening :: dxc4
const C98: SublineNarration = {
  intro: { say: "Black grabs the c4-pawn. No matter — you regain it easily and the gain is positional: the g2-bishop's diagonal opens fully and Black has surrendered the centre. Recapture with Qa4+ or e3-Bxc4, complete development, and press d5 and b7 along the long light diagonal. A comfortable, space-flavoured Réti.", sayShort: "…dxc4 — regain it, open the diagonal." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// reti-opening :: qxd4_endgame
const C99: SublineNarration = {
  intro: { say: "The line has simplified after an early queen trade or central exchange. The Réti's quiet technical face: the bishop pair or the better minor piece, sound structure, and the open files. Centralise, claim the open lines, and grind — with the long-diagonal bishop and a clean pawn skeleton, the small edge is real and durable.", sayShort: "Simplified — centralise and grind the edge." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// reti-opening :: slav_reti
const C100: SublineNarration = {
  intro: { say: "Black props the centre with …c6, a Slav-Réti hybrid. Develop the standard way — g3, Bg2, b3, Bb2, the double fianchetto — and probe with the c4/e4 breaks. Black is solid but passive; lean on the long diagonals from both bishops and the small, durable space edge of the Réti slowly accumulates into pressure.", sayShort: "Slav-Réti — double fianchetto, probe c4/e4." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// reti-opening :: d4_advance
const C101: SublineNarration = {
  intro: { say: "Black advances …d4, grabbing space and gaining a tempo on your knight. The hypermodern reply is to undermine, not block: b4 (the gambit) to chip at the c5/d4 pawn chain, or e3 to challenge the spearhead directly. Black's advanced pawn becomes overextended; surround it and the space he grabbed turns into a target.", sayShort: "…d4 — undermine with b4 or e3." },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// kings-indian-attack :: french_setup
const C102: SublineNarration = {
  intro: { say: "The King's Indian Attack against a French structure — Black has …e6 and …d5, you've built d3, Nbd2, g3, Bg2 and e4. The KIA's bread and butter: trade on e4 or push e5 to clamp, then swing the kingside — Nf1-g3 or Nh4, the f4 lever, and the pawn storm at Black's king. The whole system is one long attacking plan.", sayShort: "KIA vs French — clamp e5, attack." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// kings-indian-attack :: double_fianchetto
const C103: SublineNarration = {
  intro: { say: "Black mirrors with a …g6 double-fianchetto setup. The kingside storm is harder against the fianchetto, so play the dual-purpose KIA: complete development, keep the e4-e5 option, and probe with both the d4/c3 central setup and the slow kingside build. Patience — the fianchetto blunts the attack but not the long-term plan of expanding where you choose.", sayShort: "Double fianchetto — patient, keep e5 in hand." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// kings-indian-attack :: sicilian_setup
const C104: SublineNarration = {
  intro: { say: "Black plays a Sicilian-flavoured setup with …c5 and …Nc6. Your KIA machine doesn't change: d3, Nbd2, g3, Bg2, O-O, then e4 and the kingside expansion. Black gets queenside space; you get the king-hunt. The classic KIA race — your attack down the kingside against his pawns on the other wing, and yours arrives with tempo.", sayShort: "KIA vs Sicilian — race the kingside attack." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// kings-indian-attack :: caro_setup
const C105: SublineNarration = {
  intro: { say: "Black sets up Caro-style with …c6, …d5 and …e5. Against this central wedge the KIA plan adapts: complete the fianchetto, castle, and turn to the kingside with the Nf1-h2-g4 or f4 ideas. Black's broad centre is precisely the soil the King's Indian Attack thrives on — you regroup behind it and attack around it.", sayShort: "KIA vs Caro — regroup, attack." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// kings-indian-attack :: e5_tabiya
const C106: SublineNarration = {
  intro: { say: "You've reached the KIA attacking tabiya — the e4-e5 wedge clamps Black's kingside and the pieces are poised. Now execute: Nf1-g3 (or Nh2-g4), Re1, the f4 lever, Qe2 and the rook lift, all aimed at h7 and the castled king. Black is solid on the queenside but you have the whole kingside to work with. Press the attack.", sayShort: "Tabiya — e5 clamp, Nf1-g3, f4, attack h7." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// birds-opening :: leningrad
const C107: SublineNarration = {
  intro: { say: "The Leningrad Bird — f4 with the g3 fianchetto, a reversed Leningrad Dutch a tempo up. The g2-bishop and the f-pawn combine on the kingside while you hold the centre with d3 and c3. Castle, expand with the e4 or Ne5 push, and turn the extra tempo into the kingside initiative the Dutch player can only dream of.", sayShort: "Leningrad Bird — fianchetto, e4/Ne5, attack." },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// birds-opening :: from_gambit
const C108: SublineNarration = {
  intro: { say: "Black tries the From Gambit — …e5, offering a pawn to blow open your kingside after fxe5 d6. Decline the complications by accepting carefully: take the pawns, return one if needed with e4 or Nf3, and consolidate. The d-pawn and the development lead are Black's only compensation; defend accurately and the extra material tells.", sayShort: "From Gambit — accept, consolidate, keep the pawn." },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// birds-opening :: classical
const C109: SublineNarration = {
  intro: { say: "The Classical Bird — f4 against …d5, with the b3/Bb2 and e3/Be2 setup. You aim for a reversed-Dutch attack: the f-pawn and the Bb2 on the long diagonal both point at Black's kingside, and Ne5 plus the queen lift drive the assault. Solid in the centre, ambitious on the wing — the Bird rewards the bold attacker.", sayShort: "Classical Bird — Bb2 diagonal, Ne5, kingside." },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// birds-opening :: stonewall
const C110: SublineNarration = {
  intro: { say: "Black sets up a Stonewall-style wall against your Bird. Break the symmetry: target the e5 (your e4-e5 in reverse) or e4 outpost, reroute a knight to the strong square, and use the half-open f-file. The Bird's reversed-Dutch logic means you're the one a move ahead in the structure both sides know — press that tempo.", sayShort: "Stonewall — fight for the e5 outpost." },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// birds-opening :: double_fpawn
const C111: SublineNarration = {
  intro: { say: "Black answers …f5, the symmetrical double-f-pawn Bird. Now it's a battle of mirror structures: develop the long-diagonal bishop, contest the centre with e4 (your reversed-gambit lever), and exploit the slight weakening around Black's king that the …f5 push creates. Whoever opens the centre with better-placed pieces presses — and that's you, a tempo ahead.", sayShort: "…f5 — open with e4, exploit the king." },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// albin-countergambit :: main_nf3
const C112: SublineNarration = {
  intro: { say: "The Albin Countergambit main line — you've thrown …e5 and pushed …d4, a thorn that cramps White and defines the whole game. After Nf3, Nc6 and g3 develop; the standard plan is …Bg4 (or …Nge7-g6), …Qd7 and the bold …O-O-O, throwing the kingside pawns at White while your d4-wedge cramps him. A genuine, aggressive surprise weapon.", sayShort: "Albin — guard d4, …Bg4, …Qd7, …O-O-O." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// albin-countergambit :: lasker_trap
const C113: SublineNarration = {
  intro: { say: "This is Lasker Trap territory — White grabbed with e3 against your d4-wedge, and the …dxe3! resource is poison. If White recaptures fxe3, …Qh4+ rakes the loosened kingside and you regain the material with a fine game. The whole point of the Albin: tempt White to win the pawn and spring the tactic. Know it cold and you score heavily.", sayShort: "Lasker Trap — …dxe3!, …Qh4+ punishes fxe3." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// albin-countergambit :: underpromotion
const C114: SublineNarration = {
  intro: { say: "The famous Albin underpromotion line — after …dxe3 and Bxb4, the …exf2+ shot drags White's king out, and the …fxg1=N+! knight-promotion trick wins material in the purest form. Here White has avoided the worst with Kxf2, but the king is exposed and you stand at least equal: develop with tempo and hunt the displaced monarch.", sayShort: "Underpromotion line — exposed king, press." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// albin-countergambit :: e4_lines
const C115: SublineNarration = {
  intro: { say: "White grabs more space with e4 against your Albin wedge. Hold your nerve and your pawn: …Nc6 and …f6 chip at the e5-pawn, recapturing on f6 to open lines, while the d4-pawn stays a cramping thorn. White's broad centre is overextended; surround it with pieces and the space he grabbed becomes a liability you exploit.", sayShort: "e4 — chip with …f6, keep the d4-thorn." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// englund-gambit :: nc3_decline
const C117: SublineNarration = {
  intro: { say: "White declines the b2-pawn and develops Nc3, returning the gambit pawn for a clean lead in development. Be realistic: the Englund is a practical surprise, not full equality, so play actively — develop with tempo, contest the centre, and create problems before White consolidates his small edge. Your best chance is energy and initiative.", sayShort: "Nc3 — develop actively, create problems." },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// englund-gambit :: qxb2_bc3
const C118: SublineNarration = {
  intro: { say: "You've snatched on b2 and White challenges with Bc3, trying to trap the queen. The …Bb4 pin is the key resource — pinning the bishop so the queen escapes, and after the trades you reach a position where White's extra pawn is offset by your active pieces and his slightly loosened queenside. Stay alert: this is a tactics-rich, practical fight.", sayShort: "…Qxb2 — …Bb4 pins, free the queen." },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// anti-benoni-push :: benko_b5
const C119: SublineNarration = {
  intro: { say: "Black tries the Benko-style …b5, sacrificing a pawn for queenside files against your d5-push. Accept and stay solid: take the pawns, give one back with the bishop trade on f1 if needed, and prioritise king safety with Nge2 and a quick castle. Your extra pawn or your big centre, plus a sound king, outweighs Black's open files when you defend accurately.", sayShort: "…b5 — accept, finish development, hold the edge." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// anti-benoni-push :: modern_benoni
const C120: SublineNarration = {
  intro: { say: "Black goes for the Modern Benoni with …e6 and the exchange on d5. Now you have the dream White centre — pawns on d5 and e4 — and the plan is space and attack: f4 and Nf3, Be2, O-O, and the e4-e5 break that cracks Black's position open. Restrain …b5 with a4 and your space advantage becomes a kingside initiative.", sayShort: "Modern Benoni — e4-f4 centre, restrain …b5." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// anti-benoni-push :: kid_benoni
const C121: SublineNarration = {
  intro: { say: "Black fianchettoes with …g6 and …Bg7, a King's-Indian-Benoni hybrid. Build the broad centre — e4, Nc3, and develop with Nf3 or Nge2, Be2, O-O — and you stand better with more space and a clear plan. Meet …e5 by closing or …c5-based play by clamping; the extra space is a lasting, comfortable trump.", sayShort: "KID-Benoni — build the e4 centre, take space." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// anti-benoni-push :: czech_e5
const C122: SublineNarration = {
  intro: { say: "Black locks the centre with …e5, a Czech-Benoni structure. The play turns slow and strategic: you own more space, so manoeuvre behind the pawns and prepare the right break — b4 on the queenside or f4 on the king's wing. Patience is the watchword; pick the lever that opens lines where you're strongest and Black's cramped position cracks.", sayShort: "Czech …e5 — manoeuvre, pick b4 or f4." },
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// anti-englund :: qe7_main
const C123: SublineNarration = {
  intro: { say: "Black plays the Englund tricks — …Qe7 hitting your extra e5-pawn, hoping you grab greedily or misplace a piece. The refutation is calm development: Nf3 and Nc3 defend e5, you simply finish developing, and the extra pawn stays yours. Don't get cute — return nothing you don't have to, keep the king safe, and the material decides.", sayShort: "…Qe7 — develop calmly, keep the e5-pawn." },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// anti-englund :: bg5_d6
const C124: SublineNarration = {
  intro: { say: "Black tries the …d6 and …f6 break with Bg5 ideas to pry the e5-pawn loose. Hold firm: keep pieces defending e5, meet …f6 with the bishop retreat or a timely return that leaves you ahead, and complete development. The Englund's whole hope is your carelessness — play solid, principled chess and the gambit simply fails.", sayShort: "…d6/…f6 — hold e5, develop, stay ahead." },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// anti-englund :: consolidate
const C125: SublineNarration = {
  intro: { say: "Black scrambles for activity to justify the gambit pawn. Your job is the least glamorous and most effective: consolidate. Develop every piece to a sound square, tuck the king away, and neutralise the open lines. Once you're fully developed with the king safe, the extra pawn is simply an extra pawn — convert it in the endgame.", sayShort: "Consolidate — king safe, then the pawn tells." },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// anti-kid-saemisch :: saemisch_c5
const C126: SublineNarration = {
  intro: { say: "Black hits with …c5 against your Sämisch, a Benoni-flavoured counter to the f3-e4 centre. Choose your structure: d5 to close and clamp with space, or dxc5 to open with a development lead. Either way your big centre and the f3-prop give you a comfortable game — the Sämisch is built to meet exactly this central challenge from a position of strength.", sayShort: "…c5 — d5 closes or dxc5 opens." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// anti-kid-saemisch :: saemisch_main
const C127: SublineNarration = {
  intro: { say: "The Sämisch main tabiya — your pawns stand f3-e4 with Be3 and the queen heading to d2. Now choose the plan that fits: the kingside pawn storm with g4-h4-h5 against Black's fianchetto, or O-O-O and a full-blooded attack, or the patient queenside expansion. The Sämisch's strength is its flexibility — a rock-solid centre backing an assault on either flank.", sayShort: "Sämisch — g4-h4 or O-O-O storm." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// anti-kid-saemisch :: saemisch_nc6
const C128: SublineNarration = {
  intro: { say: "Black develops …Nc6, pressuring your d4-pawn in the Sämisch. Meet it head-on: Nge2 to bolster d4, then d5 hitting the knight with tempo and grabbing space, or Be3 and Qd2 completing the clamp. The knight gets kicked, you gain space, and the broad f3-e4 centre stands firm — a pleasant Sämisch squeeze.", sayShort: "…Nc6 — Nge2 and d5, gain space." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// anti-kid-saemisch :: saemisch_e5
const C129: SublineNarration = {
  intro: { say: "Black strikes …e5 in the Sämisch. Lock the centre with d5 and the game splits into two wings: you expand on the queenside with c5 and the minority push, or storm the kingside yourself with g4 and h4 behind the f3-pawn. The Sämisch's solid centre lets you attack on whichever flank you choose — pick your wing and roll.", sayShort: "…e5 — lock d5, attack a wing." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// anti-grunfeld-exchange :: nf3_bg7
const C130: SublineNarration = {
  intro: { say: "A quieter Exchange-Grünfeld move order with Nf3 and …Bg7 development. The same battle applies: your central pawns versus Black's piece pressure. Develop solidly — Be2 or Bc4, O-O, Be3 — keep d4 defended, and prepare the e5 or d5 advance at the right moment. The broad centre is your asset; nurse it and the space tells.", sayShort: "Nf3 Exchange — develop, guard d4, advance later." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// anti-grunfeld-exchange :: exchange_main
const C131: SublineNarration = {
  intro: { say: "The Exchange Grünfeld from White's side — you've built the broad d4-e4 centre that the whole opening is fought over. Black's g7-bishop and …c5 will hammer at d4, so prop and advance: Bc4, Ne2, O-O, Be3 and Qd2 to defend the centre, then the d5 push that turns your pawns from target into battering ram. Hold the centre and you're better; let it fall and you're worse — so guard it and roll.", sayShort: "Exchange — defend the centre, then push d5." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// anti-nimzo-qc2 :: qc2_d5
const C132: SublineNarration = {
  intro: { say: "Black strikes …d5 against your Qc2. Resolve with cxd5 and you reach a comfortable structure: the bishop pair is in your pocket once Black takes on c3, and the e4 break or the central majority gives lasting pressure. Develop smoothly with Nf3, e3, Bd3 and castle — the two bishops do the long-term work.", sayShort: "Qc2 …d5 — cxd5, keep the two bishops." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// anti-nimzo-qc2 :: qc2_c5
const C133: SublineNarration = {
  intro: { say: "Black hits …c5 against your Qc2 setup. Take with dxc5 and invite Black to spend time regaining the pawn while you complete development with the bishop pair and a lead in tempo. The queenside opens to your benefit; develop actively, keep the long-term bishop advantage, and the small structural edge grows into a pull.", sayShort: "Qc2 …c5 — dxc5, lead in development." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// anti-nimzo-qc2 :: qc2_main
const C134: SublineNarration = {
  intro: { say: "The Qc2 anti-Nimzo where Black develops modestly with …d6, …Nc6 or …b6. Your plan never changes: a3 to clarify the bishop, recapture toward the centre to keep the pair, and build the e4 push. The two bishops plus a broad centre are a durable, classical advantage — develop in good order and expand when ready.", sayShort: "Qc2 — a3, build e4, two bishops." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// anti-nimzo-qc2 :: qc2_oo
const C135: SublineNarration = {
  intro: { say: "The Classical Qc2 anti-Nimzo — you sidestep the doubled pawns by recapturing on c3 with the queen, and keep the bishop pair as your trump. After …O-O, play a3 to force the bishop's hand: if it takes on c3 you get the pair and the half-open b-file, and the plan is e4, building a big centre for the bishops to rake. Patience, then central expansion.", sayShort: "Qc2 …O-O — a3, win the bishops." },
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// anti-qid-fianchetto :: qid_d5
const C136: SublineNarration = {
  intro: { say: "Black answers …d5, steering toward a symmetrical or IQP-flavoured structure. Resolve with cxd5 and develop naturally — Nc3, e3, the g2-bishop pressuring the centre. Whether Black ends with an isolated d-pawn to besiege or a symmetrical position to out-coordinate, your fianchetto and easy development give the comfortable side.", sayShort: "…d5 — cxd5, develop, press the centre." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// anti-qid-fianchetto :: qid_bb4
const C137: SublineNarration = {
  intro: { say: "Black checks with …Bb4+ before committing. Block with Bd2 and welcome the trade — you regain time, keep the powerful g2-bishop, and emerge with the same pleasant space. Don't fear the check; it swaps off one of Black's developing pieces while your long-diagonal trump stays right where it belongs.", sayShort: "…Bb4+ — block Bd2, keep the big bishop." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// anti-qid-fianchetto :: qid_bb7
const C138: SublineNarration = {
  intro: { say: "Black develops …Bb7, the classical Queen's Indian, mirroring your bishop on the long diagonal. Build toward e4: Nc3, the g2-bishop, and the central push that claims more space. The battle is for the e4-square — out-prepare Black there with the d-pawn and knight support, and your central majority slowly tells.", sayShort: "…Bb7 — fight for e4, claim central space." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// anti-qid-fianchetto :: qid_ba6
const C139: SublineNarration = {
  intro: { say: "Black plays the modern …Ba6, biting at your c4-pawn before you can settle the g2-bishop. Answer b3 (or Qa4/Nbd2) to defend c4 and keep the long-diagonal bishop, then complete the fianchetto and contest the light squares. The fight is all about e4 and the long diagonal — hold c4, finish development, and your space and central control give the pull.", sayShort: "…Ba6 — defend c4 with b3." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// anti-dutch-staunton :: qh5
const C140: SublineNarration = {
  intro: { say: "Black grabs and you've got the sharp Qh5+ resource available, hitting the loosened kingside after …f5 and …e6. Play energetically: the queen sortie exploits the weak light squares, and quick development keeps Black's king pinned in the centre. The Staunton rewards initiative — keep checking, keep developing, and let the exposed king be the target.", sayShort: "Qh5+ — exploit the weak light squares." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// anti-dutch-staunton :: staunton_d5
const C141: SublineNarration = {
  intro: { say: "Black bolsters with …d5 instead of clinging to the pawn. Keep the initiative: f3 to open the centre, recover the pawn with the better structure, and pile pieces toward Black's loosened kingside, where the early …f5 left lasting holes. The gambit's compensation is development and the weak light squares around Black's king — exploit both.", sayShort: "…d5 — f3, recover, hit the king." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// anti-dutch-staunton :: staunton_main
const C142: SublineNarration = {
  intro: { say: "The Staunton Gambit — you've offered e4 against the Dutch, and after …fxe4 Nc3 Nf6 Bg5 you have a roaring development lead for the pawn. Your plan is concrete: f3 to blast open the centre, fast piece play down the e- and f-files, and pressure on the e4-pawn and Black's kingside. Black's extra pawn is a liability while his king is stuck — attack.", sayShort: "Staunton — f3 opens, attack the king." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// anti-qgd-exchange :: central_e4
const C143: SublineNarration = {
  intro: { say: "In this Exchange QGD you can favour the central plan over the minority attack: e3, Bd3, Nge2 and f3, preparing the e4 break that frees your pieces and opens lines toward Black's king. The choice between minority attack and central e4 is yours — here the central break gives the more aggressive, double-edged game with real attacking chances.", sayShort: "Exchange QGD — prepare the central e4 break." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// anti-qgd-exchange :: qxd5
const C144: SublineNarration = {
  intro: { say: "Black recaptures with …Qxd5 instead of the e-pawn, avoiding the Carlsbad. Develop with tempo: Nf3, Nc3 hitting the queen, e4 grabbing the centre, and you emerge with a clear space advantage and the more active pieces. Black dodged the minority-attack structure but handed you the centre and a lead in development — press it.", sayShort: "…Qxd5 — Nc3 and e4 grab centre." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// anti-qgd-exchange :: minority
const C145: SublineNarration = {
  intro: { say: "The Exchange QGD with the Carlsbad structure — your textbook plan is the minority attack. Push b4-b5 to chew at Black's c6-pawn; when it falls, the half-open c-file and the backward c-pawn become permanent targets while your own centre stays sound. Develop Bg5, e3, Bd3, Nge2, castle, and roll the queenside pawns. A model strategic squeeze.", sayShort: "Exchange QGD — minority attack b4-b5." },
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// anti-budapest :: ne4
const C146: SublineNarration = {
  intro: { say: "Black tries the Fajarowicz …Ne4, planting the knight aggressively. Neutralise it calmly: Nf3 and Nbd2 challenge the intruder, and after the trades you keep a comfortable game with the extra space and sound development. The centralised knight looks scary but has no real support — chase it off and your structural edge remains.", sayShort: "Fajarowicz …Ne4 — Nf3, Nbd2, neutralise." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// anti-budapest :: bf4_main
const C147: SublineNarration = {
  intro: { say: "Against the Budapest you hold the e5-pawn with Bf4 and Nf3, the principled anti-gambit. Black regains it with …Nc6 and …Bb4+/…Ngxe5, but you come out with the freer position: a small space edge, the bishop pair potential, and easy development. Don't cling greedily to the pawn — give it back on your terms and keep the structural pull.", sayShort: "Bf4 — hold e5, give back later." },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// anti-london-black :: c4_clamp
const C148: SublineNarration = {
  intro: { say: "You've grabbed queenside space with …c4, clamping White's b3-and-c-pawn breaks and gaining a free hand on the wing. The plan from here: …b5-b4 to roll the pawns, …Na5-c4 or …Bf5 for piece activity, and patient pressure on White's now-static queenside. The London is at its weakest when you seize space first — keep rolling.", sayShort: "…c4 — clamp the queenside, roll …b5-b4." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// anti-london-black :: e4_push
const C149: SublineNarration = {
  intro: { say: "White lashes out with the e4 push instead of the quiet London. Meet the central break head-on: capture and develop with tempo, exploit that White has spent moves on the slow Bf4 setup, and seize the centre yourself. The aggressive e4 abandons the London's solidity — punish it with quick, active development and central control.", sayShort: "e4 — take it, seize the centre." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// anti-catalan-black :: open
const C150: SublineNarration = {
  intro: { say: "The Open Catalan from Black's side — you've taken on c4 and will hold it briefly with …a6 and …b5, or give it back for free development. The point is to solve your game before White's g2-bishop chokes you: get the light bishop active, complete development with …Nc6 or …Nbd7, and break with …c5. Hold the pawn or return it cleanly — either way you equalise.", sayShort: "Open Catalan — hold or return c4." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// anti-catalan-black :: nimzo_nc3
const C151: SublineNarration = {
  intro: { say: "White plays Nc3 instead of the pure Catalan fianchetto, inviting a Nimzo with …Bb4. Pin the knight, fight for e4, and you're in comfortable Nimzo-Indian territory — fracture White's pawns with …Bxc3 or hold the pin and strike the centre. The Catalan's fianchetto pressure never materialises; you reach a well-charted, equal structure.", sayShort: "Nc3 — …Bb4, play the Nimzo." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// anti-catalan-black :: bb4_check
const C152: SublineNarration = {
  intro: { say: "You check with …Bb4+, the reliable Catalan equaliser. After Bd2 trade or retreat with gain of time, neutralising the g2-bishop's pull before it ever bites. The cleanest way to take the sting out of the Catalan — swap off a piece, complete development, and reach a balanced game with no long-term light-square worries.", sayShort: "…Bb4+ — defuse the Catalan, trade with tempo." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// anti-catalan-black :: qa4_nbd7
const C153: SublineNarration = {
  intro: { say: "White harries with Qa4+ to regain the c4-pawn. Block with …Nbd7 and develop in good order — the check costs White a little time and your pieces come out naturally. After White recaptures on c4, strike with …c5 or …a6 and …b5 to free the queenside; the long-diagonal bishop is annoying but containable with active play.", sayShort: "Qa4+ — …Nbd7, free with …c5." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// anti-colle-black :: c4_transpo
const C154: SublineNarration = {
  intro: { say: "White plays c4, transposing toward a Queen's-Gambit or Slav structure rather than a pure Colle. Adapt to the well-charted main roads: …e6 and a solid QGD setup, or …c6 holding the centre. Develop soundly, contest the centre, and you reach the same reliable equality the Queen's Gambit Declined offers — no Colle bind to worry about.", sayShort: "c4 — transpose, play a solid QGD setup." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// anti-colle-black :: bf4_london
const C155: SublineNarration = {
  intro: { say: "White develops Bf4, a London-flavoured Colle. Counter with the same energy: …c5 and …Nc6 hitting d4, …Qb6 eyeing b2, and the active light-bishop development. White's bishop on f4 is committed and can be a target for …Nh5 or …c4 ideas; press on d4 and the queenside and your active pieces give a comfortable game.", sayShort: "Bf4 — …c5, …Nc6, press d4 and b2." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// anti-colle-black :: zukertort_b3
const C156: SublineNarration = {
  intro: { say: "White goes for the Zukertort with b3 and Bb2, aiming the bishop down the long diagonal at your kingside. Blunt it: develop …Bd6 to contest the b8-h2 diagonal, castle, and prepare the …e5 break that challenges the centre and frees your game. Neutralise the Bb2's stare with …e5 and active pieces, and White's slow setup gives you easy equality.", sayShort: "Zukertort b3 — …Bd6 and the …e5 break." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// anti-colle-black :: main
const C157: SublineNarration = {
  intro: { say: "The anti-Colle recipe — and the golden rule is to free your light-squared bishop BEFORE …e6 ever shuts it in. Strike with …c5 and …Nc6, develop the bishop actively to f5 or g4, and only then play …e6. That single idea solves the Colle's whole point; with your bad bishop turned good, you reach a comfortable, fully equal game with active pieces.", sayShort: "Anti-Colle — get the bishop out before …e6." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};
// anti-colle-black :: exchange_dxc5
const C158: SublineNarration = {
  intro: { say: "White releases with dxc5, opening the centre. Recapture and you reach a free, active game — the bishops breathe, the pieces develop to natural squares, and White's small space edge has evaporated. The Colle thrives on a closed centre; once it opens with dxc5, your easy development gives a comfortable, balanced middlegame.", sayShort: "dxc5 — recapture, free pieces, easy game." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit'],
};

// DEEP DSLAV :: slav-defence::4::a4@8
const DSLAV: SublineNarration = {
  intro: { say: "Look what White's a4 just did — nothing for his development, but it does fix the queenside. So this is your moment: the whole reason you grabbed on c4 first was to let your light-squared bishop breathe, and now you free it. Get that bishop out before …e6 ever locks it away, and your worst piece becomes your best.", sayShort: "Main Slav — free the bishop now." },
  beats: [
    { atMove: 9, say: "There it is — the bishop steps out to f5, OUTSIDE the pawn chain, exactly where it can never get trapped. Follow the arrow: it rakes the diagonal toward c2, right next to White's king. And remember, his a4 handed you the b4-square to use later. You're already the more comfortable side.", sayShort: "…Bf5 — the good bishop, free.", arrows: [_A('f5', 'b1', ATK)], highlights: [_H('f5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// DEEP DSSL :: semi-slav::4::Bh4@10
const DSSL: SublineNarration = {
  intro: { say: "White pins with Bg5 and after your …h6 drops back to h4 — now you get to be brave. The sharpest Semi-Slav there is, the Botvinnik jungle, and the plan is simple to say and scary to play: grab the pawn, then hit back hard before he can settle. Trust your preparation here; theory says you're fine.", sayShort: "Sharp Semi-Slav — grab, then …g5." },
  beats: [
    { atMove: 11, say: "Take it — …dxc4 banks the gambit pawn. Yes, White gets a big centre and quick pieces for it, but that's the deal you signed up for. Your job now is to hold that extra pawn behind a wall of …b5 and queenside pawns while the storm rages.", sayShort: "…dxc4 — bank the gambit pawn.", highlights: [_H('c4', ATK)] },
    { atMove: 13, say: "Now the punch — …g5, smashing straight into the h4-bishop and grabbing kingside space in one stroke. See why this works? You've taken material and you refuse to sit passively; you hit back before White consolidates. The board catches fire, and you're holding the extra pawn.", sayShort: "…g5 — punch the h4-bishop.", arrows: [_A('g5', 'h4', ATK)], highlights: [_H('g5', ATK), _H('h4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// DEEP DNIM :: nimzo-indian::5::f3@10
const DNIM: SublineNarration = {
  intro: { say: "You've already given up the bishop on c3, and here's why that was a fine trade: it left White with doubled, crippled c-pawns. Now his f3 props the big e4-centre he's proud of — so your whole plan is to blockade it and grind those weak c-pawns. Knights and the light squares beat his bishops in this kind of position.", sayShort: "Sämisch — blockade, grind the c-pawns." },
  beats: [
    { atMove: 7, say: "…Bxc3+ — don't hesitate. You're handing over a bishop, but look at what bxc3 does: it saddles White with doubled c-pawns that can never be healed. That permanent weakness is the target you'll lean on for the rest of the game.", sayShort: "…Bxc3+ — give it, wreck c-pawns.", highlights: [_H('c3', KEY)] },
    { atMove: 11, say: "Time to hit the centre — …e5 leans straight on d4, as the arrow shows. With White's pieces still sitting at home, that broad centre he built is suddenly carrying real weight and starting to creak.", sayShort: "…e5 — lean on d4.", arrows: [_A('e5', 'd4', ATK)], highlights: [_H('e5', ATK), _H('d4', KEY)] },
    { atMove: 13, say: "And the clamp — …e4 jams right up against f3 and freezes White's whole kingside. Notice the point: it steals the f3-square from his knight, so his pieces have nowhere good to go while you calmly finish developing. The position is locked, and you have a clear plan: keep piling on those weak c-pawns.", sayShort: "…e4 — clamp and freeze f3.", arrows: [_A('e4', 'f3', ATK)], highlights: [_H('e4', ATK), _H('f3', KEY)] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// DEEP DGRU :: grunfeld-defence::0::Bc4@12 | grunfeld-defence::1::Bc4@12 | grunfeld-defence::6::Bc4@12
const DGRU: SublineNarration = {
  intro: { say: "The position the whole Grünfeld is built to reach. White has the big d4-e4 centre and just developed his bishop to c4 — and your entire job is to tear that centre down. Your fianchettoed bishop and a well-timed …c5 are the wrecking crew. Invite the centre, then demolish it.", sayShort: "Exchange Grünfeld — demolish the centre." },
  beats: [
    { atMove: 11, say: "…Bg7 — the soul of the Grünfeld. Follow the arrow down the long diagonal: it points dead at d4, the keystone holding White's centre together. Everything you do from here flows from this bishop's stare.", sayShort: "…Bg7 — aim down the long diagonal.", arrows: [_A('g7', 'd4', ATK)], highlights: [_H('d4', KEY)] },
    { atMove: 13, say: "Now the hammer falls — …c5 strikes the base of the centre, and with the g7-bishop already bearing down on d4, that pawn is under fire from two directions. The reason this matters: if White's centre cracks, his whole game collapses with it.", sayShort: "…c5 — hammer d4's base.", arrows: [_A('c5', 'd4', ATK)], highlights: [_H('c5', ATK), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// DEEP DBENKO :: benko-gambit::3::bxa6@8 | benko-gambit::4::bxa6@8
const DBENKO: SublineNarration = {
  intro: { say: "You've given a pawn, and here's why you'll never miss it: the a- and b-files swing open like cannon barrels for your rooks, your bishop will rake the long diagonal, and White's queenside is under siege for the rest of the game. You're not trying to win the pawn back — you're playing for pressure that simply never stops.", sayShort: "Benko — pressure, never miss the pawn." },
  beats: [
    { atMove: 9, say: "…g6 — getting ready to fianchetto. That bishop is heading to g7, where it becomes the second barrel of your queenside artillery, working alongside the open a- and b-files.", sayShort: "…g6 — the fianchetto is coming.", highlights: [_H('g6', SOFT)] },
    { atMove: 11, say: "…Bxa6 recaptures and trains the bishop on the a6-f1 diagonal — keep an eye on f1. The moment White pushes his e-pawn, this bishop crashes in and wrecks his castling. Every Benko piece is pointed at his king and queenside.", sayShort: "…Bxa6 — eye the a6-f1 diagonal.", highlights: [_H('a6', KEY), _H('f1', SOFT)] },
    { atMove: 13, say: "…Bxf1 — and it strikes, forcing Kxf1. See what you've done: his castling is gone and his king is stranded in the centre. That structural damage is exactly what justifies the whole gambit — now pour your rooks down the open files at that exposed king.", sayShort: "…Bxf1 — strand his king.", highlights: [_H('f1', ATK)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// DEEP DALBIN :: albin-countergambit::1::fxe3@10
const DALBIN: SublineNarration = {
  intro: { say: "The Albin Countergambit's sharpest corner — and you need both eyes open here. The famous Lasker Trap is real: if White ever recaptures on b4 with the bishop, …exf2+ and the underpromotion …fxg1=N+ win on the spot. But be honest about the rest — the Albin is a dubious gambit you play for surprise and activity, not equality. Take with …dxe3, know the exact follow-up cold, and tread carefully: one loose move and the whole attack evaporates and you are simply worse.", sayShort: "Albin — real trap, but tread carefully." },
  sources: ['concept:tac-trap', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// DEEP DQID :: queens-indian::1::g3@6 | queens-indian::2::g3@6 | queens-indian::6::g3@6
const DQID: SublineNarration = {
  intro: { say: "White fianchettoes with g3, so don't let him get comfortable — bite first. The whole opening is a scrap over the light squares and the long diagonal, and by hitting his c4-pawn straight away you force him to make a concession before he's ready for it.", sayShort: "QID — bite c4 before he settles." },
  beats: [
    { atMove: 7, say: "…Ba6 — the modern move. Follow the arrow: the bishop swings to the rim just to bear down on c4. Now White has to defend with b3 or Qa4, and either one loosens his grip on the light squares — exactly the concession you were fishing for.", sayShort: "…Ba6 — pressure the c4-pawn.", arrows: [_A('a6', 'c4', ATK)], highlights: [_H('c4', KEY)] },
    { atMove: 9, say: "…Bb4+ — a handy check before you retreat, dragging White's bishop to d2 and gaining a free tempo. You develop with time to spare while the long-diagonal fight stays firmly in your hands.", sayShort: "…Bb4+ — check, steal a tempo.", arrows: [_A('b4', 'e1', ATK)], highlights: [_H('e1', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// DEEP DBUD :: budapest-gambit::4::Bf4@6
const DBUD: SublineNarration = {
  intro: { say: "White is hanging onto your pawn with Bf4, so you set about winning it straight back. Develop with purpose and you'll regain it with ease — and notice the bonus: your pieces leap into the game faster than White can untangle his.", sayShort: "Budapest — win the pawn back fast." },
  beats: [
    { atMove: 7, say: "…Nc6 — develop and attack at the same time. Follow the arrow: the knight hits the e5-pawn White is trying to hold. With …Bb4+ and …Ngxe5 coming, you scoop the pawn back with tempo and an active, fighting game.", sayShort: "…Nc6 — hit the e5-pawn.", arrows: [_A('c6', 'e5', ATK)], highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// DEEP DDUT :: dutch-defence::3::e4@6
const DDUT: SublineNarration = {
  intro: { say: "White meets your Leningrad with the critical e4 thrust — the most testing anti-Dutch try, hitting your …f5 and the centre at once. Be careful here: this is sharp and genuinely double-edged, and the committal …f4 advance can leave you worse if you overpush, because White's broad centre and the g5-bishop bite hard. Keep your king safe, develop with precision, and aim for a solid, defensible game rather than a reckless pawn-storm — accuracy is what holds Black together against e4.", sayShort: "White's e4 — meet it with care." },
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// DEEP DBEN :: benoni-defence::0::e4@10 | benoni-defence::1::e4@10 | benoni-defence::2::e4@10 | benoni-defence::6::e4@10
const DBEN: SublineNarration = {
  intro: { say: "You've traded a quiet structure for pure energy: White's big d5-e4-f4 pawn front against your queenside pawn majority and that powerful g7-bishop. Your plan is all dynamism — fianchetto, castle, then roll …a6 and …b5 on the queenside while you needle his e4-pawn.", sayShort: "Modern Benoni — fianchetto, roll …a6-b5." },
  beats: [
    { atMove: 11, say: "…g6 — setting up the Benoni's signature fianchetto. The bishop heads for g7, where it'll anchor the dark squares and spring to life the moment you break with …b5 or open the centre.", sayShort: "…g6 — set up the fianchetto.", highlights: [_H('g6', SOFT)] },
    { atMove: 13, say: "…Bg7 takes its post. Right now your own knight on f6 screens it, but here's the idea: the instant you play …b5 or trade in the centre, this bishop's pressure toward d4 and b2 roars to life. The imbalance is set — now you go play for the win.", sayShort: "…Bg7 — the dark-square anchor.", highlights: [_H('g7', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// DEEP DKID :: kings-indian-defence::0::b4@16
const DKID: SublineNarration = {
  intro: { say: "White's just locked the centre with d5 and played b4 — he's launching on the queenside. The King's Indian race you've been waiting for, so throw everything at his king. Your e7-knight is rerouting toward g6, and then comes the avalanche: …f5, …f4, …g5-g4. Here's the key: in this opening the side that storms the king usually gets there first. Don't count material — attack.", sayShort: "KID race — storm the king, …f5-f4." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};

// DEEP EQGA :: qga::3::e3@6
const EQGA: SublineNarration = {
  intro: { say: "You handed the c4-pawn back to get your pieces out fast and free — that's the whole spirit of the Accepted. Now you cash in with the freeing break: strike at White's centre and watch his little space edge simply melt away.", sayShort: "QGA — free the game with …c5." },
  beats: [
    { atMove: 9, say: "…c5 — strike d4 head-on (follow the arrow). The centre opens, your light-squared bishop and the whole army finally breathe, and any pull White had dissolves into a balanced, comfortable game. This is exactly why you gave the pawn back.", sayShort: "…c5 — strike d4, breathe.", arrows: [_A('c5', 'd4', ATK)], highlights: [_H('c5', ATK), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// DEEP ETRO :: trompowsky-attack::6::d6@9
const ETRO: SublineNarration = {
  intro: { say: "Black jabbed your bishop with …Ne4, but you kept the pair with Bf4 — now make him pay for the early adventure. You're going to kick that knight and grab space, and the best part is you've sidestepped everything Black prepared against d4. You're calling the shots.", sayShort: "Trompowsky — kick the knight, grab space." },
  beats: [
    { atMove: 6, say: "f3 — boot the e4-knight straight back where it came from (follow the arrow). His clever sortie just cost him time, and you're left with the bishop pair and a totally free hand to expand.", sayShort: "f3 — boot the knight back.", arrows: [_A('f3', 'e4', ATK)], highlights: [_H('e4', KEY)] },
    { atMove: 8, say: "d5 — clamp the centre and seize space. Black's pieces get shoved back, his position cramps, and you build at your own pace behind that broad pawn front. No rush — the space won't go anywhere.", sayShort: "d5 — clamp and seize space.", highlights: [_H('d5', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// DEEP EENG :: englund-gambit::0::Nc3@10
const EENG: SublineNarration = {
  intro: { say: "Here's your trick — …Qb4+ and …Qxb2 swipe a pawn and the open b-file. Be honest with yourself though: this is a surprise weapon, not a guarantee of equality. You're betting White slips, so play sharp, keep that queen safe, and make problems fast before he gets organised.", sayShort: "Englund — swipe b2, play sharp." },
  beats: [
    { atMove: 7, say: "…Qb4+ — the whole point. It's a check that also forks down the b-file at b2 (follow the arrow). White has to answer the check, and the pawn drops into your lap.", sayShort: "…Qb4+ — check and hit b2.", arrows: [_A('b4', 'b2', ATK)], highlights: [_H('b2', ATK)] },
    { atMove: 9, say: "…Qxb2 — the pawn's yours, and so is the half-open b-file. Just stay alert: that queen is exposed, so meet White's tempo moves, develop fast, and turn these open lines into genuine counterplay.", sayShort: "…Qxb2 — grab it, stay sharp.", highlights: [_H('b2', ATK)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// DEEP EABEN :: anti-benoni-push::0::e6@5 | anti-benoni-push::2::e6@5 | anti-benoni-push::3::e6@5
const EABEN: SublineNarration = {
  intro: { say: "Black goes Modern Benoni, and that hands you the dream White centre — pawns side by side on d5 and e4. So play for space and attack: f4 and Nf3, then the e4-e5 break, and keep his …b5 in check with a4. You've got more room; use it.", sayShort: "Modern Benoni — build e4-f4, attack." },
  beats: [
    { atMove: 10, say: "e4 — stake out the broad centre. With pawns abreast on d5 and e4 you simply own more of the board, and Black has to scramble for counterplay before you roll forward and crush him.", sayShort: "e4 — claim the broad centre.", highlights: [_H('e4', KEY)] },
    { atMove: 12, say: "f4 — gain even more space and get ready for the e4-e5 break that pries Black's position open. The aggressive clamp: your pawns advance while he's still untangling on the queenside.", sayShort: "f4 — gain space, prep e5.", highlights: [_H('f4', ATK)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// DEEP EAENG :: anti-englund::1::Qe7@5
const EAENG: SublineNarration = {
  intro: { say: "Black's trying Englund tricks with …Qe7, eyeing your extra e5-pawn. Don't get greedy — the clean refutation is to develop, give the pawn back on your terms with e4, and walk away with the centre and a lead in development. Let structure and time do the work.", sayShort: "Anti-Englund — return it, take centre." },
  beats: [
    { atMove: 8, say: "e4 — hand the pawn back and seize the centre instead. See the trade you're making: Black spent queen moves just to win a pawn, while you've built a broad front and developed faster. Against a shaky gambit, that's the deal you want every time.", sayShort: "e4 — seize the centre, lead develops.", highlights: [_H('e4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// DEEP EANIM :: anti-nimzo-qc2::1::Qxd5@9
const EANIM: SublineNarration = {
  intro: { say: "With Qc2 you've dodged the doubled pawns and pocketed the bishop pair — that's your long-term trump. Now Black's …Qxd5 leaves his queen sitting exposed in the centre, and that's your cue: develop with tempo and get ready to play e4, hitting the queen while your two bishops promise a lasting edge.", sayShort: "Qc2 — gain tempo on the queen." },
  beats: [
    { atMove: 10, say: "Nf3 — develop and prepare e4, which will hit that centralised black queen with tempo. Every move you gain chasing her (look at d5) is a move closer to unleashing your bishop pair on an opening centre.", sayShort: "Nf3 — prepare e4 with tempo.", highlights: [_H('d5', SOFT)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// DEEP EAQID :: anti-qid-fianchetto::1::Ba6@7
const EAQID: SublineNarration = {
  intro: { say: "Black plays the modern …Ba6 to nag your c4-pawn before your bishop settles. Answer cleanly with b3 — you keep the pawn, keep your long-diagonal bishop, and the light-square battle stays in your favour while you finish the fianchetto.", sayShort: "…Ba6 — answer with b3." },
  beats: [
    { atMove: 8, say: "b3 — prop the c4-pawn and refuse the concession Black's …Ba6 was demanding. The pawn holds (look at c4), your bishop heads to g2 next, and your grip on the light squares and the centre is fully intact.", sayShort: "b3 — hold c4, keep the diagonal.", highlights: [_H('c4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// DEEP EADUT :: anti-dutch-staunton::1::dxe4@11
const EADUT: SublineNarration = {
  intro: { say: "You've offered the e4 pawn against the Dutch and now you play for a roaring lead in development. f3 is your lever — it rips open the centre and the f-file at Black's stiff …f5 structure, and your pieces flood toward his king while it's still stuck in the middle.", sayShort: "Staunton — f3 opens, hunt the king." },
  beats: [
    { atMove: 8, say: "f3 — the hammer. It pries the centre open to free your pieces and expose Black's weakened kingside (look at e4). That pawn he grabbed? It's a liability while his king sits uncastled right in the firing line.", sayShort: "f3 — pry the centre open.", highlights: [_H('e4', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// DEEP EAQGD :: anti-qgd-exchange::1::c6@9
const EAQGD: SublineNarration = {
  intro: { say: "The Carlsbad, and your textbook plan is the minority attack. Push b4-b5 to gnaw at Black's c6-pawn — and here's why it works: when that pawn falls, you're left with a permanent target on the half-open c-file while your own centre stays rock-solid.", sayShort: "Carlsbad — launch the minority attack." },
  beats: [
    { atMove: 10, say: "e3 — tidy up your setup before the real plan kicks in: b4-b5 against c6. Keep your eye on that c6-pawn (highlighted) — it's the heart of the minority attack, the single target your whole queenside advance is aimed at.", sayShort: "e3 — prepare b4-b5 vs c6.", highlights: [_H('c6', KEY), _H('d5', SOFT)] },
  ],
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// DEEP EABUD :: anti-budapest::1::Nc6@7 | anti-budapest::2::Nc6@7
const EABUD: SublineNarration = {
  intro: { say: "Against the Budapest you hold the extra pawn with Bf4 — the principled way. Black will win it back with …Nc6 and …Ngxe5, but don't cling to it: give it back on your terms and you come out with the freer position, more space and easier development.", sayShort: "Anti-Budapest — hold, then give back." },
  beats: [
    { atMove: 8, say: "Nf3 — bolster the e5-pawn (follow the arrow) and develop toward the kingside. You'll return the pawn when it suits you, keeping that slightly freer game and the sounder structure that quietly refutes Black's gambit.", sayShort: "Nf3 — bolster e5, develop.", arrows: [_A('f3', 'e5', ATK)], highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// DEEP EALON :: anti-london-black::1::c3@6
const EALON: SublineNarration = {
  intro: { say: "You've hit White's d4 with …c5 and …Nc6, and now you clamp the queenside with …c4. The idea against the London is to grab space first — but know that …c4 commits you, so follow up energetically: …b5 and the queenside roll give you active counterplay on the wing where his slow setup is least prepared.", sayShort: "Anti-London — clamp with …c4." },
  beats: [
    { atMove: 7, say: "…c4 — clamp the queenside and grab the space, freezing White's b- and c-pawn breaks before they start (look at c4). Now …b5 and the pawn roll give you active queenside counterplay — just be ready to follow through, since …c4 has released the central tension.", sayShort: "…c4 — clamp, then roll …b5.", highlights: [_H('c4', ATK)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/London_System'],
};
// DEEP EACAT :: anti-catalan-black::1::Nf3@8
const EACAT: SublineNarration = {
  intro: { say: "The Open Catalan, and you're going to hold that extra c4-pawn with …a6 and …b5 — solving your game before White's g2-bishop can choke you. Get the queenside rolling, finish developing, and break with …c5. Bank the pawn or hand it back cleanly; either way you equalise.", sayShort: "Open Catalan — hold c4 with …a6, …b5." },
  beats: [
    { atMove: 9, say: "…a6 — preparing …b5 to hold the c4-pawn and free your queenside (look at c4). This is how you take the sting out of the Catalan: bank the pawn, expand on the wing, and leave that famous g2-bishop biting on thin air.", sayShort: "…a6 — prep …b5, hold c4.", highlights: [_H('c4', KEY), _H('a6', SOFT)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// DEEP EACOL :: anti-colle-black::3::exd4@8
const EACOL: SublineNarration = {
  intro: { say: "Your …c5 and …Nc6 pressured d4, and White's exd4 leaves him with an isolated d-pawn — there's your target for the whole game. Blockade the square in front of it, train your pieces on d4, and steer toward the endgame where that lonely pawn just drops.", sayShort: "Anti-Colle — besiege the d4-isolani." },
  beats: [
    { atMove: 8, say: "exd4 — and White accepts an isolated d-pawn (highlighted). That pawn is now your long-term target: park a knight on the blockade square in front of it, pile pieces onto d4, and the weakness tells more with every trade.", sayShort: "exd4 — White's d4 is the target.", highlights: [_H('d4', KEY)] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Colle_System'],
};
// DEEP TQGQGA :: queens-gambit::3::Nc6@11
const TQGQGA: SublineNarration = {
  intro: { say: "Black has equalised his development and struck with …c5 — and after the coming trades he'll be left carrying an isolated or hanging d-pawn. That's your blueprint: blockade the pawn with a knight, swap the right pieces, and grind that weakness toward an endgame where it simply falls.", sayShort: "QGA — play against the isolani." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// DEEP TQGD :: qgd::6::Be2@16
const TQGD: SublineNarration = {
  intro: { say: "You've reached the QGD fortress — …Nbd7, …c6, …Qa5 and the …Bb4 pin all in place — and White's quiet Be2 is an admission that there's nothing here to attack. So now you free the game on your own terms: the …dxc4 and …e5 (or …c5) breaks are coming. No weaknesses, no worries — you play for the full point.", sayShort: "QGD fortress — free with …e5 / …c5." },
  sources: ['book:qgd', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// DEEP TCAT :: catalan-opening::2::Nc6@11
const TCAT: SublineNarration = {
  intro: { say: "Black grabbed c4, but treat it as a loan, not a loss. Your g2-bishop scythes down the long diagonal at b7, and you'll calmly win the pawn back with Ne5, Qc2 or a4. The real prize is the bind: while Black struggles to untangle his queenside, you squeeze the light squares.", sayShort: "Open Catalan — the g2-bishop binds." },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// DEEP TLON :: london-system::0::b6@15
const TLON: SublineNarration = {
  intro: { say: "Your London machine is fully built — the Bf4-Bd3 battery aimed at h7, c3 bracing d4, knights on d2 and f3. Black's …b6 is trying to challenge your diagonal, so turn to the kingside now: Ne5, the queen lift, and the attacking plan your setup reaches every single game. Same system, same ideas, every time — that's the beauty of it.", sayShort: "London tabiya — turn to the kingside." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};
// DEEP TBIRD :: birds-opening::1::Nge7@17
const TBIRD: SublineNarration = {
  intro: { say: "The From Gambit has burned itself out in your favour — queens are off and you're a clean pawn up with the bishop on f4 and a healthy extra pawn on e5. Pure technique from here: tuck the king to safety, bring the rooks to the centre, and convert. Black's fire gave him nothing lasting.", sayShort: "From Gambit refuted — a pawn up." },
  sources: ['concept:pos-bishop-pair', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// DEEP TAKID :: anti-kid-saemisch::1::c5@11
const TAKID: SublineNarration = {
  intro: { say: "Black challenges your big f3-e4 centre with a Benoni-style …c5. Pick your structure: d5 to slam it shut and clamp space on both wings, or dxc5 to open up with a lead in development. The Sämisch was built to meet exactly this from strength — choose your plan and the centre holds firm.", sayShort: "Sämisch …c5 — close d5 or open dxc5." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// DEEP TAGRU :: anti-grunfeld-exchange::1::c5@13
const TAGRU: SublineNarration = {
  intro: { say: "You're on the White side of the Exchange Grünfeld now — broad d4-e4 centre, and Black hammering it with …Bg7 and …c5. The whole fight: prop the centre and then advance it. Bring the bishop to c4, knight to e2, castle, Be3 and Qd2 to defend d4, then push d5 and turn your pawns from target into battering ram. Hold that centre and you're better.", sayShort: "Exchange Grünfeld — defend d4, push d5." },
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// DEEP TKID2 :: kings-indian-defence::0::d5@12
const TKID2: SublineNarration = {
  intro: { say: "The centre locks — White meets your …e5 with d5, and the King's Indian race is on. This is what you've been waiting for: the kingside is yours to storm. Reroute the knight toward g6, then …f5, …f4, …g5-g4 crashing into his king while he plays for c5 on the far wing. Trust the attack — the king-hunter usually crowns first.", sayShort: "Locked centre — storm with …f5-f4." },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};

// WAVE WSSL :: 5 keys
const WSSL: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight and steers into the sharpest corner of the Semi-Slav, the Botvinnik and Anti-Moscow crossroads where the opening earns its fearsome name. Don't shrink: poke the bishop, grab the gambit pawn, and hit back before White lights the fuse first. Every move is deep theory, and the verdict is that Black holds.", sayShort: "Bg5 — into the Botvinnik; hit back" },
  beats: [
    { atMove: 8, say: "Bg5 pins your f6-knight against the queen and dares you into the main lines. Put the question to it at once — no reason to let the bishop sit and cramp you.", sayShort: "Bg5 — pins f6; question it", arrows: [_A('g5', 'd8', ATK)], highlights: [_H('f6', KEY)] },
    { atMove: 9, say: "…h6 makes the bishop declare itself: drop back to h4 and keep the pin, or take on f6 and hand you the bishop pair. Either way you have gained a tempo and clarity.", sayShort: "…h6 — put the question", highlights: [_H('g5', KEY)] },
    { atMove: 10, say: "Bh4 holds the pin, but now the bishop is committed to the h4-d8 diagonal — exactly the line you will blow up when …g5 comes crashing in.", sayShort: "Bh4 — pinned to the diagonal", arrows: [_A('h4', 'd8', ATK)], highlights: [_H('f6', KEY)] },
    { atMove: 11, say: "…dxc4 — you snatch the gambit pawn and commit to the fight. White gets a broad centre and a lead in development for it; your task is to cling to that extra pawn behind a coming wall of …b5 and queenside pawns.", sayShort: "…dxc4 — bank the gambit pawn", highlights: [_H('c4', KEY)] },
    { atMove: 12, say: "e4 — White claims the broad centre and readies the pawns to roll at your kingside. The critical moment: you must strike back instantly, before his pawns and pieces gather.", sayShort: "e4 — White's centre; strike now", highlights: [_H('e4', KEY)] },
    { atMove: 13, say: "…g5 — the thunderbolt. The pawn smashes into the h4-bishop and grabs kingside space in one stroke; you have taken material and now you punch back before White consolidates. The board erupts, and theory says you hold.", sayShort: "…g5 — smash the h4-bishop", arrows: [_A('g5', 'h4', ATK)], highlights: [_H('g5', KEY), _H('h4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Semi-Slav_Defense'],
};
// WAVE WBENKO :: 1 keys
const WBENKO: SublineNarration = {
  intro: { say: "cxb5 — White accepts the Benko Gambit, and you are delighted. You give a pawn for the clearest long-term compensation in chess: the a- and b-files crack open like cannon barrels for your rooks, the g7-bishop rakes the long diagonal, and White's queenside stays under siege all game. You are not trying to win the pawn back — you are playing for pressure that never lets up.", sayShort: "cxb5 — accept; pressure, not the pawn" },
  beats: [
    { atMove: 6, say: "cxb5 — White grabs the pawn. Good: now you pry the queenside wide open, and your rooks inherit the a- and b-files for the rest of the game.", sayShort: "cxb5 — the files will open", highlights: [_H('b5', KEY)] },
    { atMove: 7, say: "…a6 — the gambit's key move, challenging the b5-pawn to tear the a- and b-files open. You do not mind losing the pawn; you mind keeping the lines shut.", sayShort: "…a6 — pry the files open", arrows: [_A('a6', 'b5', ATK)], highlights: [_H('b5', KEY)] },
    { atMove: 8, say: "bxa6 — and the files swing open. Your light bishop will scoop up a6 and the rooks pour onto a8 and b8, bearing down on White's static queenside.", sayShort: "bxa6 — files open for the rooks", highlights: [_H('a6', KEY)] },
    { atMove: 9, say: "…g6 — fianchetto time. The g7-bishop becomes the second barrel of the Benko's artillery, raking the long diagonal alongside the open files.", sayShort: "…g6 — the long-diagonal bishop comes", highlights: [_H('g6', KEY)] },
    { atMove: 11, say: "…Bxa6 — the bishop recaptures and trains on the a6-f1 diagonal, straight at White's king. Every Benko piece now points at his queenside and king; the pawn you gave is a distant memory.", sayShort: "…Bxa6 — eye the a6-f1 diagonal", highlights: [_H('a6', KEY), _H('f1', KEY)] },
    { atMove: 13, say: "…Bxf1 — the bishop strikes, forcing Kxf1 and wrecking White's castling. His king is stranded in the centre while your rooks command the open files — textbook Benko pressure that simply never stops.", sayShort: "…Bxf1 — wreck White's castling", highlights: [_H('f1', KEY)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// WAVE WGRUF :: 1 keys
const WGRUF: SublineNarration = {
  intro: { say: "cxd5 — in the Fianchetto Grünfeld White takes on d5 to build the broad e4-centre. That is the invitation you wanted: recapture, let the big pawn front rise, then tear it down. Your g7-bishop and the coming …c5 are the wrecking crew — you invite the centre precisely so you can demolish it.", sayShort: "cxd5 — let the centre rise, then break" },
  beats: [
    { atMove: 8, say: "cxd5 clears the way for e4 and the big centre. You recapture with the knight and get ready to swarm the pawns White is about to build.", sayShort: "cxd5 — clears the way for e4", highlights: [_H('d5', KEY)] },
    { atMove: 9, say: "…Nxd5 — recapture with the knight, eyeing c3 and the dark squares. White will kick it with e4, but every pawn he pushes becomes another target for your fianchettoed bishop.", sayShort: "…Nxd5 — centralise, invite e4", highlights: [_H('d5', KEY)] },
    { atMove: 10, say: "e4 — White grabs the centre and hits your knight. Don't fear the broad front; this is the Grünfeld bargain — the bigger his centre, the more there is to attack.", sayShort: "e4 — the big centre, your target", highlights: [_H('e4', KEY)] },
    { atMove: 11, say: "…Nb6 — the knight steps back with tempo, and the plan crystallises: …c5 and …Bg4 will hammer the base of White's centre while the g7-bishop rakes d4 down the long diagonal. You let the centre rise so you could pull it down.", sayShort: "…Nb6 — regroup, then …c5 hits d4", arrows: [_A('g7', 'd4', ATK)], highlights: [_H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// WAVE WQGCAR :: 1 keys
const WQGCAR: SublineNarration = {
  intro: { say: "…c6 — Black settles into the Carlsbad structure after the exchange on d5. Your roadmap is the minority attack: roll b4-b5 to gnaw at the c6-pawn, and when it falls you inherit a permanent target on the half-open c-file while your own centre stays rock-solid.", sayShort: "…c6 — Carlsbad; minority attack b4-b5" },
  beats: [
    { atMove: 9, say: "…c6 locks the Carlsbad pawn skeleton in place. That c6-pawn is the hook for your whole plan — the minority attack is coming to chew it up.", sayShort: "…c6 — the minority-attack target", highlights: [_H('c6', KEY)] },
    { atMove: 10, say: "e3 — quiet, solid development before the plan begins. Castle, bring your pieces to their Carlsbad squares, then launch b4-b5 against c6 and open the c-file on your terms.", sayShort: "e3 — build, then b4-b5", highlights: [_H('c6', KEY)] },
  ],
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// WAVE WCATBB :: 6 keys
const WCATBB: SublineNarration = {
  intro: { say: "…Bb4+ — the Catalan check, Black's most reliable equaliser, jabbing from b4 before you can settle. Welcome it: Bd2 blocks, and after the trade or retreat you keep the powerful g2-bishop and the same pleasant space. The check removes one of Black's pieces, not your advantage.", sayShort: "…Bb4+ — block Bd2, keep the bishop" },
  beats: [
    { atMove: 7, say: "…Bb4+ checks from the rim, trying to wring a concession before you castle. Don't be rattled — you have a clean blocking move that keeps every trump intact.", sayShort: "…Bb4+ — the Catalan check", arrows: [_A('b4', 'e1', ATK)], highlights: [_H('e1', KEY)] },
    { atMove: 8, say: "Bd2 — block the check and offer the trade. If Black takes you recapture toward the centre and keep the long-diagonal bishop that defines the Catalan; if he retreats you have gained time. Either way the g2-bishop keeps choking the queenside.", sayShort: "Bd2 — block, keep the g2-bishop", highlights: [_H('d2', KEY), _H('g2', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};

// WAVE2 WNIMBXF :: 1 keys
const WNIMBXF: SublineNarration = {
  intro: { say: "Bxf6 — White trades the pinning bishop to dent your kingside pawns, the Leningrad treatment of the Nimzo. Recapture toward the centre and you keep the Nimzo's real trumps: the bishop pair is White's, but you'll fracture his c-pawns with …Bxc3 and seize the centre with …e5 and …e4. A fighting game where the structure is yours to exploit.", sayShort: "Bxf6 — recapture …Qxf6, grab the centre" },
  beats: [
    { atMove: 8, say: "Bxf6 — White swaps the bishop off rather than retreat, hoping to spoil your structure. Don't mind it; recapturing with the queen keeps you active and points the lady straight down the f-file and the long diagonal.", sayShort: "Bxf6 — let him trade", highlights: [_H('f6', KEY)] },
    { atMove: 9, say: "…Qxf6 — recapture toward the centre, eyeing d4 and the c3-knight. Your dark-squared bishop still pins c3, so White's queenside pawns are about to be wrecked by …Bxc3.", sayShort: "…Qxf6 — active, eyes d4", highlights: [_H('d4', KEY), _H('c3', KEY)] },
    { atMove: 11, say: "…e5 — striking at d4, the freeing break. The centre cracks open in your favour while your queen and bishop are already trained on White's loosened position.", sayShort: "…e5 — strike d4, break open", arrows: [_A('e5', 'd4', ATK)], highlights: [_H('e5', KEY), _H('d4', KEY)] },
    { atMove: 13, say: "…e4 — the pawn rolls on, clamping the centre and stealing the f3-square from White's knight. With the bishop pair offset by his shattered c-pawns and your space, you have a rich, fully equal middlegame to press.", sayShort: "…e4 — clamp, cramp the knight", highlights: [_H('e4', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};
// WAVE2 WSLNC3 :: 2 keys
const WSLNC3: SublineNarration = {
  intro: { say: "Nc3 — White develops aggressively and steers the Slav toward its sharpest tangle, the Botvinnik. Don't be talked out of the fight: head in with …e6, let White pin with Bg5, then grab the gambit pawn and lash back with …g5. It's the most analysed jungle in chess, and the verdict is that Black holds — bring your nerve and your preparation.", sayShort: "Nc3 — steer into the Botvinnik" },
  beats: [
    { atMove: 6, say: "Nc3 develops with bite and invites the razor lines. You go straight in with …e6, refusing the quiet game and reaching for the Botvinnik's double-edged riches.", sayShort: "Nc3 — head into the sharp lines", highlights: [_H('c3', KEY)] },
    { atMove: 8, say: "Bg5 pins your f6-knight to the queen. Put the question to it with …h6; whichever way the bishop turns, you have gained a tempo for the coming counterpunch.", sayShort: "Bg5 — pins f6; question it", arrows: [_A('g5', 'd8', ATK)], highlights: [_H('f6', KEY)] },
    { atMove: 11, say: "…dxc4 — you bank the gambit pawn and commit to the brawl. White gets a broad centre and quick pieces; your job is to hold that extra pawn behind a wall of …b5 and queenside pawns.", sayShort: "…dxc4 — bank the gambit pawn", highlights: [_H('c4', KEY)] },
    { atMove: 12, say: "e4 — White claims the centre and prepares to roll at your king. Now or never: you must strike back before the pawns and pieces gather force.", sayShort: "e4 — his centre; counter now", highlights: [_H('e4', KEY)] },
    { atMove: 13, say: "…g5 — the thunderbolt, smashing the h4-bishop and grabbing kingside space in one stroke. You've taken material and punched back before White could consolidate; the board erupts, and theory says you hold.", sayShort: "…g5 — smash the h4-bishop", arrows: [_A('g5', 'h4', ATK)], highlights: [_H('g5', KEY), _H('h4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// WAVE2 WSLMOS :: 1 keys
const WSLMOS: SublineNarration = {
  intro: { say: "Bxf6 — the Moscow Slav, White trading on f6 to dent your structure rather than enter the Botvinnik. Recapture with the queen and you come out comfortable: the bishop pair is White's, but you get the half-open g-file pointing at his king, easy development, and the freeing …c5 break. A calm, sound game where you press.", sayShort: "Bxf6 — …Qxf6, then break …c5" },
  beats: [
    { atMove: 10, say: "Bxf6 — White swaps off the bishop to spoil your kingside pawns. No matter; recapturing with the queen keeps you active and opens the g-file toward his king.", sayShort: "Bxf6 — let him trade", highlights: [_H('f6', KEY)] },
    { atMove: 11, say: "…Qxf6 — the queen recaptures, eyeing the long diagonal and the half-open g-file. You have easy development and no weaknesses to nurse; now prepare the central break.", sayShort: "…Qxf6 — active queen, open g-file", highlights: [_H('f6', KEY)] },
    { atMove: 13, say: "…c5 — the freeing break, striking at d4. The centre opens, your pieces breathe, and any pull White had from the bishop pair dissolves into a balanced game you can fight for.", sayShort: "…c5 — strike d4, free up", arrows: [_A('c5', 'd4', ATK)], highlights: [_H('c5', KEY), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// WAVE2 WBENB6 :: 6 keys
const WBENB6: SublineNarration = {
  intro: { say: "b6 — White declines the Benko, pushing the pawn past rather than opening the files. That suits you fine: the b6-pawn is now a weakling deep in your camp, a target you'll round up, while you complete the Benko setup with …d6, …g6 and …Bg7. You keep the dark-squared pressure and the half-open files for free.", sayShort: "b6 — declined; round up the weak pawn" },
  beats: [
    { atMove: 8, say: "b6 declines the gambit, shoving the pawn past instead of grabbing on a6. Fine by you — that b6-pawn is overextended and cut off, a long-term target while you develop in comfort.", sayShort: "b6 — the pawn is a target", highlights: [_H('b6', KEY)] },
    { atMove: 9, say: "…d6 — solidify the centre and prepare the fianchetto. You're building the standard Benko shell, only now without giving up a pawn at all.", sayShort: "…d6 — solidify, prepare …g6", highlights: [_H('d6', KEY)] },
    { atMove: 11, say: "…Nbd7 — the knight develops eyeing b6 and e5, ready to round up the stray pawn or reroute to the kingside. Your pieces flow to natural squares while White nurses his weakling.", sayShort: "…Nbd7 — eye the b6-pawn", arrows: [_A('d7', 'b6', ATK)], highlights: [_H('b6', KEY)] },
    { atMove: 13, say: "…c4 — clamp the queenside, fixing White's structure and grabbing space. The position takes on a comfortable Benoni shape where your pressure on the half-open files and the weak b6-pawn gives the easier game.", sayShort: "…c4 — clamp the queenside", highlights: [_H('c4', KEY)] },
  ],
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
// WAVE2 WCATA6 :: 2 keys
const WCATA6: SublineNarration = {
  intro: { say: "…a6 — Black grabs the c4-pawn and prepares …b5 to hold it, the most testing Open Catalan try. Don't chase the pawn directly; your g2-bishop already rakes the long diagonal at b7, and you regain c4 at leisure with Qc2, Ne5 or a4 cracking the …b5 chain. Castle and keep the bind — Black's queenside stays awkward all game.", sayShort: "…a6 — castle, regain c4 at leisure" },
  beats: [
    { atMove: 9, say: "…a6 holds the extra c4-pawn and readies …b5 to cling to it. Let him; the pawn is a loan, and chasing it now only helps Black develop. Your long-diagonal bishop is the real asset.", sayShort: "…a6 — he clings to c4", highlights: [_H('c4', KEY)] },
    { atMove: 10, say: "O-O — finish development and bide your time. The c4-pawn comes back with Qc2 or a4 hitting …b5, and meanwhile the g2-bishop chokes the b7-square while Black's queenside scrambles to untangle.", sayShort: "O-O — bind, then regain c4", arrows: [_A('g2', 'b7', ATK)], highlights: [_H('c4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
// WAVE2 WGRUC5 :: 2 keys
const WGRUC5: SublineNarration = {
  intro: { say: "Nf3 — White develops in the Exchange Grünfeld, bracing the d4-centre before you can hit it. Strike anyway: …c5 hammers the base of the broad pawn front, and with your g7-bishop already raking d4 down the long diagonal, the centre is under fire from two directions. Demolishing that centre is the whole point of the Grünfeld.", sayShort: "Nf3 — answer …c5, hammer d4" },
  beats: [
    { atMove: 12, say: "Nf3 develops and props the d4-pawn, the keystone of White's centre. He's daring you to leave it alone — so don't. The lever is ready.", sayShort: "Nf3 — props the d4-keystone", highlights: [_H('d4', KEY)] },
    { atMove: 13, say: "…c5 — the hammer falls on d4. Joined by the g7-bishop bearing down the long diagonal, the pawn attacks the base of White's centre; if those pawns crack, his whole game collapses with them.", sayShort: "…c5 — hammer d4's base", arrows: [_A('c5', 'd4', ATK), _A('g7', 'd4', ATK)], highlights: [_H('c5', KEY), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// WAVE2 WNIME3 :: 5 keys
const WNIME3: SublineNarration = {
  intro: { say: "e3 — the Rubinstein, White's most flexible Nimzo. Your bishop already pins the c3-knight, the guardian of e4, so the bargain is yours to set: castle first, then either take on c3 to saddle White with doubled pawns and grind them, or hold the pin and strike with …c5 and …d5. Either road is a rich, equal fight on the light squares.", sayShort: "e3 Rubinstein — castle, then …c5/…d5" },
  beats: [
    { atMove: 6, say: "e3 — solid and non-committal, the Rubinstein. White keeps his options open, so you do too: nothing premature, just keep the pin biting on c3 and the central tension humming.", sayShort: "e3 — flexible; keep the pin", highlights: [_H('c3', KEY)] },
    { atMove: 7, say: "…O-O — tuck the king away and prepare to choose your plan. The pin on c3 still cramps White's e4-break; now …c5 and …d5 (or …Bxc3 wrecking his pawns) come on your terms.", sayShort: "…O-O — castle, then strike centre", highlights: [_H('c3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};

// WAVE WQIDNC3 :: 7 keys
const WQIDNC3: SublineNarration = {
  intro: { say: "Nc3 — White slides toward Nimzo territory, and you are happy to follow. Answer …Bb4, pinning the knight that guards e4, and you reach a comfortable, well-charted structure: fracture White's c-pawns with …Bxc3, or hold the pin and strike the centre. The Queen's Indian and the Nimzo are sisters — whichever way White turns, you are at home.", sayShort: "Nc3 — transpose: pin with …Bb4" },
  beats: [
    { atMove: 4, say: "Nc3 develops the knight to its Nimzo square, guarding e4. That invites the pin — and you take the invitation.", sayShort: "Nc3 — the Nimzo invitation", highlights: [_H('c3', KEY)] },
    { atMove: 5, say: "…Bb4 pins the c3-knight against the king, and because that knight is the guardian of e4 you are already fighting for the key central light square. Trade it off to wreck White's pawns, or keep the pin and squeeze.", sayShort: "…Bb4 — pin c3, fight for e4", arrows: [_A('b4', 'c3', ATK)], highlights: [_H('c3', KEY), _H('e4', KEY)] },
    { atMove: 6, say: "e3 — the Rubinstein, solid and non-committal. You keep the pin biting and develop in comfort, with no premature commitments to undo.", sayShort: "e3 — flexible; keep the pin", highlights: [_H('c3', KEY)] },
    { atMove: 7, say: "…O-O — tuck the king away and prepare your plan: …c5 and …d5 to hit the centre, or …Bxc3 to double White's pawns and grind. Either road is an easy, equal game.", sayShort: "…O-O — castle, then strike", highlights: [_H('c3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// WAVE WQIDA3 :: 6 keys
const WQIDA3: SublineNarration = {
  intro: { say: "a3 — the Petrosian, White spending a tempo to rule out …Bb4 before he plays Nc3. No matter: complete the …Bb7 and …d5 setup, and the eventual cxd5 lets you fight for the centre with the knight recapture and …c5. White's little a3 is a small loosening you will target on the queenside later.", sayShort: "a3 Petrosian — develop …Bb7, break …d5" },
  beats: [
    { atMove: 6, say: "a3 pre-empts your …Bb4 pin, but it costs White a tempo and does nothing for his development. Carry on with your own plan.", sayShort: "a3 — a slow, useful-to-you move", highlights: [_H('b4', KEY)] },
    { atMove: 7, say: "…Bb7 takes the long diagonal, mirroring White's structure and fighting for e4 and the light squares. The Queen's Indian's calm, control-based heart.", sayShort: "…Bb7 — fight the long diagonal", arrows: [_A('b7', 'e4', ATK)], highlights: [_H('e4', KEY)] },
    { atMove: 8, say: "Nc3 — White finally develops the knight. Now …d5 challenges the centre, and after cxd5 you recapture and meet the game on equal terms, with the a3-weakness to nag later.", sayShort: "Nc3 — answer with …d5", highlights: [_H('d5', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// WAVE WKIDMAIN :: 1 keys
const WKIDMAIN: SublineNarration = {
  intro: { say: "Nc3 — White heads into the main King's Indian, building the broad d4-e4 centre. Nothing fancy is needed: complete the fianchetto, play …d6 and castle, then strike with the thematic …e5. Once the centre locks, the King's Indian race is on — your kingside pawn storm against White's queenside expansion.", sayShort: "Nc3 — main KID: …d6, …O-O, …e5" },
  beats: [
    { atMove: 4, say: "Nc3 develops toward the big centre — the main-line King's Indian. You welcome it: the bigger White builds, the more you will have to strike at.", sayShort: "Nc3 — the main line", highlights: [_H('c3', KEY)] },
    { atMove: 5, say: "…Bg7 completes the fianchetto, the bishop glaring down the long diagonal toward d4 and the centre White is erecting. Everything you do orbits this bishop.", sayShort: "…Bg7 — the long-diagonal bishop", arrows: [_A('g7', 'd4', ATK)], highlights: [_H('d4', KEY)] },
    { atMove: 6, say: "e4 — White claims the broad centre. Don't be impressed; the King's Indian invites exactly this so you can blow it open with …e5 once you are castled.", sayShort: "e4 — the centre you'll strike", highlights: [_H('e4', KEY)] },
    { atMove: 7, say: "…d6 props the e5-break to come and opens the bishop's path. Next you castle, then …e5 lights the fuse: the centre locks and the kingside storm begins.", sayShort: "…d6 — prepare the …e5 break", highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// WAVE WBUDRUB :: 1 keys
const WBUDRUB: SublineNarration = {
  intro: { say: "Nf3 — the main-line Budapest, White holding the extra e5-pawn and developing. You set about winning it straight back: …Bc5 trains the bishop on f2 beside White's king, and …Nc6 with …Ngxe5 reclaims the pawn. Your pieces leap out faster than White can untangle — a lively, fully equal game.", sayShort: "Nf3 — …Bc5 and …Nc6 regain e5" },
  beats: [
    { atMove: 6, say: "Nf3 develops and bolsters the e5-pawn White is clinging to. Fine — you'll win it back with interest while your pieces spring to active squares.", sayShort: "Nf3 — props the e5-pawn", highlights: [_H('e5', KEY)] },
    { atMove: 7, say: "…Bc5 — straight to the bishop's dream diagonal, drilling toward f2, the tender square beside White's uncastled king. Even as you chase the pawn, the bishop already eyes the weak point.", sayShort: "…Bc5 — aim the bishop at f2", arrows: [_A('c5', 'f2', ATK)], highlights: [_H('f2', KEY)] },
    { atMove: 9, say: "…Nc6 develops with a direct hit on the e5-pawn. With …Ngxe5 coming you regain the material and reach a lively, equal middlegame where your activity answers White's small space.", sayShort: "…Nc6 — hit e5, regain the pawn", arrows: [_A('c6', 'e5', ATK)], highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// WAVE WBUDADL :: 1 keys
const WBUDADL: SublineNarration = {
  intro: { say: "Be3 — in the Adler, White props his big e4-f4 centre and develops. You have already regrouped the knight to e5 and back; now …Bb4+ develops with check, dragging a piece in front of the king and gaining a tempo while you target the over-extended pawns on d4, e4 and f4.", sayShort: "Be3 — …Bb4+ develops with check" },
  beats: [
    { atMove: 10, say: "Be3 braces White's broad pawn front. It looks imposing, but those pawns on e4 and f4 are over-extended — your pieces, not your pawns, will pull them apart.", sayShort: "Be3 — the centre is over-extended", highlights: [_H('e4', KEY), _H('f4', KEY)] },
    { atMove: 11, say: "…Bb4+ — develop with check, forcing White to block and spending his tempo for him. You gain time to pile onto the loose centre while his king lingers in the middle.", sayShort: "…Bb4+ — develop, gain a tempo", arrows: [_A('b4', 'e1', ATK)], highlights: [_H('e1', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Budapest_Gambit'],
};
// WAVE WDUTLEN :: 1 keys
const WDUTLEN: SublineNarration = {
  intro: { say: "c4 — White grabs central space against your Leningrad Dutch. Stay on plan: complete the King's-Indian-style fianchetto, castle, and prepare the thematic …d6 and …e5 break. Your g7-bishop and the …f5-pawn both point at White's centre and kingside — once you strike with …e5 the position opens in your favour.", sayShort: "c4 — fianchetto, then …d6 and …e5" },
  beats: [
    { atMove: 6, say: "c4 stakes out space, the broadest anti-Leningrad setup. Don't react nervously; your plan is fixed and your pieces are coming to their best squares.", sayShort: "c4 — White grabs space", highlights: [_H('c4', KEY)] },
    { atMove: 7, say: "…Bg7 completes the fianchetto, the bishop raking the long diagonal toward d4. Combined with the …f5-pawn it trains real fire on White's centre and kingside.", sayShort: "…Bg7 — rake the long diagonal", arrows: [_A('g7', 'd4', ATK)], highlights: [_H('d4', KEY)] },
    { atMove: 8, say: "Nc3 — White develops. You castle and prepare …d6 and the …e5 break that is the Leningrad's whole point; when it lands, the long diagonal opens and your attack flows.", sayShort: "Nc3 — castle, prepare …e5", highlights: [_H('e5', KEY)] },
  ],
  sources: ['book:dutch-defence', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
// WAVE WQGDCAR :: 7 keys
const WQGDCAR: SublineNarration = {
  intro: { say: "cxd5 — White clarifies into the Carlsbad, the Exchange QGD. Expect the minority attack, b4-b5 against your c6-pawn — so don't sit and suffer it. Develop solidly behind …c6 and …Be7, then answer queenside play with central energy: …Ne4 and …f5, turning the game toward White's king while he chips at your pawns.", sayShort: "cxd5 — Carlsbad; counter with …f5" },
  beats: [
    { atMove: 6, say: "cxd5 trades into the Carlsbad pawn skeleton, signalling the minority attack to come. You meet a plan on the queenside with a plan on the kingside.", sayShort: "cxd5 — into the Carlsbad", highlights: [_H('d5', KEY)] },
    { atMove: 8, say: "Bg5 pins your f6-knight against the queen, the standard developing jab. Prepare …Be7 to break it, and complete your solid Carlsbad setup with no weaknesses.", sayShort: "Bg5 — pins f6; meet with …Be7", arrows: [_A('g5', 'd8', ATK)], highlights: [_H('f6', KEY)] },
    { atMove: 9, say: "…c6 locks the Carlsbad structure. That pawn is White's minority-attack target — so plan your counter now: …Ne4 and …f5 throw the game toward his king before b4-b5 can bite.", sayShort: "…c6 — plan the …f5 counter", highlights: [_H('c6', KEY)] },
    { atMove: 11, say: "…Be7 breaks the pin and readies castling. You have a rock-solid Carlsbad with the kingside counterplay queued up; meet White's queenside push by attacking where you are strongest.", sayShort: "…Be7 — unpin, then attack kingside", highlights: [_H('f6', KEY)] },
  ],
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};

// WAVE WKIDG3 :: 8 keys
const WKIDG3: SublineNarration = {
  intro: { say: "g3 — the Fianchetto King's Indian, White's most solid antidote: the g2-bishop blunts your long-diagonal pressure before it starts. Adapt without fuss — complete your own fianchetto, castle, and play for the …d6 and …e5 break. The kingside storm is harder here, so be patient: win the centre with …e5 and manoeuvre for the long game.", sayShort: "g3 — fianchetto, patient …e5" },
  beats: [
    { atMove: 4, say: "g3 prepares Bg2, contesting the very diagonal your bishop wants. The solid anti-KID; don't force matters, just build your own setup.", sayShort: "g3 — White's solid fianchetto", highlights: [_H('g2', KEY)] },
    { atMove: 5, say: "…Bg7 completes your fianchetto. For now your own knight on f6 screens the bishop, but the instant …e5 frees the diagonal it rakes straight at d4 and the centre.", sayShort: "…Bg7 — fianchetto, aim at d4", highlights: [_H('g7', KEY), _H('d4', KEY)] },
    { atMove: 7, say: "…O-O — castle and prepare the thematic …d6 and …e5 break. With the kingside storm blunted by g3, you play for the central break and a rich, balanced manoeuvring game.", sayShort: "…O-O — prepare …d6 and …e5", highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// WAVE WKIDNF3 :: 7 keys
const WKIDNF3: SublineNarration = {
  intro: { say: "Nf3 — White develops flexibly toward the main lines, keeping the centre options open. Your reply never changes in spirit: finish the fianchetto, castle, and break the centre with …e5. Once the pawns lock, the King's Indian race writes itself — your kingside avalanche against White's queenside expansion.", sayShort: "Nf3 — fianchetto, then …e5" },
  beats: [
    { atMove: 4, say: "Nf3 develops naturally and waits to see your setup. No need to react — your plan is fixed.", sayShort: "Nf3 — flexible development", highlights: [_H('f3', KEY)] },
    { atMove: 5, say: "…Bg7 takes its post on the long diagonal, screened by the f6-knight for now but aimed at the heart of the board once …e5 opens it.", sayShort: "…Bg7 — the fianchetto bishop", highlights: [_H('g7', KEY), _H('d4', KEY)] },
    { atMove: 6, say: "Nc3 — White completes the standard centre. You castle next and prepare …e5; the King's Indian battle lines are drawn.", sayShort: "Nc3 — standard centre forms", highlights: [_H('c3', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// WAVE WKIDF3 :: 6 keys
const WKIDF3: SublineNarration = {
  intro: { say: "f3 — the Sämisch, White propping the e4-pawn to brace a broad centre and a coming clamp. Two great answers await once you castle: the classical …e5 strike or the sharp …c5 gambit. The f3-pawn commits White's kingside, so your …f5 storm later gains extra force. Castle first, then choose your break.", sayShort: "f3 Sämisch — castle, then …e5/…c5" },
  beats: [
    { atMove: 8, say: "f3 braces e4 and signals the Sämisch — a slow, space-grabbing clamp. But that pawn blocks White's own knight and commits his kingside, weaknesses you'll target later.", sayShort: "f3 — the Sämisch clamp", highlights: [_H('f3', KEY), _H('e4', KEY)] },
    { atMove: 9, say: "…O-O — tuck the king away before the fight. Now the thematic breaks are yours to pick: …e5 to hit the centre, or the …c5 gambit; either way you have counterplay against the broad front.", sayShort: "…O-O — castle, ready …e5 or …c5", highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// WAVE WKIDH3 :: 6 keys
const WKIDH3: SublineNarration = {
  intro: { say: "h3 — the Makagonov, a quiet prophylactic move that takes g4 away from your pieces and prepares Be3 without allowing …Ng4. Don't be lulled: castle and play the standard …e5 break. White's setup is solid but slow, so use the time to get your King's Indian plan rolling.", sayShort: "h3 — castle, break …e5 anyway" },
  beats: [
    { atMove: 8, say: "h3 is prophylaxis — denying g4 to your knight and bishop and preparing a smooth Be3. Solid, but it does nothing to stop your central break.", sayShort: "h3 — quiet prophylaxis", highlights: [_H('h3', KEY)] },
    { atMove: 9, say: "…O-O — castle and head for …e5. White's careful setup gives you time to reach the King's Indian's thematic central strike and the kingside play that follows.", sayShort: "…O-O — prepare the …e5 break", highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence'],
};
// WAVE WQIDG3 :: 7 keys
const WQIDG3: SublineNarration = {
  intro: { say: "g3 — White fianchettoes early, steering toward Catalan-flavoured waters. Meet it classically: …d5 stakes a claim in the centre, …Be7 and …O-O follow, and you reach a sound, comfortable structure. The g2-bishop is strong but slow; with no weaknesses you equalise by simply completing development.", sayShort: "g3 — answer …d5, develop solidly" },
  beats: [
    { atMove: 4, say: "g3 prepares Bg2 on the long diagonal, the Catalan idea. Don't drift into a cramped game — stake your own claim in the centre at once.", sayShort: "g3 — the Catalan setup", highlights: [_H('g2', KEY)] },
    { atMove: 5, say: "…d5 — claim the centre before the g2-bishop can bear down on an empty d5. You reach a solid, classical structure with no weaknesses.", sayShort: "…d5 — claim the centre", highlights: [_H('d5', KEY)] },
    { atMove: 7, say: "…Be7 — calm, flexible development toward castling. You have an easy game; the …c5 break frees you fully whenever you choose.", sayShort: "…Be7 — develop, ready …c5", highlights: [_H('e7', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// WAVE WQIDNC36 :: 5 keys
const WQIDNC36: SublineNarration = {
  intro: { say: "Nc3 — White develops the knight toward e4 rather than fianchetto. Answer …Bb7, training your bishop on the long diagonal to fight for the central light squares. The Queen's Indian is a control battle; contest e4, complete development, and the …d5 break keeps you comfortably equal.", sayShort: "Nc3 — …Bb7, fight for e4" },
  beats: [
    { atMove: 6, say: "Nc3 heads for e4, the square the whole opening is fought over. You answer by contesting that very diagonal.", sayShort: "Nc3 — eyes e4", highlights: [_H('c3', KEY), _H('e4', KEY)] },
    { atMove: 7, say: "…Bb7 takes the long diagonal, the bishop's gaze running clear to e4. With your pieces fighting for the light squares, you reach the Queen's Indian's solid, control-based equality.", sayShort: "…Bb7 — rake e4 down the diagonal", arrows: [_A('b7', 'e4', ATK)], highlights: [_H('e4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// WAVE WQIDE3 :: 6 keys
const WQIDE3: SublineNarration = {
  intro: { say: "e3 — White develops modestly with Bd3 to come, a quiet anti-Queen's-Indian. No pressure to react to: …Bb7 takes the diagonal, complete development, and break with …d5 or …c5 at leisure. White's restrained setup hands you an easy, comfortable game with the bishop pair fight squarely even.", sayShort: "e3 — …Bb7, then break …d5/…c5" },
  beats: [
    { atMove: 6, say: "e3 is solid but unambitious, freeing Bd3. There's nothing to fear, so develop in good order and prepare your central breaks.", sayShort: "e3 — quiet, unambitious", highlights: [_H('e3', KEY)] },
    { atMove: 7, say: "…Bb7 takes the long diagonal, eyeing e4 and the light squares. You have comfortable development and the …d5 or …c5 break in hand.", sayShort: "…Bb7 — the long-diagonal bishop", arrows: [_A('b7', 'e4', ATK)], highlights: [_H('e4', KEY)] },
    { atMove: 8, say: "Bd3 — White's bishop eyes your kingside, but you are fully coordinated. Castle and strike the centre with …d5 or …c5 for full equality.", sayShort: "Bd3 — develop, then strike centre", highlights: [_H('d3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defense'],
};
// WAVE WGRUNF3 :: 5 keys
const WGRUNF3: SublineNarration = {
  intro: { say: "Nf3 — White develops toward the modern main lines, keeping the centre flexible. Stay true to the Grünfeld creed: …Bg7 on the long diagonal, then …c5 and piece pressure to attack whatever centre White builds. You let him overextend so you can hit back — comfortable, dynamic equality.", sayShort: "Nf3 — …Bg7, then strike the centre" },
  beats: [
    { atMove: 6, say: "Nf3 develops flexibly, declining the immediate big centre. Your plan is unchanged — fianchetto and prepare to undermine.", sayShort: "Nf3 — flexible development", highlights: [_H('f3', KEY)] },
    { atMove: 7, say: "…Bg7 takes the long diagonal, the Grünfeld's signature. The bishop and a coming …c5 will hammer whatever centre White erects; the bigger he builds, the more there is to attack.", sayShort: "…Bg7 — the demolition bishop", highlights: [_H('g7', KEY), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};
// WAVE WGRUG3 :: 7 keys
const WGRUG3: SublineNarration = {
  intro: { say: "g3 — the quiet Fianchetto Grünfeld, White declining the big centre for a calm long-diagonal game. Equalise cleanly: castle, hit the centre with …d5, and if White grabs on c4 you regain it comfortably. A balanced, healthy game where your fianchetto and central breaks keep everything in harmony.", sayShort: "g3 — castle, then break …d5" },
  beats: [
    { atMove: 4, say: "g3 prepares Bg2 and sidesteps the big-centre main lines. With no broad front to demolish, you simply equalise by claiming your share of the centre.", sayShort: "g3 — the quiet fianchetto", highlights: [_H('g2', KEY)] },
    { atMove: 5, say: "…Bg7 mirrors White on the long diagonal, fighting for d4 and the centre. Solid and harmonious — no weaknesses for White to target.", sayShort: "…Bg7 — mirror the diagonal", highlights: [_H('g7', KEY), _H('d4', KEY)] },
    { atMove: 7, say: "…O-O — castle and prepare …d5; if White takes on c4 you regain it cleanly. A balanced, healthy game where your central break keeps you fully equal.", sayShort: "…O-O — then break …d5", highlights: [_H('d5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Gr%C3%BCnfeld_Defence'],
};

// WAVE WRETIDXC :: 1 keys
const WRETIDXC: SublineNarration = {
  intro: { say: "…dxc4 — Black grabs the c4-pawn in this Catalan-flavoured Réti, but treat it as a loan, not a loss. Your g2-bishop already rakes the long diagonal at b7, and you reclaim the pawn at leisure with Qa4 and Qxc4. The lasting prize is the bind: while Black scrambles to free his queenside with …b5 and …Bb7, you squeeze the light squares.", sayShort: "…dxc4 — a loan; regain it, then bind" },
  beats: [
    { atMove: 11, say: "…dxc4 grabs the pawn, but you gave nothing real away — the g2-bishop's long-diagonal pressure is worth more than a tempo spent recapturing. Don't chase it crudely; collect it with the queen.", sayShort: "…dxc4 — the pawn is a loan", highlights: [_H('c4', KEY)] },
    { atMove: 12, say: "Qa4 — the queen swings out to recover the pawn, following the rank straight to c4 while also eyeing the a-file. Methodical, no concession; the c4-pawn comes home next move.", sayShort: "Qa4 — regain the c4-pawn", arrows: [_A('a4', 'c4', ATK)], highlights: [_H('c4', KEY)] },
    { atMove: 14, say: "Qxc4 — pawn back, and now the bind tells. The g2-bishop chokes b7 and the long light diagonal while Black must spend moves on …b5 and …Bb7 just to breathe. You have the freer, more pleasant game.", sayShort: "Qxc4 — pawn back, the bind tells", highlights: [_H('c4', KEY)] },
    { atMove: 18, say: "Bg5 — pressuring the f6-knight and preparing to trade it, loosening Black's hold on e4 and the centre. You keep nagging on the light squares; Black is solid but you press the easier side all game.", sayShort: "Bg5 — press f6, keep nagging", highlights: [_H('f6', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// WAVE WKIAE5 :: 1 keys
const WKIAE5: SublineNarration = {
  intro: { say: "…e5 — Black stakes out a big centre against your King's Indian Attack, and that is exactly the soil the KIA grows in. Regroup behind your wall with d3, reroute the knight via a3 to c4, clamp with e4, and then turn to the kingside with the f4 lever. Black's proud centre simply becomes the thing you attack around.", sayShort: "…e5 — regroup, reroute, then f4" },
  beats: [
    { atMove: 7, say: "…e5 builds the broad centre — c5, d5 and e5 all staked out. Don't contest it head-on; the KIA lets Black overextend so you can lean on the centre from the wings.", sayShort: "…e5 — Black's big centre", highlights: [_H('e5', KEY)] },
    { atMove: 8, say: "d3 — the modest KIA centre. You hold back, complete development behind the pawns, and prepare the knight reroute that defines the system.", sayShort: "d3 — restrain, then reroute", highlights: [_H('d3', KEY)] },
    { atMove: 10, say: "Na3 — heading for c4, the knight's dream square in the KIA, where it eyes e5 and d6 and pressures the dark squares. Follow the arrow: a3 to c4 is the reroute that gets the attack rolling.", sayShort: "Na3 — reroute the knight to c4", arrows: [_A('a3', 'c4', ATK)], highlights: [_H('c4', KEY)] },
    { atMove: 12, say: "e4 — now you clamp, challenging d5 and grabbing your share of the centre. With the structure set, the plan turns to the kingside, exactly where the King's Indian Attack wants to strike.", sayShort: "e4 — clamp, then go kingside", highlights: [_H('e4', KEY)] },
    { atMove: 20, say: "f4 — the signature lever, striking at e5 to crack open lines toward Black's king. The whole KIA build-up pays off here: pawns and pieces storming the kingside while Black is busy on the other wing.", sayShort: "f4 — the kingside storm begins", arrows: [_A('f4', 'e5', ATK)], highlights: [_H('f4', KEY), _H('e5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// WAVE WENGREVD :: 1 keys
const WENGREVD: SublineNarration = {
  intro: { say: "…d5 — Black stakes a Reversed-Dragon centre, and you are playing a Sicilian Dragon with the colours reversed and a full tempo to the good. Take on d5, fianchetto with Bg2 to contest the long diagonal, and use that spare move to do what White can only dream of in the real Dragon: expand on the queenside with b4 and seize the initiative first.", sayShort: "…d5 — a Dragon up a tempo" },
  beats: [
    { atMove: 7, say: "…d5 strikes in the centre, the Reversed Dragon. You don't fear it — you're a tempo up on a Sicilian, so you get to the plans first.", sayShort: "…d5 — the Reversed Dragon", highlights: [_H('d5', KEY)] },
    { atMove: 8, say: "cxd5 — open the position and welcome the recapture; Black's knight comes to d5 where you'll gain time hitting it. The extra tempo means you reach your setup a move ahead.", sayShort: "cxd5 — open it, gain time", highlights: [_H('d5', KEY)] },
    { atMove: 10, say: "Bg2 — the fianchetto, the bishop training on the long light diagonal toward b7 and the centre. This is the Dragon bishop, only it's yours and a move early.", sayShort: "Bg2 — the Dragon bishop, early", highlights: [_H('g2', KEY)] },
    { atMove: 16, say: "b4 — the point of the extra tempo: you expand on the queenside first, gaining space and a target before Black can organise. The Reversed Dragon hands you the initiative the real Dragon's White player can only envy.", sayShort: "b4 — expand first, seize space", highlights: [_H('b4', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/English_Opening'],
};
// WAVE WOLDE4 :: 1 keys
const WOLDE4: SublineNarration = {
  intro: { say: "e4 — White builds the full centre against your …d6/…e5 Old Indian. Cramped but bombproof: fianchetto with …g6 and …Bg7 for a King's-Indian flavour, castle, and free the position with the …Ng4 and …Bf6 regroup to trade the dark-squared bishops. Once the tension eases you strike with …exd4 or …c6 and …d5.", sayShort: "e4 — fianchetto, regroup, then break" },
  beats: [
    { atMove: 8, say: "e4 completes White's broad centre, and your position is cramped — but solid as a rock. Don't panic for space; manoeuvre patiently and pick your freeing break.", sayShort: "e4 — cramped but bombproof", highlights: [_H('e4', KEY)] },
    { atMove: 9, say: "…g6 — a King's-Indian flavour, preparing to fianchetto. The bishop heads to g7 where it pressures the long diagonal and the d4-centre once lines open.", sayShort: "…g6 — fianchetto for pressure", highlights: [_H('g6', KEY)] },
    { atMove: 11, say: "…Bg7 takes the long diagonal, screened by the f6-knight for now but aimed at d4. With the bishop home you castle and turn to freeing the cramped position.", sayShort: "…Bg7 — aim at the d4-centre", highlights: [_H('g7', KEY), _H('d4', KEY)] },
    { atMove: 15, say: "…Ng4 — the freeing regroup. The knight jumps out to provoke and prepare …Bf6, trading White's dark-squared bishop to ease your cramp; after the swaps your pieces breathe and …exd4 or …c6-d5 comes next.", sayShort: "…Ng4 — regroup, trade, free up", arrows: [_A('g4', 'e3', ATK)], highlights: [_H('e3', KEY)] },
  ],
  sources: ['book:old-indian-defence', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// WAVE WLONRE8 :: 1 keys
const WLONRE8: SublineNarration = {
  intro: { say: "…Re8 — Black readies the …e5 break against your London KID-setup. Keep your shape: tuck the bishop back to h2 so it survives on the b8-h2 diagonal, meet …e5 by trading, and your Bh2-and-Bd3 battery keeps aiming at the king. The London reaches the same comfortable structure every game — now you play for the kingside.", sayShort: "…Re8 — Bh2, meet …e5, eye the king" },
  beats: [
    { atMove: 17, say: "…Re8 backs up the coming …e5 break, Black's main freeing try in this structure. You don't prevent it; you prepare to meet it and keep your pieces pointed at the king.", sayShort: "…Re8 — Black readies …e5", highlights: [_H('e5', KEY)] },
    { atMove: 18, say: "Bh2 — slip the bishop back so it lives on the b8-h2 diagonal whatever Black does. This is the London's whole idea: the dark-squared bishop never gets traded off cheaply and keeps glaring at h7.", sayShort: "Bh2 — save the diagonal bishop", arrows: [_A('h2', 'b8', ATK)], highlights: [_H('h2', KEY)] },
    { atMove: 19, say: "…e5 — Black strikes for freedom. Welcome it: opening the centre suits your better-placed pieces, and the Bh2 bishop's diagonal springs to life as the pawns clear.", sayShort: "…e5 — let the centre open", highlights: [_H('e5', KEY)] },
    { atMove: 21, say: "dxe5 — trade and the position opens with your battery primed: Bh2 and Be2/Bd3 aimed at the kingside, Ne5 and a queen lift to come. The London delivers its reliable, comfortable middlegame pull.", sayShort: "dxe5 — open, battery primed", highlights: [_H('e5', KEY), _H('h2', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/London_System'],
};

export const SUBLINE_NARRATION_D4FLANK: Record<string, SublineNarration> = {
  'grunfeld-defence::0::g3@4': WGRUG3,
  'grunfeld-defence::1::g3@4': WGRUG3,
  'grunfeld-defence::6::g3@4': WGRUG3,
  'queens-indian::0::Nc3@4': WQIDNC3,
  'queens-indian::1::Nc3@4': WQIDNC3,
  'queens-indian::2::Nc3@4': WQIDNC3,
  'queens-indian::3::Nc3@4': WQIDNC3,
  'queens-indian::4::Nc3@4': WQIDNC3,
  'queens-indian::5::Nc3@4': WQIDNC3,
  'queens-indian::6::Nc3@4': WQIDNC3,
  'kings-indian-defence::4::Nc3@4': WKIDMAIN,
  'nimzo-indian::3::Bxf6@8': WNIMBXF,
  'slav-defence::3::Nc3@6': WSLNC3,
  'slav-defence::7::Nc3@6': WSLNC3,
  // ── queens-gambit ──
  'queens-gambit::0::h6@19': C0,
  'queens-gambit::0::c6@5': C0,
  'queens-gambit::0::Be7@5': C0,
  'queens-gambit::0::c6@9': WQGCAR,
  'queens-gambit::0::Ne4@19': C0,
  'queens-gambit::0::c5@5': C1,
  'queens-gambit::0::Nf8@17': C2,
  'queens-gambit::0::Bg4@21': C0,
  'queens-gambit::0::Ne4@21': C0,
  'queens-gambit::0::Bb4@5': C3,
  'queens-gambit::1::c6@5': C0,
  'queens-gambit::1::Be7@5': C0,
  'queens-gambit::1::c5@5': C1,
  'queens-gambit::1::h6@11': C0,
  'queens-gambit::1::Bb4@5': C3,
  'queens-gambit::1::a6@5': C2,
  'queens-gambit::1::Nbd7@7': C0,
  'queens-gambit::1::h6@9': C0,
  'queens-gambit::1::Nxe7@19': C4,
  'queens-gambit::1::c6@7': C0,
  'queens-gambit::2::Nxe7@17': C2,
  'queens-gambit::2::c6@5': C0,
  'queens-gambit::2::Be7@5': C0,
  'queens-gambit::2::c5@5': C1,
  'queens-gambit::2::Bb4@5': C3,
  'queens-gambit::2::Nbd7@11': C0,
  'queens-gambit::2::a6@5': C2,
  'queens-gambit::2::Ne4@13': C0,
  'queens-gambit::2::Nbd7@7': C0,
  'queens-gambit::2::h6@9': C0,
  'queens-gambit::3::a6@5': C4,
  'queens-gambit::3::Bg4@7': C4,
  'queens-gambit::3::Nc6@11': TQGQGA,
  'queens-gambit::3::c5@5': C5,
  'queens-gambit::3::a6@7': C4,
  'queens-gambit::3::e6@5': C5,
  'queens-gambit::3::c4@15': C5,
  'queens-gambit::3::c6@5': C1,
  'queens-gambit::3::b5@7': C1,
  'queens-gambit::4::a6@7': C0,
  'queens-gambit::4::Nbd7@11': C4,
  'queens-gambit::4::e6@5': C0,
  'queens-gambit::4::Nbd7@15': C3,
  'queens-gambit::4::e6@9': C4,
  'queens-gambit::4::Bg4@9': C4,
  'queens-gambit::4::Bg6@17': C3,
  'queens-gambit::4::Na6@9': C4,
  'queens-gambit::4::Nbd7@13': C4,
  'queens-gambit::5::dxc4@7': C4,
  'queens-gambit::5::a6@7': C0,
  'queens-gambit::5::Bd6@13': C4,
  'queens-gambit::5::Nb6@13': C4,
  'queens-gambit::5::Be7@13': C4,
  'queens-gambit::5::e6@5': C0,
  'queens-gambit::5::a6@15': C4,
  'queens-gambit::5::Be7@19': C4,
  'queens-gambit::5::a6@9': C3,
  'queens-gambit::5::Bd6@11': C0,
  'queens-gambit::6::c6@9': C1,
  'queens-gambit::6::dxc4@9': C1,
  'queens-gambit::6::b6@9': C1,
  'queens-gambit::6::Nbd7@9': C1,
  'queens-gambit::6::Bb4+@7': C1,
  'queens-gambit::6::dxc4@7': C1,
  'queens-gambit::6::c6@5': C0,
  'queens-gambit::6::c5@5': C1,
  'queens-gambit::6::c6@11': C1,
  'queens-gambit::6::Nbd7@11': C1,
  'queens-gambit::7::Bxg3@9': C6,
  'queens-gambit::7::c6@5': C0,
  'queens-gambit::7::c6@9': C6,
  'queens-gambit::7::Be7@5': C0,
  'queens-gambit::7::c5@9': C6,
  'queens-gambit::7::c6@11': C6,
  'queens-gambit::7::b6@11': C6,
  'queens-gambit::7::c5@5': C1,
  'queens-gambit::7::Nc6@9': C6,
  'queens-gambit::7::dxc4@9': C6,
  // ── qgd ──
  'qgd::0::cxd5@6': WQGDCAR,
  'qgd::0::Nf3@6': C8,
  'qgd::0::Qc2@12': C8,
  'qgd::0::Nf3@8': C8,
  'qgd::0::cxd5@12': C9,
  'qgd::0::cxd5@8': C7,
  'qgd::0::Bd3@12': C8,
  'qgd::0::Rc1@10': C8,
  'qgd::0::Ne4@20': C8,
  'qgd::0::Qc2@14': C8,
  'qgd::1::cxd5@6': WQGDCAR,
  'qgd::1::Nf3@6': C8,
  'qgd::1::Be2@14': C8,
  'qgd::1::Bd3@14': C8,
  'qgd::1::Rc1@14': C8,
  'qgd::1::Nf3@8': C8,
  'qgd::1::Bxf6@12': C8,
  'qgd::1::cxd5@8': C7,
  'qgd::1::Qb3@14': C8,
  'qgd::1::Qc2@14': C8,
  'qgd::2::cxd5@6': WQGDCAR,
  'qgd::2::Nf3@6': C8,
  'qgd::2::Rc1@16': C8,
  'qgd::2::Nf3@8': C8,
  'qgd::2::Bxf6@12': C8,
  'qgd::2::cxd5@8': C7,
  'qgd::2::Qc2@16': C8,
  'qgd::2::Rc1@10': C8,
  'qgd::2::cxd5@10': C7,
  'qgd::2::Qc2@10': C8,
  'qgd::3::Nf3@8': C7,
  'qgd::3::Bf4@8': C7,
  'qgd::3::e3@8': C10,
  'qgd::3::g3@8': C10,
  'qgd::3::Ne5@20': C9,
  'qgd::3::O-O@16': C9,
  'qgd::3::h3@20': C9,
  'qgd::3::Bg5@6': C8,
  'qgd::3::Nf3@6': C8,
  'qgd::3::O-O-O@18': C9,
  'qgd::4::cxd5@6': WQGDCAR,
  'qgd::4::Bg5@6': C8,
  'qgd::4::cxd5@8': C11,
  'qgd::4::Qa4+@8': C11,
  'qgd::4::e3@8': C11,
  'qgd::4::Qb3@8': C11,
  'qgd::4::e5@12': C11,
  'qgd::4::Bxf6@16': C11,
  'qgd::4::Bxf6@14': C11,
  'qgd::4::Qxd4@14': C11,
  'qgd::5::Bb3@12': C8,
  'qgd::5::Be2@12': C8,
  'qgd::5::cxd5@6': WQGDCAR,
  'qgd::5::a3@14': C8,
  'qgd::5::a3@16': C8,
  'qgd::5::Bg5@6': C8,
  'qgd::5::Re1@16': C8,
  'qgd::5::e4@14': C8,
  'qgd::5::Qc2@14': C8,
  'qgd::5::Qe2@16': C8,
  'qgd::6::cxd5@6': WQGDCAR,
  'qgd::6::Nf3@6': C8,
  'qgd::6::cxd5@10': C9,
  'qgd::6::cxd5@12': C9,
  'qgd::6::e3@8': C8,
  'qgd::6::Be2@16': TQGD,
  'qgd::6::cxd5@8': C9,
  'qgd::6::Bxf6@12': C8,
  'qgd::6::Rc1@14': C11,
  'qgd::6::a3@16': C11,
  'qgd::7::Bd3@10': C8,
  'qgd::7::cxd5@6': WQGDCAR,
  'qgd::7::c5@10': C10,
  'qgd::7::h3@10': C8,
  'qgd::7::cxd5@10': C7,
  'qgd::7::Bg5@6': C8,
  'qgd::7::Nf3@6': C8,
  'qgd::7::a3@12': C8,
  'qgd::7::Be2@12': C8,
  'qgd::7::Qc2@12': C8,
  // ── qga ──
  'qga::0::Nc3@8': C12,
  'qga::0::dxc5@12': C12,
  'qga::0::Bb3@12': C12,
  'qga::0::Nc3@6': C13,
  'qga::0::a4@12': C12,
  'qga::0::b3@12': C12,
  'qga::0::Qa4+@6': C12,
  'qga::0::Bd3@12': C12,
  'qga::0::Qe2@10': C12,
  'qga::0::e4@20': C13,
  'qga::1::Bb3@12': C12,
  'qga::1::a4@12': C12,
  'qga::1::Qe2@12': C12,
  'qga::1::b3@12': C12,
  'qga::1::Bd3@12': C12,
  'qga::1::a4@10': C12,
  'qga::1::Nc3@12': C12,
  'qga::1::Qe2@10': C12,
  'qga::1::a4@6': C14,
  'qga::1::e4@12': C13,
  'qga::2::O-O@12': C14,
  'qga::2::g4@12': C14,
  'qga::2::Nbd2@12': C14,
  'qga::2::Be2@12': C14,
  'qga::2::Nc3@6': C13,
  'qga::2::Qb3@12': C14,
  'qga::2::O-O@14': C14,
  'qga::2::Qa4+@6': C12,
  'qga::2::a3@12': C14,
  'qga::2::Qa4+@12': C14,
  'qga::3::a4@10': C13,
  'qga::3::e3@6': EQGA,
  'qga::3::a3@10': C13,
  'qga::3::Bg5@10': C13,
  'qga::3::Be2@10': C13,
  'qga::3::Nxd5@12': C13,
  'qga::3::b3@10': C13,
  'qga::3::Be2@12': C13,
  'qga::3::Ne4@12': C13,
  'qga::3::Bf4@10': C13,
  'qga::4::Nc3@8': C12,
  'qga::4::dxc5@12': C12,
  'qga::4::Nc3@6': C13,
  'qga::4::a4@12': C12,
  'qga::4::Qe2@12': C12,
  'qga::4::b3@12': C12,
  'qga::4::Qa4+@6': C12,
  'qga::4::Bd3@12': C12,
  'qga::4::Qe2@10': C12,
  'qga::4::Bc2@22': C12,
  'qga::5::Nc3@8': C12,
  'qga::5::Bb3@12': C12,
  'qga::5::Nc3@6': C13,
  'qga::5::a4@12': C12,
  'qga::5::Qe2@12': C12,
  'qga::5::b3@12': C12,
  'qga::5::Qxd8+@14': C15,
  'qga::5::Qa4+@6': C12,
  'qga::5::Bd3@12': C12,
  'qga::5::Qe2@10': C12,
  // ── slav-defence ──
  'slav-defence::0::Bd2@14': C16,
  'slav-defence::0::Qb3@14': C16,
  'slav-defence::0::Ne5@10': C16,
  'slav-defence::0::Qc2@6': C17,
  'slav-defence::0::cxd5@6': C18,
  'slav-defence::0::Qb3@6': C17,
  'slav-defence::0::g3@6': C17,
  'slav-defence::0::Nh4@10': C19,
  'slav-defence::0::e4@8': C20,
  'slav-defence::1::Nc3@10': C17,
  'slav-defence::1::Nf3@8': C16,
  'slav-defence::1::Nf3@10': C17,
  'slav-defence::1::a3@10': C17,
  'slav-defence::1::Nd2@10': C17,
  'slav-defence::1::Bb5@10': C17,
  'slav-defence::1::a3@8': C16,
  'slav-defence::1::h3@10': C17,
  'slav-defence::1::Nc3@6': C16,
  'slav-defence::2::Qc2@6': C17,
  'slav-defence::2::cxd5@6': C18,
  'slav-defence::2::c5@8': C21,
  'slav-defence::2::Qb3@6': C17,
  'slav-defence::2::g3@6': C17,
  'slav-defence::2::a4@8': C16,
  'slav-defence::2::cxd5@8': C16,
  'slav-defence::2::Qb3@10': C17,
  'slav-defence::2::g3@8': C16,
  'slav-defence::3::cxd5@14': C19,
  'slav-defence::3::h3@14': C19,
  'slav-defence::3::Be2@14': C19,
  'slav-defence::3::Bd2@14': C19,
  'slav-defence::3::Qb3@14': C19,
  'slav-defence::3::Qc2@6': C17,
  'slav-defence::3::cxd5@6': C18,
  'slav-defence::3::g3@14': C19,
  'slav-defence::3::Qb3@6': C17,
  'slav-defence::4::a4@8': DSLAV,
  'slav-defence::4::Qc2@6': C17,
  'slav-defence::4::cxd5@6': C18,
  'slav-defence::4::Qb3@6': C17,
  'slav-defence::4::g3@6': C17,
  'slav-defence::4::Be2@18': C20,
  'slav-defence::4::Ng5@14': C20,
  'slav-defence::4::Bg5@18': C20,
  'slav-defence::4::Be2@14': C20,
  'slav-defence::5::b3@18': C17,
  'slav-defence::5::Qc2@6': C17,
  'slav-defence::5::cxd5@6': C18,
  'slav-defence::5::cxd5@18': C17,
  'slav-defence::5::Qb3@6': C17,
  'slav-defence::5::Re1@18': C17,
  'slav-defence::5::Be2@10': C17,
  'slav-defence::5::Rd1@18': C17,
  'slav-defence::5::g3@6': C17,
  'slav-defence::6::e3@8': C17,
  'slav-defence::6::a4@12': C16,
  'slav-defence::6::e3@12': C17,
  'slav-defence::6::Bxf6@10': WSLMOS,
  'slav-defence::6::Qc2@6': C17,
  'slav-defence::6::cxd5@6': C18,
  'slav-defence::6::Qb3@6': C17,
  'slav-defence::6::cxd5@8': C18,
  'slav-defence::6::g3@8': C21,
  'slav-defence::7::e3@6': C17,
  'slav-defence::7::Nc3@10': C21,
  'slav-defence::7::cxd5@6': C18,
  'slav-defence::7::Qb3@6': C17,
  'slav-defence::7::e4@8': C20,
  'slav-defence::7::g3@6': C17,
  'slav-defence::7::Bf4@10': C21,
  'slav-defence::7::Ne5@10': C21,
  'slav-defence::7::e3@10': C17,
  // ── semi-slav ──
  'semi-slav::0::Bg5@8': WSSL,
  'semi-slav::0::Qc2@10': C23,
  'semi-slav::0::Qc2@6': C23,
  'semi-slav::0::cxd5@6': C24,
  'semi-slav::0::Qb3@6': C24,
  'semi-slav::0::cxd5@8': C24,
  'semi-slav::0::g3@8': C24,
  'semi-slav::0::g3@6': C24,
  'semi-slav::0::Be2@10': C24,
  'semi-slav::1::e3@8': C24,
  'semi-slav::1::exf6@14': C22,
  'semi-slav::1::Qc2@6': C23,
  'semi-slav::1::Bxf6@14': C22,
  'semi-slav::1::cxd5@6': C24,
  'semi-slav::1::Be2@22': C22,
  'semi-slav::1::Qb3@6': C24,
  'semi-slav::1::cxd5@8': C24,
  'semi-slav::1::g3@8': C24,
  'semi-slav::2::Bg5@8': WSSL,
  'semi-slav::2::Qc2@10': C23,
  'semi-slav::2::Qc2@6': C23,
  'semi-slav::2::cxd5@6': C24,
  'semi-slav::2::Qb3@6': C24,
  'semi-slav::2::cxd5@8': C24,
  'semi-slav::2::g3@8': C24,
  'semi-slav::2::g3@6': C24,
  'semi-slav::2::Be2@10': C24,
  'semi-slav::3::Bg5@8': WSSL,
  'semi-slav::3::Bd3@10': C24,
  'semi-slav::3::Qc2@6': C23,
  'semi-slav::3::cxd5@6': C24,
  'semi-slav::3::b3@12': C23,
  'semi-slav::3::Be2@12': C23,
  'semi-slav::3::Qb3@6': C24,
  'semi-slav::3::cxd5@8': C24,
  'semi-slav::3::g4@12': C23,
  'semi-slav::4::e3@8': C24,
  'semi-slav::4::Bh4@10': DSSL,
  'semi-slav::4::Qc2@6': C23,
  'semi-slav::4::cxd5@14': C24,
  'semi-slav::4::cxd5@6': C24,
  'semi-slav::4::Qb3@6': C24,
  'semi-slav::4::Be2@14': C24,
  'semi-slav::4::cxd5@8': C24,
  'semi-slav::4::g3@8': C24,
  'semi-slav::5::Bg5@8': WSSL,
  'semi-slav::5::Qc2@10': C23,
  'semi-slav::5::Qc2@6': C23,
  'semi-slav::5::cxd5@6': C24,
  'semi-slav::5::Bg5@22': C25,
  'semi-slav::5::Bg5@20': C25,
  'semi-slav::5::Qb3@6': C24,
  'semi-slav::5::cxd5@8': C24,
  'semi-slav::5::Bd3@20': C25,
  'semi-slav::6::Bg5@8': WSSL,
  'semi-slav::6::Qc2@10': C23,
  'semi-slav::6::Qc2@6': C23,
  'semi-slav::6::cxd5@6': C24,
  'semi-slav::6::Qb3@6': C24,
  'semi-slav::6::cxd5@8': C24,
  'semi-slav::6::g3@8': C24,
  'semi-slav::6::g3@6': C24,
  'semi-slav::6::Be2@10': C24,
  // ── nimzo-indian ──
  'nimzo-indian::0::e3@6': WNIME3,
  'nimzo-indian::0::g3@4': C27,
  'nimzo-indian::0::Bg5@12': C28,
  'nimzo-indian::0::bxc3@10': C28,
  'nimzo-indian::0::e3@12': C28,
  'nimzo-indian::0::f3@6': C29,
  'nimzo-indian::0::Nf3@6': C26,
  'nimzo-indian::0::cxd5@12': C28,
  'nimzo-indian::0::e4@8': C28,
  'nimzo-indian::1::g3@4': C27,
  'nimzo-indian::1::Qc2@6': C28,
  'nimzo-indian::1::f3@6': C29,
  'nimzo-indian::1::Nf3@6': C26,
  'nimzo-indian::1::Ne2@8': C30,
  'nimzo-indian::1::Bg5@6': C31,
  'nimzo-indian::1::a3@10': C26,
  'nimzo-indian::1::g3@6': C27,
  'nimzo-indian::1::a3@6': C26,
  'nimzo-indian::2::g3@4': C27,
  'nimzo-indian::2::Qc2@6': C28,
  'nimzo-indian::2::f3@6': C29,
  'nimzo-indian::2::Nf3@6': C26,
  'nimzo-indian::2::Ne2@8': C30,
  'nimzo-indian::2::Bg5@6': C31,
  'nimzo-indian::2::g3@6': C27,
  'nimzo-indian::2::a3@6': C26,
  'nimzo-indian::2::Ne2@10': C30,
  'nimzo-indian::3::Nf3@4': C26,
  'nimzo-indian::3::e3@6': WNIME3,
  'nimzo-indian::3::g3@4': C27,
  'nimzo-indian::3::Qc2@6': C28,
  'nimzo-indian::3::Bd2@8': C31,
  'nimzo-indian::3::f3@6': C29,
  'nimzo-indian::3::Nf3@6': C26,
  'nimzo-indian::3::g3@6': C27,
  'nimzo-indian::3::a3@6': C26,
  'nimzo-indian::4::e3@6': WNIME3,
  'nimzo-indian::4::g3@4': C27,
  'nimzo-indian::4::Qc2@6': C28,
  'nimzo-indian::4::f3@6': C29,
  'nimzo-indian::4::Bg5@6': C31,
  'nimzo-indian::4::g3@6': C27,
  'nimzo-indian::4::a3@6': C26,
  'nimzo-indian::4::e3@8': C26,
  'nimzo-indian::4::Bd2@16': C27,
  'nimzo-indian::5::e3@6': WNIME3,
  'nimzo-indian::5::g3@4': C27,
  'nimzo-indian::5::Qc2@6': C28,
  'nimzo-indian::5::f3@6': C29,
  'nimzo-indian::5::Nf3@6': C26,
  'nimzo-indian::5::Bg5@6': C31,
  'nimzo-indian::5::g3@6': C27,
  'nimzo-indian::5::f3@10': DNIM,
  'nimzo-indian::5::O-O@16': C30,
  'nimzo-indian::6::Bg5@8': C29,
  'nimzo-indian::6::e3@8': C29,
  'nimzo-indian::6::e3@6': WNIME3,
  'nimzo-indian::6::g3@4': C27,
  'nimzo-indian::6::Qc2@6': C28,
  'nimzo-indian::6::cxd5@8': C29,
  'nimzo-indian::6::Bd2@8': C29,
  'nimzo-indian::6::e4@8': C29,
  'nimzo-indian::6::Nf3@6': C26,
  'nimzo-indian::7::g3@4': C27,
  'nimzo-indian::7::Qc2@6': C28,
  'nimzo-indian::7::f3@6': C29,
  'nimzo-indian::7::Nf3@6': C26,
  'nimzo-indian::7::Ne2@8': C30,
  'nimzo-indian::7::Bg5@6': C31,
  'nimzo-indian::7::g3@6': C27,
  'nimzo-indian::7::a3@6': C26,
  'nimzo-indian::7::Re1@18': C26,
  // ── queens-indian ──
  'queens-indian::0::g3@4': WQIDG3,
  'queens-indian::0::a3@6': WQIDA3,
  'queens-indian::0::Nc3@6': WQIDNC36,
  'queens-indian::0::e3@6': WQIDE3,
  'queens-indian::0::Nc3@10': C32,
  'queens-indian::0::Re1@12': C32,
  'queens-indian::0::Bf4@18': C32,
  'queens-indian::0::Re1@18': C32,
  'queens-indian::0::d5@12': C32,
  'queens-indian::1::g3@6': DQID,
  'queens-indian::1::g3@4': WQIDG3,
  'queens-indian::1::Nc3@6': WQIDNC36,
  'queens-indian::1::e3@6': WQIDE3,
  'queens-indian::1::Bg5@10': C33,
  'queens-indian::1::e3@12': C33,
  'queens-indian::1::Bd2@12': C33,
  'queens-indian::1::Qc2@10': C33,
  'queens-indian::1::Bf4@8': C33,
  'queens-indian::2::g3@6': DQID,
  'queens-indian::2::g3@4': WQIDG3,
  'queens-indian::2::a3@6': WQIDA3,
  'queens-indian::2::e3@6': WQIDE3,
  'queens-indian::2::Bg5@10': C33,
  'queens-indian::2::Bg5@8': C34,
  'queens-indian::2::e3@12': C33,
  'queens-indian::2::Bd2@12': C33,
  'queens-indian::2::Qc2@10': C33,
  'queens-indian::3::g3@4': WQIDG3,
  'queens-indian::3::a3@6': WQIDA3,
  'queens-indian::3::Nc3@6': WQIDNC36,
  'queens-indian::3::e3@6': WQIDE3,
  'queens-indian::3::Nbd2@10': C32,
  'queens-indian::3::Rfe1@22': C32,
  'queens-indian::3::O-O@14': C32,
  'queens-indian::3::b4@22': C32,
  'queens-indian::3::Rad1@22': C32,
  'queens-indian::4::g3@4': WQIDG3,
  'queens-indian::4::a3@6': WQIDA3,
  'queens-indian::4::Nc3@6': WQIDNC36,
  'queens-indian::4::e3@6': WQIDE3,
  'queens-indian::4::Bd2@14': C32,
  'queens-indian::4::Nc3@10': C32,
  'queens-indian::4::Re1@12': C32,
  'queens-indian::4::Nxe4@14': C32,
  'queens-indian::4::d5@12': C32,
  'queens-indian::5::g3@4': WQIDG3,
  'queens-indian::5::b3@8': C35,
  'queens-indian::5::a3@6': WQIDA3,
  'queens-indian::5::Nc3@6': WQIDNC36,
  'queens-indian::5::Qc2@8': C35,
  'queens-indian::5::e3@6': WQIDE3,
  'queens-indian::5::Nbd2@8': C35,
  'queens-indian::5::Qb3@8': C35,
  'queens-indian::5::O-O@12': C35,
  'queens-indian::6::g3@6': DQID,
  'queens-indian::6::g3@4': WQIDG3,
  'queens-indian::6::b3@14': C34,
  'queens-indian::6::Re1@14': C34,
  'queens-indian::6::a3@6': WQIDA3,
  'queens-indian::6::Qe2@14': C34,
  'queens-indian::6::a3@14': C33,
  'queens-indian::6::Nc3@10': C34,
  'queens-indian::6::Ne5@14': C34,
  // ── kings-indian-defence ──
  'kings-indian-defence::0::f3@8': WKIDF3,
  'kings-indian-defence::0::g3@4': WKIDG3,
  'kings-indian-defence::0::Nf3@4': WKIDNF3,
  'kings-indian-defence::0::b4@16': DKID,
  'kings-indian-defence::0::h3@10': C38,
  'kings-indian-defence::0::h3@8': WKIDH3,
  'kings-indian-defence::0::Be3@12': C38,
  'kings-indian-defence::0::d5@12': TKID2,
  'kings-indian-defence::0::Nf3@6': C38,
  'kings-indian-defence::1::f3@8': WKIDF3,
  'kings-indian-defence::1::g3@4': WKIDG3,
  'kings-indian-defence::1::Nf3@4': WKIDNF3,
  'kings-indian-defence::1::h3@10': C38,
  'kings-indian-defence::1::Ne1@16': C39,
  'kings-indian-defence::1::h3@8': WKIDH3,
  'kings-indian-defence::1::Be3@12': C38,
  'kings-indian-defence::1::d5@12': C38,
  'kings-indian-defence::1::Nf3@6': C38,
  'kings-indian-defence::2::Be2@8': C38,
  'kings-indian-defence::2::g3@4': WKIDG3,
  'kings-indian-defence::2::Nf3@4': WKIDNF3,
  'kings-indian-defence::2::h3@8': WKIDH3,
  'kings-indian-defence::2::Nf3@6': C38,
  'kings-indian-defence::2::f3@4': C36,
  'kings-indian-defence::2::f4@8': C40,
  'kings-indian-defence::2::Bd3@8': C38,
  'kings-indian-defence::2::Bg5@10': C41,
  'kings-indian-defence::3::h3@10': C40,
  'kings-indian-defence::3::Be2@10': C40,
  'kings-indian-defence::3::Bd3@10': C40,
  'kings-indian-defence::3::Nf3@8': C38,
  'kings-indian-defence::3::Be2@8': C38,
  'kings-indian-defence::3::f3@8': WKIDF3,
  'kings-indian-defence::3::g3@4': WKIDG3,
  'kings-indian-defence::3::Nf3@4': WKIDNF3,
  'kings-indian-defence::3::e6@22': C40,
  'kings-indian-defence::4::Nc3@6': C38,
  'kings-indian-defence::4::Nc3@8': C37,
  'kings-indian-defence::4::g3@4': WKIDG3,
  'kings-indian-defence::4::Nc3@10': C37,
  'kings-indian-defence::4::f3@4': C36,
  'kings-indian-defence::4::h3@14': C37,
  'kings-indian-defence::4::Qc2@12': C37,
  'kings-indian-defence::4::e3@6': C38,
  'kings-indian-defence::4::b3@16': C37,
  'kings-indian-defence::5::Be2@8': C38,
  'kings-indian-defence::5::f3@8': WKIDF3,
  'kings-indian-defence::5::g3@4': WKIDG3,
  'kings-indian-defence::5::Nf3@4': WKIDNF3,
  'kings-indian-defence::5::h3@10': C38,
  'kings-indian-defence::5::h3@8': WKIDH3,
  'kings-indian-defence::5::Be3@12': C38,
  'kings-indian-defence::5::Nf3@6': C38,
  'kings-indian-defence::5::f3@4': C36,
  'kings-indian-defence::6::f3@8': WKIDF3,
  'kings-indian-defence::6::g3@4': WKIDG3,
  'kings-indian-defence::6::Nf3@4': WKIDNF3,
  'kings-indian-defence::6::Nf3@10': C38,
  'kings-indian-defence::6::h3@8': WKIDH3,
  'kings-indian-defence::6::Nf3@6': C38,
  'kings-indian-defence::6::f3@4': C36,
  'kings-indian-defence::6::f4@8': C40,
  'kings-indian-defence::6::Be3@10': C38,
  'kings-indian-defence::7::Be2@10': C38,
  'kings-indian-defence::7::Be3@12': C38,
  'kings-indian-defence::7::Be2@8': C38,
  'kings-indian-defence::7::f3@8': WKIDF3,
  'kings-indian-defence::7::g3@4': WKIDG3,
  'kings-indian-defence::7::Nf3@4': WKIDNF3,
  'kings-indian-defence::7::Be2@12': C38,
  'kings-indian-defence::7::h3@8': WKIDH3,
  'kings-indian-defence::7::Nf3@6': C38,
  // ── grunfeld-defence ──
  'grunfeld-defence::0::Nf3@6': WGRUNF3,
  'grunfeld-defence::0::Nf3@4': C42,
  'grunfeld-defence::0::Bc4@12': DGRU,
  'grunfeld-defence::0::Rb1@14': C43,
  'grunfeld-defence::0::Be2@18': C44,
  'grunfeld-defence::0::f3@4': C43,
  'grunfeld-defence::0::Bf4@6': C45,
  'grunfeld-defence::0::Bd2@8': C43,
  'grunfeld-defence::0::Bg5@6': C46,
  'grunfeld-defence::1::Nf3@6': WGRUNF3,
  'grunfeld-defence::1::Nf3@4': C42,
  'grunfeld-defence::1::Bc4@12': DGRU,
  'grunfeld-defence::1::Rb1@14': C43,
  'grunfeld-defence::1::f3@4': C43,
  'grunfeld-defence::1::Be2@18': C43,
  'grunfeld-defence::1::Bf4@6': C45,
  'grunfeld-defence::1::Bd2@8': C43,
  'grunfeld-defence::1::Bg5@6': C46,
  'grunfeld-defence::2::g3@4': WGRUG3,
  'grunfeld-defence::2::Nf3@4': C42,
  'grunfeld-defence::2::cxd5@8': C42,
  'grunfeld-defence::2::f3@4': C43,
  'grunfeld-defence::2::Bg5@8': C46,
  'grunfeld-defence::2::Bf4@6': C45,
  'grunfeld-defence::2::Bg5@6': C46,
  'grunfeld-defence::2::e3@8': C42,
  'grunfeld-defence::2::Bf4@8': C45,
  'grunfeld-defence::3::Nc3@6': C42,
  'grunfeld-defence::3::g3@4': WGRUG3,
  'grunfeld-defence::3::f3@4': C43,
  'grunfeld-defence::3::cxd5@8': C47,
  'grunfeld-defence::3::e3@6': C42,
  'grunfeld-defence::3::e3@16': C47,
  'grunfeld-defence::3::Nc4@16': C47,
  'grunfeld-defence::3::Bb2@16': C47,
  'grunfeld-defence::3::Re1@16': C47,
  'grunfeld-defence::4::Nf3@14': C43,
  'grunfeld-defence::4::g3@4': WGRUG3,
  'grunfeld-defence::4::Nf3@6': WGRUNF3,
  'grunfeld-defence::4::Nf3@4': C42,
  'grunfeld-defence::4::Nf3@12': WGRUC5,
  'grunfeld-defence::4::Qxf1@26': C44,
  'grunfeld-defence::4::f3@4': C43,
  'grunfeld-defence::4::d5@18': C44,
  'grunfeld-defence::4::Bf4@6': C45,
  'grunfeld-defence::5::Nf3@4': C42,
  'grunfeld-defence::5::f3@4': C43,
  'grunfeld-defence::5::cxd5@8': WGRUF,
  'grunfeld-defence::5::cxd5@10': C47,
  'grunfeld-defence::5::e3@16': C47,
  'grunfeld-defence::5::Nc4@16': C47,
  'grunfeld-defence::5::Bb2@16': C47,
  'grunfeld-defence::5::Re1@16': C47,
  'grunfeld-defence::5::Ne5@16': C47,
  'grunfeld-defence::6::Nf3@6': WGRUNF3,
  'grunfeld-defence::6::Nf3@4': C42,
  'grunfeld-defence::6::Bc4@12': DGRU,
  'grunfeld-defence::6::Be3@16': C44,
  'grunfeld-defence::6::f3@4': C43,
  'grunfeld-defence::6::Qd2@20': C44,
  'grunfeld-defence::6::Bf4@6': C45,
  'grunfeld-defence::6::Bc4@16': C44,
  'grunfeld-defence::6::Be3@14': C43,
  'grunfeld-defence::7::Nf3@14': C43,
  'grunfeld-defence::7::g3@4': WGRUG3,
  'grunfeld-defence::7::Nf3@6': WGRUNF3,
  'grunfeld-defence::7::Nf3@4': C42,
  'grunfeld-defence::7::O-O@16': C44,
  'grunfeld-defence::7::Nf3@12': WGRUC5,
  'grunfeld-defence::7::f3@4': C43,
  'grunfeld-defence::7::d5@16': C43,
  'grunfeld-defence::7::Bf4@6': C45,
  // ── benoni-defence ──
  'benoni-defence::0::e4@10': DBEN,
  'benoni-defence::0::Nf3@4': C49,
  'benoni-defence::0::Bf4@12': C48,
  'benoni-defence::0::Nd2@12': C48,
  'benoni-defence::0::g3@12': C50,
  'benoni-defence::0::h3@12': C48,
  'benoni-defence::0::e3@4': C48,
  'benoni-defence::0::h3@14': C51,
  'benoni-defence::0::Bg5@12': C48,
  'benoni-defence::1::e4@10': DBEN,
  'benoni-defence::1::Nf3@4': C49,
  'benoni-defence::1::Bf4@12': C48,
  'benoni-defence::1::e4@12': C51,
  'benoni-defence::1::Nd2@12': C48,
  'benoni-defence::1::h3@12': C48,
  'benoni-defence::1::e3@4': C48,
  'benoni-defence::1::Bg5@12': C48,
  'benoni-defence::1::g3@10': C50,
  'benoni-defence::2::e4@10': DBEN,
  'benoni-defence::2::Nf3@4': C49,
  'benoni-defence::2::e4@12': C51,
  'benoni-defence::2::Nd2@12': C48,
  'benoni-defence::2::h3@16': C48,
  'benoni-defence::2::g3@12': C50,
  'benoni-defence::2::h3@12': C48,
  'benoni-defence::2::e3@4': C48,
  'benoni-defence::2::Bd3@16': C48,
  'benoni-defence::3::Nf3@10': C48,
  'benoni-defence::3::Nf3@4': C49,
  'benoni-defence::3::Nf3@12': C51,
  'benoni-defence::3::e3@4': C48,
  'benoni-defence::3::h3@12': C51,
  'benoni-defence::3::Bd3@12': C51,
  'benoni-defence::3::Bc4@22': C52,
  'benoni-defence::3::f3@12': C51,
  'benoni-defence::3::Nf3@16': C52,
  'benoni-defence::4::e6@22': C48,
  'benoni-defence::4::Nf3@10': C48,
  'benoni-defence::4::Nf3@4': C49,
  'benoni-defence::4::d6@26': C48,
  'benoni-defence::4::O-O@22': C48,
  'benoni-defence::4::Bb5+@14': C52,
  'benoni-defence::4::Bf4@22': C48,
  'benoni-defence::4::Nf3@12': C51,
  'benoni-defence::4::e3@4': C48,
  'benoni-defence::5::Bd3@10': C49,
  'benoni-defence::5::dxe6@6': C53,
  'benoni-defence::5::Nf3@10': C49,
  'benoni-defence::5::f4@10': C49,
  'benoni-defence::5::h3@10': C49,
  'benoni-defence::5::Be2@10': C49,
  'benoni-defence::5::Bg5@10': C49,
  'benoni-defence::5::f3@10': C49,
  'benoni-defence::5::e4@6': C49,
  'benoni-defence::5::Bg5@6': C49,
  'benoni-defence::6::e4@10': DBEN,
  'benoni-defence::6::Nf3@4': C49,
  'benoni-defence::6::Bf4@12': C48,
  'benoni-defence::6::Nd2@12': C48,
  'benoni-defence::6::g3@12': C50,
  'benoni-defence::6::h3@12': C48,
  'benoni-defence::6::e3@4': C48,
  'benoni-defence::6::h3@14': C51,
  'benoni-defence::6::Bg5@12': C48,
  // ── benko-gambit ──
  'benko-gambit::0::Nf3@4': C54,
  'benko-gambit::0::b6@8': WBENB6,
  'benko-gambit::0::Nf3@6': C55,
  'benko-gambit::0::e3@8': C56,
  'benko-gambit::0::Nf3@12': C56,
  'benko-gambit::0::g3@12': C57,
  'benko-gambit::0::e3@4': C56,
  'benko-gambit::0::f3@8': C54,
  'benko-gambit::0::Nf3@16': C58,
  'benko-gambit::0::Qc2@6': C56,
  'benko-gambit::1::Nf3@4': C54,
  'benko-gambit::1::b6@8': WBENB6,
  'benko-gambit::1::Nf3@6': C55,
  'benko-gambit::1::e3@8': C56,
  'benko-gambit::1::e3@4': C56,
  'benko-gambit::1::f3@8': C54,
  'benko-gambit::1::g3@16': C58,
  'benko-gambit::1::Qc2@6': C56,
  'benko-gambit::1::Re1@22': C58,
  'benko-gambit::1::Nd2@6': C56,
  'benko-gambit::2::cxb5@6': WBENKO,
  'benko-gambit::2::Re1@16': C56,
  'benko-gambit::2::Bg5@16': C56,
  'benko-gambit::2::Nf3@4': C54,
  'benko-gambit::2::e3@8': C56,
  'benko-gambit::2::h3@14': C56,
  'benko-gambit::2::Bg5@14': C56,
  'benko-gambit::2::Bf4@18': C56,
  'benko-gambit::2::e5@14': C56,
  'benko-gambit::2::e5@16': C56,
  'benko-gambit::3::bxa6@8': DBENKO,
  'benko-gambit::3::e5@12': C54,
  'benko-gambit::3::Nf3@4': C54,
  'benko-gambit::3::b6@8': WBENB6,
  'benko-gambit::3::Nf3@6': C55,
  'benko-gambit::3::e3@8': C56,
  'benko-gambit::3::e5@16': C54,
  'benko-gambit::3::e3@4': C56,
  'benko-gambit::3::f3@8': C54,
  'benko-gambit::3::Qc2@6': C56,
  'benko-gambit::4::bxa6@8': DBENKO,
  'benko-gambit::4::Nf3@4': C54,
  'benko-gambit::4::b6@8': WBENB6,
  'benko-gambit::4::Nf3@6': C55,
  'benko-gambit::4::e3@4': C56,
  'benko-gambit::4::f3@8': C54,
  'benko-gambit::4::Qc2@6': C56,
  'benko-gambit::4::Nd2@6': C56,
  'benko-gambit::4::Nc3@8': C54,
  'benko-gambit::4::a4@6': C56,
  'benko-gambit::5::Nf3@4': C54,
  'benko-gambit::5::b6@8': WBENB6,
  'benko-gambit::5::Nf3@6': C55,
  'benko-gambit::5::e3@8': C56,
  'benko-gambit::5::e3@4': C56,
  'benko-gambit::5::f3@8': C54,
  'benko-gambit::5::Nf3@16': C58,
  'benko-gambit::5::Qc2@6': C56,
  'benko-gambit::5::Nd2@6': C56,
  'benko-gambit::5::a4@22': C58,
  'benko-gambit::6::Nge2@18': C58,
  'benko-gambit::6::Nf3@4': C54,
  'benko-gambit::6::b6@8': WBENB6,
  'benko-gambit::6::Nf3@6': C55,
  'benko-gambit::6::e3@8': C56,
  'benko-gambit::6::e3@4': C56,
  'benko-gambit::6::f3@8': C54,
  'benko-gambit::6::Qc2@6': C56,
  'benko-gambit::6::Nd2@6': C56,
  'benko-gambit::6::Nf3@12': C56,
  // ── budapest-gambit ──
  'budapest-gambit::0::Nc3@4': C59,
  'budapest-gambit::0::e3@4': C60,
  'budapest-gambit::0::Nf3@4': C59,
  'budapest-gambit::0::O-O@12': C59,
  'budapest-gambit::0::Nc3@16': C59,
  'budapest-gambit::0::Nbd2@12': C59,
  'budapest-gambit::0::Nc3@12': C59,
  'budapest-gambit::0::a3@16': C59,
  'budapest-gambit::0::Nc3@14': C59,
  'budapest-gambit::1::Nc3@4': C59,
  'budapest-gambit::1::e3@4': C60,
  'budapest-gambit::1::Nf3@4': C59,
  'budapest-gambit::1::Qd5@16': C61,
  'budapest-gambit::1::e3@16': C61,
  'budapest-gambit::1::e3@10': C61,
  'budapest-gambit::1::Qc2@10': C61,
  'budapest-gambit::1::Qf4@16': C61,
  'budapest-gambit::1::g3@10': C61,
  'budapest-gambit::2::Nc3@4': C59,
  'budapest-gambit::2::e3@4': C60,
  'budapest-gambit::2::Nf3@4': C59,
  'budapest-gambit::2::e3@20': C59,
  'budapest-gambit::2::e3@8': C59,
  'budapest-gambit::2::Qd2@18': C59,
  'budapest-gambit::2::Qd5@8': C59,
  'budapest-gambit::2::h3@8': C59,
  'budapest-gambit::2::e3@14': C59,
  'budapest-gambit::3::Nc3@4': C59,
  'budapest-gambit::3::e3@4': C60,
  'budapest-gambit::3::Nf3@4': C59,
  'budapest-gambit::3::e3@12': C59,
  'budapest-gambit::3::axb4@14': C59,
  'budapest-gambit::3::Bxe5@16': C59,
  'budapest-gambit::3::e3@8': C59,
  'budapest-gambit::3::h3@12': C59,
  'budapest-gambit::3::Qd5@8': C59,
  'budapest-gambit::4::Nc3@4': C59,
  'budapest-gambit::4::e3@4': C60,
  'budapest-gambit::4::Nf3@4': C59,
  'budapest-gambit::4::Bf4@6': DBUD,
  'budapest-gambit::4::Nf3@6': WBUDRUB,
  'budapest-gambit::4::e3@6': C59,
  'budapest-gambit::4::Kf2@14': C62,
  'budapest-gambit::4::Be3@10': WBUDADL,
  'budapest-gambit::4::Nf3@10': C63,
  'budapest-gambit::5::Nc3@4': C59,
  'budapest-gambit::5::e3@4': C60,
  'budapest-gambit::5::Nf3@4': C59,
  'budapest-gambit::5::Be2@12': C59,
  'budapest-gambit::5::a3@18': C59,
  'budapest-gambit::5::Qd5@14': C59,
  'budapest-gambit::5::a3@12': C59,
  'budapest-gambit::5::f4@14': C59,
  'budapest-gambit::5::a3@14': C59,
  'budapest-gambit::6::Nc3@4': C59,
  'budapest-gambit::6::e3@4': C60,
  'budapest-gambit::6::Nf3@4': C59,
  'budapest-gambit::6::e3@10': C61,
  'budapest-gambit::6::a3@10': C61,
  'budapest-gambit::6::Nb3@10': C61,
  'budapest-gambit::6::b3@10': C61,
  'budapest-gambit::6::e4@10': C61,
  'budapest-gambit::6::Nf3@6': C61,
  // ── dutch-defence ──
  'dutch-defence::0::Re1@14': C64,
  'dutch-defence::0::Nf3@4': C64,
  'dutch-defence::0::c4@4': C64,
  'dutch-defence::0::Bg5@14': C65,
  'dutch-defence::0::b3@14': C64,
  'dutch-defence::0::Qc2@14': C64,
  'dutch-defence::0::Qb3@14': C64,
  'dutch-defence::0::Bf4@14': C64,
  'dutch-defence::0::e4@14': C64,
  'dutch-defence::0::Nd4@16': C64,
  'dutch-defence::1::b3@10': C66,
  'dutch-defence::1::c4@8': C66,
  'dutch-defence::1::Bg5@8': C65,
  'dutch-defence::1::Bg5@10': C65,
  'dutch-defence::1::Nbd2@10': C66,
  'dutch-defence::1::Nf3@4': C64,
  'dutch-defence::1::c3@10': C66,
  'dutch-defence::1::c3@8': C66,
  'dutch-defence::1::Ne5@8': C66,
  'dutch-defence::1::c4@4': C64,
  'dutch-defence::2::c4@8': C67,
  'dutch-defence::2::b3@10': C67,
  'dutch-defence::2::Nf3@4': C64,
  'dutch-defence::2::c3@10': C67,
  'dutch-defence::2::c4@4': C64,
  'dutch-defence::2::Nbd2@10': C67,
  'dutch-defence::2::Re1@10': C67,
  'dutch-defence::2::Bg5@8': C65,
  'dutch-defence::2::Ne5@18': C66,
  'dutch-defence::2::Bg5@10': C65,
  'dutch-defence::3::Nf3@8': C65,
  'dutch-defence::3::h4@8': C65,
  'dutch-defence::3::Bxf6@8': C65,
  'dutch-defence::3::Be2@8': C65,
  'dutch-defence::3::h3@8': C65,
  'dutch-defence::3::Qd2@8': C65,
  'dutch-defence::3::Nd2@4': C65,
  'dutch-defence::3::e3@4': C65,
  'dutch-defence::3::e4@6': DDUT,
  'dutch-defence::4::Nf3@4': C64,
  'dutch-defence::4::c4@4': C64,
  'dutch-defence::4::b3@10': C64,
  'dutch-defence::4::c4@6': WDUTLEN,
  'dutch-defence::4::Nh3@6': C68,
  'dutch-defence::4::c4@8': C64,
  'dutch-defence::4::c3@6': C64,
  'dutch-defence::4::b3@6': C64,
  'dutch-defence::4::b4@10': C64,
  'dutch-defence::4::Nbd2@10': C64,
  'dutch-defence::5::c4@8': C67,
  'dutch-defence::5::b3@10': C67,
  'dutch-defence::5::Nf3@4': C64,
  'dutch-defence::5::c3@10': C67,
  'dutch-defence::5::c4@4': C64,
  'dutch-defence::5::Nbd2@10': C67,
  'dutch-defence::5::Re1@10': C67,
  'dutch-defence::5::Bg5@8': C65,
  'dutch-defence::5::Bg5@10': C65,
  'dutch-defence::5::c3@8': C67,
  'dutch-defence::6::Qd3@18': C64,
  'dutch-defence::6::b3@10': C64,
  'dutch-defence::6::Qb3@18': C64,
  'dutch-defence::6::Bf4@18': C64,
  'dutch-defence::6::c4@4': C64,
  'dutch-defence::6::Nd2@18': C64,
  'dutch-defence::6::Rb1@14': C64,
  'dutch-defence::6::b3@14': C64,
  'dutch-defence::6::c4@8': C64,
  'dutch-defence::6::Ng5@18': C64,
  // ── catalan-opening ──
  'catalan-opening::0::c5@5': C69,
  'catalan-opening::0::a6@9': WCATA6,
  'catalan-opening::0::Be7@7': C70,
  'catalan-opening::0::Nbd7@19': C69,
  'catalan-opening::0::Bb4+@7': WCATBB,
  'catalan-opening::0::Nc6@9': C69,
  'catalan-opening::0::c5@9': C69,
  'catalan-opening::0::Bb4+@9': C71,
  'catalan-opening::0::b5@13': C69,
  'catalan-opening::1::dxc4@9': C69,
  'catalan-opening::1::b6@9': C70,
  'catalan-opening::1::Nbd7@9': C70,
  'catalan-opening::1::dxc4@11': C69,
  'catalan-opening::1::Bb4+@5': C71,
  'catalan-opening::1::c5@5': C69,
  'catalan-opening::1::c6@11': C70,
  'catalan-opening::1::Bb4+@7': WCATBB,
  'catalan-opening::1::dxc4@7': C69,
  'catalan-opening::2::c5@5': C69,
  'catalan-opening::2::Be7@7': C70,
  'catalan-opening::2::Nc6@11': TCAT,
  'catalan-opening::2::Bb4+@7': WCATBB,
  'catalan-opening::2::Nc6@9': C69,
  'catalan-opening::2::c5@9': C69,
  'catalan-opening::2::Bb4+@9': C71,
  'catalan-opening::2::Ra7@13': C72,
  'catalan-opening::2::Bd7@9': C69,
  'catalan-opening::3::dxc4@9': C69,
  'catalan-opening::3::b6@9': C70,
  'catalan-opening::3::Nbd7@9': C70,
  'catalan-opening::3::Bb4+@5': C71,
  'catalan-opening::3::c5@5': C69,
  'catalan-opening::3::Nc6@15': C69,
  'catalan-opening::3::c6@11': C70,
  'catalan-opening::3::Bb4+@7': WCATBB,
  'catalan-opening::3::dxc4@7': C69,
  'catalan-opening::4::e6@5': C69,
  'catalan-opening::4::Qc7@13': C72,
  'catalan-opening::4::Qb6@13': C72,
  'catalan-opening::4::a6@11': C73,
  'catalan-opening::4::Nd5@13': C72,
  'catalan-opening::4::Bf5@7': C73,
  'catalan-opening::4::b4@11': C73,
  'catalan-opening::4::e6@11': C72,
  'catalan-opening::4::Qc8@13': C72,
  'catalan-opening::4::g6@7': C73,
  'catalan-opening::5::dxc4@9': C69,
  'catalan-opening::5::b6@9': C70,
  'catalan-opening::5::Nbd7@9': C70,
  'catalan-opening::5::dxc4@11': C69,
  'catalan-opening::5::Bb4+@5': C71,
  'catalan-opening::5::c5@5': C69,
  'catalan-opening::5::c6@11': C70,
  'catalan-opening::5::Bb4+@7': WCATBB,
  'catalan-opening::5::c5@23': C70,
  'catalan-opening::6::c5@5': C69,
  'catalan-opening::6::a6@9': WCATA6,
  'catalan-opening::6::Be7@7': C70,
  'catalan-opening::6::Bb4+@7': WCATBB,
  'catalan-opening::6::Nc6@9': C69,
  'catalan-opening::6::c5@9': C69,
  'catalan-opening::6::Bb4+@9': C71,
  'catalan-opening::6::c6@9': C72,
  'catalan-opening::6::Nbd7@9': C69,
  // ── london-system ──
  'london-system::0::cxd4@9': C74,
  'london-system::0::Bd6@9': C75,
  'london-system::0::Be7@11': C75,
  'london-system::0::c4@9': C75,
  'london-system::0::cxd4@11': C74,
  'london-system::0::Be7@9': C75,
  'london-system::0::Qb6@11': C75,
  'london-system::0::Qb6@9': C75,
  'london-system::0::b6@15': TLON,
  'london-system::0::a6@11': C75,
  'london-system::1::Re8@17': WLONRE8,
  'london-system::1::c5@17': C76,
  'london-system::1::Ne4@17': C76,
  'london-system::1::Nh5@17': C76,
  'london-system::1::e5@17': C76,
  'london-system::1::Qe8@17': C76,
  'london-system::1::Rc8@17': C76,
  'london-system::1::a6@17': C76,
  'london-system::1::e6@17': C76,
  'london-system::1::Nd5@17': C76,
  'london-system::2::cxd4@9': C74,
  'london-system::2::Bd6@9': C75,
  'london-system::2::c4@9': C75,
  'london-system::2::Be7@9': C75,
  'london-system::2::Qb6@9': C75,
  'london-system::2::Be7@13': C75,
  'london-system::2::cxd4@13': C74,
  'london-system::2::cxd4@11': C74,
  'london-system::2::Bd6@11': C75,
  'london-system::3::Nbd7@11': C77,
  'london-system::3::c6@11': C77,
  'london-system::3::Nc6@11': C77,
  'london-system::3::b6@11': C77,
  'london-system::3::Bg4@11': C77,
  'london-system::3::Bf5@11': C78,
  'london-system::3::cxd4@13': C74,
  'london-system::3::Re8@11': C77,
  'london-system::3::Nh5@11': C77,
  'london-system::3::cxd4@15': C74,
  'london-system::4::Be7@7': C79,
  'london-system::4::b6@7': C79,
  'london-system::4::d6@7': C79,
  'london-system::4::Bd6@7': C79,
  'london-system::4::Bb4+@7': C79,
  'london-system::4::Be7@9': C79,
  'london-system::4::c6@7': C79,
  'london-system::4::c6@9': C75,
  'london-system::4::Nc6@7': C79,
  'london-system::4::c5@9': C75,
  'london-system::5::Bd6@7': C78,
  'london-system::5::c5@7': C78,
  'london-system::5::Nc6@7': C78,
  'london-system::5::Bb4@11': C78,
  'london-system::5::a6@7': C78,
  'london-system::5::h6@7': C78,
  'london-system::5::Nbd7@11': C78,
  'london-system::5::c6@7': C78,
  'london-system::5::Be7@11': C78,
  'london-system::5::Bd6@9': C78,
  'london-system::6::c5@7': C75,
  'london-system::6::b6@15': C75,
  'london-system::6::Be7@7': C79,
  'london-system::6::Re8@15': C75,
  'london-system::6::Bxg3@9': C79,
  'london-system::6::c5@9': C75,
  'london-system::6::cxd4@15': C74,
  'london-system::6::c4@15': C75,
  'london-system::6::Nc6@7': C79,
  'london-system::6::a6@15': C75,
  'london-system::7::d6@5': C75,
  'london-system::7::d6@9': C76,
  'london-system::7::Qb6@5': C75,
  'london-system::7::a6@9': C77,
  'london-system::7::b4@9': C77,
  'london-system::7::Qa5+@9': C77,
  'london-system::7::g6@5': C76,
  'london-system::7::Qb6@9': C77,
  'london-system::7::e6@5': C75,
  'london-system::7::d6@7': C75,
  // ── trompowsky-attack ──
  'trompowsky-attack::0::e6@7': C80,
  'trompowsky-attack::0::Bf5@7': C80,
  'trompowsky-attack::0::g6@7': C80,
  'trompowsky-attack::0::g5@7': C80,
  'trompowsky-attack::0::c6@7': C81,
  'trompowsky-attack::0::Nc6@7': C80,
  'trompowsky-attack::0::c5@5': C81,
  'trompowsky-attack::0::Nd7@7': C80,
  'trompowsky-attack::0::cxd4@9': C81,
  'trompowsky-attack::0::Nf6@9': C81,
  'trompowsky-attack::1::c5@7': C82,
  'trompowsky-attack::1::c6@7': C82,
  'trompowsky-attack::1::Nc6@7': C82,
  'trompowsky-attack::1::Bf5@7': C82,
  'trompowsky-attack::1::Be7@7': C82,
  'trompowsky-attack::1::Bb4+@7': C82,
  'trompowsky-attack::1::g6@7': C82,
  'trompowsky-attack::1::Be6@7': C82,
  'trompowsky-attack::1::c6@9': C82,
  'trompowsky-attack::1::Be6@9': C82,
  'trompowsky-attack::2::Bb4@9': C83,
  'trompowsky-attack::2::gxf6@7': C83,
  'trompowsky-attack::2::c5@9': C83,
  'trompowsky-attack::2::Nc6@9': C83,
  'trompowsky-attack::2::d5@9': C83,
  'trompowsky-attack::2::b6@9': C83,
  'trompowsky-attack::2::g6@9': C83,
  'trompowsky-attack::2::e5@9': C83,
  'trompowsky-attack::2::c5@5': C83,
  'trompowsky-attack::2::g6@11': C83,
  'trompowsky-attack::3::g6@13': C84,
  'trompowsky-attack::3::Bg4@13': C84,
  'trompowsky-attack::3::Nbd7@13': C84,
  'trompowsky-attack::3::a6@9': C84,
  'trompowsky-attack::3::d6@9': C84,
  'trompowsky-attack::3::e5@11': C84,
  'trompowsky-attack::3::a6@13': C84,
  'trompowsky-attack::3::e5@13': C84,
  'trompowsky-attack::3::e6@9': C84,
  'trompowsky-attack::3::g6@9': C84,
  'trompowsky-attack::5::d5@5': C80,
  'trompowsky-attack::5::g6@9': C81,
  'trompowsky-attack::5::d6@9': C81,
  'trompowsky-attack::5::c4@9': C81,
  'trompowsky-attack::5::d6@5': C80,
  'trompowsky-attack::5::e6@5': C80,
  'trompowsky-attack::5::e6@7': C81,
  'trompowsky-attack::5::d6@13': C81,
  'trompowsky-attack::5::d6@7': C81,
  'trompowsky-attack::5::Qa5+@11': C81,
  'trompowsky-attack::6::Qa5+@7': C81,
  'trompowsky-attack::6::d6@9': ETRO,
  'trompowsky-attack::6::g5@7': C81,
  'trompowsky-attack::6::d5@5': C80,
  'trompowsky-attack::6::e6@9': C81,
  'trompowsky-attack::6::g6@9': C81,
  'trompowsky-attack::6::e6@11': C81,
  'trompowsky-attack::6::g6@11': C81,
  'trompowsky-attack::6::e6@13': C81,
  'trompowsky-attack::6::d6@5': C80,
  'trompowsky-attack::7::Nc6@19': C85,
  'trompowsky-attack::7::Nc6@17': C85,
  'trompowsky-attack::7::a6@19': C85,
  'trompowsky-attack::7::Bd7@19': C85,
  'trompowsky-attack::7::Bb4+@17': C85,
  'trompowsky-attack::7::Rd8@19': C85,
  'trompowsky-attack::7::Rg8@19': C85,
  'trompowsky-attack::7::b6@19': C85,
  'trompowsky-attack::7::Rg8@17': C85,
  'trompowsky-attack::7::a6@17': C85,
  // ── old-indian-defence ──
  'old-indian-defence::0::d5@14': C86,
  'old-indian-defence::0::Be3@14': C86,
  'old-indian-defence::0::Qc2@14': C86,
  'old-indian-defence::0::Bg5@14': C86,
  'old-indian-defence::0::Nf3@4': C87,
  'old-indian-defence::0::h3@12': C86,
  'old-indian-defence::0::b3@14': C86,
  'old-indian-defence::0::Be3@12': C86,
  'old-indian-defence::0::dxe5@14': C86,
  'old-indian-defence::1::Nf3@4': C87,
  'old-indian-defence::1::dxe5@10': C88,
  'old-indian-defence::1::g3@6': C88,
  'old-indian-defence::1::Nf3@6': C88,
  'old-indian-defence::1::Be3@10': C88,
  'old-indian-defence::1::Nge2@10': C88,
  'old-indian-defence::1::d5@8': C88,
  'old-indian-defence::1::dxe5@8': C88,
  'old-indian-defence::1::Bg5@6': C88,
  'old-indian-defence::1::Qb3@6': C88,
  'old-indian-defence::2::Nf3@4': C87,
  'old-indian-defence::2::h3@12': C86,
  'old-indian-defence::2::Be3@12': C86,
  'old-indian-defence::2::Nf3@6': C87,
  'old-indian-defence::2::d5@12': C86,
  'old-indian-defence::2::d5@8': C89,
  'old-indian-defence::2::Be3@16': C86,
  'old-indian-defence::2::Nge2@8': C89,
  'old-indian-defence::2::g3@6': C90,
  'old-indian-defence::2::f4@16': C86,
  'old-indian-defence::3::b3@14': C90,
  'old-indian-defence::3::dxe5@14': C90,
  'old-indian-defence::3::Nf3@4': C87,
  'old-indian-defence::3::Qc2@14': C90,
  'old-indian-defence::3::e4@8': WOLDE4,
  'old-indian-defence::3::h3@14': C90,
  'old-indian-defence::3::Bg5@14': C90,
  'old-indian-defence::3::Re1@14': C90,
  'old-indian-defence::3::d5@14': C90,
  'old-indian-defence::3::e3@14': C90,
  'old-indian-defence::4::Re1@14': C86,
  'old-indian-defence::4::Be3@14': C86,
  'old-indian-defence::4::Qc2@14': C86,
  'old-indian-defence::4::Bg5@14': C86,
  'old-indian-defence::4::Nf3@4': C87,
  'old-indian-defence::4::h3@12': C86,
  'old-indian-defence::4::b3@14': C86,
  'old-indian-defence::4::h3@16': C86,
  'old-indian-defence::4::Be3@12': C86,
  'old-indian-defence::5::Re1@14': C86,
  'old-indian-defence::5::Be3@14': C86,
  'old-indian-defence::5::Qc2@14': C86,
  'old-indian-defence::5::Bg5@14': C86,
  'old-indian-defence::5::Nf3@4': C87,
  'old-indian-defence::5::h3@12': C86,
  'old-indian-defence::5::b3@14': C86,
  'old-indian-defence::5::Be3@12': C86,
  'old-indian-defence::5::dxe5@14': C86,
  'old-indian-defence::6::Re1@14': C86,
  'old-indian-defence::6::d5@14': C86,
  'old-indian-defence::6::Be3@14': C86,
  'old-indian-defence::6::Bg5@14': C86,
  'old-indian-defence::6::Nf3@4': C87,
  'old-indian-defence::6::h3@12': C86,
  'old-indian-defence::6::b3@14': C86,
  'old-indian-defence::6::Be3@12': C86,
  'old-indian-defence::6::dxe5@14': C86,
  // ── english-opening ──
  'english-opening::0::Bd6@13': C91,
  'english-opening::0::Bb4@7': C92,
  'english-opening::0::f5@19': C91,
  'english-opening::0::Nd5@19': C91,
  'english-opening::0::Bc5@7': C92,
  'english-opening::0::Bc5@11': C91,
  'english-opening::0::Nd4@7': C92,
  'english-opening::0::Qd7@19': C91,
  'english-opening::0::Re8@17': C91,
  'english-opening::1::Bg4@17': C93,
  'english-opening::1::b5@19': C93,
  'english-opening::1::d6@9': C93,
  'english-opening::1::e6@9': C93,
  'english-opening::1::Qc7@17': C93,
  'english-opening::1::e5@17': C92,
  'english-opening::1::e5@9': C93,
  'english-opening::1::b6@19': C93,
  'english-opening::1::e6@17': C93,
  'english-opening::2::Re8@11': C92,
  'english-opening::2::Bxc3@11': C92,
  'english-opening::2::d5@11': C91,
  'english-opening::2::d5@7': WENGREVD,
  'english-opening::2::h6@11': C92,
  'english-opening::2::a6@11': C92,
  'english-opening::2::Bc5@7': C92,
  'english-opening::2::Nd4@7': C92,
  'english-opening::2::d6@5': C92,
  'english-opening::3::Bc5@5': C92,
  'english-opening::3::h6@15': C94,
  'english-opening::3::Nf6@5': C92,
  'english-opening::3::Ne7@17': C94,
  'english-opening::3::Be6@17': C94,
  'english-opening::3::d6@5': C92,
  'english-opening::3::Be6@15': C94,
  'english-opening::3::h6@17': C94,
  'english-opening::3::fxe4@15': C94,
  'english-opening::4::e6@9': C93,
  'english-opening::4::e5@9': C93,
  'english-opening::4::Nh6@9': C93,
  'english-opening::4::d6@11': C93,
  'english-opening::4::d5@13': C93,
  'english-opening::4::a6@13': C93,
  'english-opening::4::Nf6@5': C93,
  'english-opening::4::d5@11': C93,
  'english-opening::4::Bd7@15': C93,
  'english-opening::5::c5@13': C95,
  'english-opening::5::b6@13': C95,
  'english-opening::5::gxf6@11': C95,
  'english-opening::5::Be7@13': C95,
  'english-opening::5::Nc6@13': C95,
  'english-opening::5::c5@5': C95,
  'english-opening::5::h6@13': C95,
  'english-opening::5::Bd6@13': C95,
  'english-opening::5::Nc6@15': C95,
  'english-opening::5::e4@15': C95,
  'english-opening::6::a5@19': C91,
  'english-opening::6::a6@19': C91,
  'english-opening::6::Bd6@13': C91,
  'english-opening::6::Bb4@7': C92,
  'english-opening::6::a6@17': C91,
  'english-opening::6::Nd4@19': C91,
  'english-opening::6::f6@17': C91,
  'english-opening::6::Re8@17': C91,
  'english-opening::6::Bc5@7': C92,
  'english-opening::7::Bg4@17': C93,
  'english-opening::7::b5@19': C93,
  'english-opening::7::d6@9': C93,
  'english-opening::7::e6@9': C93,
  'english-opening::7::Qc7@17': C93,
  'english-opening::7::e5@17': C92,
  'english-opening::7::e5@9': C93,
  'english-opening::7::b6@19': C93,
  'english-opening::7::e6@17': C93,
  // ── reti-opening ──
  'reti-opening::0::d4@13': C96,
  'reti-opening::0::Bc5@13': C96,
  'reti-opening::0::Be7@15': C96,
  'reti-opening::0::Be7@13': C96,
  'reti-opening::0::Qc7@15': C96,
  'reti-opening::0::e6@9': C97,
  'reti-opening::0::Bd6@15': C96,
  'reti-opening::0::e6@11': C97,
  'reti-opening::0::Nc5@15': C96,
  'reti-opening::1::dxc4@13': C98,
  'reti-opening::1::b6@13': C97,
  'reti-opening::1::a6@13': C97,
  'reti-opening::1::c6@9': C97,
  'reti-opening::1::h6@13': C97,
  'reti-opening::1::Nxe4@19': C97,
  'reti-opening::1::Re8@13': C97,
  'reti-opening::1::dxc4@11': WRETIDXC,
  'reti-opening::1::Ne4@13': C97,
  'reti-opening::1::dxc4@9': C98,
  'reti-opening::2::Be7@9': C98,
  'reti-opening::2::Bd6@9': C98,
  'reti-opening::2::Nc6@9': C98,
  'reti-opening::2::Bc5@9': C98,
  'reti-opening::2::a6@9': C98,
  'reti-opening::2::b6@9': C98,
  'reti-opening::2::c6@9': C98,
  'reti-opening::2::Qxd1@13': C99,
  'reti-opening::2::Nc6@11': C98,
  'reti-opening::2::Nc6@15': C98,
  'reti-opening::3::dxe4@13': C96,
  'reti-opening::3::c6@5': C100,
  'reti-opening::3::d4@13': C96,
  'reti-opening::3::b6@13': C96,
  'reti-opening::3::c5@5': C97,
  'reti-opening::3::Bb7@19': C96,
  'reti-opening::3::Qc7@19': C96,
  'reti-opening::3::g6@5': C97,
  'reti-opening::3::b5@13': C96,
  'reti-opening::3::Bf5@5': C97,
  'reti-opening::4::c6@9': C97,
  'reti-opening::4::dxc4@9': C98,
  'reti-opening::4::dxc4@7': C98,
  'reti-opening::4::d4@7': C97,
  'reti-opening::4::b6@11': C97,
  'reti-opening::4::dxc4@5': C98,
  'reti-opening::4::cxd4@19': C97,
  'reti-opening::4::c5@7': C97,
  'reti-opening::4::dxc4@19': C98,
  'reti-opening::4::d4@11': C97,
  'reti-opening::5::Nf6@11': C99,
  'reti-opening::5::c6@11': C99,
  'reti-opening::5::Bf5@11': C99,
  'reti-opening::5::Bb4@13': C99,
  'reti-opening::5::Bg4@11': C99,
  'reti-opening::5::Nf6@13': C99,
  'reti-opening::5::Bg4@7': C101,
  'reti-opening::5::e6@11': C99,
  'reti-opening::5::Be6@11': C99,
  'reti-opening::5::a6@11': C99,
  'reti-opening::6::Rc8@17': C97,
  'reti-opening::6::h6@13': C97,
  'reti-opening::6::h6@15': C97,
  'reti-opening::6::Rc8@19': C97,
  'reti-opening::6::a5@17': C97,
  'reti-opening::6::Re8@17': C97,
  'reti-opening::6::dxc4@7': C98,
  'reti-opening::6::a5@19': C97,
  'reti-opening::6::Qc7@17': C97,
  'reti-opening::7::c5@5': C101,
  'reti-opening::7::f6@5': C101,
  'reti-opening::7::c6@15': C101,
  'reti-opening::7::Bg4@5': C101,
  'reti-opening::7::Bg4@11': C101,
  'reti-opening::7::g5@5': C101,
  'reti-opening::7::a5@15': C101,
  'reti-opening::7::Nf6@5': C101,
  'reti-opening::7::b6@11': C101,
  'reti-opening::7::b6@9': C101,
  // ── kings-indian-attack ──
  'kings-indian-attack::0::O-O@13': C102,
  'kings-indian-attack::0::Bc5@9': C102,
  'kings-indian-attack::0::Bb4@11': C102,
  'kings-indian-attack::0::e5@9': C102,
  'kings-indian-attack::0::Be7@11': C102,
  'kings-indian-attack::0::c5@5': C102,
  'kings-indian-attack::0::Be7@9': C102,
  'kings-indian-attack::0::Ng4@13': C102,
  'kings-indian-attack::0::Bd6@9': C102,
  'kings-indian-attack::1::Nf6@9': C103,
  'kings-indian-attack::1::e6@9': C104,
  'kings-indian-attack::1::e6@11': C104,
  'kings-indian-attack::1::Bg4@11': C103,
  'kings-indian-attack::1::e5@11': C103,
  'kings-indian-attack::1::d5@9': C103,
  'kings-indian-attack::1::e5@9': C103,
  'kings-indian-attack::1::Bg4@13': C103,
  'kings-indian-attack::1::Bd7@11': C103,
  'kings-indian-attack::1::a6@15': C103,
  'kings-indian-attack::2::Bg4@7': C105,
  'kings-indian-attack::2::Nd7@7': C105,
  'kings-indian-attack::2::Bg4@9': C105,
  'kings-indian-attack::2::Bg4@13': C105,
  'kings-indian-attack::2::Ne7@9': C105,
  'kings-indian-attack::2::Bg4@11': C105,
  'kings-indian-attack::2::f6@7': C105,
  'kings-indian-attack::2::Qc7@7': C105,
  'kings-indian-attack::2::Nf6@7': C105,
  'kings-indian-attack::2::f5@9': C105,
  'kings-indian-attack::3::Bd6@11': C104,
  'kings-indian-attack::3::Be6@11': C104,
  'kings-indian-attack::3::Bg4@11': C104,
  'kings-indian-attack::3::O-O@13': C104,
  'kings-indian-attack::3::h6@11': C104,
  'kings-indian-attack::3::e4@11': C104,
  'kings-indian-attack::3::dxe4@13': C104,
  'kings-indian-attack::3::Bf5@11': C104,
  'kings-indian-attack::3::Be6@13': C104,
  'kings-indian-attack::3::Bg4@13': C104,
  'kings-indian-attack::4::c5@5': C102,
  'kings-indian-attack::4::b6@7': C102,
  'kings-indian-attack::4::Nc6@7': C102,
  'kings-indian-attack::4::b6@13': C102,
  'kings-indian-attack::4::Qc7@15': C102,
  'kings-indian-attack::4::Qc7@13': C102,
  'kings-indian-attack::4::Be7@7': C102,
  'kings-indian-attack::4::Nc6@5': C102,
  'kings-indian-attack::4::g6@11': C102,
  'kings-indian-attack::4::Bc5@7': C102,
  'kings-indian-attack::5::Qc7@19': C106,
  'kings-indian-attack::5::b5@15': C102,
  'kings-indian-attack::5::f6@19': C106,
  'kings-indian-attack::5::b6@13': C102,
  'kings-indian-attack::5::Nf6@5': C104,
  'kings-indian-attack::5::Qc7@15': C102,
  'kings-indian-attack::5::Ba6@19': C106,
  'kings-indian-attack::5::e5@7': WKIAE5,
  'kings-indian-attack::5::Qc7@13': C102,
  'kings-indian-attack::5::d4@19': C106,
  'kings-indian-attack::6::Nbd7@11': C103,
  'kings-indian-attack::6::c5@11': C104,
  'kings-indian-attack::6::Nc6@11': C103,
  'kings-indian-attack::6::c6@11': C103,
  'kings-indian-attack::6::Nbd7@13': C103,
  'kings-indian-attack::6::c6@13': C105,
  'kings-indian-attack::6::Bg4@13': C103,
  'kings-indian-attack::6::Bg4@11': C103,
  'kings-indian-attack::6::c5@13': C104,
  'kings-indian-attack::6::Be6@13': C103,
  'kings-indian-attack::7::e5@13': C102,
  'kings-indian-attack::7::Bc5@9': C102,
  'kings-indian-attack::7::Bb4@11': C102,
  'kings-indian-attack::7::e5@9': C102,
  'kings-indian-attack::7::Be7@11': C102,
  'kings-indian-attack::7::c5@5': C102,
  'kings-indian-attack::7::Be7@9': C102,
  'kings-indian-attack::7::Ng4@13': C102,
  'kings-indian-attack::7::Bd6@9': C102,
  // ── birds-opening ──
  'birds-opening::0::c5@7': C107,
  'birds-opening::0::c6@7': C107,
  'birds-opening::0::c6@11': C107,
  'birds-opening::0::c5@9': C107,
  'birds-opening::0::a6@15': C107,
  'birds-opening::0::Nh6@7': C107,
  'birds-opening::0::e6@7': C107,
  'birds-opening::0::b6@11': C107,
  'birds-opening::0::c6@9': C107,
  'birds-opening::0::Nc6@7': C107,
  'birds-opening::1::f6@11': C108,
  'birds-opening::1::Nc6@11': C108,
  'birds-opening::1::Nge7@17': TBIRD,
  'birds-opening::1::Qh4+@11': C108,
  'birds-opening::1::Be6@17': C108,
  'birds-opening::1::Nd7@11': C108,
  'birds-opening::1::Ne7@11': C108,
  'birds-opening::1::Bf5@15': C108,
  'birds-opening::1::Be6@15': C108,
  'birds-opening::1::Ne7@15': C108,
  'birds-opening::2::c5@9': C109,
  'birds-opening::2::Bg4@9': C109,
  'birds-opening::2::Bg4@11': C109,
  'birds-opening::2::c6@11': C109,
  'birds-opening::2::Nc6@11': C109,
  'birds-opening::2::b6@11': C109,
  'birds-opening::2::Nc6@9': C109,
  'birds-opening::2::b6@13': C109,
  'birds-opening::2::Nbd7@11': C109,
  'birds-opening::2::Bf5@15': C109,
  'birds-opening::3::Be7@7': C109,
  'birds-opening::3::Bd6@7': C109,
  'birds-opening::3::Be7@11': C110,
  'birds-opening::3::cxd4@9': C109,
  'birds-opening::3::Nc6@7': C109,
  'birds-opening::3::Ne4@7': C109,
  'birds-opening::3::cxd4@11': C109,
  'birds-opening::3::c4@11': C109,
  'birds-opening::3::Nbd7@7': C109,
  'birds-opening::3::Bb4+@7': C109,
  'birds-opening::4::Nf6@5': C111,
  'birds-opening::4::e6@9': C111,
  'birds-opening::4::e3@5': C111,
  'birds-opening::4::d6@9': C111,
  'birds-opening::4::d5@5': C111,
  'birds-opening::4::g6@7': C111,
  'birds-opening::4::Nc6@7': C111,
  'birds-opening::4::e6@7': C111,
  'birds-opening::4::Nc6@9': C111,
  'birds-opening::4::g6@9': C111,
  'birds-opening::5::c5@9': C109,
  'birds-opening::5::Bg4@9': C109,
  'birds-opening::5::Bg4@11': C109,
  'birds-opening::5::Qc7@15': C109,
  'birds-opening::5::c6@11': C109,
  'birds-opening::5::Nc6@11': C109,
  'birds-opening::5::b6@11': C109,
  'birds-opening::5::Nc6@9': C109,
  'birds-opening::5::b6@13': C109,
  'birds-opening::5::d4@15': C109,
  'birds-opening::6::Nbd7@9': C109,
  'birds-opening::6::c5@9': C109,
  'birds-opening::6::h6@9': C109,
  'birds-opening::6::Bd6@9': C109,
  'birds-opening::6::Nc6@9': C109,
  'birds-opening::6::c6@9': C109,
  'birds-opening::6::c5@13': C110,
  'birds-opening::6::Bc5@9': C109,
  'birds-opening::6::Bb4@9': C109,
  'birds-opening::6::Nc6@7': C109,
  // ── albin-countergambit ──
  'albin-countergambit::0::Nbd2@14': C112,
  'albin-countergambit::0::a3@14': C112,
  'albin-countergambit::0::Qa4@14': C112,
  'albin-countergambit::0::Bf4@14': C112,
  'albin-countergambit::0::Bg5@14': C112,
  'albin-countergambit::0::b3@14': C112,
  'albin-countergambit::0::Re1@14': C112,
  'albin-countergambit::0::a3@8': C112,
  'albin-countergambit::0::Nbd2@8': C112,
  'albin-countergambit::0::e3@4': C112,
  'albin-countergambit::1::fxe3@10': DALBIN,
  'albin-countergambit::1::Qa4+@10': C113,
  'albin-countergambit::1::Nd2@8': C113,
  'albin-countergambit::1::Kxf2@12': C114,
  'albin-countergambit::1::Ke2@8': C113,
  'albin-countergambit::1::Nf3@6': C112,
  'albin-countergambit::1::e3@4': C112,
  'albin-countergambit::1::a3@6': C112,
  'albin-countergambit::1::e4@6': C115,
  'albin-countergambit::2::Nf3@8': C115,
  'albin-countergambit::2::e5@12': C115,
  'albin-countergambit::2::Bf4@8': C115,
  'albin-countergambit::2::Nf3@10': C115,
  'albin-countergambit::2::Bd3@8': C115,
  'albin-countergambit::2::Nf3@6': C112,
  'albin-countergambit::2::e6@10': C115,
  'albin-countergambit::2::e3@4': C112,
  'albin-countergambit::2::a3@6': C112,
  // ── englund-gambit ──
  'englund-gambit::0::Nc3@10': EENG,
  'englund-gambit::0::Nc3@8': C117,
  'englund-gambit::0::Nbd2@8': C117,
  'englund-gambit::0::Bxb4@12': C118,
  'englund-gambit::0::Qd2@8': C117,
  'englund-gambit::0::c3@8': C117,
  'englund-gambit::0::Qd3@12': C118,
  'englund-gambit::0::Nfd2@12': C118,
  'englund-gambit::0::Nxc3@14': C118,
  'englund-gambit::0::Nbd2@12': C118,
  // ── anti-benoni-push ──
  'anti-benoni-push::0::d6@13': C119,
  'anti-benoni-push::0::e6@5': EABEN,
  'anti-benoni-push::0::Bg7@13': C119,
  'anti-benoni-push::0::g6@5': C121,
  'anti-benoni-push::0::e5@5': C122,
  'anti-benoni-push::0::Bxa6@9': C119,
  'anti-benoni-push::0::d6@5': C121,
  'anti-benoni-push::0::Bg7@11': C119,
  'anti-benoni-push::0::e6@9': C119,
  'anti-benoni-push::1::Be7@11': C120,
  'anti-benoni-push::1::d6@7': C120,
  'anti-benoni-push::1::a6@11': C120,
  'anti-benoni-push::1::Nbd7@11': C120,
  'anti-benoni-push::1::a6@7': C120,
  'anti-benoni-push::1::Bg4@11': C120,
  'anti-benoni-push::1::Be7@7': C120,
  'anti-benoni-push::1::Qa5@11': C120,
  'anti-benoni-push::1::b5@5': C119,
  'anti-benoni-push::1::g6@5': C121,
  'anti-benoni-push::2::b5@5': C119,
  'anti-benoni-push::2::e6@5': EABEN,
  'anti-benoni-push::2::e5@5': C122,
  'anti-benoni-push::2::d6@5': C121,
  'anti-benoni-push::2::d6@7': C121,
  'anti-benoni-push::2::O-O@9': C121,
  'anti-benoni-push::2::d6@9': C121,
  'anti-benoni-push::2::e6@9': C120,
  'anti-benoni-push::2::a6@9': C121,
  'anti-benoni-push::2::Qa5@9': C121,
  'anti-benoni-push::3::b5@5': C119,
  'anti-benoni-push::3::e6@5': EABEN,
  'anti-benoni-push::3::Bd6@7': C122,
  'anti-benoni-push::3::a6@7': C122,
  'anti-benoni-push::3::g6@5': C121,
  'anti-benoni-push::3::d6@5': C121,
  'anti-benoni-push::3::O-O@11': C122,
  'anti-benoni-push::3::Nbd7@9': C122,
  'anti-benoni-push::3::g6@9': C122,
  'anti-benoni-push::3::Nbd7@11': C122,
  // ── anti-englund ──
  'anti-englund::0::Nxf3+@9': C123,
  'anti-englund::0::Nf6@9': C123,
  'anti-englund::0::d6@9': C124,
  'anti-englund::0::Nc6@9': C123,
  'anti-englund::0::Nf6@11': C123,
  'anti-englund::0::d6@11': C124,
  'anti-englund::0::d5@11': C123,
  'anti-englund::0::Nxf3+@11': C123,
  'anti-englund::0::g6@11': C123,
  'anti-englund::0::h6@11': C123,
  'anti-englund::1::f6@7': C124,
  'anti-englund::1::Be7@7': C124,
  'anti-englund::1::Nge7@7': C124,
  'anti-englund::1::Qe7@5': EAENG,
  'anti-englund::1::h6@9': C124,
  'anti-englund::1::dxe5@9': C124,
  'anti-englund::1::Nge7@5': C125,
  'anti-englund::1::f6@5': C124,
  'anti-englund::1::Qf5@9': C124,
  'anti-englund::1::Nxe5@9': C124,
  // ── anti-kid-saemisch ──
  'anti-kid-saemisch::0::d5@5': C126,
  'anti-kid-saemisch::0::O-O@7': C127,
  'anti-kid-saemisch::0::Nc6@11': C128,
  'anti-kid-saemisch::0::e5@11': C129,
  'anti-kid-saemisch::0::a6@11': C127,
  'anti-kid-saemisch::0::Nbd7@11': C127,
  'anti-kid-saemisch::0::b6@11': C127,
  'anti-kid-saemisch::0::c6@11': C127,
  'anti-kid-saemisch::0::c6@9': C127,
  'anti-kid-saemisch::0::a6@9': C127,
  'anti-kid-saemisch::1::d5@5': C126,
  'anti-kid-saemisch::1::O-O@7': C127,
  'anti-kid-saemisch::1::c5@11': TAKID,
  'anti-kid-saemisch::1::e5@11': C129,
  'anti-kid-saemisch::1::a6@11': C127,
  'anti-kid-saemisch::1::Nbd7@11': C127,
  'anti-kid-saemisch::1::b6@11': C127,
  'anti-kid-saemisch::1::c6@11': C127,
  'anti-kid-saemisch::1::c6@9': C127,
  'anti-kid-saemisch::1::a6@9': C127,
  'anti-kid-saemisch::2::d5@5': C126,
  'anti-kid-saemisch::2::O-O@7': C127,
  'anti-kid-saemisch::2::c5@11': C126,
  'anti-kid-saemisch::2::Nc6@11': C128,
  'anti-kid-saemisch::2::a6@11': C127,
  'anti-kid-saemisch::2::Nbd7@11': C127,
  'anti-kid-saemisch::2::b6@11': C127,
  'anti-kid-saemisch::2::c6@11': C127,
  'anti-kid-saemisch::2::c6@9': C127,
  'anti-kid-saemisch::2::a6@9': C127,
  'anti-kid-saemisch::3::d5@5': C126,
  'anti-kid-saemisch::3::O-O@7': C127,
  'anti-kid-saemisch::3::c5@11': C126,
  'anti-kid-saemisch::3::Nc6@11': C128,
  'anti-kid-saemisch::3::e5@11': C129,
  'anti-kid-saemisch::3::Nbd7@11': C127,
  'anti-kid-saemisch::3::b6@11': C127,
  'anti-kid-saemisch::3::c6@11': C127,
  'anti-kid-saemisch::3::c6@9': C127,
  'anti-kid-saemisch::3::a6@9': C127,
  'anti-kid-saemisch::4::d5@5': C126,
  'anti-kid-saemisch::4::O-O@7': C127,
  'anti-kid-saemisch::4::c5@11': C126,
  'anti-kid-saemisch::4::Nc6@11': C128,
  'anti-kid-saemisch::4::e5@11': C129,
  'anti-kid-saemisch::4::a6@11': C127,
  'anti-kid-saemisch::4::b6@11': C127,
  'anti-kid-saemisch::4::c6@11': C127,
  'anti-kid-saemisch::4::c6@9': C127,
  'anti-kid-saemisch::4::a6@9': C127,
  // ── anti-grunfeld-exchange ──
  'anti-grunfeld-exchange::0::Bg7@5': C130,
  'anti-grunfeld-exchange::0::O-O@13': C131,
  'anti-grunfeld-exchange::0::c5@11': C131,
  'anti-grunfeld-exchange::1::Bg7@5': C130,
  'anti-grunfeld-exchange::1::c5@13': TAGRU,
  'anti-grunfeld-exchange::1::c5@11': C131,
  // ── anti-nimzo-qc2 ──
  'anti-nimzo-qc2::0::d5@5': C132,
  'anti-nimzo-qc2::0::d5@7': C132,
  'anti-nimzo-qc2::0::c5@7': C133,
  'anti-nimzo-qc2::0::c5@5': C132,
  'anti-nimzo-qc2::0::d6@7': C134,
  'anti-nimzo-qc2::0::Nc6@7': C134,
  'anti-nimzo-qc2::0::b6@7': C133,
  'anti-nimzo-qc2::1::O-O@7': C135,
  'anti-nimzo-qc2::1::d5@5': C132,
  'anti-nimzo-qc2::1::c5@7': C133,
  'anti-nimzo-qc2::1::c5@5': C132,
  'anti-nimzo-qc2::1::d6@7': C134,
  'anti-nimzo-qc2::1::Nc6@7': C134,
  'anti-nimzo-qc2::1::Qxd5@9': EANIM,
  'anti-nimzo-qc2::1::b6@7': C133,
  'anti-nimzo-qc2::2::O-O@7': C135,
  'anti-nimzo-qc2::2::d5@5': C132,
  'anti-nimzo-qc2::2::d5@7': C132,
  'anti-nimzo-qc2::2::c5@5': C132,
  'anti-nimzo-qc2::2::d6@7': C134,
  'anti-nimzo-qc2::2::Nc6@7': C134,
  'anti-nimzo-qc2::2::Bxc5@9': C133,
  'anti-nimzo-qc2::2::Na6@9': C133,
  'anti-nimzo-qc2::2::b6@7': C133,
  'anti-nimzo-qc2::2::Qc7@9': C133,
  // ── anti-qid-fianchetto ──
  'anti-qid-fianchetto::0::d5@5': C136,
  'anti-qid-fianchetto::0::Bb4+@5': C137,
  'anti-qid-fianchetto::0::c5@5': C136,
  'anti-qid-fianchetto::0::Bb7@7': C138,
  'anti-qid-fianchetto::0::Bb4+@7': C137,
  'anti-qid-fianchetto::0::Bb7@9': C139,
  'anti-qid-fianchetto::0::d5@9': C139,
  'anti-qid-fianchetto::0::b5@9': C139,
  'anti-qid-fianchetto::1::d5@5': C136,
  'anti-qid-fianchetto::1::Bb4+@5': C137,
  'anti-qid-fianchetto::1::Ba6@7': EAQID,
  'anti-qid-fianchetto::1::c5@5': C136,
  'anti-qid-fianchetto::1::Bb4+@7': C137,
  // ── anti-dutch-staunton ──
  'anti-dutch-staunton::0::d5@5': C140,
  'anti-dutch-staunton::0::g6@7': C141,
  'anti-dutch-staunton::0::c6@7': C142,
  'anti-dutch-staunton::0::e6@7': C142,
  'anti-dutch-staunton::1::d5@5': C140,
  'anti-dutch-staunton::1::Nc6@7': C142,
  'anti-dutch-staunton::1::c6@7': C142,
  'anti-dutch-staunton::1::e6@7': C142,
  'anti-dutch-staunton::1::exf3@9': C142,
  'anti-dutch-staunton::1::dxe4@11': EADUT,
  'anti-dutch-staunton::1::e3@9': C142,
  'anti-dutch-staunton::2::d5@5': C140,
  'anti-dutch-staunton::2::Nc6@7': C142,
  'anti-dutch-staunton::2::g6@7': C141,
  'anti-dutch-staunton::2::exf3@11': C142,
  'anti-dutch-staunton::2::d5@11': C141,
  'anti-dutch-staunton::2::e6@7': C142,
  'anti-dutch-staunton::2::d5@9': C141,
  'anti-dutch-staunton::2::e3@11': C142,
  'anti-dutch-staunton::2::exf3@9': C141,
  'anti-dutch-staunton::2::e3@9': C141,
  // ── anti-qgd-exchange ──
  'anti-qgd-exchange::0::c6@7': C143,
  'anti-qgd-exchange::0::Qxd5@5': C144,
  'anti-qgd-exchange::0::Bb4@7': C143,
  'anti-qgd-exchange::0::c5@7': C143,
  'anti-qgd-exchange::0::Be6@7': C145,
  'anti-qgd-exchange::0::Nf6@5': C145,
  'anti-qgd-exchange::0::Nc6@7': C145,
  'anti-qgd-exchange::0::Be7@9': C145,
  'anti-qgd-exchange::0::h6@11': C143,
  'anti-qgd-exchange::0::Bf5@11': C145,
  'anti-qgd-exchange::1::c6@7': C143,
  'anti-qgd-exchange::1::Qxd5@5': C144,
  'anti-qgd-exchange::1::Bb4@7': C143,
  'anti-qgd-exchange::1::c5@7': C143,
  'anti-qgd-exchange::1::Be6@7': C145,
  'anti-qgd-exchange::1::Nf6@5': C145,
  'anti-qgd-exchange::1::Nc6@7': C145,
  'anti-qgd-exchange::1::c6@9': EAQGD,
  'anti-qgd-exchange::1::Bb4@9': C145,
  'anti-qgd-exchange::1::Nbd7@9': C145,
  // ── anti-budapest ──
  'anti-budapest::0::Ne4@5': C146,
  'anti-budapest::0::g5@7': C147,
  'anti-budapest::0::Bb4+@7': C147,
  'anti-budapest::1::Nc6@7': EABUD,
  'anti-budapest::1::Ne4@5': C146,
  'anti-budapest::1::Bb4+@7': C147,
  'anti-budapest::1::Nc6@9': C147,
  'anti-budapest::2::Nc6@7': EABUD,
  'anti-budapest::2::Ne4@5': C146,
  'anti-budapest::2::g5@7': C147,
  // ── anti-london-black ──
  'anti-london-black::0::Nf3@8': C148,
  'anti-london-black::0::Nd2@8': C148,
  'anti-london-black::0::b3@8': C148,
  'anti-london-black::0::Be2@8': C148,
  'anti-london-black::0::h3@8': C148,
  'anti-london-black::0::a4@8': C148,
  'anti-london-black::0::Nf3@6': C148,
  'anti-london-black::0::e4@4': C149,
  'anti-london-black::0::Nc3@6': C148,
  'anti-london-black::0::c3@4': C148,
  'anti-london-black::1::c3@8': C148,
  'anti-london-black::1::b3@8': C148,
  'anti-london-black::1::Nc3@8': C148,
  'anti-london-black::1::Be2@8': C148,
  'anti-london-black::1::Nbd2@8': C148,
  'anti-london-black::1::c3@6': EALON,
  'anti-london-black::1::e4@4': C149,
  'anti-london-black::1::Nc3@6': C148,
  'anti-london-black::1::c3@4': C148,
  'anti-london-black::1::Nc3@4': C148,
  // ── anti-catalan-black ──
  'anti-catalan-black::0::Nf3@4': C150,
  'anti-catalan-black::0::Nc3@4': C151,
  'anti-catalan-black::0::Nf3@6': C152,
  'anti-catalan-black::0::Ne5@10': C152,
  'anti-catalan-black::0::Qa4+@8': C153,
  'anti-catalan-black::0::a4@10': C150,
  'anti-catalan-black::1::Nf3@4': C150,
  'anti-catalan-black::1::Nc3@4': C151,
  'anti-catalan-black::1::Nf3@6': C152,
  'anti-catalan-black::1::Nf3@8': EACAT,
  'anti-catalan-black::1::Nf3@10': C153,
  'anti-catalan-black::1::Nd2@10': C153,
  'anti-catalan-black::1::Be3@12': C153,
  'anti-catalan-black::1::Qd3@12': C153,
  'anti-catalan-black::1::Nf3@12': C153,
  'anti-catalan-black::1::Nc3@10': C153,
  // ── anti-colle-black ──
  'anti-colle-black::0::c4@4': C154,
  'anti-colle-black::0::Bf4@4': C155,
  'anti-colle-black::0::g3@4': C156,
  'anti-colle-black::0::Bg5@4': C155,
  'anti-colle-black::0::c3@6': C157,
  'anti-colle-black::0::dxc5@6': C158,
  'anti-colle-black::0::Nbd2@6': C156,
  'anti-colle-black::0::b3@6': C154,
  'anti-colle-black::0::Be2@6': C157,
  'anti-colle-black::0::Bd3@6': C157,
  'anti-colle-black::1::c4@4': C154,
  'anti-colle-black::1::Bf4@4': C155,
  'anti-colle-black::1::g3@4': C156,
  'anti-colle-black::1::Bg5@4': C155,
  'anti-colle-black::1::c4@6': C154,
  'anti-colle-black::1::dxc5@6': C158,
  'anti-colle-black::1::Nbd2@6': C156,
  'anti-colle-black::1::b3@6': C154,
  'anti-colle-black::1::Be2@6': C157,
  'anti-colle-black::1::Nbd2@8': C154,
  'anti-colle-black::2::c4@4': C154,
  'anti-colle-black::2::b4@8': C158,
  'anti-colle-black::2::Bf4@4': C155,
  'anti-colle-black::2::Bb5+@8': C158,
  'anti-colle-black::2::c4@8': C154,
  'anti-colle-black::2::Nc3@8': C158,
  'anti-colle-black::2::Be2@8': C158,
  'anti-colle-black::2::g3@4': C156,
  'anti-colle-black::2::Bd3@8': C158,
  'anti-colle-black::2::c3@8': C158,
  'anti-colle-black::3::c4@4': C154,
  'anti-colle-black::3::Bf4@4': C155,
  'anti-colle-black::3::exd4@8': EACOL,
  'anti-colle-black::3::g3@4': C156,
  'anti-colle-black::3::Nxd4@8': C156,
  'anti-colle-black::3::Bg5@4': C155,
  'anti-colle-black::3::c4@6': C154,
  'anti-colle-black::3::c3@6': C157,
  'anti-colle-black::3::dxc5@6': C158,
  'anti-colle-black::3::b3@6': C154,
  'anti-colle-black::4::Bb2@8': C156,
  'anti-colle-black::4::c4@4': C154,
  'anti-colle-black::4::Bd3@8': C156,
  'anti-colle-black::4::Bf4@4': C155,
  'anti-colle-black::4::g3@4': C156,
  'anti-colle-black::4::Bg5@4': C155,
  'anti-colle-black::4::c4@6': C154,
  'anti-colle-black::4::c3@6': C157,
  'anti-colle-black::4::dxc5@6': C158,
  'anti-colle-black::4::Nbd2@6': C156,
  'anti-colle-black::5::c4@4': C154,
  'anti-colle-black::5::Bf4@4': C155,
  'anti-colle-black::5::g3@4': C156,
  'anti-colle-black::5::Bg5@4': C155,
  'anti-colle-black::5::c4@6': C154,
  'anti-colle-black::5::c3@6': C157,
  'anti-colle-black::5::dxc5@6': C158,
  'anti-colle-black::5::Nbd2@6': C156,
  'anti-colle-black::5::b3@6': C154,
  'anti-colle-black::5::Bd3@6': C157,
};
