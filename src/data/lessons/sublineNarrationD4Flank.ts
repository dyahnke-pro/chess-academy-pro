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
// london-system :: benoni_push
// london-system :: accel_indian
// london-system :: vs_kid
// london-system :: bf5_mirror
// london-system :: main_qgd
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
// reti-opening :: main_fianchetto
// reti-opening :: dxc4
// reti-opening :: qxd4_endgame
// reti-opening :: slav_reti
// reti-opening :: d4_advance
// kings-indian-attack :: french_setup
// kings-indian-attack :: double_fianchetto
// kings-indian-attack :: sicilian_setup
// kings-indian-attack :: caro_setup
// kings-indian-attack :: e5_tabiya
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
// DEEP TLON :: london-system::0::b6@15
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

// WAVE WBIRDC5 :: 1 keys
const WBIRDC5: SublineNarration = {
  intro: { say: "…c5 — Black grabs queenside space in your Classical Bird. Welcome it, and play the reversed-Dutch attack: plant the knight on the e5 outpost backed by the b2-bishop on the long diagonal, then reroute your pieces toward the kingside. The whole system aims at Black's king while he expands on the wing.", sayShort: "…c5 — plant Ne5, attack the king" },
  beats: [
    { atMove: 13, say: "…c5 stakes out queenside space. That's fine — your play is on the other wing, so let Black expand here while you build the kingside attack the Bird is made for.", sayShort: "…c5 — Black expands queenside", highlights: [_H('c5', KEY)] },
    { atMove: 14, say: "Ne5 — the knight slams into the e5 outpost, the dream square in the Bird, supported and unkickable. Backed by the b2-bishop raking the long diagonal, it's the spearhead of your kingside attack.", sayShort: "Ne5 — the outpost spearhead", highlights: [_H('e5', KEY), _H('g7', KEY)] },
    { atMove: 20, say: "Nd2 — reroute the second knight toward f3 and the kingside, massing your pieces where Black's king lives. Slow and inevitable: the Bird's attack builds while Black plays on the queenside.", sayShort: "Nd2 — reroute toward the king", highlights: [_H('d2', KEY)] },
  ],
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Bird%27s_Opening'],
};
// WAVE WTROC5 :: 1 keys
const WTROC5: SublineNarration = {
  intro: { say: "…c5 — Black counters in the centre, but you keep the bishop pair and grab space. Kick the e4-knight with f3, then roll d5 and e4 to clamp the position and shove Black's pieces back. You've dodged all his prepared d4 theory and you call the shots from a position of space.", sayShort: "…c5 — f3, then d5 and e4 clamp" },
  beats: [
    { atMove: 5, say: "…c5 strikes at d4 for counterplay. Follow the arrow — the pawn hits your centre — but you have a strong reply that gains time and space rather than conceding.", sayShort: "…c5 — hits your d4", arrows: [_A('c5', 'd4', ATK)], highlights: [_H('d4', KEY)] },
    { atMove: 6, say: "f3 — boot the e4-knight straight back. Follow the arrow: the pawn attacks the intruder, and his clever sortie has cost him time while you keep the bishop pair.", sayShort: "f3 — boot the knight back", arrows: [_A('f3', 'e4', ATK)], highlights: [_H('e4', KEY)] },
    { atMove: 10, say: "d5 — clamp the centre and grab space, shoving Black's pieces onto passive squares. You build at your own pace behind the broad pawn front.", sayShort: "d5 — clamp, grab space", highlights: [_H('d5', KEY)] },
    { atMove: 12, say: "e4 — the big centre is yours. With pawns on d5 and e4 you simply own more of the board, and Black must scramble for counterplay before you roll forward.", sayShort: "e4 — the big centre, yours", highlights: [_H('e4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'],
};
// WAVE WQGMERAN :: 1 keys
const WQGMERAN: SublineNarration = {
  intro: { say: "…e6 — Black settles into a solid Semi-Slav/Meran setup against your Queen's Gambit. Develop the Bd3 battery toward the kingside, and when Black frees with …dxc4 and …b5, answer in the centre: e4 builds the broad front and d5 clamps. Your space and the kingside-aiming pieces give a lasting initiative.", sayShort: "…e6 — build e4, then clamp d5" },
  beats: [
    { atMove: 7, say: "…e6 locks in the Meran structure — solid, but a touch passive. You develop smoothly and aim your pieces at the kingside while Black untangles.", sayShort: "…e6 — Black's Meran setup", highlights: [_H('e6', KEY)] },
    { atMove: 10, say: "Bd3 — the bishop slots in eyeing h7 and the kingside, the start of your attacking battery. Black will grab c4 and play …b5, but you welcome the open lines.", sayShort: "Bd3 — aim at the kingside", highlights: [_H('d3', KEY)] },
    { atMove: 18, say: "e4 — claim the broad centre. With the pawns rolling and your pieces aimed at the king, Black's queenside expansion suddenly looks slow next to your central pawn mass.", sayShort: "e4 — claim the broad centre", highlights: [_H('e4', KEY)] },
    { atMove: 20, say: "d5 — clamp the centre and grab even more space, fixing Black's structure and opening lines for your better-placed pieces. The initiative is firmly yours.", sayShort: "d5 — clamp, seize space", highlights: [_H('d5', KEY)] },
  ],
  sources: ['book:qgd', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// WAVE WQGDTAB :: 1 keys
const WQGDTAB: SublineNarration = {
  intro: { say: "Be2 — White's quiet developing move in the main QGD tabiya, and it's an admission that there's nothing here to attack. You've reached the fortress with …Qa5, …Bb4 and …O-O; now free the game on your terms with …dxc4, trade off, and reach a comfortable middlegame with no weaknesses and the …c5 or …e5 breaks in hand.", sayShort: "Be2 — free with …dxc4, no weaknesses" },
  beats: [
    { atMove: 16, say: "Be2 — modest and harmless; White has run out of pressure. This is your cue to free the position rather than sit and wait.", sayShort: "Be2 — White has no pressure", highlights: [_H('e2', KEY)] },
    { atMove: 17, say: "…dxc4 — the freeing capture. You hand back the centre tension and open lines for your pieces, dissolving any cramp; the …Bb4 pin already nags White's structure.", sayShort: "…dxc4 — free the position", highlights: [_H('c4', KEY)] },
    { atMove: 19, say: "…Nxf6 — recapture cleanly; your structure is sound and weakness-free. You've equalised comfortably and can press with …c5 or …e5 whenever the moment is right.", sayShort: "…Nxf6 — sound, weakness-free", highlights: [_H('f6', KEY)] },
    { atMove: 21, say: "…Qc7 — the queen settles on an active square, eyeing the kingside diagonal and supporting the …e5 break. Full equality reached; now you play for the win with active pieces.", sayShort: "…Qc7 — active, ready …e5", highlights: [_H('c7', KEY)] },
  ],
  sources: ['book:qgd', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'],
};
// WAVE WBENTAIM :: 1 keys
const WBENTAIM: SublineNarration = {
  intro: { say: "Bb5+ — the dangerous Taimanov, White's most testing anti-Benoni: the check disrupts you before the f4-e5 storm. Block calmly with …Nfd7, throw in …Qh4+ to provoke g3 and weaken White's dark squares, then retreat and castle. Weather the early aggression and your queenside pawn majority tells in the long game.", sayShort: "Bb5+ — block …Nfd7, then …Qh4+" },
  beats: [
    { atMove: 14, say: "Bb5+ checks before you're coordinated, the sharp Taimanov idea aimed at the f4-e5 break to come. Don't panic — you have a calm, solid block.", sayShort: "Bb5+ — the dangerous check", arrows: [_A('b5', 'e8', ATK)], highlights: [_H('e8', KEY)] },
    { atMove: 15, say: "…Nfd7 — block the check with the knight, keeping your structure intact and your king's path to safety open. The piece reroutes usefully toward e5 and b6 later.", sayShort: "…Nfd7 — block, stay solid", highlights: [_H('d7', KEY)] },
    { atMove: 17, say: "…Qh4+ — a clever zwischenzug: with f4 played, the diagonal to e1 is open (follow the arrow), so the check forces g3 and permanently loosens White's dark squares around his king.", sayShort: "…Qh4+ — force g3, loosen dark squares", arrows: [_A('h4', 'e1', ATK)], highlights: [_H('e1', KEY)] },
    { atMove: 21, say: "…O-O — king safely tucked away, the storm weathered. Now the Benoni's engine kicks in: your queenside pawn majority and the g7-bishop give you the long-term play.", sayShort: "…O-O — king safe, majority rolls", highlights: [_H('g8', KEY)] },
  ],
  sources: ['concept:pos-king-safety', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Modern_Benoni'],
};
// WAVE WCATNC6 :: 1 keys
const WCATNC6: SublineNarration = {
  intro: { say: "…Nc6 — Black develops and clings to the c4-pawn in the Open Catalan, but it's a loan. Prepare Qe2 and Qxc4 to collect it, and lean on the long diagonal with the g2-bishop. Black's queenside stays awkward to untangle while you enjoy the bind and the more comfortable game.", sayShort: "…Nc6 — prepare Qe2-Qxc4, then bind" },
  beats: [
    { atMove: 11, say: "…Nc6 develops and supports holding the c4-pawn. Don't chase it crudely; reroute your queen to collect it while the g2-bishop does the long-term work.", sayShort: "…Nc6 — Black holds c4", highlights: [_H('c6', KEY)] },
    { atMove: 14, say: "Qe2 — lining the queen up behind the c4-pawn, ready to regain it next move. Patient and methodical; the g2-bishop already binds the long light diagonal.", sayShort: "Qe2 — prepare to regain c4", highlights: [_H('e2', KEY)] },
    { atMove: 16, say: "Qxc4 — pawn back, and the bind tells: the g2-bishop chokes the long diagonal while Black scrambles to free his queenside. You hold the easier, more pleasant game.", sayShort: "Qxc4 — pawn back, the bind tells", highlights: [_H('c4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};

// WAVE WRETIQXD :: 1 keys
const WRETIQXD: SublineNarration = {
  intro: { say: "…Qxd1 — Black trades queens to defuse your Réti, but the resulting endgame plays to your strengths. Recapture with the rook onto the open d-file, plant a knight on the e5 outpost, and lean on the long diagonal with the g2-bishop. With no queens to create counterplay, your slightly better coordination becomes a lasting, grindable edge.", sayShort: "…Qxd1 — Rxd1, grind the endgame" },
  beats: [
    { atMove: 13, say: "…Qxd1 swaps queens, hoping the endgame is dry. It isn't quite — your pieces are the more active, and you'll claim the open file before Black coordinates.", sayShort: "…Qxd1 — queens off", highlights: [_H('d1', KEY)] },
    { atMove: 14, say: "Rxd1 — recapture straight onto the open d-file, the rook eyeing d7 and Black's development. This file is your highway into the position.", sayShort: "Rxd1 — seize the open d-file", highlights: [_H('d1', KEY)] },
    { atMove: 18, say: "Ne5 — the knight leaps to the e5 outpost, central and unkickable, pressuring c6, d7 and f7. From here you squeeze the endgame; Black has equalised on the board but not in piece activity.", sayShort: "Ne5 — the central outpost", highlights: [_H('e5', KEY)] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
// WAVE WKIAB5 :: 1 keys
const WKIAB5: SublineNarration = {
  intro: { say: "…b5 — Black expands on the queenside in your King's Indian Attack. Let him; you resolve the centre with exd5 and then clamp with d4, fixing the structure before turning to the kingside. Meet the …b5 advance with a4 to open a file on that wing while your pieces aim where the KIA always strikes: at Black's king.", sayShort: "…b5 — exd5, clamp d4, hit a4" },
  beats: [
    { atMove: 15, say: "…b5 grabs queenside space. You don't fear it — resolve the centre first, then you'll undermine the pawn with a4 while your real play builds on the kingside.", sayShort: "…b5 — Black expands queenside", highlights: [_H('b5', KEY)] },
    { atMove: 18, say: "d4 — clamp the centre and fix the structure, gaining space and a stable base. With the centre settled, your pieces are free to swing toward Black's king.", sayShort: "d4 — clamp the centre", highlights: [_H('d4', KEY)] },
    { atMove: 20, say: "a4 — strike at the b5-pawn to crack open the a-file and the queenside, giving your rooks a target while the kingside build-up continues. Play on both wings, pressure everywhere.", sayShort: "a4 — undermine b5, open the file", highlights: [_H('a4', KEY), _H('b5', KEY)] },
  ],
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
// WAVE WSLAVG6 :: 1 keys
const WSLAVG6: SublineNarration = {
  intro: { say: "Be2 — White develops quietly in the Schlechter Slav, where you've fianchettoed with …g6. Castle, then trade White's active f3-knight with …Bg4 and …Bxf3 before you commit the centre, and grab the pawn with …dxc4 once the bishop is gone. You reach a sound, harmonious game where your fianchettoed bishop has no rival.", sayShort: "Be2 — castle, trade with …Bg4" },
  beats: [
    { atMove: 10, say: "Be2 — modest development; White isn't trying to refute you, so build your harmonious Schlechter setup at ease.", sayShort: "Be2 — quiet development", highlights: [_H('e2', KEY)] },
    { atMove: 13, say: "…Bg4 — pin and pressure the f3-knight, White's most active piece. Trading it (follow the arrow) eases any pressure on your centre and frees you to grab on c4.", sayShort: "…Bg4 — pressure the f3-knight", arrows: [_A('g4', 'f3', ATK)], highlights: [_H('f3', KEY)] },
    { atMove: 15, say: "…Bxf3 — trade off the knight, and now …dxc4 wins a pawn or frees the game on your terms. Your g7-bishop reigns on the long diagonal with no opposite number.", sayShort: "…Bxf3 — trade, then …dxc4", highlights: [_H('f3', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Slav_Defense'],
};
// WAVE WQGAGAR :: 1 keys
const WQGAGAR: SublineNarration = {
  intro: { say: "O-O — White castles in this QGA where you've solved your light bishop early with …Bg4 and …Bh5. Now develop actively: …Bb4 pins the c3-knight to fight for the centre, complete development, and free the game with the …c5 break. With your problem piece already outside the chain, you reach an easy, comfortable middlegame.", sayShort: "O-O — …Bb4 pin, then …c5" },
  beats: [
    { atMove: 14, say: "O-O — White tucks the king away. Your light bishop is already happily outside the pawn chain on h5, so you have no opening problems left to solve — just develop and strike.", sayShort: "O-O — your bishop's already free", highlights: [_H('h5', KEY)] },
    { atMove: 15, say: "…Bb4 — pin the c3-knight, the guardian of e4 and d5, to fight for the centre. You develop with purpose while nagging White's grip on the key squares.", sayShort: "…Bb4 — pin c3, fight the centre", arrows: [_A('b4', 'c3', ATK)], highlights: [_H('c3', KEY)] },
    { atMove: 23, say: "…c5 — the freeing break at last, striking d4 and opening the position for your well-placed pieces. Any trace of White's space edge dissolves; you have a full, comfortable game.", sayShort: "…c5 — the freeing break", highlights: [_H('c5', KEY), _H('d4', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
// WAVE WOLDH3 :: 4 keys
const WOLDH3: SublineNarration = {
  intro: { say: "h3 — a quiet luft in the Old Indian; White isn't forcing anything, so pick your freeing moment. Release the centre with …exd4, and reroute the knight to the superb c5 outpost where it eyes e4, d3 and b3. The Old Indian is cramped but bombproof — you manoeuvre patiently and the well-placed knight gives you a fully equal game.", sayShort: "h3 — free with …exd4, knight to c5" },
  beats: [
    { atMove: 14, say: "h3 is a slow prophylactic move — White gives you time, so use it to free your cramped position rather than sit and wait.", sayShort: "h3 — White marks time", highlights: [_H('h3', KEY)] },
    { atMove: 15, say: "…exd4 — release the central tension on your terms, opening lines for your pieces and clearing e5 for a knight. The cramp eases the moment the centre opens.", sayShort: "…exd4 — free the position", highlights: [_H('d4', KEY)] },
    { atMove: 17, say: "…Nc5 — the knight lands on its dream outpost, eyeing e4, d3 and b3 and impossible to chase. From this strong square your once-cramped position springs to full, comfortable life.", sayShort: "…Nc5 — the dream outpost", highlights: [_H('c5', KEY)] },
  ],
  sources: ['book:old-indian-defence', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Old_Indian_Defense'],
};
// WAVE WALBLASK :: 1 keys
const WALBLASK: SublineNarration = {
  intro: { say: "fxe3 — White recaptures, and you spring the Lasker Trap. …Qh4+ rakes the diagonal opened by that very recapture, and after g3 the killer is …Qe4! — forking the e3-pawn and the h1-rook at once. You regain the material with a clean, equal game; the trap that punishes White's greed in the Albin, sprung perfectly.", sayShort: "fxe3 — …Qh4+ then …Qe4! forks" },
  beats: [
    { atMove: 10, say: "fxe3 — White grabs the pawn, but the recapture fatally opens the e1-h4 diagonal toward his own uncastled king. That is exactly what you were baiting.", sayShort: "fxe3 — the diagonal opens", highlights: [_H('e3', KEY)] },
    { atMove: 11, say: "…Qh4+ — the trap springs. With f2 vacated, the queen checks straight down the open diagonal (follow the arrow) and White must block with g3, weakening himself further.", sayShort: "…Qh4+ — check down the diagonal", arrows: [_A('h4', 'e1', ATK)], highlights: [_H('e1', KEY)] },
    { atMove: 13, say: "…Qe4! — the killer. The queen centralises and forks two targets at once: the e3-pawn and the h1-rook down the long diagonal (follow the arrow). You win the material straight back with a clean, equal game.", sayShort: "…Qe4 — fork e3 and h1", arrows: [_A('e4', 'h1', ATK)], highlights: [_H('e4', KEY), _H('e3', KEY)] },
    { atMove: 17, say: "…Qxe3+ — collecting the pawn back with check, and after the queen trade you emerge fully equal, having punished White's grab. The Albin's most famous trap, executed.", sayShort: "…Qxe3+ — regain, then equal", highlights: [_H('e3', KEY)] },
  ],
  sources: ['concept:tac-trap', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Albin_Countergambit'],
};
// WAVE WENGRAID :: 1 keys
const WENGRAID: SublineNarration = {
  intro: { say: "Bxb4 — the trades clear the way for the Englund's notorious queen raid: …Qxa1, snatching the rook in the corner. Be clear-eyed — this is a desperado surprise, not a sound line: your queen is buried deep in White's camp and must scramble out, and with accurate play White stands better. Play it for the trap value and the practical chance that White goes wrong.", sayShort: "…Bxb4 — the risky …Qxa1 raid" },
  beats: [
    { atMove: 12, say: "Bxb4 — White trades to open lines toward your raiding queen on b2. You recapture and the corner rook beckons, but tread knowingly: this grab is double-edged at best.", sayShort: "Bxb4 — trades open lines", highlights: [_H('b4', KEY)] },
    { atMove: 13, say: "…Nxb4 — recapture, eyeing the a1-rook and keeping the knight active near White's queenside. The raid is on, but so is the risk to your adventuring pieces.", sayShort: "…Nxb4 — recapture, eye a1", highlights: [_H('a1', KEY)] },
    { atMove: 15, say: "…Qxa1 — you snatch the rook, but now the truth: your queen is marooned in the corner and White will hunt it with a3, Kc1 and the minor pieces. Material in hand, but you must find …Be6 and …Ba2 to free her — a practical gamble, not equality.", sayShort: "…Qxa1 — grab it, queen in peril", highlights: [_H('a1', KEY)] },
  ],
  sources: ['concept:pos-initiative', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Englund_Gambit'],
};
// WAVE WNIMNE2 :: 1 keys
const WNIMNE2: SublineNarration = {
  intro: { say: "Ne2 — White sidesteps the doubled pawns by recapturing on c3 with the knight rather than a pawn. Strike before he coordinates: …Ne4 plants a knight in the heart of the position, and after the trades you reach a comfortable game where White's slow Ne2 has cost him time and central control.", sayShort: "Ne2 — punish with …Ne4" },
  beats: [
    { atMove: 8, say: "Ne2 avoids the doubled c-pawns, but the knight sits passively and surrenders central control. That's your cue to seize the centre.", sayShort: "Ne2 — passive, cedes the centre", highlights: [_H('e2', KEY)] },
    { atMove: 9, say: "…Ne4 — the knight leaps to the strongest square on the board, eyeing c3, d2 and f2 and daring White to challenge it. You've grabbed the initiative the awkward Ne2 handed you.", sayShort: "…Ne4 — seize the centre", highlights: [_H('e4', KEY)] },
    { atMove: 11, say: "…Nxd2 — trade into a comfortable game with the bishop pair contained and no weaknesses. White's wasted tempo on Ne2 leaves you fully equal with the easier plan.", sayShort: "…Nxd2 — trade, stay comfortable", highlights: [_H('d2', KEY)] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence'],
};

const LN01: SublineNarration = {
  intro: { say: "Black releases the central tension with …cxd4. You recapture exd4, and the London turns into a small-centre middlegame: the e-file opens for your rook and the Bb5xc6 plan looms, ready to wreck Black's queenside pawns.", sayShort: "…cxd4 — recapture, then Bb5xc6" },
  beats: [
    { atMove: 10, say: "exd4 — recapture toward the centre. The e-file swings open for your rook and you keep a healthy, mobile d-pawn. Black has nothing to attack while you build.", sayShort: "exd4 — open the e-file", highlights: [_H('d4'), _H('e1')] },
    { atMove: 12, say: "Bb5 — the key London idea against …Nc6. The bishop eyes the knight, preparing Bxc6 to leave Black with doubled, immobile c-pawns you can blockade at leisure.", sayShort: "Bb5 — target the c6-knight", arrows: [_A('b5', 'c6')] },
    { atMove: 14, say: "Bxc6+ — taking the moment Black plays …a6. Those doubled c-pawns are a permanent weakness; your knights will route to b3 and d2 to clamp c4 and c5.", sayShort: "Bxc6+ — saddle the doubled pawns", highlights: [_H('c6')] },
    { atMove: 20, say: "Nb3 — the blockading knight heads for c5 and a5, fixing Black's shattered queenside. Same material, far healthier structure — you are simply better.", sayShort: "Nb3 — blockade c5", highlights: [_H('c5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN02: SublineNarration = {
  intro: { say: "Black offers the bishop trade with …Bd6. You insert Bb5+ first, swap on c6 to double the pawns, then take on d6 — emerging with the better structure and the queen swinging to a4-a3 to needle the dark squares.", sayShort: "…Bd6 — Bb5+ then Bxc6, better pawns" },
  beats: [
    { atMove: 10, say: "Bb5+ — the zwischenzug. Before trading bishops you provoke a concession on the queenside, where Black is about to take on damaged pawns.", sayShort: "Bb5+ — provoke first", arrows: [_A('b5', 'e8')] },
    { atMove: 12, say: "Bxc6+ — doubling the c-pawns. Black's queenside is now permanently weak, and only then do you resolve the bishop trade on d6.", sayShort: "Bxc6+ — double the c-pawns", highlights: [_H('c6')] },
    { atMove: 16, say: "Qa4 — the queen pounces on the light squares Black can no longer cover. Heading to a3, it pressures the backward queenside and the d6-pawn.", sayShort: "Qa4 — into the soft squares", arrows: [_A('a4', 'a3')] },
    { atMove: 22, say: "Rc1 — the rook claims the half-open c-file aimed straight at the doubled c-pawns. Patient pressure on a fixed weakness is the whole game.", sayShort: "Rc1 — pile on the c-file", arrows: [_A('c1', 'c6')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN03: SublineNarration = {
  intro: { say: "Black plays the modest …Be7. With the centre fixed you grab queenside and kingside space at once — h3 and g4 to roll the kingside, a4 to gain on the queenside, and the e3-e4 break waiting in the wings.", sayShort: "…Be7 — h3, g4, then e4" },
  beats: [
    { atMove: 12, say: "h3 — a useful prophylactic move, taking g4 away from Black's pieces and preparing your own pawn storm on that wing.", sayShort: "h3 — prep the g4 storm", highlights: [_H('g4')] },
    { atMove: 14, say: "g4 — the space-gaining thrust. With Black's centre static, you expand on the kingside, cramping the knight and bishop and opening lines toward the king.", sayShort: "g4 — seize kingside space", arrows: [_A('g4', 'g5')] },
    { atMove: 16, say: "a4 — the other wing. You squeeze on both sides while Black has no active break, the hallmark of a healthy London bind.", sayShort: "a4 — squeeze the queenside", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "e4 — the central break finally lands. With both wings clamped, opening the centre catches Black's passive pieces flat-footed.", sayShort: "e4 — break in the centre", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN04: SublineNarration = {
  intro: { say: "Black grabs space with …c4, locking the queenside. You undermine it immediately with b3 — prising the pawn loose, then leaning on the doubled queenside pawns with Bb5xc6 and Ra5.", sayShort: "…c4 — b3 to undermine" },
  beats: [
    { atMove: 10, say: "b3 — striking at the head of Black's pawn chain at once. If …cxb3 axb3, the a-file opens for your rook and Black's overextension tells.", sayShort: "b3 — undermine the c4-pawn", arrows: [_A('b3', 'c4')] },
    { atMove: 14, say: "Bb5+ — the familiar London check, steering toward Bxc6 and a fresh set of doubled pawns to clamp.", sayShort: "Bb5+ — toward Bxc6", arrows: [_A('b5', 'e8')] },
    { atMove: 18, say: "Bxd6 — trading the dark bishops once Black's structure is fixed. Your remaining pieces target the weak c- and d-pawns.", sayShort: "Bxd6 — trade, keep the targets", highlights: [_H('d6')] },
    { atMove: 20, say: "Ra5 — the rook lifts to the fifth, swinging to attack the loose queenside pawns from the side. Black is tied to defence.", sayShort: "Ra5 — rook lift to attack", arrows: [_A('a5', 'd5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN05: SublineNarration = {
  intro: { say: "Black trades on d4 a move later. You recapture exd4 and, after …Nh5 hits your bishop, calmly retreat to e3 and develop — the central pawn and bishop pair giving you the freer game.", sayShort: "…cxd4 — exd4, Be3, freer game" },
  beats: [
    { atMove: 12, say: "exd4 — the recapture opens the e-file and hands you a mobile centre pawn. Your pieces have more room than Black's.", sayShort: "exd4 — open lines, free play", highlights: [_H('d4'), _H('e1')] },
    { atMove: 14, say: "Be3 — sidestepping the …Nh5 lunge while keeping the bishop active. Black has spent time chasing; you have spent it developing.", sayShort: "Be3 — keep the bishop, develop", highlights: [_H('e3')] },
    { atMove: 16, say: "Bb5 — back to the c6-knight, the recurring London pressure point. The pin sets up doubling or a favourable trade.", sayShort: "Bb5 — pressure c6 again", arrows: [_A('b5', 'c6')] },
    { atMove: 22, say: "a4 — gaining queenside space and fixing Black's pawns before they can expand with …a6 and …b5. A small, durable edge.", sayShort: "a4 — fix the queenside", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN06: SublineNarration = {
  intro: { say: "Black develops quietly with …Be7. You post the bishop on d3 aiming at h7, and when …Qb6 and …Nh5 come, you sidestep with Bg5 to trade the offside knight and keep your healthy structure.", sayShort: "…Be7 — Bd3, then Bg5 trade" },
  beats: [
    { atMove: 10, say: "Bd3 — the bishop takes its best diagonal, eyeing h7 and supporting the eventual e4 break. The London pieces almost place themselves.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 12, say: "Qc2 — connecting with the bishop on the b1-h7 diagonal and defending against …Nh5 ideas. The battery quietly grows.", sayShort: "Qc2 — build the diagonal battery", arrows: [_A('c2', 'h7')] },
    { atMove: 14, say: "Bg5 — meeting …Nh5 by offering the trade. You will not let Black swap off your good bishop for nothing; instead the offside knight comes off.", sayShort: "Bg5 — trade the stray knight", arrows: [_A('g5', 'h5')] },
    { atMove: 22, say: "Qb3 — the queen shifts to pressure b7 and d5 once the dust settles. Same structure, more active pieces — a typical London plus.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN07: SublineNarration = {
  intro: { say: "Black hits b2 with …Qb6. You offer the queen trade with Qb3 — the safest answer, since trading queens leaves you with the steadier structure and an easy queenside majority to nurse.", sayShort: "…Qb6 — Qb3, trade into a plus" },
  beats: [
    { atMove: 12, say: "Qb3 — the principled reply. Trading queens defuses Black's only active piece and steers into an endgame where your sound pawns matter most.", sayShort: "Qb3 — offer the trade", arrows: [_A('b3', 'b6')] },
    { atMove: 16, say: "Qxb6 — taking when Black castles. With queens off, your task is simple: target the weakened queenside and out-maneuver the passive bishop.", sayShort: "Qxb6 — into a better ending", highlights: [_H('b6')] },
    { atMove: 18, say: "a3 — fixing the queenside and preparing b4 to gain space. In these endings the side with the cleaner pawns presses for free.", sayShort: "a3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 20, say: "g4 — even in the ending you grab kingside space, restricting Black's knight and bishop. A risk-free squeeze on both wings.", sayShort: "g4 — restrict and squeeze", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:end-key-squares', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN08: SublineNarration = {
  intro: { say: "Black lunges …Qb6 early. You decline the b2-pawn and reroute the bishop to e5, the proud London outpost, daring Black to trade into a structure that only helps your central grip.", sayShort: "…Qb6 — Qc2, Be5 outpost" },
  beats: [
    { atMove: 10, say: "Qc2 — calmly guarding b2 and eyeing h7. You never need to defend passively in the London; the queen does double duty.", sayShort: "Qc2 — guard b2, eye h7", arrows: [_A('c2', 'h7')] },
    { atMove: 12, say: "Be5 — the dark-squared bishop seizes its dream square, dominating the centre and discouraging …Nc6 ideas. This piece is the soul of the London.", sayShort: "Be5 — claim the outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "dxc5 — opening the position at the right moment, when your pieces are the more active and Black's queen is exposed on b6.", sayShort: "dxc5 — open with the lead", highlights: [_H('c5')] },
    { atMove: 18, say: "c4 — striking at d5 to fracture Black's centre. The resulting lines favour your better-placed minor pieces.", sayShort: "c4 — hit the d5-pawn", arrows: [_A('c4', 'd5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN09: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You have completed the ideal London set-up, so you fire the central break e4 — opening lines for the Bd3 and rooks while Black's bishop bites on the d5-granite.", sayShort: "…b6 — the e4 break" },
  beats: [
    { atMove: 16, say: "e4 — the thematic break, perfectly timed now that every piece is developed. The centre opens toward Black's king and the d3-bishop roars to life.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 18, say: "O-O — tucking the king away before the centre fully ignites. With the safer king you can play for the attack without worry.", sayShort: "O-O — king safe first", highlights: [_H('g1')] },
    { atMove: 20, say: "e5 — gaining space and kicking the f6-knight, clearing the b1-h7 diagonal for a direct kingside assault.", sayShort: "e5 — kick the knight, open lines", arrows: [_A('d3', 'h7')] },
    { atMove: 22, say: "Qe2 — bringing the last piece toward the kingside, where your space and the open diagonal promise a lasting initiative.", sayShort: "Qe2 — reinforce the attack", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN10: SublineNarration = {
  intro: { say: "Black prepares queenside expansion with …a6. You develop naturally to d3, meet …Nh5 with Bg5, and answer the …cxd4 release by recapturing with the knight — keeping a compact centre and the bishop pair.", sayShort: "…a6 — Bd3, Bg5, Nxd4" },
  beats: [
    { atMove: 12, say: "Bd3 — the bishop to its best square, aiming at h7 and backing the e4 break. Black's …a6 is slow; you simply finish developing.", sayShort: "Bd3 — best diagonal", arrows: [_A('d3', 'h7')] },
    { atMove: 16, say: "Bg5 — meeting the …Nh5 chase by pinning instead of retreating, keeping your good bishop active and Black's knight awkward.", sayShort: "Bg5 — pin, do not retreat", arrows: [_A('g5', 'd8')] },
    { atMove: 20, say: "Nxd4 — recapturing with the knight to keep pawns compact. The centralised knight eyes c6 and f5, the better minor piece on the board.", sayShort: "Nxd4 — centralise the knight", highlights: [_H('d4')] },
    { atMove: 22, say: "Nxc6 — trading to leave Black with a fresh structural concession on the queenside. You convert the small, lasting edge.", sayShort: "Nxc6 — fix the structure", highlights: [_H('c6')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN11: SublineNarration = {
  intro: { say: "Against the King's Indian set-up Black readies …e5 with …Re8. You retreat Bh2 to keep the bishop safe on the long diagonal, then meet …e5 with dxe5 — opening the centre into Black's slightly loose pieces.", sayShort: "…Re8 — Bh2, then dxe5" },
  beats: [
    { atMove: 18, say: "Bh2 — tucking the bishop away before …e5 can hit it with tempo. From h2 it still rakes the b8-h2 diagonal and watches e5.", sayShort: "Bh2 — preserve the bishop", arrows: [_A('h2', 'e5')] },
    { atMove: 20, say: "dxe5 — meeting the central thrust by opening lines. After …dxe5 the e-file and the h2-bishop both bear on Black's centre.", sayShort: "dxe5 — open the centre", highlights: [_H('e5')] },
    { atMove: 22, say: "Qc2 — connecting the rooks and lining up with the h2-bishop on the b1-h7 diagonal. A flexible, comfortable middlegame with the better bishop.", sayShort: "Qc2 — battery on the diagonal", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN12: SublineNarration = {
  intro: { say: "Black strikes with …c5 on the queenside. You meet it with a4 to clamp the …b5 break, then Bh2 and Qb3 — pressuring b7 down the diagonal while Black struggles to find a plan.", sayShort: "…c5 — a4, Bh2, Qb3" },
  beats: [
    { atMove: 18, say: "a4 — stopping …b5 cold before Black can expand. With the queenside frozen, Black's …c5 achieves little.", sayShort: "a4 — stop the …b5 break", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Bh2 — the routine London retreat, keeping the dark bishop on its long diagonal and clear of any …e5 tempo.", sayShort: "Bh2 — safe long diagonal", arrows: [_A('h2', 'd6')] },
    { atMove: 22, say: "Qb3 — eyeing b7 and d5, exploiting the holes …c5 left behind. You hold a small, nagging initiative on the light squares.", sayShort: "Qb3 — hit b7 and d5", arrows: [_A('b3', 'b7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN13: SublineNarration = {
  intro: { say: "Black jumps …Ne4 to trade pieces. You swap it off with Nxe4, and after …Bxe4 reroute with Nd2 to challenge the bishop — simplifying into a pleasant position where your structure is the sounder.", sayShort: "…Ne4 — Nxe4, Nd2 challenge" },
  beats: [
    { atMove: 18, say: "Nxe4 — accepting the trade. Each swap eases your slightly more compact position and removes a potential attacker.", sayShort: "Nxe4 — take the trade", highlights: [_H('e4')] },
    { atMove: 20, say: "Nd2 — challenging the e4-bishop at once. Forcing it to declare keeps the initiative and avoids letting Black settle.", sayShort: "Nd2 — challenge the bishop", arrows: [_A('d2', 'e4')] },
    { atMove: 22, say: "Bf3 — offering to trade the light bishops too, heading for a clean structure where your pieces are the more harmonious.", sayShort: "Bf3 — trade toward a plus", arrows: [_A('f3', 'b7')] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN14: SublineNarration = {
  intro: { say: "Black chases with …Nh5. You simply retreat Bh2 — the bishop is untouchable there — then meet …e5 with dxe5 and gain space with a4, leaving the h5-knight stranded on the rim.", sayShort: "…Nh5 — Bh2, dxe5, a4" },
  beats: [
    { atMove: 18, say: "Bh2 — the knight on h5 attacks nothing; the bishop sits safely on the long diagonal while Black's piece languishes on the edge.", sayShort: "Bh2 — bishop untouchable", arrows: [_A('h2', 'e5')] },
    { atMove: 20, say: "a4 — grabbing queenside space and fixing Black's pawns. You expand on both wings while the rim-knight does nothing.", sayShort: "a4 — expand queenside", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "dxe5 — cracking the centre open at the right moment, when your pieces are coordinated and Black's are scattered.", sayShort: "dxe5 — open with coordination", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN15: SublineNarration = {
  intro: { say: "Black breaks immediately with …e5. You take dxe5 dxe5, then snap the pawn with Nxe5 — a healthy extra centre pawn, since the natural recaptures leave Black's pieces awkwardly placed.", sayShort: "…e5 — dxe5 then Nxe5" },
  beats: [
    { atMove: 18, say: "dxe5 — opening the centre the instant Black commits. The exchange leaves the e5-pawn ripe for collection.", sayShort: "dxe5 — open the centre", highlights: [_H('e5')] },
    { atMove: 20, say: "Nxe5 — winning the pawn cleanly. The knight sits proudly in the centre and Black has insufficient compensation for the material.", sayShort: "Nxe5 — grab the centre pawn", highlights: [_H('e5')] },
    { atMove: 22, say: "Nb3 — unwinding the queenside knight toward c5 and d4, consolidating the extra pawn into a lasting advantage.", sayShort: "Nb3 — consolidate the edge", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-center', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN16: SublineNarration = {
  intro: { say: "Black reroutes with …Qe8, planning …e5. You answer Bh2 and meet the break with dxe5, then post the knight on c4 — a comfortable game where your minor pieces eye the queenside holes.", sayShort: "…Qe8 — Bh2, dxe5, Nc4" },
  beats: [
    { atMove: 18, say: "Bh2 — the standard preparation, keeping the bishop out of the path of …e5 while it watches the long diagonal.", sayShort: "Bh2 — out of …e5's path", arrows: [_A('h2', 'e5')] },
    { atMove: 20, say: "dxe5 — opening the centre as Black commits to the break. Your developed pieces meet the position better than Black's.", sayShort: "dxe5 — open the centre", highlights: [_H('e5')] },
    { atMove: 22, say: "Nc4 — the knight leaps to a fine outpost, eyeing d6 and b6. You press on the squares Black's set-up left soft.", sayShort: "Nc4 — outpost on c4", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN17: SublineNarration = {
  intro: { say: "Black readies …c5 with …Rc8. You pre-empt with a4 to deny …b5, then meet …c5 by trading on e4 and centralising — a balanced but slightly easier game for the better-coordinated side.", sayShort: "…Rc8 — a4, Bh2, then trades" },
  beats: [
    { atMove: 18, say: "a4 — fixing the queenside before Black's rook-backed …c5 and …b5 gain steam. Prophylaxis is the London's quiet weapon.", sayShort: "a4 — pre-empt …b5", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Bh2 — the bishop slides to safety on the long diagonal, ready to support the centre after the coming exchanges.", sayShort: "Bh2 — long-diagonal post", arrows: [_A('h2', 'd6')] },
    { atMove: 22, say: "Nxe4 — accepting the trade Black offers, simplifying toward a position where your harmonious pieces hold a nagging edge.", sayShort: "Nxe4 — simplify to a plus", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN18: SublineNarration = {
  intro: { say: "Black plays the slow …a6. You use the free time to manoeuvre Bg3 and prepare g4 — a kingside expansion that exploits Black's lack of a concrete plan, while …e5 is met by keeping the tension.", sayShort: "…a6 — Bg3, then g4 expansion" },
  beats: [
    { atMove: 18, say: "Bg3 — repositioning the bishop to eye e5 and d6, sidestepping Black's …Nh5 ideas before they arrive.", sayShort: "Bg3 — eye e5 and d6", arrows: [_A('g3', 'd6')] },
    { atMove: 20, say: "Bh2 — completing the regroup; the bishop is now perfectly placed behind the pawns, immune to harassment.", sayShort: "Bh2 — bishop perfectly placed", arrows: [_A('h2', 'e5')] },
    { atMove: 22, say: "g4 — the space-gaining storm. With Black drifting, you seize the kingside and open lines toward the castled king.", sayShort: "g4 — kingside pawn storm", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN19: SublineNarration = {
  intro: { say: "Black solidifies with …e6, blunting the long diagonal. You expand with a4 to clamp the queenside, regroup the bishop to h2, and improve with Nc4 — a typical risk-free London squeeze.", sayShort: "…e6 — a4, Bh2, Nc4" },
  beats: [
    { atMove: 18, say: "a4 — staking out queenside space and preventing …b5, fixing Black's pawns where you can later target them.", sayShort: "a4 — clamp the queenside", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Bh2 — the bishop retreats to its long-diagonal home, ready to bite once the centre opens.", sayShort: "Bh2 — long-diagonal home", arrows: [_A('h2', 'd6')] },
    { atMove: 22, say: "Nc4 — the knight reaches a dominant outpost, pressing d6 and b6. You hold the only real plan on the board.", sayShort: "Nc4 — dominant outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};

const LN20: SublineNarration = {
  intro: { say: "With Nc3 in, the London turns aggressive. After …Nc6 the knight leaps to b5 hitting c7, and Black's panicky …Kd7 walks into a knight raid: Ng5, Nc7 and Nxf7 crash through the light squares for a winning attack.", sayShort: "…Nc6 — Nb5 and the knight raid" },
  beats: [
    { atMove: 10, say: "Nb5 — the Jobava jab. The knight threatens Nc7+, forking king and rook on a8. Already Black's position is under real strain.", sayShort: "Nb5 — threaten the c7 fork", arrows: [_A('b5', 'c7')] },
    { atMove: 12, say: "Ng5 — a second knight piles onto f7 while the king sits stranded on d7. The light squares around the king are collapsing.", sayShort: "Ng5 — swarm the weak f7", arrows: [_A('g5', 'f7')] },
    { atMove: 18, say: "Nxf7 — the raid pays off, snatching the pawn and forking queen and rook. Black's early king walk is refuted in full.", sayShort: "Nxf7 — fork and win material", highlights: [_H('f7')] },
    { atMove: 20, say: "Bd3 — bringing the bishop into the attack with the material already banked. Aim at h7 and convert the spoils.", sayShort: "Bd3 — join up, convert", arrows: [_A('d3', 'h7')] },
  ],
  sources: ['concept:tac-fork', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN21: SublineNarration = {
  intro: { say: "Black releases with …cxd4. You recapture exd4 into a mobile centre, develop the bishop to d3 eyeing h7, then trade the dark bishops on d6 and seize the open e-file — a smooth, slightly freer game.", sayShort: "…cxd4 — exd4, Bd3, Rfe1" },
  beats: [
    { atMove: 10, say: "exd4 — the recapture opens the e-file and gives you a mobile centre pawn. Your pieces breathe more easily than Black's.", sayShort: "exd4 — open the e-file", highlights: [_H('d4'), _H('e1')] },
    { atMove: 14, say: "Bd3 — the bishop takes its best diagonal, aimed at h7 and supporting any later central push.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 20, say: "Bxd6 — trading the dark bishops on your terms, leaving Black's queen passively placed and your structure the sounder.", sayShort: "Bxd6 — trade on your terms", highlights: [_H('d6')] },
    { atMove: 22, say: "Rfe1 — the rook claims the open e-file, the natural home in these London middlegames. You press a small, durable edge.", sayShort: "Rfe1 — seize the e-file", arrows: [_A('e1', 'e6')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN22: SublineNarration = {
  intro: { say: "Black offers the bishop trade with …Bd6. You check on b5 first to gain a tempo, then sidestep with Bg3 to keep your good bishop, and the knight lands on the e5 outpost — the dream square in any London.", sayShort: "…Bd6 — Bb5+, Bg3, Ne5" },
  beats: [
    { atMove: 10, say: "Bb5+ — the zwischenzug, forcing a block before Black resolves anything. Small tempo gains add up in the London.", sayShort: "Bb5+ — gain a tempo", arrows: [_A('b5', 'e8')] },
    { atMove: 12, say: "Bg3 — declining the trade. You will not swap your active dark bishop; it sits on the b8-h2 diagonal eyeing e5.", sayShort: "Bg3 — keep the good bishop", arrows: [_A('g3', 'e5')] },
    { atMove: 20, say: "Ne5 — the knight seizes the central outpost, dominating the board and cramping Black's pieces. This square is the soul of the system.", sayShort: "Ne5 — claim the outpost", highlights: [_H('e5')] },
    { atMove: 22, say: "Nxd7 — trading off Black's good bishop, leaving you with the superior minor pieces and the freer position.", sayShort: "Nxd7 — keep the better pieces", highlights: [_H('d7')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN23: SublineNarration = {
  intro: { say: "Black locks the queenside with …c4. You reroute Nd2 to hit the pawn, trade the dark bishops, then undermine with b3 — prising c4 loose and steering toward the queenside holes with Na4.", sayShort: "…c4 — Nd2, b3, Na4" },
  beats: [
    { atMove: 10, say: "Nd2 — rerouting the knight now the centre is locked. From d2 it eyes b3 and the c4-pawn that Black just over-committed.", sayShort: "Nd2 — reroute toward c4", arrows: [_A('d2', 'b3')] },
    { atMove: 14, say: "b3 — striking the head of the pawn chain. After …cxb3 axb3 the a-file opens and Black's space-grab becomes a liability.", sayShort: "b3 — undermine c4", arrows: [_A('b3', 'c4')] },
    { atMove: 18, say: "Be2 — calm development; the structural fight is won, now you simply complete and target the loose queenside pawns.", sayShort: "Be2 — finish developing", highlights: [_H('e2')] },
    { atMove: 22, say: "Na4 — the knight heads for c5 and b6, the squares …c4 left soft. You hold the only real plan on the board.", sayShort: "Na4 — into the holes", highlights: [_H('c5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN24: SublineNarration = {
  intro: { say: "Black develops modestly with …Be7. You exploit the Nc3 set-up with Nb5, clamp the queenside with a4, and trade off into a structure where Black is saddled with doubled, weak a-pawns.", sayShort: "…Be7 — Nb5, a4, Bxa6" },
  beats: [
    { atMove: 10, say: "Nb5 — the knight jumps in eyeing c7 and d6, the point of meeting this set-up with an early Nc3.", sayShort: "Nb5 — eye c7 and d6", arrows: [_A('b5', 'c7')] },
    { atMove: 16, say: "a4 — clamping the queenside and supporting the b5-knight, fixing Black's pawns where you can target them.", sayShort: "a4 — clamp and support", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Bxa6 — capturing to leave Black with doubled, isolated a-pawns. A permanent weakness to grind against.", sayShort: "Bxa6 — inflict doubled pawns", highlights: [_H('a6')] },
    { atMove: 22, say: "O-O — king to safety with the structural edge in hand. Now you bring the rooks to the open files and press.", sayShort: "O-O — safe, then press", highlights: [_H('g1')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN25: SublineNarration = {
  intro: { say: "Black pokes b2 with …Qb6. You ignore the pawn — Nb5 is worth far more, hitting c7 — gain kingside room with h4, and recapture on b5 to fix Black's queenside and open the a-file.", sayShort: "…Qb6 — Nb5, h4, axb5" },
  beats: [
    { atMove: 10, say: "Nb5 — declining to defend b2 passively. The knight to b5 hits c7 and is worth more than the offered pawn.", sayShort: "Nb5 — ignore b2, hit c7", arrows: [_A('b5', 'c7')] },
    { atMove: 14, say: "h4 — grabbing kingside space while Black is tangled on the queenside. The pawn cramps Black and eyes h5.", sayShort: "h4 — gain kingside room", arrows: [_A('h4', 'h5')] },
    { atMove: 20, say: "axb5 — recapturing toward the centre, fixing Black's queenside pawns and handing your rook the open a-file.", sayShort: "axb5 — fix pawns, open a-file", highlights: [_H('b5'), _H('a1')] },
    { atMove: 22, say: "Bc2 — the bishop to the long diagonal, eyeing h7 with a pleasant space advantage on both wings.", sayShort: "Bc2 — diagonal and space", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN26: SublineNarration = {
  intro: { say: "After …a6 and …Be7 Black sets up solidly. You open with dxc5 to gain the bishop-pair tempo, post the bishop on d3, then provoke kingside weaknesses with Bg5-h4 — creating the targets you will play against.", sayShort: "…Be7 — dxc5, Bd3, Bg5" },
  beats: [
    { atMove: 14, say: "dxc5 — opening lines as Black finishes developing, gaining a tempo on the bishop and freeing your pieces.", sayShort: "dxc5 — open with tempo", highlights: [_H('c5')] },
    { atMove: 16, say: "Bd3 — the bishop to its best diagonal, aimed at h7 and ready to support a kingside build-up.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 20, say: "Bg5 — provoking …h6 and …g5, loosening Black's kingside. Every pawn move there is a future target.", sayShort: "Bg5 — provoke weaknesses", arrows: [_A('g5', 'd8')] },
    { atMove: 22, say: "Bh4 — maintaining the pin and baiting the further loosening …g5, after which the holes become yours to exploit.", sayShort: "Bh4 — keep the pin", arrows: [_A('h4', 'd8')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN27: SublineNarration = {
  intro: { say: "Black trades on d4. You recapture exd4 into a mobile centre, plant the knight on the e5 outpost, and reroute the second knight via e2 toward f4 — a textbook London kingside build-up.", sayShort: "…cxd4 — exd4, Ne5, Ne2" },
  beats: [
    { atMove: 14, say: "exd4 — recapture toward the centre, opening the e-file and keeping a mobile pawn duo.", sayShort: "exd4 — mobile centre", highlights: [_H('d4'), _H('e1')] },
    { atMove: 16, say: "Ne5 — the knight grabs the great central outpost, the heart of White's whole set-up. Black must reckon with it constantly.", sayShort: "Ne5 — the central outpost", highlights: [_H('e5')] },
    { atMove: 20, say: "Bd3 — supporting the e5-knight and aiming at h7, every piece pointing at Black's king.", sayShort: "Bd3 — support e5, eye h7", arrows: [_A('d3', 'h7')] },
    { atMove: 22, say: "Ne2 — rerouting the second knight toward f4 and g3, doubling down on the kingside attack.", sayShort: "Ne2 — reroute to f4", arrows: [_A('e2', 'f4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN28: SublineNarration = {
  intro: { say: "Black releases the tension early with …cxd4. You recapture exd4, sidestep …Nh5 with Bg5, dominate e5 with the knight, then trade on c6 to inflict doubled pawns — small, lasting pluses stacked together.", sayShort: "…cxd4 — exd4, Bg5, Ne5, Nxc6" },
  beats: [
    { atMove: 12, say: "exd4 — open the e-file and keep a mobile centre. The recapture toward the middle is almost always right here.", sayShort: "exd4 — open the e-file", highlights: [_H('d4'), _H('e1')] },
    { atMove: 16, say: "Bg5 — meeting the …Nh5 chase by pinning rather than retreating, keeping your active bishop and awkwardly placing Black's knight.", sayShort: "Bg5 — pin, don't retreat", arrows: [_A('g5', 'd8')] },
    { atMove: 18, say: "Ne5 — the knight takes the central outpost, eyeing c6 and the kingside. Black's pieces are cramped.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 20, say: "Nxc6 — trading to leave Black with doubled c-pawns, a fixed weakness you will play against all game.", sayShort: "Nxc6 — inflict doubled pawns", highlights: [_H('c6')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN29: SublineNarration = {
  intro: { say: "Black goes for a quick …b5 and the …Bxf2+ trick. You stay calm: take on c5, build the e4 break, and after the speculative …Bxf2+ you weather it — emerging with the extra material and the better game once the king tucks in.", sayShort: "…Bd6 — dxc5, e4, weather …Bxf2+" },
  beats: [
    { atMove: 12, say: "dxc5 — accepting the pawn and gaining a tempo on the bishop. Black's coming …b5 expansion will overreach.", sayShort: "dxc5 — take, gain tempo", highlights: [_H('c5')] },
    { atMove: 16, say: "e4 — striking in the centre while you are the better developed. Opening lines favours your harmonious pieces.", sayShort: "e4 — strike the centre", highlights: [_H('e4')] },
    { atMove: 20, say: "Kxf2 — calmly accepting the sacrifice. Black has only two pawns for the bishop; you are up material with a king that quickly finds safety.", sayShort: "Kxf2 — take, you're up material", highlights: [_H('f2')] },
    { atMove: 22, say: "Bc4 — developing with tempo and shoring up the king's surroundings. Consolidate and the extra piece decides.", sayShort: "Bc4 — consolidate the edge", arrows: [_A('c4', 'e6')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN30: SublineNarration = {
  intro: { say: "Against the King's Indian set-up Black plays …Nbd7. You grab queenside space with a4, plant the bishop on e5 to contest the long diagonal, and when chased retreat to g3 — keeping the bishop while Black shuffles.", sayShort: "…Nbd7 — a4, Be5, Bg3" },
  beats: [
    { atMove: 12, say: "a4 — staking out queenside space and preparing a5 and a knight route to b5. You start play where Black is least active.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 14, say: "Be5 — the bishop seizes the central outpost, contesting the g7-bishop's diagonal and eyeing the kingside.", sayShort: "Be5 — contest the long diagonal", highlights: [_H('e5')] },
    { atMove: 16, say: "Bg3 — when challenged you retreat, never trading your good bishop cheaply. It still rakes the b8-h2 diagonal.", sayShort: "Bg3 — preserve the bishop", arrows: [_A('g3', 'd6')] },
    { atMove: 22, say: "Nbd2 — developing the last piece and offering to swap Black's active e4-knight, easing into a comfortable game.", sayShort: "Nbd2 — challenge the e4-knight", arrows: [_A('d2', 'e4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN31: SublineNarration = {
  intro: { say: "Black plays the passive …c6. You strike with c4 to challenge the centre, recapture with the bishop onto the active diagonal, centralise the knight on d4, then trade queens into a structure where Black's b-pawns are weak.", sayShort: "…c6 — c4, Bxc4, Nxd4" },
  beats: [
    { atMove: 12, say: "c4 — challenging Black's centre at once. Against a slow …c6 you open lines for your better-placed pieces.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Bxc4 — recapturing with the bishop, which now eyes e6 and f7 on the active diagonal.", sayShort: "Bxc4 — active diagonal", arrows: [_A('c4', 'f7')] },
    { atMove: 18, say: "Nxd4 — centralising the knight after the trades, eyeing c6 and f5 from its commanding post.", sayShort: "Nxd4 — centralise the knight", highlights: [_H('d4')] },
    { atMove: 22, say: "Qxb6 — trading into an ending where Black's doubled b-pawns are a long-term liability. Press the structure.", sayShort: "Qxb6 — into a better ending", highlights: [_H('b6')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN32: SublineNarration = {
  intro: { say: "Black develops …Nc6. You make luft with h3, complete development, then execute the signature regroup Bf1 and Bh2 — repositioning the pieces behind the pawns to prepare the central e4 break.", sayShort: "…Nc6 — h3, Re1, Bf1-h2" },
  beats: [
    { atMove: 12, say: "h3 — a useful luft, taking g4 from Black's pieces before you begin the regroup.", sayShort: "h3 — luft, deny g4", highlights: [_H('g4')] },
    { atMove: 16, say: "Re1 — the rook supports the coming e4 break, lining up behind the e-pawn.", sayShort: "Re1 — back the e4 break", arrows: [_A('e1', 'e4')] },
    { atMove: 20, say: "Bh2 — completing the elegant Bf1-h2 regroup. The bishop now sits on the long diagonal, every piece poised for e4.", sayShort: "Bh2 — regroup for e4", arrows: [_A('h2', 'e5')] },
    { atMove: 22, say: "Nb1 — even the knight reroutes, heading via d2 to support e4 and contest the e4-square. Patience, then the break.", sayShort: "Nb1 — reroute toward e4", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN33: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You challenge the centre with c4, recapture with the bishop onto the attack, clamp the queenside with a4, then thrust d5 — shutting the b7-bishop out of the game.", sayShort: "…b6 — c4, a4, d5" },
  beats: [
    { atMove: 12, say: "c4 — striking the centre against the fianchetto. Opening lines suits your active development.", sayShort: "c4 — strike the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 16, say: "Bxc4 — recapturing; the bishop joins the fight against e6 and f7 on the open diagonal.", sayShort: "Bxc4 — onto the attack", arrows: [_A('c4', 'f7')] },
    { atMove: 20, say: "a4 — clamping the queenside to deny …b5, fixing Black's pawns before they can free the position.", sayShort: "a4 — deny …b5", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "d5 — the space-gaining thrust, slamming the door on the b7-bishop and handing you a lasting bind.", sayShort: "d5 — entomb the bishop", highlights: [_H('d5'), _H('b7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN34: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3; …Bxf3 hands you the bishop pair, which you make tell by opening the centre with c4 and pressing the light squares Black abandoned.", sayShort: "…Bg4 — h3, Bxf3, c4" },
  beats: [
    { atMove: 12, say: "h3 — challenging the bishop immediately. Black either retreats or, as here, trades on f3 and gives up the bishop pair.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 14, say: "Bxf3 — recapturing toward the centre. Your bishop now rakes the long light diagonal and d5; you hold the bishop pair.", sayShort: "Bxf3 — bishop pair, long diagonal", arrows: [_A('f3', 'd5')] },
    { atMove: 18, say: "c4 — opening the centre to let the two bishops breathe. The more open the game, the more they dominate.", sayShort: "c4 — open for the bishops", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "Qb3 — pressing b7 and d5, exploiting the light squares Black weakened by parting with the bishop.", sayShort: "Qb3 — press the light squares", arrows: [_A('b3', 'b7')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN35: SublineNarration = {
  intro: { say: "Black develops …Bf5. You solidify with c3, bring the knight to d2 and the queen to b3 hitting b7 and b6, trade into a fixed queenside, then harry the bishop with h3 and g4.", sayShort: "…Bf5 — c3, Qb3, g4" },
  beats: [
    { atMove: 12, say: "c3 — solidifying the centre and preparing Nbd2 and Qb3. Quiet moves that set up real pressure.", sayShort: "c3 — solidify, prepare Qb3", highlights: [_H('c3')] },
    { atMove: 16, say: "Qb3 — double-attacking b7 and pressuring b6, forcing Black to make a queenside concession.", sayShort: "Qb3 — hit b7 and b6", arrows: [_A('b3', 'b7')] },
    { atMove: 18, say: "Qxb6 — trading into a structure where Black's queenside pawns are fixed and vulnerable. The ending favours you.", sayShort: "Qxb6 — fix the queenside", highlights: [_H('b6')] },
    { atMove: 22, say: "g4 — gaining kingside space and chasing the f5-bishop back to passivity. You squeeze on both wings.", sayShort: "g4 — chase the bishop", arrows: [_A('g4', 'f5')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN36: SublineNarration = {
  intro: { say: "Black trades with …cxd4. You recapture cxd4, accepting a mobile centre with active pieces, offer the queen trade with Qb3 to defuse Black's pressure, and develop Nc3 into an easy equal-plus.", sayShort: "…cxd4 — cxd4, Qb3, Nc3" },
  beats: [
    { atMove: 14, say: "cxd4 — recapturing to keep a broad, mobile centre. Your pieces flow naturally around it.", sayShort: "cxd4 — keep the big centre", highlights: [_H('d4')] },
    { atMove: 18, say: "Qb3 — offering the queen trade to neutralise Black's only active piece and steer toward a comfortable ending.", sayShort: "Qb3 — offer the trade", arrows: [_A('b3', 'b7')] },
    { atMove: 20, say: "axb3 — recapturing toward the centre, opening the a-file for your rook and keeping a sound structure.", sayShort: "axb3 — open the a-file", highlights: [_H('a1')] },
    { atMove: 22, say: "Nc3 — developing with gain, eyeing b5 and d5 on the open lines. You hold the slightly easier game.", sayShort: "Nc3 — develop, eye d5", highlights: [_H('d5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN37: SublineNarration = {
  intro: { say: "Black readies …e5 with the slow …Re8. You challenge with c4 and grab the pawn on c5, then push the passer to c6 to disrupt Black's queenside — your lead in development carries the day.", sayShort: "…Re8 — c4, dxc5, c6" },
  beats: [
    { atMove: 12, say: "c4 — challenging the centre, the standard try when Black plays a slow rook move instead of committing.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "dxc5 — grabbing the pawn, betting your superior development outweighs Black's brief activity.", sayShort: "dxc5 — grab the pawn", highlights: [_H('c5')] },
    { atMove: 18, say: "c6 — the passed pawn lunges forward, splitting Black's queenside and gaining time on the pieces.", sayShort: "c6 — push the passer", highlights: [_H('c6')] },
    { atMove: 20, say: "Bxc4 — recapturing, the bishop swinging to hit f7 with a pleasant, material-plus position.", sayShort: "Bxc4 — eye f7, stay ahead", arrows: [_A('c4', 'f7')] },
  ],
  sources: ['concept:pos-development', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN38: SublineNarration = {
  intro: { say: "Black chases with …Nh5. You plant the bishop on e5 hitting the f6/g7 complex, retreat to g3 when challenged, and recapture hxg3 — opening the h-file for a rook lift toward Black's king.", sayShort: "…Nh5 — Be5, Bg3, hxg3" },
  beats: [
    { atMove: 12, say: "Be5 — the bishop grabs the outpost, pressing the f6 and g7 squares and refusing to be shooed away cheaply.", sayShort: "Be5 — seize the outpost", highlights: [_H('e5')] },
    { atMove: 14, say: "Bg3 — retreating only when forced, ready to recapture toward the centre and open lines if Black takes.", sayShort: "Bg3 — retreat, stay useful", arrows: [_A('g3', 'd6')] },
    { atMove: 18, say: "hxg3 — recapturing with the h-pawn, opening the h-file for your rook to swing toward the castled king.", sayShort: "hxg3 — open the h-file", highlights: [_H('h1')] },
    { atMove: 22, say: "Rb1 — switching wings to prepare the b4 minority attack, the right plan in this fixed pawn structure.", sayShort: "Rb1 — prepare b4", highlights: [_H('b4')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN39: SublineNarration = {
  intro: { say: "Black trades on d4 deep in the line. You recapture exd4 into a mobile centre, sidestep …Nh5 with Be3 while guarding d4, reroute Nb3 toward c5, and post the rook on e1 — a harmonious, slightly freer game.", sayShort: "…cxd4 — exd4, Be3, Nb3, Re1" },
  beats: [
    { atMove: 16, say: "exd4 — recapturing toward the centre, opening the e-file and keeping a mobile pawn.", sayShort: "exd4 — open the e-file", highlights: [_H('d4'), _H('e1')] },
    { atMove: 18, say: "Be3 — sidestepping the …Nh5 lunge while the bishop guards d4 and eyes the queenside. No tempo wasted.", sayShort: "Be3 — guard d4, dodge …Nh5", highlights: [_H('e3'), _H('d4')] },
    { atMove: 20, say: "Nb3 — the knight heads for c5 and a5, pressing the queenside where Black is least secure.", sayShort: "Nb3 — toward c5", highlights: [_H('c5')] },
    { atMove: 22, say: "Re1 — the rook takes the open e-file, completing a textbook London set-up with a small, durable edge.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e6')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};

const LN40: SublineNarration = {
  intro: { say: "Black meets your London with a Dutch …f5 and the quiet …Be7. You grab queenside space with c4, challenge the …Ne4 outpost with Nfd2, then expand with Nc3 and b4 — a modern, space-based anti-Dutch plan.", sayShort: "…Be7 — c4, Nfd2, Nc3, b4" },
  beats: [
    { atMove: 8, say: "c4 — the modern anti-Dutch. Rather than the timid e3-only set-up, you claim queenside space and pressure d5 from the start.", sayShort: "c4 — claim queenside space", arrows: [_A('c4', 'd5')] },
    { atMove: 16, say: "Nfd2 — challenging Black's proud e4-knight. Trading off the Dutch's best piece leaves Black without active play.", sayShort: "Nfd2 — challenge the e4-knight", arrows: [_A('d2', 'e4')] },
    { atMove: 20, say: "Nc3 — developing the last piece, eyeing b5 and d5. Your space edge is real and Black has no break.", sayShort: "Nc3 — develop, eye d5", highlights: [_H('d5')] },
    { atMove: 22, say: "b4 — the queenside expansion rolls forward, gaining ground where Black is passive. A risk-free squeeze.", sayShort: "b4 — expand the queenside", arrows: [_A('b4', 'b5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN41: SublineNarration = {
  intro: { say: "Black fianchettoes both bishops Dutch-style with …b6 and …g6. You take the centre with c4, jump in with Nb5 to disrupt c7 and d6, expand with b4, then storm the kingside fianchetto with h4.", sayShort: "…b6 — c4, Nb5, b4, h4" },
  beats: [
    { atMove: 10, say: "c4 — claiming the centre against the double fianchetto. Space is your edge in these slow Dutch structures.", sayShort: "c4 — take the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Nb5 — leaping in to harass c7 and d6, exploiting the dark-square holes Black's set-up leaves behind.", sayShort: "Nb5 — harass c7 and d6", arrows: [_A('b5', 'c7')] },
    { atMove: 16, say: "b4 — grabbing queenside space, the wing where your pieces are aimed and Black has no counterplay.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
    { atMove: 22, say: "h4 — launching the pawn storm against the fianchettoed king, prising open the long diagonal and the h-file.", sayShort: "h4 — storm the fianchetto", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN42: SublineNarration = {
  intro: { say: "Black plays a Leningrad-Dutch …d6 and …g6. You post the bishop on d3 to hit the f5/h7 light squares, prepare e4 with Re1, then build the Bg3-Bc2 battery aimed straight at the king.", sayShort: "…d6 — Bd3, Re1, Bg3-Bc2" },
  beats: [
    { atMove: 8, say: "Bd3 — the bishop takes aim at the f5-pawn and the h7-square that Black's early …f5 weakened. Pressure on the light squares.", sayShort: "Bd3 — aim at f5 and h7", arrows: [_A('d3', 'f5')] },
    { atMove: 16, say: "Re1 — loading the rook behind the e-pawn, preparing the central e4 break that opens lines toward Black's king.", sayShort: "Re1 — back the e4 break", arrows: [_A('e1', 'e4')] },
    { atMove: 20, say: "Bg3 — repositioning the bishop to watch e5 and d6, sidestepping any …e5 tempo while staying on the key diagonal.", sayShort: "Bg3 — watch e5 and d6", arrows: [_A('g3', 'd6')] },
    { atMove: 22, say: "Bc2 — completing the battery; bishop and queen now rake the b1-h7 diagonal toward the castled king.", sayShort: "Bc2 — build the diagonal battery", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN43: SublineNarration = {
  intro: { say: "Black offers a trade with …Bd6. You take at once to give Black doubled d-pawns, challenge the centre with c4, then reroute the knight via e2 to f4 — the better minor piece eyeing e6 and d5.", sayShort: "…Bd6 — Bxd6, c4, Ne2-f4" },
  beats: [
    { atMove: 8, say: "Bxd6 — accepting the trade to saddle Black with doubled d-pawns. The structural concession is permanent.", sayShort: "Bxd6 — inflict doubled pawns", highlights: [_H('d6')] },
    { atMove: 10, say: "c4 — striking the centre while Black's structure is compromised, opening lines for your active pieces.", sayShort: "c4 — strike the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "Ne2 — rerouting the knight toward f4, where it will eye e6, d5 and the kingside.", sayShort: "Ne2 — reroute to f4", arrows: [_A('e2', 'f4')] },
    { atMove: 22, say: "Nf4 — the knight lands on its dream square, the better minor piece pressing Black's weakened light squares.", sayShort: "Nf4 — dominant knight", highlights: [_H('f4')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN44: SublineNarration = {
  intro: { say: "Black sets up a Stonewall with …d5, …f5 and …e6. You undermine it with c4, develop Nc3 to press d5 and the e4-square, swing the rook to c1, then trade the dark bishops to highlight Black's holes.", sayShort: "…Be7 — c4, Nc3, Rc1, Bxd6" },
  beats: [
    { atMove: 10, say: "c4 — the principled answer to the Stonewall, challenging d5 and gaining space before Black can dig in.", sayShort: "c4 — challenge the Stonewall", arrows: [_A('c4', 'd5')] },
    { atMove: 16, say: "Nc3 — developing with pressure on d5 and contesting the e4-square Black wants for a knight.", sayShort: "Nc3 — press d5 and e4", highlights: [_H('d5'), _H('e4')] },
    { atMove: 18, say: "Rc1 — the rook takes the half-open c-file, the natural file once you trade on d5 or push c5.", sayShort: "Rc1 — claim the c-file", arrows: [_A('c1', 'c8')] },
    { atMove: 22, say: "Bxd6 — trading the dark bishops to expose the e5 and dark-square holes of the Stonewall, your long-term target.", sayShort: "Bxd6 — expose the dark holes", highlights: [_H('e5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Stonewall_Attack'],
};
const LN45: SublineNarration = {
  intro: { say: "Black develops …Nc6 and fianchettoes. You castle, plant the knight on the e5 outpost, buttress it with f4 Stonewall-style, then trade on f6 to fix the structure and gain space with c4.", sayShort: "…Nc6 — Ne5, f4, Bxf6, c4" },
  beats: [
    { atMove: 12, say: "Ne5 — the knight seizes the central outpost, the dominant square against any Dutch set-up.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "f4 — buttressing the e5-knight and gripping the centre, turning Black's own Stonewall idea back on them.", sayShort: "f4 — buttress e5", arrows: [_A('f4', 'e5')] },
    { atMove: 20, say: "Bxf6 — trading to fix Black's structure and weaken the dark squares around the king.", sayShort: "Bxf6 — fix the structure", highlights: [_H('f6')] },
    { atMove: 22, say: "c4 — gaining queenside space to complete the bind. Black is passive on both wings.", sayShort: "c4 — complete the bind", arrows: [_A('c4', 'd5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN46: SublineNarration = {
  intro: { say: "Black strikes with …c5. You challenge the centre with c4, recapture exd4 into a mobile centre, trade the dark bishops, then gain space and tempo with c5 against the queen.", sayShort: "…c5 — c4, exd4, Bxd6, c5" },
  beats: [
    { atMove: 10, say: "c4 — meeting …c5 by challenging d5 in return, opening the position while your pieces are the better placed.", sayShort: "c4 — challenge d5", arrows: [_A('c4', 'd5')] },
    { atMove: 12, say: "exd4 — recapturing toward the centre, opening the e-file and keeping a mobile pawn.", sayShort: "exd4 — mobile centre", highlights: [_H('d4'), _H('e1')] },
    { atMove: 20, say: "Bxd6 — trading the dark bishops on your terms, leaving Black's queen to recapture passively.", sayShort: "Bxd6 — trade on your terms", highlights: [_H('d6')] },
    { atMove: 22, say: "c5 — gaining space with tempo on the queen, gripping the queenside and restricting Black's pieces.", sayShort: "c5 — space with tempo", arrows: [_A('c5', 'd6')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN47: SublineNarration = {
  intro: { say: "Black builds a solid …c6 and …d5 Stonewall. You aim the bishop at h7 from d3, challenge with c4, open lines with dxc5, then route the knight to b3 to besiege Black's hanging pawns.", sayShort: "…c6 — Bd3, c4, dxc5, Nb3" },
  beats: [
    { atMove: 10, say: "Bd3 — the bishop to its best diagonal, eyeing h7 and the light squares Black's …f5 left soft.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 16, say: "c4 — challenging the centre to pry open lines for your harmoniously placed pieces.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "dxc5 — opening the position to leave Black with hanging pawns, a target for your minor pieces.", sayShort: "dxc5 — create hanging pawns", highlights: [_H('c5')] },
    { atMove: 22, say: "Nb3 — the knight heads for c5 and d4, blockading and besieging Black's loose queenside pawns.", sayShort: "Nb3 — blockade and besiege", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Stonewall_Attack'],
};
const LN48: SublineNarration = {
  intro: { say: "Black sets up the …c6 Stonewall. You challenge with c4, develop Nc3 to pressure the centre, then trade off the e4-knight with Nd2 and contest the square with Qc2 — denying the Stonewall its only active piece.", sayShort: "…c6 — c4, Nc3, Nd2, Qc2" },
  beats: [
    { atMove: 10, say: "c4 — striking at d5, the right way to meet the Stonewall before Black completes the bind.", sayShort: "c4 — strike d5", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Nc3 — developing with pressure on d5 and the e4-square, the knight Black hopes to occupy.", sayShort: "Nc3 — pressure d5 and e4", highlights: [_H('d5'), _H('e4')] },
    { atMove: 20, say: "Nd2 — challenging the e4-knight, the Stonewall's pride. Trade it and Black has no active play left.", sayShort: "Nd2 — challenge e4-knight", arrows: [_A('d2', 'e4')] },
    { atMove: 22, say: "Qc2 — contesting e4 and eyeing h7, the queen reinforcing the fight for the key central square.", sayShort: "Qc2 — contest e4, eye h7", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Stonewall_Attack'],
};
const LN49: SublineNarration = {
  intro: { say: "Black checks with …Bb4+. You block with c3, gaining a tempo on the bishop that must retreat, claim space with c4, develop Nbd2, then clamp with c5 — a comfortable space-based game.", sayShort: "…Bb4+ — c3, c4, Nbd2, c5" },
  beats: [
    { atMove: 8, say: "c3 — blocking the check and gaining a tempo: the b4-bishop has nothing better than a sheepish retreat.", sayShort: "c3 — block, gain a tempo", highlights: [_H('c3')] },
    { atMove: 10, say: "c4 — following up by claiming the centre and queenside space, your structural plan against the Dutch.", sayShort: "c4 — claim space", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Nbd2 — developing the knight and pre-empting another …Bb4 check, since you can simply block again.", sayShort: "Nbd2 — develop, pre-empt checks", highlights: [_H('d2')] },
    { atMove: 22, say: "c5 — the clamp. Gaining queenside space restricts Black's pieces and hands you the only plan.", sayShort: "c5 — clamp the queenside", arrows: [_A('c5', 'd6')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Dutch_Defence'],
};
const LN50: SublineNarration = {
  intro: { say: "Black develops …Bf5 and …Bd6. You sidestep the trade with Bg3, grab the centre with c4, recapture hxg3 to open the h-file, then press b7 and d5 with Qb3.", sayShort: "…Bd6 — Bg3, c4, hxg3, Qb3" },
  beats: [
    { atMove: 8, say: "Bg3 — declining the bishop trade Black wants. You keep your good dark bishop, even at the cost of doubled g-pawns later.", sayShort: "Bg3 — keep the good bishop", arrows: [_A('g3', 'd6')] },
    { atMove: 10, say: "c4 — challenging the centre and gaining queenside space, the engine of your plan.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "hxg3 — recapturing with the h-pawn, opening the h-file for your rook to point at Black's king.", sayShort: "hxg3 — open the h-file", highlights: [_H('h1')] },
    { atMove: 16, say: "Qb3 — pressing b7 and d5 at once, exploiting the queenside while Black is still untangling.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN51: SublineNarration = {
  intro: { say: "Black strikes with …c5. You check on b5 to gain a tempo, trade and open with cxd5, take on c5, then plant the knight on d4 to blockade Black's isolated d-pawn — a clean structural plus.", sayShort: "…c5 — Bb5+, cxd5, Nd4 blockade" },
  beats: [
    { atMove: 8, say: "Bb5+ — the check pins the c6-knight to the king and gains a tempo before the pawn tension resolves.", sayShort: "Bb5+ — pin and gain tempo", arrows: [_A('b5', 'e8')] },
    { atMove: 14, say: "cxd5 — opening the centre and leaving Black with an isolated d-pawn after the recaptures.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 20, say: "Nd4 — the knight takes the perfect blockading square in front of the isolated pawn, the classic technique.", sayShort: "Nd4 — blockade the isolani", highlights: [_H('d4'), _H('d5')] },
    { atMove: 22, say: "O-O — king to safety with the structure won. Now pile pieces onto the d5-pawn and grind.", sayShort: "O-O — safe, then besiege d5", highlights: [_H('g1')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Isolated_pawn'],
};
const LN52: SublineNarration = {
  intro: { say: "Black plays …Nc6 with …Bf5. You make luft for the bishop with a3, retreat Bg3 to keep it, grab the centre with c4, then launch the b4-b5 minority attack on the queenside.", sayShort: "…Nc6 — a3, Bg3, c4, b4-b5" },
  beats: [
    { atMove: 10, say: "Bg3 — keeping the dark bishop out of trades. It sits on g3 watching the b8-h2 diagonal.", sayShort: "Bg3 — preserve the bishop", arrows: [_A('g3', 'd6')] },
    { atMove: 12, say: "c4 — challenging the centre and opening the queenside, where your play is aimed.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "b4 — the minority attack begins, gaining space and preparing b5 to create a target on c6.", sayShort: "b4 — start the minority attack", arrows: [_A('b4', 'b5')] },
    { atMove: 22, say: "b5 — the spearhead lands, fixing a weakness in Black's queenside pawns for you to besiege.", sayShort: "b5 — fix the weakness", arrows: [_A('b5', 'c6')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/Minority_attack'],
};
const LN53: SublineNarration = {
  intro: { say: "Black pins with …Bb4. You hit b7 and d5 with Qb3 while the bishop is offside, unpin calmly with Nd2, question the bishop with a3, then recapture into a broad centre with the bishop pair.", sayShort: "…Bb4 — Qb3, Nd2, a3, bxc3" },
  beats: [
    { atMove: 12, say: "Qb3 — pouncing on b7 and d5 while Black's bishop sits offside on b4. The pin gains you nothing to fear.", sayShort: "Qb3 — hit b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 14, say: "Nd2 — unpinning without fuss, keeping your structure intact and preparing to challenge the bishop.", sayShort: "Nd2 — unpin calmly", highlights: [_H('d2')] },
    { atMove: 18, say: "a3 — questioning the b4-bishop. It must take on c3 or retreat, and either way you gain.", sayShort: "a3 — question the bishop", highlights: [_H('b4')] },
    { atMove: 22, say: "bxc3 — recapturing into a broad centre while keeping the bishop pair, a lasting structural trump.", sayShort: "bxc3 — big centre, bishop pair", highlights: [_H('c3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN54: SublineNarration = {
  intro: { say: "Black prepares queenside play with …a6. You take the centre with c4, plant the knight on e5, trade on c6 to damage Black's pawns, then expand on the kingside with h4 behind your bishop pair.", sayShort: "…a6 — c4, Ne5, Nxc6, h4" },
  beats: [
    { atMove: 8, say: "c4 — claiming the centre immediately, the modern way to handle Black's flexible set-up.", sayShort: "c4 — take the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Ne5 — the knight seizes the dominant central outpost, cramping Black and eyeing c6.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "Nxc6 — trading to inflict doubled c-pawns, a permanent target on the queenside.", sayShort: "Nxc6 — doubled c-pawns", highlights: [_H('c6')] },
    { atMove: 20, say: "h4 — gaining kingside space behind the bishop pair, your trumps in this open structure.", sayShort: "h4 — kingside space", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN55: SublineNarration = {
  intro: { say: "Black wastes a move with …h6. You punish it: c4 hits the centre, Qb3 forks b7 and d5, and Qxb7 grabs the pawn — the queen escaping cleanly via b4-a3 with the material banked.", sayShort: "…h6 — c4, Qb3, Qxb7" },
  beats: [
    { atMove: 10, say: "Qb3 — the double attack on b7 and d5. Black's slow …h6 left no time to defend both.", sayShort: "Qb3 — fork b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 12, say: "Qxb7 — snatching the pawn. The queen has a safe route home and Black lacks real compensation.", sayShort: "Qxb7 — grab the pawn", highlights: [_H('b7')] },
    { atMove: 18, say: "Qa3 — the queen retreats to safety, extra pawn in pocket. No swindles, just careful consolidation.", sayShort: "Qa3 — retreat with the pawn", highlights: [_H('a3')] },
    { atMove: 22, say: "Bxc4 — developing and shoring up, converting the clean extra pawn into a winning endgame.", sayShort: "Bxc4 — develop, consolidate", arrows: [_A('c4', 'f7')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN56: SublineNarration = {
  intro: { say: "Black develops …Nbd7. You press b7 and d5 with Qb3, contest the centre with Be5, gain space with c5, then expand the bind with b4 — a classic queenside clamp.", sayShort: "…Nbd7 — Qb3, Be5, c5, b4" },
  beats: [
    { atMove: 12, say: "Qb3 — pressing b7 and d5, putting Black on the defensive before development is complete.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 14, say: "Be5 — the bishop grabs the central outpost, contesting the dark squares and eyeing the kingside.", sayShort: "Be5 — central outpost", highlights: [_H('e5')] },
    { atMove: 18, say: "c5 — gaining queenside space and gripping the position, restricting Black's minor pieces.", sayShort: "c5 — grip the queenside", arrows: [_A('c5', 'd6')] },
    { atMove: 22, say: "b4 — expanding the bind with the minority advance, the natural plan in this fixed structure.", sayShort: "b4 — expand the bind", arrows: [_A('b4', 'b5')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN57: SublineNarration = {
  intro: { say: "Black plays the solid …c6. You trade the dark bishops on d6, press with Qb3, take the c-file with Rc1, then open it with cxd5 to leave Black an isolated d-pawn to besiege.", sayShort: "…c6 — Bxd6, Qb3, Rc1, cxd5" },
  beats: [
    { atMove: 10, say: "Bxd6 — trading the dark bishops, then playing against Black's slightly passive resulting structure.", sayShort: "Bxd6 — trade the dark bishops", highlights: [_H('d6')] },
    { atMove: 12, say: "Qb3 — pressing b7 and d5, the recurring London pressure that ties Black down.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 18, say: "Rc1 — the rook claims the half-open c-file, lining up for the cxd5 break.", sayShort: "Rc1 — claim the c-file", arrows: [_A('c1', 'c6')] },
    { atMove: 20, say: "cxd5 — opening the c-file and leaving Black with an isolated d-pawn, your long-term target.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN58: SublineNarration = {
  intro: { say: "Black sets up passively with …Be7. You press b7 and d5 with Qb3, take the c-file with Rc1, recapture on c4 with the bishop hitting f7, then reposition Be2 to keep the queenside under watch.", sayShort: "…Be7 — Qb3, Rc1, Bxc4" },
  beats: [
    { atMove: 12, say: "Qb3 — pressing b7 and d5 while Black develops slowly. You take the initiative for free.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 16, say: "Rc1 — the rook to the c-file, preparing to meet …dxc4 or push your own break.", sayShort: "Rc1 — to the c-file", arrows: [_A('c1', 'c8')] },
    { atMove: 20, say: "Bxc4 — recapturing; the bishop now eyes f7 and e6 on the active a2-g8 diagonal.", sayShort: "Bxc4 — active diagonal", arrows: [_A('c4', 'f7')] },
    { atMove: 22, say: "Be2 — repositioning to blunt …b5 and keep Black's queenside expansion under control. Patient, solid play.", sayShort: "Be2 — watch the queenside", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN59: SublineNarration = {
  intro: { say: "Black trades with …Bd6. You take to give Black doubled d-pawns, develop Nc3 and recapture actively with the bishop, plant the knight on e5, then take the c-file with Rc1.", sayShort: "…Bd6 — Bxd6, Bxc4, Ne5, Rc1" },
  beats: [
    { atMove: 10, say: "Bxd6 — accepting the trade to leave Black with doubled d-pawns, a permanent structural target.", sayShort: "Bxd6 — doubled d-pawns", highlights: [_H('d6')] },
    { atMove: 14, say: "Bxc4 — recapturing; the bishop hits e6 and f7 from the active diagonal.", sayShort: "Bxc4 — active diagonal", arrows: [_A('c4', 'f7')] },
    { atMove: 20, say: "Ne5 — the knight takes the dominant central outpost, pressing the weak d-pawns and the kingside.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 22, say: "Rc1 — the rook claims the open c-file, aiming at Black's queenside and completing your edge.", sayShort: "Rc1 — seize the c-file", arrows: [_A('c1', 'c8')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};

const LN60: SublineNarration = {
  intro: { say: "With Nd2 in, Black hits the centre with …c5. You guard b2 with Rb1, trade the dark bishops, capture on c5, then challenge with c4 and develop the bishop actively to c4 — an easy, harmonious game.", sayShort: "…c5 — Rb1, Bxd6, c4, Bc4" },
  beats: [
    { atMove: 10, say: "Rb1 — a quiet prophylactic, defending b2 against …Qb6 so you never have to react. The London prizes such small safety moves.", sayShort: "Rb1 — guard b2", highlights: [_H('b2')] },
    { atMove: 12, say: "Bxd6 — trading the dark bishops, then playing against Black's slightly loose structure.", sayShort: "Bxd6 — trade the dark bishops", highlights: [_H('d6')] },
    { atMove: 16, say: "c4 — challenging the centre to open lines for your harmoniously placed pieces.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 22, say: "Bc4 — the bishop swings to an active post hitting f7, completing a comfortable, slightly freer set-up.", sayShort: "Bc4 — active, hit f7", arrows: [_A('c4', 'f7')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN61: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You have the full London set-up, so you fire e4: castle behind it, push e5 to kick the knight and open the b1-h7 diagonal, then pile up with Qe2 for a kingside attack.", sayShort: "…b6 — e4, O-O, e5, Qe2" },
  beats: [
    { atMove: 16, say: "e4 — the thematic break, perfectly timed with every piece developed. The centre opens toward Black's king.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 18, say: "O-O — tucking the king away before the centre fully ignites. Safety first, then the attack.", sayShort: "O-O — king safe first", highlights: [_H('g1')] },
    { atMove: 20, say: "e5 — gaining space and kicking the f6-knight, clearing the b1-h7 diagonal for the d3-bishop.", sayShort: "e5 — kick the knight, open lines", arrows: [_A('d3', 'h7')] },
    { atMove: 22, say: "Qe2 — bringing the last piece toward the kingside, where your space promises a lasting initiative.", sayShort: "Qe2 — reinforce the attack", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN62: SublineNarration = {
  intro: { say: "Black develops quietly with …Be7. You solidify with c3, insert Bb5+ before trading, swap the dark bishops, then centralise with Qe2 and Rfd1 to prepare the e4 break.", sayShort: "…Be7 — Bb5+, Bxd6, Qe2, Rfd1" },
  beats: [
    { atMove: 12, say: "Bb5+ — the useful check, provoking a block before you resolve the central tension.", sayShort: "Bb5+ — provoke first", arrows: [_A('b5', 'e8')] },
    { atMove: 14, say: "Bxd6 — trading the dark bishops to leave Black's queen recapturing passively on d6.", sayShort: "Bxd6 — trade the dark bishops", highlights: [_H('d6')] },
    { atMove: 20, say: "Qe2 — centralising the queen and connecting the rooks, supporting the coming central break.", sayShort: "Qe2 — centralise, connect rooks", highlights: [_H('e2')] },
    { atMove: 22, say: "Rfd1 — the rook to the d-file, completing development and preparing e4. A model London build-up.", sayShort: "Rfd1 — to the d-file", arrows: [_A('d1', 'd8')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN63: SublineNarration = {
  intro: { say: "Black readies …e5 with …Re8. You pre-empt by planting the knight on e5 yourself, recapture exd4 into a mobile centre, support with Ndf3, then trade off Black's active knight.", sayShort: "…Re8 — Ne5, exd4, Ndf3" },
  beats: [
    { atMove: 16, say: "Ne5 — occupying the key central square before Black can play …e5, dominating the board.", sayShort: "Ne5 — seize the outpost", highlights: [_H('e5')] },
    { atMove: 18, say: "exd4 — recapturing toward the centre, opening the e-file and keeping a mobile pawn.", sayShort: "exd4 — mobile centre", highlights: [_H('d4'), _H('e1')] },
    { atMove: 20, say: "Ndf3 — reinforcing the e5-knight with its partner, keeping the central grip firm.", sayShort: "Ndf3 — support e5", arrows: [_A('f3', 'e5')] },
    { atMove: 22, say: "Bxe4 — trading off Black's active knight, simplifying into a position where your structure is the sounder.", sayShort: "Bxe4 — trade, keep the edge", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN64: SublineNarration = {
  intro: { say: "Black trades on g3. You recapture hxg3 to open the h-file, challenge with c4, then advance g4-g5 to gain kingside space and seize the initiative — emerging clearly better after the smoke clears.", sayShort: "…Bxg3 — hxg3, c4, g4-g5" },
  beats: [
    { atMove: 10, say: "hxg3 — recapturing with the h-pawn, opening the h-file for your rook to bear down on the kingside.", sayShort: "hxg3 — open the h-file", highlights: [_H('h1')] },
    { atMove: 12, say: "c4 — challenging the centre, gaining queenside space while your kingside ambitions brew.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "g4 — the pawn rolls forward, gaining space and preparing g5 to seize the initiative on the kingside.", sayShort: "g4 — gain kingside space", arrows: [_A('g4', 'g5')] },
    { atMove: 22, say: "Be2 — developing and consolidating after the sharp play; you emerge with the freer, slightly better game.", sayShort: "Be2 — develop, consolidate", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN65: SublineNarration = {
  intro: { say: "Black hits the centre with …c5. You solidify with c3, point the queen at h7 with Qc2, plant the knight on e5, clamp the queenside with a4, then castle into a harmonious set-up.", sayShort: "…c5 — Qc2, Ne5, a4, O-O" },
  beats: [
    { atMove: 12, say: "Qc2 — the queen eyes h7 and guards the centre, the flexible London square that does double duty.", sayShort: "Qc2 — eye h7, guard centre", arrows: [_A('c2', 'h7')] },
    { atMove: 16, say: "Ne5 — the knight grabs the dominant central outpost, cramping Black's pieces.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 18, say: "a4 — clamping the queenside to stop …a5 and …b5, fixing the structure in your favour.", sayShort: "a4 — clamp the queenside", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "O-O — king to safety with a comfortable, space-based position and the better minor piece on e5.", sayShort: "O-O — safe and comfortable", highlights: [_H('g1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN66: SublineNarration = {
  intro: { say: "Black trades with …cxd4. You recapture exd4 into a mobile centre, trade the dark bishops to fix Black's queen, secure the kingside with g3 after …Nh5, then challenge with c4.", sayShort: "…cxd4 — exd4, Bxd6, g3, c4" },
  beats: [
    { atMove: 16, say: "exd4 — recapturing toward the centre, opening the e-file and keeping a mobile pawn.", sayShort: "exd4 — mobile centre", highlights: [_H('d4'), _H('e1')] },
    { atMove: 18, say: "Bxd6 — trading the dark bishops, leaving Black's queen to recapture and your structure the sounder.", sayShort: "Bxd6 — trade the dark bishops", highlights: [_H('d6')] },
    { atMove: 20, say: "g3 — securing the kingside light squares after …Nh5, calmly defusing any pinprick on f4 and g3.", sayShort: "g3 — secure the kingside", highlights: [_H('g3')] },
    { atMove: 22, say: "c4 — challenging the centre to open lines for your pieces, a small but lasting space edge.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN67: SublineNarration = {
  intro: { say: "Black locks the queenside with …c4. You retreat Bc2 to keep the diagonal, then strike e4 — the right response when the queenside closes — recapturing with the knight and bishop to dominate the centre.", sayShort: "…c4 — Bc2, e4, Bxe4" },
  beats: [
    { atMove: 16, say: "Bc2 — the bishop steps back to keep the b1-h7 diagonal. With the queenside locked, the battle shifts to the centre and kingside.", sayShort: "Bc2 — keep the diagonal", arrows: [_A('c2', 'h7')] },
    { atMove: 18, say: "e4 — the thematic break, the correct reaction to …c4: when Black commits on one wing, you open the centre.", sayShort: "e4 — open the centre", highlights: [_H('e4')] },
    { atMove: 20, say: "Nxe4 — recapturing, the knight reaching a fine central square and opening lines toward Black's king.", sayShort: "Nxe4 — open lines", highlights: [_H('e4')] },
    { atMove: 22, say: "Bxe4 — the bishop recaptures, dominating the long diagonal with a clear initiative.", sayShort: "Bxe4 — dominate the diagonal", arrows: [_A('e4', 'b7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN68: SublineNarration = {
  intro: { say: "Black develops …Nc6. You solidify with c3, pin the knight with Bb5, challenge with c4, then trade on c6 to inflict doubled pawns and route the knight to c4.", sayShort: "…Nc6 — Bb5, c4, Bxc6, Nxc4" },
  beats: [
    { atMove: 12, say: "Bb5 — pinning and pressuring the c6-knight, the recurring London idea against …Nc6.", sayShort: "Bb5 — pressure c6", arrows: [_A('b5', 'c6')] },
    { atMove: 18, say: "c4 — challenging the centre to open lines while Black's pieces are still being placed.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "Bxc6 — trading to leave Black with doubled c-pawns, a permanent target.", sayShort: "Bxc6 — doubled c-pawns", highlights: [_H('c6')] },
    { atMove: 22, say: "Nxc4 — the knight reaches c4, eyeing d6 and e5 with the better structure on the board.", sayShort: "Nxc4 — eye d6 and e5", highlights: [_H('c4')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN69: SublineNarration = {
  intro: { say: "Black plays the slow …a6. You use the time to centralise with Qe2, reroute the bishop via h4, swing it to c2 aiming at h7, then open with dxc5 — pressing a small, durable edge.", sayShort: "…a6 — Qe2, Bh4, Bc2, dxc5" },
  beats: [
    { atMove: 16, say: "Qe2 — centralising the queen and preparing the e4 break while Black drifts without a plan.", sayShort: "Qe2 — centralise, prep e4", highlights: [_H('e2')] },
    { atMove: 18, say: "Bh4 — repositioning the bishop to eye the kingside dark squares, sidestepping any exchange.", sayShort: "Bh4 — eye the dark squares", arrows: [_A('h4', 'd8')] },
    { atMove: 20, say: "Bc2 — the bishop slides to the long diagonal, lining up with the queen toward h7.", sayShort: "Bc2 — aim at h7", arrows: [_A('c2', 'h7')] },
    { atMove: 22, say: "dxc5 — opening the position at the right moment, when your pieces are the more active and coordinated.", sayShort: "dxc5 — open with the lead", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/London_System'],
};
const LN70: SublineNarration = {
  intro: { say: "Black meets the d5 push with a Benoni …d6 and …e5. You pin and trade on f6 to weaken the dark squares, build the big centre with e4, then clamp the queenside with a5 — a space-based Benoni bind.", sayShort: "…d6 — Bg5, Bxf6, e4, a5" },
  beats: [
    { atMove: 8, say: "Bg5 — pinning the f6-knight, preparing to trade it and loosen Black's grip on e5 and the dark squares.", sayShort: "Bg5 — pin the knight", arrows: [_A('g5', 'd8')] },
    { atMove: 12, say: "e4 — building the broad Benoni centre. Your space advantage is the whole point of the early d5.", sayShort: "e4 — build the big centre", highlights: [_H('e4')] },
    { atMove: 16, say: "a5 — clamping the queenside, fixing Black's pawns and denying the freeing …b5 break.", sayShort: "a5 — clamp the queenside", arrows: [_A('a5', 'b6')] },
    { atMove: 18, say: "Nf3 — developing toward the centre, completing a harmonious set-up behind your space.", sayShort: "Nf3 — develop behind space", highlights: [_H('f3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};
const LN71: SublineNarration = {
  intro: { say: "Black gambits with an early …b5. You snatch it with Bxb5+ check, develop solidly with Nc3 and Nge2, tuck the rook to b1, and after opening with exf5 you hold the extra pawn with a clear advantage.", sayShort: "…d6 — Bxb5+, Nc3, Rb1, exf5" },
  beats: [
    { atMove: 10, say: "Bxb5+ — grabbing the gambit pawn with check, the principled answer. Black must prove the compensation.", sayShort: "Bxb5+ — take the gambit pawn", arrows: [_A('b5', 'e8')] },
    { atMove: 12, say: "Nc3 — developing while holding the extra pawn, calmly completing your position.", sayShort: "Nc3 — develop, hold the pawn", highlights: [_H('c3')] },
    { atMove: 16, say: "Rb1 — tucking the rook off the long diagonal and defending b2, taking the sting from Black's pressure.", sayShort: "Rb1 — defuse the diagonal", highlights: [_H('b2')] },
    { atMove: 22, say: "exf5 — opening lines while a pawn up. With the centre clarified you convert the material edge.", sayShort: "exf5 — open up, stay ahead", highlights: [_H('f5')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
const LN72: SublineNarration = {
  intro: { say: "Black pokes with …Qb6. You sidestep with Qc1, keeping b2, build the big centre with e4, then trade off Black's knight on a6 to leave doubled pawns before castling into a commanding space edge.", sayShort: "…Qb6 — Qc1, e4, Bxa6, O-O" },
  beats: [
    { atMove: 8, say: "Qc1 — calmly sidestepping the …Qb6 poke while guarding b2. No need to weaken your structure.", sayShort: "Qc1 — sidestep, guard b2", highlights: [_H('b2')] },
    { atMove: 12, say: "e4 — building the broad centre, the reward for the early d5 space grab.", sayShort: "e4 — build the big centre", highlights: [_H('e4')] },
    { atMove: 20, say: "Bxa6 — trading to saddle Black with doubled a-pawns, a permanent queenside weakness.", sayShort: "Bxa6 — doubled a-pawns", highlights: [_H('a6')] },
    { atMove: 22, say: "O-O — king to safety with a big centre and a structural edge. Now you expand and press.", sayShort: "O-O — safe, big centre", highlights: [_H('g1')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};
const LN73: SublineNarration = {
  intro: { say: "Black supports the …b5 gambit with …a6. You challenge it with a4, push the passed d-pawn to d6, regain the pawn with Nxa4, then gain kingside space with h4 — a healthy plus.", sayShort: "…a6 — a4, d6, Nxa4, h4" },
  beats: [
    { atMove: 10, say: "a4 — challenging the gambit pawn at its base. Black cannot comfortably hold the queenside.", sayShort: "a4 — challenge the b5-pawn", arrows: [_A('a4', 'b5')] },
    { atMove: 12, say: "d6 — the passed pawn lunges forward, splitting Black's position and gaining time on the pieces.", sayShort: "d6 — push the passer", highlights: [_H('d6')] },
    { atMove: 18, say: "Nxa4 — regaining the pawn, the knight eyeing c5 and b6 in Black's loose camp.", sayShort: "Nxa4 — regain, eye c5", highlights: [_H('a4')] },
    { atMove: 22, say: "h4 — gaining kingside space against the fianchetto, prising open lines toward the king.", sayShort: "h4 — kingside space", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
const LN74: SublineNarration = {
  intro: { say: "Black pushes …b4 to keep the gambit pawn. You challenge with a3, undermine with c3, recapture to centralise the knight, then reposition Be3 to support your big centre.", sayShort: "…b4 — a3, c3, Nxc3, Be3" },
  beats: [
    { atMove: 10, say: "a3 — challenging the advanced b4-pawn at once, refusing to let Black settle the queenside.", sayShort: "a3 — challenge b4", arrows: [_A('a3', 'b4')] },
    { atMove: 14, say: "c3 — undermining again, opening lines on the queenside where Black has overextended.", sayShort: "c3 — undermine, open lines", arrows: [_A('c3', 'b4')] },
    { atMove: 16, say: "Nxc3 — recapturing, the knight centralising and eyeing b5 and d5 in Black's camp.", sayShort: "Nxc3 — centralise the knight", highlights: [_H('c3')] },
    { atMove: 22, say: "Be3 — repositioning to support the big centre and eye the queenside, completing a strong set-up.", sayShort: "Be3 — support the centre", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};
const LN75: SublineNarration = {
  intro: { say: "Black checks with …Qa5+. You block with Nd2, challenge the gambit pawn with a4, regain it with the rook on a4, then clamp the queenside with b4 for a lasting bind.", sayShort: "…Qa5+ — Nd2, a4, Rxa4, b4" },
  beats: [
    { atMove: 10, say: "Nd2 — blocking the check while developing, a tempo-neutral reply that keeps your structure intact.", sayShort: "Nd2 — block and develop", highlights: [_H('d2')] },
    { atMove: 12, say: "a4 — challenging the …b5 gambit pawn at its base, forcing the queenside to clarify in your favour.", sayShort: "a4 — challenge the gambit", arrows: [_A('a4', 'b5')] },
    { atMove: 18, say: "Rxa4 — regaining the pawn, the rook active on the open a-file in Black's loosened camp.", sayShort: "Rxa4 — regain on the a-file", highlights: [_H('a4')] },
    { atMove: 22, say: "b4 — clamping the queenside, gaining space and gripping the position with the better game.", sayShort: "b4 — clamp the queenside", arrows: [_A('b4', 'c5')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
const LN76: SublineNarration = {
  intro: { say: "Black fianchettoes with …g6. You build a Maróczy-style big centre with c4 and e4, open lines with dxe6, then develop and reroute the bishop to h2 — a commanding space advantage.", sayShort: "…g6 — c4, dxe6, e4, Bh2" },
  beats: [
    { atMove: 6, say: "c4 — building the broad pawn centre, turning the early d5 into a Benoni-style space bind.", sayShort: "c4 — build the big centre", arrows: [_A('c4', 'd5')] },
    { atMove: 10, say: "dxe6 — opening the position to gain time on Black's pieces while you hold the central majority.", sayShort: "dxe6 — open with tempo", highlights: [_H('e6')] },
    { atMove: 12, say: "e4 — completing the broad centre, cramping Black's fianchetto set-up.", sayShort: "e4 — complete the centre", highlights: [_H('e4')] },
    { atMove: 18, say: "Nf3 — developing toward the centre, the better central grip carrying a clear space edge.", sayShort: "Nf3 — develop, hold space", highlights: [_H('f3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};
const LN77: SublineNarration = {
  intro: { say: "Black hits b-pawn squares with …Qb6 while a pawn up. You challenge with a4, manoeuvre the knight to the fine c4-square, regain the pawn on a4, then trade the fianchetto bishop with Bh6 to expose the king.", sayShort: "…Qb6 — a4, Nc4, Rxa4, Bh6" },
  beats: [
    { atMove: 10, say: "a4 — challenging the …b5 pawn at its base, refusing to let Black consolidate the gambit.", sayShort: "a4 — challenge the gambit", arrows: [_A('a4', 'b5')] },
    { atMove: 14, say: "Nc4 — the knight leaps to a dominant square, eyeing d6 and b6 and harassing the queen.", sayShort: "Nc4 — dominant knight", highlights: [_H('c4')] },
    { atMove: 18, say: "Rxa4 — regaining the pawn with an active rook, your structure intact and Black's loosened.", sayShort: "Rxa4 — regain the pawn", highlights: [_H('a4')] },
    { atMove: 22, say: "Bh6 — trading the fianchettoed bishop to strip the king's dark-square defender before you attack.", sayShort: "Bh6 — strip the king's guard", arrows: [_A('h6', 'g7')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Benko_Gambit'],
};
const LN78: SublineNarration = {
  intro: { say: "Black challenges with …e6. After the trades you centralise the queen on d5, castle long onto the d-file, build the big centre with e4, then grab the pawn with Bxd6 for the better game.", sayShort: "…e6 — Qxd5, O-O-O, e4, Bxd6" },
  beats: [
    { atMove: 10, say: "Qxd5 — recapturing into the centre, the queen eyeing the queenside and Black's loose development.", sayShort: "Qxd5 — centralise the queen", highlights: [_H('d5')] },
    { atMove: 12, say: "O-O-O — castling long, the rook landing on the open d-file with immediate pressure.", sayShort: "O-O-O — rook to the d-file", arrows: [_A('d1', 'd8')] },
    { atMove: 14, say: "e4 — building the broad centre, the space advantage that the early d5 promised.", sayShort: "e4 — build the centre", highlights: [_H('e4')] },
    { atMove: 22, say: "Bxd6 — collecting the pawn, emerging with the better structure and the freer game.", sayShort: "Bxd6 — grab the pawn", highlights: [_H('d6')] },
  ],
  sources: ['concept:pos-center', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};
const LN79: SublineNarration = {
  intro: { say: "Black plays …b5 and …d6. You build the big centre with e4, challenge with a4, open with dxe6, then route the knight to f4 and the bishop to d3 — a strong, space-based set-up.", sayShort: "…d6 — e4, dxe6, Nf4, Bd3" },
  beats: [
    { atMove: 8, say: "e4 — building the broad Benoni centre, your space the reward for the early d5 thrust.", sayShort: "e4 — build the big centre", highlights: [_H('e4')] },
    { atMove: 14, say: "dxe6 — opening the position to gain time on Black's pieces while you keep the central majority.", sayShort: "dxe6 — open with tempo", highlights: [_H('e6')] },
    { atMove: 20, say: "Nf4 — the knight reaches f4, eyeing e6, d5 and g6, pressing Black's weakened light squares.", sayShort: "Nf4 — press the light squares", highlights: [_H('f4')] },
    { atMove: 22, say: "Bd3 — the bishop takes aim at h7, completing development behind your commanding centre.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Benoni_Defense'],
};

const LN80: SublineNarration = {
  intro: { say: "Black centralises with …Nd5, hitting your bishop. You retreat Bg3 to the long diagonal, gain queenside space with a4 where Black has no counterplay, then post the rook on e1 to meet the coming …e5-e4 advance with f3.", sayShort: "…Nd5 — Bg3, a4, Re1" },
  beats: [
    { atMove: 18, say: "Bg3 — calmly retreating off the knight's attack, keeping the bishop on its long diagonal eyeing e5 and d6.", sayShort: "Bg3 — keep the diagonal", arrows: [_A('g3', 'e5')] },
    { atMove: 20, say: "a4 — gaining queenside space and fixing Black's pawns, starting play on the wing where you are stronger.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Re1 — the rook backs the e-file, preparing f3 to undermine Black's …e4 thrust and keep the centre under control.", sayShort: "Re1 — prepare f3", arrows: [_A('e1', 'e4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'],
};

const RT01: SublineNarration = {
  intro: { say: "Black completes with …Bd6 over the big …e5/…d5 centre. You question the g4-bishop with h3, leap Ng5 to provoke and trade on e6, then centralise the queen — preparing to break against Black's static pawns.", sayShort: "…Bd6 — h3, Ng5, Nxe6, Qe2" },
  beats: [
    { atMove: 14, say: "h3 — questioning the g4-bishop before you manoeuvre. Make it commit: retreat or trade, but it cannot just sit and pin.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 16, say: "Ng5 — the knight jumps in to harass the bishop pair and target e6 and f7, the squares Black's set-up left tender.", sayShort: "Ng5 — target e6 and f7", arrows: [_A('g5', 'e6')] },
    { atMove: 18, say: "Nxe6 — trading to saddle Black with doubled, weak e-pawns. A permanent target for the rest of the game.", sayShort: "Nxe6 — doubled e-pawns", highlights: [_H('e6')] },
    { atMove: 22, say: "Qe2 — centralising the queen and connecting the rooks, preparing to play against the fixed Black centre with f4 or d4.", sayShort: "Qe2 — centralise, prep a break", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT02: SublineNarration = {
  intro: { say: "Black grabs space with …d4. You undermine it at the base with c3, recapture toward the centre to build a broad pawn front, then develop the bishop to e3 and play for the c4/d4 expansion.", sayShort: "…d4 — c3, bxc3, Be3" },
  beats: [
    { atMove: 14, say: "c3 — striking the advanced d4-pawn at its base. You refuse to let Black's space-grab stand unchallenged.", sayShort: "c3 — undermine d4", arrows: [_A('c3', 'd4')] },
    { atMove: 16, say: "bxc3 — recapturing toward the centre, opening the b-file for your rook and building a broad pawn front.", sayShort: "bxc3 — broad centre, open b-file", highlights: [_H('c3')] },
    { atMove: 20, say: "Nxf3 — recapturing, the knight eyeing the central squares after the bishop trade. Your structure is sound and flexible.", sayShort: "Nxf3 — recapture, centralise", highlights: [_H('f3')] },
    { atMove: 22, say: "Be3 — developing the bishop to eye the queenside dark squares and support the coming central expansion.", sayShort: "Be3 — develop, eye expansion", highlights: [_H('e3')] },
  ],
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT03: SublineNarration = {
  intro: { say: "Black develops …Bc5 actively. You open the centre with exd5, question the g4-bishop with h3 to win the bishop pair, prepare b4 with Rb1, then simplify into a balanced position where the two bishops are your lasting trump.", sayShort: "…Bc5 — exd5, h3, Rb1, bishops" },
  beats: [
    { atMove: 14, say: "exd5 — opening the centre at the right moment, with your pieces the better coordinated.", sayShort: "exd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 16, say: "h3 — questioning the g4-bishop. When it takes on f3, you gain the bishop pair, a small lasting edge.", sayShort: "h3 — win the bishop pair", highlights: [_H('g4')] },
    { atMove: 20, say: "Rb1 — preparing b4 to gain queenside space and harry the c5-bishop, claiming the initiative on that wing.", sayShort: "Rb1 — prepare b4", highlights: [_H('b4')] },
    { atMove: 22, say: "Nxe5 — entering a series of trades into a balanced, comfortable middlegame where your two bishops are the lasting trump.", sayShort: "Nxe5 — trade, keep the bishops", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT04: SublineNarration = {
  intro: { say: "After the central trade Black plays …Be7. You question the bishop with h3, then expand on the kingside with g4 since the centre is fixed, target the g6-bishop with Nh4, and gain queenside space with a4.", sayShort: "…Be7 — h3, g4, Nh4, a4" },
  beats: [
    { atMove: 16, say: "h3 — questioning the g4-bishop, forcing it to the h5-g6 retreat where you can target it.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "g4 — gaining kingside space and chasing the bishop, possible now the centre is locked and your king is safe.", sayShort: "g4 — kingside space", arrows: [_A('g4', 'g5')] },
    { atMove: 20, say: "Nh4 — targeting the g6-bishop, aiming to trade it and dominate the light squares it leaves behind.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'g6')] },
    { atMove: 22, say: "a4 — gaining queenside space too, squeezing Black on both wings while the centre stays closed.", sayShort: "a4 — squeeze both wings", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT05: SublineNarration = {
  intro: { say: "Black plays …Be7. You open with exd5, swing the rook to the open e-file pressuring e5, gain kingside space with g4, then plant the knight on the c4-outpost eyeing e5 and d6.", sayShort: "…Be7 — exd5, Re1, g4, Nc4" },
  beats: [
    { atMove: 14, say: "exd5 — opening the centre with your forces ready, the natural moment to release the tension.", sayShort: "exd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 16, say: "Re1 — the rook takes the open e-file, bearing down on Black's e5-pawn and the centre.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e5')] },
    { atMove: 20, say: "g4 — gaining kingside space and harassing the bishop, since the fixed centre keeps your king safe.", sayShort: "g4 — kingside space", arrows: [_A('g4', 'g5')] },
    { atMove: 22, say: "Nc4 — the knight reaches the dominant c4-outpost, eyeing e5 and d6 with the better game.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT06: SublineNarration = {
  intro: { say: "Black centralises with …Qc7. You question the g4-bishop with h3, gain queenside space with a4, reroute the queen toward the kingside via e1, then target the bishop with Nh4 — a flexible space edge.", sayShort: "…Qc7 — h3, a4, Qe1, Nh4" },
  beats: [
    { atMove: 16, say: "h3 — questioning the pinning bishop, the standard preliminary before you manoeuvre on the wings.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "a4 — staking out queenside space and fixing Black's pawns where you can later target them.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Qe1 — rerouting the queen toward the kingside, heading for g3 or h4 to join an attack on the fixed structure.", sayShort: "Qe1 — reroute toward kingside", highlights: [_H('e1')] },
    { atMove: 22, say: "Nh4 — targeting the light-squared bishop, eyeing f5 and aiming to dominate the squares it guards.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'f5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT07: SublineNarration = {
  intro: { say: "Black plays a restrained …e6 then …Ne5. You break with e4 to challenge the centre, gain space with c4, and press b7 and d5 with Qb3 — turning your hypermodern set-up into a central clamp.", sayShort: "…e6 — e4, c4, Qb3" },
  beats: [
    { atMove: 10, say: "e4 — the central break, challenging Black's big pawn centre while every piece is harmoniously placed.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 14, say: "c4 — gaining queenside space and pressuring d5, the classic Réti expansion.", sayShort: "c4 — gain space, hit d5", arrows: [_A('c4', 'd5')] },
    { atMove: 16, say: "Qb3 — pressing b7 and d5 at once, exploiting the early …e6 to seize the initiative.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 22, say: "Qc3 — centralising the queen on the long diagonal, eyeing the kingside and Black's loosened position.", sayShort: "Qc3 — centralise on the diagonal", arrows: [_A('c3', 'g7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT08: SublineNarration = {
  intro: { say: "Black develops …Bd6 after the central trade. You leap the knight to the c4-outpost hitting the bishop, centralise with Qe2, question the g4-bishop with h3, then expand with a4.", sayShort: "…Bd6 — Nc4, Qe2, h3, a4" },
  beats: [
    { atMove: 16, say: "Nc4 — the knight jumps to its dream square, hitting the d6-bishop and eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", arrows: [_A('c4', 'd6')] },
    { atMove: 18, say: "Qe2 — centralising and connecting the rooks, supporting the centre and the knight's outpost.", sayShort: "Qe2 — centralise, connect rooks", highlights: [_H('e2')] },
    { atMove: 20, say: "h3 — questioning the g4-bishop, making it commit before you press on the wings.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 22, say: "a4 — gaining queenside space, fixing Black's pawns and completing a comfortable bind.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT09: SublineNarration = {
  intro: { say: "Black builds …e6 and …Bd6. You break with e4, centralise the queen on e2, prepare the second fianchetto with b3, then expand on the kingside with g4 to harass the bishop.", sayShort: "…e6 — e4, Qe2, b3, g4" },
  beats: [
    { atMove: 12, say: "e4 — the thematic central break, challenging Black's pawns with your pieces fully developed.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 14, say: "Qe2 — centralising the queen, supporting e4 and eyeing the kingside.", sayShort: "Qe2 — centralise, support e4", highlights: [_H('e2')] },
    { atMove: 18, say: "b3 — preparing Bb2, the second fianchetto that completes your control of the long diagonals.", sayShort: "b3 — prepare the fianchetto", highlights: [_H('b3')] },
    { atMove: 20, say: "g4 — gaining kingside space and chasing the bishop, since your centre and king are secure.", sayShort: "g4 — kingside space", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT10: SublineNarration = {
  intro: { say: "Black reroutes …Nc5. You gain queenside space with a4 to deny it support, contest with Nc4, prepare the second fianchetto with b3, then complete it with Bb2 raking the long diagonal.", sayShort: "…Nc5 — a4, Nc4, b3, Bb2" },
  beats: [
    { atMove: 16, say: "a4 — gaining queenside space and denying the c5-knight its …b5 support, fixing Black's structure.", sayShort: "a4 — deny …b5", arrows: [_A('a4', 'a5')] },
    { atMove: 18, say: "Nc4 — challenging the c5-knight and eyeing e5 and d6 from the strong outpost.", sayShort: "Nc4 — contest, eye e5", highlights: [_H('c4')] },
    { atMove: 20, say: "b3 — preparing the second fianchetto to complete your grip on the long diagonals.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
    { atMove: 22, say: "Bb2 — the bishop rakes the long diagonal toward e5 and Black's kingside, the soul of the Réti.", sayShort: "Bb2 — rake the long diagonal", arrows: [_A('b2', 'g7')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT11: SublineNarration = {
  intro: { say: "In the Closed Catalan Black grabs the pawn with …dxc4. You leap Ne5 to the central outpost, regain the pawn with Nxc4, gain queenside space with a4, then re-occupy e5 to keep the Catalan bind.", sayShort: "…dxc4 — Ne5, Nxc4, a4, Ne5" },
  beats: [
    { atMove: 14, say: "Ne5 — the Catalan knight leaps to the central outpost, eyeing c4 and c6 and dominating the board.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "Nxc4 — regaining the gambit pawn. The Catalan always recovers it; Black has merely helped your knight to a fine square.", sayShort: "Nxc4 — regain the pawn", highlights: [_H('c4')] },
    { atMove: 18, say: "a4 — gaining queenside space and fixing Black's pawns, denying the freeing …b5.", sayShort: "a4 — deny …b5", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Ne5 — re-establishing the central outpost, pressing c6 and the kingside with a lasting bind.", sayShort: "Ne5 — re-occupy the outpost", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT12: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You occupy e5, open the c-file with cxd5, develop the bishop actively to f4, then re-occupy e5 — keeping the Catalan central grip.", sayShort: "…b6 — Ne5, cxd5, Bf4, Ne5" },
  beats: [
    { atMove: 14, say: "Ne5 — the knight grabs the central outpost, the heart of the Catalan, eyeing c6 and the kingside.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "cxd5 — opening the c-file and leaving Black with a slightly loose structure to defend.", sayShort: "cxd5 — open the c-file", highlights: [_H('d5')] },
    { atMove: 18, say: "Bf4 — developing the bishop actively, eyeing c7 and supporting the e5-knight.", sayShort: "Bf4 — active, support e5", arrows: [_A('f4', 'c7')] },
    { atMove: 22, say: "Ne5 — re-occupying the dominant central square, keeping Black tied to defence.", sayShort: "Ne5 — re-occupy e5", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT13: SublineNarration = {
  intro: { say: "Black plays …a6 to prepare …b5. You centralise the queen with Qd3, regain the pawn on c4, develop the bishop to e3, then leap Ne4 eyeing d6 and f6.", sayShort: "…a6 — Qd3, Qxc4, Be3, Ne4" },
  beats: [
    { atMove: 14, say: "Qd3 — centralising the queen, preparing to recapture on c4 and eyeing the kingside.", sayShort: "Qd3 — centralise the queen", highlights: [_H('d3')] },
    { atMove: 16, say: "Qxc4 — regaining the pawn, the queen active and Black's queenside expansion held in check.", sayShort: "Qxc4 — regain the pawn", highlights: [_H('c4')] },
    { atMove: 20, say: "Be3 — developing the last minor piece, eyeing the queenside dark squares and a4-c5.", sayShort: "Be3 — develop, eye c5", highlights: [_H('e3')] },
    { atMove: 22, say: "Ne4 — the knight leaps to e4, offering trades and eyeing d6 and f6 with the better game.", sayShort: "Ne4 — leap, eye d6", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT14: SublineNarration = {
  intro: { say: "Black plays the solid …c6. You build the big centre with d4, take the Catalan square with Qc2, post the rook on d1, then complete the second fianchetto with b3 and Bb2.", sayShort: "…c6 — d4, Qc2, Rd1, Bb2" },
  beats: [
    { atMove: 12, say: "Qc2 — the queen takes its Catalan post, eyeing c4, c6 and the b1-h7 diagonal.", sayShort: "Qc2 — the Catalan square", arrows: [_A('c2', 'h7')] },
    { atMove: 14, say: "Rd1 — the rook supports the centre and a future e4, lining up behind the d-pawn.", sayShort: "Rd1 — back the centre", arrows: [_A('d1', 'd8')] },
    { atMove: 18, say: "Bb2 — completing the second fianchetto, the bishop raking the long diagonal toward Black's king.", sayShort: "Bb2 — rake the long diagonal", arrows: [_A('b2', 'g7')] },
    { atMove: 22, say: "a4 — gaining queenside space, the slow minority idea that pressures Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT15: SublineNarration = {
  intro: { say: "Black plays the slow …h6. You prepare the second fianchetto with b3 and Bb2, reroute Nd2 to support the centre, then fire the e4 break opening lines for both bishops.", sayShort: "…h6 — b3, Bb2, Nd2, e4" },
  beats: [
    { atMove: 14, say: "b3 — preparing Bb2, the fianchetto that completes your control of the long diagonal.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
    { atMove: 16, say: "Bb2 — the bishop rakes the long diagonal toward e5 and the kingside, the Catalan's pride.", sayShort: "Bb2 — rake the diagonal", arrows: [_A('b2', 'g7')] },
    { atMove: 18, say: "Nd2 — rerouting the knight to support the central e4 break and contest the e4-square.", sayShort: "Nd2 — support e4", highlights: [_H('e4')] },
    { atMove: 20, say: "e4 — the thematic break, opening the centre so both fianchettoed bishops spring to life.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
  ],
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT16: SublineNarration = {
  intro: { say: "After the e4 break and the knight trades, you recapture on e4 with the queen, dominating both diagonals from the centre, post the rook on d1, then tuck the queen back to c2 with the better game.", sayShort: "…Nxe4 — Qxe4, Rd1, Qc2" },
  beats: [
    { atMove: 20, say: "Qxe4 — recapturing into the centre. The queen on e4 rakes both diagonals and dominates the open position.", sayShort: "Qxe4 — centralise the queen", highlights: [_H('e4')] },
    { atMove: 22, say: "Rd1 — the rook takes the open d-file, pressuring the centre and Black's slightly loose pieces.", sayShort: "Rd1 — seize the d-file", arrows: [_A('d1', 'd8')] },
    { atMove: 24, say: "Qc2 — retreating the queen to safety while keeping the central grip and the more harmonious position.", sayShort: "Qc2 — retreat, keep the grip", highlights: [_H('c2')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT17: SublineNarration = {
  intro: { say: "Black plays …Re8. You prepare the fianchetto with b3 and Bb2, recapture on c3 with the bishop to keep the diagonal, swing Re1 to the centre, then centralise the queen on c2.", sayShort: "…Re8 — b3, Bb2, Bxc3, Qc2" },
  beats: [
    { atMove: 14, say: "b3 — preparing the second fianchetto, the engine of your Catalan pressure.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
    { atMove: 16, say: "Bb2 — the bishop rakes the long diagonal toward Black's king, the Catalan's main trump.", sayShort: "Bb2 — rake the diagonal", arrows: [_A('b2', 'g7')] },
    { atMove: 18, say: "Bxc3 — recapturing with the bishop to preserve the long-diagonal pressure and a sound structure.", sayShort: "Bxc3 — keep the diagonal", highlights: [_H('c3')] },
    { atMove: 22, say: "Qc2 — centralising the queen, lining up the central break and pressing the b1-h7 diagonal.", sayShort: "Qc2 — centralise, prep e4", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT18: SublineNarration = {
  intro: { say: "Black jumps …Ne4. You gain queenside space with a4 before it settles, challenge the knight with Qc2, occupy e5, then prepare Bb2 with b3 — keeping the central bind.", sayShort: "…Ne4 — a4, Qc2, Ne5, b3" },
  beats: [
    { atMove: 14, say: "a4 — gaining queenside space and fixing Black's pawns before the e4-knight gets support.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 16, say: "Qc2 — challenging the e4-knight and eyeing the b1-h7 diagonal toward Black's king.", sayShort: "Qc2 — challenge the knight", arrows: [_A('c2', 'e4')] },
    { atMove: 18, say: "Ne5 — the knight grabs the central outpost, eyeing c6 and f7 and dominating the centre.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 22, say: "b3 — preparing Bb2 to complete the fianchetto and clamp the c4-square.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT19: SublineNarration = {
  intro: { say: "Black grabs the pawn with …dxc4. You collect it back with the Catalan tax Qa4+ and Qxc4, build the big centre with d4, then post the rook on d1 — emerging with a clear central edge.", sayShort: "…dxc4 — Qa4+, Qxc4, d4, Rd1" },
  beats: [
    { atMove: 10, say: "Qa4+ — the check that recovers the gambit pawn, the Catalan's standard answer to …dxc4.", sayShort: "Qa4+ — regain via check", arrows: [_A('a4', 'c4')] },
    { atMove: 12, say: "Qxc4 — collecting the pawn, the queen actively placed and the c-file pressure intact.", sayShort: "Qxc4 — collect the pawn", highlights: [_H('c4')] },
    { atMove: 14, say: "d4 — building the broad centre now the material is restored, claiming a clear space edge.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 18, say: "Rd1 — the rook supports d4 and pressures the centre, completing a commanding set-up.", sayShort: "Rd1 — back the centre", arrows: [_A('d1', 'd8')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};

const RT20: SublineNarration = {
  intro: { say: "In the Réti Accepted you have recaptured on c4 and Black plays …Be7. You build the centre with d4, centralise with Qe2, challenge …b5 with a4, then accept a well-supported isolated d-pawn with active pieces.", sayShort: "…Be7 — d4, Qe2, a4, exd4" },
  beats: [
    { atMove: 10, say: "d4 — building the classical centre now your bishop sits on c4, a comfortable Queen's-Gambit-Accepted structure.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "Qe2 — centralising the queen, preparing Rd1 and the e4 advance.", sayShort: "Qe2 — centralise, prep e4", highlights: [_H('e2')] },
    { atMove: 16, say: "a4 — challenging Black's …b5 expansion, prising open the queenside where your pieces are active.", sayShort: "a4 — challenge …b5", arrows: [_A('a4', 'b5')] },
    { atMove: 22, say: "exd4 — recapturing into an isolated d-pawn position, where your active pieces and the half-open files give full compensation.", sayShort: "exd4 — active IQP play", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT21: SublineNarration = {
  intro: { say: "Black develops …Bd6. You build the centre with d4, gain space with e4-e5 kicking the knight, lunge d5 to open lines while ahead in development, then centralise the queen on e4.", sayShort: "…Bd6 — d4, e5, d5, Qe4" },
  beats: [
    { atMove: 10, say: "d4 — claiming the full centre, the QGA structure with your bishop already active on c4.", sayShort: "d4 — claim the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "e5 — gaining space and kicking the f6-knight, cramping Black's position.", sayShort: "e5 — gain space, kick the knight", highlights: [_H('e5')] },
    { atMove: 16, say: "d5 — the central pawn lunges forward, opening lines while you lead in development.", sayShort: "d5 — open lines with the lead", highlights: [_H('d5')] },
    { atMove: 20, say: "Qe4 — centralising the queen, eyeing h7 and the kingside with a clear initiative.", sayShort: "Qe4 — centralise, eye h7", arrows: [_A('e4', 'h7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT22: SublineNarration = {
  intro: { say: "Black develops …Nc6. You build the centre with d4, tuck the rook to e1, reroute the bishop, then fire the e4 break and expand with b4 — a big space advantage.", sayShort: "…Nc6 — d4, Re1, e4, b4" },
  beats: [
    { atMove: 10, say: "d4 — building the central pawn duo, your bishop already eyeing f7 from c4.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "Re1 — the rook backs the e-pawn, preparing the central e4 advance.", sayShort: "Re1 — prepare e4", arrows: [_A('e1', 'e4')] },
    { atMove: 18, say: "e4 — the central break, seizing a broad pawn centre and cramping Black.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 22, say: "b4 — gaining queenside space, the natural plan once the centre is settled.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT23: SublineNarration = {
  intro: { say: "Black develops …Bc5. You build the centre with d4, post the rook on d1, retreat the bishop to b3 eyeing f7, develop Nc3, then challenge …b5 with a4.", sayShort: "…Bc5 — d4, Rd1, Bb3, a4" },
  beats: [
    { atMove: 10, say: "d4 — claiming the centre, gaining a tempo on the c5-bishop that must step back.", sayShort: "d4 — claim the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "Rd1 — the rook to the d-file, supporting d4 and pressuring down the centre.", sayShort: "Rd1 — back the centre", arrows: [_A('d1', 'd8')] },
    { atMove: 18, say: "Nc3 — developing with pressure on d5 and b5, eyeing the e4 advance.", sayShort: "Nc3 — develop, eye d5", highlights: [_H('d5')] },
    { atMove: 20, say: "a4 — challenging the …b5 expansion and gaining queenside space.", sayShort: "a4 — challenge …b5", arrows: [_A('a4', 'b5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT24: SublineNarration = {
  intro: { say: "Black plays …a6. You build the centre with d4, open with dxc5, then trade queens on d8 — stripping Black's castling and leaving the king stuck on d8 while your knight grabs e5.", sayShort: "…a6 — d4, dxc5, Qxd8+, Ne5" },
  beats: [
    { atMove: 10, say: "d4 — building the centre, your bishop already active on c4.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "dxc5 — opening the position and gaining a tempo on the bishop recapture.", sayShort: "dxc5 — open with tempo", highlights: [_H('c5')] },
    { atMove: 14, say: "Qxd8+ — trading queens to deny Black castling. The king is stranded on d8, a lasting inconvenience.", sayShort: "Qxd8+ — strip the castling", highlights: [_H('d8')] },
    { atMove: 18, say: "Ne5 — the knight grabs the central outpost, pressing the awkward Black king and the queenside.", sayShort: "Ne5 — outpost, press the king", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-king-safety', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT25: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You centralise with Qe2, build the centre with d4, hop the knight to a4 to exploit the …b4 weakening, then reposition the bishop to c2 on the b1-h7 diagonal.", sayShort: "…b6 — Qe2, d4, Na4, Bc2" },
  beats: [
    { atMove: 10, say: "Qe2 — centralising the queen, preparing d4 and Rd1.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 12, say: "d4 — building the centre against the fianchetto, claiming space.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 18, say: "Na4 — the knight eyes c5 and b6, exploiting the holes the …b4 push left behind.", sayShort: "Na4 — into the holes", highlights: [_H('c5')] },
    { atMove: 22, say: "Bc2 — repositioning the bishop to the long b1-h7 diagonal, aiming at the kingside.", sayShort: "Bc2 — to the diagonal", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT26: SublineNarration = {
  intro: { say: "Black plays …c6 then …c5. You build the centre with d4, develop Nc3, recapture into an isolated d-pawn, develop the bishop actively to f4, then plant the knight on e5.", sayShort: "…c6 — d4, exd4, Bf4, Ne5" },
  beats: [
    { atMove: 10, say: "d4 — building the centre, the QGA structure with the bishop active on c4.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "exd4 — recapturing into an isolated d-pawn, accepting it for active pieces and open files.", sayShort: "exd4 — active IQP", highlights: [_H('d4')] },
    { atMove: 16, say: "Bf4 — developing the bishop actively, eyeing c7 and supporting the e5 outpost.", sayShort: "Bf4 — active, support e5", arrows: [_A('f4', 'c7')] },
    { atMove: 22, say: "Ne5 — the knight reaches the e5-outpost, the IQP's classic attacking square.", sayShort: "Ne5 — the IQP outpost", highlights: [_H('e5')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT27: SublineNarration = {
  intro: { say: "Black plays …c5 and …Nc6. You centralise with Qe2, develop Nc3, reposition the bishop to b3 eyeing f7, open with dxc5, then seize space with e4-e5.", sayShort: "…Nc6 — Qe2, Bb3, dxc5, e4-e5" },
  beats: [
    { atMove: 12, say: "Qe2 — centralising the queen, preparing the e4 advance.", sayShort: "Qe2 — centralise, prep e4", highlights: [_H('e2')] },
    { atMove: 16, say: "Bb3 — repositioning the bishop to eye f7 and e6 on the a2-g8 diagonal.", sayShort: "Bb3 — eye f7", arrows: [_A('b3', 'f7')] },
    { atMove: 18, say: "dxc5 — opening the position, gaining a tempo before the central break.", sayShort: "dxc5 — open with tempo", highlights: [_H('c5')] },
    { atMove: 20, say: "e4 — the central break, seizing space and pointing every piece at Black's king.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT28: SublineNarration = {
  intro: { say: "Black recaptures …Bxc5 and develops …Nc6. You restrain with a3, post the rook on d1, reposition the bishop to d3 aiming at h7, then gain queenside space with b4.", sayShort: "…Nc6 — a3, Rd1, Bd3, b4" },
  beats: [
    { atMove: 16, say: "a3 — preparing b4 and restraining Black's queenside, a useful little move.", sayShort: "a3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 18, say: "Rd1 — the rook to the d-file, eyeing the d6-bishop and pressing the centre.", sayShort: "Rd1 — to the d-file", arrows: [_A('d1', 'd8')] },
    { atMove: 20, say: "Bd3 — repositioning the bishop to the b1-h7 diagonal, aiming at h7.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 22, say: "b4 — gaining queenside space, the minority plan that fixes a target on Black's pawns.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'],
};
const RT30: SublineNarration = {
  intro: { say: "In the King's Indian Attack Black trades …dxe4. You recapture, gain space with e5 to kick the knight, leap Ne4 to the great central square, then pin with Bg5 and build the kingside initiative.", sayShort: "…dxe4 — dxe4, e5, Ne4, Bg5" },
  beats: [
    { atMove: 14, say: "dxe4 — recapturing, opening the position for your KIA pieces.", sayShort: "dxe4 — recapture, open up", highlights: [_H('e4')] },
    { atMove: 16, say: "e5 — the thematic KIA space gain, kicking the f6-knight and cramping Black's kingside.", sayShort: "e5 — gain space, kick the knight", highlights: [_H('e5')] },
    { atMove: 18, say: "Ne4 — the knight leaps to the dominant e4-square, eyeing d6 and f6 and supporting the attack.", sayShort: "Ne4 — dominant central knight", highlights: [_H('e4')] },
    { atMove: 20, say: "Bg5 — pinning and pressing, bringing the bishop into the kingside build-up.", sayShort: "Bg5 — pin, build the attack", arrows: [_A('g5', 'd8')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT31: SublineNarration = {
  intro: { say: "Black plays …c6 and …Bf5. You expand with c4, hit b7 and d5 with Qb3, develop Nc3, then lift the rook to a4 to swing it to the queenside.", sayShort: "…c6 — c4, Qb3, Nc3, Ra4" },
  beats: [
    { atMove: 8, say: "c4 — challenging the centre, the Réti expansion against the solid …c6.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 10, say: "Qb3 — pressing b7 and d5, exploiting the early …Bf5 that left the queenside loose.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 14, say: "Nc3 — developing with pressure on d5, completing your harmonious set-up.", sayShort: "Nc3 — pressure d5", highlights: [_H('d5')] },
    { atMove: 20, say: "Ra4 — the rook lifts to the fourth, swinging to the queenside to press Black's weaknesses.", sayShort: "Ra4 — rook lift to press", arrows: [_A('a4', 'c4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT32: SublineNarration = {
  intro: { say: "Black locks the centre with …d4. You gain queenside space with a4, reroute the knight via e1, then launch the classic King's Indian Attack pawn storm with f4 and g4.", sayShort: "…d4 — a4, Ne1, f4, g4" },
  beats: [
    { atMove: 14, say: "a4 — gaining queenside space; with the centre closed the game is decided on the wings.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 16, say: "Ne1 — rerouting the knight toward the kingside and to pressure the d4-pawn, clearing f-pawn's path.", sayShort: "Ne1 — reroute the knight", highlights: [_H('e1')] },
    { atMove: 18, say: "f4 — the kingside pawn storm begins, the heart of the KIA against a fixed centre.", sayShort: "f4 — start the storm", arrows: [_A('f4', 'f5')] },
    { atMove: 22, say: "g4 — the storm rolls forward, prising open lines toward Black's castled king.", sayShort: "g4 — open the king", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT33: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You open with exd5 to leave an isolated d-pawn, plant the knight on e5, reinforce with Ndf3, develop Bf4, then take the open e-file.", sayShort: "…b6 — exd5, Ne5, Bf4, Re1" },
  beats: [
    { atMove: 14, say: "exd5 — opening the centre and saddling Black with an isolated d-pawn to besiege.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 16, say: "Ne5 — the knight grabs the central outpost in front of the isolated pawn.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 18, say: "Ndf3 — reinforcing the e5-knight with its partner, keeping the central bind.", sayShort: "Ndf3 — support e5", arrows: [_A('f3', 'e5')] },
    { atMove: 22, say: "Re1 — the rook takes the open e-file, completing pressure on Black's isolated pawn.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT34: SublineNarration = {
  intro: { say: "Black plays …c5. You strike with d4 to open the centre, recapture with the knight, challenge Black's advanced d-pawn with c4, then leave an isolated pawn and take the e-file.", sayShort: "…c5 — d4, c4, exd4, Re1" },
  beats: [
    { atMove: 8, say: "d4 — striking the centre, opening lines into a Tarrasch-style structure.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "c4 — challenging Black's advanced d-pawn, refusing to let the space-grab stand.", sayShort: "c4 — challenge the d-pawn", arrows: [_A('c4', 'd5')] },
    { atMove: 18, say: "exd4 — recapturing, leaving Black with an isolated d-pawn for you to blockade and besiege.", sayShort: "exd4 — create the isolani", highlights: [_H('d4')] },
    { atMove: 20, say: "Re1 — the rook takes the open e-file, the natural post in these structures.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT35: SublineNarration = {
  intro: { say: "With the centre closed and the e5-spearhead set, Black plays …Bb7. You launch the kingside storm with h4, develop Bf4 to support e5, then reroute the knight via h2 toward g4 and the attack.", sayShort: "…Bb7 — h4, Bf4, N1h2" },
  beats: [
    { atMove: 20, say: "h4 — the kingside pawn storm begins, the KIA's attacking plan against the castled king.", sayShort: "h4 — start the storm", arrows: [_A('h4', 'h5')] },
    { atMove: 22, say: "Bf4 — developing the bishop to support the e5-spearhead and eye c7.", sayShort: "Bf4 — support e5", arrows: [_A('f4', 'c7')] },
    { atMove: 24, say: "N1h2 — rerouting the knight toward g4, bringing another attacker to the kingside.", sayShort: "N1h2 — reroute to g4", highlights: [_H('h2')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT36: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You develop Bf4 to support the e5-spearhead, launch the kingside storm with h4, then reroute the knight via h2 toward g4 and the attack.", sayShort: "…Qc7 — Bf4, h4, N1h2" },
  beats: [
    { atMove: 20, say: "Bf4 — developing the bishop to buttress the e5-pawn and eye the c7-queen.", sayShort: "Bf4 — support e5", arrows: [_A('f4', 'c7')] },
    { atMove: 22, say: "h4 — the kingside pawn storm begins, prising open the king's cover.", sayShort: "h4 — start the storm", arrows: [_A('h4', 'h5')] },
    { atMove: 24, say: "N1h2 — rerouting the knight toward g4 to join the kingside assault.", sayShort: "N1h2 — reroute to g4", highlights: [_H('h2')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT37: SublineNarration = {
  intro: { say: "Black fianchettoes …g6 Grünfeld-style. You take the full centre with d4, expand with c4, recapture on b3 with the queen eyeing b7 and d5, then post the rook on d1.", sayShort: "…g6 — d4, c4, Qxb3, Rfd1" },
  beats: [
    { atMove: 6, say: "d4 — taking the full centre against the fianchetto, denying Black the hypermodern counter-strike.", sayShort: "d4 — take the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "c4 — challenging d5, the broad English/Réti pawn front.", sayShort: "c4 — challenge d5", arrows: [_A('c4', 'd5')] },
    { atMove: 18, say: "Qxb3 — recapturing, the queen active and eyeing b7 and d5.", sayShort: "Qxb3 — active queen", arrows: [_A('b3', 'b7')] },
    { atMove: 22, say: "Rfd1 — the rook to the d-file, pressing the centre and Black's d5-pawn.", sayShort: "Rfd1 — pressure the centre", arrows: [_A('d1', 'd8')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT38: SublineNarration = {
  intro: { say: "Black expands with …b5. You plant the knight on e5, challenge the advance with a4, then reroute Ng4 toward the kingside — a double-edged, roughly balanced game where your kingside chances meet Black's queenside play.", sayShort: "…b5 — Ne5, a4, Ng4" },
  beats: [
    { atMove: 14, say: "Ne5 — the knight grabs the central outpost, eyeing the kingside and Black's loosened queenside.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "a4 — challenging the …b5 advance, opening the queenside to contest Black's space.", sayShort: "a4 — challenge …b5", arrows: [_A('a4', 'b5')] },
    { atMove: 18, say: "Ng4 — rerouting the knight toward the kingside, where your chances lie in this double-edged race.", sayShort: "Ng4 — reroute to the kingside", highlights: [_H('g4')] },
    { atMove: 22, say: "Qxg4 — recapturing, the queen joining the kingside with active play to balance Black's queenside push.", sayShort: "Qxg4 — active, balanced game", highlights: [_H('g4')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const RT39: SublineNarration = {
  intro: { say: "Black develops …Bf5 early. You expand with c4, hit b7 and d5 with Qb3, then target the bishop with Nh4 and trade it on g6 to damage Black's kingside pawns.", sayShort: "…Bf5 — c4, Qb3, Nh4, Nxg6" },
  beats: [
    { atMove: 6, say: "c4 — challenging the centre, the Réti expansion against the early bishop sortie.", sayShort: "c4 — challenge the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 8, say: "Qb3 — pressing b7 and d5, punishing the loose queenside the early …Bf5 leaves.", sayShort: "Qb3 — pressure b7 and d5", arrows: [_A('b3', 'b7')] },
    { atMove: 16, say: "Nh4 — targeting the f5-bishop, aiming to trade it and dominate the light squares.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'f5')] },
    { atMove: 20, say: "Nxg6 — trading to damage Black's kingside pawns and open the h-file for your rook.", sayShort: "Nxg6 — damage the kingside", highlights: [_H('g6')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};

const RT40: SublineNarration = {
  intro: { say: "Black plays the solid …c6. You build the big centre with d4, take the Catalan square with Qc2, post the rook on d1, then complete the double fianchetto with b3 and Bb2.", sayShort: "…c6 — d4, Qc2, Bb2, a4" },
  beats: [
    { atMove: 10, say: "d4 — building the central duo, the broad Réti-Catalan pawn front.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "Qc2 — the queen takes its Catalan post, eyeing c4, c6 and the b1-h7 diagonal.", sayShort: "Qc2 — the Catalan square", arrows: [_A('c2', 'h7')] },
    { atMove: 18, say: "Bb2 — completing the second fianchetto, the bishop raking the long diagonal toward Black's king.", sayShort: "Bb2 — rake the long diagonal", arrows: [_A('b2', 'g7')] },
    { atMove: 22, say: "a4 — gaining queenside space, the slow minority plan that pressures Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT41: SublineNarration = {
  intro: { say: "Black grabs the pawn with …dxc4. You recover it with the Catalan tax Qa4+ and Qxc4, build the centre with d4, then post the rook on d1 with a clear edge.", sayShort: "…dxc4 — Qa4+, Qxc4, d4, Rd1" },
  beats: [
    { atMove: 10, say: "Qa4+ — the check that recovers the gambit pawn, the Catalan's standard answer.", sayShort: "Qa4+ — regain via check", arrows: [_A('a4', 'c4')] },
    { atMove: 12, say: "Qxc4 — collecting the pawn, the queen actively placed on the c-file.", sayShort: "Qxc4 — collect the pawn", highlights: [_H('c4')] },
    { atMove: 14, say: "d4 — building the broad centre now the material is restored.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 18, say: "Rd1 — the rook supports d4 and pressures the centre, completing a commanding set-up.", sayShort: "Rd1 — back the centre", arrows: [_A('d1', 'd8')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT42: SublineNarration = {
  intro: { say: "Black grabs early with …dxc4. You recover it with Qa4+ and Qxc4, build the centre with d4, then trade queens on d8 — denying Black castling and pressing the king in the ending.", sayShort: "…dxc4 — Qa4+, d4, Qxd8+" },
  beats: [
    { atMove: 8, say: "Qa4+ — the check that recovers the gambit pawn, the Catalan's familiar tax.", sayShort: "Qa4+ — regain via check", arrows: [_A('a4', 'c4')] },
    { atMove: 12, say: "d4 — building the broad centre with the pawn restored.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 18, say: "Qxd8+ — trading queens to deny Black castling; the king is stuck and you press in the ending.", sayShort: "Qxd8+ — strip the castling", highlights: [_H('d8')] },
    { atMove: 22, say: "Nc3 — developing with the structural edge in hand, targeting the awkward Black set-up.", sayShort: "Nc3 — develop, press", highlights: [_H('c3')] },
  ],
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT43: SublineNarration = {
  intro: { say: "Black grabs space with …d4. You hit it from the flank with b4, complete the fianchetto with Bb2, push b5 to chase the knight to the rim, then undermine the pawn with e3.", sayShort: "…d4 — b4, Bb2, b5, e3" },
  beats: [
    { atMove: 8, say: "b4 — the wing thrust, gaining queenside space and undermining the c5-support of Black's d4-pawn.", sayShort: "b4 — undermine from the flank", arrows: [_A('b4', 'c5')] },
    { atMove: 12, say: "b5 — pushing on to chase the c6-knight to the rim, where it does little.", sayShort: "b5 — chase the knight", arrows: [_A('b5', 'c6')] },
    { atMove: 16, say: "e3 — undermining the d4-pawn at its base, exposing Black's overextension.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 22, say: "Qc2 — centralising the queen around the d4 weakness, your pieces the better placed.", sayShort: "Qc2 — centralise on d4", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT44: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You build the centre with d4, occupy e5, swing the bishop to a3 to pin the e7-bishop and hit c5, then open lines with dxc5 and cxd5.", sayShort: "…b6 — d4, Ne5, Ba3, cxd5" },
  beats: [
    { atMove: 12, say: "d4 — building the centre against the double fianchetto.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "Ne5 — the Catalan knight grabs the central outpost, eyeing c6 and the kingside.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "Ba3 — the bishop swings to a3, pinning the e7-bishop against the rook and pressing c5.", sayShort: "Ba3 — pin and press c5", arrows: [_A('a3', 'e7')] },
    { atMove: 20, say: "cxd5 — opening lines, leaving Black with an isolated d-pawn to defend.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT45: SublineNarration = {
  intro: { say: "Black grabs the pawn early with …dxc4. You prepare recovery with Qc2, collect it on c4, develop d3 and the second fianchetto with b3 and Bb2 — raking the long diagonal.", sayShort: "…dxc4 — Qc2, Qxc4, Bb2" },
  beats: [
    { atMove: 10, say: "Qc2 — the queen prepares to regain the c4-pawn while eyeing the centre and the b1-h7 diagonal.", sayShort: "Qc2 — prepare to regain c4", highlights: [_H('c2')] },
    { atMove: 12, say: "Qxc4 — collecting the gambit pawn, the queen actively placed.", sayShort: "Qxc4 — collect the pawn", highlights: [_H('c4')] },
    { atMove: 16, say: "b3 — preparing the second fianchetto, completing your grip on the long diagonals.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
    { atMove: 20, say: "Bb2 — the bishop rakes the long diagonal toward e5 and the centre, the Réti's soul.", sayShort: "Bb2 — rake the long diagonal", arrows: [_A('b2', 'g7')] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT46: SublineNarration = {
  intro: { say: "Deep in the double-fianchetto Réti, Black trades …cxd4. You recapture with the knight, centralising it, then bring the queen to d4 on the long diagonal with the better-coordinated game.", sayShort: "…cxd4 — Nxd4, Qxd4" },
  beats: [
    { atMove: 20, say: "Nxd4 — recapturing, the knight centralised and eyeing c6 and f5.", sayShort: "Nxd4 — centralise the knight", highlights: [_H('d4')] },
    { atMove: 22, say: "Qxd4 — the queen recaptures and dominates the long diagonal, your bishops raking toward Black's king.", sayShort: "Qxd4 — dominate the diagonal", arrows: [_A('d4', 'g7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT47: SublineNarration = {
  intro: { say: "Black plays …c5 for a Tarrasch structure. You open with cxd5, fix the centre with d4, pin with Bg5, then plant the knight on e5 to press Black's hanging or isolated pawns.", sayShort: "…c5 — cxd5, Bg5, Ne5, Nxc6" },
  beats: [
    { atMove: 8, say: "cxd5 — opening the centre into a Tarrasch structure where Black must mind the hanging pawns.", sayShort: "cxd5 — Tarrasch structure", highlights: [_H('d5')] },
    { atMove: 14, say: "Bg5 — pinning the f6-knight, adding pressure to the d5-pawn it defends.", sayShort: "Bg5 — pin, pressure d5", arrows: [_A('g5', 'd8')] },
    { atMove: 20, say: "Ne5 — the knight grabs the central outpost, pressing Black's loose pawns.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 22, say: "Nxc6 — trading to inflict doubled c-pawns, a fixed target for the rest of the game.", sayShort: "Nxc6 — doubled c-pawns", highlights: [_H('c6')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Tarrasch_Defense'],
};
const RT48: SublineNarration = {
  intro: { say: "Deep in the line Black grabs …dxc4. You leap Ne5 to the central outpost as the position opens, then recapture exd4 with a supported centre, the bishops raking the diagonals.", sayShort: "…dxc4 — Ne5, exd4" },
  beats: [
    { atMove: 20, say: "Ne5 — the knight seizes the central outpost just as the centre cracks open.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 22, say: "exd4 — recapturing with a supported centre, your fianchettoed bishops raking the long diagonals.", sayShort: "exd4 — supported centre", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT49: SublineNarration = {
  intro: { say: "Black advances …d4. You undermine it with e3, occupy e5, open lines with exd4, then swing the bishop to a3 to pin the e7-bishop and press the queenside.", sayShort: "…d4 — e3, Ne5, exd4, Ba3" },
  beats: [
    { atMove: 12, say: "e3 — striking the advanced d4-pawn at its base, refusing to let the space-grab stand.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 14, say: "Ne5 — the knight grabs the central outpost, eyeing d7 and f7.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
    { atMove: 16, say: "exd4 — opening lines, winning the structural battle over the overextended pawn.", sayShort: "exd4 — open, win the battle", highlights: [_H('d4')] },
    { atMove: 22, say: "Ba3 — the bishop swings to a3, pinning the e7-bishop and pressing the queenside.", sayShort: "Ba3 — pin and press", arrows: [_A('a3', 'e7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Catalan_Opening'],
};
const RT50: SublineNarration = {
  intro: { say: "Black's queen sits on d4. You develop d3, gain a tempo by attacking it with Be3, centralise the queen on f3, strike d4, then castle long for a quick initiative.", sayShort: "…Nf6 — d3, Be3, Qf3, O-O-O" },
  beats: [
    { atMove: 12, say: "d3 — developing and preparing to chase the centralised black queen with gain of tempo.", sayShort: "d3 — prepare to chase the queen", highlights: [_H('d3')] },
    { atMove: 14, say: "Be3 — attacking the d4-queen, developing with tempo while Black must retreat.", sayShort: "Be3 — develop with tempo", arrows: [_A('e3', 'd4')] },
    { atMove: 18, say: "Qf3 — centralising the queen on f3, eyeing the long diagonal and f7.", sayShort: "Qf3 — centralise, eye f7", highlights: [_H('f3')] },
    { atMove: 22, say: "O-O-O — castling long, the rooks landing on the central files for a fast initiative.", sayShort: "O-O-O — rooks to the centre", highlights: [_H('c1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT51: SublineNarration = {
  intro: { say: "Black plays …c6. You develop d3, centralise with Qe2, then expand on the kingside with g4-g5 — gaining space and the initiative behind your bishop pair.", sayShort: "…c6 — d3, Qe2, g4, g5" },
  beats: [
    { atMove: 12, say: "d3 — developing and restraining Black's centre before you expand.", sayShort: "d3 — develop, restrain", highlights: [_H('d3')] },
    { atMove: 14, say: "Qe2 — centralising the queen, preparing the kingside pawn advance.", sayShort: "Qe2 — centralise, prep g4", highlights: [_H('e2')] },
    { atMove: 18, say: "g4 — gaining kingside space, the plan backed by your two bishops.", sayShort: "g4 — gain kingside space", arrows: [_A('g4', 'g5')] },
    { atMove: 22, say: "g5 — the storm rolls on, kicking the h6-knight and prising open lines.", sayShort: "g5 — kick the knight", highlights: [_H('g5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT52: SublineNarration = {
  intro: { say: "Black develops …Bf5. You develop d3, offer the queen trade with Qb3 hitting b7, trade into a structure with Black's doubled b-pawns, then develop the bishop to e3.", sayShort: "…Bf5 — d3, Qb3, Qxb6, Be3" },
  beats: [
    { atMove: 12, say: "d3 — developing and eyeing the centralised black queen, preparing to gain time on it.", sayShort: "d3 — develop", highlights: [_H('d3')] },
    { atMove: 14, say: "Qb3 — offering the queen trade and hitting b7, contesting the queenside.", sayShort: "Qb3 — offer trade, hit b7", arrows: [_A('b3', 'b7')] },
    { atMove: 16, say: "Qxb6 — trading into a structure where Black has doubled, weak b-pawns.", sayShort: "Qxb6 — doubled b-pawns", highlights: [_H('b6')] },
    { atMove: 18, say: "Be3 — developing the bishop, eyeing the queenside dark squares and the weak pawns.", sayShort: "Be3 — eye the weak pawns", highlights: [_H('e3')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT53: SublineNarration = {
  intro: { say: "Black blunders with …Bb4, hanging the bishop. You play Qa4+ to fork, and after the …Qd7 block you simply take it with Qxb4 — a clean extra piece. Develop and convert.", sayShort: "…Bb4 — Qa4+ then Qxb4 wins it" },
  beats: [
    { atMove: 14, say: "Qa4+ — the check that exploits the loose b4-bishop. Black must block, and the bishop has no defender.", sayShort: "Qa4+ — check, win the bishop", arrows: [_A('a4', 'b4')] },
    { atMove: 16, say: "Qxb4 — collecting the piece. Black overlooked the tactic; you are up a clean bishop.", sayShort: "Qxb4 — win the piece", highlights: [_H('b4')] },
    { atMove: 18, say: "Be2 — developing calmly with the extra piece. No swindles, just careful conversion.", sayShort: "Be2 — develop, consolidate", highlights: [_H('e2')] },
    { atMove: 22, say: "Be3 — the second bishop develops, eyeing the queenside as you convert the material edge.", sayShort: "Be3 — develop, convert", highlights: [_H('e3')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT54: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You offer the queen trade with Qb3 hitting b7, develop d3, question the bishop with h3, then trade queens into a structure with Black's doubled b-pawns.", sayShort: "…Bg4 — Qb3, h3, Qxb6" },
  beats: [
    { atMove: 12, say: "Qb3 — offering the queen trade and pressing b7, contesting the queenside immediately.", sayShort: "Qb3 — offer trade, hit b7", arrows: [_A('b3', 'b7')] },
    { atMove: 16, say: "h3 — questioning the g4-bishop, forcing it to commit.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "Be3 — developing the bishop, eyeing the queenside dark squares.", sayShort: "Be3 — develop", highlights: [_H('e3')] },
    { atMove: 22, say: "Qxb6 — trading into a better structure with Black's doubled b-pawns, a lasting target.", sayShort: "Qxb6 — doubled b-pawns", highlights: [_H('b6')] },
  ],
  sources: ['concept:pawn-doubled', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT55: SublineNarration = {
  intro: { say: "Black develops …Nf6 with …e5. You gain a tempo with Be3 on the queen, centralise on f3, strike the centre with d4, then castle long for a quick initiative.", sayShort: "…Nf6 — Be3, Qf3, d4, O-O-O" },
  beats: [
    { atMove: 14, say: "Be3 — attacking the centralised d-queen and developing with tempo.", sayShort: "Be3 — develop with tempo", arrows: [_A('e3', 'd8')] },
    { atMove: 18, say: "Qf3 — centralising the queen on the long diagonal, eyeing f7.", sayShort: "Qf3 — centralise, eye f7", highlights: [_H('f3')] },
    { atMove: 20, say: "d4 — striking the centre, opening lines for the better-developed side.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 22, say: "O-O-O — castling long, the rooks landing on the central files for the initiative.", sayShort: "O-O-O — rooks to the centre", highlights: [_H('c1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT56: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You push d5 to gain space and chase the knight, recapture Qxf3, fianchetto with b3 and Bb2, castle long, then storm with f4 behind the bishop pair.", sayShort: "…Bg4 — d5, Qxf3, Bb2, f4" },
  beats: [
    { atMove: 8, say: "d5 — the passed pawn lunges, kicking the c6-knight and gaining central space.", sayShort: "d5 — push, gain space", highlights: [_H('d5')] },
    { atMove: 10, say: "Qxf3 — recapturing, the queen centralised after Black gave up the bishop pair.", sayShort: "Qxf3 — centralise, keep bishops", highlights: [_H('f3')] },
    { atMove: 16, say: "Bb2 — the bishop rakes the long diagonal, part of your two-bishop battery.", sayShort: "Bb2 — rake the diagonal", arrows: [_A('b2', 'g7')] },
    { atMove: 22, say: "f4 — the kingside pawn storm, attacking with the bishop pair and a space edge.", sayShort: "f4 — storm with the bishops", arrows: [_A('f4', 'f5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT57: SublineNarration = {
  intro: { say: "Black plays …e6. You develop d3, gain a tempo on the queen with Be3, strike the centre with d4, then expand on the kingside with h4 as the better-developed side.", sayShort: "…e6 — d3, Be3, d4, h4" },
  beats: [
    { atMove: 12, say: "d3 — developing and preparing to gain time on the centralised queen.", sayShort: "d3 — develop", highlights: [_H('d3')] },
    { atMove: 14, say: "Be3 — attacking the d4-queen, developing with tempo while it retreats.", sayShort: "Be3 — develop with tempo", arrows: [_A('e3', 'd4')] },
    { atMove: 16, say: "d4 — striking the centre, seizing space and opening lines.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 22, say: "h4 — gaining kingside space, the better-developed side pressing for the initiative.", sayShort: "h4 — gain kingside space", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT58: SublineNarration = {
  intro: { say: "Black develops …Be6. You offer the queen trade with Qb3, build the centre with d4, recapture on b3 opening the a-file, then fianchetto the bishop to rake the long diagonal.", sayShort: "…Be6 — Qb3, d4, axb3, Bg2" },
  beats: [
    { atMove: 12, say: "Qb3 — offering the queen trade and hitting b7, contesting the queenside.", sayShort: "Qb3 — offer trade, hit b7", arrows: [_A('b3', 'b7')] },
    { atMove: 14, say: "d4 — building the centre, seizing space while Black's pieces are passive.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
    { atMove: 18, say: "axb3 — recapturing toward the centre, opening the a-file for your rook.", sayShort: "axb3 — open the a-file", highlights: [_H('a1')] },
    { atMove: 22, say: "Bg2 — fianchettoing the bishop to rake the long diagonal in the favourable ending.", sayShort: "Bg2 — rake the diagonal", arrows: [_A('g2', 'b7')] },
  ],
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT59: SublineNarration = {
  intro: { say: "Black plays …a6. You develop d3, gain a tempo on the queen with Be3, strike the centre with d4, then expand with f4 to seize the initiative against the loose Black pieces.", sayShort: "…a6 — d3, Be3, d4, f4" },
  beats: [
    { atMove: 12, say: "d3 — developing and restraining the centre before you chase the queen.", sayShort: "d3 — develop, restrain", highlights: [_H('d3')] },
    { atMove: 14, say: "Be3 — attacking the d4-queen, developing with tempo.", sayShort: "Be3 — develop with tempo", arrows: [_A('e3', 'd4')] },
    { atMove: 18, say: "d4 — striking the centre, opening lines for the better-placed pieces.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 22, say: "f4 — gaining space and the initiative, harrying Black's loosely placed pieces.", sayShort: "f4 — seize the initiative", arrows: [_A('f4', 'f5')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};

const RT60: SublineNarration = {
  intro: { say: "Black develops …Bd6 in the double-fianchetto Réti. You open the c-file with cxd5, leaving Black an isolated d-pawn, develop d3 and Nc3 to pressure it, then question the bishop with h3.", sayShort: "…Bd6 — cxd5, Nc3, h3, Bxf3" },
  beats: [
    { atMove: 14, say: "cxd5 — opening the c-file and saddling Black with an isolated d-pawn to besiege.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 18, say: "Nc3 — developing with pressure on the isolated d5-pawn, the standard blockading plan.", sayShort: "Nc3 — pressure d5", arrows: [_A('c3', 'd5')] },
    { atMove: 20, say: "h3 — questioning the g4-bishop, forcing it to declare.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 22, say: "Bxf3 — recapturing, the bishop on the long diagonal bearing down on d5.", sayShort: "Bxf3 — eye d5", arrows: [_A('f3', 'd5')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT61: SublineNarration = {
  intro: { say: "Black contests with …Rc8. You take the c-file with Rc1, open it with cxd5 to isolate Black's d-pawn, then trade rooks keeping the small structural edge.", sayShort: "…Rc8 — Rc1, cxd5, Rxc8" },
  beats: [
    { atMove: 18, say: "Rc1 — contesting the c-file, the natural Réti rook post against …Rc8.", sayShort: "Rc1 — contest the c-file", arrows: [_A('c1', 'c8')] },
    { atMove: 20, say: "cxd5 — opening the file and leaving Black with an isolated d-pawn.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 22, say: "Rxc8 — trading rooks on the open file, keeping a nagging structural edge.", sayShort: "Rxc8 — trade, keep the edge", highlights: [_H('c8')] },
  ],
  sources: ['concept:pos-open-file', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT62: SublineNarration = {
  intro: { say: "Black plays …h6. You open the c-file with cxd5 to isolate the d-pawn, develop Nc3 to pressure it, then fire the e4 break opening lines for the fianchettoed bishop.", sayShort: "…h6 — cxd5, Nc3, e4" },
  beats: [
    { atMove: 14, say: "cxd5 — opening the c-file and isolating Black's d-pawn.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 18, say: "Nc3 — developing with pressure on the isolated d5-pawn.", sayShort: "Nc3 — pressure d5", arrows: [_A('c3', 'd5')] },
    { atMove: 20, say: "e4 — the central break, opening lines so your fianchettoed bishop springs to life.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 22, say: "dxe4 — recapturing, the centre opening to favour your better-placed pieces.", sayShort: "dxe4 — open the centre", highlights: [_H('e4')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT63: SublineNarration = {
  intro: { say: "Black plays the slow …h6. You prepare queenside expansion with a3, develop Nbd2, centralise with Qc2, then reroute the bishop to c3 to eye the queenside.", sayShort: "…h6 — a3, Nbd2, Qc2, Bc3" },
  beats: [
    { atMove: 16, say: "a3 — preparing b4 and queenside expansion, the slow Réti squeeze.", sayShort: "a3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 18, say: "Nbd2 — developing the knight, preparing the e4 break.", sayShort: "Nbd2 — prepare e4", highlights: [_H('d2')] },
    { atMove: 20, say: "Qc2 — centralising the queen, eyeing the b1-h7 diagonal and supporting e4.", sayShort: "Qc2 — centralise, support e4", arrows: [_A('c2', 'h7')] },
    { atMove: 22, say: "Bc3 — rerouting the bishop to eye a5 and the queenside dark squares.", sayShort: "Bc3 — eye the queenside", highlights: [_H('c3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT64: SublineNarration = {
  intro: { say: "Deep in the line Black plays …Rc8. You open the c-file with cxd5 to isolate Black's d-pawn, then trade rooks keeping a small structural edge.", sayShort: "…Rc8 — cxd5, Rxc8" },
  beats: [
    { atMove: 20, say: "cxd5 — opening the c-file and leaving Black with an isolated d-pawn.", sayShort: "cxd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 22, say: "Rxc8 — trading rooks on the open file, keeping the nagging structural plus.", sayShort: "Rxc8 — trade, keep the edge", highlights: [_H('c8')] },
  ],
  sources: ['concept:pos-open-file', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT65: SublineNarration = {
  intro: { say: "Black plays …a5. You meet it with a3 to restrain the advance and prepare b4, centralise with Qc2, then reroute the bishop to c3 to attack the a5-pawn.", sayShort: "…a5 — a3, Qc2, Bc3" },
  beats: [
    { atMove: 18, say: "a3 — restraining …a4 and preparing b4 to gain queenside space.", sayShort: "a3 — restrain, prepare b4", highlights: [_H('b4')] },
    { atMove: 20, say: "Qc2 — centralising the queen, eyeing the b1-h7 diagonal.", sayShort: "Qc2 — centralise", arrows: [_A('c2', 'h7')] },
    { atMove: 22, say: "Bc3 — rerouting the bishop to attack the a5-pawn and press the queenside.", sayShort: "Bc3 — attack a5", arrows: [_A('c3', 'a5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT66: SublineNarration = {
  intro: { say: "Black plays …Re8. You target the f5-bishop with Nh4, question it with h3, then gain kingside space with g4 to chase it and dominate the light squares.", sayShort: "…Re8 — Nh4, h3, g4" },
  beats: [
    { atMove: 18, say: "Nh4 — targeting the f5-bishop, the thematic plan to trade or chase it.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'f5')] },
    { atMove: 20, say: "h3 — questioning the bishop further, preparing the kingside advance.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 22, say: "g4 — gaining kingside space and chasing the bishop, dominating the light squares it leaves.", sayShort: "g4 — chase, dominate light squares", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT67: SublineNarration = {
  intro: { say: "Black grabs …dxc4. You castle, prepare recovery with Qc2, recapture the bishop on f3 to keep the long diagonal, undermine with b3 to regain the pawn, then build the centre with d4.", sayShort: "…dxc4 — Qc2, b3, d4" },
  beats: [
    { atMove: 10, say: "Qc2 — preparing to regain the c4-pawn while eyeing the centre.", sayShort: "Qc2 — prepare to regain c4", highlights: [_H('c2')] },
    { atMove: 14, say: "Bxf3 — recapturing toward the centre, the bishop on the long diagonal eyeing d5 and b7.", sayShort: "Bxf3 — long-diagonal bishop", arrows: [_A('f3', 'b7')] },
    { atMove: 18, say: "b3 — undermining the c4-pawn to regain the material on your terms.", sayShort: "b3 — regain the pawn", arrows: [_A('b3', 'c4')] },
    { atMove: 22, say: "d4 — building the centre with the material restored, a comfortable space edge.", sayShort: "d4 — build the centre", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT68: SublineNarration = {
  intro: { say: "Deep in the line Black plays …a5. You restrain with a3, double on the c-file with Rc2, then tuck the queen to a1 behind the bishop — a long-diagonal battery aimed at Black's king.", sayShort: "…a5 — a3, Rc2, Qa1" },
  beats: [
    { atMove: 20, say: "a3 — restraining …a4 and preparing b4 on the queenside.", sayShort: "a3 — restrain, prepare b4", highlights: [_H('b4')] },
    { atMove: 22, say: "Rc2 — doubling on the c-file, building the slow Réti pressure.", sayShort: "Rc2 — double the c-file", arrows: [_A('c2', 'c8')] },
    { atMove: 24, say: "Qa1 — the queen tucks behind the b2-bishop, the long-diagonal battery aimed at Black's king.", sayShort: "Qa1 — long-diagonal battery", arrows: [_A('a1', 'g7')] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT69: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You target the f5-bishop with Nh4, question it with h3, then gain kingside space with g4 to chase it and seize the light squares.", sayShort: "…Qc7 — Nh4, h3, g4" },
  beats: [
    { atMove: 18, say: "Nh4 — targeting the f5-bishop, aiming to trade or chase it.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'f5')] },
    { atMove: 20, say: "h3 — questioning the bishop, preparing the kingside advance.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 22, say: "g4 — gaining kingside space and chasing the bishop, dominating the light squares.", sayShort: "g4 — chase, seize light squares", arrows: [_A('g4', 'g5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT70: SublineNarration = {
  intro: { say: "Black meets the b4 wing thrust with …c5. You undermine d4 with e3, grab on c5, pin the queenside with Ba3, then simplify favourably — a sharp, roughly balanced struggle where you hold the queenside trumps.", sayShort: "…c5 — e3, bxc5, Ba3, Nxd4" },
  beats: [
    { atMove: 6, say: "e3 — undermining Black's d4-pawn at its base, the Réti reply to the early …d4.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 8, say: "bxc5 — grabbing the pawn, the point of the b4 thrust: a queenside pawn to nurse.", sayShort: "bxc5 — grab the pawn", highlights: [_H('c5')] },
    { atMove: 14, say: "Ba3 — the bishop pins down c5 from a3, defending the extra pawn and pressing the queenside.", sayShort: "Ba3 — pin and hold c5", arrows: [_A('a3', 'f8')] },
    { atMove: 18, say: "Nxd4 — trading favourably, simplifying while you keep the queenside structure in hand.", sayShort: "Nxd4 — simplify favourably", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT71: SublineNarration = {
  intro: { say: "Black props the centre with …f6. You disrupt with Qa4+, push b5 for queenside space, and undermine d4 with e3 — a sharp, double-edged wing gambit where you generate queenside play against Black's broad but loose centre.", sayShort: "…f6 — Qa4+, b5, e3" },
  beats: [
    { atMove: 6, say: "Qa4+ — the check disrupts Black's coordination before …f6 can settle into a solid centre.", sayShort: "Qa4+ — disrupt early", arrows: [_A('a4', 'd7')] },
    { atMove: 8, say: "b5 — gaining queenside space, the wing-gambit thrust that gives you play on that flank.", sayShort: "b5 — queenside space", arrows: [_A('b5', 'b6')] },
    { atMove: 12, say: "e3 — undermining the d4-pawn at its base, opening lines against Black's broad centre.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 18, say: "a3 — questioning the b4-bishop and gaining further queenside space in the double-edged fight.", sayShort: "a3 — question the bishop", highlights: [_H('b4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT72: SublineNarration = {
  intro: { say: "In the fianchetto wing gambit Black plays …c6. You gain queenside space with a4, push b5 to prise it open, then reroute the knight via g5 to the dominant e4-square.", sayShort: "…c6 — a4, b5, Ng5, Ne4" },
  beats: [
    { atMove: 16, say: "a4 — gaining queenside space and preparing the b5 thrust.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 18, say: "b5 — the wing thrust, prising open the queenside against Black's set-up.", sayShort: "b5 — prise open the queenside", arrows: [_A('b5', 'c6')] },
    { atMove: 20, say: "Ng5 — rerouting the knight toward e4 and f7, eyeing the kingside.", sayShort: "Ng5 — reroute toward e4", highlights: [_H('g5')] },
    { atMove: 22, say: "Ne4 — the knight reaches the dominant central square, eyeing d6 and the kingside.", sayShort: "Ne4 — dominant central knight", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT73: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You fianchetto with g3 and Bg2, push b5 for queenside space, open with bxc6, then advance a4 and swing the bishop to a3 — a queenside initiative.", sayShort: "…Bg4 — b5, bxc6, a4, Ba3" },
  beats: [
    { atMove: 8, say: "b5 — the wing thrust, gaining queenside space and fixing the structure.", sayShort: "b5 — queenside space", arrows: [_A('b5', 'c6')] },
    { atMove: 16, say: "bxc6 — opening the queenside, exploiting your advanced pawns to gain time.", sayShort: "bxc6 — open the queenside", highlights: [_H('c6')] },
    { atMove: 20, say: "a4 — pushing the queenside majority forward, the engine of your initiative.", sayShort: "a4 — push the majority", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Ba3 — the bishop swings to the a3-f8 diagonal, eyeing Black's king position.", sayShort: "Ba3 — eye the king", arrows: [_A('a3', 'f8')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT74: SublineNarration = {
  intro: { say: "Black pins with …Bg4 in the fianchetto line. You develop Nbd2, push b5 for space, clamp with c5, then recapture on g2 keeping the queenside bind and a safe king.", sayShort: "…Bg4 — Nbd2, b5, c5, Kxg2" },
  beats: [
    { atMove: 16, say: "Nbd2 — developing the knight and preparing the queenside expansion.", sayShort: "Nbd2 — develop, prep b5", highlights: [_H('d2')] },
    { atMove: 18, say: "b5 — the wing thrust, gaining queenside space.", sayShort: "b5 — queenside space", arrows: [_A('b5', 'b6')] },
    { atMove: 20, say: "c5 — clamping the queenside, gripping the position with a space bind.", sayShort: "c5 — clamp the queenside", highlights: [_H('c5')] },
    { atMove: 22, say: "Kxg2 — recapturing, the king safe behind the fianchetto and the queenside bind intact.", sayShort: "Kxg2 — safe, bind intact", highlights: [_H('g2')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT75: SublineNarration = {
  intro: { say: "Black lashes out with …g5. You disrupt with Qa4+, sidestep the advance with Nh4, trade on g6 to damage Black's kingside, then push b5 for queenside space — a balanced, sharp fight.", sayShort: "…g5 — Qa4+, Nh4, Nxg6, b5" },
  beats: [
    { atMove: 6, say: "Qa4+ — the check disrupts Black before the wild …g5-g4 thrust gains momentum.", sayShort: "Qa4+ — disrupt early", arrows: [_A('a4', 'c6')] },
    { atMove: 10, say: "Nh4 — sidestepping …g4 and rerouting the knight toward g6 and f5.", sayShort: "Nh4 — sidestep …g4", highlights: [_H('h4')] },
    { atMove: 16, say: "Nxg6 — trading to damage Black's kingside pawns and open the h-file.", sayShort: "Nxg6 — damage the kingside", highlights: [_H('g6')] },
    { atMove: 18, say: "b5 — gaining queenside space, the wing-gambit thrust to balance the sharp play.", sayShort: "b5 — queenside space", arrows: [_A('b5', 'c6')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT76: SublineNarration = {
  intro: { say: "Black plays …a5. You push b5 to gain space and fix the queenside, develop Nbd2, support with a4, then swing the bishop to a3 on the long a3-f8 diagonal.", sayShort: "…a5 — b5, Nbd2, a4, Ba3" },
  beats: [
    { atMove: 16, say: "b5 — the wing thrust, gaining space and fixing the queenside after …a5.", sayShort: "b5 — fix the queenside", arrows: [_A('b5', 'b6')] },
    { atMove: 18, say: "Nbd2 — developing the knight to support the queenside and prepare central play.", sayShort: "Nbd2 — develop, support", highlights: [_H('d2')] },
    { atMove: 20, say: "a4 — cementing the b5-pawn and the queenside majority.", sayShort: "a4 — cement the majority", highlights: [_H('a4')] },
    { atMove: 22, say: "Ba3 — the bishop takes the long a3-f8 diagonal, eyeing Black's king position.", sayShort: "Ba3 — eye the king", arrows: [_A('a3', 'f8')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT77: SublineNarration = {
  intro: { say: "Black develops …Nf6 and grabs the b4-pawn. You fianchetto with Bg2, regain the material with Qxb3, press with Qb5, then swing the bishop to a3 — a balanced, double-edged game with active piece play.", sayShort: "…Nf6 — Bg2, Qxb3, Qb5, Ba3" },
  beats: [
    { atMove: 8, say: "Bg2 — the fianchetto, raking the long diagonal at Black's loose centre.", sayShort: "Bg2 — rake the diagonal", arrows: [_A('g2', 'b7')] },
    { atMove: 14, say: "Qxb3 — regaining the gambit pawn, the queen actively placed.", sayShort: "Qxb3 — regain the pawn", highlights: [_H('b3')] },
    { atMove: 18, say: "Qb5 — the queen presses the queenside, pinning down Black's pieces.", sayShort: "Qb5 — press the queenside", highlights: [_H('b5')] },
    { atMove: 20, say: "Ba3 — the bishop swings to the a3-f8 diagonal, eyeing Black's king and pieces.", sayShort: "Ba3 — eye the king", arrows: [_A('a3', 'f8')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT78: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You complete your own with Bg2, undermine d4 with e3, recapture fxe3 to open the f-file toward f7, then centralise the queen on b3.", sayShort: "…b6 — Bg2, e3, fxe3, Qb3" },
  beats: [
    { atMove: 12, say: "Bg2 — the fianchetto, raking the long diagonal toward Black's centre and king.", sayShort: "Bg2 — rake the diagonal", arrows: [_A('g2', 'b7')] },
    { atMove: 14, say: "e3 — undermining the d4-pawn at its base.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 16, say: "fxe3 — recapturing toward the centre, opening the f-file for your rook toward f7.", sayShort: "fxe3 — open the f-file", highlights: [_H('f1')] },
    { atMove: 22, say: "Qb3 — centralising the queen, pressing b7 and the queenside.", sayShort: "Qb3 — press b7", arrows: [_A('b3', 'b7')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};
const RT79: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You undermine d4 with e3, complete the fianchetto with Bg2, open the centre with exd4, castle to safety, then push b5 for queenside space.", sayShort: "…b6 — e3, Bg2, exd4, b5" },
  beats: [
    { atMove: 10, say: "e3 — undermining the advanced d4-pawn at its base.", sayShort: "e3 — undermine d4", arrows: [_A('e3', 'd4')] },
    { atMove: 12, say: "Bg2 — completing the fianchetto, raking the long diagonal.", sayShort: "Bg2 — rake the diagonal", arrows: [_A('g2', 'b7')] },
    { atMove: 14, say: "exd4 — opening the centre, winning the structural battle over the overextended pawn.", sayShort: "exd4 — open, win the battle", highlights: [_H('d4')] },
    { atMove: 22, say: "b5 — the queenside thrust, gaining space and the initiative on that flank.", sayShort: "b5 — queenside space", arrows: [_A('b5', 'b6')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/R%C3%A9ti_Opening'],
};

const KA01: SublineNarration = {
  intro: { say: "Black locks the centre with …e5. Since Black has taken central space, you switch wings: c3 and b4-b5 expand on the queenside, the knight heads to c4, and you play where you are stronger.", sayShort: "…e5 — c3, b4-b5, Nc4" },
  beats: [
    { atMove: 12, say: "c3 — preparing b4. With the centre fixed, the King's Indian Attack plays on the queenside where you hold the initiative.", sayShort: "c3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 14, say: "b4 — gaining queenside space, the thematic plan against Black's …e5 clamp.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
    { atMove: 20, say: "b5 — pushing on to kick the c6-knight back, gaining ground on the wing.", sayShort: "b5 — kick the knight", arrows: [_A('b5', 'c6')] },
    { atMove: 22, say: "Nc4 — the knight heads to c4, eyeing d6 and pressing the queenside weaknesses.", sayShort: "Nc4 — eye d6", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA02: SublineNarration = {
  intro: { say: "Black castles. You gain space with e5, tuck the king away, trade in the centre, then expand with a4 — a comfortable King's Indian Attack with space on both wings.", sayShort: "…O-O — e5, O-O, Nxe5, a4" },
  beats: [
    { atMove: 14, say: "e5 — the thematic KIA advance, gaining central space and clamping Black's kingside.", sayShort: "e5 — gain central space", highlights: [_H('e5')] },
    { atMove: 16, say: "O-O — castling to safety before the middlegame battle opens up.", sayShort: "O-O — king safe", highlights: [_H('g1')] },
    { atMove: 18, say: "Nxe5 — recapturing in the centre after the knight trades, keeping a sound, active position.", sayShort: "Nxe5 — recapture in the centre", highlights: [_H('e5')] },
    { atMove: 20, say: "a4 — gaining queenside space, squeezing Black on the wing where he is passive.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA03: SublineNarration = {
  intro: { say: "Black develops …Bc5. You gain space with e5, hit the bishop with Nb3, build the big centre with d4, then storm the kingside with h4 — the KIA in full flow.", sayShort: "…Bc5 — e5, Nb3, d4, h4" },
  beats: [
    { atMove: 10, say: "e5 — gaining central space and kicking the f6-knight, the KIA's signature advance.", sayShort: "e5 — gain space, kick the knight", highlights: [_H('e5')] },
    { atMove: 12, say: "Nb3 — hitting the c5-bishop with tempo, forcing it to a more passive square.", sayShort: "Nb3 — hit the bishop", arrows: [_A('b3', 'c5')] },
    { atMove: 14, say: "d4 — building the broad centre now Black has retreated, claiming a space bind.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 20, say: "h4 — the kingside pawn storm begins, prising open lines toward Black's king.", sayShort: "h4 — storm the kingside", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA04: SublineNarration = {
  intro: { say: "Black pins with …Bb4. You gain space with e5, centralise with Qe2, finish developing, then leap Ng5 to attack the kingside light squares.", sayShort: "…Bb4 — e5, Qe2, Rd1, Ng5" },
  beats: [
    { atMove: 12, say: "e5 — gaining central space and cramping Black, the KIA's thematic clamp.", sayShort: "e5 — gain central space", highlights: [_H('e5')] },
    { atMove: 14, say: "Qe2 — centralising the queen, preparing to bring pieces to the kingside.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Rd1 — the rook takes the d-file, eyeing the centre and supporting a break.", sayShort: "Rd1 — to the d-file", arrows: [_A('d1', 'd8')] },
    { atMove: 22, say: "Ng5 — the knight jumps in to attack f7, h7 and e6, the kingside light squares.", sayShort: "Ng5 — attack the light squares", arrows: [_A('g5', 'f7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA05: SublineNarration = {
  intro: { say: "Black develops …Be7. You fianchetto with Bg2, centralise with Qe2, leap the knight to the c4-outpost, then reroute Ne3 toward d5 and f5 with a comfortable game.", sayShort: "…Be7 — Qe2, Nc4, c3, Ne3" },
  beats: [
    { atMove: 14, say: "Qe2 — centralising the queen, the KIA build-up toward kingside play.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 16, say: "Nc4 — the knight to the strong c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "c3 — solidifying the centre and preparing queenside or central play.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 22, say: "Ne3 — rerouting the knight toward d5 and f5, the key central squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA06: SublineNarration = {
  intro: { say: "Black develops …Be7 early. You fianchetto with Bg2, recapture on e4, centralise with Qe2, leap to the c4-outpost, then reroute Ne3 toward d5 and f5.", sayShort: "…Be7 — dxe4, Qe2, Nc4, Ne3" },
  beats: [
    { atMove: 12, say: "dxe4 — recapturing toward the centre, the KIA structure with the bishop on g2.", sayShort: "dxe4 — KIA centre", highlights: [_H('e4')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "c3 — solidifying the centre, preparing the next phase of play.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 22, say: "Ne3 — rerouting the knight toward the central d5 and f5 squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA07: SublineNarration = {
  intro: { say: "Black lunges …Ng4. You castle to safety first, kick the knight with h3, centralise the queen on c2, then leap to the c4-outpost.", sayShort: "…Ng4 — O-O, h3, Qc2, Nc4" },
  beats: [
    { atMove: 14, say: "O-O — king to safety before dealing with the loose knight on g4.", sayShort: "O-O — king safe first", highlights: [_H('g1')] },
    { atMove: 16, say: "h3 — kicking the g4-knight back, gaining a tempo and the bishop pair if it stays.", sayShort: "h3 — kick the knight", highlights: [_H('g4')] },
    { atMove: 20, say: "Qc2 — centralising the queen on the b1-h7 diagonal, eyeing the kingside.", sayShort: "Qc2 — eye the kingside", arrows: [_A('c2', 'h7')] },
    { atMove: 22, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6 with the better game.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA08: SublineNarration = {
  intro: { say: "Black plays …c5 early. You complete the KIA set-up, post the rook on e1, solidify with c3, centralise with Qe2, then begin the signature Nf1-h2-g4 reroute toward the kingside.", sayShort: "…c5 — Re1, c3, Qe2, Nf1" },
  beats: [
    { atMove: 14, say: "Re1 — the rook supports the e-pawn, the standard KIA build-up before the kingside push.", sayShort: "Re1 — KIA build-up", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "c3 — solidifying the centre, giving the knight the c2-square if needed.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside knight maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute, the knight heading via h2 to g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA09: SublineNarration = {
  intro: { say: "Black overextends with …e5. You open the centre with exd5, fianchetto and castle, post the rook on e1, then expand with a4 and reroute Nb3 — pressing Black's loosened centre.", sayShort: "…e5 — exd5, Re1, a4, Nb3" },
  beats: [
    { atMove: 10, say: "exd5 — opening the centre to exploit Black's overextended …e5 push.", sayShort: "exd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 16, say: "Re1 — the rook takes the e-file, pressing Black's central pawn.", sayShort: "Re1 — pressure the centre", arrows: [_A('e1', 'e5')] },
    { atMove: 20, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Nb3 — rerouting the knight toward c5 and d4, pressing the loosened position.", sayShort: "Nb3 — reroute to c5", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA10: SublineNarration = {
  intro: { say: "Black develops …Bd6. You recapture on e4 with the knight, point the bishop at e6 from h3, centralise with Qe2, then develop Be3 — pressing Black's light-square holes.", sayShort: "…Bd6 — Nxe4, Bh3, Qe2, Be3" },
  beats: [
    { atMove: 12, say: "Nxe4 — recapturing, trading into a KIA structure where your pieces flow freely.", sayShort: "Nxe4 — recapture, KIA centre", highlights: [_H('e4')] },
    { atMove: 16, say: "Bh3 — the bishop eyes e6, exploiting the light squares Black's set-up left tender.", sayShort: "Bh3 — eye e6", arrows: [_A('h3', 'e6')] },
    { atMove: 18, say: "Qe2 — centralising the queen, supporting the central pawn and the kingside.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Be3 — developing the bishop, eyeing the queenside dark squares with a comfortable game.", sayShort: "Be3 — develop, eye the queenside", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA71: SublineNarration = {
  intro: { say: "Black locks the centre with …e5. Since Black has taken central space, you switch wings: c3 and b4-b5 expand on the queenside, the knight heads to c4, and you play where you are stronger.", sayShort: "…e5 — c3, b4-b5, Nc4" },
  beats: [
    { atMove: 12, say: "c3 — preparing b4. With the centre fixed, the KIA plays on the queenside where you hold the initiative.", sayShort: "c3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 14, say: "b4 — gaining queenside space, the thematic plan against Black's …e5 clamp.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
    { atMove: 20, say: "b5 — pushing on to kick the c6-knight back, gaining ground on the wing.", sayShort: "b5 — kick the knight", arrows: [_A('b5', 'c6')] },
    { atMove: 22, say: "Nc4 — the knight heads to c4, eyeing d6 and pressing the queenside.", sayShort: "Nc4 — eye d6", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA72: SublineNarration = {
  intro: { say: "Black plays …e5 after …Bc5. You castle to safety, solidify with c3, centralise the queen, then reroute the knights — Nh4 toward the kingside and Nc4 to the outpost.", sayShort: "…e5 — O-O, c3, Nh4, Nc4" },
  beats: [
    { atMove: 14, say: "O-O — king to safety before the middlegame battle.", sayShort: "O-O — king safe", highlights: [_H('g1')] },
    { atMove: 16, say: "c3 — solidifying the centre and preparing queenside play.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 20, say: "Nh4 — rerouting the knight toward f5 and g6, eyeing the kingside.", sayShort: "Nh4 — reroute toward f5", highlights: [_H('h4')] },
    { atMove: 22, say: "Nc4 — the other knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA73: SublineNarration = {
  intro: { say: "Black develops …Bc5. You gain space with e5, hit the bishop with Nb3, build the big centre with d4, then storm the kingside with h4 — the KIA in full flow.", sayShort: "…Bc5 — e5, Nb3, d4, h4" },
  beats: [
    { atMove: 10, say: "e5 — gaining central space and kicking the f6-knight, the KIA's signature advance.", sayShort: "e5 — gain space, kick the knight", highlights: [_H('e5')] },
    { atMove: 12, say: "Nb3 — hitting the c5-bishop with tempo, forcing it to a passive square.", sayShort: "Nb3 — hit the bishop", arrows: [_A('b3', 'c5')] },
    { atMove: 14, say: "d4 — building the broad centre now Black has retreated, claiming a space bind.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 20, say: "h4 — the kingside pawn storm begins, prising open lines toward Black's king.", sayShort: "h4 — storm the kingside", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA74: SublineNarration = {
  intro: { say: "Black pins with …Bb4. You gain space with e5, centralise with Qe2, finish developing, then leap Ng5 to attack the kingside light squares.", sayShort: "…Bb4 — e5, Qe2, Rd1, Ng5" },
  beats: [
    { atMove: 12, say: "e5 — gaining central space and cramping Black, the KIA's thematic clamp.", sayShort: "e5 — gain central space", highlights: [_H('e5')] },
    { atMove: 14, say: "Qe2 — centralising the queen, preparing to bring pieces to the kingside.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Rd1 — the rook takes the d-file, eyeing the centre and supporting a break.", sayShort: "Rd1 — to the d-file", arrows: [_A('d1', 'd8')] },
    { atMove: 22, say: "Ng5 — the knight jumps in to attack f7, h7 and e6.", sayShort: "Ng5 — attack the light squares", arrows: [_A('g5', 'f7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA75: SublineNarration = {
  intro: { say: "Black develops …Be7. You centralise with Qe2, leap the knight to the c4-outpost, solidify with c3, then reroute Ne3 toward d5 and f5.", sayShort: "…Be7 — Qe2, Nc4, c3, Ne3" },
  beats: [
    { atMove: 14, say: "Qe2 — centralising the queen, the KIA build-up toward kingside play.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "c3 — solidifying the centre, preparing the next phase.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 22, say: "Ne3 — rerouting the knight toward the central d5 and f5 squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA76: SublineNarration = {
  intro: { say: "Black develops …Be7 early. You fianchetto, recapture on e4, centralise with Qe2, leap to the c4-outpost, then reroute Ne3 toward d5 and f5.", sayShort: "…Be7 — dxe4, Qe2, Nc4, Ne3" },
  beats: [
    { atMove: 12, say: "dxe4 — recapturing toward the centre, the KIA structure with the g2-bishop.", sayShort: "dxe4 — KIA centre", highlights: [_H('e4')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "c3 — solidifying the centre, preparing the next phase.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 22, say: "Ne3 — rerouting the knight toward the central d5 and f5 squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA77: SublineNarration = {
  intro: { say: "Black lunges …Ng4. You castle first, kick the knight with h3, centralise the queen on c2, then leap to the c4-outpost.", sayShort: "…Ng4 — O-O, h3, Qc2, Nc4" },
  beats: [
    { atMove: 14, say: "O-O — king to safety before dealing with the g4-knight.", sayShort: "O-O — king safe first", highlights: [_H('g1')] },
    { atMove: 16, say: "h3 — kicking the g4-knight back, gaining a tempo.", sayShort: "h3 — kick the knight", highlights: [_H('g4')] },
    { atMove: 20, say: "Qc2 — centralising the queen on the b1-h7 diagonal, eyeing the kingside.", sayShort: "Qc2 — eye the kingside", arrows: [_A('c2', 'h7')] },
    { atMove: 22, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA78: SublineNarration = {
  intro: { say: "Black plays …c5 early. You complete the KIA set-up, post the rook on e1, solidify with c3, centralise with Qe2, then begin the Nf1-h2-g4 reroute toward the kingside.", sayShort: "…c5 — Re1, c3, Qe2, Nf1" },
  beats: [
    { atMove: 14, say: "Re1 — the rook supports the e-pawn, the KIA build-up before the kingside push.", sayShort: "Re1 — KIA build-up", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "c3 — solidifying the centre, giving the knight the c2-square.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute, the knight heading via h2 to g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA79: SublineNarration = {
  intro: { say: "Black overextends with …e5. You open with exd5, fianchetto and castle, post the rook on e1, expand with a4, then reroute Nb3 — pressing Black's loosened centre.", sayShort: "…e5 — exd5, Re1, a4, Nb3" },
  beats: [
    { atMove: 10, say: "exd5 — opening the centre to exploit Black's overextended …e5.", sayShort: "exd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 16, say: "Re1 — the rook takes the e-file, pressing Black's central pawn.", sayShort: "Re1 — pressure the centre", arrows: [_A('e1', 'e5')] },
    { atMove: 20, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Nb3 — rerouting the knight toward c5 and d4, pressing the loosened position.", sayShort: "Nb3 — reroute to c5", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KA80: SublineNarration = {
  intro: { say: "Black develops …Bd6. You recapture on e4 with the knight, point the bishop at e6 from h3, centralise with Qe2, then develop Be3 — pressing Black's light-square holes.", sayShort: "…Bd6 — Nxe4, Bh3, Qe2, Be3" },
  beats: [
    { atMove: 12, say: "Nxe4 — recapturing, trading into a KIA structure where your pieces flow freely.", sayShort: "Nxe4 — recapture, KIA centre", highlights: [_H('e4')] },
    { atMove: 16, say: "Bh3 — the bishop eyes e6, exploiting the light squares Black left tender.", sayShort: "Bh3 — eye e6", arrows: [_A('h3', 'e6')] },
    { atMove: 18, say: "Qe2 — centralising the queen, supporting the centre and the kingside.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Be3 — developing the bishop, eyeing the queenside with a comfortable game.", sayShort: "Be3 — develop, eye queenside", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};

const KB11: SublineNarration = {
  intro: { say: "Black sets up symmetrically with …Nf6. You claim the centre English-style with c4, develop Nc3 to contest d5, then after the central trades centralise the knight on d4 — active, balanced piece play.", sayShort: "…Nf6 — c4, Nc3, Nxd5, Nd4" },
  beats: [
    { atMove: 10, say: "c4 — claiming central space, turning the game into a reversed-English battle for d5.", sayShort: "c4 — claim the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 12, say: "Nc3 — developing with pressure on d5, contesting the key central square.", sayShort: "Nc3 — contest d5", highlights: [_H('d5')] },
    { atMove: 16, say: "Nxd5 — trading to open the centre, simplifying toward a balanced middlegame.", sayShort: "Nxd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 22, say: "Nd4 — centralising the knight, eyeing c6 and f5 with active piece play in a level position.", sayShort: "Nd4 — centralise, active play", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB12: SublineNarration = {
  intro: { say: "Black plays …e6 and …Nge7. You solidify with c3, build the centre with e4, strike with d4, then lunge d5 to gain space and kick the pieces.", sayShort: "…e6 — e4, d4, d5, Nbd2" },
  beats: [
    { atMove: 12, say: "e4 — building the broad centre, the KIA's central expansion against the …e6 set-up.", sayShort: "e4 — build the centre", highlights: [_H('e4')] },
    { atMove: 16, say: "d4 — striking in the centre, opening lines for your better-developed pieces.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 20, say: "d5 — the central pawn lunges, gaining space and kicking Black's knight.", sayShort: "d5 — gain space", highlights: [_H('d5')] },
    { atMove: 22, say: "Nbd2 — developing the last piece, supporting the broad centre.", sayShort: "Nbd2 — support the centre", highlights: [_H('d2')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB13: SublineNarration = {
  intro: { say: "Black plays …e6. You build with e4, make luft with h3, post the rook on e1, then open the centre with exd5 to leave Black an isolated d-pawn.", sayShort: "…e6 — h3, Re1, exd5, Nbd2" },
  beats: [
    { atMove: 14, say: "h3 — a useful luft, taking g4 from Black's pieces before you build.", sayShort: "h3 — luft, deny g4", highlights: [_H('g4')] },
    { atMove: 16, say: "Re1 — the rook backs the centre, the standard KIA post.", sayShort: "Re1 — back the centre", arrows: [_A('e1', 'e4')] },
    { atMove: 20, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn to besiege.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 22, say: "Nbd2 — developing to blockade and pressure the isolated d5-pawn.", sayShort: "Nbd2 — pressure d5", highlights: [_H('d2')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB14: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3 (it must retreat, a wasted tempo), then expand on the queenside with b4-b5 and c4 — the plan in this closed centre.", sayShort: "…Bg4 — h3, b4-b5, c4" },
  beats: [
    { atMove: 12, say: "h3 — questioning the g4-bishop, forcing it back to c8 — Black has lost time.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "b4 — the queenside expansion begins, gaining space where you are stronger.", sayShort: "b4 — queenside space", arrows: [_A('b4', 'b5')] },
    { atMove: 20, say: "b5 — pushing on to kick the c6-knight to the rim.", sayShort: "b5 — kick the knight", arrows: [_A('b5', 'c6')] },
    { atMove: 22, say: "c4 — gaining more queenside space, cementing the bind.", sayShort: "c4 — cement the bind", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB15: SublineNarration = {
  intro: { say: "Black locks with …e5. You gain queenside space with a4, reroute the knight via a3-c2 toward e3 and the b4 break, then strike b4 — playing on the wing.", sayShort: "…e5 — a4, Na3, Nc2, b4" },
  beats: [
    { atMove: 12, say: "a4 — gaining queenside space and preparing the knight reroute.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 14, say: "Na3 — rerouting the knight toward c2, where it supports b4 and eyes e3.", sayShort: "Na3 — reroute via c2", highlights: [_H('a3')] },
    { atMove: 18, say: "Nc2 — the knight reaches c2, supporting the b4 break and the queenside play.", sayShort: "Nc2 — support b4", highlights: [_H('c2')] },
    { atMove: 20, say: "b4 — the queenside break, the thematic plan against Black's fixed centre.", sayShort: "b4 — the queenside break", arrows: [_A('b4', 'c5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB16: SublineNarration = {
  intro: { say: "Black builds a big centre with …d5. You challenge with c3 and d4, open with dxc5 gaining a tempo, expand with b4, then plant the knight on the e5-outpost.", sayShort: "…d5 — d4, dxc5, b4, Ne5" },
  beats: [
    { atMove: 12, say: "d4 — striking the centre, challenging Black's broad pawn front.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "dxc5 — opening lines and gaining a tempo on the queen.", sayShort: "dxc5 — open with tempo", highlights: [_H('c5')] },
    { atMove: 16, say: "b4 — gaining queenside space with tempo on the queen.", sayShort: "b4 — space with tempo", arrows: [_A('b4', 'b5')] },
    { atMove: 22, say: "Ne5 — the knight grabs the central outpost, the dominant square.", sayShort: "Ne5 — central outpost", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB17: SublineNarration = {
  intro: { say: "Black plays …e5. You claim space with c4, develop Nc3, then reroute the knight to the dominant d5-outpost and the other via c2 — a closed-position bind.", sayShort: "…e5 — c4, Nd5, Nc2, a4" },
  beats: [
    { atMove: 10, say: "c4 — claiming queenside space, the closed English-style structure.", sayShort: "c4 — claim space", highlights: [_H('c4')] },
    { atMove: 16, say: "Nd5 — the knight reaches the dominant d5-outpost, the soul of these positions.", sayShort: "Nd5 — the d5-outpost", highlights: [_H('d5')] },
    { atMove: 18, say: "Nc2 — rerouting the other knight toward e3 or the queenside expansion.", sayShort: "Nc2 — reroute the knight", highlights: [_H('c2')] },
    { atMove: 20, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB18: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You post the rook on e1, leap the knight to the c4-outpost, gain queenside space with a4, then reposition Bd2 for the expansion.", sayShort: "…Bg4 — Re1, Nc4, a4, Bd2" },
  beats: [
    { atMove: 14, say: "Re1 — the rook backs the centre, the standard KIA post.", sayShort: "Re1 — back the centre", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "a4 — gaining queenside space, preparing the expansion.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Bd2 — repositioning the bishop to support the queenside push.", sayShort: "Bd2 — support the expansion", highlights: [_H('d2')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB19: SublineNarration = {
  intro: { say: "Black develops …Bd7. You post the rook on e1, gain queenside space with a4, then reroute the knight via a3-c4-e3 toward the central d5 and f5 squares.", sayShort: "…Bd7 — Re1, a4, Na3-c4, Ne3" },
  beats: [
    { atMove: 12, say: "Re1 — the rook backs the centre, the standard KIA post.", sayShort: "Re1 — back the centre", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Nc4 — the knight reaches the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 22, say: "Ne3 — rerouting toward the central d5 and f5 squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB20: SublineNarration = {
  intro: { say: "Black plays …a6. You leap to the c4-outpost, gain space with e5 kicking the knight, clamp with a5, then open lines favourably with exd6.", sayShort: "…a6 — Nc4, e5, a5, exd6" },
  beats: [
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 18, say: "e5 — the central advance, gaining space and kicking the f6-knight.", sayShort: "e5 — gain space, kick the knight", highlights: [_H('e5')] },
    { atMove: 20, say: "a5 — clamping the queenside, fixing Black's pawns.", sayShort: "a5 — clamp the queenside", arrows: [_A('a5', 'b6')] },
    { atMove: 22, say: "exd6 — opening lines, trading favourably with the space edge in hand.", sayShort: "exd6 — open favourably", highlights: [_H('d6')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB21: SublineNarration = {
  intro: { say: "In the Caro KIA Black pins with …Bg4. You break the pin with Be2, recapture on f3 keeping the bishop pair, build the KIA centre, then leap to the c4-outpost and seize the d-file.", sayShort: "…Bg4 — Bxf3, dxe4, Nc4, Rd1" },
  beats: [
    { atMove: 10, say: "Bxf3 — recapturing, keeping the bishop pair after Black parts with the light bishop.", sayShort: "Bxf3 — keep the bishop pair", highlights: [_H('f3')] },
    { atMove: 14, say: "dxe4 — recapturing toward the centre, the KIA structure with the bishop pair.", sayShort: "dxe4 — KIA centre", highlights: [_H('e4')] },
    { atMove: 18, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 22, say: "Rd1 — the rook takes the d-file, pressing the centre with a comfortable game.", sayShort: "Rd1 — seize the d-file", arrows: [_A('d1', 'd8')] },
  ],
  sources: ['concept:pos-bishop-pair', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB22: SublineNarration = {
  intro: { say: "Black plays …Nd7. You strike with d4, open with exd5 to leave an isolated d-pawn, recapture with the knight, then post the rook on e1 to press.", sayShort: "…Nd7 — d4, exd5, Nxd4, Re1" },
  beats: [
    { atMove: 8, say: "d4 — striking the centre, opening lines into Black's slightly loose set-up.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 10, say: "exd5 — opening the position, leaving Black with an isolated d-pawn.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 12, say: "Nxd4 — recapturing, the centralised knight eyeing f5 and c6.", sayShort: "Nxd4 — centralise the knight", highlights: [_H('d4')] },
    { atMove: 20, say: "Re1 — the rook takes the e-file, pressing Black's position.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB23: SublineNarration = {
  intro: { say: "Black harasses with …Bg4 and the bishop dance …Bh3-Bg4. The position is dead level: you can accept the repetition for a draw, or break it earlier with h3 to question the bishop and keep playing.", sayShort: "…Bg4 — hold equal or break with h3" },
  beats: [
    { atMove: 10, say: "Be2 — sidestepping the bishop's harassment; the position is balanced and solid.", sayShort: "Be2 — sidestep, stay solid", highlights: [_H('e2')] },
    { atMove: 12, say: "Bf1 — the bishop holds; Black repeats with …Bg4-h3. You are fine — the balance holds.", sayShort: "Bf1 — hold the balance", highlights: [_H('f1')] },
    { atMove: 14, say: "Be2 — the repetition is on offer. Accept the draw, or insert h3 a move earlier to break it and play for more.", sayShort: "Be2 — draw, or break with h3", highlights: [_H('e2')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB24: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3, gain kingside space with g4 chasing it to g6, target it with Nh4, then open the centre with exd5 to isolate Black's d-pawn.", sayShort: "…Bg4 — h3, g4, Nh4, exd5" },
  beats: [
    { atMove: 14, say: "h3 — questioning the g4-bishop, forcing it to declare.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "g4 — gaining kingside space and chasing the bishop to g6.", sayShort: "g4 — chase to g6", arrows: [_A('g4', 'g5')] },
    { atMove: 20, say: "Nh4 — targeting the g6-bishop, aiming to trade it and seize the light squares.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'g6')] },
    { atMove: 22, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB25: SublineNarration = {
  intro: { say: "Black develops …Ne7. You strike with d4, recapture with the knight centralising it, post the rook on e1, then centralise the queen on c2.", sayShort: "…Ne7 — d4, Nxd4, Re1, Qc2" },
  beats: [
    { atMove: 12, say: "d4 — striking the centre, opening lines for your active pieces.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "Nxd4 — recapturing, the centralised knight eyeing f5 and c6.", sayShort: "Nxd4 — centralise the knight", highlights: [_H('d4')] },
    { atMove: 18, say: "Re1 — the rook takes the e-file, the standard KIA post.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
    { atMove: 22, say: "Qc2 — centralising the queen on the b1-h7 diagonal, eyeing the kingside.", sayShort: "Qc2 — eye the kingside", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB26: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3, gain kingside space with g4 chasing it, target the bishop with Nh4, then open the centre with exd5.", sayShort: "…Bg4 — h3, g4, Nh4, exd5" },
  beats: [
    { atMove: 14, say: "h3 — questioning the g4-bishop, forcing it to declare.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 18, say: "g4 — gaining kingside space and chasing the bishop to g6.", sayShort: "g4 — chase to g6", arrows: [_A('g4', 'g5')] },
    { atMove: 20, say: "Nh4 — targeting the g6-bishop, aiming to trade it for light-square control.", sayShort: "Nh4 — target the bishop", arrows: [_A('h4', 'g6')] },
    { atMove: 22, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
  ],
  sources: ['concept:pos-space', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB27: SublineNarration = {
  intro: { say: "Black props the centre with …f6, weakening the kingside. You strike with d4, question the bishop with h3, open with c4, then centralise the queen aiming at the queenside where Black castles.", sayShort: "…f6 — d4, h3, c4, Qc2" },
  beats: [
    { atMove: 8, say: "d4 — striking the centre at once; …f6 has weakened Black's king position.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 14, say: "h3 — questioning the g4-bishop, gaining time.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 16, say: "c4 — opening the centre, attacking d5 and prising open lines.", sayShort: "c4 — open the centre", arrows: [_A('c4', 'd5')] },
    { atMove: 20, say: "Qc2 — centralising the queen, eyeing the queenside where Black has castled long.", sayShort: "Qc2 — eye the queenside king", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB28: SublineNarration = {
  intro: { say: "Black plays …Qc7. You strike with d4, open with exd5, recapture centralising the knight, grab the c6-pawn, then leap Nb5 hitting the queen with tempo.", sayShort: "…Qc7 — d4, exd5, dxc6, Nb5" },
  beats: [
    { atMove: 8, say: "d4 — striking the centre immediately, opening lines.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 10, say: "exd5 — opening the position with tempo on Black's pieces.", sayShort: "exd5 — open with tempo", highlights: [_H('d5')] },
    { atMove: 16, say: "dxc6 — grabbing the pawn, opening lines while ahead in development.", sayShort: "dxc6 — grab the pawn", highlights: [_H('c6')] },
    { atMove: 20, say: "Nb5 — the knight jumps in hitting the c7-queen, gaining a tempo with the better game.", sayShort: "Nb5 — hit the queen", arrows: [_A('b5', 'c7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB29: SublineNarration = {
  intro: { say: "Black blunders with …Nf6, leaving e5 hanging. You snatch it with Nxe5, retreat the knight to bank the pawn, post the rook on e1, then fianchetto the bishop — a clean extra pawn.", sayShort: "…Nf6 — Nxe5 wins the pawn, Nef3" },
  beats: [
    { atMove: 8, say: "Nxe5 — snatching the central pawn: …Nf6 left e5 undefended. You are up a clean pawn.", sayShort: "Nxe5 — win the pawn", highlights: [_H('e5')] },
    { atMove: 10, say: "Nef3 — retreating the knight to safety, banking the extra material.", sayShort: "Nef3 — bank the pawn", highlights: [_H('f3')] },
    { atMove: 16, say: "Re1 — the rook takes the e-file, consolidating the advantage.", sayShort: "Re1 — consolidate", arrows: [_A('e1', 'e8')] },
    { atMove: 22, say: "Bb2 — fianchettoing the bishop to rake the long diagonal with the extra pawn in hand.", sayShort: "Bb2 — rake the diagonal", arrows: [_A('b2', 'g7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KB30: SublineNarration = {
  intro: { say: "Black overreaches with …f5. You open with exd5, strike d5 again with c4, plant the knight on the powerful d4-square, then leap into e6 — a monster outpost in Black's camp.", sayShort: "…f5 — exd5, c4, Nd4, Ne6" },
  beats: [
    { atMove: 10, say: "exd5 — opening the centre, exploiting the loosening …f5 push.", sayShort: "exd5 — open the centre", highlights: [_H('d5')] },
    { atMove: 12, say: "c4 — striking at d5 again, prising the centre fully open.", sayShort: "c4 — hit d5 again", arrows: [_A('c4', 'd5')] },
    { atMove: 14, say: "Nd4 — the knight to the powerful central square, eyeing e6 and f5.", sayShort: "Nd4 — powerful centre knight", highlights: [_H('d4')] },
    { atMove: 20, say: "Ne6 — the knight leaps into e6, a monster outpost cramping Black's whole position.", sayShort: "Ne6 — monster outpost", highlights: [_H('e6')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};

const KC31: SublineNarration = {
  intro: { say: "Black develops …Bd6 over the big centre. You break with e4, open with exd5 to isolate Black's d-pawn, hit the bishop with Nc4, then strike d4 to open lines.", sayShort: "…Bd6 — e4, exd5, Nc4, d4" },
  beats: [
    { atMove: 12, say: "e4 — the central break, challenging Black's broad pawn front with everything developed.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 14, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn to besiege.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 16, say: "Nc4 — the knight to c4, hitting the d6-bishop and eyeing e5.", sayShort: "Nc4 — hit the bishop", arrows: [_A('c4', 'd6')] },
    { atMove: 22, say: "d4 — striking the centre, opening lines for your better-placed pieces.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC32: SublineNarration = {
  intro: { say: "Black develops …Be6. You attack it with Ng5 to win the bishop pair, break with e4, advance f4 to gain kingside space and hit e5, then leap to the c4-outpost.", sayShort: "…Be6 — Ng5, e4, f4, Nc4" },
  beats: [
    { atMove: 12, say: "Ng5 — attacking the e6-bishop, gaining the bishop pair or a tempo.", sayShort: "Ng5 — attack the bishop", arrows: [_A('g5', 'e6')] },
    { atMove: 16, say: "e4 — the central break, challenging Black's pawn front.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 20, say: "f4 — the kingside pawn advance, gaining space and striking at e5.", sayShort: "f4 — gain space, hit e5", arrows: [_A('f4', 'e5')] },
    { atMove: 22, say: "Nc4 — the knight to c4, eyeing e5 and d6 with the better game.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC33: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You break with e4, gain kingside space with g4 chasing the bishop, then strike at e5 with a knight and f4 — a sharp, roughly balanced melee in the centre.", sayShort: "…Bg4 — e4, g4, Nxe5, fxe5" },
  beats: [
    { atMove: 12, say: "e4 — the central break, challenging Black's broad pawn front.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 16, say: "g4 — gaining kingside space and chasing the bishop to g6.", sayShort: "g4 — gain space, chase the bishop", arrows: [_A('g4', 'g5')] },
    { atMove: 18, say: "Nxe5 — striking at the e5-pawn, opening the centre in a sharp, balanced fight.", sayShort: "Nxe5 — strike the centre", highlights: [_H('e5')] },
    { atMove: 20, say: "fxe5 — opening the f-file toward f7, keeping the initiative in the double-edged play.", sayShort: "fxe5 — open the f-file", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC34: SublineNarration = {
  intro: { say: "Black castles. You break with e4 and centralise with Qe2; after …Bg4 and …Nd4 the position turns sharp and roughly balanced — sidestep with Qd1 and recapture accurately to hold the equilibrium.", sayShort: "…O-O — e4, Qe2, Qd1, Bxf3" },
  beats: [
    { atMove: 14, say: "Qe2 — centralising the queen, supporting the centre after the e4 break.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 16, say: "Nxe4 — recapturing on e4, keeping the centre open in the sharp middlegame.", sayShort: "Nxe4 — recapture in the centre", highlights: [_H('e4')] },
    { atMove: 20, say: "Qd1 — sidestepping the …Nd4 fork of queen and knight; calm defence holds the balance.", sayShort: "Qd1 — sidestep, hold the balance", highlights: [_H('d1')] },
    { atMove: 22, say: "Bxf3 — recapturing accurately. The position stays sharp and roughly level — defend precisely.", sayShort: "Bxf3 — recapture, stay level", highlights: [_H('f3')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC35: SublineNarration = {
  intro: { say: "Black plays …h6. You break with e4, reroute Nh4 toward f5, then advance f4 to open the kingside — a sharp, roughly balanced fight where you must play energetically.", sayShort: "…h6 — e4, Nh4, f4, gxf4" },
  beats: [
    { atMove: 12, say: "e4 — the central break, challenging Black's pawn front.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 14, say: "Nh4 — rerouting the knight toward f5, the key kingside square.", sayShort: "Nh4 — reroute toward f5", highlights: [_H('h4')] },
    { atMove: 16, say: "f4 — the kingside pawn advance, striking at e5 and opening lines.", sayShort: "f4 — strike at e5", arrows: [_A('f4', 'e5')] },
    { atMove: 18, say: "gxf4 — recapturing, opening the g-file toward Black's king in the sharp, balanced melee.", sayShort: "gxf4 — open the g-file", highlights: [_H('f4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC36: SublineNarration = {
  intro: { say: "Black lunges …e4. You open with dxe4, leap Ng5 to attack the centre, win the sacrificed e3-pawn with fxe3, then centralise the knight on e4 with a small edge.", sayShort: "…e4 — dxe4, Ng5, fxe3, Nge4" },
  beats: [
    { atMove: 12, say: "dxe4 — opening the centre, meeting the …e4 thrust head-on.", sayShort: "dxe4 — open the centre", highlights: [_H('e4')] },
    { atMove: 14, say: "Ng5 — the knight jumps in to attack e4 and f7, exploiting the open lines.", sayShort: "Ng5 — attack e4 and f7", arrows: [_A('g5', 'f7')] },
    { atMove: 16, say: "fxe3 — collecting the sacrificed pawn and opening the f-file toward f7.", sayShort: "fxe3 — win the pawn, open the f-file", highlights: [_H('e3')] },
    { atMove: 20, say: "Nge4 — centralising the knight on the strong e4-square, pressing with a small edge.", sayShort: "Nge4 — centralise the knight", highlights: [_H('e4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC37: SublineNarration = {
  intro: { say: "Black trades …dxe4. You recapture toward the centre, solidify with c3, centralise with Qe2, then reroute the knights — Nh4 toward f5 and Nc4 to the outpost.", sayShort: "…dxe4 — dxe4, c3, Nh4, Nc4" },
  beats: [
    { atMove: 14, say: "dxe4 — recapturing toward the centre, the KIA structure with the e-pawn.", sayShort: "dxe4 — KIA centre", highlights: [_H('e4')] },
    { atMove: 16, say: "c3 — solidifying the centre, supporting the d-pawn break later.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 20, say: "Nh4 — rerouting the knight toward f5, the key kingside square.", sayShort: "Nh4 — reroute toward f5", highlights: [_H('h4')] },
    { atMove: 22, say: "Nc4 — the other knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC38: SublineNarration = {
  intro: { say: "Black develops …Bf5. You break with e4, recapture, attack the bishop with Ng5, then advance f4 and leap to the c4-outpost.", sayShort: "…Bf5 — e4, Ng5, f4, Nc4" },
  beats: [
    { atMove: 12, say: "e4 — the central break, challenging Black's pawn front.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 16, say: "Ng5 — attacking the e6-bishop, gaining the bishop pair or a tempo.", sayShort: "Ng5 — attack the bishop", arrows: [_A('g5', 'e6')] },
    { atMove: 20, say: "f4 — the kingside pawn advance, gaining space and striking at e5.", sayShort: "f4 — gain space, hit e5", arrows: [_A('f4', 'e5')] },
    { atMove: 22, say: "Nc4 — the knight to c4, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC39: SublineNarration = {
  intro: { say: "Black develops …Be6. You open with exd5 to isolate Black's d-pawn, solidify with c3, post the rook on e1, then strike d4 to open lines.", sayShort: "…Be6 — exd5, c3, Re1, d4" },
  beats: [
    { atMove: 14, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 16, say: "c3 — solidifying the centre, preparing the d4 break.", sayShort: "c3 — solidify, prep d4", highlights: [_H('c3')] },
    { atMove: 18, say: "Re1 — the rook takes the e-file, pressing Black's position.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
    { atMove: 22, say: "d4 — striking the centre, opening lines against the isolated pawn.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
  ],
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC40: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3, attack the e6-bishop with Ng5, gain queenside space with a4, then leap to the c4-outpost.", sayShort: "…Bg4 — h3, Ng5, a4, Nc4" },
  beats: [
    { atMove: 14, say: "h3 — questioning the g4-bishop, forcing it to declare.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 16, say: "Ng5 — attacking the e6-bishop, gaining a tempo or the bishop pair.", sayShort: "Ng5 — attack the bishop", arrows: [_A('g5', 'e6')] },
    { atMove: 18, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Nc4 — the knight to c4, eyeing e5 and d6 with the better game.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC41: SublineNarration = {
  intro: { say: "Black plays …c5 early. You complete the KIA set-up, post the rook on e1, solidify with c3, centralise with Qe2, then begin the Nf1-h2-g4 reroute toward the kingside.", sayShort: "…c5 — Re1, c3, Qe2, Nf1" },
  beats: [
    { atMove: 14, say: "Re1 — the rook supports the e-pawn, the KIA build-up.", sayShort: "Re1 — KIA build-up", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "c3 — solidifying the centre, giving the knight the c2-square.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute toward h2 and g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC42: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You clamp with e5, build the big centre with d4, storm with h4, leap Ng5, then snatch the b5-pawn — a clear plus.", sayShort: "…b6 — e5, d4, h4, Bxb5" },
  beats: [
    { atMove: 8, say: "e5 — the French-KIA clamp, gaining space and kicking the f6-knight.", sayShort: "e5 — clamp, kick the knight", highlights: [_H('e5')] },
    { atMove: 12, say: "d4 — building the broad centre, claiming a space bind.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 14, say: "h4 — the kingside pawn storm begins, gaining space toward the king.", sayShort: "h4 — kingside storm", arrows: [_A('h4', 'h5')] },
    { atMove: 22, say: "Bxb5 — snatching the pawn, emerging a clean pawn up with the better game.", sayShort: "Bxb5 — win the pawn", highlights: [_H('b5')] },
  ],
  sources: ['concept:pos-space', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC43: SublineNarration = {
  intro: { say: "Black develops …Nc6. You clamp with e5, build the centre with d4, support it with c3, then reposition the bishop to d3 aiming at h7.", sayShort: "…Nc6 — e5, d4, c3, Bd3" },
  beats: [
    { atMove: 8, say: "e5 — the French-KIA space clamp, kicking the f6-knight.", sayShort: "e5 — clamp, kick the knight", highlights: [_H('e5')] },
    { atMove: 10, say: "d4 — building the broad centre, claiming a space bind.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 16, say: "c3 — supporting the centre, solidifying your space advantage.", sayShort: "c3 — support the centre", highlights: [_H('c3')] },
    { atMove: 20, say: "Bd3 — repositioning the bishop to the b1-h7 diagonal, aiming at h7.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC44: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You post the rook on e1, clamp with e5, then begin the kingside attack: Nf1, h4 and the knight reroute via h2 to g4.", sayShort: "…b6 — Re1, e5, Nf1, h4" },
  beats: [
    { atMove: 16, say: "e5 — the space-gaining clamp, kicking the f6-knight and cramping Black.", sayShort: "e5 — clamp the kingside", highlights: [_H('e5')] },
    { atMove: 18, say: "Nf1 — the signature KIA reroute, heading via h2 to g4.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
    { atMove: 20, say: "h4 — the kingside pawn storm begins, gaining space toward the king.", sayShort: "h4 — kingside storm", arrows: [_A('h4', 'h5')] },
    { atMove: 22, say: "N1h2 — the knight reaches h2, heading to g4 to join the assault.", sayShort: "N1h2 — knight to g4", highlights: [_H('h2')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC45: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You solidify with c3, centralise with Qe2, then begin the Nf1-h2-g4 reroute toward the kingside attack.", sayShort: "…Qc7 — c3, Qe2, Nf1" },
  beats: [
    { atMove: 16, say: "c3 — solidifying the centre, giving the knight the c2-square.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute toward h2 and g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC46: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You post the rook on e1, solidify with c3, centralise with Qe2, then begin the Nf1 reroute toward the kingside.", sayShort: "…Qc7 — Re1, c3, Qe2, Nf1" },
  beats: [
    { atMove: 14, say: "Re1 — the rook supports the e-pawn, the KIA build-up.", sayShort: "Re1 — KIA build-up", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "c3 — solidifying the centre.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute toward h2 and g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC47: SublineNarration = {
  intro: { say: "Black develops …Be7. You clamp with e5, build the centre with d4, aim the bishop at h7 from d3, then reroute Nb3 to press the position.", sayShort: "…Be7 — e5, d4, Bd3, Nb3" },
  beats: [
    { atMove: 8, say: "e5 — the French-KIA clamp, gaining space and kicking the f6-knight.", sayShort: "e5 — clamp, kick the knight", highlights: [_H('e5')] },
    { atMove: 12, say: "d4 — building the broad centre, claiming a space bind.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 14, say: "Bd3 — the bishop to the b1-h7 diagonal, aiming at h7.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 22, say: "Nb3 — rerouting the knight toward c5 and d4, pressing the position.", sayShort: "Nb3 — reroute, press", highlights: [_H('c5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC48: SublineNarration = {
  intro: { say: "Black develops …Nc6 and …e5. You open with exd5 gaining a tempo on the queen, leap to the c4-outpost, post the rook on e1, then centralise the queen on c2.", sayShort: "…Nc6 — exd5, Nc4, Re1, Qc2" },
  beats: [
    { atMove: 8, say: "exd5 — opening the centre and gaining a tempo on the queen recapture.", sayShort: "exd5 — open with tempo", highlights: [_H('d5')] },
    { atMove: 12, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 18, say: "Re1 — the rook takes the e-file, pressing the centre.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e8')] },
    { atMove: 20, say: "Qc2 — centralising the queen on the b1-h7 diagonal, eyeing the kingside.", sayShort: "Qc2 — eye the kingside", arrows: [_A('c2', 'h7')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC49: SublineNarration = {
  intro: { say: "Black fianchettoes …g6. You castle and solidify with c3, clamp with e5, build the big centre with d4, gain queenside space with a4, then reroute Nb1 to support the centre.", sayShort: "…g6 — e5, d4, a4, Nb1" },
  beats: [
    { atMove: 16, say: "e5 — the space-gaining clamp, kicking the f6-knight.", sayShort: "e5 — clamp the kingside", highlights: [_H('e5')] },
    { atMove: 18, say: "d4 — building the broad centre against the fianchetto.", sayShort: "d4 — build the big centre", highlights: [_H('d4')] },
    { atMove: 20, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 22, say: "Nb1 — rerouting the knight via c3 or d2 to support the broad centre.", sayShort: "Nb1 — reroute to support", highlights: [_H('b1')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KC50: SublineNarration = {
  intro: { say: "Black develops …Bc5. You clamp with e5 gaining a tempo, build the centre with d4, aim the bishop at h7 from d3, then open lines favourably with exf6.", sayShort: "…Bc5 — e5, d4, Bd3, exf6" },
  beats: [
    { atMove: 8, say: "e5 — the clamp, gaining space and a tempo on the c5-bishop.", sayShort: "e5 — clamp, gain a tempo", highlights: [_H('e5')] },
    { atMove: 12, say: "Bd3 — the bishop to the b1-h7 diagonal, aiming at h7.", sayShort: "Bd3 — aim at h7", arrows: [_A('d3', 'h7')] },
    { atMove: 18, say: "Re1 — the rook takes the e-file, supporting the centre.", sayShort: "Re1 — seize the e-file", arrows: [_A('e1', 'e4')] },
    { atMove: 22, say: "exf6 — opening lines favourably, with the space edge in hand.", sayShort: "exf6 — open favourably", highlights: [_H('f6')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};

const KD51: SublineNarration = {
  intro: { say: "With the e5-spearhead set, Black plays …Qc7. You develop Bf4 to support e5, solidify with c3, then launch the kingside storm with h4.", sayShort: "…Qc7 — Bf4, c3, h4" },
  beats: [
    { atMove: 20, say: "Bf4 — developing the bishop to buttress the e5-pawn and eye the c7-queen.", sayShort: "Bf4 — support e5", arrows: [_A('f4', 'c7')] },
    { atMove: 22, say: "c3 — solidifying the centre, preparing queenside or central play.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 24, say: "h4 — the kingside pawn storm begins, prising open the king's cover.", sayShort: "h4 — start the storm", arrows: [_A('h4', 'h5')] },
  ],
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD52: SublineNarration = {
  intro: { say: "Black fianchettoes with …g6. You strike d4 into a symmetric structure, challenge with c4, develop Nc3, then trade queens into a slightly better ending with Black's doubled c-pawns.", sayShort: "…Nf6 — d4, c4, Nc3, Qxd8" },
  beats: [
    { atMove: 8, say: "d4 — striking the centre, opening into a symmetric Catalan-style structure.", sayShort: "d4 — strike the centre", highlights: [_H('d4')] },
    { atMove: 12, say: "c4 — challenging d5, the broad pawn front.", sayShort: "c4 — challenge d5", arrows: [_A('c4', 'd5')] },
    { atMove: 16, say: "Nc3 — developing with pressure on d5, contesting the centre.", sayShort: "Nc3 — contest d5", highlights: [_H('d5')] },
    { atMove: 22, say: "Qxd8 — trading queens into an ending where Black's doubled c-pawns are the lasting weakness.", sayShort: "Qxd8 — into a better ending", highlights: [_H('d8')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD53: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You open with exd5, reroute Nb3 toward c5, gain queenside space with c4, then develop Bd2 for the queenside play.", sayShort: "…Qc7 — exd5, Nb3, c4, Bd2" },
  beats: [
    { atMove: 14, say: "exd5 — opening the centre and gaining a tempo on the recapture.", sayShort: "exd5 — open with tempo", highlights: [_H('d5')] },
    { atMove: 16, say: "Nb3 — the knight eyes c5 and d4, pressing the queenside.", sayShort: "Nb3 — press the queenside", highlights: [_H('c5')] },
    { atMove: 18, say: "c4 — gaining queenside space and hitting d5.", sayShort: "c4 — gain space, hit d5", arrows: [_A('c4', 'd5')] },
    { atMove: 22, say: "Bd2 — developing the bishop, preparing the queenside expansion.", sayShort: "Bd2 — prepare expansion", highlights: [_H('d2')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD54: SublineNarration = {
  intro: { say: "Black centralises …Qc7. You solidify with c3, centralise with Qe2, then begin the Nf1-h2-g4 reroute toward the kingside attack.", sayShort: "…Qc7 — c3, Qe2, Nf1" },
  beats: [
    { atMove: 16, say: "c3 — solidifying the centre, giving the knight the c2-square.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 18, say: "Qe2 — centralising the queen, preparing the kingside maneuver.", sayShort: "Qe2 — centralise", highlights: [_H('e2')] },
    { atMove: 20, say: "Nf1 — the signature KIA reroute toward h2 and g4 and the attack.", sayShort: "Nf1 — reroute toward g4", highlights: [_H('f1')] },
  ],
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD55: SublineNarration = {
  intro: { say: "Black fianchettoes with …b6. You post the rook on e1, clamp with e5, then begin the kingside attack: Nf1, h4 and the knight reroute via h2 to g4.", sayShort: "…b6 — Re1, e5, Nf1, h4" },
  beats: [
    { atMove: 14, say: "Re1 — the rook supports the e-pawn, the KIA build-up.", sayShort: "Re1 — KIA build-up", arrows: [_A('e1', 'e4')] },
    { atMove: 16, say: "e5 — the space-gaining clamp, kicking the f6-knight.", sayShort: "e5 — clamp the kingside", highlights: [_H('e5')] },
    { atMove: 20, say: "h4 — the kingside pawn storm begins, gaining space toward the king.", sayShort: "h4 — kingside storm", arrows: [_A('h4', 'h5')] },
    { atMove: 22, say: "N1h2 — the knight reaches h2, heading to g4 to join the assault.", sayShort: "N1h2 — knight to g4", highlights: [_H('h2')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD56: SublineNarration = {
  intro: { say: "Black overreaches with …d4. You snap it with Nxd4, and after …cxd4 the loose c6-knight falls to Bxc6 — you win material with the better game.", sayShort: "…d4 — Nxd4 then Bxc6 wins material" },
  beats: [
    { atMove: 20, say: "Nxd4 — snapping the overextended pawn. The c6-knight is now loose on the long diagonal.", sayShort: "Nxd4 — snap the pawn", highlights: [_H('d4')] },
    { atMove: 22, say: "Bxc6 — collecting the loose knight down the long diagonal. You win material and stand clearly better.", sayShort: "Bxc6 — win material", highlights: [_H('c6')] },
  ],
  sources: ['concept:tac-double-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD57: SublineNarration = {
  intro: { say: "Black plays …f6 against the e5-spearhead. You open with exf6, exploiting the weakening of Black's king, solidify with c3, then trade in the centre with Nxe5.", sayShort: "…f6 — exf6, c3, Nxe5" },
  beats: [
    { atMove: 20, say: "exf6 — opening the position, exploiting the …f6 weakening of Black's king cover.", sayShort: "exf6 — open the king", highlights: [_H('f6')] },
    { atMove: 22, say: "c3 — solidifying the centre, preparing central play.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
    { atMove: 24, say: "Nxe5 — trading in the centre, keeping a sound, active position.", sayShort: "Nxe5 — trade in the centre", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD61: SublineNarration = {
  intro: { say: "In the symmetric double-fianchetto KIA Black plays …Nbd7. You post the rook on e1, gain queenside space with a4, then break with e4 and leap to the c4-outpost.", sayShort: "…Nbd7 — Re1, a4, e4, Nc4" },
  beats: [
    { atMove: 12, say: "Re1 — the rook backs the centre, preparing the e4 break.", sayShort: "Re1 — prepare e4", arrows: [_A('e1', 'e4')] },
    { atMove: 18, say: "e4 — the central break, claiming space in the symmetric structure.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 20, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 22, say: "b3 — preparing Bb2, completing the queenside structure.", sayShort: "b3 — prepare Bb2", highlights: [_H('b3')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD62: SublineNarration = {
  intro: { say: "Black plays …c5. You gain queenside space with a4, break with e4, leap to the c4-outpost, then clamp with a5.", sayShort: "…c5 — a4, e4, Nc4, a5" },
  beats: [
    { atMove: 14, say: "e4 — the central break, claiming space in the symmetric KIA.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6 and the queenside.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "a5 — clamping the queenside, gaining space and fixing Black's pawns.", sayShort: "a5 — clamp the queenside", arrows: [_A('a5', 'b6')] },
    { atMove: 22, say: "c3 — solidifying the centre, completing a comfortable bind.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD63: SublineNarration = {
  intro: { say: "Black develops …Nc6. You break with e4, gain queenside space with a4, leap to the c4-outpost, then open lines with exd5 and fianchetto Bb2.", sayShort: "…Nc6 — e4, Nc4, exd5, Bb2" },
  beats: [
    { atMove: 12, say: "e4 — the central break, claiming space.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 20, say: "exd5 — opening the centre, leaving Black with an isolated d-pawn.", sayShort: "exd5 — create the isolani", highlights: [_H('d5')] },
    { atMove: 22, say: "Bb2 — the bishop rakes the long diagonal, pressing the isolated pawn and the kingside.", sayShort: "Bb2 — rake the diagonal", arrows: [_A('b2', 'g7')] },
  ],
  sources: ['concept:pos-center', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD64: SublineNarration = {
  intro: { say: "Black plays …c6. You break with e4, gain space with e5 kicking the knight, post the rook on e1, then plant the knight on the strong e4-square.", sayShort: "…c6 — e4, e5, Ne4, Bd2" },
  beats: [
    { atMove: 12, say: "e4 — the central break, claiming space.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 14, say: "e5 — the space-gaining clamp, kicking the f6-knight.", sayShort: "e5 — clamp, kick the knight", highlights: [_H('e5')] },
    { atMove: 20, say: "Ne4 — the knight reaches the strong e4-square, eyeing d6 and f6.", sayShort: "Ne4 — strong central knight", highlights: [_H('e4')] },
    { atMove: 22, say: "Bd2 — developing the bishop, preparing the queenside and supporting the knight.", sayShort: "Bd2 — develop, support", highlights: [_H('d2')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD65: SublineNarration = {
  intro: { say: "Black plays …e5 then …Nbd7. You gain queenside space with a4, leap to the c4-outpost, post the rook on e1, then swing the bishop to a3 eyeing the queenside.", sayShort: "…Nbd7 — a4, Nc4, Re1, Ba3" },
  beats: [
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 18, say: "Re1 — the rook backs the centre, the KIA post.", sayShort: "Re1 — back the centre", arrows: [_A('e1', 'e4')] },
    { atMove: 20, say: "b3 — preparing Bb2 or Ba3, completing the queenside structure.", sayShort: "b3 — prepare the fianchetto", highlights: [_H('b3')] },
    { atMove: 22, say: "Ba3 — the bishop swings to a3, pressing the queenside and the c5-knight.", sayShort: "Ba3 — press the queenside", arrows: [_A('a3', 'f8')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD66: SublineNarration = {
  intro: { say: "Black plays …e5 then …c6. You prepare b4 with c3, break on the queenside with b4, open with bxc5, then snap the centre with Nxe5 in the sharp play.", sayShort: "…c6 — c3, b4, bxc5, Nxe5" },
  beats: [
    { atMove: 14, say: "c3 — preparing the queenside break b4.", sayShort: "c3 — prepare b4", highlights: [_H('b4')] },
    { atMove: 16, say: "b4 — the queenside pawn break, gaining space and opening lines.", sayShort: "b4 — queenside break", arrows: [_A('b4', 'c5')] },
    { atMove: 18, say: "bxc5 — opening the queenside, prising open lines for your pieces.", sayShort: "bxc5 — open the queenside", highlights: [_H('c5')] },
    { atMove: 20, say: "Nxe5 — snapping the central pawn in the tactics, keeping the better game.", sayShort: "Nxe5 — snap the centre", highlights: [_H('e5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD67: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You solidify with c3, leap to the c4-outpost, gain queenside space with a4, then develop Bd2 for the queenside play.", sayShort: "…Bg4 — c3, Nc4, a4, Bd2" },
  beats: [
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 18, say: "a4 — gaining queenside space, fixing Black's pawns.", sayShort: "a4 — queenside space", arrows: [_A('a4', 'a5')] },
    { atMove: 20, say: "Re1 — the rook backs the centre, the KIA post.", sayShort: "Re1 — back the centre", arrows: [_A('e1', 'e4')] },
    { atMove: 22, say: "Bd2 — developing the bishop, preparing the queenside expansion.", sayShort: "Bd2 — prepare expansion", highlights: [_H('d2')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD68: SublineNarration = {
  intro: { say: "Black pins with …Bg4. You question it with h3, break with e4, gain queenside space with a4, leap to the c4-outpost, then jump Ng5 toward e6 and f7.", sayShort: "…Bg4 — h3, e4, Nc4, Ng5" },
  beats: [
    { atMove: 12, say: "h3 — questioning the g4-bishop, forcing it to declare.", sayShort: "h3 — question the bishop", highlights: [_H('g4')] },
    { atMove: 16, say: "e4 — the central break, claiming space.", sayShort: "e4 — the central break", highlights: [_H('e4')] },
    { atMove: 20, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 22, say: "Ng5 — the knight jumps toward e6 and f7, eyeing the kingside.", sayShort: "Ng5 — jump toward e6/f7", highlights: [_H('g5')] },
  ],
  sources: ['concept:pos-prophylaxis', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD69: SublineNarration = {
  intro: { say: "Black plays …e5 then …c5. You gain queenside space with a4, leap to the c4-outpost, reroute Ne3 toward d5 and f5, then solidify with c3.", sayShort: "…c5 — a4, Nc4, Ne3, c3" },
  beats: [
    { atMove: 16, say: "Nc4 — the knight to the c4-outpost, eyeing e5 and d6.", sayShort: "Nc4 — c4-outpost", highlights: [_H('c4')] },
    { atMove: 18, say: "Ne3 — rerouting the knight toward the central d5 and f5 squares.", sayShort: "Ne3 — reroute to d5/f5", highlights: [_H('e3')] },
    { atMove: 20, say: "Nd2 — rerouting the other knight to support the centre and the kingside.", sayShort: "Nd2 — reroute the knight", highlights: [_H('d2')] },
    { atMove: 22, say: "c3 — solidifying the centre, completing a comfortable bind.", sayShort: "c3 — solidify", highlights: [_H('c3')] },
  ],
  sources: ['concept:pos-outpost', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};
const KD70: SublineNarration = {
  intro: { say: "Black develops …Be6. You break on the queenside with b4, open with bxc5, take the open b-file with Rb1, then jump Ng5 — a sharp, roughly balanced fight where the b-file gives full play for the a2-pawn.", sayShort: "…Be6 — b4, bxc5, Rb1, Ng5" },
  beats: [
    { atMove: 14, say: "b4 — the queenside pawn break, gaining space and opening lines.", sayShort: "b4 — queenside break", arrows: [_A('b4', 'c5')] },
    { atMove: 16, say: "bxc5 — opening the queenside, prising open files for your rooks.", sayShort: "bxc5 — open the queenside", highlights: [_H('c5')] },
    { atMove: 18, say: "Rb1 — the rook takes the open b-file, pressing b7 — full compensation for the a2-pawn.", sayShort: "Rb1 — seize the b-file", arrows: [_A('b1', 'b7')] },
    { atMove: 20, say: "Ng5 — the knight jumps toward e6 and f7 in the sharp, balanced melee.", sayShort: "Ng5 — jump toward e6/f7", highlights: [_H('g5')] },
  ],
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};

const KD58: SublineNarration = {
  intro: { say: "With the e5-spearhead set, Black develops …Ba6 to pressure d3. You launch the kingside storm with h4, then gain queenside space with a4 — playing on both wings while Black is cramped.", sayShort: "…Ba6 — h4, a4" },
  beats: [
    { atMove: 20, say: "h4 — the kingside pawn storm begins, the KIA's attacking plan against the castled king.", sayShort: "h4 — start the storm", arrows: [_A('h4', 'h5')] },
    { atMove: 22, say: "a4 — gaining queenside space and fixing Black's pawns, squeezing on both wings.", sayShort: "a4 — squeeze both wings", arrows: [_A('a4', 'a5')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Indian_Attack'],
};

export const SUBLINE_NARRATION_D4FLANK: Record<string, SublineNarration> = {
  'kings-indian-attack::7::e5@11': KA71,
  'kings-indian-attack::0::e5@11': KA01,
  'reti-opening::6::Bd6@13': RT60,
  'reti-opening::0::Bd6@13': RT01,
  'london-system::2::Nc6@9': LN20,
  'old-indian-defence::0::h3@14': WOLDH3,
  'old-indian-defence::4::h3@14': WOLDH3,
  'old-indian-defence::5::h3@14': WOLDH3,
  'old-indian-defence::6::h3@14': WOLDH3,
  'queens-gambit::4::e6@7': WQGMERAN,
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
  'qgd::6::Be2@16': WQGDTAB,
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
  'qga::2::O-O@14': WQGAGAR,
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
  'slav-defence::5::Be2@10': WSLAVG6,
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
  'nimzo-indian::7::Ne2@8': WNIMNE2,
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
  'benoni-defence::4::Bb5+@14': WBENTAIM,
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
  'catalan-opening::2::Nc6@11': WCATNC6,
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
  'london-system::0::cxd4@9': LN01,
  'london-system::0::Bd6@9': LN02,
  'london-system::0::Be7@11': LN03,
  'london-system::0::c4@9': LN04,
  'london-system::0::cxd4@11': LN05,
  'london-system::0::Be7@9': LN06,
  'london-system::0::Qb6@11': LN07,
  'london-system::0::Qb6@9': LN08,
  'london-system::0::b6@15': LN09,
  'london-system::0::a6@11': LN10,
  'london-system::1::Re8@17': LN11,
  'london-system::1::c5@17': LN12,
  'london-system::1::Ne4@17': LN13,
  'london-system::1::Nh5@17': LN14,
  'london-system::1::e5@17': LN15,
  'london-system::1::Qe8@17': LN16,
  'london-system::1::Rc8@17': LN17,
  'london-system::1::a6@17': LN18,
  'london-system::1::e6@17': LN19,
  'london-system::1::Nd5@17': LN80,
  'london-system::2::cxd4@9': LN21,
  'london-system::2::Bd6@9': LN22,
  'london-system::2::c4@9': LN23,
  'london-system::2::Be7@9': LN24,
  'london-system::2::Qb6@9': LN25,
  'london-system::2::Be7@13': LN26,
  'london-system::2::cxd4@13': LN27,
  'london-system::2::cxd4@11': LN28,
  'london-system::2::Bd6@11': LN29,
  'london-system::3::Nbd7@11': LN30,
  'london-system::3::c6@11': LN31,
  'london-system::3::Nc6@11': LN32,
  'london-system::3::b6@11': LN33,
  'london-system::3::Bg4@11': LN34,
  'london-system::3::Bf5@11': LN35,
  'london-system::3::cxd4@13': LN36,
  'london-system::3::Re8@11': LN37,
  'london-system::3::Nh5@11': LN38,
  'london-system::3::cxd4@15': LN39,
  'london-system::4::Be7@7': LN40,
  'london-system::4::b6@7': LN41,
  'london-system::4::d6@7': LN42,
  'london-system::4::Bd6@7': LN43,
  'london-system::4::Bb4+@7': LN49,
  'london-system::4::Be7@9': LN44,
  'london-system::4::c6@7': LN47,
  'london-system::4::c6@9': LN48,
  'london-system::4::Nc6@7': LN45,
  'london-system::4::c5@9': LN46,
  'london-system::5::Bd6@7': LN50,
  'london-system::5::c5@7': LN51,
  'london-system::5::Nc6@7': LN52,
  'london-system::5::Bb4@11': LN53,
  'london-system::5::a6@7': LN54,
  'london-system::5::h6@7': LN55,
  'london-system::5::Nbd7@11': LN56,
  'london-system::5::c6@7': LN57,
  'london-system::5::Be7@11': LN58,
  'london-system::5::Bd6@9': LN59,
  'london-system::6::c5@7': LN60,
  'london-system::6::b6@15': LN61,
  'london-system::6::Be7@7': LN62,
  'london-system::6::Re8@15': LN63,
  'london-system::6::Bxg3@9': LN64,
  'london-system::6::c5@9': LN65,
  'london-system::6::cxd4@15': LN66,
  'london-system::6::c4@15': LN67,
  'london-system::6::Nc6@7': LN68,
  'london-system::6::a6@15': LN69,
  'london-system::7::d6@5': LN70,
  'london-system::7::d6@9': LN71,
  'london-system::7::Qb6@5': LN72,
  'london-system::7::a6@9': LN73,
  'london-system::7::b4@9': LN74,
  'london-system::7::Qa5+@9': LN75,
  'london-system::7::g6@5': LN76,
  'london-system::7::Qb6@9': LN77,
  'london-system::7::e6@5': LN78,
  'london-system::7::d6@7': LN79,
  // ── trompowsky-attack ──
  'trompowsky-attack::0::e6@7': C80,
  'trompowsky-attack::0::Bf5@7': C80,
  'trompowsky-attack::0::g6@7': C80,
  'trompowsky-attack::0::g5@7': C80,
  'trompowsky-attack::0::c6@7': C81,
  'trompowsky-attack::0::Nc6@7': C80,
  'trompowsky-attack::0::c5@5': WTROC5,
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
  'reti-opening::0::d4@13': RT02,
  'reti-opening::0::Bc5@13': RT03,
  'reti-opening::0::Be7@15': RT04,
  'reti-opening::0::Be7@13': RT05,
  'reti-opening::0::Qc7@15': RT06,
  'reti-opening::0::e6@9': RT07,
  'reti-opening::0::Bd6@15': RT08,
  'reti-opening::0::e6@11': RT09,
  'reti-opening::0::Nc5@15': RT10,
  'reti-opening::1::dxc4@13': RT11,
  'reti-opening::1::b6@13': RT12,
  'reti-opening::1::a6@13': RT13,
  'reti-opening::1::c6@9': RT14,
  'reti-opening::1::h6@13': RT15,
  'reti-opening::1::Nxe4@19': RT16,
  'reti-opening::1::Re8@13': RT17,
  'reti-opening::1::dxc4@11': WRETIDXC,
  'reti-opening::1::Ne4@13': RT18,
  'reti-opening::1::dxc4@9': RT19,
  'reti-opening::2::Be7@9': RT20,
  'reti-opening::2::Bd6@9': RT21,
  'reti-opening::2::Nc6@9': RT22,
  'reti-opening::2::Bc5@9': RT23,
  'reti-opening::2::a6@9': RT24,
  'reti-opening::2::b6@9': RT25,
  'reti-opening::2::c6@9': RT26,
  'reti-opening::2::Qxd1@13': WRETIQXD,
  'reti-opening::2::Nc6@11': RT27,
  'reti-opening::2::Nc6@15': RT28,
  'reti-opening::3::dxe4@13': RT30,
  'reti-opening::3::c6@5': RT31,
  'reti-opening::3::d4@13': RT32,
  'reti-opening::3::b6@13': RT33,
  'reti-opening::3::c5@5': RT34,
  'reti-opening::3::Bb7@19': RT35,
  'reti-opening::3::Qc7@19': RT36,
  'reti-opening::3::g6@5': RT37,
  'reti-opening::3::b5@13': RT38,
  'reti-opening::3::Bf5@5': RT39,
  'reti-opening::4::c6@9': RT40,
  'reti-opening::4::dxc4@9': RT41,
  'reti-opening::4::dxc4@7': RT42,
  'reti-opening::4::d4@7': RT43,
  'reti-opening::4::b6@11': RT44,
  'reti-opening::4::dxc4@5': RT45,
  'reti-opening::4::cxd4@19': RT46,
  'reti-opening::4::c5@7': RT47,
  'reti-opening::4::dxc4@19': RT48,
  'reti-opening::4::d4@11': RT49,
  'reti-opening::5::Nf6@11': RT50,
  'reti-opening::5::c6@11': RT51,
  'reti-opening::5::Bf5@11': RT52,
  'reti-opening::5::Bb4@13': RT53,
  'reti-opening::5::Bg4@11': RT54,
  'reti-opening::5::Nf6@13': RT55,
  'reti-opening::5::Bg4@7': RT56,
  'reti-opening::5::e6@11': RT57,
  'reti-opening::5::Be6@11': RT58,
  'reti-opening::5::a6@11': RT59,
  'reti-opening::6::Rc8@17': RT61,
  'reti-opening::6::h6@13': RT62,
  'reti-opening::6::h6@15': RT63,
  'reti-opening::6::Rc8@19': RT64,
  'reti-opening::6::a5@17': RT65,
  'reti-opening::6::Re8@17': RT66,
  'reti-opening::6::dxc4@7': RT67,
  'reti-opening::6::a5@19': RT68,
  'reti-opening::6::Qc7@17': RT69,
  'reti-opening::7::c5@5': RT70,
  'reti-opening::7::f6@5': RT71,
  'reti-opening::7::c6@15': RT72,
  'reti-opening::7::Bg4@5': RT73,
  'reti-opening::7::Bg4@11': RT74,
  'reti-opening::7::g5@5': RT75,
  'reti-opening::7::a5@15': RT76,
  'reti-opening::7::Nf6@5': RT77,
  'reti-opening::7::b6@11': RT78,
  'reti-opening::7::b6@9': RT79,
  // ── kings-indian-attack ──
  'kings-indian-attack::0::O-O@13': KA02,
  'kings-indian-attack::0::Bc5@9': KA03,
  'kings-indian-attack::0::Bb4@11': KA04,
  'kings-indian-attack::0::e5@9': KA09,
  'kings-indian-attack::0::Be7@11': KA05,
  'kings-indian-attack::0::c5@5': KA08,
  'kings-indian-attack::0::Be7@9': KA06,
  'kings-indian-attack::0::Ng4@13': KA07,
  'kings-indian-attack::0::Bd6@9': KA10,
  'kings-indian-attack::1::Nf6@9': KB11,
  'kings-indian-attack::1::e6@9': KB12,
  'kings-indian-attack::1::e6@11': KB13,
  'kings-indian-attack::1::Bg4@11': KB14,
  'kings-indian-attack::1::e5@11': KB15,
  'kings-indian-attack::1::d5@9': KB16,
  'kings-indian-attack::1::e5@9': KB17,
  'kings-indian-attack::1::Bg4@13': KB18,
  'kings-indian-attack::1::Bd7@11': KB19,
  'kings-indian-attack::1::a6@15': KB20,
  'kings-indian-attack::2::Bg4@7': KB21,
  'kings-indian-attack::2::Nd7@7': KB22,
  'kings-indian-attack::2::Bg4@9': KB23,
  'kings-indian-attack::2::Bg4@13': KB24,
  'kings-indian-attack::2::Ne7@9': KB25,
  'kings-indian-attack::2::Bg4@11': KB26,
  'kings-indian-attack::2::f6@7': KB27,
  'kings-indian-attack::2::Qc7@7': KB28,
  'kings-indian-attack::2::Nf6@7': KB29,
  'kings-indian-attack::2::f5@9': KB30,
  'kings-indian-attack::3::Bd6@11': KC31,
  'kings-indian-attack::3::Be6@11': KC32,
  'kings-indian-attack::3::Bg4@11': KC33,
  'kings-indian-attack::3::O-O@13': KC34,
  'kings-indian-attack::3::h6@11': KC35,
  'kings-indian-attack::3::e4@11': KC36,
  'kings-indian-attack::3::dxe4@13': KC37,
  'kings-indian-attack::3::Bf5@11': KC38,
  'kings-indian-attack::3::Be6@13': KC39,
  'kings-indian-attack::3::Bg4@13': KC40,
  'kings-indian-attack::4::c5@5': KC41,
  'kings-indian-attack::4::b6@7': KC42,
  'kings-indian-attack::4::Nc6@7': KC43,
  'kings-indian-attack::4::b6@13': KC44,
  'kings-indian-attack::4::Qc7@15': KC45,
  'kings-indian-attack::4::Qc7@13': KC46,
  'kings-indian-attack::4::Be7@7': KC47,
  'kings-indian-attack::4::Nc6@5': KC48,
  'kings-indian-attack::4::g6@11': KC49,
  'kings-indian-attack::4::Bc5@7': KC50,
  'kings-indian-attack::5::Qc7@19': KD51,
  'kings-indian-attack::5::b5@15': WKIAB5,
  'kings-indian-attack::5::f6@19': KD57,
  'kings-indian-attack::5::b6@13': KD55,
  'kings-indian-attack::5::Nf6@5': KD52,
  'kings-indian-attack::5::Qc7@15': KD54,
  'kings-indian-attack::5::Ba6@19': KD58,
  'kings-indian-attack::5::e5@7': WKIAE5,
  'kings-indian-attack::5::Qc7@13': KD53,
  'kings-indian-attack::5::d4@19': KD56,
  'kings-indian-attack::6::Nbd7@11': KD61,
  'kings-indian-attack::6::c5@11': KD62,
  'kings-indian-attack::6::Nc6@11': KD63,
  'kings-indian-attack::6::c6@11': KD64,
  'kings-indian-attack::6::Nbd7@13': KD65,
  'kings-indian-attack::6::c6@13': KD66,
  'kings-indian-attack::6::Bg4@13': KD67,
  'kings-indian-attack::6::Bg4@11': KD68,
  'kings-indian-attack::6::c5@13': KD69,
  'kings-indian-attack::6::Be6@13': KD70,
  'kings-indian-attack::7::e5@13': KA72,
  'kings-indian-attack::7::Bc5@9': KA73,
  'kings-indian-attack::7::Bb4@11': KA74,
  'kings-indian-attack::7::e5@9': KA79,
  'kings-indian-attack::7::Be7@11': KA75,
  'kings-indian-attack::7::c5@5': KA78,
  'kings-indian-attack::7::Be7@9': KA76,
  'kings-indian-attack::7::Ng4@13': KA77,
  'kings-indian-attack::7::Bd6@9': KA80,
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
  'birds-opening::6::c5@13': WBIRDC5,
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
  'albin-countergambit::1::fxe3@10': WALBLASK,
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
  'englund-gambit::0::Bxb4@12': WENGRAID,
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
