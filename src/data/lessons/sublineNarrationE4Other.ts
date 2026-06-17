import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration } from '../../services/sublineLesson';

// GROUP B — 1.e4 (Sicilian / French / Caro-Kann / Pirc / Alekhine / Scandinavian)
// + their counter-weapons. Owned by ONE parallel session.
// HAND-AUTHORED, board-verified subline narration (see the WO). Each entry's
// prose is hand-written, grounded in the real line, and board-verified; shared
// lines map one narration to every course-subline key.
// Key format: `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

const N0: SublineNarration = {
  intro: { say: "f3 with an early c4 — White angles for a Maroczy bind, clamping d5 and e4. You refuse to be squeezed: …e5 grabs the centre, …Be6 pressures the queenside, and the powerful …d5 break blows the position open before the bind can solidify. Striking in the centre is the antidote to every flank clamp — and here it equalises cleanly.", sayShort: "c4 — …d5 break shatters the bind." },
  beats: [
    { atMove: 13, say: "…d5! — the thematic central break that refutes the bind. White's c4 and e4 pawns are challenged head-on; if cxd5 then …Bxb3 and …Nxd5 leaves Black perfectly placed. The lesson is permanent: answer a flank clamp by striking the centre, and the clamp dissolves.", sayShort: "…d5 — break the Maroczy bind.", arrows: [A('d5','c4'), A('d5','e4')], highlights: [H('d5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N1: SublineNarration = {
  intro: { say: "Be2 — White settles for the quiet English-Attack-without-the-storm, developing the bishop modestly instead of castling long. Your wall is built: …e5, …Be7, …Be6 nailing d5. Castle, play …Nbd7 and …b5, and you've got a rock-solid Najdorf where the d5-square is the only battleground — and you control its approaches.", sayShort: "Be2 — castle, …b5, contest d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N2: SublineNarration = {
  intro: { say: "g4 — the English Attack's signature pawn storm, White flinging the g-pawn to pry open your king. You've set up perfectly: …e5 and …Be6 hold the centre, the knight sits on d7 ready to reroute. Meet the storm with queenside play — …b5, …Nb6, …Nc4 — and race him. Whoever's attack lands first wins, and Black's is usually faster.", sayShort: "g4 — race him with …b5 queenside." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N3: SublineNarration = {
  intro: { say: "Bb5+ — the Moscow Variation, White sidestepping the open Sicilian by checking on move three. Block with …Bd7; after the trade your queen recaptures and you've swapped off White's good bishop for nothing. Develop naturally with …Nc6, …g6 or …e6, and you reach a sound, slightly easier-to-play Sicilian with the bishop pair already simplified away from White.", sayShort: "Bb5+ — …Bd7, trade off his bishop." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Moscow_Variation'],
};

const N4: SublineNarration = {
  intro: { say: "Bg5 — the Poisoned Pawn complex, the sharpest forest in the Najdorf. White pins the f6-knight and prepares f4 with a huge initiative. The principled answer is …e6 and the venomous …Qb6, eyeing the b2-pawn and daring White to defend it. Grab the pawn, weather the storm — theory says Black survives and emerges a pawn up.", sayShort: "Bg5 — …Qb6 hits the poisoned b2-pawn." },
  beats: [
    { atMove: 13, say: "…Qb6 — the queen leaps out to hit b2 and the d4-knight at once. This is the Poisoned Pawn proper: White must choose between defending b2 passively or sacrificing it for a raging attack. You take it and hold on; the analysis runs thirty moves deep and Black is fine everywhere.", sayShort: "…Qb6 — double-attack b2 and d4.", arrows: [A('b6','b2')], highlights: [H('b2','rgba(40,185,95,0.92)'), H('d4','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:tac-fork', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N5: SublineNarration = {
  intro: { say: "Nd5 — White plants the knight on the coveted outpost and offers a trade. Don't fear it: …Bxd5 exchanges the strong knight, and after exd5 your light-squared bishop is gone but so is White's best piece, leaving a Boleslavsky-style structure where your dark-square play on the queenside and the half-open c-file give full equality.", sayShort: "Nd5 — trade it; play the dark squares." },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N6: SublineNarration = {
  intro: { say: "Bd3 — a slightly passive square for the bishop, eyeing the kingside while White prepares to castle. Your Najdorf wall stands firm: …e5, …Be7, …Be6 guarding d5. Castle, bring the knight to d7, and break with …b5 — White's modest bishop placement means you're comfortably equal with the easier middlegame plan.", sayShort: "Bd3 — castle and break …b5." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N7: SublineNarration = {
  intro: { say: "Be2 — the classical, restrained Najdorf. White forgoes the pawn storm for quiet development and a slow squeeze on d5. You take your share of the centre with …e5, retreat-proofing the knight to b3, and develop the bishop to e7. The game becomes a strategic battle over the d5-square — and Black's …a6/…b5 expansion gives full counterplay.", sayShort: "Be2 — …e5 and …Be7, fight for d5." },
  beats: [
    { atMove: 11, say: "…e5 — the central clamp again. The pawn hits d4 and grabs the e5/d4 dark squares; White's knight steps to b3. Now …Be7, …O-O and a timely …b5 give you the standard Najdorf queenside expansion while you keep a wary eye on the d5-hole.", sayShort: "…e5 — clamp the dark squares.", arrows: [A('e5','d4')], highlights: [H('e5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N8: SublineNarration = {
  intro: { say: "g4 — the English Attack storm without Qd2 first, White hurrying the kingside pawns. Your wall is set: …e5, …Be7, …Be6 on d5. Castle into the queenside and counter with …b5, …Nbd7-b6-c4, hammering the c3-knight and the light squares. The Najdorf race is on, and Black's queenside attack arrives first.", sayShort: "g4 — castle, …b5, race the queenside." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N9: SublineNarration = {
  intro: { say: "Be3 — the English Attack, White's most ambitious Najdorf try. He wants f3, Qd2 and a kingside pawn storm. Don't sit and wait: hit the centre with …e5, kicking the d4-knight back and clamping the dark squares, then plant the bishop on e6 to nail down d5. You get the Najdorf's ideal pawn break in first.", sayShort: "Be3 — strike …e5, clamp d5." },
  beats: [
    { atMove: 11, say: "…e5 — the move that defines the Najdorf. The pawn punches at the d4-knight and seizes the dark squares e5 and d4 for good. White's knight must retreat to b3 or e2; meanwhile you free the f8-bishop and prepare …Be6 hitting d5, the square the whole battle revolves around.", sayShort: "…e5 — kick d4, own the dark squares.", arrows: [A('e5','d4')], highlights: [H('e5','rgba(255,214,0,0.88)'), H('d5','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N10: SublineNarration = {
  intro: { say: "h3 — the Adams Attack, a quiet waiting move preparing g4 without allowing …Ng4. You answer in kind: …e5 grabs the centre, the knight tucks to e2, and the cheeky …h5 stops g4 cold in its tracks. White's slow plan is neutralised and you get a comfortable Najdorf with the centre in hand.", sayShort: "h3 — …e5 then …h5 stops g4." },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N11: SublineNarration = {
  intro: { say: "f3 — the English Attack move order, bracing e4 before Be3. Take the centre immediately with …e5, kicking the knight to b3, then …Be6 to guard d5. You reach the main Najdorf structure where you'll castle and break with …b5, generating queenside play against White's long-castled king.", sayShort: "f3 — …e5 and …Be6, then …b5." },
  beats: [
    { atMove: 11, say: "…e5 — staking the centre before White can clamp it. The pawn hits d4, the knight goes to b3, and the e5/d4 dark squares are yours. Next comes …Be6 covering d5 and the thematic …b5 expansion — the heartbeat of every Najdorf.", sayShort: "…e5 — seize the centre.", arrows: [A('e5','d4')], highlights: [H('e5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N12: SublineNarration = {
  intro: { say: "Bc4 — the Fischer–Sozin, aiming the bishop straight at f7 and the a2-g8 diagonal. Blunt it the main-line way: …e6 builds a wall on the light squares, and …b5 immediately questions the bishop and gains queenside space. With the diagonal closed and your pawns rolling, the Sozin's bite is drawn and Black takes over the initiative.", sayShort: "Bc4 — …e6 wall, …b5 gains space." },
  beats: [
    { atMove: 13, say: "…b5 — striking at once before White organises a4. The pawn gains queenside space and threatens …b4 to chase the c3-knight off its post. Combined with …e6 shutting the bishop's diagonal, this is how the Najdorf defuses the Sozin and grabs the initiative on the wing.", sayShort: "…b5 — gain space, threaten …b4.", arrows: [A('b5','b4')], highlights: [H('b5','rgba(255,214,0,0.88)'), H('c3','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N13: SublineNarration = {
  intro: { say: "c3 — the Alapin-flavoured Anti-Sicilian, White building a d4-pawn centre on the cheap. Don't let him have it for free: …Nf6 pressures e4, and …g6 with …Bg7 fianchettoes onto the long diagonal, eyeing the centre. You aim for a timely …d5 or …Bg4 to undermine d4, reaching a comfortable game where White's slow setup gives no edge.", sayShort: "c3 — …Nf6, fianchetto, hit the centre." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
};

const N14: SublineNarration = {
  intro: { say: "Qxd4 — White recaptures with the queen instead of the knight, hoping to develop fast with c4 in a Maroczy-style bind. You hit the queen with tempo: …Nc6 forces it to commit, and after Bb5 you calmly block with …Bd7, ready to trade and untangle. Black equalises by chasing the early queen and completing development at no cost.", sayShort: "Qxd4 — …Nc6 hits the queen with tempo." },
  beats: [
    { atMove: 7, say: "…Nc6 — developing with a gain of tempo, the knight jabbing the exposed queen. White must move it again, and every queen move is a move you're not wasting. This is why the early Qxd4 is harmless: Black develops naturally while White shuffles his most valuable piece.", sayShort: "…Nc6 — hit the queen, develop free.", arrows: [A('c6','d4')], highlights: [H('d4','rgba(40,185,95,0.92)')] },
  ],
  sources: ['concept:pos-development', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
};

const N15: SublineNarration = {
  intro: { say: "Bg5 then f4 — the classical main line against the Najdorf, White building a big pawn centre with the bishop pinning f6. You break the pin with …Be7 and develop the bishop on d3 invites …O-O and a later …b5 or …Qc7. Castle, finish development, and prepare the …b5/…Bb7 counter on the long diagonal against White's ambitious but loosening setup.", sayShort: "Bg5 f4 — …Be7, castle, then …b5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N16: SublineNarration = {
  intro: { say: "Qd2 — the main-line Najdorf, White connecting for queenside castling behind the Bg5/f4 build-up. You complete the classical setup with …Be7 and …O-O, then strike with …b5 and …Bb7, contesting the long diagonal and the e4-pawn. It's the great theoretical battleground where Black's queenside counterplay races White's kingside pawns.", sayShort: "Qd2 — castle, then …b5 and …Bb7." },
  sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N17: SublineNarration = {
  intro: { say: "Bg5/f4 then Bc4 — White aims the bishop at f7 inside the classical main line. Calmly complete development: …Be7 breaks the pin, …O-O tucks the king away, then …b5 hits the bishop and rolls the queenside. White's pieces look menacing, but Black's solid wall on e6 and timely …b5 neutralise the attack and turn the long-term chances his way.", sayShort: "Bc4 — …Be7, castle, …b5." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N18: SublineNarration = {
  intro: { say: "e5 — the critical thrust in the Bg5/f4 main line, White trying to blow open the centre while you're behind in development. Meet it precisely: …dxe5 fxe5 leaves the e5-pawn loose, or …Nfd7 sidesteps, and after the dust settles Black's extra centre pawn and White's loosened structure favour the defender. Don't panic — the e5-break is double-edged for White too.", sayShort: "e5 — …dxe5 and exploit the loose pawn." },
  sources: ['concept:pos-center', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N19: SublineNarration = {
  intro: { say: "Bg5/f4 then Be2 — White develops modestly in the classical main line, declining the sharpest tries. You finish the standard setup: …Be7 unpins, …O-O, …Qc7 and …Nbd7, then …b5 and …Bb7 to fight for the long diagonal and e4. With White restrained, Black gets the classic Najdorf counterplay at no risk.", sayShort: "Be2 — …Be7, castle, …b5 and …Bb7." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N20: SublineNarration = {
  intro: { say: "Bg5 — White pins after the f3 setup, pressuring the f6-knight that guards d5. Your structure already answers it: …e5 and …Be6 own the centre and the key light square. Meet the pin with …Be7 and …Nbd7, and if White trades on f6 you recapture toward the centre, keeping the d5-square firmly under control.", sayShort: "Bg5 — …Be7, hold d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N21: SublineNarration = {
  intro: { say: "This is the English Attack handled positionally — instead of charging with g4, White tucks the bishop to e2 and castles short. The …e5 thrust has already claimed the centre and chased the knight to b3, so the d5-square is the whole battle: White eyes it, Black covers it with the e6-bishop and the f6-knight. Black's plan is the standard Najdorf queenside expansion, …Nbd7, …b5 and …Nb6, fighting for d5 and gaining space toward the white king's eventual home.", sayShort: "English Attack — fight for d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'concept:pos-weak-squares', 'concept:pos-space'],
};

const N22: SublineNarration = {
  intro: { say: "g4 — the same English Attack storm by a different move order, f3 before Be3. Your structure is the model Najdorf wall: …e5, …Be6, …Be7, knight to d7. Answer the kingside thrust the Najdorf way — expand with …b5 and …Nc4, hammering c3 and the light squares while White commits his pawns forward. It's a race, and you're built to win it.", sayShort: "g4 — counter with …b5 and …Nc4." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N23: SublineNarration = {
  intro: { say: "f3 then Nde2 — White retreats the knight toward g3 to bear down on the d5- and f5-squares. You meet it with the standard wall: …e5 staked the centre, now …Be6 guards d5 head-on. Continue …Nbd7, …b5 and …Nb6, fighting White for that one outpost — the entire strategic point of this whole Najdorf structure.", sayShort: "f3 — …Be6 guards d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N24: SublineNarration = {
  intro: { say: "Nf5 — a tricky leap to the rim, the knight eyeing g7 and e7, but it can be rounded up. The cool …a5 prepares …a4 and …Ra6 to hunt the offside knight, or simply gains queenside space while you develop. White's adventurous knight has no stable support, and Black emerges with the bishop pair or a clear structural plus.", sayShort: "Nf5 — …a5, then round up the knight." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N25: SublineNarration = {
  intro: { say: "h3 — White ends the …Ng4 skirmish, having coaxed your kingside pawns forward with the Bg5-h4-g3 dance. Those …h6 and …g5 thrusts aren't weaknesses here — they're space. Fianchetto the bishop on g7 raking the long diagonal, and you've got a hyper-aggressive Najdorf where your kingside pawns roll while White is still untangling.", sayShort: "h3 — fianchetto g7, roll the pawns." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N26: SublineNarration = {
  intro: { say: "f3 — White braces e4 and prepares to castle long after the bishop's retreat to g3. You've already gained the kingside space with …g5 and …h6; the g7-bishop completes the picture, glaring down the long diagonal at the heart of White's position. This is the sharp, modern Najdorf where Black plays for the attack, not equality.", sayShort: "f3 — fianchetto g7, attack." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N27: SublineNarration = {
  intro: { say: "This is the Soltis main line of the Yugoslav Attack, and Bh6 aims to trade off Black's crucial Dragon bishop on g7 — the defender of the dark squares around the king and the soul of the counterattack. Black answers …Bxh6 and after Qxh6 keeps fighting, knowing the h5-pawn has frozen White's h-pawn so the kingside cannot be ripped open by h5xg6. The plan is …Rxc3 exchange sacrifice and …Qa5, …b5 to crash through on the c1-king before White's pieces converge on h-file and the g7-square.", sayShort: "Bh6 swaps the Dragon bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-exchange-sac', 'concept:pos-king-safety'],
};

const N28: SublineNarration = {
  intro: { say: "In this Soltis structure Black has locked the kingside with …h5, so White plays g4 to pry it open with gxh5 and a file for the rooks and queen against the black king. Black answers …hxg4 or …Nxg4, keeping the king's cover from being shredded and trading down White's attackers. The plan stays a race: …Rxc3 and …Qa5 with …b5 to break the c1-king's shelter, leaning on the g7-bishop and the c-file faster than White's h- and g-file assault.", sayShort: "g4 pries open the locked kingside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-exchange-sac'],
};

const N29: SublineNarration = {
  intro: { say: "In this Soltis position Bg5 pins the f6-knight, a defender of the h5-pawn and the e4/d5 squares, trying to soften Black's kingside and prepare Nd5 or f4 ideas. Black has …h5 in place to keep the kingside shut. The plan is to continue the queenside assault with …Rc4 or …Rxc3, …Qa5 and …b5, exploiting that White has spent a tempo on the pin while the …Rxc3 exchange sacrifice still smashes the c1-king's pawn cover faster than White's attack arrives.", sayShort: "Bg5 pin — race on the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:tac-pin', 'concept:att-exchange-sac'],
};

const N30: SublineNarration = {
  intro: { say: "The Yugoslav Attack tabiya — White has castled queenside, primed for h4-h5 to pry open Black's kingside while Black is already short-castled behind the g7-bishop. With both kings committed to opposite wings, it becomes a pure race of pawn storms. Black's plan is the thematic …Rc8, …Ne5 and …Nc4 or the …Rxc3 exchange sacrifice to smash White's queenside cover, plus …a6 and …b5 to open lines against the white king on c1 before the h-file opens against Black's.", sayShort: "Yugoslav Attack — opposite-side race" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-exchange-sac'],
};

const N31: SublineNarration = {
  intro: { say: "Black has executed the thematic …Nc4 and after Bxc4 …Rxc4 the rook sits actively on c4, bearing down the half-open c-file and eyeing e4; Nde2 retreats to overprotect c3 and reroute toward the kingside. Black has already swapped off White's light-squared bishop, easing the attack on the king. The plan is …b5-b4 and …Qa5 to crash the c-file against the b1-king, …Be6 to trade White's remaining bishop, and the ever-present …Rxc3 break to demolish the queenside pawn shelter.", sayShort: "…Rxc4 active — drive …b5-b4 in" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-open-file', 'concept:att-queenside-attack'],
};

const N32: SublineNarration = {
  intro: { say: "Kb1 is the prophylactic king-tuck of the Yugoslav Soltis line, stepping off the c-file and the a7-g1 diagonal to blunt Black's …Rxc3 and …Qa5 ideas before pressing the kingside attack. Black has the kingside locked with …h5 and the knight on e5. The plan is still …Nc4 hitting the queen and bishop, …Rxc3 exchange sacrifice and …b5-b4 to tear open the queenside, racing the king on b1 even with the extra defensive tempo White has spent.", sayShort: "Kb1 prophylaxis — push …Nc4, …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-prophylaxis', 'concept:att-queenside-attack'],
};

const N33: SublineNarration = {
  intro: { say: "This is the Classical Dragon: White develops modestly with Be2 rather than the sharp Yugoslav f3 and Be3, aiming to castle short and play a quieter positional game. With both kings likely to go kingside, the venom of opposite-side storms is gone. Black's plan is …O-O, …Nc6, …Bd7 and …Rc8 with …Ne5 or …a6 and …b5, using the long-diagonal bishop and c-file pressure to fight for the centre and the d4-square in a calmer, maneuvering struggle.", sayShort: "Classical Dragon — quieter, both castle short" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N34: SublineNarration = {
  intro: { say: "White launches the h-pawn before castling long, the most direct Yugoslav try — h4-h5 aims to rip open the h-file and the g6-square in front of Black's king. Black must counterstrike on the queenside without delay. The plan is …Rc8, …Ne5 hitting the c4-bishop, …h5 to jam White's h-pawn, and the …Rxc3 exchange sacrifice with …Qa5 and …b5 to break through on the queenside before the h-file opens against the g7-bishop's king.", sayShort: "h4 storm — counter on the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-queenside-attack'],
};

const N35: SublineNarration = {
  intro: { say: "White launches g4 before castling, an aggressive Yugoslav move-order intending h4-h5 and g5 to blow open Black's kingside fast. Black must generate counterplay immediately on the other wing. The plan is …Rc8, …Ne5 and …Nc4 to harass White's pieces, …a6 and …b5 to pry open the queenside, and the standard …Rxc3 exchange sacrifice — striking at White's king before the g- and h-pawns crash through against the fianchettoed king.", sayShort: "Early g4 storm — counter fast queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-exchange-sac'],
};

const N36: SublineNarration = {
  intro: { say: "White meets the Dragon with the restrained g3, fianchettoing in mirror image to contest the long light diagonal and blunt Black's g7-bishop with a bishop on g2. This is a quiet positional line, not a storm. Black develops naturally with …Nc6 hitting d4, then …Bg7, …O-O and …Bd7 with …Rc8 or …a6 and …Nxd4, fighting for the centre and the c-file; with no opposite-side attack, Black aims for comfortable equality and the standard …b5 or …d5 freeing breaks.", sayShort: "g3 fianchetto — quiet positional Dragon" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N37: SublineNarration = {
  intro: { say: "This is the heart of the Dragon: the fianchettoed bishop on g7 rakes the long diagonal toward d4 and b2, the engine of all Black's counterplay. Be3 signals the dreaded Yugoslav Attack — White intends f3, Qd2, O-O-O and a pawn storm with h4-h5 and g4. Black's plan is to castle, play …Nc6, …Bd7 and …Rc8, then race down the c-file with the …Rxc3 exchange sacrifice and queenside pressure before White's kingside avalanche lands.", sayShort: "Dragon bishop eyes the long diagonal" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:att-queenside-attack'],
};

const N38: SublineNarration = {
  intro: { say: "This is a Classical Dragon where White has castled short and played Nb3 and f3, a solid setup with no opposite-side storm; the f3-pawn guards e4 and the g4-square. Black has developed harmoniously with …Be6 controlling key light squares and …Nc6 pressuring d4. The plan is …Rc8 and …a6-a5 to gain queenside space and harass the b3-knight, …Na5 or …Ne5 for an outpost, and patient maneuvering where the g7-bishop and c-file pressure offer comfortable equality.", sayShort: "Classical f3 — …Rc8 and …a5 space" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N39: SublineNarration = {
  intro: { say: "A Classical Dragon setup where White completes development with Qd2, connecting rooks and eyeing the option of Bh6 to trade Black's powerful g7-bishop. Both kings sit safely on the kingside, so this is a positional middlegame, not a storm race. Black's plan is to meet Bh6 with …Bxh6 only when favourable, play …Rc8 and …a6-a5 to expand and pressure the b3-knight, and look to …Na5 or …Nd7-e5 outposts and the c-file for active piece play.", sayShort: "Classical Qd2 — guard the g7 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N40: SublineNarration = {
  intro: { say: "White develops the bishop to c4, eyeing f7 and the a2-g8 diagonal, often a prelude to the Yugoslav or a quick attacking setup against the Dragon. Black completes the fianchetto with …Bg7, putting the bishop on its dominant diagonal. The plan is …O-O, …Nc6 or …a6 and …b5 to challenge the c4-bishop with tempo, …Bd7 and …Rc8 for the c-file, generating the usual Dragon counterplay against White's king once both sides commit.", sayShort: "Bc4 setup — …b5 will hit the bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N41: SublineNarration = {
  intro: { say: "This is the Levenfish Attack with an early f4: White grabs space and trades on c6, giving Black doubled c-pawns but a half-open b-file and a strong centre. After …bxc6 Black's structure is compact, and Bd3 develops eyeing the kingside. The plan is …Bg7 to finish the fianchetto, …O-O, and …d5 or …Rb8 — using the open b-file, the bishop pair on the long diagonals, and the central …d5 break to exploit White's loosened f4-advance and overextended kingside.", sayShort: "Levenfish — …bxc6 and …d5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-open-file'],
};

const N42: SublineNarration = {
  intro: { say: "This Levenfish line with f4 and the trade on c6 leaves Black with doubled c-pawns but the half-open b-file and the bishop pair; Bc4 develops aggressively toward f7. Black is solid and ready to fight for the centre. The plan is …Bg7 to finish the fianchetto, …O-O, and …d5 striking the centre and opening lines for the bishops, or …Rb8 to exploit the b-file — using the dark-square control and central break to punish White's loosening f4-push.", sayShort: "Levenfish Bc4 — …d5 hits the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-center'],
};

const N43: SublineNarration = {
  intro: { say: "This Levenfish line with f4 trades on c6 and develops Be3, leaving Black with doubled c-pawns but the open b-file and the bishop pair. Black's structure is compact and ready for central action. The plan is …Bg7 to complete the fianchetto, …O-O, and the …d5 break to hit White's centre and free the bishops, or …Rb8 and …Qa5 to exploit the half-open b-file — turning the structural concession into dynamic dark-square play against White's overextended f4-pawn.", sayShort: "Levenfish Be3 — …d5 and b-file play" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-open-file'],
};

const N44: SublineNarration = {
  intro: { say: "This is the Smith-Morra Gambit declined into an open game: White sacrifices the c3-pawn for development, recaptures with the knight and aims the c4-bishop and open c- and d-files at Black's king. Black has taken the extra pawn and shores up with …e6 and …a6, blunting the bishop and preparing …b5 and …d6. The plan is careful development — …d6, …Be7, …Nf6, …O-O — neutralising White's lead and converting the extra material once the king is safe.", sayShort: "Morra Gambit — develop, hold the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-open-file'],
};

const N45: SublineNarration = {
  intro: { say: "This is the Maroczy Bind: White's c4 and e4 pawns clamp down on the d5- and b5-squares, denying Black the freeing breaks and the open c-file rush of the Yugoslav. Rc1 overprotects c4 and prepares pressure down the half-open file. Black's plan is the long maneuvering battle — …a6 and …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to challenge e4, and the patient …a5-a4 or the freeing …b5 break to escape the bind without losing the dark-square strength of the g7-bishop.", sayShort: "Maroczy Bind — break the clamp" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N46: SublineNarration = {
  intro: { say: "Another Maroczy Bind setup, where f3 reinforces the e4-pawn and the c4-e4 clamp, settling in for a positional squeeze rather than a Yugoslav storm. Black is cramped but solid, with the g7-bishop controlling the dark squares. The plan is …Nxd4 and …Bc6 to pressure e4, …a6 and …Rc8 for the c-file, and the long-prepared …b5 break — supported by …Qa5 and …Rfc8 — to crack the bind and free the position before White expands further on the queenside.", sayShort: "f3 Maroczy — patient …b5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N47: SublineNarration = {
  intro: { say: "A Maroczy Bind where White plays f3 to buttress e4 before completing development, settling into the positional clamp that denies Black the …d5 and …b5 breaks. Black's g7-bishop holds the dark squares while the position is cramped but resilient. The plan is …d6, …Bd7 and …a6 with …Rc8, fighting for the c-file, then …Nxd4 and …Bc6 to challenge e4, and the patient buildup to the freeing …b5 break that escapes the bind without conceding the dark-square grip.", sayShort: "Maroczy f3 — fight for the c-file" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N48: SublineNarration = {
  intro: { say: "A Maroczy Bind where White reinforces e4 with f3 and the c4-e4 pawns squeeze Black's position, denying the freeing breaks. The g7-bishop remains Black's pride, holding the long diagonal. The plan is the classic anti-Maroczy treatment: …Bd7 and …a6 with …Rc8 for the c-file, …Nxd4 and …Bc6 to challenge the e4-pawn, and the carefully prepared …b5 break — backed by …Qa5 and …Rfc8 — to crack the bind and liberate the pieces before White expands further.", sayShort: "Maroczy f3 — prepare the …b5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N49: SublineNarration = {
  intro: { say: "A Maroczy Bind where White bolsters e4 with f3 early, locking in the c4-e4 space clamp before finishing development. Black's g7-bishop anchors the dark squares and the position is cramped but sound. The plan is …O-O, …d6 and …Bd7 with …a6 and …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to pressure e4, and the methodical preparation of …b5 — the thematic break that liberates Black from the Maroczy clamp without surrendering the long-diagonal bishop's strength.", sayShort: "Maroczy f3 — clamp then break …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N50: SublineNarration = {
  intro: { say: "A Maroczy Bind where White develops the queen to d2, connecting rooks and preparing Bh6 to challenge Black's strong g7-bishop while the c4-e4 clamp holds. Black is cramped but solid behind the fianchetto. The plan is …Bd7 and …a6 with …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to pressure e4, and to meet Bh6 by keeping the dark-squared bishop where it matters — building patiently toward the …b5 break that escapes the bind.", sayShort: "Maroczy Qd2 — hold the g7 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-development'],
};

const N51: SublineNarration = {
  intro: { say: "White sidesteps the Open Sicilian with the Rossolimo, pinning nothing yet but threatening Bxc6 to damage Black's structure. Black fianchettoes with …g6, preparing …Bg7 to bear down the long diagonal on e5 and the centre. After short castling Black continues …Bg7 and …e5 or …Nf6, content that the bishop pair White might win is offset by Black's solid dark-square grip and ready central counterplay.", sayShort: "Rossolimo — fianchetto and hold the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N52: SublineNarration = {
  intro: { say: "In this Maroczy Bind White grabs more space with f4, intending e5 or f5 to expand on the kingside while the c4-pawn keeps the bind on d5 and b5. Black must counter before White rolls forward. The plan is …Nxd4 and …Bc6 to trade pieces and hit the e4-pawn, …Rc8 and …a6 to contest the c-file, and the …b5 break to free the queenside — leaning on the g7-bishop to keep the dark squares secure against White's pawn advance.", sayShort: "Maroczy f4 — trade and break …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-center'],
};

const N53: SublineNarration = {
  intro: { say: "In this Maroczy Bind White plays the quiet h3, ruling out …Ng4 and …Bg4 pins and settling in for the long positional squeeze behind the c4-e4 clamp. Black is solid with the g7-bishop and harmonious development. The plan is …Rc8 and …a6 to contest the c-file, …Nxd4 and …Bc6 to challenge the e4-pawn, …a5-a4 to gain queenside space and pin down White's b-pawn, and the eventual …b5 break to free the position from the bind.", sayShort: "Maroczy h3 — patient …a5 and …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N54: SublineNarration = {
  intro: { say: "This Dragadorf hybrid sees White skip queenside castling and storm immediately with g4-g5 to dislodge the f6-knight and open lines at Black's king. Black has played …a6 to prepare the queenside expansion that defines this system. The plan is …b5 and …b4 to chase the c3-knight and rip open the b- and c-files, …Bb7 raking e4 on the long diagonal, and …Nbd7-b6, racing the attack on White's still-uncastled king before g5 does damage.", sayShort: "Dragadorf — meet g4 with …b5-b4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-kingside-storm'],
};

const N55: SublineNarration = {
  intro: { say: "This is the Dragadorf, a Najdorf-Dragon hybrid where Black has already played …a6 and …b5 to open the queenside before White's g4 launches the kingside storm. Both sides are pushing pawns at the enemy king in a sharp opposite-castling race. Black's plan is …b4 to chase the c3-knight and tear open the b- and c-files, …Bb7 raking the long diagonal at e4, and …Nbd7-b6 with rooks to the queenside, betting that the attack on the c1-king arrives first.", sayShort: "Dragadorf — …b5-b4 races g4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-kingside-storm'],
};

const N56: SublineNarration = {
  intro: { say: "This is the Dragadorf where White sets up the Yugoslav with Bc4 aimed at f7 and the a2-g8 diagonal, while Black's …a6 readies the queenside pawn storm. With opposite-side castling looming, it is a sharp race. Black's plan is …b5 to hit the c4-bishop and gain tempo, …Bb7 raking e4 on the long diagonal, …Nbd7-b6 and …b4 to break open the b- and c-files against White's king, racing the assault before White's kingside pawns advance.", sayShort: "Dragadorf — …b5 hits the c4 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:pos-tempo'],
};

const N57: SublineNarration = {
  intro: { say: "In this Dragadorf White rushes Bh6 to swap off Black's fianchettoed g7-bishop, the dark-square guardian and the spearhead of the counterattack, before the …a6/…b5 plan rolls. Black answers …Bxh6 and after Qxh6 must replace that defender with active counterplay. The plan is the immediate …b5 and …Bb7 on the long diagonal, …Nbd7-b6 and …b4 to chase the c3-knight and crash through on the queenside, racing White's pressure on the now-weakened dark squares near the king.", sayShort: "Bh6 swaps the Dragon bishop early" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-weak-squares', 'concept:att-queenside-attack'],
};

const N58: SublineNarration = {
  intro: { say: "White tries an offbeat order with Bg5 and the Bb5+ check, hoping to disrupt Black's development before the Dragon bishop on g7 gets to work. Black interposes calmly with …Bd7 or …Nbd7, neutralising the check and preparing to castle. The plan is unchanged: complete development, contest the centre, and let the g7-bishop and the …Rc8 c-file pressure generate counterplay, since the early Bb5+ commits White's bishop without solving Black's solid setup.", sayShort: "Bb5+ check — interpose and develop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N59: SublineNarration = {
  intro: { say: "White trades on c6 a move early and develops modestly with Bd3, declining any fight for d5. …bxc6 opens the b-file and …e5 stakes out the centre, gaining the c5/d-file mass typical of these structures. After a3 the …c5 advance grabs space and the dark squares; Black continues …d6, …Be7 and …O-O, leaning on the bishop pair and a mobile central majority to outgun White's passive setup.", sayShort: "…e5 and …c5 seize the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-space'],
};

const N60: SublineNarration = {
  intro: { say: "Here White retreats by capturing on c6 rather than allowing the full Sveshnikov, giving Black the bishop pair and a strong e5-pawn. …bxc6 opens the b-file, and the immediate …Bb4 pins the c3-knight, hitting the e4-pawn and pressuring the d5-square. Black's plan is to follow with …d5 or …O-O, using the pin and the central pawn mass to seize the initiative on the light squares around White's centre.", sayShort: "…Bb4 pins the c3 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N61: SublineNarration = {
  intro: { say: "Rather than the sharp Ndb5, White simply retreats the attacked knight to b3, declining the Sveshnikov tabiya for a quieter game. Black has the e5-pawn cramping White and a free hand to develop without conceding the d5-hole as starkly. The plan is …Be7, …O-O, and …Be6 or …a5-a4 to harass the b3-knight, with …d5 a recurring break to liberate the position and claim equal central play.", sayShort: "Quiet Nb3 retreat — develop freely" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N62: SublineNarration = {
  intro: { say: "Instead of the critical Ndb5, White meekly retreats to f3, where the knight hits the e5-pawn but allows Black easy development. Black has gained central space with …e5 and avoided conceding the sharp d5-hole on White's terms. The plan is …Bb4 pinning the c3-knight and …d5, or …Be7 and …O-O, with the e5-pawn and free piece play promising at least equality.", sayShort: "Passive Nf3 — Black develops freely" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N63: SublineNarration = {
  intro: { say: "White answers …e5 with the aggressive leap to f5, where the knight sits near the king but can be challenged immediately. Black plays …d5, striking the centre and threatening to engulf the f5-knight after …d4 or …Bxf5. The point is that the f5-knight has no stable support, so Black opens the position with …d5, exploits the loose knight, and emerges with the central pawn duo and the bishop pair.", sayShort: "…d5 punishes the f5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:tac-trap'],
};

const N64: SublineNarration = {
  intro: { say: "White plays the early f3, Black grabs the centre with …e5, and after the knight hops to b5 and is met by …d6 and a3, Black strikes with the freeing …d5 break. This central thrust opens the position before White can consolidate the b5-knight, hitting e4 and freeing Black's pieces. The plan is to follow …d5 with …Be7 or …Be6 and rapid development, using the central pawn break to seize the initiative against White's awkward setup.", sayShort: "…d5 break frees Black's centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-initiative'],
};

const N65: SublineNarration = {
  intro: { say: "This is the Sveshnikov positional main line: Black kept the dark-squared bishop with …Bxf6 and rerouted it to g5, while White reroutes the offside a3-knight via c2 to e3 to reinforce d5. a4 strikes at Black's queenside chain, trying to crack open the b5-pawn and the a6-square before Black completes …Be6 and …Rb8. Black holds the queenside with …bxa4 or …b4, then continues challenging d5 and pushing …f5 to free the position.", sayShort: "a4 hits the queenside chain" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pawn-chain', 'concept:pos-outpost'],
};

const N66: SublineNarration = {
  intro: { say: "This is the modern positional treatment of the Sveshnikov: White supports d5 with c3, develops the bishop quietly to e2 and aims to reroute the a3-knight to c2 and e3. Black has the bishop pair and the dark-squared bishop on f6 eyeing the long diagonal. The plan is …Bg5 to trade off White's good bishop or relocate, …Be6 hitting d5, …Rb8 and the freeing …f5 break to challenge White's central knight and open lines.", sayShort: "Positional Be2 — reroute toward d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-bishop-pair'],
};

const N67: SublineNarration = {
  intro: { say: "This is the Sveshnikov main tabiya: …e5 seized the centre, …a6 booted the b5-knight to the dismal a3-square, and …b5 clamped it out of play. Nd5 plants the knight on the hole Black conceded, the strong d5-outpost, and threatens Nxf6 to wreck the kingside. Black answers …Be7, recaptures on f6 with the bishop after Bxf6, and fights back with …Ne7 and …Bxd5 or …Nxd5 in due course, leaning on the bishop pair and the e5/f5 break to justify the d5-hole.", sayShort: "Knight to d5 — outpost in the hole" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-bishop-pair'],
};

const N68: SublineNarration = {
  intro: { say: "White delays d4 and Black answers with the …e5 thrust, a Sveshnikov-flavoured setup that grabs central space and discourages the natural d4 break. Bc4 eyes the f7-pawn and the a2-g8 diagonal, and Black calmly develops …Be7 to prepare castling. The plan is …Nf6, …O-O and …d6, holding the e5-point and contesting the d5-square, content that White's bishop on c4 will find few targets behind Black's solid pawn front.", sayShort: "…e5 setup — solid central space" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-space'],
};

const N69: SublineNarration = {
  intro: { say: "White trades on f6 before Black can untangle, the main line of the Sveshnikov. Recapturing with …gxf6 shatters Black's kingside but opens the g-file and hands Black the bishop pair plus a granite e5/f6 pawn mass controlling key central squares. Black's plan is …Bg7 or …f5, hitting the e4-pawn and the d5-knight, generating play on the dark squares and down the g-file against the white king.", sayShort: "Bxf6 — …gxf6 for the bishop pair" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pawn-doubled'],
};

const N70: SublineNarration = {
  intro: { say: "The defining Sveshnikov moment: …e5 hits the d4-knight, and rather than retreat passively White leaps to b5, eyeing the d6-square and the threat of Nd6+. Black has voluntarily weakened the d5-square and the d6-pawn for a lead in development and central pawns. The plan is …d6 to deny the knight d6, then …a6 to chase it offside to a3, …b5 to box it in, and active piece play on the half-open c-file and the kingside.", sayShort: "Knight jumps to b5 — defining move" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-weak-squares'],
};

const N71: SublineNarration = {
  intro: { say: "White retreats to f3 rather than b5, and Black seizes the moment with …Bb4 pinning the c3-knight and the freeing …d5 break, equalising in the centre at once. With the pin tying down c3, …d5 strikes e4 and frees Black's game; after White castles, Black has a comfortable position with the …d5-pawn and active pieces. The plan is …O-O, …Bxc3 if needed to win the e4-pawn, and play against White's centre.", sayShort: "…Bb4 and …d5 — instant freedom" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-center'],
};

const N72: SublineNarration = {
  intro: { say: "White declines the Sveshnikov tension and trades on c6, conceding Black a broad pawn centre with the c5/d-file and e5 pawns. Recapturing …bxc6 opens the b-file for the rook and prepares …c5 and …d5 to roll the centre forward. After Bc4 and a3 keeping the bishop on the a2-g8 diagonal, …c5 gains space and clamps the dark squares; Black's plan is …d6, …Be7, …O-O and a central pawn advance backed by the bishop pair.", sayShort: "Nxc6 — Black builds a pawn centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-open-file'],
};

const N73: SublineNarration = {
  intro: { say: "By the Kalashnikov order Black has played …e5 and met the Nb3 retreat with …Nf6, developing toward d5 and e4. Bg5 pins the f6-knight, pressuring the d5-square and threatening to swap off a key defender. Black continues …Be7 and meets Bxf6 with …Bxf6, retaining the dark-squared bishop, then plays …O-O and …Be6 to contest d5, with …d5 or …a5 as the standard freeing ideas.", sayShort: "Bg5 pins — keep the dark bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N74: SublineNarration = {
  intro: { say: "Via the Kalashnikov move-order White meets …e5 by retreating the knight to f3, attacking e5 rather than jumping to b5. Black supports the centre and develops with …Nf6, eyeing e4 and d5. After Nc3 Black continues …Bb4 or …Be7 and …d5 in many lines, using the e5-pawn's space and quick development to fight for the centre without the d5-hole that the …Ndb5 main lines concede.", sayShort: "Nf3 retreat — support e5, play …d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-development'],
};

const N75: SublineNarration = {
  intro: { say: "By the Kalashnikov order White lunged Nf5, Black hit back with …d5, and after the queen trade on d5 the position has simplified with the f5-knight still loose and far from home. Black has the bishop pair and easy development, while the f5-knight must justify itself or retreat. The plan is …Nf6, …Bxf5 or …g6 to harass the knight, and quick development to exploit the half-open queenside files and the two bishops in an open position.", sayShort: "Queens off — harass the f5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N76: SublineNarration = {
  intro: { say: "Reaching the Sveshnikov by the Kalashnikov move-order, Black has grabbed the centre with …e5 and kicked the knights to the rim — the a3-knight is offside and the d5-knight is the only active white piece. Bg5 pins the f6-knight to pressure the d5-square Black must contest. Black plays …Be7 and meets Bxf6 with …Bxf6, keeping the dark-squared bishop and aiming the standard …Ne7 to challenge the d5-knight, accepting the backward d6-pawn for piece activity and the bishop pair.", sayShort: "Sveshnikov — contest the d5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N77: SublineNarration = {
  intro: { say: "In this Kalashnikov-to-Sveshnikov structure White develops the bishop to e3 rather than pinning on g5, eyeing a future c4 to undermine Black's queenside and bolstering control of d5. Black has the standard bishop pair prospects and a big centre with …e5 and …b5. The plan is …Be7, …O-O, …Be6 challenging the d5-knight, and …Rb8 with …f5 to break White's grip and open the position for the bishops.", sayShort: "Be3 — bolster d5, prepare c4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-weak-squares'],
};

const N78: SublineNarration = {
  intro: { say: "White develops the bishop to d3 in this Kalashnikov-Sveshnikov, defending e4 and preparing to castle while the d5-knight anchors the position. Black has the familiar trumps: the bishop pair after a future …Nxd5, the e5/d6 centre and queenside space from …b5. The plan is …Be7, …O-O, …Bb7 or …Be6 to pressure d5, and the …f5 break to challenge White's centre and activate the dark-squared bishop along the long diagonal.", sayShort: "Bd3 develops — Black eyes …f5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N79: SublineNarration = {
  intro: { say: "White props up e4 with f3, an English-Attack-style move in this Kalashnikov-Sveshnikov that prepares Be3, Qd2 and a possible kingside pawn storm. Black has the bishop pair and the e5/d6 centre with queenside space from …b5. The plan is …Be7, …O-O, …Be6 to contest the d5-knight and …Rb8, then the thematic …f5 to break in the centre before White's slow buildup against the king gathers steam.", sayShort: "f3 props e4 — race with …f5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:att-kingside-storm'],
};

const N80: SublineNarration = {
  intro: { say: "White declines the centre and sets up a King's-Indian-Attack-style formation with d3 and f4, but the slow plan lets Black seize the initiative on the queenside. …c4 clamps and …a6-a5-a4 storms the b-file against White's pawn chain, prying it open before White's kingside play gets going. With the centre closed, Black's wing attack arrives first.", sayShort: "…c4 and …a5-a4 storm the queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N81: SublineNarration = {
  intro: { say: "The immediate d4 lets Black snap the e4-pawn with ...Nxe4, since c3 has blocked the natural Nc3 defender. White regains the pawn with dxc5 but the c5-pawn is loose and Black undermines it with ...b6. The first player has spent moves chasing the e4-knight while Black's structure stays sound and the queenside pawns become targets.", sayShort: "…Nxe4 grabs the pawn, …b6 hits c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N82: SublineNarration = {
  intro: { say: "White resolves the central tension by capturing exd6, dissolving the e5-spearhead and leaving the isolated d4-pawn behind. Black will recapture on d6 with comfortable development and a clear target; …a6 simply takes the b5-square away from White's pieces first. With the e5-wedge gone, the lone d4-pawn becomes the fixed weakness Black plays against.", sayShort: "Recapture d6, the d4 isolani remains" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N83: SublineNarration = {
  intro: { say: "White brings the knight to c3, offering to trade off Black's well-placed d5-knight in the isolated queen pawn structure. Black is fine to allow it: …Nxc3 doubles White's pawns, or …d6 keeps striking at the e5-pawn while the c6-knight presses d4. Either way the structure with the lone d4-pawn is the chronic weakness Black plays against.", sayShort: "Allow the trade, the d4 pawn stays weak" },
  sources: ['concept:pawn-isolated', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N84: SublineNarration = {
  intro: { say: "White develops the bishop to d3 and knight to f3 in a quiet, non-committal setup that does little to contest the centre. Black completes development with …Nc6 and stands ready to challenge the centre with …d5 or …e5, since White has not staked a claim there. With easy, harmonious development Black equalises and can play for the initiative.", sayShort: "Develop freely, prepare …d5 or …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N85: SublineNarration = {
  intro: { say: "White's clumsy f3 props up a future e4-centre but blocks the king's knight and weakens the light squares around the king. Black seizes the queenside with …c4 and the …a6-a5-a4 storm, levering open the b-file against White's pawn chain. With White's development snarled, Black's wing attack rolls in unopposed.", sayShort: "…c4 and …a4 storm against snarled White" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N86: SublineNarration = {
  intro: { say: "White's early Qc2 is passive, doing little to fight for the centre or develop a minor piece. Black develops naturally with …Nc6 and then clamps and storms the queenside with …c4, …a6-a5-a4, prying open the b-file against White's chain. The …c4 wedge freezes White's queenside while Black's attack gathers pace.", sayShort: "…c4 wedge, …a4 storm the queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N87: SublineNarration = {
  intro: { say: "Instead of dropping back to b3, the light-squared bishop pins to b5, leaning on the c6-knight that supports the …d6 break against e5. Black is unbothered: …Bd7 or …dxe5 untangles, and the b6-knight already pressures c4 and d5. With White's centre reduced to a single isolated d4-pawn, exchanging into a structure where that pawn is a target suits Black perfectly.", sayShort: "Break with …d6, exploit the isolani" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N88: SublineNarration = {
  intro: { say: "The bishop pins to b5 against the c6-knight that supports …d6, the lever against White's e5-pawn. Black breaks the pin with …Bd7 or simply plays …dxe5, dissolving White's centre into the familiar isolated d4-pawn. With the b6 or d5 outpost beckoning the knights, Black has nothing to fear and a clear structural target.", sayShort: "Break the pin, dissolve into the isolani" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N89: SublineNarration = {
  intro: { say: "White lashes out with the Bxf7+ sacrifice, but in this position it is unsound speculation against a developed black setup. After …Kxf7 the king is safe enough, and Black is simply a piece up for one pawn with the b6- and c6-knights covering the centre and the isolated d4-pawn already a weakness. There is no follow-up storm here; Black takes, consolidates with …e6 and …Kg8 after …Be7, and keeps the extra piece.", sayShort: "…Kxf7 grabs the piece; the sac is unsound" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N90: SublineNarration = {
  intro: { say: "White declines to take on d5 and pushes e5, accepting a closed French-style centre with d4-e5 against d5. Black clamps the queenside with …c4 and storms with …a6-a5-a4, prying open the b-file against White's pawn chain while the c4-pawn freezes the white queenside. With the centre locked, the wing race favours the side that struck first, and Black is the aggressor here.", sayShort: "Clamp …c4, storm …a5-a4 on the wing" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N91: SublineNarration = {
  intro: { say: "A sharp move order where the centre liquidates and Black recaptures …Qxd5 with tempo, then strikes …e5 against the d4-pawn. After Nc3 the bishop pins to b4, hitting the c3-knight that defends d4 and threatening to crack the support of the isolated pawn. The combination of …e5 and the …Bb4 pin turns White's centre into a target straight out of the opening.", sayShort: "…e5 and …Bb4 pin pressure the d4 pawn" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N92: SublineNarration = {
  intro: { say: "Recapturing with …Qxd5 gives Black a free, tempo-rich development; here White's only way to defend the d4-pawn and support c4 is the awkward Na3, parking the knight on the rim. Black answers …Nc6, piling a third attacker on d4 and ignoring the offside knight. Smooth piece play against a clumsy white setup is the whole point of the queen recapture.", sayShort: "…Nc6 hits d4; Na3 sits offside" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N93: SublineNarration = {
  intro: { say: "A modest Be2 keeps things solid but passive, and Black completes development with …Nc6, adding another piece against the d4-pawn. After the queen recapture Black has gained time and stands harmoniously; the e2-bishop does little to fight for the centre. Black simply develops, castles, and leans on the isolated d4-pawn.", sayShort: "…Nc6 develops, third hit on d4" },
  sources: ['concept:pos-development', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N94: SublineNarration = {
  intro: { say: "White finishes development and lifts the rook to e1, a standard IQP try aiming to back a future d4-d5 break and pile on the e-file. Black has castled safely with the queen still active and the structure clamped down; …Nc6 and …cxd4 trades into a clean isolani target. The rook on e1 supports activity, but the lone d4-pawn remains the long-term liability.", sayShort: "Castle safely, neutralise the e-file lift" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N95: SublineNarration = {
  intro: { say: "White develops the bishop to e3 to overprotect the d4-pawn, and after …cxd4 cxd4 the isolated queen pawn is fully exposed. Black's …Nc6 immediately adds a piece to the blockade and the d5-square beckons the knight or queen. With the queen already developed by the early recapture, Black is a tempo up on a standard IQP middlegame.", sayShort: "…cxd4 fixes it, …Nc6 blockades" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N96: SublineNarration = {
  intro: { say: "White pushes c4 to kick the queen off d5 and grab a broad pawn front with c4 and d4. Black retreats the queen with tempo to safety and notes that the advance has voided the d4-square's protection and left a backward d-pawn structure once …cxd4 follows. Pressure on the d4-pawn and the d5-square remains Black's reliable plan, now against a slightly looser white centre.", sayShort: "Retreat with tempo, target d4 and d5" },
  sources: ['concept:pawn-backward', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N97: SublineNarration = {
  intro: { say: "A transposition into the …Qxd5 main line where White must again resort to the awkward Na3 to defend d4 and prepare c4. Black develops smoothly with …Nf6, …e6 and …Nc6, the last move adding a third attacker to the d4-pawn while the offside a3-knight does little. The free development from the queen recapture leaves Black a tempo ahead.", sayShort: "…Nc6 piles on d4; Na3 is offside" },
  sources: ['concept:pos-development', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N98: SublineNarration = {
  intro: { say: "A textbook IQP middlegame: after the …cxd4 trade White is left with the isolated d4-pawn, and the rook swings to the half-open c-file to generate piece activity as compensation. Black has the structure under control with the queen on d6 eyeing d4 and the c6-knight ready to hop to the d5-blockade square. The plan is to trade White's active pieces and convert the long-term weakness of the lone d4-pawn.", sayShort: "Blockade d5, neutralise the c-file rook" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N99: SublineNarration = {
  intro: { say: "White tucks in h3 to give the king luft and prevent …Bg4 before committing to a plan in the isolated queen pawn middlegame. Black is fully developed and castled, the queen already active from the early recapture, and …Nc6 with …cxd4 fixes the lone d4-pawn as the target. The quiet h3 simply gives Black a free move to organise the blockade.", sayShort: "…Nc6 and …cxd4, fix the isolani" },
  sources: ['concept:pawn-isolated', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N100: SublineNarration = {
  intro: { say: "This is the French-Advance structure of the Alapin: White's d4-e5 chain faces Black's d5-e6. Black has rerouted the knight to f5, where it pressures d4 and the e3-square, and the e3-bishop steps in to guard d4 and challenge that knight. Black's plan is the standard …cxd4 break and piling on the d4-pawn, with …Qb6 and …Be7 to follow.", sayShort: "…Nf5 hits d4, prepare the …cxd4 break" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N101: SublineNarration = {
  intro: { say: "In the French-Advance structure White develops the bishop to g5, eyeing the e7-square and probing Black's kingside knight routing. Black continues the plan calmly: …Qb6 or …Be7 challenges the bishop, and the f5-knight keeps biting at d4 and e3. The break …cxd4 followed by pressure on the d4-pawn is Black's reliable route to counterplay against the pawn chain.", sayShort: "…Nf5 stays put, prepare …cxd4" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N102: SublineNarration = {
  intro: { say: "White resolves the tension with dxc5, surrendering the d4-strongpoint to win the c5-pawn for now. Black recaptures the pawn comfortably with …Bxc5, and the dissolution of the d4-pawn frees Black's pieces and the c6-knight, leaving the f5-knight ideally posted in front of the e5-pawn. Trading off White's space concession into active piece play suits Black.", sayShort: "…Bxc5 regains it, free piece play" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N103: SublineNarration = {
  intro: { say: "White lunges g4 to chase the strong f5-knight, but this is a serious weakening of the king that has just castled short. Black retreats the knight to h4 or e7 and notes the gaping light squares around White's king; …h5 can prise open the kingside, and the d7-bishop eyes the long light diagonal. The break …cxd4 still looms, and now White's king has no shelter.", sayShort: "Retreat the knight; g4 wrecks White's king" },
  sources: ['concept:pos-king-safety', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N104: SublineNarration = {
  intro: { say: "White redeploys the bishop to d3 to confront the active f5-knight and reinforce the kingside. Black holds the knight or trades it favourably, then carries on with the standard plan against the French-Advance chain: …cxd4 to open lines, …Qb6 to hit d4 and b2, and …Be7 to complete development. The pressure on the d4-pawn at the base of the chain is the constant.", sayShort: "…cxd4 break, …Qb6 hits the base" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N105: SublineNarration = {
  intro: { say: "White plays the quiet a3, ruling out …Bb4 and …Nb4 ideas before committing the queenside. Black simply proceeds with the thematic plan: …cxd4 to chip at the chain, …Qb6 to pressure d4 and b2, and …Be7 to develop, with the f5-knight a thorn in front of the e5-pawn. White's slow move gives Black free time to organise the …cxd4 break.", sayShort: "Free tempo; play …cxd4 and …Qb6" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N106: SublineNarration = {
  intro: { say: "The recapture …exd5 leaves a symmetrical isolani structure, Black's pawn on d5 against White's on d4. Black grabs queenside space with …c4, locking the pawn chain and clamping the b3-square, then …a6 puts the question to the b5-bishop. With the centre fixed the play shifts to the wings, where the …c4 wedge hands Black a pleasant space edge and a clear minority-style target on the queenside.", sayShort: "Lock with …c4, gain queenside space" },
  sources: ['concept:pawn-isolated', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N107: SublineNarration = {
  intro: { say: "White plays b3 to fianchetto the c1-bishop to b2, reinforcing the d4-pawn along the long dark diagonal in the French-Advance chain. Black presses on with the thematic …cxd4 break and …Qb6, hitting both the d4-pawn and the b2-point the bishop will occupy. The f5-knight keeps gnawing at d4 and e3, and Black's counterplay flows from the pressure on the chain's base.", sayShort: "…cxd4 and …Qb6 strike the base" },
  sources: ['concept:pawn-chain', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N108: SublineNarration = {
  intro: { say: "White develops the queen's knight to d2, heading for b3 or f3 to bolster d4 in the French-Advance structure. Black continues with …cxd4 to open the c-file and …Qb6, ganging up on the d4-pawn at the base of the chain while the f5-knight pressures d4 and e3. The standard plan of undermining d4 carries Black's counterplay.", sayShort: "…cxd4, …Qb6, gang up on d4" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N109: SublineNarration = {
  intro: { say: "White slips in h3 to deny …Ng4 and give the king luft in the French-Advance chain. Black ignores it and presses the standard plan: …cxd4 to open lines, …Qb6 to hit d4 and b2, and the f5-knight gnawing at d4 and e3. The quiet h3 simply gifts Black a free tempo to prepare the break against the d4-pawn.", sayShort: "Free tempo; …cxd4 hits the base" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N110: SublineNarration = {
  intro: { say: "Against the fianchetto, White builds a big pawn centre with e5 and locks d4-e5 versus d5. Black's dark-squared bishop on g7 bites on the long diagonal, and the …g5-g4 pawn lever evicts the f3-knight, loosening White's grip on e5 and opening lines toward the white king. This is a committal kingside pawn storm: undermine the e5-spearhead and the centre cracks.", sayShort: "Storm with …g5-g4, evict the f3-knight" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N111: SublineNarration = {
  intro: { say: "f4 — White bolsters the e5-wedge with a third pawn, building a broad d4-e5-f4 front. Crack it at the weak link: …g5 strikes f4, and after the tension resolves …g4 peels the support away, leaving the e5- and d4-pawns to wither under the g7-bishop's glare on the long diagonal.", sayShort: "f4 — …g5 cracks the wedge." },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N112: SublineNarration = {
  intro: { say: "White props up the e5-pawn with f4, building a stonewall-style centre, but the move weakens the king's cover. Black strikes back immediately with …g5, hitting f4 and prying the centre open; if White takes, the g-file and the long diagonal blaze open for the g7-bishop and rook. The …g5 lever turns White's space into an exposed shell.", sayShort: "…g5 cracks f4, open lines for the bishop" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N113: SublineNarration = {
  intro: { say: "White develops the bishop to e3 to bolster the d4-pawn at the base of the d4-e5 chain. Black's setup is harmonious: the g7-bishop rakes the long diagonal at the e5-pawn, the c6-knight presses d4, and …Nh6-f5 or …f6 is coming to undermine White's centre. The plan is to chip away at e5 and d4 rather than allow White a free hand with the space.", sayShort: "Pressure e5 and d4, route …Nf5" },
  sources: ['concept:pawn-chain', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N114: SublineNarration = {
  intro: { say: "The bishop pins to b5, leaning on the c6-knight that presses the d4-pawn. Black breaks the pin and keeps the pressure with …Bd7 or …a6, since the knight's job is to harass d4 at the base of White's chain. The g7-bishop already bears down on e5, and Black's whole plan is to liquidate White's broad centre, not respect it.", sayShort: "Break the pin, keep hitting d4" },
  sources: ['concept:tac-pin', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N115: SublineNarration = {
  intro: { say: "White inserts the prophylactic h3 to stop …Bg4 and …g4 ideas, but it costs a tempo and weakens the kingside light squares. Black storms anyway with …g5, intending …g4 to lever the f3-square and undermine the e5-pawn; with the g7-bishop on the long diagonal the opening of files favours Black. The pawn break at the head of White's chain is the priority.", sayShort: "…g5-g4 storm, undermine e5" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N116: SublineNarration = {
  intro: { say: "White develops the bishop to d3 in the fianchetto line, supporting the centre and aiming at the kingside, but Black strikes first. …g5-g4 levers open lines and drives the f3-knight, loosening White's grip on the e5-pawn while the g7-bishop rakes the long diagonal. The committal pawn storm undermines White's broad centre before it can become a battering ram.", sayShort: "…g5-g4 storms, evict the f3-knight" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N117: SublineNarration = {
  intro: { say: "White's prophylactic h3 tries to forestall the …g4 lever, but Black storms regardless with …g5-g4, and after hxg4 the h-file opens toward White's king. The g7-bishop bears down the long diagonal at e5, and prising open the kingside while White is still uncastled is precisely Black's aim. Undermining the e5-pawn at the head of the chain is the plan.", sayShort: "…g5-g4 anyway, open the h-file" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N118: SublineNarration = {
  intro: { say: "In the fianchetto line White clamps the centre with d4-e5 and develops the bishop to d3 to support the advance and eye the kingside. Black's knight routes via h6 toward f5, where it bites on d4 and e3, while the g7-bishop pressures the long diagonal behind the e5-pawn. The plan is …Nf5 followed by undermining e5 with …f6 or a queenside break to crack White's broad centre.", sayShort: "…Nh6-f5 to bite d4, undermine e5" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N119: SublineNarration = {
  intro: { say: "White develops the bishop to e3 to guard the d4-pawn at the base of the chain, but Black is already storming. …g5-g4 levers open the kingside and chases the f3-knight, loosening the e5-pawn while the g7-bishop rakes the long diagonal toward it. Cracking White's broad centre with the wing pawns is the throughline of the fianchetto setup.", sayShort: "…g5-g4 storm, loosen e5" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N120: SublineNarration = {
  intro: { say: "The same exchange on d6 reached with White's knight already developed to f3. Capturing exd6 clears the e5-pawn and leaves White holding the isolated d4-pawn, which Black recaptures against with easy piece play; …a6 denies the b5-square to White's bishop and knight. Black blockades on d5 and grinds the lone pawn.", sayShort: "Trade on d6, isolani is the target" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N121: SublineNarration = {
  intro: { say: "The same Nc3 offer to swap off Black's d5-knight, here with White's recapture on d4 delayed past Nf3. Black either takes on c3 to inflict doubled pawns or maintains the knight and keeps pressuring the e5- and d4-pawns with …d6 and the c6-knight. The isolated d4-pawn is the structural fault line.", sayShort: "Trade or hold d5, grind the isolani" },
  sources: ['concept:pawn-isolated', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N122: SublineNarration = {
  intro: { say: "A transposition of the same idea reached by a different move order, with White's knight already on f3 before recapturing on d4. The b5-bishop pins the c6-knight that braces the …d6 strike at e5, but the b6-knight and the pressure against the lone d4-pawn give Black the comfortable side. Liquidating the e5-pawn and blockading on d5 is the throughline.", sayShort: "Same plan: …d6 break, blockade d5" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N123: SublineNarration = {
  intro: { say: "The pinning Bb5 reached with the delayed d4-recapture, leaning on the c6-knight that backs the …d6 strike at e5. Black breaks the pin or takes on e5 to dissolve White's centre into the lone isolated d4-pawn. The b6/d5 squares welcome Black's knights, and the structural target is set.", sayShort: "Unpin and trade, the d4 pawn is weak" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N124: SublineNarration = {
  intro: { say: "The same Bxf7+ lunge reached by the move order with Nf3 inserted before the d4-recapture. The sacrifice is just as unsound: …Kxf7 banks the piece for a pawn, and with the b6- and c6-knights guarding the centre and the d4-pawn isolated, White has no attack. Black walks the king to safety and converts the material edge.", sayShort: "…Kxf7 wins the piece, no attack" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N125: SublineNarration = {
  intro: { say: "Black meets the IQP plan head-on with the central counterthrust …e5, and after White's c4 hits the queen, …e4 and …e3 ram the pawn deep into White's position. The …e3 wedge fractures White's kingside pawns and obstructs the c1-bishop and f1-bishop's development, handing Black a dangerous protected runner. The whole point of the early …Qxd5 and …e5 is this sharp central pawn lunge.", sayShort: "Ram …e5-e4-e3, wedge into White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N126: SublineNarration = {
  intro: { say: "Black answers the IQP plan with the central counterstrike …e5, and after Be3 grabs queenside space and momentum with …c4 and …e4. The …c4 wedge clamps White's queenside while …e4 kicks the f3-knight and seizes central space; together they leave White cramped and reactive. The early …Qxd5 bought the time for this aggressive central expansion.", sayShort: "…c4 clamps, …e4 kicks the knight" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N127: SublineNarration = {
  intro: { say: "Black hits back in the centre with …e5 and meets Bb5 by clamping with …c4 and advancing …e4. The …c4 wedge locks White's queenside and …e4 evicts the f3-knight, grabbing central space while the bishop on b5 finds no real target after the pin is broken. The early queen recapture funds this energetic central expansion.", sayShort: "…c4 and …e4 seize central space" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N128: SublineNarration = {
  intro: { say: "Black answers the IQP plan with …e5 and, against the modest Be2, expands with …c4 and …e4. The …c4 wedge clamps White's queenside and …e4 drives the f3-knight back, gaining central space and the initiative while the e2-bishop stays passive. The early …Qxd5 and …e5 fund this aggressive central push.", sayShort: "…c4 clamps, …e4 grabs space" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N129: SublineNarration = {
  intro: { say: "White grabs the …e5-pawn with Nxe5, but Black has compensation: after …Nxe5 dxe5 the queen on d5 sits actively and …c4 grabs queenside space, while White's e5-pawn becomes a target rather than a strength. Here …c4 and …a6 clamp and expand before reclaiming the pawn or pressuring it. Black's lead in piece activity offsets the temporary material.", sayShort: "…c4 clamps; the e5-pawn becomes a target" },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N130: SublineNarration = {
  intro: { say: "Black meets the isolated queen pawn plan with the central thrust …e5, and against the awkward Na3 grabs space with …c4 and …e4. The …c4 wedge traps White's offside a3-knight out of play and …e4 evicts the f3-knight, leaving White cramped on both wings. The early …Qxd5 and …e5 power this aggressive central and queenside expansion.", sayShort: "…c4 traps Na3, …e4 grabs the centre" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N131: SublineNarration = {
  intro: { say: "White forces an early queen trade with dxc5 and Qxd1+ Kxd1, dragging the white king to d1 and forfeiting castling rights. Black wins back the c5-pawn at leisure with …a6 and …Bxc5 or …Qxc5 ideas, while the displaced white king is a long-term liability in the endgame. Trading queens into a structure where White's king is stuck in the centre is comfortable for Black.", sayShort: "Queens off; White's king stuck on d1" },
  sources: ['concept:pos-king-safety', 'concept:end-opposition', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N132: SublineNarration = {
  intro: { say: "After the …Nf6 line White grabs the centre with e5 and an isolated d4-pawn, and the c4-bishop retreats to b3 once the knight reroutes to b6. Black has already struck at the e5-wedge with …d6, and the knights on b6 and c6 train on d4 while the b3-bishop eyes an empty f7 diagonal. The plan is to liquidate e5, complete development with …Bg4 and …e6, and leave White nursing the lone d4-pawn.", sayShort: "Hit e5 with …d6, target d4" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N133: SublineNarration = {
  intro: { say: "White develops the queen's knight to c3, challenging the strong d5-knight and trying to make something of the isolated d4-pawn. Black is already fully mobilised: knights on c6 and d5 grip the central light squares and the d5-knight blockades the isolani head-on. Trading minor pieces and pressing the lone d4-pawn is the standard recipe against an IQP, and Black holds the structural trump.", sayShort: "Blockade d5, press the isolated pawn" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N134: SublineNarration = {
  intro: { say: "White develops the bishop to c4, hitting the d5-knight and eyeing the f7-square in the isolated queen pawn structure. Black is well placed: the knights on d5 and c6 blockade and pressure the lone d4-pawn, and …e6 will shore up the d5-outpost without conceding the f7-diagonal. Exchanging White's active pieces leaves the isolani as the standing weakness.", sayShort: "…e6 holds d5, press the isolated pawn" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N135: SublineNarration = {
  intro: { say: "White pins to b5 against the c6-knight in the isolated queen pawn structure, hoping to trade and weaken Black's grip on d4. Black breaks the pin with …Bd7 and keeps the knights on c6 and d5 blockading and pressing the lone d4-pawn. The IQP remains the standing weakness whatever White trades.", sayShort: "Unpin with …Bd7, blockade d5" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N136: SublineNarration = {
  intro: { say: "White inserts Bb5+ before regaining the pawn, and Black blocks with …Nbd7, keeping the d5-pawn for now. With …a6, …c4 and …a5 Black grabs queenside space and fixes the structure, daring the b5-bishop to declare itself. The …c4 wedge clamps b3 and gives Black a durable space advantage on the side where White has overextended.", sayShort: "…c4 wedge, queenside space and clamp" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N137: SublineNarration = {
  intro: { say: "White grabs the d5-pawn with a queen check, Qa4+ then Qb3, but the queen ends up exposed and chasing pawns. Black blocks with …Nbd7, fianchettos with …g6, and gains queenside space with …c4, hitting the b3-queen and clamping the position. The …g5 thrust then expands on the kingside; White's greedy queen excursion has cost development and given Black a free hand.", sayShort: "Harass the b3-queen, gain space with …c4" },
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N138: SublineNarration = {
  intro: { say: "White accepts the isolated queen pawn on d4 and posts the knight to c3, attacking the d5-knight. The bishop swings out to b4 to pin that knight against the king on e1, doubling the pressure on c3 before White can comfortably untangle. With …e6 already played the d5-knight is solid, and Black blockades the isolani and trades pieces, which only sharpens the weakness of the lone d4-pawn.", sayShort: "Bishop pins c3, blockade the d4 isolani" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N139: SublineNarration = {
  intro: { say: "White develops Nf3 and lets Black regain the pawn with …Nxd5, but after …cxd4 Black instead shoves the passer …d4-d3-d2+, ramming a wedge to the back rank. The d2-pawn checks the king and freezes White's c1-bishop and b1-knight, tying the queenside in knots. Black plays around the advanced thorn, finishing development while White untangles.", sayShort: "Run the passer to d2+, freeze White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N140: SublineNarration = {
  intro: { say: "White tosses in Bb5+ rather than recapture on d4, and Black answers …Bd7 then drives the passed pawn …d4-d3-d2+, jamming a wedge deep in White's camp. The d2-pawn checks on the back rank and freezes White's queenside development, with the c1-bishop and b1-knight tangled around it. Black uses the advanced runner as a thorn while completing development behind it.", sayShort: "Push the passer to d2+, jam White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N141: SublineNarration = {
  intro: { say: "This is the open Tarrasch with …c5, where the center has dissolved and Black has won the d4-pawn while developing the queen to the safe d6-square. White's lead in development and the active Bc4 are compensation for the pawn, but Black is solid with no weaknesses to attack. The plan is …Nf6, …Nc6, and …Be7 to castle quickly, returning the extra pawn if needed to neutralize White's initiative and reach a comfortable middlegame.", sayShort: "Open Tarrasch — …c5 wins d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-initiative'],
};

const N142: SublineNarration = {
  intro: { say: "This is the Exchange French, where the symmetrical pawn structure puts a premium on piece activity and the open e-file. Black mirrors White's development with …Bd6 aiming at h2 and prepares …O-O, …c6, and …Bg4 to develop the problem bishop outside the chain. The plan is to seize the e-file with …Re8 and contest the central squares; whoever generates the first concrete target in this symmetry takes the initiative.", sayShort: "Exchange — mirror development, fight for e-file" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N143: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black's …c4 has frozen the queenside, and Rb1 prepares b2-b3 to challenge the cramping c4-pawn. Black must hold the queenside bind — the a5-knight and the …b5 push keep the c4-pawn defended and the structure clamped. The plan is …b5, …Ne7, and …f6 or …g5, generating play on whichever wing White doesn't, since the locked center hands the game to the flank pawns.", sayShort: "Advance — hold …c4, expand with …b5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-space'],
};

const N144: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black has locked the queenside with …c4, fixing White's c3 and d4 pawns and freeing his hands for a pawn storm. The knight on a5 guards c4 and eyes b3, while …Ne7 prepares …Nf5 or …g5-g4 against White's kingside. The plan is …f6 or …g5 to break White's chain and create the play, since with the center closed the wing pawns decide.", sayShort: "Advance — locked …c4, prepare …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N145: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black's …c4 has frozen the queenside and Re1 readies a central break with f2-f4 or Nf1-h2. With the center locked, Black's play is on the wings: …Nec6 or …g5 and …f6 to undermine White's e5-d4 chain. The knight on a5 anchors the c4-pawn, and the plan is to open the kingside or break with …f6 before White can organize his own pawn storm.", sayShort: "Advance — closed …c4, break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N146: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black has fixed the queenside with …c4, and h3 simply makes luft and stops …Ng4 ideas. With the center locked solid, Black's plans live on the wings: …f6 to break White's chain from above, or …g5-g4 for a direct kingside storm. The a5-knight guards c4 and eyes b3, and …Nec6 or …Nf5 brings the kingside knight into the attack against White's stable but passive center.", sayShort: "Advance — …c4 bind, …f6 or …g5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N147: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black's …c4 has frozen the queenside, and Ne1 reroutes the knight toward d3 or g2 behind White's chain. With the center locked, Black's play is on the flanks: …f6 to break White's e5-d4 chain from above, or …g5-g4 for a kingside storm. The a5-knight props up c4, and …Nec6 or …Nf5 brings the kingside knight to bear against White's static center.", sayShort: "Advance — closed center, break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N148: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black's …c4 has frozen the queenside and Qc2 prepares b2-b3 or a central f4-break for White. With the center locked, the game is decided on the wings: Black plays …f6 to undermine the e5-d4 chain, or …g5-g4 to storm the kingside. The a5-knight guards c4 and eyes b3, and …Nec6 or …Nf5 redeploys the kingside knight against White's stable but passive structure.", sayShort: "Advance — locked …c4, …f6 break" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N149: SublineNarration = {
  intro: { say: "This is the closed Advance French where Black's …c4 has clamped the queenside and Ng5 jumps toward e4 or to provoke …h6 and weaken the kingside. Black calmly continues his plan against the locked chain: …h6 to repel the knight, then …f6 or …g5 to break White's e5-d4 structure from above. The a5-knight anchors c4, and the kingside knight reroutes via …Nec6 or …Nf5 to join the assault on White's static center.", sayShort: "Advance — …h6 then break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N150: SublineNarration = {
  intro: { say: "This is the main-line Advance French where Black sets up the standard battery against d4 with …c5, …Nc6, and …Bd7 preparing …Qb6. The d4-pawn, defended only by c3 and the f3-knight, is the entire target of Black's play. The plan is …Qb6 hitting d4 and b2, then …Rc8 and …cxd4 or …Nh6-f5, increasing pressure on the chain's base until White's center cracks.", sayShort: "Advance — battery on d4, …Qb6 next" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N151: SublineNarration = {
  intro: { say: "This is the Winawer Poisoned Pawn, where Black has sacrificed both kingside pawns to open the g-file and seize the initiative against White's exposed setup. The rook on g8 already glares down the open file at g2, and …cxd4 has cracked open the center while White's queen sits offside on h7. Black continues …Nxd4 or …Bd7 with …O-O-O, throwing every piece at the white king — the pawn deficit is irrelevant against the raging attack down the g-file.", sayShort: "Winawer Poisoned Pawn — g-file initiative" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-initiative', 'concept:tac-sacrifice'],
};

const N152: SublineNarration = {
  intro: { say: "This is a Winawer where White exchanges on d5 to reach a symmetrical, open structure while Black's bishop still pins the c3-knight on b4. The knight on c6 pressures d4, and Black is comfortable and weakness-free. The plan is …Nge7, …O-O, and …Bg4 or …Re8, developing harmoniously and keeping the pin on c3 to restrain White's center — the open position gives Black easy, equal play.", sayShort: "Winawer Exchange — pin holds, …Nge7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N153: SublineNarration = {
  intro: { say: "This is a Winawer where White plays Ne2 to recapture on c3 with a knight and dodge the doubled pawns, but Black takes on e4 first and retreats the bishop intact to e7. After Nxe4 and …Nf6, Black challenges the centralized knight and keeps the bishop pair without structural concessions. The plan is …Nxe4 or …Nbd7, then …b6 and …Bb7 — Black has a sound, harmonious position with no weaknesses to attack.", sayShort: "Winawer — …dxe4, keep the bishop on e7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-bishop-pair'],
};

const N154: SublineNarration = {
  intro: { say: "This is a Winawer where White develops the knight to f3 rather than launching Qg4 against the kingside. Black has the standard structural trumps: White's doubled c-pawns and the d4-base are chronic weaknesses, and …Bd7 prepares …Bc6 or …Ba4 to pressure them. The plan is …Qa5, …Nbc6, and …c4, fixing the c3-pawn and opening the queenside for an attack on the crippled white camp.", sayShort: "Winawer — pressure doubled c-pawns" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-doubled', 'concept:att-queenside-attack'],
};

const N155: SublineNarration = {
  intro: { say: "This is a Winawer where White plays Bd2 to recapture on c3 with the bishop, avoiding the doubled pawns if Black trades. Black develops …Ne7 toward g6 or f5 and keeps the central tension with …Nbc6 hitting d4. The plan is …cxd4 and …Qa5 or …Bxc3 at the right moment, undermining White's e5-d4 chain — if White does recapture with the bishop, Black gains the c-file and the better structure.", sayShort: "Winawer — …Ne7, pressure the d4-chain" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N156: SublineNarration = {
  intro: { say: "This is the Winawer Poisoned Pawn where, after grabbing both kingside pawns, White retreats the queen to d3 to defend and untangle. Black has sacrificed material for a roaring initiative: the rook on g8 commands the open g-file and …cxd4 has ripped open the center. The plan is …Nxe5 or …d4 followed by …Bd7 and …O-O-O, hurling the pieces at White's uncastled king — the open g-file and lead in development far outweigh the pawns.", sayShort: "Winawer Poisoned Pawn — g-file attack" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-initiative', 'concept:tac-sacrifice'],
};

const N157: SublineNarration = {
  intro: { say: "h4 — the sharp Winawer thrust, White grabbing kingside space and eyeing h5 before you can pile onto his shattered c-pawns. Strike the base instead: …Qc7 trains on the c3- and e5-pawns at once. Those doubled c-pawns are White's permanent Winawer weakness, and the queen begins the siege.", sayShort: "h4 — …Qc7 hits c3 and e5." },
  sources: ['concept:pawn-doubled', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N158: SublineNarration = {
  intro: { say: "This is the Steinitz Variation of the Classical French: White grabs space with e5 and props it up with f4, while Black undermines the chain at its base with …c5 and …Nc6. The d4-pawn is the target — pressure from the c6-knight and the queen will force White to either give it up or accept a cramped, locked structure. Black's standard plan is …cxd4, …Qb6, and …Be7, prying open the c-file and the queenside.", sayShort: "Steinitz — hit the chain base, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-center'],
};

const N159: SublineNarration = {
  intro: { say: "This is the Classical French with the dark-squared bishops traded, and White's long castle signals a race of opposite-wing attacks. Black has already struck with …c5 and brought the knight to c6, so the d4-base is under fire and the c-file is opening toward White's king on c1. The plan is …cxd4, …b5-b4, and …Rb8, hurling the queenside pawns at the white king while White storms the kingside with g4-f5.", sayShort: "Classical — race, …c5 and …b5 storm" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:att-queenside-attack', 'concept:pawn-chain'],
};

const N160: SublineNarration = {
  intro: { say: "This is a Classical French where White has released the central tension with dxc5, letting Black recapture with the queen on an active c5-square. With the dark-squared bishops gone and the d-file half-open, Black enjoys easy development and a clear target on White's e5-pawn and the d4-square. The plan is …Nb4 hitting d3, …Bd7, and …Rc8, contesting the c-file while the knight eyes the d5 and d3 outposts.", sayShort: "Classical — queen active on c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N161: SublineNarration = {
  intro: { say: "This is the Classical French with the dark-squared bishops traded, where White develops modestly to e2 and prepares to castle. Black has already played …c5 and …Nc6 to attack the d4-base of White's chain, with …a6 controlling b5. The plan is …cxd4, …Qb6, and …Bd7-b5 or …Rc8, opening the c-file and pressing the d4-pawn; Black's queenside play against the chain is the heart of the Classical.", sayShort: "Classical — …c5 hits d4, open the c-file" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-open-file'],
};

const N162: SublineNarration = {
  intro: { say: "This is the Classical French with bishops traded, where White lifts the knight to e2 to overprotect d4 and reroute toward f4 or g3. Black has already struck with …c5 and …Nc6 against the chain's base, and …a6 covers b5. The plan is …cxd4, …Qb6, and …Bd7-b5, opening the c-file and pressing d4; with the dark-squared bishops gone, Black's queenside pawn-and-piece play against White's center is the standing theme.", sayShort: "Classical — …c5 hits d4, …Qb6 next" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-open-file'],
};

const N163: SublineNarration = {
  intro: { say: "This is the Alekhine-Chatard Attack: instead of trading on e7, White lunges h4 to support Bg5 and threaten g4-g5, opening the h-file against Black's king. Black's safest reply is …Bxg5 followed by …hxg5, accepting damaged kingside pawns to kill White's attacking bishop and trade off the aggressor. After that, Black continues with …c5 and …Nc6 to hit d4, since the structure favors the side that strikes at the chain.", sayShort: "Alekhine-Chatard — take on g5, hit d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:att-kingside-storm', 'concept:pawn-chain'],
};

const N164: SublineNarration = {
  intro: { say: "This is the Classical French where White has released the tension with dxc5 and Black recaptured the queen to an active c5-post, after which a3 prevents …Nb4 and …Qb4. With the dark-squared bishops gone and the d-file half-open, Black develops easily and eyes White's e5-pawn and the d4-square. The plan is …Bd7, …O-O-O or …O-O, and …Rc8, using the c-file and the queen's activity to pressure White's loose center.", sayShort: "Classical — queen active on c5, …Rc8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N165: SublineNarration = {
  intro: { say: "This is the Tarrasch with the open Italian-style structure: Black has dissolved the center with …c5 and …f6, leaving White an isolated d4-pawn to blockade and besiege. The pieces are ideally placed — knight on c6, bishop on d6 aiming at h2, and queen on c7 lined up on the c-file behind White's rook. Black's plan is …Bd7-e8-h5 or …e5 to free everything, while the d4-pawn remains a permanent weakness.", sayShort: "Tarrasch — blockade White's isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N166: SublineNarration = {
  intro: { say: "This is the open Tarrasch with the isolated d4-pawn fixed as White's long-term weakness, and h3 simply makes luft and stops …Ng4 or …Bg4. Black is ideally coordinated — knight on c6, bishop on d6 aiming at h2, queen on c7 stacked on the c-file. The plan is …O-O, …Bd7-e8-h5 to add pressure, or the …e5 break to free the position; the blockade and siege of d4 is Black's standing edge.", sayShort: "Tarrasch — blockade and besiege d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N167: SublineNarration = {
  intro: { say: "This is the open Tarrasch where White develops the knight to c3 to add a defender to the isolated d4-pawn and eye e4 and b5. Black is excellently placed — knight on c6, bishop on d6 toward h2, queen on c7 stacked on the c-file. The plan is …O-O, …a6 to deny Nb5, and pressure on d4 with …Bd7 and the rooks; the isolated d4-pawn remains the permanent weakness Black blockades and besieges.", sayShort: "Tarrasch — besiege the isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N168: SublineNarration = {
  intro: { say: "This is the open Tarrasch where White plays f4 to clamp the e5-square and discourage Black's …e5 freeing break. Black is well-placed with the knight on c6, bishop on d6 toward h2, and the recaptured knight on f6 eyeing e4 and g4. The plan is …O-O, …Qc7 or …Qb6, and …Bd7 piling onto the isolated d4-pawn; the f4-push weakens e3 and the g1-a7 diagonal, giving Black fresh squares to target.", sayShort: "Tarrasch — besiege d4, exploit e3 hole" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-weak-squares'],
};

const N169: SublineNarration = {
  intro: { say: "This is the closed Tarrasch, where White builds the e5-d4-c3 pawn chain and Black immediately attacks its base with …c5 and …Nc6. The light-squared bishop on d3 and the cramped d7-knight tell the story: Black must generate counterplay against d4 before White's kingside space crushes him. The plans branch into …Qb6 hitting d4 and b2, or …f6 to break the chain from above and free the position.", sayShort: "Closed Tarrasch — …c5 and …Nc6 on d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-space'],
};

const N170: SublineNarration = {
  intro: { say: "This is the open Tarrasch with the isolated d4-pawn, where a3 stops …Nb4 hitting the d3-bishop and prepares b2-b4 for space. Black's pieces are model-placed — knight on c6, bishop on d6 toward h2, queen on c7 on the c-file. The plan is …O-O, …Bd7-e8-h5 to pile on d4, and the …e5 break to free the game; the isolated d4-pawn is the standing weakness Black blockades and besieges.", sayShort: "Tarrasch — blockade and pressure d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N171: SublineNarration = {
  intro: { say: "This is the open Tarrasch with the isolated d4-pawn, where Ng3 reroutes the knight toward f5 or h5 to harass Black's kingside. Black is splendidly developed — knight on c6, bishop on d6 toward h2, queen on c7 on the c-file. The plan is …O-O, …Re8, and …Bd7-e8 piling onto d4, with …e5 in reserve to break free; White's isolated d4-pawn is the permanent weakness Black blockades and besieges.", sayShort: "Tarrasch — siege the isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N172: SublineNarration = {
  intro: { say: "This is the Exchange French, where the symmetrical pawn structure is broken only by who acts first, and Re1 grabs the e-file. Black answers …Re8 to contest the open file directly, then completes with …c6, …Nbd7, and …Qc7 lining up the bishop and queen at h2. The plan is to seize the e-file and aim a minority advance or a kingside regrouping; the side that controls the e-file and the e4/e5 squares holds the edge.", sayShort: "Exchange — contest the e-file, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N173: SublineNarration = {
  intro: { say: "This is the Exchange French where White supports d4 with c3, settling into a slow symmetrical struggle. Black mirrors with …c6 and develops …Bg4 or …Bf5 outside the pawn chain, then …Nbd7 and …Qc7 to point the battery at h2. The plan is to contest the e-file with …Re8 and prepare a minority advance with …b5-b4 against c3, since whoever creates the first real target in this symmetry takes the initiative.", sayShort: "Exchange — …c6, develop the bishop out" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-minority-attack', 'concept:pos-development'],
};

const N174: SublineNarration = {
  intro: { say: "This is the Exchange French with mirrored development, and h3 asks the g4-bishop to declare itself. Black can keep the pin alive with …Bh5 or trade with …Bxf3, conceding the bishop pair to plant a knight on the e4-outpost. The symmetry is only surface-deep — Black plays for …Nbd7, …c6, and a minority push or …Re8 to seize the open e-file before White does.", sayShort: "Exchange — …Bh5 or trade for e4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:tac-pin'],
};

const N175: SublineNarration = {
  intro: { say: "This is the Exchange French where White develops the knight to c3, pressuring d5 and angling for the e4-break. Black mirrors with …c6 to bolster d5 and …Bg4 or …Bf5 to develop the bishop outside the chain. The plan is …Re8 to grab the e-file, …Nbd7, and …Qc7 with the bishop pointed at h2; Black holds d5, contests the central files, and keeps the symmetrical position fully balanced.", sayShort: "Exchange — hold d5 with …c6, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N176: SublineNarration = {
  intro: { say: "This is the main-line Winawer: Black has traded the dark-squared bishop on c3 to saddle White with doubled, weak c-pawns, and now castles into Qg4's kingside aim. The bargain is structural — White owns the bishop pair and space, but the c3- and c4-pawns and the d4-base are chronic targets. Black presses with …Nbc6, …Qa5, and …cxd4, opening lines against the crippled queenside while the king sits safely on g8.", sayShort: "Winawer — doubled c-pawns the target" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-doubled', 'concept:pos-bishop-pair'],
};

const N177: SublineNarration = {
  intro: { say: "This is the Exchange French where White breaks the symmetry with c4, pressuring d5 and accepting an isolated queen's pawn structure if Black plays …dxc4. Black can take with …dxc4 to win the bishop pair after …Bxc4, or hold with …c6, leaving White with a potential isolated d-pawn. The plan is …c6 and …Bg4 to pin f3, then …Re8 and …Nbd7, blockading d5 or d4 and exploiting whichever isolated pawn White ends up with.", sayShort: "Exchange — …c6, target the isolated pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N178: SublineNarration = {
  intro: { say: "This is the Exchange French with both sides developing their bishops actively outside the chain and c3 propping up d4. The g4-bishop pins the f3-knight, restraining White's central breaks, while …Nbd7 and …c6 round out Black's harmonious setup. The plan is …Re8 to seize the e-file and …h6 to ask the g5-bishop its intentions, keeping the symmetrical position double-edged with full chances for Black.", sayShort: "Exchange — pin on f3, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-open-file'],
};

const N179: SublineNarration = {
  intro: { say: "This is the Exchange French where White posts the knight aggressively on e5, the natural central outpost in this symmetrical structure. Black challenges it directly with …Nbd7 or …Nc6 to trade off the intruder, or plays …c5 to strike at d4 and undermine the knight's support. The plan is …Re8 for the e-file, …c5, and exchanging on e5, after which Black's harmonious pieces and the open center give fully equal, active play.", sayShort: "Exchange — challenge the e5-knight, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-outpost', 'concept:pos-open-file'],
};

const N180: SublineNarration = {
  intro: { say: "f3 — White tries to win back the e4-pawn in this offbeat French. Don't hand it over: …e3 jams the pawn deep into White's camp, a permanent thorn cramping the f1-bishop and freezing the whole kingside. The advanced pawn on e3 is worth far more than the tempo White recovers.", sayShort: "f3 — …e3 jams a thorn." },
  sources: ['concept:pos-space', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N181: SublineNarration = {
  intro: { say: "This is the Burn Variation, where …dxe4 hands White the center but leaves Black with the bishop pair after the f6-bishop has been traded for the knight. The dark-squared bishop sits actively on f6, pressing d4 and the long diagonal, and the d7-knight is ready to reroute to b6 or f6. Black completes with …b6, …Bb7, and …c5, striking at d4 and putting both bishops to work on the long diagonals.", sayShort: "Burn — bishop pair, …b6 and …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N182: SublineNarration = {
  intro: { say: "This is the Burn Variation, where Black holds the two bishops and the dark-squared bishop is already active on f6 against d4. The c3-pawn shores up the d4-base but leaves White's center static and slightly passive. Black's plan is …b6 and …Bb7 to harness the long light diagonal, then …c5 to challenge d4 — with both bishops working, Black has the more comfortable middlegame.", sayShort: "Burn — bishop pair, …b6 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-bishop-pair', 'concept:pawn-chain'],
};

const N183: SublineNarration = {
  intro: { say: "This is the Burn Variation where White trades the e4-knight on f6, and Black recaptures with the d7-knight to keep a sound, symmetrical structure. Though the second bishop is gone, Black is solid and free of weaknesses, with the c8-bishop ready to develop to b7 after …b6. The plan is …b6, …Bb7, …c5, and …O-O, hitting the d4-pawn and putting the long-diagonal bishop to work for comfortable equality.", sayShort: "Burn — recapture …Nxf6, …b6 and …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pawn-chain'],
};

const N184: SublineNarration = {
  intro: { say: "This is the Burn Variation where White develops the bishop to b5 to pin the d7-knight and pressure Black's queenside before he completes development. Black keeps the bishop pair, with the dark-squared bishop active on f6 against d4. The plan is …c6 to chase the b5-bishop or …a6 and …c5, breaking the pin and striking the center; once Black plays …b6 and …Bb7, both bishops sweep the long diagonals for a comfortable game.", sayShort: "Burn — break the pin, …c6 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N185: SublineNarration = {
  intro: { say: "This is a Rubinstein setup where the c6-bishop has already been freed and White pins the f6-knight with Bg5. Black is perfectly solid: the bishop on c6 trades off White's strong e4-knight or supports …Nxe4, and the pawn on c3 means d4 has no natural support beyond the queen. Black continues with …Be7, breaks the pin, and aims for …c5 to liquidate the center and equalize fully.", sayShort: "Rubinstein — break the pin, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N186: SublineNarration = {
  intro: { say: "This is a Rubinstein where the c6-bishop is already developed and White lifts the queen to e2 to connect the rooks and prepare central play. Black is solid and symmetrical in spirit — the bishop on c6 contests White's e4-knight and the long diagonal, and the c3-pawn keeps d4 from getting extra support. Black plays …Be7, castles, and aims for …c5 or …Qd5 to dissolve d4 and reach a comfortable, weakness-free equality.", sayShort: "Rubinstein — solid, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N187: SublineNarration = {
  intro: { say: "This is a Rubinstein where White sidesteps the trade of the e4-knight by dropping it back to g3, keeping pieces on. Black is fully developed and untroubled — the bishop on c6 commands the long light diagonal, and the c3-pawn leaves d4 reliant on the queen alone. Black plays …Be7, castles, and prepares the …c5 break to liquidate d4, reaching the same comfortable, solid equality the Rubinstein promises.", sayShort: "Rubinstein — c6-bishop strong, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N188: SublineNarration = {
  intro: { say: "This is a Rubinstein where the c6-bishop is already developed and White places the queen on c2 to defend e4 indirectly and eye the b1-h7 diagonal. Black is solid and symmetrical in feel, with the light-squared bishop active on c6 toward f3 and g2. The plan is …Be7, …O-O, and the …c5 break to liquidate White's d4-pawn; with no weaknesses and harmonious development, Black equalizes comfortably.", sayShort: "Rubinstein — bishop on c6, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N189: SublineNarration = {
  intro: { say: "This is a Rubinstein where the e4-knight has been swapped on f6 and White pins the recaptured knight with Bg5. The bishop on c6 already controls the long light diagonal and bears down on f3, so Black is fully developed and free of weaknesses. Black breaks the pin with …Be7 and prepares …c5 or …Qd5, liquidating the d4-pawn and reaching dead equality with active pieces.", sayShort: "Rubinstein — c6-bishop strong, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N190: SublineNarration = {
  intro: { say: "This is the Rubinstein French, where conceding the center with …dxe4 buys a rock-solid, congestion-free game. The light-squared bishop has already escaped its pawn chain to c6, eyeing the e4-knight and the long diagonal. With castling complete, Black finishes with …Ngf6 and …Be7, then plays for the freeing breaks …c5 or …e5 to challenge White's lone d4-pawn.", sayShort: "Rubinstein — solid, bishop freed on c6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N191: SublineNarration = {
  intro: { say: "This is the Rubinstein where White centralizes the queen on e2 to connect rooks before deciding on a setup. Black's freed light-squared bishop on c6 is the point of the whole variation — it bears on the e4-knight and the long diagonal toward g2. Black continues …Ngf6 to challenge e4, then …Be7 and …O-O, with the standard …c5 break in reserve to liquidate d4 and equalize.", sayShort: "Rubinstein — bishop on c6, …Ngf6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N192: SublineNarration = {
  intro: { say: "This is an Advance French Milner-Barry-style gambit where Black has snatched the d4-pawn with the knight and recaptured by queen, and Re1 prepares White's piece play for the lost material. Black is up a clean pawn and just needs to consolidate — the queen on d4 is well-centralized and …a6 has covered the b5-square. The plan is …Ne7-c6 or …Bc5 to challenge the queen, then …O-O-O or …Be7, keeping the extra pawn and weathering the initiative.", sayShort: "Advance — extra pawn, consolidate the d4-queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-centralization', 'concept:pos-king-safety'],
};

const N193: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, with Be3 hitting the centralized black queen to gain a tempo for the attack. Black holds the extra d4-pawn and has already played …a6 to deny Nb5; the queen simply steps back to safety. The plan is …Qb6 or …Qd8, then …Ne7 and …Nc6, completing development and tucking the king away — keep the pawn, weather the initiative, win the endgame.", sayShort: "Milner-Barry — extra pawn, retreat the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-development'],
};

const N194: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, with Qf3 eyeing the f7-pawn and the kingside while White seeks compensation for the lost pawn. Black is up a clean pawn with the queen well-centralized on d4 and …a6 covering b5. The plan is …Qb6 or …Bc6 to neutralize the queen's aim, then …Ne7 and …O-O-O or …Be7 — once the king is safe, the extra pawn carries Black into a winning endgame.", sayShort: "Milner-Barry — extra pawn, guard f7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N195: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, where White tucks the king to h1 to clear g1 and prepare f2-f4 with his attacking initiative. Black has the extra d4-pawn, the queen well-centralized, and …a6 stopping Nb5. The plan is …Qb6 or …Bc6 to defuse White's pieces, then …Ne7 and …O-O-O — Black consolidates around the centralized queen and converts the extra pawn once the king is safe.", sayShort: "Milner-Barry — extra pawn, finish development" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N196: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, where a3 takes the b4-square from Black's queen and bishop and supports a future b2-b4. Black holds the extra d4-pawn with the queen strongly centralized and …a6 already denying Nb5. The plan is …Qb6 or …Bc6 to retreat the queen and trade attackers, then …Ne7 and …O-O-O — Black consolidates and converts the clean extra pawn in the endgame.", sayShort: "Milner-Barry — keep the pawn, untangle" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N197: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, with White's rook swinging to d1 to harass the centralized black queen and regain the pawn. Black has the extra d-pawn and has prudently played …a6 to deny Nb5 and …Ne7 to bolster the kingside. The plan is …Nc6 or …Qb6 to retreat the queen safely, then …Be7 and …O-O — once the king is tucked away, the pawn is Black's to keep.", sayShort: "Milner-Barry — extra pawn, untangle the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N198: SublineNarration = {
  intro: { say: "This is the Milner-Barry Gambit accepted, where g3 prepares Bf4 or a fianchetto to chip at Black's centralized queen and exploit the dark squares. Black is a clean pawn up with the queen strong on d4 and …a6 covering b5. The plan is …Qb6 or …Bc6 to neutralize White's developing pieces, then …Ne7 and …O-O-O or …Be7 — once the king is safe, the extra d-pawn decides the game.", sayShort: "Milner-Barry — extra pawn, retreat the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N199: SublineNarration = {
  intro: { say: "This is a sharp MacCutcheon line where White's king has been stranded on d2 and the h4-push aims to pry open the h-file against Black's weakened kingside. Black has won the dark-squared bishop and damaged White's queenside pawns, and the …c5 break is already hitting the d4-base. The plan is …Nc6, …Qa5, and …c4, turning the central tension into a queenside assault while White's misplaced king and doubled c-pawns tell.", sayShort: "MacCutcheon — White king stuck, …c5 strike" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N200: SublineNarration = {
  intro: { say: "This is a MacCutcheon line where White retreats the bishop to e3 rather than allowing the structural damage of …Bxc3. Black's f6-knight is pinned no longer, so …Ne4 hits the c3-knight and forces clarification on the queenside. The plan is …Bxc3, …Nxc3 or …bxc3 damaging White's pawns, then …c5 to attack the d4-e5 chain at its base while Black's king finds safety.", sayShort: "MacCutcheon — …Ne4 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N201: SublineNarration = {
  intro: { say: "This is the MacCutcheon where White sidesteps the main lines by capturing on d5 immediately. Black recaptures with …exd5 or the sharper …Qxd5, opening the position while keeping the active b4-bishop pinning the c3-knight. With …exd5 Black gets a free, symmetrical structure and easy development to …Nc6, …O-O, and …Re8; the pinned knight and the open e-file give Black comfortable, weakness-free play.", sayShort: "MacCutcheon — recapture …exd5, free game" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N202: SublineNarration = {
  intro: { say: "This is the MacCutcheon Lasker line where White retreats the bishop all the way to c1 to dodge the …Bxc3 doubling, and Black plants the knight on the e4-outpost. With Qg4 hitting g7, …g6 shores up the kingside and blunts the queen's aim. The plan is …Bxc3 and …c5, smashing into White's d4-e5 chain while the e4-knight and the half-open structure give Black sharp, active counterplay.", sayShort: "MacCutcheon — knight on e4, …c5 break" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-outpost', 'concept:pawn-chain'],
};

const N203: SublineNarration = {
  intro: { say: "This is the MacCutcheon where White's king sits on d2 and he releases the center with dxc5 rather than hold the chain under fire. Black has already damaged White's queenside with …Bxc3 and provoked Kxd2, and now the center is opening with the king still exposed. The plan is …Nc6 and …Qa5 hitting c5 and the loose c3-pawn, with …Bd7 and …O-O-O to swing the rooks against White's stranded monarch.", sayShort: "MacCutcheon — open lines at the d2-king" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N204: SublineNarration = {
  intro: { say: "This is the MacCutcheon with White's king on d2, where f4 reinforces the e5-pawn and braces the center against Black's …c5 break. Black has the structural trumps — White's doubled c-pawns and the awkward king are permanent liabilities. The plan is …Nc6 and …Qa5 to hit c3 and the d4-pawn, then …cxd4 and …Bd7 with …O-O-O, opening files against the white king before it can find shelter.", sayShort: "MacCutcheon — …Nc6 and …Qa5 on the king" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N205: SublineNarration = {
  intro: { say: "c3 — White shores up the d4-pawn against your …c5 break in this solid Rubinstein structure. Develop naturally with …Bd6, …O-O and …Qc7, keeping the pressure trained on d4. With the position symmetrical and your pieces a touch freer, Black reaches comfortable, fully equal play.", sayShort: "c3 — develop, keep hitting d4." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N206: SublineNarration = {
  intro: { say: "This is the Rubinstein where White castles and Black has already struck d4 with …c5. With knights swapped on f6 and the center fluid, Black has a free, weakness-free game and clear development to …Be7, …O-O, and …b6. The d4-pawn, no longer guarded by a knight, is the standing target — Black coordinates rooks on c8 and d8 and presses it while completing his harmonious setup.", sayShort: "Rubinstein — …c5 break, target d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N207: SublineNarration = {
  intro: { say: "This is the Rubinstein where White develops the dark-squared bishop to e3 to bolster d4 against Black's …c5 strike. Black is solid and symmetrical in feel, with knights traded on f6 and no weaknesses to defend. The plan is …cxd4 and …Bc5 hitting e3, or …Be7 and …O-O with …b6 and …Bb7 — Black contests d4 and develops his pieces to their natural, harmonious squares for full equality.", sayShort: "Rubinstein — …c5 challenges the d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N208: SublineNarration = {
  intro: { say: "Bg5 — White develops with a pin on the f6-knight now that the c5-pawn has been traded off. Unravel calmly: …O-O tucks the king away and a later …Be7 or …h6 breaks the pin. With your bishop already active on c5 and the structure symmetrical, Black has easy, equal piece play.", sayShort: "Bg5 — castle, then break the pin." },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N209: SublineNarration = {
  intro: { say: "This is the Rubinstein where White pins the recaptured f6-knight with Bg5 after Black has struck the center with …c5. Black is solid with a symmetrical feel and no structural weaknesses to defend. The plan is …Be7 to break the pin or …cxd4 first, then …b6 and …Bb7 to command the long light diagonal; once developed, Black challenges the d4-pawn and reaches a comfortable, balanced middlegame.", sayShort: "Rubinstein — break the pin, …c5 strikes d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N210: SublineNarration = {
  intro: { say: "This is the Rubinstein where White interposes a check on b5 after the center has opened with dxc5 and …Bxc5. Black simply blocks with …Bd7 or …Nd7, trading off White's developed bishop and easing any pressure. With the structure symmetrical and the c5-bishop active toward f2, Black completes …O-O and …Qe7, reaching an open, equal middlegame where his harmonious pieces are at least White's match.", sayShort: "Rubinstein — block the check, …Bd7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N211: SublineNarration = {
  intro: { say: "This is a sharp gambit sideline where White sacrifices a pawn with Bc4 and f3 to open lines, but Black grabs material and pushes the passed e-pawn deep to e2, hitting White's pieces. With the extra pawn far advanced to e2 attacking the f1-square and …b5 having gained queenside space, Black is materially ahead and structurally fine if it consolidates. The plan is to return some material if needed to complete development and castle, holding the extra pawn and White's compensation at bay.", sayShort: "Gambit line — …e2 passer, extra pawn" },
  sources: ['concept:pawn-passed', 'concept:tac-sacrifice'],
};

const N212: SublineNarration = {
  intro: { say: "This is the Classical main line where White develops the bishop actively to c4, aiming at the f7-square and the a2-g8 diagonal. Black is unbothered: the light bishop is safely tucked on h7, the knight is on d7, and …e6 will blunt the c4-bishop and prepare normal development. Black's structure is the rock-solid Caro setup, so the plan is …e6, …Ngf6, …Bd6 and castling, neutralising the c4-bishop and reaching the familiar balanced middlegame.", sayShort: "Classical — meet Bc4 with …e6" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N213: SublineNarration = {
  intro: { say: "This is the Advance Variation, the point of the whole defence: the light-squared bishop reached f5 before …e6 locked it in, so Black has none of the bad-bishop problems of the French. With the pawn chain d4-e5 set, Black develops the knight to d7 heading for f8 or b6, and prepares the freeing …c5 strike at the base of White's chain. The bishop on f5 and pawn on e6 give Black a solid, harmonious structure with a clear plan against d4.", sayShort: "Advance — good bishop on f5" },
  sources: ['concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N214: SublineNarration = {
  intro: { say: "This is the Classical Caro-Kann main line with opposite-side castling: White's king tucks to b1 for safety before launching the queenside-supported pawns and pieces at Black. Black has the textbook structure — the bishop traded off via h7, knights on d7 and f6, bishop to e7, ready to castle short and meet the coming storm. The plan is to complete development, contest the centre with …c5, and use the solid pawn wall to absorb White's kingside space while counterattacking on the other wing.", sayShort: "Classical main — castle into the storm" },
  sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N215: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack reaching its main tabiya, where Black pins the c3-knight with …Bb4 to add pressure on the centre. White's c4 created an isolated-queen's-pawn type struggle, and Black's plan is the standard one: pin and pressure c3, recapture on d5 when White exchanges, and blockade the d4-pawn with a knight on c6. The bishop on b4 fights for the central dark squares and discourages White from a free hand in the centre.", sayShort: "Panov — …Bb4 pins and pressures" },
  sources: ['concept:tac-pin', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N216: SublineNarration = {
  intro: { say: "This is the Classical Caro-Kann reached via the Nd2 move order, leading to the same main-line structure after Black develops the light bishop to f5 and g6. With knights heading to d7 and f6 and the bishop secured by …h6, Black has the standard sound setup and none of the French's problems. The plan is to trade off the light bishop when White plays Bd3, complete development, castle, and break with …c5 — a reliable, well-mapped position for Black.", sayShort: "Classical via Nd2 — standard setup" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N217: SublineNarration = {
  intro: { say: "This is the Classical main line with opposite-side castling, where White posts the knight on e5, the central outpost supported by the d4-pawn. Black is fully prepared: the light bishop is already traded off, the knights and bishop are developed, and …Nxe5 or …O-O keeps everything solid. Black castles short and meets White's pawn-storm ambitions with the rock-solid Caro structure, looking to break with …c5 and counter on the queenside near White's king.", sayShort: "Classical — e5 outpost, castle short" },
  sources: ['concept:pos-outpost', 'concept:pos-king-safety'],
};

const N218: SublineNarration = {
  intro: { say: "This is the Classical main line where White, instead of castling long for the pawn storm, tucks the king short on g1 for a quieter, positional game. Black has the textbook setup — light bishop traded via h7, knights on d7 and f6, pawn on e6 — and now simply completes with …Bd6 or …Be7 and …O-O. With kings on the same side, the game becomes a manoeuvring struggle, and Black's solid structure plus the …c5 break give a comfortable, well-understood position.", sayShort: "Classical — short castling, quiet game" },
  sources: ['concept:pos-king-safety', 'concept:pos-development'],
};

const N219: SublineNarration = {
  intro: { say: "This is the Classical main line where White grabs central space with c4 instead of castling, building a broad pawn front. Black has the standard solid structure — light bishop traded off via h7, knights on d7 and f6, pawn on e6 — and meets the central expansion with sound development and the …c5 break. Black continues with …Bd6 or …Bb4 and castling, then strikes at White's centre, confident that the well-coordinated Caro setup neutralises the extra space.", sayShort: "Classical — meet c4 with …c5 break" },
  sources: ['concept:pos-center', 'concept:pos-development'],
};

const N220: SublineNarration = {
  intro: { say: "This is the Advance Variation where White develops the knight to c3, putting a question to Black's grip on d5 and eyeing the b5 and e4 squares. Black continues developing with …Nd7, preparing …c5 and …Ne7 or …Nb6 to bolster the centre. The good bishop on f5 remains Black's pride: it is outside the pawn chain, so Black plays a French-type position without the bad bishop, aiming the …c5 break at the base on d4.", sayShort: "Advance — develop, prepare …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N221: SublineNarration = {
  intro: { say: "This is the Advance Variation in its most solid form: White buttresses the d4-e5 chain with c3 and develops modestly with Be2. Black has the ideal Caro setup — the good bishop on f5 outside the chain, the knight on d7 heading for f8 or b6, and the …c5 break ready against the base on d4. The plan is …c5, …Qb6 and …Nc6, pressuring d4 from a healthy structure where, unlike the French, the light-squared bishop is already a happy, active piece.", sayShort: "Advance — solid setup, prepare …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N222: SublineNarration = {
  intro: { say: "This is an Advance Variation where White expands in the centre with c4 to challenge d5, and Black flexibly reroutes the knight to e7 to support the centre and head for g6 or f5. The good bishop already stands on f5 outside the chain, and Black keeps the d5-pawn defended while preparing the …c5 break or …Nbc6. The plan is to meet White's central ambition with sound development, contesting d4 and e5 from the Caro's trademark healthy structure.", sayShort: "Advance — …Ne7 holds d5" },
  sources: ['concept:pos-center', 'concept:pos-development'],
};

const N223: SublineNarration = {
  intro: { say: "This is the Advance Variation where White plays h3 to control g4, but Black launches the full queenside plan: …c5 against d4, …c4 to clamp, and …c3 to wedge deep into White's camp. The pawn on c3 cramps White and fixes the queenside, while the good bishop on f5 stays active outside the chain. Black plays for the queenside space advantage and the long-term restraint of White's pieces, the Caro structure paying off with no bad bishop to worry about.", sayShort: "Advance — …c3 wedges the queenside" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N224: SublineNarration = {
  intro: { say: "This is the Advance Variation where White develops the bishop to g5 and Black answers with the full queenside pawn rush: …c5 against d4, …c4 to clamp, and …c3 to wedge into White's camp. The pawn on c3 cramps White and fixes the queenside structure, while the good bishop on f5 remains active outside the chain. Black plays for the queenside space and the long-term restraint, the Caro structure rewarding Black with the freer game and no bad bishop.", sayShort: "Advance — …c3 deep queenside wedge" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N225: SublineNarration = {
  intro: { say: "This is the Advance Variation where White plays the useful waiting move a3 to take b4 away from Black's pieces before developing Be2. Black calmly develops with …Nd7 heading for f8 or b6 and prepares the thematic …c5 break against the base of the d4-e5 chain. The good bishop on f5 sits outside the chain as Black's pride, so the plan is …c5, …Qb6 and …Nc6, fighting for d4 from the Caro's healthy, no-bad-bishop structure.", sayShort: "Advance — develop, ready …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N226: SublineNarration = {
  intro: { say: "This is the Advance Variation where White's h4-h5 gain of kingside space is met by …h5 freezing the pawns, then the bishops are traded on d3. Black has already played the thematic …c5 against d4 and now pushes …c4, gaining queenside space and a clamp while fixing White's queenside pawns. With the good bishop already exchanged on its own terms, Black has a healthy structure and a clear plan of …Qb6, …Nc6 and a minority-style queenside expansion.", sayShort: "Advance — …c4 clamps the queenside" },
  sources: ['concept:pos-space', 'concept:pawn-chain'],
};

const N227: SublineNarration = {
  intro: { say: "This is the Advance Variation where Black has already struck with …c5 against the base of White's d4-e5 chain, and White props the centre up with c3. With the good bishop on f5, the knight on d7, and pawns on c5 and e6, Black presses on d4 and can pile up with …Qb6, …Nc6 or …cxd4 to open lines. The whole point of the early …Bf5 shows here: Black plays a French-style position without the bad bishop, fighting for the centre from a healthy footing.", sayShort: "Advance — …c5 hits d4's base" },
  sources: ['concept:pawn-chain', 'concept:pos-center'],
};

const N228: SublineNarration = {
  intro: { say: "This is a sharp Advance line where White lunges with g4 to harass the f5-bishop and h4-h5 to gain kingside space, and Black answers …h5 to fix the pawns and keep the bishop. The bishop retreats safely to g6, Black has already struck with …c5 against d4, and the kingside pawns are blunted before they can roll. Black's structure stays sound, the good bishop survives, and the …c5 break gives clear counterplay against White's overextended kingside.", sayShort: "Advance — …h5 stops the g4-h4 storm" },
  sources: ['concept:att-kingside-storm', 'concept:pos-space'],
};

const N229: SublineNarration = {
  intro: { say: "This is the Two Knights line where White recaptures on f3 with the g-pawn, accepting doubled f-pawns and an open g-file for active rook play in exchange for the bishop pair. Black exploits the structural concession: …e6, …Nf6 and the …c5 break challenge the centre and target White's damaged kingside pawns. With White's king cover compromised by the doubled f-pawns, Black plays for the better structure and can aim at the weakened f-pawns and the half-open files in the long game.", sayShort: "Two Knights — …c5, target doubled f-pawns" },
  sources: ['concept:pawn-doubled', 'concept:pos-center'],
};

const N230: SublineNarration = {
  intro: { say: "This is the Two Knights line that has transposed to a full centre, where White pins the f6-knight with Bg5 and Black hits back with the …c5 break against d4. Having given up the bishop for the f3-knight, Black is happy to open the position only on its own terms: …c5 challenges the centre and frees the position. The pin on f6 is not dangerous because Black can meet it with …Be7 or …cxd4, and the central tension favours the side with the sounder structure.", sayShort: "Two Knights — …c5 strikes the centre" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N231: SublineNarration = {
  intro: { say: "This is the Two Knights line transposed to a full centre where White releases tension with exd5, and Black hits back immediately with …c5 to fight for the centre rather than recapture passively. Having traded the light bishop for the f3-knight, Black uses the …c5 break to open lines and free the position on its own terms. The dynamic …c5 challenges d4 and d5, generating active piece play and ensuring Black is not left with a cramped structure against White's bishop pair.", sayShort: "Two Knights — …c5 fights the centre" },
  sources: ['concept:pos-center', 'concept:pos-initiative'],
};

const N232: SublineNarration = {
  intro: { say: "This is a quiet King's-Indian-Attack treatment where the queens come off on d1 and White's king sits on d1 after recapturing. Black is fine: the knight develops to f6 hitting e4, the bishop heads to g7 on the long diagonal, and …c5 grabs central space and a queenside pawn majority. With no queens on, White's king on d1 is more a liability than an asset, and Black plays for the better structure and smooth development.", sayShort: "Queenless — …c5 and …g7 bishop" },
  sources: ['concept:pawn-majority', 'concept:pos-development'],
};

const N233: SublineNarration = {
  intro: { say: "This is the Two Knights line transposed to a full centre where White supports d4 with Be3 and Black strikes with …c5 to fight for the centre. Having traded the light bishop for the f3-knight, Black opens the position on its own terms with …c5, challenging d4 and freeing the game. The dynamic break ensures active piece play and a sound structure, neutralising White's bishop pair by keeping the position fluid rather than letting White clamp down.", sayShort: "Two Knights — …c5 strikes the centre" },
  sources: ['concept:pos-center', 'concept:pos-initiative'],
};

const N234: SublineNarration = {
  intro: { say: "This is the Two Knights setup where Black traded the light-squared bishop for the f3-knight, handing White the bishop pair but in a closed, solid position. With White's queen on f3 and bishop tucked to e2, Black slams the door with …d4, gaining space and shutting White's knight out of d5 and c4. The pawn on d4 cramps White and gives Black a clear queenside and central plan, neutralising the bishops in a blocked structure.", sayShort: "Two Knights — …d4 cramps White" },
  sources: ['concept:pos-space', 'concept:pos-bishop-pair'],
};

const N235: SublineNarration = {
  intro: { say: "This is the Two Knights structure where White keeps the centre modest with d3 and Black grabs space with the …d4 wedge. Having traded the light bishop for the f3-knight, Black neutralises White's bishop pair by closing the position, and the pawn on d4 kicks the c3-knight and cramps White. The knight on d7 reroutes toward the kingside or c5, and Black plays comfortably for the queenside and the central clamp.", sayShort: "Two Knights — …d4 space clamp" },
  sources: ['concept:pos-space', 'concept:pawn-chain'],
};

const N236: SublineNarration = {
  intro: { say: "This is an Exchange-style line where White posts the knight aggressively on e5 and pins with Bb5, but Black is solidly placed with the lone d-pawn structure. The knight on c6 and the pawn on e6 support the centre, and …Bd7 calmly unpins and offers to trade off White's active pieces. Black's structure is sound and symmetric, so the plan is to exchange White's e5-knight and b5-bishop, complete development, and reach a comfortable balanced middlegame.", sayShort: "Exchange — …Bd7 unpins, trades off" },
  sources: ['concept:tac-pin', 'concept:pos-development'],
};

const N237: SublineNarration = {
  intro: { say: "This is the Two Knights structure where White fianchettoes with g3 to activate the light-squared bishop, and Black answers with the …d4 space-grab. Having traded off the light bishop, Black blunts White's bishop pair by closing the centre, and the pawn on d4 evicts the c3-knight and seizes territory. Black plays for the queenside and the central clamp, leaving White's fianchettoed bishop biting on the granite of Black's pawn chain.", sayShort: "Two Knights — …d4 against the fianchetto" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto'],
};

const N238: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack reaching the main isolated-queen's-pawn tabiya after the early cxd5 and …Nxd5. Black pins the c3-knight with …Bb4, the standard plan to pressure the centre and the d4-pawn that will become isolated. With the knight centralised on d5 and the bishop fighting for the dark squares, Black's pieces are active and well placed to blockade and round up White's lone d-pawn over the long game.", sayShort: "Panov — …Bb4, blockade d4" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin'],
};

const N239: SublineNarration = {
  intro: { say: "This is a Panov sideline where White advances c5 to gain queenside space rather than keep the tension, and Black fianchettoes with …g6 and …Bg7 to pressure the long diagonal and the d4-pawn. With the bishop on g7 bearing down on d4 and the …e5 or …b6 breaks available, Black undermines White's advanced c5-pawn and central structure. White's Bb5+ is a developing check; Black blocks with …Nc6 or …Bd7 and continues fighting for the dark squares and the central breaks.", sayShort: "Panov — …g7 bishop hits d4" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center'],
};

const N240: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack, a true isolated-queen's-pawn battle where the d-file and the d5/e5 squares decide everything. Black has the standard piece play: the bishop pinned the c3-knight, …Nxd5 centralised, and the knight on c6 blockades d4. White's Bb5 adds pressure and threatens to damage Black's structure, so Black continues with …Be7 and castles, treating White's isolated d-pawn as the long-term target.", sayShort: "Panov — blockade the isolated d-pawn" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N241: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White builds the natural setup with the bishop on d3 and develops the dark-squared bishop to f4. Black has a comfortable mirror structure with the lone d-pawn and the knight already on c6 covering e5. The reply is to develop the bishop to g4 to pin or trade White's f3-knight and pressure d4, then complete development with …e6 and …Bd6, contesting the dark squares White is trying to claim.", sayShort: "Exchange — meet Bf4 with …Bg4" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N242: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack where White trades knights on d5, after which Black recaptures and keeps the typical IQP setup with active pieces. The bishop on b4, the knight on c6 blockading d4, and the half-open files give Black plenty of counterplay against White's isolated d-pawn. Black's plan is clear: restrain and round up the d4-pawn, finish development, and use the d5 and e4 squares as outposts for the pieces.", sayShort: "Panov — recapture, target d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N243: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack where White inserts a3 to question the b4-bishop in the isolated-queen's-pawn middlegame. Black has the typical strong setup: …Nxd5 centralised the knight, the knight on c6 blockades d4, and the bishop pressures the centre. Black can retreat the bishop to e7 or trade on c3 and then settle the pieces around the d4-pawn, the long-term weakness Black aims to restrain and win.", sayShort: "Panov — a3 questions the b4-bishop" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N244: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack where White trades the knight on d5 after both sides have castled and developed, simplifying toward the isolated-queen's-pawn endgame battle. Black recaptures and keeps the standard plan: the knight on c6 blockades d4, the bishop on b4 pressures the dark squares, and the pieces swarm the lone d-pawn. With sound development and active pieces, Black restrains and targets White's isolated d4-pawn as the game's long-term weakness.", sayShort: "Panov — recapture, blockade d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N245: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack where both sides have castled and developed, and White plays a3 to ask the b4-bishop its intentions in the isolated-queen's-pawn middlegame. Black has the ideal setup: the knight on d5 is centralised, the knight on c6 blockades d4, and the bishop pressures the centre. After retreating to e7 or trading on c3, Black settles the pieces around the lone d-pawn and plays the standard plan of restraining and eventually winning White's isolated pawn.", sayShort: "Panov — a3 questions the bishop" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N246: SublineNarration = {
  intro: { say: "This is the Panov-Botvinnik Attack where White develops the bishop actively to c4, hitting the d5-knight and eyeing f7 in this isolated-queen's-pawn battle. Black is solidly placed: the knight on c6 blockades d4, the bishop on b4 pins and pressures the centre, and …Be7 or …Be6 completes development while neutralising the c4-bishop. Black's plan remains the classic one — restrain and target White's isolated d-pawn, using the d5 and c6 blockading squares as anchors.", sayShort: "Panov — meet Bc4, blockade d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N247: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where Black's …e5 counter met White's broad centre and the game became a locked pawn struggle, with Black grabbing queenside space via …c5-c4 and …a6. White's b3 challenges the c4-pawn, and Black supports it with …a6 preparing …b5, building a queenside pawn chain. Black plays for space and the …b5-b4 break against White's queenside, while White's loosened structure from the early f3 and b3 gives Black a comfortable game.", sayShort: "Fantasy — queenside chain with …c4, …a6" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N248: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where Black's …e5 broke the centre and White develops the bishop to e3 to defend d4, but Black plays …c5 and …c4 to fix the queenside and gain a clamp. With the bishop pinning the f3-knight and the …c4 wedge restraining White's b- and queenside pawns, Black has space and a clear plan. The push …c4 grabs territory and prepares …b5-b4, while the e5-pawn anchors the centre against White's slightly loosened position.", sayShort: "Fantasy — …c4 clamps the queenside" },
  sources: ['concept:pos-space', 'concept:tac-pin'],
};

const N249: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where White captured on e5 and Black, rather than regain the pawn at once, rolls the queenside with …c5, …c4 and …c3, wedging deep into White's camp. The pawn on c3 cramps White and fixes the queenside, while Black will round up the e5-pawn or generate piece pressure to restore material. Black plays for the space advantage and the long-term restraint, exploiting the weaknesses the early f3 and the queenside advances created in White's structure.", sayShort: "Fantasy — …c3 wedge, regain e5" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N250: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where White pushes d5 to lock the centre after Black's …e5, and Black rolls the queenside with …c5, …c4 and …c3 to clamp and wedge into White's camp. With the centre fixed, the play shifts to the wings: the …c3 pawn cramps White's queenside, and Black prepares …b5-b4 and minor-piece manoeuvres behind the pawn chain. Black plays for the queenside space advantage in a locked position where White's early f3 left lasting structural soft spots.", sayShort: "Fantasy — locked centre, …c3 wedge" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N251: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where Black's …e5 broke the centre and White develops quietly with Be2, but Black seizes space with …c5 and the …c4 clamp on the queenside. The bishop on g4 still pins the f3-knight, pressuring d4, and the …c4 wedge fixes White's pawns and prepares …b5-b4. Black has a healthy, spacious position with the e5-pawn anchoring the centre, exploiting the slight weaknesses the early f3 left in White's camp.", sayShort: "Fantasy — …c4 grabs queenside space" },
  sources: ['concept:pos-space', 'concept:tac-pin'],
};

const N252: SublineNarration = {
  intro: { say: "This is the Fantasy Variation, where Black struck the …e5 counterblow against White's broad pawn centre and White has just released the tension with dxe5. With the bishop pinning the f3-knight and both knights coming to f6 and d7, Black regains the e5-pawn smoothly and reaches an open, comfortable position. The point of …e5 was to break White's grip on the centre before it became a steamroller, and Black emerges fully developed with no weaknesses.", sayShort: "Fantasy — …e5 break frees Black" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N253: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where White released the centre with dxe5 and Black, instead of regaining the pawn at once, expands with …c5 and …c4 to clamp the queenside. The bishop on g4 pins the f3-knight, and the e5-pawn will be recovered or pressured while Black grabs space with the …c4 wedge. Black's plan is the thematic queenside expansion with …b5-b4, exploiting the loosened white structure from f3 while keeping piece activity and the initiative.", sayShort: "Fantasy — …c4 space, regain e5" },
  sources: ['concept:pos-space', 'concept:pos-initiative'],
};

const N254: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where Black's …e5 counterblow met White's f3-centre, and White props the d4-pawn up with c3. With the bishop pinning the f3-knight and the knight developed to d7, Black holds the e5-strongpoint and is comfortably equal. The plan is to finish development with …Ngf6 and …Be7, castle, and exploit the slight loosening of White's structure from the early f3, knowing the centre is firmly contested.", sayShort: "Fantasy — …e5 strongpoint, develop" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N255: SublineNarration = {
  intro: { say: "This is the Fantasy Variation where Black's …e5 counter has fully contested the centre and White pins the f6-knight with Bg5. Black is comfortably developed: the bishop on g4 pins White's f3-knight in return, both knights are out, and the tension on d4/e5 is balanced. The plan is to maintain the strongpoint on e5, complete development with …Be7 and castle, treating White's loosened f-file as a feature Black can exploit rather than fear.", sayShort: "Fantasy — …e5 holds, mutual pins" },
  sources: ['concept:tac-pin', 'concept:pos-center'],
};

const N256: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White develops the knight to e2 rather than f3, and Black starts queenside operations with …a6, …a5 and …a4 to fix and pressure White's queenside pawns. With the symmetric lone-d-pawn structure, Black is fully equal and uses the minority-style …a4 advance to provoke weaknesses, after b3 chases it, on White's queenside. Black develops the rest naturally with …Nf6, …Bf5 or …Bg4 and …e6, playing for the queenside and the better minor-piece placement.", sayShort: "Exchange — …a4 probes the queenside" },
  sources: ['concept:pawn-minority-attack', 'concept:pos-development'],
};

const N257: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White jumps the knight to e5, the central outpost it has been angling for, hitting the g4-bishop and the d7-queen. Black is well placed to meet it: trading on e5 or challenging with …Bxe5 dissolves the outpost, and the symmetric structure means White has no real edge. The bishop on d6 already eyes the e5-square, so Black contests the centre and keeps the balanced lone-d-pawn position firmly in hand.", sayShort: "Exchange — challenge the e5 knight" },
  sources: ['concept:pos-outpost', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N258: SublineNarration = {
  intro: { say: "This is the symmetrical Exchange Caro-Kann with the dark-squared bishops already traded on d6. White lifts the rook to e1, eyeing the half-open e-file and the e5 break, but both sides own a lone d-pawn and the structure is balanced. With the queen settled on d6 and the knight on c6 holding e5, Black continues developing harmoniously and can challenge the centre with the rook on c8 or a timely …e5 of its own.", sayShort: "Symmetrical Exchange — rook eyes e-file" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N259: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White probes with Qb3 and then h3, questioning both the b7-pawn and the g4-bishop. Black is fully prepared: the queen on d7 defends b7 and supports the bishop, which can retreat to h5 or trade on f3. The symmetric lone-d-pawn structure offers full equality, so Black completes development with …e6 and …Bd6, contesting the e5 outpost and the e-file in a balanced, comfortable middlegame.", sayShort: "Exchange — …Qd7 covers b7, hold g4" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N260: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White plays h3 to question the bishop on g4 before completing development. Black can retreat to h5 or trade on a knight, keeping the symmetric lone-d-pawn structure firmly balanced. With the queen on d7 covering b7 against White's Qb3 probe and the pieces harmoniously placed, Black continues with …Bd6 and …O-O, reaching full equality where the e5 outpost and the e-file are the only fighting ground.", sayShort: "Exchange — h3 questions the bishop" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N261: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White grabs the b7-pawn with the queen, a greedy raid that hands Black the initiative. With the rook on a8 available to hit the queen and the open lines after …Rb8 or …O-O, Black develops with tempo and the b7-pawn was poison-pawn material rather than a real gain. Black's solid centre and lead in coordination more than compensate for the pawn, and the queen on b7 will have to scramble back while Black seizes the b-file.", sayShort: "Exchange — Qxb7 grab invites …Rb8" },
  sources: ['concept:pos-initiative', 'concept:pos-open-file'],
};

const N262: SublineNarration = {
  intro: { say: "This is the Exchange Caro-Kann where White preserves the dark-squared bishop with Bg3 instead of trading it on d6. Black's bishop on d6 still eyes the kingside dark squares, and with the structure fully symmetric, Black has comfortable equality from sound development. The plan is to complete with …O-O, contest the e5 outpost the knights are eyeing, and perhaps trade the dark-squared bishops on g3 or e5 to leave a balanced, easy-to-play position.", sayShort: "Exchange — Bg3 keeps the bishop" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N263: SublineNarration = {
  intro: { say: "This is the symmetrical Exchange Caro-Kann with the dark bishops traded and both kings castled, where White plays h3 to question the g4-bishop. Black has full equality: the queen on d6 is centralised, the knight on c6 holds e5, and the bishop can retreat to h5 or trade on f3 to reach a totally balanced lone-d-pawn structure. With everything developed, Black plays for the e5 break or piece pressure, comfortable in a position with no weaknesses.", sayShort: "Exchange — h3 nudges the g4-bishop" },
  sources: ['concept:pos-development', 'concept:pos-king-safety'],
};

const N264: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where Black recaptured toward the centre, gaining the half-open e-file and the bishop pair, and now castles into safety. White develops naturally with Nf3, but Black's structure is rich in resources: the doubled f-pawns control e5 and g5, and the bishop on d6 plus the coming …Re8 generate pressure. Black plays for the e-file and a kingside pawn break or central play, confident the bishop pair compensates for the structural concession.", sayShort: "Tartakower — castle, claim the e-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N265: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where Black recaptured toward the centre for the half-open e-file and the bishop pair, and White develops the bishop actively to c4 eyeing f7. Black calmly castles, after which …Re8 will pressure the e-file and the bishop on d6 supports kingside play. The doubled f-pawns grip e5 and g5, so Black is structurally robust and plays for the e-file and the two bishops, neutralising the c4-bishop with …Be6 or …Qc7 in due course.", sayShort: "Tartakower — castle, then …Re8" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N266: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where Black recaptured toward the centre, gaining the half-open e-file and the bishop pair, and now castles into safety while White develops with Be3 to defend d4. Black's structure is full of resources: the doubled f-pawns control e5 and g5, the bishop on d6 supports kingside play, and …Re8 will pressure the e-file. Black plays for the two bishops and the e-file, a sound and dynamic position where the structural concession is well compensated.", sayShort: "Tartakower — castle, two bishops, e-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N267: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where Black has the half-open e-file and the bishop pair after recapturing toward the centre, and White develops the bishop to e3 to block the check and defend d4. Black continues building: the rook pressures e-file, the bishop sits actively on d6, and …Nd7-f8 reroutes the knight to defend and prepare …Ng6. The doubled f-pawns are a feature, gripping e5 and g5, so Black plays for the e-file and a kingside or central break.", sayShort: "Tartakower — Be3 blocks the e-file check" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N268: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where White develops the bishop to d2 to connect the rooks and prepare queenside castling against Black's e8-rook check. Black has the trademark structure: the bishop on d6, the rook pressuring the e-file, and …h5 grabbing kingside space while the doubled f-pawns hold e5 and g5. Black continues with …Nd7-f8 and …Qc7, keeping the solid wall and aiming counterplay at whichever wing White commits its king.", sayShort: "Tartakower — e-file pressure builds" },
  sources: ['concept:pos-open-file', 'concept:pos-development'],
};

const N269: SublineNarration = {
  intro: { say: "This is the …exf6 (Tartakower) Classical line where Black recaptured toward the centre, giving up the symmetrical pawn for the half-open e-file and the bishop pair. With the rook already checking on e8, the bishop on d6, and the knight rerouting via f8, Black has a rock-solid kingside and active pieces. White's h3 is a slow prophylactic move; Black continues piling on the e-file and can expand with …Ng6 and …Qc7, confident the doubled f-pawns are a strength controlling e5 and g5.", sayShort: "Tartakower — e-file and bishop pair" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N270: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line where Black recaptured toward the centre for the half-open e-file and the bishop pair, and White plays h3 to restrain …Bg4 and …h4 ideas. Black has the trademark structure: the rook checks and pressures on e8, the bishop sits on d6, and …h5 has gained kingside space. The doubled f-pawns grip e5 and g5; Black continues with …Nd7-f8 and …Qc7, playing for the e-file and counterplay at whichever wing White commits its king.", sayShort: "Tartakower — h3 restrains Black's expansion" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N271: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line with opposite-side castling, where White reroutes the knight to g3 to eye f5 and h5. Black is fully mobilised: the rook controls the e-file, the bishop sits on d6, and the knight has rerouted via f8 to defend and prepare …Ng6. The doubled f-pawns grip e5 and g5, giving Black a sturdy kingside, so Black continues the e-file pressure and prepares queenside counterplay with …Qc7 and …b5 toward White's king.", sayShort: "Tartakower — knight to g3, hold e-file" },
  sources: ['concept:pos-open-file', 'concept:pawn-doubled'],
};

const N272: SublineNarration = {
  intro: { say: "This is the …exf6 Classical line with opposite castling, where White plants the knight on f4, aiming at the e6 and g6 squares and supporting a kingside push. Black has the standard solid setup: rook on e8, bishop on d6, knight rerouted to f8, and the …h5 pawn restraining White's expansion. The doubled f-pawns control e5 and g5, so Black is structurally sound and turns to counterplay against White's king with …Qc7 and the queenside pawns.", sayShort: "Tartakower — knight to f4, counter on queenside" },
  sources: ['concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N273: SublineNarration = {
  intro: { say: "White jumps the c3-knight into d5, but the …c6-pawn is right there to chase it: …cxd5 wins the knight, or after an exchange on f6 Black recaptures and stands fine. The point is that with the queen on a5 and the c6-pawn supporting the center, this Nd5 lunge has no lasting bite. Black answers …cxd5 (or …Nxd5) and emerges with a comfortable, solid structure, ready to develop the queenside and target d4.", sayShort: "Nd5 lunge — …cxd5 refutes it" },
  sources: ['concept:pos-center', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N274: SublineNarration = {
  intro: { say: "White jumps the knight to e4, offering to trade the f6-knight and unpin the a5-queen from the c3-knight. Black simply answers …Nxe4 or …Bxe4, removing the centralized knight and keeping a sound structure: the c6-pawn shields the queen, the f5-bishop is active, and the center holds. After the trade Black continues …Nd7, …Be7 and …O-O with a comfortable, weakness-free game; the Ne4 sortie achieves nothing lasting.", sayShort: "Ne4 traded off — Black stays solid" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N275: SublineNarration = {
  intro: { say: "White posts the knight aggressively on e5, eyeing f7 and the kingside. Black neutralizes it directly: …Nbd7 challenges the e5-knight, or …Bd6 hits it, and the trade leaves Black's structure intact. The c6-pawn shields the a5-queen, the f5-bishop covers key light squares including b1-h7, and the center holds. After dealing with the e5-knight, Black continues …Be7 and …O-O with a comfortable position.", sayShort: "Ne5 challenged by …Nbd7" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N276: SublineNarration = {
  intro: { say: "White tucks the bishop back to b3, sidestepping any …b5 or …Nd5 tempo on c4 and keeping the diagonal toward f7. Black's …Qa5 structure is fully sound: the c6-pawn screens the queen, the f5-bishop is active outside the chain, and …e6 holds the center. The plan is …Bb4 to pin the c3-knight, …Nbd7 and castling, then a …c5 break. With no weaknesses, Black equalizes comfortably against White's small space edge.", sayShort: "Bb3 retreats — Black plays …Bb4, …c5" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N277: SublineNarration = {
  intro: { say: "White plays the prophylactic h3, giving the king luft and ruling out any …Bg4 ideas before castling. Black's …Qa5 setup is fully sound: the c6-pawn screens the queen, the f5-bishop is active outside the chain, and …e6 secures the center. The plan is …Bb4 to pin the c3-knight, …Nbd7 and castling, then the …c5 break. The slow h3 lets Black complete development at ease in a balanced position.", sayShort: "h3 luft — Black plays …Bb4 and develops" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N278: SublineNarration = {
  intro: { say: "With kings still in the center, a3 immediately challenges the b4-bishop pinning the c3-knight. Black can take on c3 to inflict doubled pawns, or retreat …Bd6/…Be7 and keep the tension. The f5-bishop, the solid c6-pawn screening the a5-queen, and a coming …Nbd7 give Black a sound, harmonious setup; White still must decide where the king goes, and …Bxc3 makes long castling unappealing.", sayShort: "a3 questions …Bb4 before kings settle" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N279: SublineNarration = {
  intro: { say: "Both sides have committed to opposite wings: White castled long, Black's queen sits on a5 with …Bb4 pinning the c3-knight against the bigger picture. Now a3 questions that bishop, inviting …Bxc3 to damage White's queenside pawns right in front of the king. With the f5-bishop, the c6-pawn shielding the queen, and …Nbd7 ready to swing, Black's plan is a pawn storm with …b5-b4 against White's king on c1. Trading on c3 hands Black the classic opposite-castling attack.", sayShort: "Opposite castling — …Bxc3 cracks the king" },
  sources: ['concept:att-queenside-attack', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N280: SublineNarration = {
  intro: { say: "White develops Nf3 without the usual Nc3, so Black is in no hurry to retreat the queen: …Bg4 pins the f3-knight and …Nc6 develops toward d4, with the central queen on d5 well supported. Because White hasn't kicked the queen with Nc3, Black enjoys easy, rapid development. The plan is …O-O-O, …e6 or …e5, generating quick pressure while the f3-knight stays pinned.", sayShort: "No Nc3 — Black develops with tempo" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N281: SublineNarration = {
  intro: { say: "White finally tucks the king away with short castling instead of going long, sidestepping the opposite-wing race. The …Bb4 still pins the c3-knight, and Black continues …Nbd7, …O-O and …Qc7 or …Qd8, with the f5-bishop and c6-pawn forming the familiar rock-solid …Qa5 structure. With both kings on the kingside the game is more positional; Black eyes the …c5 break and pressure on d4.", sayShort: "Short castling avoids the storm" },
  sources: ['concept:pos-king-safety', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N282: SublineNarration = {
  intro: { say: "White finishes development with Be3, bolstering d4 and eyeing the b6-knight. Black is fully mobilized: castled, the b6-knight pressures c4, the c6-knight and g7-bishop both bear on d4. The natural follow-up is …Bg4 to pin the f3-knight and pile onto d4, or …e5 to strike the center directly. The position is a healthy Grünfeld-style setup where Black's piece pressure offsets White's space.", sayShort: "Be3 props d4 — Black hits center" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N283: SublineNarration = {
  intro: { say: "White opts for the modest c3, propping up d4 rather than grabbing space with c4. That choice frees the d5-knight from any harassment, so it sits proudly in the center while the g7-bishop and a coming …Nc6 press d4. Black plays …Nc6, …Bg4 or …c5 to open the position; with no c4-pawn to contest the center, Black's pieces are at least as active as White's.", sayShort: "Quiet c3 — d5-knight stays strong" },
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N284: SublineNarration = {
  intro: { say: "White supports d4 and develops with Be3, also nudging the b6-knight. Black has the ideal Modern Scandinavian setup: castled, the knight on b6 pressing c4, the g7-bishop trained on d4 down the long diagonal. The natural continuation is …Nc6 to add a second attacker on d4 and …Bg4 to pin the f3-knight, after which Black's piece pressure fully balances White's central space.", sayShort: "Be3 supports d4 — …Nc6 and …Bg4 next" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N285: SublineNarration = {
  intro: { say: "White slips in h3 to rule out the …Bg4 pin before deciding on c4. Black has the model Modern Scandinavian fianchetto: castled, the d5-knight centralized, the g7-bishop on the long diagonal trained at d4. With …Bg4 prevented, Black plays …Nc6 and …e5, or …Bf5 and …c5, striking at the center by other means. The h3 costs a tempo that helps Black organize the central pressure.", sayShort: "h3 prevents …Bg4 — Black hits d4 anyway" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N286: SublineNarration = {
  intro: { say: "White inserts h3 to deny Black the …Bg4 pin before continuing development. Black has the model Modern Scandinavian: castled, the b6-knight pressing c4, and the g7-bishop aimed at d4. With …Bg4 prevented, Black switches plans to …Nc6 and …e5 or …Bf5/…Be6, still hammering the d4-c4 center. The h3 spends a tempo, which Black uses to organize the assault on White's broad pawns.", sayShort: "h3 stops …Bg4 — Black plays …Nc6, …e5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N287: SublineNarration = {
  intro: { say: "White centralizes the rook to e1 on the half-open e-file before expanding. Black has the comfortable Modern Scandinavian fianchetto: castled, the d5-knight centralized, the g7-bishop bearing on d4 and beyond. The plan is …Nc6 to pressure d4, …c5 or …e5 to break, and …Bg4 or …Bf5 to develop the light bishop. Black's harmonious piece play matches White's small space edge.", sayShort: "Re1 on e-file — Black plays …Nc6, …c5" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N288: SublineNarration = {
  intro: { say: "White's Bb5+ check is a sideline that just provokes …Bd7 and then retreats to e2, having gained nothing — Black recaptures the pawn with …Nxd5 and stands well centralized. As White shuffles with a3 and b3, Black seizes the queenside initiative: …a5-a4 cramps White and opens lines, with …axb3 prising open the a-file for the rook. Black's lead in central activity translates straight into a queenside pawn storm.", sayShort: "Bb5+ achieves nothing — …a4 storms queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N289: SublineNarration = {
  intro: { say: "White grabs the full center with an early c4, kicking the d5-knight to b6 at once. Black is unbothered: the knight on b6 already eyes c4 and the fianchettoed g7-bishop targets d4 down the long diagonal. With …O-O, …Nc6 and …Bg4 coming, Black plays this like a reversed-tempo Grünfeld, pressuring the big center instead of fearing it.", sayShort: "Early c4 — Grünfeld-style center pressure" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N290: SublineNarration = {
  intro: { say: "White delays d4 with an early Nf3, but after …Nxd5, d4, …g6 the game transposes straight into the Modern Scandinavian fianchetto. The b6-knight pressures c4, the g7-bishop bears on d4, and Black plays the standard Grünfeld-style plan of …O-O, …Nc6 and …Bg4. The independent move order gives White nothing extra; Black meets the broad center with active piece play.", sayShort: "Transposes to Modern fianchetto setup" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N291: SublineNarration = {
  intro: { say: "When White tries to hold the extra pawn with c4 and c6, Black strikes with …cxd5, transposing into a Panov-style structure with a Nimzo flavor after …Bb4 pinning the c3-knight. The d5-pawn (now Black's after …cxd5) and the e6-point give a sound, classical center; the …Bb4 pin pressures e4 ideas and prepares …O-O. Black gets active, well-developed pieces with no structural concessions.", sayShort: "…cxd5 and …Bb4 — Nimzo-Panov pin" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N292: SublineNarration = {
  intro: { say: "This is the Icelandic-Palme Gambit: Black sacrificed a pawn with …e6 to blast open lines, regaining nothing material yet but with a huge lead in development. After dxe6 Bxe6, the bishop hits c4 and …Bb4+ pins, with the queen on e7 eyeing the center. White's Qe2 offers a trade, and …a6 keeps the structure flexible, preventing Nb5 and preparing …Nc6 and …O-O-O with raking pressure for the pawn.", sayShort: "Icelandic Gambit — development for a pawn" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N293: SublineNarration = {
  intro: { say: "In the Icelandic Gambit White returns to safety with Be2, declining to cling to the extra pawn. Black has full compensation: the e6-bishop and …Bb4+ pin, the queen on e7 bearing down the e-file at the white king. The plan is …Nc6, …O-O-O and …Rd8 with pressure along the open lines; Black's lead in development and active pieces fully justify the pawn given on e6.", sayShort: "Icelandic Gambit — lead in development" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N294: SublineNarration = {
  intro: { say: "White develops Nc3 in the Icelandic Gambit, which walks into the …Bb4 pin already set up. Black has full compensation for the e6-pawn: the e6-bishop pressuring c4, the b4-bishop pinning the c3-knight, and the queen on e7 eyeing the e-file. The plan is …O-O-O and …Nc6 with fast, harmonious development; capturing on c3 would also wreck White's queenside pawns. Black's initiative is well worth the pawn.", sayShort: "Nc3 walks into the …Bb4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N295: SublineNarration = {
  intro: { say: "In the Icelandic Gambit White tries Qa4+ to grab a tempo and trade off Black's active bishop, but …c6 calmly blocks the check and supports the center. Black keeps the b4-bishop pinning ideas and the e6-bishop hitting c4, with the queen on e7 lined up on the e-file. After …c6 the white queen on a4 is offside, and Black continues …O-O, …Nbd7 with full development and lasting pressure for the pawn.", sayShort: "Qa4+ met by …c6 — queen offside" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N296: SublineNarration = {
  intro: { say: "This is the Modern Scandinavian: instead of recapturing with the queen, Black grabbed d5 with the knight and now fianchettoes. White's broad c4-d4 center looks imposing, but the knight already retreated to b6 to hit c4, and the g7-bishop rakes the long diagonal straight at d4. Black's plan is …O-O, …Nc6 and a later …Bg4 or …e5, chipping at the center rather than blocking it.", sayShort: "Modern Scandinavian — fianchetto, pressure the center" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N297: SublineNarration = {
  intro: { say: "In the Icelandic Gambit White prods the b4-bishop with a3, and Black keeps the structure flexible with …a6, declining to trade on d2 and instead preparing …Nc6 and queenside castling. Black has rich compensation for the e6-pawn: the e6-bishop hitting c4, the e7-queen on the open e-file, and a big lead in development. The plan is …O-O-O, …Rd8 and active piece play; White's extra pawn is hard to make count.", sayShort: "a3 prods …Bb4 — …a6 keeps tension" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N298: SublineNarration = {
  intro: { say: "White lunges d5 to gain space and hit the e6-bishop, but the pawn is over-extended: …a6 prepares to round it up, and the bishop simply steps to d7 or g4. In the Icelandic Gambit Black's development advantage is decisive — the b4-bishop pins, the e7-queen eyes the e-file, and …Nbd7, …O-O-O will pile onto the loose d5-pawn. The advanced pawn becomes a weakness rather than a strength.", sayShort: "d5 over-extends — Black rounds it up" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N299: SublineNarration = {
  intro: { say: "White develops Nf3 in the Icelandic Gambit, reinforcing d4 and preparing to castle out of the pin. Black has full compensation for the e6-pawn: the e6-bishop hitting c4, the b4-bishop pinning toward d2, and the queen on e7 commanding the e-file at White's uncastled king. The plan is …Nc6, …O-O-O and …Rd8, throwing every piece into the open position; the pawn deficit is well offset by the initiative.", sayShort: "Nf3 props d4 — Black keeps initiative" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N300: SublineNarration = {
  intro: { say: "White develops Be3 to reinforce d4 in the …Qd6 system. Black's setup is already harmonious: the queen safe on d6, …a6 covering b5, the bishop active on f5 outside the pawn chain. The plan is …e6, …Be7, …Nbd7 and …O-O, then the central …c5 break. With every piece working and no weaknesses to attack, Black is fully comfortable against White's small space edge.", sayShort: "Be3 props d4 — …Qd6 stays solid" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N301: SublineNarration = {
  intro: { say: "In the …Qd6 system White develops Bg5, pinning the f6-knight and eyeing the kingside. Black is comfortably set: the queen rests safely on d6, …a6 covers b5, the f5-bishop is outside the pawn chain, and …e6 has solidified the center. The plan is …Be7 to break the pin, …Nbd7 and …O-O, with the harmonious structure leaving White nothing concrete to attack.", sayShort: "Bg5 pin met by …Be7 setup" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N302: SublineNarration = {
  intro: { say: "White centralizes the rook to e1, supporting a future d4-d5 or e-file pressure. Black's …Qd6 setup is fully harmonious: the queen safe on d6, …a6 stopping Nb5, the bishop developed to f5 outside the pawn chain, and …e6 solidifying. The plan is …Be7, …Nbd7 and …O-O, after which Black looks to the …c5 break to free the position. There is nothing for White to target.", sayShort: "Re1 centralizes — Black completes setup" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N303: SublineNarration = {
  intro: { say: "In the …Qd6 main line White chooses a restrained g3 setup, planning Bg2 and a fianchetto rather than the sharp Bc4 systems. Black answers …Bg4, pinning the f3-knight to the queen and developing with tempo before White's bishop reaches g2. The point is that the d4-pawn becomes a target once the f3-knight is tied down; …Nc6 and …e6 or …e5 follow. The …a6 already rules out any Nb5 hop at the queen.", sayShort: "g3 fianchetto — …Bg4 pins f3" },
  sources: ['concept:tac-pin', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N304: SublineNarration = {
  intro: { say: "White completes development with Be3, reinforcing d4. Black's …Qd6 setup is fully in place: queen safe on d6, …a6 ruling out Nb5, bishop active on f5, and …e6 securing the center. The plan is …Be7 or …Bb4, …Nbd7 and …O-O, then the freeing …c5 break. With every piece harmoniously placed and no weaknesses, Black has comfortably solved the opening.", sayShort: "Be3 supports d4 — Black harmonious" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N305: SublineNarration = {
  intro: { say: "White develops Bg5, pinning the f6-knight before castling. In the …Qd6 system Black is well placed: the queen safe on d6, …a6 stopping Nb5, and the bishop active on f5. Black breaks the pin with …Nbd7 or …e6 and …Be7, then …O-O. The mirrored development leaves no weaknesses, and Black aims for the freeing …c5 or …e5 break with a comfortable, classical game.", sayShort: "Bg5 pin — Black unties with …Be7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N306: SublineNarration = {
  intro: { say: "White plays h3 to give the king luft and prevent any …Bg4 pin. Black's …Qd6 structure is rock-solid: queen on d6, …a6 stopping Nb5, the f5-bishop developed outside the chain, …e6 anchoring the center. The plan is …Be7, …Nbd7 and …O-O, with the …c5 break to come. The h3 is a small slow move that lets Black complete development at leisure with a sound position.", sayShort: "h3 gives luft — Black finishes development" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N307: SublineNarration = {
  intro: { say: "White inserts h3 to give the king luft and forestall …Bg4 ideas. Black's …Qd6 setup is already harmonious: queen on d6, …a6 ruling out Nb5, the bishop developed to f5 outside the pawn chain. The plan is …e6, …Be7, …Nbd7 and …O-O, then the central …c5 break. The slow h3 simply lets Black finish developing in comfort with a sound, weakness-free structure.", sayShort: "h3 luft — Black develops smoothly" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N308: SublineNarration = {
  intro: { say: "White grabs the center with d4 and develops Nf3 and Be2; Black has hit the d4-pawn with …Nc6 and now pins the f3-knight with …Bg4. Because White never played Nc3 to kick the queen, Black keeps the active queen on d5 and a lead in piece activity. The plan is …O-O-O, …e6 and piling onto d4 with …Bxf3 and …e5 or doubling on the d-file. Black's harmonious development fully offsets White's central space.", sayShort: "…Bg4 pins f3 — pressure on d4" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N309: SublineNarration = {
  intro: { say: "Black recaptured d5 with the queen only after trading the light-squared bishops on e2, eliminating White's good bishop and easing the cramped Scandinavian. When White expands with c4, …e5 strikes back in the center at once: opening lines while Black is comfortably developed. After dxe5 the queen recaptures with tempo or Black plays …Nc6 and the position simplifies toward easy equality with no bad pieces left.", sayShort: "Bishops traded — …e5 breaks the center" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N310: SublineNarration = {
  intro: { say: "After the early …Bg4 and the trade on e2, Black recaptured d5 with the queen and faces White's solid but passive c3. With the light-squared bishops gone Black has no bad piece, and as White marks time with a3, Black seizes queenside space: …a6 and …a5-a4 cramp White's b-pawn and prepare to open the a-file. The plan is …Nc6, …e6, …Be7 and …O-O, with a small but pleasant initiative on the queenside.", sayShort: "Bishops off — …a5 grabs queenside space" },
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N311: SublineNarration = {
  intro: { say: "White develops the knight to c3 hitting the d5-queen, and Black answers …e5 in the center. The bishops are already off the board after …Bxe2, so Black has no problem piece to manage; the queen steps aside and …e5 frees the position. With …Nc6, …Bb4 or …Bd6 and …O-O to come, Black equalizes comfortably — the early trade of light-squared bishops took the sting out of White's space.", sayShort: "Nc3 hits queen — …e5 frees Black" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N312: SublineNarration = {
  intro: { say: "With the light-squared bishops traded on e2 and the queen recapturing d5, White develops Be3 to guard d4. As White shuffles with a3, Black takes queenside space: …a6 and …a5-a4 cramp the b-pawn and prepare to open the a-file. Black has no bad piece and an active centralized queen; the plan is …Nc6, …e6, …Be7 and …O-O with a comfortable game and queenside initiative.", sayShort: "…a5-a4 seizes queenside space" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N313: SublineNarration = {
  intro: { say: "White develops Nc3 hitting the d5-queen, which slides aside, and as White marks time with a3 Black grabs queenside space with …a5-a4. The light-squared bishops are off the board after …Bxe2, so Black has no problem piece; the queen is active and …Nc6, …e6, …Be7 and …O-O follow. The …a4 advance cramps White's b-pawn and gives Black a pleasant initiative on the queenside in a fully equal position.", sayShort: "…a4 cramps queenside — Black easy game" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N314: SublineNarration = {
  intro: { say: "White plays the solid c3 to shore up d4 after both sides have completed kingside development. With the light-squared bishops already traded on e2, Black has no bad piece and the queen sits actively on d5; …Nc6 presses d4 and …Bd6 or …Be7 with …O-O follows. The c3-pawn means White won't be challenging the center with c4, so Black's pieces have free rein for an easy, balanced game.", sayShort: "c3 props d4 — Black fully equal" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N315: SublineNarration = {
  intro: { say: "White develops the knight to c3, hitting the d5-queen which steps to a safe square. With the bishops already swapped on e2, Black has no problem piece and an active queen; …Nc6 pressures d4 and …Bb4 or …Bd6 with …O-O completes development. The early …Bxe2 trade is the whole idea of this line — it removes White's good bishop and leaves Black with a comfortable, balanced position.", sayShort: "Nc3 hits queen — Black comfortable" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N316: SublineNarration = {
  intro: { say: "White castles short and accepts the …Bg4 pin on the f3-knight rather than chasing it with h3. Black completes development naturally: …Nc6 to press d4, …Be7 and …O-O, with the queen rerouting to d8 already done. The pin on f3 keeps d4 under pressure, and Black aims for the …e6-…e5 or …Nc6-…Nb4 ideas to seize the initiative against the broad center.", sayShort: "White castles into the …Bg4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N317: SublineNarration = {
  intro: { say: "White develops Bg5 to pin the f6-knight before committing the king. Black breaks the pin with …Be7 and continues the modern …Qd8 plan: the bishop already active on g4 pinning f3, the queen safely home, and …Nbd7 plus …O-O to come. The mirrored pins cancel out, and Black's solid structure with pressure on d4 promises a comfortable, weakness-free middlegame.", sayShort: "Bg5 pin answered by …Be7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N318: SublineNarration = {
  intro: { say: "White develops Be3, bolstering d4 before deciding on castling. In the modern …Qd8 line Black is fully set up: the queen tucked safely home, the bishop on g4 pinning the f3-knight, and …e6 solidifying. Black continues …Nc6 or …Nbd7, …Be7 and …O-O, keeping the f3-pin to pressure d4. The position is sound and flexible with no targets for White.", sayShort: "Be3 props d4 — …Bg4 pin holds" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N319: SublineNarration = {
  intro: { say: "White over-presses, lunging g4 to trap the h5-bishop after the …Bg4-h5 pin. Black retreats …Bg6, and now g4 is a permanent weakness: the white king has lost its kingside pawn shelter and can no longer castle short comfortably. Black continues …Nc6, …Bb4 or …Bd6 and looks to open lines toward the exposed king with …h5 striking back at the over-extended pawns.", sayShort: "g4 overreaches — target the weakened king" },
  sources: ['concept:pos-king-safety', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N320: SublineNarration = {
  intro: { say: "White pins the f6-knight with Bg5 while the h5-bishop keeps its own pin on f3 down the d1-h5 diagonal. Black breaks the pin with …Be7, after which both sides are fully developed and ready to castle. The structure is rock-solid: the queen safely home on d8, no pawn weaknesses, and Black plans …Nbd7 or …Nc6 plus a timely …c5 or …b5 break. This is the heart of the modern …Qd8 Scandinavian.", sayShort: "Bg5 pin — …Be7 unties it" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N321: SublineNarration = {
  intro: { say: "White develops the dark-squared bishop actively to f4 rather than g5, eyeing the c7-square and the long diagonal. In the …Qd8 line Black is well set: the queen safely home, the bishop on g4 pinning the f3-knight, and …e6 solidifying. The plan is …Nc6 or …Nbd7, …Bd6 or …Be7 and …O-O; the g4-pin keeps d4 under pressure. Black has a sound, flexible structure with no weaknesses for the f4-bishop to exploit.", sayShort: "Bf4 develops — …Bg4 pin keeps d4 hit" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N322: SublineNarration = {
  intro: { say: "White lifts the queen to d3, connecting the pieces and preparing to castle while keeping options on both wings. Black's …Qd8 setup is solid: the bishop on g4 pinning the f3-knight, the queen tucked safely home, and …e6 securing the center. The plan is …Nc6 or …Nbd7, …Be7 and …O-O, maintaining the f3-pin to pressure d4. With no weaknesses, Black has comfortably navigated the opening into a balanced middlegame.", sayShort: "Qd3 connects — Black solid, f3 pinned" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N323: SublineNarration = {
  intro: { say: "White develops Be3 after the …Bg4-h5 maneuver, reinforcing d4 while the h5-bishop maintains its pin on the f3-knight along the d1-h5 diagonal. Black is solidly placed and continues …Nc6 or …Nbd7, …Be7 and …O-O. The pin on f3 keeps d4 under fire, and with the queen safely home on d8 and no weaknesses, Black has comfortably equalized in this …Qd8 main line.", sayShort: "Be3 supports d4 — f3 still pinned" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N324: SublineNarration = {
  intro: { say: "White castles short and lifts the rook to e1, aiming for central pressure while the h5-bishop keeps the f3-knight pinned. Black's structure is impeccable: queen home on d8, c6-pawn anchoring the center, and the light-squared bishop active outside the chain. The plan is …Be7, …Nbd7 and …O-O, then a freeing …c5 or …b5; there is no weakness for the e1-rook to exploit.", sayShort: "Re1 central pressure — Black rock-solid" },
  sources: ['concept:pos-open-file', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N325: SublineNarration = {
  intro: { say: "White lifts the queen to d3, connecting toward the kingside and supporting a possible e-file or g4 plan while Bg5 pins the f6-knight. Black is solidly placed: the c6-pawn anchors the center, …Be7 has broken the g5-pin's bite, and the h5-bishop maintains the pin on f3 along the d1-h5 diagonal. The plan is …Nbd7, …O-O and then …b5 or …c5 to break, with the firm pawn structure leaving Black no weaknesses.", sayShort: "Qd3 eyes kingside — Black stays solid" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N326: SublineNarration = {
  intro: { say: "The Nd5 sortie again, this time via the Bd2-first order, and again the c6-pawn answers it: …cxd5 simply wins the knight or forces a favorable trade on f6. Black's …Qa5 setup with the c6-pawn shielding the queen and the f5-bishop outside the chain is built to meet exactly this. After …cxd5 or …Nxd5 Black is solid, with the half-open c-file and pressure on d4 to come.", sayShort: "Nd5 met by …cxd5, Black solid" },
  sources: ['concept:pos-center', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N327: SublineNarration = {
  intro: { say: "Via the Bd2-first order White tries Ne4, centralizing the knight and offering to swap off Black's f6-knight while breaking the a5-queen's pressure on c3. Black answers …Nxe4 or …Bxe4 and keeps a solid setup: c6 guarding the queen, the bishop active, the center intact. After the exchange Black develops …Nd7, …Be7 and …O-O comfortably; the e4-knight had no real threat behind it.", sayShort: "Ne4 swap — Black untroubled" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N328: SublineNarration = {
  intro: { say: "White jumps to e5 with the knight, aiming at f7, via the Bd2-first move order. Black meets it head-on with …Nbd7 or …Bd6, trading or chasing the intruder while the rest of the position stays solid: the c6-pawn screens the a5-queen and the f5-bishop guards the light squares. Once the e5-knight is dealt with, Black completes development with …Be7 and …O-O for a balanced game.", sayShort: "Ne5 met by …Nbd7, Black solid" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N329: SublineNarration = {
  intro: { say: "Via the Bd2-first order White retreats the bishop to b3, keeping its eye on f7 and avoiding any …b5 or …Nd5 tempo on c4. Black's …Qa5 structure is rock-solid: the c6-pawn screens the queen, the f5-bishop is active, and …e6 holds the center. The plan is …Bb4 to pin the c3-knight, …Nbd7 and castling, then a …c5 break. Black has no weaknesses and equalizes comfortably.", sayShort: "Bb3 retreat — Black plays …Bb4, …c5" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N330: SublineNarration = {
  intro: { say: "Reached via the Bd2-first order, White inserts the prophylactic h3 to give the king luft and prevent any …Bg4 pin before castling. Black's …Qa5 structure is rock-solid: the c6-pawn screens the queen, the f5-bishop is active outside the chain, and …e6 secures the center. The plan is …Bb4 to pin the c3-knight, …Nbd7 and castling, then the freeing …c5 break. The slow h3 simply lets Black complete development in comfort.", sayShort: "h3 luft — Black plays …Bb4, …c5" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N331: SublineNarration = {
  intro: { say: "Reached via the Bd2-first order, this is the same central tension: a3 hits the b4-bishop that pins the c3-knight. Black's structure — queen on a5, c6-pawn guarding it, bishop active on f5 — is the classic …Qa5 main line, and capturing on c3 doubles White's pawns. Whether Black trades or retreats, the plan is …Nbd7, …O-O-O or …O-O, and pressure on the long-term weakness of White's queenside.", sayShort: "a3 prods …Bb4 in …Qa5 main line" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N332: SublineNarration = {
  intro: { say: "The same opposite-castling battle reached by a different move order, with Bd2 played before Bc4. White's a3 prods the b4-bishop that pins the c3-knight; capturing on c3 shatters the pawns sheltering White's king on c1. Black is set up to storm with …b5-b4 while …Nbd7, the c6-pawn and the f5-bishop hold the center and queenside together. The race favors whoever lands first, and Black's structure points straight at the white king.", sayShort: "…Bxc3 doubles pawns, …b5 storm coming" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N333: SublineNarration = {
  intro: { say: "By the Bd2-first move order White castles short, declining the opposite-castling fight. The b4-bishop keeps the c3-knight pinned while Black builds the standard …Qa5 setup: c6-pawn screening the queen, bishop active on f5, …Nbd7 and …O-O to come. With kings on the same side it becomes a maneuvering battle, and Black has the typical resources of …c5 or …Bxc3 followed by play on the queenside.", sayShort: "Both castle short — maneuvering game" },
  sources: ['concept:pos-king-safety', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N334: SublineNarration = {
  intro: { say: "In this Austrian Attack Black has played the modern …Na6 and struck with …c5, and White lunges e5 to gain space and harry the f6-knight. The knight retreats to d7 or e8, but the point is that …c5 has already hit d4 — after the exchanges the centre opens and the advanced e5-pawn becomes a target on a board where the g7-bishop rakes the long diagonal. Continue …cxd4 to open lines and bring the a6-knight to c5 or b4, hitting White's overextended structure.", sayShort: "e5 lunge — …cxd4 opens the centre" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N335: SublineNarration = {
  intro: { say: "White captures the …Na6 knight with Bxa6, surrendering the bishop pair to damage Black's queenside structure after …bxa6. The doubled a-pawns look ugly but the recapture opens the b-file for the rook and the half-open file points at b2, while the two bishops on g7 and c8 rake long diagonals. Recapture …bxa6, contest the centre with …cxd4, and use the open b-file and active bishops to compensate for the structural concession.", sayShort: "Bxa6 — recapture …bxa6, open b-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N336: SublineNarration = {
  intro: { say: "In the Austrian Attack, Be3 develops the dark-squared bishop to support d4 before White decides on a kingside push or a queen lift to d2. Black challenges the big centre without delay: …c5 hits d4, or …Nc6 and …e5 strike from the other side, refusing to let the e4-d4-f4 phalanx settle. The g7-bishop is poised on the long diagonal; break with …c5, and if White plays d5 the position opens for the fianchettoed bishop's pressure on b2.", sayShort: "Be3 props d4 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N337: SublineNarration = {
  intro: { say: "Black's …c5 break struck d4, and White captures with dxc5, opening the centre and offering the pawn back in exchange for development. The a6-knight is perfectly placed to recapture with …Nxc5, hitting the d3-bishop and the e4-pawn from an active post, or …dxc5 keeps the structure with an open d-file. Recapture with the knight to gain a tempo on the bishop, when the g7-bishop and the open position give Black a comfortable, active game.", sayShort: "dxc5 — recapture …Nxc5 with tempo" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N338: SublineNarration = {
  intro: { say: "This is the sharpest Austrian Attack try: White plays e5 before Black has counter-struck, gaining space and kicking the f6-knight, which drops back to d7 or e8. The thrust is double-edged — the e5-pawn is advanced and can be undermined, so Black answers with …Nfd7 and …c5, hitting d4 to dissolve White's centre. Once the centre opens the g7-bishop becomes powerful on the long diagonal; do not let the broad pawns stand, break with …c5 and round up the e5-pawn.", sayShort: "e5 grabs space — undermine with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N339: SublineNarration = {
  intro: { say: "In this Austrian Attack with …Na6 and …c5, Be3 defends d4 and develops the bishop as the central tension peaks. Black's …c5 has already hit d4, so continue …cxd4 to open the centre, when the a6-knight jumps to c5 or b4 hitting White's structure and the g7-bishop comes alive on the long diagonal. Open the position before White's f4 phalanx advances — exchange on d4 and use the active minor pieces to exploit the loosened white centre.", sayShort: "Be3 props d4 — open with …cxd4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N340: SublineNarration = {
  intro: { say: "A more restrained Austrian Attack: White develops Be2 rather than the aggressive Bd3 or Bc4, keeping the big centre but softening the attacking ambitions. Black challenges immediately with …c5 hitting d4, or …Nc6 and …e5, because the e4-d4-f4 phalanx must be contested before it cements. The g7-bishop is the long-term asset on the long diagonal; break the centre with …c5 and let the resulting open lines favor your better-developed pieces.", sayShort: "Quiet Be2 — challenge centre …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N341: SublineNarration = {
  intro: { say: "Black's modern …Na6 and …c5 met White's space-grabbing d5, the knight rerouted to c7 to support …b5, and Qe1 lifts the queen toward h4 for a kingside attack. With the centre fixed, Black plays on the queenside: …b5 with the c7-knight backing it pries open lines, while …Rb8 and …a6 fuel the advance. Race the wings — push …b5-b4 to hit the c3-knight before White's queen swings over for a kingside assault.", sayShort: "Qe1 swings kingside — strike …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N342: SublineNarration = {
  intro: { say: "Black's …Na6 and …c5 met d5, the knight rerouted to c7 to support …b5, and h3 keeps the c8-bishop off g4 while White readies a kingside expansion. With the centre fixed by d5, Black's play is on the queenside: …b5 with the c7-knight behind it pries open lines, while …Rb8 and …a6 build the advance. Push …b5-b4 to challenge the c3-knight and open the b-file before White's f4-f5 storm gathers pace.", sayShort: "Fixed centre — expand with …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N343: SublineNarration = {
  intro: { say: "In the Austrian Attack White develops Bd3 early, aiming the bishop at the kingside and the h7-square before completing with Nf3. Black continues …O-O and strikes the centre with …c5 or …Nc6 and …e5, because the e4-d4-f4 pawn front must be challenged head-on. The g7-bishop bears down the long diagonal; castle, break with …c5 hitting d4, and let the opening lines work for the better-developed black pieces against White's ambitious but loosenable centre.", sayShort: "Bd3 aims kingside — break …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N344: SublineNarration = {
  intro: { say: "In the Classical Variation White plays an early h3 to prevent …Bg4 and keep options open before deciding on Be2 or Be3. Black continues development unhurried: …O-O, …c6, and then the small-centre break with …e5 or …b5 to stake a claim. The g7-bishop is already aimed at d4 and b2; finish castling, prepare …e5, and meet a later d5 by rerouting a knight toward the kingside for the …f5 plan.", sayShort: "Early h3 — develop, ready …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N345: SublineNarration = {
  intro: { say: "In this Classical Pirc with …c6 and …e5, Black has already broken in the centre and Be3 develops the dark-squared bishop while supporting d4. The tension between e5 and d4 is the heart of the position: keep it, and meet dxe5 with …dxe5 reaching a symmetrical centre where the d7-knight reroutes via f8 to e6 or g6. White's a4 gains queenside space, so answer with …Qc7 and …Re8 to back the e5-pawn and stay solid in this slow, maneuvering middlegame.", sayShort: "Be3 props d4 — keep …e5 tension" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N346: SublineNarration = {
  intro: { say: "In the Classical Variation Be3 develops the dark-squared bishop and supports d4, often a prelude to Qd2 and a 150-style plan with a later Bh6 trade. Black continues …O-O and …c6, preparing the small-centre breaks …e5 or …b5, and if White sets up the Bh6 trade then queenside expansion with …b5 is the answer. The g7-bishop eyes d4; finish castling, choose your central break, and be ready to meet the dark-square battery with timely counterplay.", sayShort: "Be3 props d4 — prepare …c6, …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N347: SublineNarration = {
  intro: { say: "This is the mainline Classical Pirc: White has the Be2-Nf3 setup and plays h3 to rule out …Bg4 and prepare Be3 or a queenside expansion. Black's small-centre plan is to strike with …e5 next, when the d4/e5 tension gives counterplay, or to play …b5 with the …c6 already in place to grab queenside space. Develop …Nbd7 and …e5, keep the g7-bishop active on the long diagonal, and be ready to meet d5 with a knight reroute toward the kingside.", sayShort: "h3 prep — strike back with …e5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N348: SublineNarration = {
  intro: { say: "In the Classical Pirc, Re1 backs the e4-pawn and supports a later e5 advance, a quiet but flexible move. Black has the …c6 small-centre setup in place, so the plan is …e5 to contest the centre directly or …b5 and …a6 for queenside space, with …Nbd7 completing development. The g7-bishop pressures d4; choose between the central …e5 break and queenside expansion based on whether White reveals an e5 push or a slower buildup.", sayShort: "Re1 supports e5 — answer with …e5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N349: SublineNarration = {
  intro: { say: "In the Classical Variation Bc4 trains the bishop on the a2-g8 diagonal and the f7-square, an active developing choice. Black castles and prepares the small-centre breaks: …c6 to blunt the bishop and ready …d5 or …b5, or …Nc6 and …e5 to contest the centre directly. Develop …O-O and …Nbd7, hit the c4-bishop with …Nb6 when useful, and choose the central break that suits White's plan while the g7-bishop pressures d4.", sayShort: "Bc4 hits f7 — …c6 blunts the bishop" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N350: SublineNarration = {
  intro: { say: "In the Classical Variation Bf4 develops the dark-squared bishop actively, eyeing the d6-pawn and discouraging an early …e5 push. Black continues …O-O and …c6, preparing …b5 for queenside space or readying …Nbd7 and …e5 once the d6-pawn is sufficiently supported. The g7-bishop watches d4 and b2; finish castling, blunt the f4-bishop's pressure on d6 with …Nbd7 and …Qb6 ideas, and choose the central break when the moment is right.", sayShort: "Bf4 eyes d6 — develop …c6, …Nbd7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N351: SublineNarration = {
  intro: { say: "The centre has clarified after dxe5 dxe5, the d-file is open, and Bc4 redeploys the bishop to the active a2-g8 diagonal aiming at f7. With queens still on, Black equalizes by completing development: …Qe7 or …Qc7 connects the rooks, …Nb6 hits the c4-bishop with tempo, and the g7-bishop and e5-pawn control the centre. The symmetrical pawn structure means piece activity decides — contest the open d-file with …Rd8 and keep the e5-pawn defended.", sayShort: "Bc4 redeploys — …Nb6 with tempo" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N352: SublineNarration = {
  intro: { say: "In the Classical Pirc with …c6 and …e5 played, Re1 backs the e4-pawn and supports holding the central tension. Black's structure is set: …Qc7 and …Re8 reinforce e5, the d7-knight reroutes via f8 to e6 or g6, and …a5 can fix White's a4-pawn to prevent b5. Keep the d4/e5 standoff, develop the rook to e8 to contest the e-file, and meet a future dxe5 with …dxe5 reaching a balanced, easy-to-play structure.", sayShort: "Re1 backs e4 — hold …e5 tension" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N353: SublineNarration = {
  intro: { say: "In the Classical Pirc, after …c6 and …e5, Bg5 pins the f6-knight to the queen and eyes a trade to loosen Black's grip on e5 and d5. Question the bishop with …h6: after Bh4 or a retreat, the d7-knight reroutes via f8 to e6 or g6 to overprotect the e5-pawn, and …Qc7 and …Re8 complete the harmonious setup. Keep the central tension, neutralize the pin, and contest the e-file in this slow, solid Philidor-shaped middlegame.", sayShort: "Bg5 pins f6 — …h6 then reroute" },
  sources: ['concept:tac-pin', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N354: SublineNarration = {
  intro: { say: "This is the 150 Attack with opposite-side castling: White's Be3 and Qd2 battery eyes the h6-square for a bishop trade, and O-O-O commits the king to the queenside. That tells Black exactly where to attack — the …c6 and …b5-b4 pawn storm rolls straight at White's king on c1. Race plans: open the b-file with …b5-b4, keep the g7-bishop on the long diagonal, and prioritize speed because both sides are pawn-storming opposite wings.", sayShort: "Opposite castling — …b5-b4 storm" },
  sources: ['concept:att-queenside-attack', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N355: SublineNarration = {
  intro: { say: "The Be3-Qd2 battery now strikes with Bh6, offering to trade the dark-squared bishops before Black can use the g7-bishop on the long diagonal. Allowing …Bxh6 Qxh6 hands White a target on the dark squares around the king, so the standard reaction is …Bxh6 followed by …c6 and queenside play, accepting the trade but answering with …b5 once White commits the king. If Black wants to keep the bishop, …c5 hitting d4 changes the central tension before the trade resolves.", sayShort: "Bh6 trades — answer …c6 then …b5" },
  sources: ['concept:pos-bishop-pair', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N356: SublineNarration = {
  intro: { say: "In the 150 Attack White starts the kingside pawn storm with h4 before castling, intending h5 to crack open the g6-pawn and Black's king cover. The thematic answer is central counterplay: …c5 hitting d4 or …e5 opens the position so the wing attack loses its footing, and …Nc6 adds pressure on the centre. Meet a flank lunge with a central strike — break with …c5, and if the centre opens White's advanced h-pawn and uncastled king become liabilities.", sayShort: "h4 storm — counter in centre …c5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N357: SublineNarration = {
  intro: { say: "In the 150 Attack with the Be3-Qd2 battery, Nf3 develops naturally and supports d4 instead of an immediate Bh6 trade or pawn storm. Black continues …c6 to prepare …b5, anticipating that White may castle long, and …Nbd7 readies the central break. The g7-bishop is poised on the long diagonal; play …c6 and …b5 to grab queenside space, and if White castles queenside accelerate the …b5-b4 storm against the king.", sayShort: "Nf3 develops — ready …c6 and …b5" },
  sources: ['concept:pos-development', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N358: SublineNarration = {
  intro: { say: "In the 150 Attack White plays the modest Be2 instead of pushing for the Bh6 trade, keeping the Be3-Qd2 setup flexible. Black continues …c6 and …b5 for queenside space, or …Nc6 and …e5 to strike the centre, judging the plan by where White's king goes. The g7-bishop eyes d4 and b2; develop …Nbd7, prepare the …b5 or …e5 break, and stay alert to a later Bh6 by meeting it with …Bxh6 and queenside counterplay.", sayShort: "Be2 flexible — prepare …c6, …b5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N359: SublineNarration = {
  intro: { say: "In the 150 Attack White slips in h3 to deny …Ng4 hitting the e3-bishop and to prepare a kingside pawn advance. Black responds in the centre and on the queenside: …c6 readies …b5, while …e5 or …c5 challenges d4 to undercut any wing attack before it gains momentum. With the Be3-Qd2 battery aiming at h6, expect a later Bh6 — answer it with …Bxh6 and …b5, and meet the slow setup with an active central or queenside break.", sayShort: "h3 stops …Ng4 — break …c6, …b5" },
  sources: ['concept:pos-prophylaxis', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N360: SublineNarration = {
  intro: { say: "This is the main tabiya of the Austrian Attack: White has the broad e4-d4-f4 pawn centre with Nf3 supporting it, the most ambitious anti-Pirc setup. Black castles and then strikes the centre — …c5 hitting d4 or …Nc6 followed by …e5 are the two principled breaks, because a big pawn centre must be challenged before it becomes overwhelming. The fianchettoed g7-bishop is the long-term hero; do not sit passively, contest the centre immediately.", sayShort: "Austrian centre — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N361: SublineNarration = {
  intro: { say: "This is the Classical Variation tabiya: White develops naturally with Nf3 rather than the aggressive f4, leading to a slow positional struggle. With the kingside fianchetto complete, Black's plan is the small-centre break — …O-O, …c6, and then …e5 or …b5 to claim space, contesting the centre at the right moment. The g7-bishop eyes d4 and b2 down the long diagonal; develop solidly and choose your central break once White shows whether the bishop goes to e2, c4, or e3.", sayShort: "Classical setup — prepare …c6 and …e5" },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N362: SublineNarration = {
  intro: { say: "White's early f3 invited …e5, the centre liquidated with dxe5 dxe5, and the queens came off via Qxd8+ Kxd8 into an endgame where Black's king sits on d8. The structure is symmetrical with e5 facing e4, and Black expands on the queenside with …a6-a5 to fix targets and gain space. Centralize the king toward e7, develop with …Be6 and …Nc6 hitting central squares, and use the …a5-a4 lever to pry open White's b3-pawn in this balanced endgame.", sayShort: "Queens off — …a5 expands, king to e7" },
  sources: ['concept:pawn-minority-attack', 'concept:end-opposition', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N363: SublineNarration = {
  intro: { say: "This is the Byrne Variation, where White develops Bg5 to pin the f6-knight to the queen and pressure the centre, often heading for Qd2 and queenside castling. Black completes the fianchetto with …Bg7 and will play …O-O and …c6, preparing the …b5 queenside storm that opposite-side castling invites. The pin can be eased by …h6 or by …c6 and …Qc7 unpinning; develop normally and aim your pawns at wherever White's king lands.", sayShort: "Byrne Bg5 — castle, ready …c6, …b5" },
  sources: ['concept:tac-pin', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N364: SublineNarration = {
  intro: { say: "This is the 150-style setup with Bg5 and opposite-side castling, and now Bh6 forces the trade of the dark-squared bishops to strip Black's kingside cover. Recapture …Bxh6 Qxh6, and the position becomes a pure pawn-storm race: White's king sits on c1, so the …b5-b4 advance is already underway thanks to …c6. Don't fear the bishop trade — speed is everything here, and Black's queenside attack arrives because White spent tempi on the swap.", sayShort: "Bh6 trades — race with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N365: SublineNarration = {
  intro: { say: "With opposite-side castling set, White launches the kingside storm h4-h5 to crack open the g6-pawn and the cover around Black's king. This is a pure race, so the answer is not to defend passively but to push the queenside counter: …b5-b4 hammers the c3-knight in front of White's king on c1. Meet h4 with …b5 immediately, keep the g7-bishop on the long diagonal, and back the attack with …Qa5 and …a5-a4 — fastest storm wins.", sayShort: "h4 storm — counter-race with …b5" },
  sources: ['concept:att-kingside-storm', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N366: SublineNarration = {
  intro: { say: "With opposite-side castling, White plays f3 to brace e4 and prepare a slow kingside pawn storm with g4-h4. That hands Black the initiative on the other wing: the …c6 is already played, so …b5-b4 rolls at the king on c1 before White's g- and h-pawns get moving. Push …b5 at once, follow with …Qa5 and …a5-a4 to pry open the b- and a-files, and keep the g7-bishop trained down the long diagonal toward White's queenside.", sayShort: "f3 slow — beat it with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N367: SublineNarration = {
  intro: { say: "After opposite-side castling, White tucks the king to b1 with Kb1, a useful prophylactic step off the c-file before the pawn storms collide. That spent tempo is a green light for Black's counterattack: with …c6 already in, push …b5-b4 to hit the c3-knight and pry open lines toward White's king. Don't slow down — …b5, …Qa5, and …a5-a4 keep the queenside fire burning; in these races the side that opens the enemy king first wins.", sayShort: "Kb1 prophylaxis — race on with …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N368: SublineNarration = {
  intro: { say: "In this Byrne setup with opposite-side castling, Nf3 develops naturally and supports d4 rather than committing to an immediate pawn storm. That gives Black a free tempo to press the queenside attack: with …c6 in place, …b5-b4 rolls at the c3-knight and White's king on c1. Push …b5 at once, follow with …Qa5 and …a5-a4, and keep the g7-bishop trained down the long diagonal — speed wins these pawn-storm races.", sayShort: "Nf3 develops — race with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N369: SublineNarration = {
  intro: { say: "With opposite-side castling set, White lunges e5 to attack the f6-knight and open lines while the Bg5 still pins it to the queen. The knight is awkwardly placed, so the principled reply is …dxe5 striking back in the centre, or …Nd5 if available, breaking White's momentum before the storm starts. Resolve the centre with …dxe5 and continue the queenside counter …b5-b4, using the open position and the long-diagonal bishop against White's king on c1.", sayShort: "e5 lunge — hit back with …dxe5" },
  sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N370: SublineNarration = {
  intro: { say: "In this Byrne setup with opposite-side castling, Be2 develops modestly and clears the way for Nf3, declining an immediate pawn storm. The tempo White spends on a quiet developing move accelerates Black's counterattack: with …c6 in place, …b5-b4 hits the c3-knight and pries open lines at White's king on c1. Push …b5 right away, back it with …Qa5 and …a5-a4, and keep the g7-bishop bearing down the long diagonal toward the white queenside.", sayShort: "Be2 quiet — punish with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N371: SublineNarration = {
  intro: { say: "The pawn-storm race is in full swing: Black's …c6 and …b5 are rolling at White's king on c1, and White has answered with f4 and Bd3 to build a kingside attack of his own. With the bishop now on d3, …b4 chases the c3-knight and rips open the b-file and the a8-h1 diagonal toward White's king. Keep pushing — …b4, …a5-a4, and …Qa5 add fuel; in opposite-castling positions the side that opens lines first usually mates first.", sayShort: "…b4 next — open b-file at the king" },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N372: SublineNarration = {
  intro: { say: "This combines the Bg5 pin-attempt with an Austrian-style f4 advance, building a broad centre while the bishop eyes the f6-knight and the d8-queen. Black's reply is the standard central challenge: …c5 striking d4, or …Nbd7 and …e5, refusing to let the e4-d4-f4 phalanx stand unopposed. The g6/g7 fianchetto means the long diagonal will open once the centre cracks, so break with …c5 and develop quickly to exploit any overextension.", sayShort: "Big centre — challenge with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N373: SublineNarration = {
  intro: { say: "White combines Bg5 with an early e5 thrust, attacking the f6-knight while the bishop pins it to the d8-queen — a try to disrupt before Black is developed. The knight cannot simply move, so the principled reply is …dxe5 hitting back in the centre, or …Nfd7 to keep the structure intact; either way Black must address the pin and the advanced pawn. Resolve the tension with …dxe5 or …h6 to question the bishop, then use the long diagonal once the centre opens.", sayShort: "e5 with pin — answer …dxe5" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N374: SublineNarration = {
  intro: { say: "This solid …e5 Lion structure has White expanding with a4 and playing h3 to prevent …Bg4 and ready Be3 or Re1. With the d4/e5 tension intact, Black's plan is patient: …Qc7 and …Re8 back the e5-pawn, the d7-knight reroutes via f8 to e6 or g6, and …a5 can fix White's a4-pawn to deny b5. The structure resembles a Philidor — keep e5, contest the e-file, and wait for White to commit before choosing between …exd4 and …d5.", sayShort: "h3 prevents …Bg4 — play …Qc7, …Re8" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N375: SublineNarration = {
  intro: { say: "This Lion-style …e5 system has reached a Philidor-shaped centre, and the rook lift to e1 piles a third piece behind the e4-pawn, eyeing the e5-point. The …Nbd7 and …Be7 setup keeps the structure compact, so the plan is to hold e5 with the knights and prepare …c6 to give the queen the c7-square and blunt the c4-bishop. With both kings castled short, the game stays maneuvering rather than sharp — reroute the d7-knight toward f8 and g6 to defend the kingside and contest the e-file.", sayShort: "Re1 eyes e5 — hold with …c6" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N376: SublineNarration = {
  intro: { say: "Before committing the rook, White stakes out queenside space with a5, fixing a pawn on the fifth rank and securing the b6-outpost. In this …e5 Lion structure Black continues the standard maneuvering: …Qc7 and …Re8 support e5, the d7-knight heads for f8 and e6 or g6, and …b5 or …b6 challenges the a5-pawn when ready. Stay solid and Philidor-like, keep the central tension, and reroute the pieces to their best posts behind the e5-pawn.", sayShort: "a5 grabs space — keep e5 solid" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N377: SublineNarration = {
  intro: { say: "The central tension resolved early into a symmetrical e5-versus-e4 structure with queens off the d-file, and Black has expanded with …a6-a5-a4 to fix a queenside weakness. The …a4 break cracks White's b3-pawn, creating a target and a potential outpost, while the f3-pawn shows White wants a slow positional game. Probe with …axb3 to open the a-file for the rook, place a knight on the c5 or d4 outpost, and treat this as a maneuvering endgame-like middlegame.", sayShort: "…a4 cracks b3 — open the a-file" },
  sources: ['concept:pawn-minority-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N378: SublineNarration = {
  intro: { say: "In this …e5 Lion structure Qe2 connects the rooks, defends e4, and prepares to double on the central files or expand with Rd1. Black keeps the solid plan: …Qc7 and …Re8 back the e5-pawn, the d7-knight reroutes via f8 to e6 or g6, and …a5 fixes White's a4-pawn to deny b5. With the d4/e5 tension held, the game stays maneuvering — overprotect e5, contest the open files, and wait for White to commit before resolving the centre.", sayShort: "Qe2 connects rooks — hold e5 solid" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N379: SublineNarration = {
  intro: { say: "This offbeat Bd3 line let Black seize the centre with …e5 and …d5, and after c3 props the centre Black has expanded with …a6-a5-a4 against White's queenside. The …a4 lever cracks the b3-pawn, opening the a-file and creating a target, while the broad …d5/…e5 centre gives Black space and free development. Probe with …axb3 to open the a-file, post a knight on the c5 or d4 outpost, and use the central pawns to cramp White.", sayShort: "…a4 cracks b3 — big …d5/…e5 centre" },
  sources: ['concept:pos-center', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N380: SublineNarration = {
  intro: { say: "This solid …e5 Lion has White developing Bg5 to pin the f6-knight against the queen and pressure the e5/d5 complex. Break the pin or question the bishop with …h6, then continue the standard plan: …Qc7 connects to defend e5, and the d7-knight reroutes via f8 to e6 or g6 to overprotect the central pawn. The structure stays Philidor-like and resilient; keep the d4/e5 tension, finish development, and contest the e-file with the rooks.", sayShort: "Bg5 pins — …h6, overprotect e5" },
  sources: ['concept:tac-pin', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N381: SublineNarration = {
  intro: { say: "In this solid …e5 Lion setup, Bg5 pins nothing but eyes a trade of the f6-knight to weaken Black's grip on e5 and the d5-square. Black has the harmonious …Be7, …Qc7, …Nbd7 structure, so meet Bg5 with …h6 to question the bishop, then reroute the d7-knight via f8 to e6 or g6 to overprotect e5. The position stays solid and Philidor-like; keep the central tension and contest the e-file with the rooks once development finishes.", sayShort: "Bg5 eyes f6 — …h6 then reroute knight" },
  sources: ['concept:pawn-chain', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N382: SublineNarration = {
  intro: { say: "White grabs queenside space with a5, fixing the structure and gaining the b6-square to clamp Black's minor pieces. In this solid …e5 Lion, Black answers patiently: the d7-knight reroutes via f8 to e6 or g6 to overprotect e5, …Re8 contests the e-file, and …b6 or …b5 challenges the advanced a-pawn at the right moment. Keep the e5-pawn defended, maneuver the pieces to their best squares, and treat the position as a slow, well-grounded Philidor structure.", sayShort: "a5 clamps queenside — reroute knight" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N383: SublineNarration = {
  intro: { say: "In the Fianchetto Variation Black has struck …e5 and developed …Nc6, and h3 sidesteps …Bg4 and prepares queenside or central expansion. The central tension between e5 and d4 defines the plan: if White takes dxe5 Black recaptures and the open d-file and active pieces equalize, and if White pushes d5 the c6-knight reroutes via e7 toward the …f5 break. Keep …e5 supported, complete with …Re8 and …a5 to fix the queenside, and let the structure dictate which break to prepare.", sayShort: "h3 waits — keep the …e5 tension" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N384: SublineNarration = {
  intro: { say: "In the Fianchetto Variation Black has hit the centre with …e5, and h3 keeps the c8-bishop off g4 while preparing to resolve the tension or castle. The d4/e5 standoff is the key: if White plays dxe5 Black recaptures and the open position favors his active pieces, and if d5 the centre closes into a KID where …f5 becomes the plan. Develop …Nc6 to pressure d4, complete with …Re8, and let the structure decide between an open game and a kingside pawn break.", sayShort: "h3 waits — …Nc6 pressures d4" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N385: SublineNarration = {
  intro: { say: "In the Fianchetto Variation White closes the centre with d5, declining the tension after …e5 and steering into a King's-Indian-type structure. The closed centre defines both plans: White will expand on the queenside, while Black's lever is …f5, supported by a knight reroute to d7 and e8 and the g7-bishop waiting behind the e5-pawn. Lock in with …a5 to slow White's queenside, then build the …f5 break to generate kingside play.", sayShort: "d5 closes centre — prepare …f5" },
  sources: ['concept:pawn-chain', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N386: SublineNarration = {
  intro: { say: "White takes immediately with dxe5 in the Fianchetto Variation, before Black has played …Nc6, opening the d-file and the centre. Recapture …dxe5, and after the queens come off the d-file Black is comfortable: the g7-bishop bears down the long diagonal, the knights find e5 and d4 squares, and the symmetrical structure offers easy equality. Develop …Nc6 or …Nbd7 to control the central squares, and use the half-open d-file with the rooks.", sayShort: "dxe5 — recapture, easy equality" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N387: SublineNarration = {
  intro: { say: "White resolves the centre with dxe5 in the Fianchetto Variation, opening the d-file and trading off the central tension. Recapture …dxe5, and the symmetrical e5-versus-e4 structure favors Black's smoothly developed pieces: the c6-knight pressures d4-squares, the g7-bishop rakes the long diagonal, and …Qxd1 or …Qe7 contests the open d-file. With queens likely traded, this is a balanced, slightly easier-to-play position for Black thanks to the active fianchettoed bishop.", sayShort: "dxe5 — recapture, open d-file equal" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N388: SublineNarration = {
  intro: { say: "The Fianchetto Variation has transposed into a King's-Indian-style closed centre: White's d5 locked the pawns and pushed the c6-knight to e7, and h3 prepares to expand with g4 or simply prevents …Bg4. With the centre shut, Black's play is on the kingside — …Nd7 or …Ne8 reroutes a knight, …f5 is the thematic break, and the g7-bishop bides its time behind the e5-pawn. Treat this like a KID: meet the closed centre with a kingside pawn advance against White's king.", sayShort: "Closed centre — prepare the …f5 break" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N389: SublineNarration = {
  intro: { say: "With the centre closed by d5, White breaks with f4 to open lines on the kingside and challenge the e5-pawn. The principled answer is to maintain the central block: after …exf4 the e-file opens and the g7-bishop and e7-knight target e4, or hold with …Nd7 and meet the f-file pressure by reorganizing. This is KID-flavored play — let White overextend on the kingside, then strike back with …f5 of your own to fix the structure in your favor.", sayShort: "f4 break — meet with …exf4 or …f5" },
  sources: ['concept:pos-center', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N390: SublineNarration = {
  intro: { say: "The centre is closed by d5 and the c6-knight has retreated to e7, and Bg5 pins nothing yet but eyes a trade of the f6-knight after a possible …h6. In this KID-shaped structure Black's play is on the kingside: …h6 questions the bishop, then …f5 is the thematic break against White's clamp, with knights rerouting via d7 and e8 to support it. Meet Bg5 with …h6 to clarify the bishop, then prepare …f5 to open lines at White's king.", sayShort: "…h6 then …f5 — KID kingside break" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N391: SublineNarration = {
  intro: { say: "In the Fianchetto Variation Black has struck …e5 and developed …Nc6, and Be3 supports d4 while developing the dark-squared bishop. The d4/e5 tension is the focus: keep it, and if White takes dxe5 the open d-file and active pieces give equality, while d5 closes the centre into a KID where …f5 becomes the plan. Develop …Re8 to press the e-file, complete with …a5, and let the structure dictate whether to open the centre or prepare the kingside break.", sayShort: "Be3 props d4 — keep …e5 tension" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N392: SublineNarration = {
  intro: { say: "In the Fianchetto Variation after …e5 and …Nc6, Bg5 pins the f6-knight to the queen, eyeing a trade to weaken Black's central grip. Question the bishop with …h6: after Bxf6 …Bxf6 Black keeps a solid centre with the bishop pair, or after a retreat the knight stays to support e5 and d4. Maintain the d4/e5 tension, develop …Re8 to contest the e-file, and meet the pin calmly without surrendering the strong centre.", sayShort: "Bg5 pins f6 — …h6 keeps the centre" },
  sources: ['concept:tac-pin', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N393: SublineNarration = {
  intro: { say: "fxe5 — White opens the f-file but cedes the central tension. Hit back on the other wing: …c5 jabs the d4-pawn while your queen on a5 pins down the c3-knight, and …c4 follows to harass the d3-bishop. Black's queenside initiative arrives faster than White's open f-file can bite.", sayShort: "fxe5 — …c5 and …c4 counter." },
  sources: ['concept:pos-initiative', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N394: SublineNarration = {
  intro: { say: "dxe5 — White grabs the e5-square but opens the d-file onto his own position. …c5 stakes queenside space and clamps d4 for good, and with …c4 hitting the d3-bishop plus the queen on a5 raking c3, Black seizes exactly the initiative White's central capture failed to earn.", sayShort: "dxe5 — …c5 clamps, …c4 harasses." },
  sources: ['concept:pos-initiative', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N395: SublineNarration = {
  intro: { say: "This Pribyl/Czech setup with …c6 and …Qa5 pins White down on the queenside, and after …e5 and …Bg4 the central tension snaps with dxe5. Recapturing with …dxe5 opens the d-file and leaves the g4-bishop pinning the f3-knight against the queen, so White's e4-pawn and f4-pawn become the targets. The active queen on a5 and the bishop on g4 give Black quick piece play; trade on f3 to damage White's structure if the knight cannot break the pin.", sayShort: "dxe5 — recapture, keep the Bg4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N396: SublineNarration = {
  intro: { say: "After …e5 and …Bg4, White grabs the centre with fxe5, but Black's pieces are already active: the g4-bishop pins the f3-knight to the queen, so recapturing the pawn or hitting e5 is straightforward. Play …dxe5 to open the d-file and keep the pin biting, when the e4-pawn becomes weak and the queen on a5 stings the queenside. The trade on f3 looms if White cannot unpin, doubling the pawns and confirming Black's grip on the light squares.", sayShort: "fxe5 — recapture, keep the f3 pin" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N397: SublineNarration = {
  intro: { say: "In this …c6/…Qa5 Pirc, Black has developed actively with …Bg4 pinning the f3-knight, and h3 questions that bishop. The choice is concrete: …Bxf3 doubles White's pawns and concedes the bishop pair but cements a grip on the light squares and the e5-point, while …Bh5 keeps the pin alive at the cost of a later g4. With the queen on a5 pressuring the queenside and the knights ready for f8-e6, Black's pieces are harmoniously placed for a maneuvering struggle.", sayShort: "h3 hits Bg4 — …Bxf3 doubles pawns" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N398: SublineNarration = {
  intro: { say: "White castles short in this …c6/…Qa5 Pirc, accepting the …Bg4 pin on the f3-knight and the central tension between e5 and d4. Black keeps the pieces humming: the queen on a5 stings the queenside, the g4-bishop pins f3, and …exd4 or …exf4 can open the centre when the moment is right. Resolve the tension favorably or trade …Bxf3 to double White's pawns and grip the light squares, using the active development to seize the initiative.", sayShort: "O-O allows pin — keep …Bg4 pressure" },
  sources: ['concept:tac-pin', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N399: SublineNarration = {
  intro: { say: "This is a Pribyl/Czech move order where Black delays the fianchetto and plays …c6 and …Bg4 to pin the f3-knight against the queen and pressure d4. The pin makes White's centre harder to maintain: after a later …e5 the d4-pawn comes under fire, and if White breaks the pin with h3 then …Bxf3 doubles the pawns and grips the light squares. Develop flexibly with …Nbd7 and …e5, using the pinned knight to justify the central counter.", sayShort: "…Bg4 pin — pressure d4 then …e5" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N400: SublineNarration = {
  intro: { say: "In this …c6/…Qa5 Pirc, Black has developed fully with …Bg4, …Nbd7, and …Be7, and Qe1 unpins the c3-knight by stepping off the d-file while eyeing the kingside. Black keeps the initiative: the …Bg4 pin on f3 still bites, …exd4 or …exf4 can open the centre at the right moment, and the queen on a5 pressures the queenside. Castle, complete the rooks, and choose the central break that exploits White's slightly loose, attack-minded setup.", sayShort: "Qe1 unpins — keep …Bg4 pressure" },
  sources: ['concept:tac-pin', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N401: SublineNarration = {
  intro: { say: "White pushed e5 before Nf3, chasing the knight to d7, and only now develops Nf3 to support the broad centre. The advanced e5-pawn is the target: Black strikes with …c5 hitting d4, intending …cxd4 to undermine the chain and open lines for the g7-bishop down the long diagonal. The d7-knight supports the …c5 break and can hop to b6 or back into e5 once it is won; contest the centre actively rather than letting the phalanx stand.", sayShort: "e5 then Nf3 — undermine with …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N402: SublineNarration = {
  intro: { say: "The Austrian Attack has chased the f6-knight to d7 with e5, and now h4 announces a kingside pawn storm aimed at the fianchettoed g7-bishop. Against this h4-h5 lunge the counter is in the centre, not on the wing: hit the e5/d4 chain with …c5, and if the centre opens the loose advanced pawns become targets. The d7-knight heads for b6 or supports …c5, and …c5 striking at d4 is the principled response to a flank attack.", sayShort: "h4 storm — counter centre with …c5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N403: SublineNarration = {
  intro: { say: "In the Austrian Attack after e5 Nfd7, Bc4 trains the bishop on the f7-square and the a2-g8 diagonal, daring Black to grab space. The standard equalizer is …c5, striking d4 and challenging the broad centre before White completes development. If the centre opens, the e5-pawn is overextended and the g7-bishop springs to life down the long diagonal; meet Bc4 calmly, finish development with …Nb6 hitting the bishop, and break with …c5.", sayShort: "Bc4 hits f7 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N404: SublineNarration = {
  intro: { say: "The Austrian Attack has chased the knight to d7 with e5, and Be3 develops the bishop to brace d4 and the e5-pawn. Black's counter is the central break …c5, hitting d4 to dissolve White's advanced phalanx, with the d7-knight ready to recapture or jump to b6. Once the centre opens the e5-pawn becomes a target and the g7-bishop dominates the long diagonal; strike …c5 now, before White consolidates the broad pawn front.", sayShort: "Be3 supports e5 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N405: SublineNarration = {
  intro: { say: "This is a sharp Austrian Attack pawn sacrifice: after e5 Nfd7, White rams e6 to blow open the f7-pawn and the diagonals toward Black's king before development is complete. Accept calmly — …fxe6 leaves Black up a pawn with a slightly weakened structure, but the d7-knight, the g7-bishop, and the extra centre pawn give a sound defense once the dust settles. Take with …fxe6, complete development with …Nf6 and …Nc6, and consolidate the extra material against White's bluff.", sayShort: "e6 sac — take …fxe6, consolidate" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N406: SublineNarration = {
  intro: { say: "This is the Four Pawns Attack, White's most ambitious try, where the e5, d4, c4 and f4 pawns claim huge space. Black has already developed actively: …Nc6 and …Bf5 hit the centre, and …Bb4 pins the c3-knight to add pressure to d4. With Be2 White finishes development, but the over-extended pawn chain is the long-term target — Black plays against e5 and d4 with pieces.", sayShort: "Four Pawns Attack — pressure the centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N407: SublineNarration = {
  intro: { say: "This is the Modern Variation main line, where White builds the broad e5 and d4 center and develops naturally with Nf3. Black's ...Bg4 pins toward the f3-knight to pressure the center, so Be2 quietly breaks the pin and keeps the big pawn duo intact. White's plan is to maintain the space advantage, complete development with O-O and c4, and use the extra central territory to squeeze the cramped black position.", sayShort: "Be2 unpins, keep the big center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N408: SublineNarration = {
  intro: { say: "In the Four Pawns Attack White plays a3 to break the …Bb4 pin on the c3-knight, asking the bishop to declare itself. Black can capture with …Bxc3 to wreck White's queenside pawns and keep pressure on the d4-pawn, or retreat to e7 with a normal game. Either way the over-extended e5-d4-c4 chain remains the long-term target for Black's well-placed pieces.", sayShort: "Meet a3 — …Bxc3 damages structure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-doubled', 'concept:tac-pin'],
};

const N409: SublineNarration = {
  intro: { say: "In the Four Pawns Attack White offers Bd3 to challenge Black's active f5-bishop on the b1-h7 diagonal. Black can trade with …Bxd3 to ease the cramp and leave White's d4 and e5 pawns weaker, or keep the bishop and maintain …Bb4's pin on the c3-knight. The broad pawn chain is overextended and Black's pieces swarm the d4 and e5 squares.", sayShort: "Bd3 challenge — trade or hold f5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N410: SublineNarration = {
  intro: { say: "The Exchange Variation with the …exd6 recapture keeps a sound, symmetrical pawn skeleton and opens the e-file for Black's rooks. With Bd3 White eyes the kingside, so …Be7 and quick castling tuck the king away before Black contests the centre with …Nc6 and …Bf5 or …Bg4. The half-open e-file and the slightly cramped but solid structure give Black a reliable, low-risk game.", sayShort: "Exchange …exd6 — solid, open e-file" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N411: SublineNarration = {
  intro: { say: "This Exchange Variation arises after the …exd6 recapture, leaving a sound symmetrical skeleton and the open e-file. With Nc3 and Bd3 White develops toward the kingside, so Black answers …Be7 and quick castling before contesting the centre with …Nc6, …Bf5 and the …d5 break. The structure is solid and Black's game flows naturally with no weaknesses.", sayShort: "Exchange …exd6 — solid and open" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N412: SublineNarration = {
  intro: { say: "This is the rare Two Knights line where White meets the Alekhine with Nc3, and after …Nxc3 and dxc3 Black returns with …d6, …d5 and the bold …d4-…d3 pawn thrust. The …d3 pawn is a thorn wedged deep in White's camp, cramping the f1-bishop and the kingside while Black develops freely around it. The advanced passed pawn dictates the game and ties White's pieces to its containment.", sayShort: "…d4, …d3 — thorn in White's camp" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-passed', 'concept:pos-space'],
};

const N413: SublineNarration = {
  intro: { say: "In the Four Pawns Attack White plays Qb3 to hit the b7-pawn and pin Black's attention while breaking the …Bb4 setup. Black defends comfortably — …Qe7 or …Bxc3+ followed by …Na5 hounding the queen — and keeps the pressure on the over-extended e5-d4-c4 chain. White's queen sortie is easily met, and Black's active pieces continue to swarm the broad centre.", sayShort: "Meet Qb3 — defend b7, harass queen" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N414: SublineNarration = {
  intro: { say: "This is the aggressive Two Pawns line where Bc4-Bb3 aimed at f7 and Qh5 lunged at the kingside, but Black has already grabbed the e5-pawn and pushed it to …e4 and …e3. The e3-pawn wedges deep beside White's f2, cramping the kingside and denying White's pieces the natural squares while the queen on h5 finds no real target. Black keeps the extra pawn and a sound position; the premature attack has run out of force.", sayShort: "…e3 jams kingside — keep the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-space'],
};

const N415: SublineNarration = {
  intro: { say: "In this fianchetto setup Black plays …g6 toward …Bg7 and, after exd6 and …cxd6, gains the half-open c-file. With h3 stopping …Bg4, Black strikes with …d5, locking the centre and fixing White's c4-pawn while the long-diagonal bishop will bear on d4 and the queenside. The …d5 break grabs central space and gives Black a concrete plan against White's pawns.", sayShort: "…d5 break — fix c4, take centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pawn-fianchetto'],
};

const N416: SublineNarration = {
  intro: { say: "In the Modern Main Line White plays h3 to question the g4-bishop, forcing Black to decide between …Bh5 keeping the pin on the f3-knight or …Bxf3 trading to damage White's structure. Either way Black has completed development with …e6 and …Be7 and will castle, having kept steady pressure on the d4-pawn that the knight defends. The position is solid and the central tension favours the better-developed side.", sayShort: "Meet h3 — …Bh5 or …Bxf3" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-prophylaxis'],
};

const N417: SublineNarration = {
  intro: { say: "In the Modern Main Line White releases the central tension with exd6, transposing toward an Exchange structure where Black recaptures with …Bxd6 or …cxd6. The g4-bishop still pins down the f3-knight that guards d4, and after recapture Black has easy development with …O-O, …Nc6 and equal play. Trading the e5-pawn removes White's spearhead and frees Black's game.", sayShort: "exd6 — recapture, free development" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N418: SublineNarration = {
  intro: { say: "In the Modern Main Line White plays Re1 to back the e5-pawn and prepare to contest the e-file. Black has the g4-bishop pinning the f3-knight that guards d4, has finished development with …e6 and …Be7, and will castle before challenging the centre with …c5 or …Nc6. The pressure on d4 and the well-coordinated pieces keep Black comfortably placed.", sayShort: "Re1 backs e5 — pressure d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-open-file'],
};

const N419: SublineNarration = {
  intro: { say: "This is a Modern Main Line where White has added c4 to gain space and Nc3, then h3 to challenge the g4-bishop. Black has castled and developed fully; …Bh5 maintains the pin on the f3-knight or …Bxf3 trades to leave White with a slightly weakened kingside. The b6-knight and the pressure on d4 keep Black comfortable in a sound, manoeuvring middlegame.", sayShort: "h3 question — keep pressure on d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-king-safety'],
};

const N420: SublineNarration = {
  intro: { say: "In this Modern Main Line White plays b3 to support the c4-pawn and open the long diagonal for a bishop on b2 that reinforces d4. Black is fully developed and castled, keeping the g4-bishop's pressure on the f3-knight and eyeing the …d5 or …f6 breaks to strike at White's centre. The b6-knight and harmonious setup give Black a balanced, flexible middlegame.", sayShort: "b3 props c4 — break with …d5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N421: SublineNarration = {
  intro: { say: "In the Modern Main Line White plays the modest c3 to give the d4-pawn a granite support and prepare a slow build-up. Black is fully developed with …Bg4 pinning the f3-knight, …e6 and …Be7 in place, and will castle before breaking with …c5 or …f6 to challenge the e5-pawn. The solid but passive c3 cedes Black easy equality and a clear plan against the centre.", sayShort: "c3 props d4 — break with …c5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pos-development'],
};

const N422: SublineNarration = {
  intro: { say: "In the Modern Main Line White develops Nc3 instead of the usual c4, accepting a smaller centre. Black keeps the …Bg4 pin on the f3-knight that defends d4 and, with …e6 and …Be7 done, will castle and strike with …dxe5 or …Nc6 to dissolve White's spearhead. The reduced centre and Black's harmonious development promise comfortable, equal play.", sayShort: "Nc3 — smaller centre, …Bg4 bites" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N423: SublineNarration = {
  intro: { say: "Here White routes the knight via Nbd2, intending Nf1-g3 or Nb3 and keeping the queenside pawns flexible. Black retains the …Bg4 pin on the f3-knight that guards d4 and, fully developed with …e6 and …Be7, will castle and break with …dxe5 or …c5. White's quiet knight manoeuvre is harmless, and Black has an easy, equal game with clear targets in the centre.", sayShort: "Nbd2 manoeuvre — keep d4 pressure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N424: SublineNarration = {
  intro: { say: "This is a fully developed Exchange Variation: both sides have castled and Black's …Nc6, …Bf5 and …Be7 are harmoniously placed around the open e-file. Be3 reinforces d4 and connects White's rooks, but Black is fully equal, ready to contest the centre with …d5 or pressure d4 by trading the f5-bishop and doubling on the e-file. The structure is balanced and Black has no weaknesses.", sayShort: "Exchange — equal, fully developed" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N425: SublineNarration = {
  intro: { say: "White plays d5 immediately to kick the c6-knight and seize space before completing development. The knight finds a strong square — …Nb4 hits the d5-pawn and eyes c2 and d3 — and the advanced pawn becomes a target Black blockades. White's premature thrust leaves the d5-pawn loose and the e5-square free for Black's pieces.", sayShort: "d5 kick — …Nb4 hits the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N426: SublineNarration = {
  intro: { say: "A standard Exchange Variation where a3 takes the b4-square from Black's pieces and prepares queenside expansion with b4. Black is fully developed and equal, with …Bf5 and …Nc6 active and the e-file open; the plan is to contest the centre with …d5 or trade down on e-file pressure. White's modest a3 changes little — Black has a comfortable, weakness-free position.", sayShort: "Exchange — equal, contest with …d5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-space'],
};

const N427: SublineNarration = {
  intro: { say: "White lunges with d5 to gain space and kick the c6-knight, but the advance loosens the centre and surrenders the e5-square. The knight retreats — …Nb4 or …Ne5 finds a strong post — and the d5-pawn becomes a fixed target that Black blockades and attacks. White's space grab leaves the d-pawn overextended and the e5-outpost beckons Black's pieces.", sayShort: "Meet d5 — blockade, …Ne5 outpost" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N428: SublineNarration = {
  intro: { say: "A standard Exchange Variation in which both sides develop calmly and Nc3 reinforces White's grip on d5 and e4. Black has castled and will continue …Nc6, …Bf5 or …Bg4 to pressure d4 and contest the open e-file. The symmetrical structure offers no targets for White; Black is fully equal with natural piece play and the …d5 break in reserve.", sayShort: "Exchange — develop …Nc6 and …Bf5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N429: SublineNarration = {
  intro: { say: "In the Exchange Variation White plays b3 to support c4 and aim a bishop at the d4-pawn from b2. Black has developed naturally — …Nc6 leans on d4, …Be7 and castling complete the kingside — and will bring the bishop out to f5 or g4 before contesting the centre with …d5. The open e-file and harmonious structure leave Black equal with no targets to defend.", sayShort: "b3 supports c4 — equal Exchange" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N430: SublineNarration = {
  intro: { say: "This is the Four Pawns Attack, where f4 props up the e5-pawn and grabs maximum space. Black has struck back: …dxe5 and …Nc6 pressure d4 and e5, and …Bf5 develops the bishop to its best diagonal before …e6 locks it in. The plan is to pile up on White's broad but loosely held pawn chain rather than challenge it head-on.", sayShort: "Four Pawns — …Nc6, …Bf5 pressure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-development'],
};

const N431: SublineNarration = {
  intro: { say: "By a different order this reaches the same fully developed Exchange position, with a3 grabbing queenside space. Black's pieces are ideally placed — …Bf5 on the active diagonal, …Nc6 leaning on d4, the king safely castled — and the open e-file invites rook play. The …d5 break or pressure on d4 keeps Black fully equal with no structural concerns.", sayShort: "Exchange — harmonious, open e-file" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N432: SublineNarration = {
  intro: { say: "Reaching the same structure by a different order, White's d5 pushes past and attacks the c6-knight while grabbing space. Black reroutes the knight to a fine square — …Ne5 or …Nb4 — and treats the advanced d5-pawn as a long-term weakness to blockade and besiege. The freed e5-square is an ideal outpost for Black's pieces.", sayShort: "d5 grab — blockade and besiege" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N433: SublineNarration = {
  intro: { say: "Reaching the Exchange Variation by a c4-first order, White develops Nc3 to bolster the centre after both sides have begun castling. Black's plan is unchanged: …Nc6 and …Bf5 develop with pressure on d4, and the open e-file invites …Re8. The balanced structure and harmonious development give Black an easy, weakness-free game.", sayShort: "Exchange — easy, balanced development" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N434: SublineNarration = {
  intro: { say: "A fully developed Exchange position where b3 prepares a bishop on b2 to bolster d4 along the long diagonal. Black is comfortably equal with …Bf5, …Nc6 and …Be7 all active and the e-file open for the rooks. The plan is the …d5 break or pressure against d4, and White's fianchetto setup changes nothing about Black's sound, weakness-free game.", sayShort: "b3 fianchetto — Black fully equal" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-open-file'],
};

const N435: SublineNarration = {
  intro: { say: "Reaching the Four Pawns Attack by a different move order, Black again meets the e5-d4-c4-f4 wall with …dxe5, …Nc6 and …Bf5. The bishop on f5 eyes the b1-h7 diagonal and supports the coming …e6, while the knight on c6 leans on d4. White's space looks imposing but every advanced pawn is a target for Black's pieces.", sayShort: "Four Pawns — target the pawn chain" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-center'],
};

const N436: SublineNarration = {
  intro: { say: "A calm Exchange Variation where Be3 develops the bishop and supports the d4-pawn while both sides have started castling. Black continues …Nc6 and …Bf5 or …Bg4 to lean on d4 and contest the open e-file with …Re8. The symmetrical structure leaves no weaknesses, and Black's natural development and the …d5 break ensure full equality.", sayShort: "Be3 supports d4 — answer …Nc6" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N437: SublineNarration = {
  intro: { say: "A fully developed Exchange position where Re1 claims the open e-file, the natural battleground in this structure. Black has matched White's development with …Bf5, …Nc6 and …Be7 and will contest the file with …Re8 and challenge d4. The position is symmetrical and equal, with Black's active pieces and the …d5 break ensuring a comfortable middlegame.", sayShort: "Re1 grabs e-file — answer …Re8" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N438: SublineNarration = {
  intro: { say: "A quiet Exchange Variation where h3 simply makes luft and prevents …Bg4, after both sides have begun castling. Black develops naturally with …Nc6 and …Bf5 to press d4 and contest the open e-file with …Re8. The symmetrical structure and harmonious pieces leave Black fully equal with no weaknesses to worry about.", sayShort: "h3 luft — develop …Nc6, …Bf5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N439: SublineNarration = {
  intro: { say: "In this Chase line White's Bc4 jabs at the d5-knight, but Black calmly plays …a6 to deny White's pieces the b5-square and prepare …a5 to cramp White's queenside. The c5-pawn is over-extended and will become a target once Black breaks with …dxc5 or …e6. Black's knight on d5 is secure for now and the queenside expansion gains useful space.", sayShort: "…a6 and …a5 — queenside space" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N440: SublineNarration = {
  intro: { say: "In the Chase Variation White grabbed a pawn with exd6, but the pawn sits deep on d6 with no support and the c5-pawn is also loose. Black plays …a6 and …a5 to clamp the queenside and restrain White's pawns before rounding up the overextended d6-pawn with …Bxd6 or …Qxd6. The greedy grabs leave White with weak, scattered pawns and Black with the initiative.", sayShort: "…a6, …a5 — round up loose pawns" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-space'],
};

const N441: SublineNarration = {
  intro: { say: "Here White grabbed a pawn with exd6 in the Chase Variation, but the d6-pawn is weak and over-extended, sitting deep in Black's camp with no support. Black plays …a6 to restrict White's pieces and prepares …Bxd6 to regain the material with an active bishop. The greedy pawn grab hands Black easy development and a lead in piece activity.", sayShort: "…a6 — regain the loose d6-pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-development'],
};

const N442: SublineNarration = {
  intro: { say: "In this Chase line the c5-pawn has been exchanged off and Bc4 hits the d5-knight and the f7-square. Black answers …a6, taking the b5-square from White's pieces and preparing …e6 to challenge the bishop and complete development. The position has opened in Black's favour with a healthy structure and easy piece play.", sayShort: "…a6 — control b5, prepare …e6" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-prophylaxis', 'concept:pos-development'],
};

const N443: SublineNarration = {
  intro: { say: "Here White bolsters the e5-pawn with f4 after the c5-pawn was traded off, edging toward a Four Pawns structure. Black plays the useful …a6 to control b5 and prepare …dxe5 or …Bf5 with …e6 to undermine the centre. The advanced e5-f4 duo looks strong but is loosely held, and Black's pieces will press it once development is complete.", sayShort: "…a6 — prepare to undermine e5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N444: SublineNarration = {
  intro: { say: "In the Chase Variation Nc3 challenges the d5-knight while the c5-pawn stakes out queenside space. Black plays …a6 and …a5 to clamp that side and restrain White's pawn majority before striking the centre with …dxc5 or …e6. The c5-pawn is a long-term weakness, and Black's queenside expansion neutralises White's space.", sayShort: "…a6, …a5 — clamp the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pawn-backward'],
};

const N445: SublineNarration = {
  intro: { say: "This Chase line sees White develop Nf3 to support the centre while keeping the c5-pawn's space. Black expands with …a6 and …a5 to restrain White's queenside and prepares …dxc5 or …e6 to undermine the advanced pawn. The d5-knight is secure and the c5-pawn will become a target, leaving Black with a comfortable, active position.", sayShort: "…a5 — restrain, target c5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pawn-backward'],
};

const N446: SublineNarration = {
  intro: { say: "In this Chase line the c5-pawn has been traded off and Nc3 challenges the well-placed d5-knight. Black plays …a6 to keep White's pieces off b5 and prepare …Be7, …Be6 and castling with a free position. With the early space evaporated and even material, Black has comfortable development and the half-open files to work with.", sayShort: "…a6 — free Chase Variation game" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-prophylaxis'],
};

const N447: SublineNarration = {
  intro: { say: "This is the Chase Variation, where c4 and c5 harried the knight from d5 to b6 and back to d5, but the c5-pawn was loosened and traded off. After …dxe5 and Nxe5 the board has simplified sharply: White's space is gone and Black has the freer development with …Bf5, …e6 and …Be7 to come. The d5-knight is well placed and the position is balanced.", sayShort: "Chase Variation — simplified, free game" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-tempo', 'concept:pos-development'],
};

const N448: SublineNarration = {
  intro: { say: "The knights have traded on d7, and after …Bxd7 Black has a comfortable, simplified position with the light-squared bishop already developed. Bc4 targets the f7-square, so …a6 prepares …e6 to blunt the bishop and complete development with …Be7 and …O-O. With the heavy central pawns gone and even material, Black faces no weaknesses.", sayShort: "…a6 blunts the c4-bishop" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N449: SublineNarration = {
  intro: { say: "The knights have traded on d7 and White props the d4-pawn with c3, settling for a small, solid centre after the early tension dissolved. Black recaptured with …Bxd7, has the freer development, and plays …a6 to prepare …e6, …Be7 and castling. With the heavy centre gone and even material, Black faces a quiet, equal game with easy piece play.", sayShort: "c3 props d4 — quiet equality" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N450: SublineNarration = {
  intro: { say: "After the knight trade on d7 and …Bxd7, White develops Bd3 to eye the kingside on the b1-h7 diagonal. Black plays …a6 to deny b5 and prepares …e6, …Be7 and castling, with the light-squared bishop already out and no weaknesses. The simplified position is balanced and Black completes development without difficulty.", sayShort: "…a6 — calm, simplified equality" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N451: SublineNarration = {
  intro: { say: "Following the knight trade on d7 and …Bxd7, White develops modestly with Be2 and prepares to castle. Black has the more active light-squared bishop and plays …a6 to control b5 before …e6, …Be7 and castling. The simplified, symmetrical structure with the big centre dissolved gives Black a fully equal, comfortable game.", sayShort: "…a6 — equal, comfortable simplification" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N452: SublineNarration = {
  intro: { say: "Black already cleared the centre with …dxe5 and challenged the e5-knight with …Nd7, and after the knight retreated to f3, the …e6 and …e5 plan strikes at d4 directly. With …e5 Black contests the centre as an equal, having traded off White's advanced e-pawn and freed the position. The pieces flow out naturally and the early space edge has evaporated.", sayShort: "…e5 contests the centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pos-development'],
};

const N453: SublineNarration = {
  intro: { say: "White tried the unsound Nxf7 sacrifice, but the knight on e5 was simply attacked by …Nd7 and the sac gives up a piece for two pawns and a check. Black's king takes on f7 and, though it has lost castling, it sits safely on a quiet board with an extra knight. The …a6 luft and patient consolidation will convert the material; the sacrifice has no follow-up attack.", sayShort: "Refute Nxf7 — up a piece" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-sacrifice', 'concept:pos-king-safety'],
};

const N454: SublineNarration = {
  intro: { say: "This is the Modern Exchange with a fianchetto: Black recaptured toward the centre with …cxd6 and built the Pirc-style setup with …g6 and …Bg7. The …e5 strike hit the d4-pawn, and dxe5 opens the long diagonal where the g7-bishop already aims at the e5-pawn and beyond. Black recaptures on e5, freeing the position and trading off the broad pawns that defined White's space advantage.", sayShort: "…e5 break — recapture on e5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N455: SublineNarration = {
  intro: { say: "This is the Modern Exchange with a fianchetto, where …cxd6 kept the half-open c-file and …g6 prepares the long-diagonal bishop. White's h3 makes luft and stops …Bg4, after which …Bg7 completes the Pirc-like setup aiming at d4 and the e5-square. Black will castle and strike with …e5 or …Nc6 to challenge White's broad centre.", sayShort: "…Bg7 fianchetto — aim at d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N456: SublineNarration = {
  intro: { say: "Here White advanced d5 to grab space, and Black met it with …e5 and …e4, slamming the door shut and gaining a protected passed-pawn feel in the centre. The …e4 pawn cramps White's kingside and denies the f3-square to White's knight, while the closed centre lets Black expand with …f5 and a kingside attack. The space White grabbed has been turned against him.", sayShort: "…e5, …e4 — close and cramp" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N457: SublineNarration = {
  intro: { say: "In the Modern Exchange with …cxd6 and a fianchetto, Black has the half-open c-file and a g6-bishop coming to g7. After Bd3 Black strikes with …d5, locking the centre and fixing White's c4-pawn as a target while the long-diagonal bishop bears down on the queenside. The …d5 break seizes central space and gives Black a clear plan against White's pawns.", sayShort: "…d5 — lock centre, fix c4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pawn-fianchetto'],
};

const N458: SublineNarration = {
  intro: { say: "The queen drops back to c7, the natural Morra square, lining up on the c-file and guarding e5 while eyeing the b8-h2 diagonal. White keeps the standard machinery: rook on d1 against the d6-pawn, bishop on c4 against f7, knight on c3 ready to jump to d5 or b5. Because Black's queen sits on the same file as White's rook, ideas of Nd5 and Nb5 hitting c7 keep the initiative pressing.", sayShort: "…Qc7 — answer with Nd5/Nb5 ideas" },
  sources: ['concept:pos-initiative', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N459: SublineNarration = {
  intro: { say: "Black castles into the standard accepted-Morra structure, and now every White piece points at the king: bishop on c4 at f7, knight on c3 ready for d5, rook on d1 on the d6-pawn, queen on e2 fuelling e4. The plan is to keep developing toward the king — a rook to c1 or d5 ideas — rather than rushing to win the pawn back. Black's lack of counterplay is the gambit's whole point; the lead in development is the compensation.", sayShort: "Black castles — pile pieces toward f7" },
  sources: ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N460: SublineNarration = {
  intro: { say: "Black develops …Bd7 in the accepted Morra, connecting the back rank and preparing …Rc8 to contest the c-file. White's machine is fully in place: bishop on c4 at f7, knight on c3 ready for d5 or b5, rook on d1 against the d6-pawn, queen on e2 holding e4. The plan is to bring the last rook to c1 and keep the pieces pointing at the king before Black coordinates — initiative is the compensation, not the pawn.", sayShort: "…Bd7 — fight for the c-file" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N461: SublineNarration = {
  intro: { say: "The queen swings to a5, pinning the c3-knight against nothing concrete but eyeing the a5-e1 diagonal and the e5-square. White carries on developing with the same plan: the rook on d1 pressures d6, the bishop on c4 watches f7, and the knight on c3 still wants d5 where it cannot be taken comfortably. The misplaced queen on a5 can become a target for b4 or Nd5, so the initiative keeps rolling and the gambit pawn stays a fair price.", sayShort: "…Qa5 — target the queen, keep pressing" },
  sources: ['concept:pos-initiative', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N462: SublineNarration = {
  intro: { say: "Black plays …a6 to take the b5-square from the knight and prepare …b5 against the c4-bishop before castling. White does not slow down: the rook on d1 eyes the d6-pawn, the bishop watches f7, and the knight on c3 still has the d5-outpost. Meeting …b5 with the bishop dropping to b3 keeps the diagonal alive, and Rac1 piles onto the c-file — the lead in development is the gambit's lasting compensation.", sayShort: "…a6 readies …b5 — keep developing" },
  sources: ['concept:pos-development', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N463: SublineNarration = {
  intro: { say: "The queen hops to b6, hitting the b2-pawn and the f2-square while trying to disrupt White's smooth setup. White ignores the b2-pawn or guards it and keeps the initiative: the rook on d1 presses d6, the bishop on c4 watches f7, and the knight on c3 eyes d5 and b5 hitting the loose queen. The exposed queen on b6 is a target — Na4 or Be3 with tempo can chase it — so the gambit pressure only grows.", sayShort: "…Qb6 hits b2 — chase the queen" },
  sources: ['concept:pos-initiative', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N464: SublineNarration = {
  intro: { say: "Black has played …e5 to blunt the centre and now pins the f3-knight with …Bg4, hoping to trade off an attacker. The standard answer is to ignore the pin and keep building: the rook on d1 stares down the d6-pawn, the queen sits on e2 holding e4, and the bishop on e3 pressures the dark squares. The pin is loose — h3 can question the bishop, and the half-open files keep Black tied to defence rather than counterplay.", sayShort: "Meet …Bg4 pin — keep the d-file pressure" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N465: SublineNarration = {
  intro: { say: "With both rooks on the c- and d-files and the queen on e2, Black offers a trade of the light-squared bishops with …Be6 to ease the pressure on f7. Trading there is fine, but the engine of the gambit stays the same: the c-file rook hammers the c6-knight and the backward d6-pawn, and the dark-squared bishop on e3 eyes the queenside. The initiative is worth more than the pawn as long as Black's pieces stay passive.", sayShort: "…Be6 offers trade — keep the files" },
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N466: SublineNarration = {
  intro: { say: "Black has both rooks bearing on the c- and d-files facing him and plays …a6 to stop Nb5 and prepare …b5 to hit the c4-bishop. The reply is to keep the squeeze: the rook on c1 hammers the c-file and the c6-knight, the bishop on e3 covers the dark squares, and Bb3 retreats the bishop to safety while keeping the f7 diagonal. Black is solid but passive, and the open files are lasting compensation for the pawn.", sayShort: "…a6 prepares …b5 — hold the files" },
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N467: SublineNarration = {
  intro: { say: "Black declines with …Nf6 and develops the queen's knight to c6 to hit the d4-pawn, but after e5 kicks the knight to d5 and cxd4 rebuilds, White holds the broad centre on d4 and e4. This is the declined Morra played for space rather than a pawn. The quiet a3 takes the b4-square away from Black's pieces and prepares to expand on the queenside while the centre rolls.", sayShort: "Declined — central space, a3 clamp" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N468: SublineNarration = {
  intro: { say: "Black strikes at the cramping e5-pawn with …dxe5, the principled try to free the position in the declined Morra. Recapturing keeps the initiative: Nxe5 centralises the knight, hits the c6-knight and f7, and trades into a structure where White's d4-pawn and active pieces dominate. The bishop on c4 and the open lines mean Black still has to prove the freeing trade did not just open the game for the better-developed side.", sayShort: "…dxe5 — recapture, keep the initiative" },
  sources: ['concept:pos-centralization', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N469: SublineNarration = {
  intro: { say: "Black plays …e6 to give the d5-knight a retreat and challenge the c4-bishop's diagonal toward f7. White keeps the declined-Morra blueprint: pawns on d4 and e4 hold the centre, the e5-pawn cramps Black's kingside, and the bishop eyes the weakened light squares around d5 and f7. Trades that open the d-file or the long diagonal favour the side with more space — that is White here.", sayShort: "…e6 — central space, light-square pressure" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N470: SublineNarration = {
  intro: { say: "In the declined line the d5-knight retreats to b6, attacking the c4-bishop, which sidesteps to b5 to keep pinning the c6-knight and pressuring the centre. Black unpins with …Bd7. White's edge is the centre pawn on e5 cramping Black plus the bishop pair pressure; after exchanges on c6 or d7 the broad d4-e4 structure remains the trump. Keep the e5-pawn supported and the d-file in mind.", sayShort: "…Bd7 unpins — central clamp stands" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N471: SublineNarration = {
  intro: { say: "After the d5-knight hits c4 and the bishop drops to b5, Black plays …a6 to question the pinning bishop at once. The bishop can take on c6 to damage Black's structure or retreat keeping the pin, but either way White's broad d4-e4 centre and the cramping e5-pawn are the lasting pluses. The point of the declined Morra is space and freer development, and …a6 spends a tempo that lets White keep building.", sayShort: "…a6 hits the bishop — clamp holds" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N472: SublineNarration = {
  intro: { say: "Black tries to free himself with the central thrust …d5, hitting the e4-pawn and challenging the bind, while the b6-knight already attacked the c4-bishop that moved to b5. The d5-pawn can be met by exd6 en passant to keep the e5-wedge gone but the d-file open, or by holding e4 with pieces. White's lead in development and the pin on the c6-knight mean the freeing break tends to open lines for the side that is better mobilised.", sayShort: "…d5 break — open lines favour White" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N473: SublineNarration = {
  intro: { say: "Black plays …e6 to free the f8-bishop and prepare to break the e5-cramp, after the b6-knight chased the bishop to b5 where it pins the c6-knight. White keeps the declined-Morra trumps: the pawn on e5 cramps Black, the d4-pawn anchors the centre, and the pinned knight on c6 limits Black's freeing moves. Holding e5 and the central space is the method; this is a positional pull, not a tactical strike.", sayShort: "…e6 frees Black — hold e5 cramp" },
  sources: ['concept:pos-space', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N474: SublineNarration = {
  intro: { say: "Black pins the f3-knight with …Bg4 to chip at the support of the e5-pawn and the d4-centre, with the b6-knight and the c6-knight already engaged. White meets the pin calmly: Be3 or h3 and Be2 ideas keep the centre intact, and the e5-pawn keeps cramping Black. The declined Morra leaves White with the broad d4-e4 centre and freer pieces, so trading into a structure where space tells is fine.", sayShort: "…Bg4 pins f3 — keep e5 centre" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N475: SublineNarration = {
  intro: { say: "Black sidesteps the gambit with …Nf6, so the pawn is pushed to e5 and the knight is kicked to d5, then c3xd4 rebuilds a broad pawn centre on d4 and e4. This is the declined Morra: instead of an extra pawn for Black, White owns the centre and a free game. The little move a3 stops …Nb4 hitting the d5-knight and clamps the b4-square before rolling the centre forward.", sayShort: "Declined — broad center on d4-e4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N476: SublineNarration = {
  intro: { say: "When Black grabs on c3 with …dxc3 and the knight recaptures on c3, the full gambit is on: one pawn invested for a raking lead in development. The bishop bites at f7 from c4, the knight on c3 eyes d5, and after castling the rooks come to the half-open c-file and d-file straight at Black's queen and the d6-square. The plan is pure initiative — pile on the dark squares before Black untangles the kingside.", sayShort: "Accepted Morra — initiative for the pawn" },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N477: SublineNarration = {
  intro: { say: "Black has traded down through …dxe5 and the knights on d7, reaching a calmer declined-Morra structure where the b5-bishop drops back after …a6. White keeps a pleasant pull: the pawn on d4 anchors the centre, the knight on c3 eyes d5, and the half-open d-file gives the rooks a target. With queens still on, the slightly freer development and central space remain White's assets even without the gambit pawn.", sayShort: "Simplified declined — central pull stands" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N478: SublineNarration = {
  intro: { say: "Black declines the pawn the safest way, returning it with …d3 so the bishop recaptures on d3 and no gambit fire remains. White answers with c4, building the Maroczy bind: pawns on c4 and e4 clamp the d5-square and choke Black's freeing …d5 break. After the fianchetto on g7 meets the knight on c3, this is a positional squeeze, not a sacrifice — space and the bind do the work.", sayShort: "Morra declined — Maroczy c4-e4 bind" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N479: SublineNarration = {
  intro: { say: "In the declined Morra with the Maroczy bind, Black sets up the Hedgehog with …d6, …g6 and …a6, planning a slow …b5 break against the c4-pawn. White's reply is to keep the clamp: pawns on c4 and e4 deny the d5-square, the bishop sits on e3 over the dark squares, and h3 gives the king luft and stops …Ng4. The …a6 move signals queenside play, so meeting …b5 with patience and piece pressure keeps the bind intact.", sayShort: "Maroczy bind — restrain Black's …b5" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N480: SublineNarration = {
  intro: { say: "Black completes the Hedgehog under the Maroczy bind and develops the light-squared bishop to d7, planning …a6 and …b5 or a rook lift to c8. White's job is to keep the c4-e4 clamp that denies the …d5 break and the d5-square. The bishop on e3 holds the dark squares, the knight on c3 guards d5 and e4, and slow queenside restraint plus a timely f4 or central pressure keeps Black boxed in.", sayShort: "Hedgehog vs bind — restrain …b5" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N481: SublineNarration = {
  intro: { say: "In the Maroczy-bind Morra declined, Black develops …Be6 to pressure the c4-pawn and prepare …Nd7 with …b5 later. White holds the clamp: the c4 and e4 pawns deny the …d5 break, the bishop on e3 controls the dark squares, and the knight on c3 covers d5. If Black trades the e6-bishop for the c4 pawn's guardian, recapturing keeps the bind; the squeeze, not a quick attack, is the winning method here.", sayShort: "…Be6 hits c4 — keep the bind" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N482: SublineNarration = {
  intro: { say: "Black pins the f3-knight with …Bg4 before castling, trying to trade a defender of the centre. Under the Maroczy bind that pin is harmless: Be2 or h3 unravels it, and the c4-e4 pawns keep choking the …d5 break either way. White's plan is unchanged — finish development, keep the clamp on d5, and use the extra space to push the queenside or central pawns when Black runs out of useful moves.", sayShort: "…Bg4 pin — break it, hold the bind" },
  sources: ['concept:tac-pin', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N483: SublineNarration = {
  intro: { say: "Black sets up …e6 and the g7-fianchetto, a flexible Maroczy structure aiming for …Nge7 and a later …d5 or …b5. White's task is to keep the c4-e4 bind that smothers the …d5 freeing move and to claim the extra space. Castling and a bishop to e3 over the dark squares complete the clamp; the declined Morra is a positional bind, so patience and central control, not a sacrifice, carry the day.", sayShort: "…e6 fianchetto — keep c4-e4 bind" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N484: SublineNarration = {
  intro: { say: "Black plays …b6 to fianchetto the queen's bishop to b7, double-pressuring the e4-pawn and supporting an eventual …d5 break under the Maroczy bind. White answers by overprotecting e4 and keeping the c4-pawn clamp on d5: the knight on c3 and a queen or rook backing e4 hold the centre. The bishop on e3 keeps the dark squares, and the extra space lets White meet …d5 with a favourable opening of the position.", sayShort: "…b6 eyes e4 — overprotect, keep bind" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N485: SublineNarration = {
  intro: { say: "Black slips in …h6 in the Maroczy bind to deny White's pieces the g5-square and rule out a future Bg5 pin. It is a slow move that does not free the position, so White keeps clamping: the c4-e4 pawns deny …d5, the bishop on e3 holds the dark squares, and the knight on c3 covers d5. With Black short of active breaks, White can expand on the queenside or prepare f4 to claim even more space.", sayShort: "…h6 is slow — keep the bind" },
  sources: ['concept:pos-space', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N486: SublineNarration = {
  intro: { say: "Black plays …a6 early in the Maroczy structure, before castling, to prepare …b5 against the c4-pawn and gain queenside space. White stays on plan: keep the c4-e4 clamp that denies …d5, finish development with the bishop to e3, and watch the d5-square the bind controls. The …a6 and …b5 expansion is slow, so meeting it with piece pressure and central space keeps the bind that is the soul of the declined Morra.", sayShort: "Early …a6 — keep the central clamp" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N487: SublineNarration = {
  intro: { say: "Against the flexible ...e6 setup White castles and keeps the Bb5 pressure on the c6-knight, preparing Re1 and the central c3 with d4 break. Here Bxc6 would hand Black the bishop pair, so White often retreats the bishop and plays for a small but lasting space edge with the d4-thrust. The plan is to open the center under good circumstances and use the lead in development against Black's slightly cramped pieces.", sayShort: "Castle, prepare the c3 and d4 break" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N488: SublineNarration = {
  intro: { say: "With ...d6 Black supports a future ...e5 and keeps a solid Sicilian structure, so White castles and keeps the Bb5 aimed at the c6-knight. White's plan is to play Bxc6 followed by bxc6 to fix doubled pawns, or to keep the tension with Re1 and c3 preparing d4. The aim is a comfortable positional game where White's structural pressure on c6 and the half-open lines outweigh Black's bishop pair.", sayShort: "Castle, eye Bxc6 on the c6-knight" },
  sources: ['concept:pawn-doubled', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N489: SublineNarration = {
  intro: { say: "Black develops with ...Nf6, attacking the e4-pawn and inviting White to clarify with Bxc6 or to defend with Nc3 or Qe2. White's most testing plan is Bxc6, doubling Black's pawns and then meeting ...dxc6 with a structural game against the weakened c-pawns. The idea is to trade into a position where Black's doubled pawns and lack of a clear pawn break give White a stable, risk-free edge.", sayShort: "Bxc6 doubles, defend e4 cleanly" },
  sources: ['concept:pawn-doubled', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N490: SublineNarration = {
  intro: { say: "Black grabs central space with ...e5, but the move leaves the d5-square permanently weak and the d6-pawn potentially backward. White castles and aims to exploit the d5-hole, rerouting a knight to d5 and pressuring the soft d6-point. The plan is to trade on c6 if useful and then occupy the d5 outpost, turning Black's space grab into a chronic structural liability.", sayShort: "Castle, exploit the d5-hole" },
  sources: ['concept:pos-outpost', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N491: SublineNarration = {
  intro: { say: "Black's …Ne7 in the French-style Fantasy keeps the f6-square free and heads for f5 or g6, but it blocks the f8-bishop's retreat and clogs the kingside. White's Bf4 eyes the c7-square and the dark squares while the d4-e4 centre with f3 backing it stays robust. White can break with a3 to question the Bb4 and expand, keeping the freer game.", sayShort: "Passive Ne7 — Bf4 and centre press" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N492: SublineNarration = {
  intro: { say: "After …Nf6 Black develops naturally and adds a second attacker to the e4-pawn, but f3 holds e4 firmly and Bf4 controls the e5-square and the c7-h2 diagonal. With the Bb4 pinning the c3-knight, White plays a3 to challenge it and keep the broad d4-e4 centre. The f3-pawn supporting e4 is the spine of the Fantasy, giving White lasting central space.", sayShort: "Nf6 hits e4 — f3 holds, Bf4 active" },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N493: SublineNarration = {
  intro: { say: "Black trades on e4 and pushes the pawn deep with …e3 then …e2, jamming White's first rank but leaving the runner far from support. White's a3 and b3 keep the queenside solid while the advanced e-pawn is simply rounded up by Bxe2 or Bf1, gaining tempo. The Bf4 and the strong d4 centre leave White comfortably ahead once the loose pawn falls.", sayShort: "e3-e2 runner — round it up, gain tempo" },
  sources: ['concept:pos-tempo', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N494: SublineNarration = {
  intro: { say: "Black trades …Bxc3+, and bxc3 hands White the bishop pair and a reinforced d4-pawn at the cost of doubled c-pawns. After …c5-c4 fixes the queenside, White's two bishops rake the open position and the c3-pawn shields d4. The half-open b-file for the rook plus the bishop pair give White lasting pressure against Black's slower setup.", sayShort: "bxc3 — bishop pair, b-file, strong d4" },
  sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N495: SublineNarration = {
  intro: { say: "Black's …Nd7 prepares …Ngf6 or …e5 while keeping the structure flexible, but it leaves the kingside undeveloped and the king in the centre. White's Bf4 controls e5 and the dark diagonal, f3 holds e4, and the d4-e4 centre stays firm. White challenges the Bb4 pin with a3 and keeps the freer position with more central space.", sayShort: "Nd7 slow — Bf4 and centre dominate" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N496: SublineNarration = {
  intro: { say: "Black trades on e4 then plays …e5 and …Bg4 to pin the f3-knight and pressure d4. White meets the pin calmly: a3 and b3 secure the queenside, and after …c5-c4 the b3-lever exposes the c4-pawn as a weakness. White's central pawns on d4 and e4 plus the half-open f-file give the initiative once the pin is broken with h3 or Be2.", sayShort: "Bg4 pins Nf3 — b3 hits c4" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N497: SublineNarration = {
  intro: { say: "Black combines …Bb4 with …Qa5 to pile on the pinned c3-knight, but a3 questions the bishop and unpins by adding b4 ideas. After …c5-c4, b3 levers the c4-pawn while the d4-e4 centre with f3 backing holds. White's Bf4 and central space give the initiative, and Black's queen on a5 can become a target after b4.", sayShort: "Qa5 piles on Nc3 — a3 unpins" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N498: SublineNarration = {
  intro: { say: "In the fianchetto Fantasy, …Qb6 pressures b2 and d4 while …c5-c4 grabs queenside space. White braces with a3 and meets …c4 with b3 to lever the pawn off c4, opening lines against Black's queenside. The d4-e4 centre backed by f3 and the Be3 give White a broad space advantage and targets on the loose c-pawn.", sayShort: "Qb6 and c4 — b3 cracks the chain" },
  sources: ['concept:pos-space', 'concept:pawn-backward', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N499: SublineNarration = {
  intro: { say: "After the e4-trade, …c5 and …c4 grab space while …Qb6 pressures b2 and d4; …a6 prepares …b5 to defend the c4-pawn. White's a3 and b3 lever the advanced c4-pawn, and the d4-e4 centre with the half-open f-file aims at f7. Black's queenside expansion is loosening, leaving the c-pawn weak and the king uncastled.", sayShort: "c4 and a6 — b3 undermines the chain" },
  sources: ['concept:pawn-backward', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N500: SublineNarration = {
  intro: { say: "Black plays …b6 and …b5 to expand on the queenside and prepare a fianchetto, but this leaves the c6-pawn and the long light diagonal weak. White answers with a3 to question the Bb4 and b3 to brace the queenside, keeping the d4-e4 centre intact. White's central space and the Bf4 outpace Black's slow flank play, with the c6-square a lasting weakness.", sayShort: "b6-b5 flank — weak c6, strong centre" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N501: SublineNarration = {
  intro: { say: "After the e4-trade Black tries …Nf6 to provoke, and e5 kicks the knight while clamping the dark squares from d4-e5. With …c5-c4 and the …c3 thrust, Black plants a pawn deep on c3, but a3 and b3 keep the queenside intact and the c3-pawn becomes a weak, overextended target. White's space and the strong e5-d4 chain dominate the centre.", sayShort: "e5 kicks knight — c3 pawn overextends" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N502: SublineNarration = {
  intro: { say: "After the e4-trade Black sets a French-style …e6 and grabs space with …c5-c4. White builds a solid pawn wall with a3, b3, and c3 to bolster d4, and …e5 then strikes at the centre. With pawns on c3, d4, and e4, White holds a broad, well-supported centre while Black's overextended c4-pawn and uncastled king lag behind.", sayShort: "e6 and c4 — c3 shores up d4" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N503: SublineNarration = {
  intro: { say: "After the e4-trade Black fianchettos with …g6 but then lashes out with …g5, weakening his own kingside. White builds the c3-d4-e4 pawn chain with a3, b3, and c3 to anchor the centre, and the loose …g5 advance creates holes on f5 and h5. White's solid centre and Black's airy kingside hand White a clear structural edge and targets to attack.", sayShort: "g5 weakens kingside — solid centre punishes" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N504: SublineNarration = {
  intro: { say: "Black develops …Nd7 then expands with …c5-c4 and prepares …b5 with …a6 to hold the c4-pawn. White builds the c3-d4-e4 chain with a3, b3, and c3 to anchor the centre, and the b3-lever earlier still leaves c4 loose. White's broad centre and half-open f-file dominate while Black's queenside pawns overreach without his king castled.", sayShort: "Nd7 and c4 — c3 anchors centre" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N505: SublineNarration = {
  intro: { say: "With …e6 Black enters a French-flavoured Fantasy where Bb4 pins the c3-knight and Bf4 develops with tempo. After a3 questions the bishop and …c5-c4 grabs queenside space, b3 levers the c4-pawn and …e5 challenges d4 and the f4-bishop. White's d4-e4 centre and the f3-pawn supporting it give a durable space edge while Black's pawns overextend.", sayShort: "French-style Bb4 pin — b3 breaks c4" },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N506: SublineNarration = {
  intro: { say: "Black challenges d4 with …e5 then develops …Be6 to bolster the centre and eye White's queenside. Nf3 defends d4 and prepares castling, while a3 and b3 brace the queenside; after …c5-c4, the b3-lever undermines the advanced c4-pawn. White's centre, the f-file, and smoother development outweigh Black's space grab.", sayShort: "Be6 props centre — b3 undercuts c4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N507: SublineNarration = {
  intro: { say: "Black opens the centre with …exd4, and White gambits the pawn with Bc4 and quick O-O for rapid development and an attack on f7. The bishop on c4 stares down f7, the rook lands on f1 behind the half-open f-file, and Black's king is still in the centre. White's lead in development and the f7-pressure fully compensate for the d4-pawn.", sayShort: "Gambit centre — Bc4 and Rf1 hit f7" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N508: SublineNarration = {
  intro: { say: "Black strikes early with …e5, and dxe5 grabs the pawn while …Bc5 and the …d4-d3-d2+ pawn run try to disrupt White's coordination. The d2-pawn gives only a harmless check and is collected by Bxd2 or Qxd2, leaving White a clean pawn ahead. White's extra e5-pawn and Black's loose, undefended advance decide matters once development catches up.", sayShort: "dxe5 grabs pawn — d2 check is harmless" },
  sources: ['concept:pos-tempo', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N509: SublineNarration = {
  intro: { say: "Black trades on e4 and fianchettos …Bg7 to pressure the d4-e4 centre along the long diagonal. White answers with a3 and b3 to secure the queenside, and after …c5-c4 the b3-lever exposes the c4-pawn. The broad central pawns and the half-open f-file give White space and an attacking base, while Black's queenside pushes loosen his own structure.", sayShort: "Bg7 eyes centre — b3 hits c4" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N510: SublineNarration = {
  intro: { say: "Black mixes …g6 with …e6 and a quick …b5-b4 queenside expansion, loosening his structure on both wings. White meets …b4 with a3 to challenge it and b3 to keep the queenside firm, while Be3 supports d4 and the e4-pawn holds. The committal pawn pushes leave Black's king uncastled and his pawns overextended against White's compact d4-e4 centre.", sayShort: "b5-b4 overextends — White centre stays compact" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N511: SublineNarration = {
  intro: { say: "Against the …g6 fianchetto setup, …dxe4 fxe4 hands White a broad pawn front on d4 and e4 with the f-file half-open for the rook. After …c5 and …c4, Black grabs queenside space but b3 levers the c4-pawn loose, exposing it as a target. White's centre and the Be3 plus half-open f-file give the more harmonious position.", sayShort: "Fianchetto Fantasy — b3 undermines c4" },
  sources: ['concept:pos-center', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N512: SublineNarration = {
  intro: { say: "In the fianchetto Fantasy Black grabs the b2-pawn with …Qxb2, but the queen is now stranded deep in White's camp with the rook eyeing it down the b-file. After a3 and g3, White prepares to trap or harass the queen while keeping the d4-e4 centre; …c5 hits d4 but leaves Black badly behind in development. The pawn is a poisoned grab against White's lead in piece play.", sayShort: "Poisoned b2 — queen stranded, develop fast" },
  sources: ['concept:tac-trap', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N513: SublineNarration = {
  intro: { say: "With …Qb6 pressuring b2 and d4, Black tries …e5 to crack the centre, but White is solidly braced: a3 and b3 cover the queenside and the d4-e4-f3 pawn trio holds firm. After …c5, Black has two pawn levers but no development, while White's pieces aim at the centre and f7. The premature pawn pushes leave Black's king stuck and the centre in White's favour.", sayShort: "e5 and c5 levers — centre holds firm" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N514: SublineNarration = {
  intro: { say: "Black completes the fianchetto with …Bg7 and develops …Nf6 to pressure e4, a Pirc-like structure inside the Fantasy. White's f3 holds e4, Be3 supports d4 and eyes the dark squares, and the d4-e4 pawns command the centre. White can expand with Qd2 and queenside play while Black's kingside fianchetto leaves the long diagonal contested.", sayShort: "Bg7 fianchetto — f3 holds, Be3 braces" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N515: SublineNarration = {
  intro: { say: "The Fantasy Variation with f3 props up the e4-pawn so White builds a broad d4-e4 centre against the Caro. After …Qb6 hits b2 and the trade on e4, …e5 strikes at d4; a3 and b3 simply shore up the queenside while c2 stays solid. With …c5-c4, Black grabs space but b3 undermines it, and White's centre plus the half-open f-file aim the attack at f7.", sayShort: "Fantasy f3 — big centre, b3 hits c4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N516: SublineNarration = {
  intro: { say: "Black develops …Nf6 to hit the e4-pawn while …Qb6 eyes b2 and d4. White holds e4 with the f3-square gone, props the queenside with a3, and meets …c5-c4 with b3 to crack the chain. The broad d4-e4 centre and the half-open f-file give White space and an attacking front against Black's slow queenside play.", sayShort: "Nf6 hits e4 — b3 levers c4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N517: SublineNarration = {
  intro: { say: "After …Qb6 eyes b2, …e6 reinforces d5 and opens the f8-bishop in a French-style structure. White covers b2 with a3, keeps the centre, and meets …c5-c4 with b3 to lever the c4-pawn, while g3 prepares a fianchetto. The closing …e5 strikes at d4, but the d4-e4 centre with f3 and g3 support gives White the more flexible, better-developed position.", sayShort: "e6 French setup — b3 and g3 expand" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N518: SublineNarration = {
  intro: { say: "Black lunges …e5, and dxe5 wins the pawn while …d4 and …d3 then …d2+ try to jam White's position with a runaway pawn. The d2-pawn delivers a harmless check but is cut off from support and falls to Bxd2 or Qxd2, leaving White a clean pawn up. White's extra e5-pawn and Black's wrecked centre and exposed king decide the position.", sayShort: "dxe5 wins pawn — d2 runner falls" },
  sources: ['concept:pos-tempo', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N519: SublineNarration = {
  intro: { say: "Black's Qb6 pressures d4 and b2, and the thrust c4 releases the tension to clamp the queenside and free Na5 toward the b3 and c4 squares. White's a3 took b4 away from the knights and Nbd2 reroutes toward b1-c3 or f1-e3, eyeing the holes Black created. The locked chain now means play is about the wings: White builds the f4-f5 kingside break while Black's knight drifts to the rim on a5.", sayShort: "Locked chain — kingside break beckons" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N520: SublineNarration = {
  intro: { say: "By closing with c4 Black trades central tension for a queenside bind and frees the knight to a5, heading for b3 or c4. White's a3 already denied b4 to the black pieces and Nbd2 prepares to regroup the knight toward the holes on the light squares. With the centre locked, White turns to the kingside and the standard f4-f5 lever, where the e5 pawn anchors the entire attack.", sayShort: "c4 locks — White eyes f5" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N521: SublineNarration = {
  intro: { say: "Nge7 sends the knight toward f5 or g6 to bear down on d4 and e5 rather than blocking the c6-knight's pressure. White's Na3 is the flexible reply, planning Nc2 to overprotect d4 while keeping b1 clear and eyeing b5 if Black loosens the queenside. The chain stays intact, and White stockpiles defenders of d4 before turning to expansion on the kingside.", sayShort: "Na3 reroute — overprotect d4" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N522: SublineNarration = {
  intro: { say: "Black develops the bishop to d7 first, planning the same Bb5 trade to relieve the cramped light-squared bishop. White prepares a3 and answers Bb5 with c4, striking d5 and the bishop together; after Bxc4 White concedes a pawn for the bishop pair, the half-open lines, and a clear lead in development. The follow-up is to harass the c4-bishop and exploit the opened centre while Black's queen idles on b6.", sayShort: "c4 break — bishop pair, lead" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N523: SublineNarration = {
  intro: { say: "Black routes the knight via h6 toward f5, the French method of attacking d4 and e3 without obstructing the c6-knight. White ignores the threat to capture on h6 and instead develops the bishop to d3, content to let Black spend a tempo while White builds toward the kingside light squares. If the knight lands on f5, White can challenge it; meanwhile the e5 chain and the d3-bishop keep the long-term initiative on White's side.", sayShort: "Nh6-f5 plan — Bd3 develops" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N524: SublineNarration = {
  intro: { say: "Instead of the usual c5, Black tries a queenside pawn rush with b6, Qd7 and b5-b4 to undermine White's c3-d4 chain from the flank. White meets the storm with a3 and b3, fixing the b4 pawn and keeping the queenside closed so the lunges run out of steam. With Black's pieces still on the back rank and the centre solid, White stands better and can later open the kingside where Black has spent no time.", sayShort: "Flank rush stalled — centre holds" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N525: SublineNarration = {
  intro: { say: "The knight steers to h6 intending Nf5 to hit d4 and e3, the classic French route to pressure the base of the chain. White answers a3 and b4, grabbing queenside space and daring Black to release the centre; after cxd4 the structure clarifies and White will recapture toward a mobile centre. The point is that b4 has cramped Black's queenside while the e5 spearhead still strangles the kingside.", sayShort: "b4 grabs space — Nh6 reroutes" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N526: SublineNarration = {
  intro: { say: "Black swings the light-squared bishop to b5 to trade off the piece that the e5 chain otherwise buries behind the e6 pawn. White meets it with c4, challenging d5 and the bishop at once; after the bishop takes on c4 White has surrendered a pawn but ripped open the centre and gained the bishop pair plus a lead in development. The plan is to round up the loose c4-bishop and use the open lines while Black's queen sits awkwardly on b6.", sayShort: "c4 break — bishop pair, open lines" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N527: SublineNarration = {
  intro: { say: "Black completes the queenside with Bd7, readying a rook lift or a later Rc8, but White has already seized space with a3 and b4. The capture cxd4 dissolves the central tension so White recaptures with cxd4 and gets a clean, mobile pawn on d4 backing the e5 spearhead. The b4 pawn cramps Black's minor pieces while White prepares to develop the bishop and roll on the kingside.", sayShort: "b4 space — mobile d4 centre" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N528: SublineNarration = {
  intro: { say: "Black plays a5 to stop White's b4 expansion and freeze the queenside before it can be cramped. White calmly develops the bishop to d3, aiming it at the kingside light squares and h7 once the e5 pawn opens lines, then Black completes with Bd7. The struggle settles into a maneuvering battle where White's space and the e5 anchor underpin a slow buildup toward f4-f5.", sayShort: "a5 stops b4 — Bd3 eyes kingside" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N529: SublineNarration = {
  intro: { say: "Black hits the chain early with f6 and after Bd3 takes on e5, trying to dissolve White's central spearhead before White is fully mobilized. White's bishop already sits on d3 raking the b1-h7 diagonal, and the recapture on e5 will open the position toward Black's exposed king and the loose pawn on e6. White's development lead and the open lines down the centre and toward h7 outweigh the temporary structural shift.", sayShort: "fxe5 opens — Bd3 hits h7" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N530: SublineNarration = {
  intro: { say: "With the queenside locked by c4, Black strikes the head of the chain with f6, the thematic French break against the e5 pawn. White keeps the centre solid and meets the lever on its own terms, recapturing or supporting e5 so the tension favours the better-developed side. Opening the f-file here tends to help White, whose pieces are aimed at the kingside while Black's queen and a5-bound knight are far from the action.", sayShort: "f6 lever — White holds e5" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N531: SublineNarration = {
  intro: { say: "Black tucks the bishop to d7 to finish development behind the locked c4-d5 wall and free the back rank for castling and a rook on c8. With the centre fixed, White's plan is set: regroup the d2-knight, expand with the f4-f5 break, and use the e5 pawn as the cornerstone of a kingside initiative. Black's space deficit and the offside queen on b6 leave the defence reacting on the wrong wing.", sayShort: "Locked centre — f4-f5 plan stands" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N532: SublineNarration = {
  intro: { say: "Black plays …c6 early to give the a5-queen a retreat square on c7 and shore up d5. White builds the centre with d4, develops Nf3 and Bc4 to bear down on f7, and stands ready for Bd2 and O-O-O. With …Nf6 and …Bf5 Black catches up, but White's lead in development and the active bishop on c4 keep the initiative.", sayShort: "c6 frees queen — Bc4 hits f7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N533: SublineNarration = {
  intro: { say: "After the passive …Qd8, Black develops …Bg4 to pin the f3-knight and contest d4 actively. White holds the d4-centre, can break the pin with Be2 or h3, and remains well ahead in development thanks to the tempi spent chasing the queen. The compact d4-Nc3-Nf3 setup commands the centre while Black's queen sits idle on its home square.", sayShort: "Qd8 then Bg4 — break pin, lead develops" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N534: SublineNarration = {
  intro: { say: "Black develops …Bf5 before …c6, getting the light-squared bishop active outside the pawn chain. White has the ideal d4-pawn centre, Nf3 and Nc3 developed, and can hit the bishop with Ne5 or expand with Bd2 and O-O-O. The early queen sortie to a5 has cost Black time, leaving White ahead in development with the freer game.", sayShort: "Bf5 active — Ne5 or O-O-O presses" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N535: SublineNarration = {
  intro: { say: "Black pins the f3-knight with …Bg4 to ease the pressure on d4 and develop with tempo. White meets the pin with Be2 or h3, keeps the d4-pawn centre, and can break the pin while completing development. The …Qa5 plus …Bg4 plan develops actively, but White's central space and the free tempi from chasing the queen leave the better game.", sayShort: "Bg4 pins Nf3 — h3 breaks, centre holds" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N536: SublineNarration = {
  intro: { say: "Black develops …Nc6 to add pressure on d4, but this blocks the c-pawn so the a5-queen has no …c6 retreat and can be harassed. White holds the centre with d4, develops naturally with Bd2 and prepares O-O-O, and may gain tempo on the exposed queen with b4 ideas. White's lead in development and the secure d4-pawn give the freer, more aggressive game.", sayShort: "Nc6 blocks c-pawn — queen stays exposed" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N537: SublineNarration = {
  intro: { say: "Black plays …c6 to make a luft for the queen, then pins the f3-knight with …Bg4 to pressure d4. White's Bc4 already eyes f7 while the d4-pawn centre stays firm; h3 questions the bishop and keeps the bind. The early …Qa5 has cost time, and White's two developed bishops plus central space give the more active position.", sayShort: "c6 and Bg4 pin — Bc4 eyes f7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N538: SublineNarration = {
  intro: { say: "In the main line Scandinavian, Nc3 hits the d5-queen with tempo and …Qa5 is the classical retreat, eyeing the c3-knight along the a5-e1 diagonal. White builds the ideal centre with d4, develops Nf3 and Bc4 aiming at f7, and gains free moves chasing the early queen. After …c6 and …Bf5, White stands ready for Bd2 and O-O-O with a lead in development and the more active pieces.", sayShort: "Main line — d4 centre, Bc4 eyes f7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N539: SublineNarration = {
  intro: { say: "With …Qd6 and …c6 Black sets a solid but passive shell, and Ne5 plants the knight on a powerful central outpost eyeing f7 and d7. After …Nbd7 challenges the e5-knight, White can recapture or reinforce while holding the d4-centre and the bind. White's strong e5-knight, central pawns, and lead in development give a lasting initiative against Black's cramped setup.", sayShort: "Ne5 outpost — central bind, f7 pressure" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N540: SublineNarration = {
  intro: { say: "With the queen on d6 Black fianchettos …g6 but then lunges …g5-g4 to harass the f3-knight, loosening his own kingside. White keeps the d4-centre solid, plays a3 and b3 to brace the queenside, and the knight retreats to e5 or d2 with tempo. The advancing g-pawns leave f5 and h5 weak, and White's compact centre dominates against Black's airy king position.", sayShort: "g4 chases knight — kingside left weak" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N541: SublineNarration = {
  intro: { say: "Black plays …Qd6 and …c6 for solidity, then develops …Bg4 to pin the f3-knight. White answers Be3 to bolster d4 and prepare Qd2 with O-O-O, keeping the broad centre and the more harmonious setup. The early queen moves have cost Black tempi, and White's central pawns plus quick queenside castling promise a lasting initiative.", sayShort: "c6 and Bg4 pin — Be3 braces d4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N542: SublineNarration = {
  intro: { say: "With the queen on d6, Black develops …Bg4 to pin the f3-knight and pressure the d4-pawn. White meets the pin with Be2 or h3, retains the broad d4-centre, and stays ahead in development from the early queen chase. The compact d4-Nc3-Nf3 structure commands the centre while White prepares to castle and untangle the pin.", sayShort: "Bg4 pins Nf3 — h3 breaks, centre holds" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N543: SublineNarration = {
  intro: { say: "Black expands with …a6 and …b5 to fianchetto the queen's bishop on b7 against White's g2-fianchetto. White's centre on d4 and the long-diagonal bishop on g2 fight for the light squares, and …b5 loosens the c6 and c5 squares. After Bb7, White completes development with O-O and can pressure the queenside, holding the more active position and central space.", sayShort: "b5 expands — g2 bishop fights long diagonal" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N544: SublineNarration = {
  intro: { say: "Black combines …a6 with a double fianchetto idea, playing …g6 and …Bg7 against White's g2-bishop. White's d4-centre and the g2-bishop battle for the long light diagonal and the d5-square, with both kings heading to safety. After Bg7, White completes with O-O and holds the central space and the more purposeful setup while Black's …Qd6 and slow development lag.", sayShort: "Double fianchetto — g2 bishop, d4 centre" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N545: SublineNarration = {
  intro: { say: "Black retreats all the way to …Qd8 and fianchettos with …g6, then over-presses with …g5-g4 to chase the f3-knight. White holds the centre with d4, plays a3 and b3 for queenside solidity, and the knight simply steps to e5 or d2 while Black's kingside collapses with holes on f5 and h5. White's intact centre and Black's wrecked kingside pawns hand White a clear edge.", sayShort: "g5-g4 overreaches — knight hops, holes appear" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N546: SublineNarration = {
  intro: { say: "The …Qd8 retreat is the most passive, regrouping the queen home, and …c6 builds a small but solid shell. White seizes the centre with d4, develops Nf3 and Bc4 to target f7, and enjoys a clear lead in development from the early queen chase. After …Bf5, White prepares O-O and central play, dominating space against Black's cramped setup.", sayShort: "Qd8 passive — Bc4 and centre dominate" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N547: SublineNarration = {
  intro: { say: "After the passive …Qd8 and …c6, Black tries to free the game with …c5 to strike at d4, supported by …a6 and …b5 ideas. White develops Bc4 to eye f7, props the queenside with a3 and b3, and meets …c5 by keeping the centre fluid. White's lead in development and the active light-squared bishop outweigh Black's loosening queenside pushes.", sayShort: "c5 break — Bc4 and centre stay strong" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N548: SublineNarration = {
  intro: { say: "Black retreats …Qd8 and fianchettos …g6 then …Bg7, but lashes out with …g5-g4 to chase the f3-knight, fatally weakening his king. White holds the d4-centre, plays a3 and b3 for queenside calm, and the knight simply retreats to e5 or d2 while f5 and h5 turn into permanent holes. White's solid centre against Black's shredded kingside is a clear structural advantage.", sayShort: "g5-g4 wrecks kingside — centre punishes" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N549: SublineNarration = {
  intro: { say: "Black develops the bishop to f5 outside the pawn chain after the passive …Qd8 retreat. White holds the ideal d4-centre with Nc3 and Nf3 developed and can hit the bishop with Ne5 or expand with Bd2 and O-O-O. The tempi gained chasing the queen leave White ahead in development with the more active and spacious position.", sayShort: "Bf5 develops — Ne5 or O-O-O presses" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N550: SublineNarration = {
  intro: { say: "After …Qd8 and …e6, Black tries to break with …e5 then push …e4 to chase the f3-knight. White's d4-pawn centre is solid, and a3 and b3 keep the queenside firm while the advanced e4-pawn becomes overextended and falls to Nd2 or Ng1-then-recapture. White's lead in development and the loose Black e-pawn leave White with the better structure and initiative.", sayShort: "e5-e4 overreach — knight steps, pawn falls" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N551: SublineNarration = {
  intro: { say: "Black plays the passive …Qd8 then drifts with …a6-a5-a4 on the edge instead of developing pieces. White builds the d4-centre, develops smoothly with Bc4 and Bd2, and the b3-pawn meets …a4 to keep the queenside closed. Black's time-wasting flank pawn moves leave him badly behind, and White's superior development and central control dominate.", sayShort: "a-pawn drift — White develops and dominates" },
  sources: ['concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N552: SublineNarration = {
  intro: { say: "Black strikes the centre immediately with c5, the principled Austrian Attack counter that challenges d4 before White can roll forward. White can answer with the energetic d5, gaining space and locking the centre, or Bb5+ to disrupt Black's development; either way the e4-f4 pawns and the knight on f3 keep the kingside ambitions alive. The fight turns on whether White's central pawns become a steamroller or Black's c5 break loosens them.", sayShort: "c5 hits centre — d5 or Bb5+" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N553: SublineNarration = {
  intro: { say: "This is the Austrian Attack, the sharpest weapon against the Pirc: White builds a broad e4-d4-f4 pawn front with the knights on c3 and f3 supporting an eventual e5 advance. Black castles into the storm, and now White can develop the bishop to d3 or e2, castle, and prepare the e5 break or a kingside push that exploits the space behind the f4 pawn. The big centre is the engine of White's play, so the plan is to mobilize it before Black hits back with c5 or e5.", sayShort: "Austrian Attack — big centre rolls" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N554: SublineNarration = {
  intro: { say: "This is the 150 Attack setup: pawns on e4 and d4, the bishop on e3 and queen on d2 lined up for Bh6 to swap off Black's fianchettoed g7-bishop and bare the dark squares around the king. Black grabs queenside space with a6, b5 and Bb7, but White has played a3 to blunt b4 and keeps the kingside plan primed. The path is castling long, then h4-h5 to crack open the g6 pawn while the trade on h6 strips the king's best defender.", sayShort: "150 Attack — Bh6 then h4-h5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N555: SublineNarration = {
  intro: { say: "Black goes for the central counter with c6 and d5, and the e-pawn knifes down to e2, but it is overextended and well controlled. White's quiet a3, b3 and h3 have shored up both flanks and made luft, so the e2-pawn sits blockaded with nowhere to go and will be collected at leisure. White enjoys more space and a sounder structure, turning Black's deep pawn into a target rather than a trump.", sayShort: "e2 overextended — blockade and win it" },
  sources: ['concept:pawn-passed', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N556: SublineNarration = {
  intro: { say: "With a6 and b5 already gaining queenside space, Black develops the knight to d7 to bolster the centre and prepare c5. White's a3 keeps b4 in check while the Be3-Qd2 battery stays trained on h6, the heart of the 150 plan. White castles long and pushes h4-h5; trading the dark-squared bishop on h6 and prising open g6 hands White the attack before Black's queenside push fully gets going.", sayShort: "Nd7 holds — White preps h4-h5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N557: SublineNarration = {
  intro: { say: "Black mixes the queenside pawn storm with a central thrust, but after a3 and b3 the b4 pawn is fixed and now c5 strikes at d4. White can hold the centre with the d4 pawn supported, or meet c5 by keeping tension while the Be3-Qd2 battery still points at h6. The queenside locks up and White's plan to castle long and storm with h4-h5 remains the most dangerous idea on the board.", sayShort: "c5 hits d4 — kingside plan intact" },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N558: SublineNarration = {
  intro: { say: "By committing the knight to f6, Black challenges e4 and transposes toward Pirc-flavoured play, attacking the central pawn directly. White's Be3 and the looming Qd2 form the 150 battery; the immediate concern is to meet a later Ng4 by guarding e3, after which White castles long and aims Bh6 at the fianchetto. The pawns on e4 and d4 give White the central space that makes the kingside pawn storm so potent.", sayShort: "Nf6 hits e4 — 150 plan ready" },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N559: SublineNarration = {
  intro: { say: "Against Black's flank advance a6, b5 and b4, White switches to a broad pawn front with f4, building a big e4-d4-f4 centre and gaining space everywhere. Black's pawn lands on b3, but a3 and the g3 fianchetto plan keep White's king safe and leave the b3-pawn weak and cut off. With the centre rolling and Black's pawns spent on the rim, White holds a clear spatial bind and the better long-term chances.", sayShort: "Big f4 centre — flank pawns spent" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N560: SublineNarration = {
  intro: { say: "Black strikes at the centre with c5; after dxc5 the queen chases the pawn back via a5, and White uses the tempo to leap the knight into d5. The strong outpost on d5, supported and unchallengeable by a pawn, gives White a dominating central piece while Black's queen on c5 and knight on a6 are awkwardly placed. White keeps the initiative, developing with gain of time around the entrenched d5-knight.", sayShort: "Nd5 outpost — Black pieces awkward" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N561: SublineNarration = {
  intro: { say: "Black holds back the knight to d7, keeping the option of c5 or e5 and supporting a later queenside expansion with a6 already played. White has the full 150 structure in place: e4 and d4 in the centre, the bishop on e3 and queen on d2 ready for Bh6 to trade Black's key g7-bishop. White completes with long castling and then advances the h-pawn, since the dark squares around Black's king are the target.", sayShort: "150 setup — Bh6 swap looms" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N562: SublineNarration = {
  intro: { say: "Black's early d5 invites a Scandinavian-like structure; White takes on d5 and, when the knight recaptures route via f6, holds the extra central pawn with Bc4 defending it and eyeing f7. The bishop on c4 and the protected d5-pawn give White a comfortable space edge and easy development, while Black must spend time regaining the pawn. White's lead in development and central grip set the agenda.", sayShort: "Bc4 holds d5 — space and lead" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N563: SublineNarration = {
  intro: { say: "Black's early Nd7 keeps the structure flexible, eyeing e5 or c5 and leaving the c-pawn free, but it does little to contest White's centre. White has the e4-d4 pawns and the bishop on e3 with Qd2 to follow, the foundation of the 150 Attack. The plan is direct: complete with Qd2 and long castling, then trade off the g7-bishop with Bh6 and storm the kingside with the h-pawn.", sayShort: "Nd7 passive — White builds 150 attack" },
  sources: ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N564: SublineNarration = {
  intro: { say: "Black pushes b4 and a5 to pry at White's queenside, but a3 met b4 and b3 has bricked up the structure so the pawns jam against a fixed wall. White's e4-d4 centre and the Be3-Qd2 battery remain untouched, free to swing into the kingside plan of Bh6 and a pawn storm. With the queenside locked and Black's king still in the centre, White will castle long and roll the h-pawn.", sayShort: "Queenside jammed — kingside storm next" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N565: SublineNarration = {
  intro: { say: "Black props the queenside with c6 and b5, then rolls a5 and a4 to lever open lines toward White's intended long-castled king. White's a3 and b3 answer the storm, fixing the pawns so the a4 push grinds against a solid wall rather than breaking through. The e4-d4 centre and the Be3-Qd2 battery aimed at h6 stay untouched, so White stays on plan: castle long and storm the kingside with the h-pawn.", sayShort: "a4 levers — b3 holds the wall" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N566: SublineNarration = {
  intro: { say: "Black props the centre with c6 and b5, then brings the knight to d7 to back a c5 or e5 break. White's a3 restrains b4 and the e3-bishop with the d2-queen behind it is poised for Bh6 to remove the g7-bishop guarding Black's dark squares. The standard plan follows: long castling and an h-pawn march, since with Black committed on the queenside the kingside is where White strikes.", sayShort: "150 battery — long castle, h-pawn rolls" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N567: SublineNarration = {
  intro: { say: "Black supports b5 with a6 and then breaks with b4, trying to lever open the queenside against White's king. White's a3 and b3 meet the lunge head-on, and after b4 the axb4 recapture or the fixed structure keeps Black's pawns from breaking through. Meanwhile the e4-d4 centre stands firm and the Be3-Qd2 battery remains aimed at h6 for the kingside attack White is building.", sayShort: "b4 lever met — centre and battery hold" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N568: SublineNarration = {
  intro: { say: "Black grabs queenside space with c6 and b5, then develops the knight to f6 to pressure e4 and join the defence. White's a3 holds back b4, and with the bishop on e3 and queen on d2 the standard Bh6 trade is in the air to weaken the dark squares around Black's king. White castles long and advances the h-pawn, since the g6-f6-Bg7 shell is exactly what the h4-h5 storm aims to crack.", sayShort: "Nf6 develops — h-pawn storm awaits" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N569: SublineNarration = {
  intro: { say: "Bc4 hits the d5-knight and aims at the f7-square, but the bishop bites on granite since ...e6 will shore up d5 with tempo. Black continues with ...dxe5, leaving White an isolated d4-pawn to blockade on d5 with the knight. The c-file and the d5 outpost are the long-term assets that outweigh White's short-lived initiative against f7.", sayShort: "…e6 shores d5, blockade the isolani" },
  sources: ['concept:pos-outpost', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N570: SublineNarration = {
  intro: { say: "Be2 is a quiet developing move that leaves the d4-pawn without dynamic support. Black strikes with ...dxe5, opening the position to expose White's isolated d4-pawn as a fixed target. The d5-knight blockades, the c6-knight presses, and the half-open c-file gives the second player the initiative against the lonely central pawn.", sayShort: "…dxe5, fix and besiege d4" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N571: SublineNarration = {
  intro: { say: "The Alapin builds the e5 and d4 duo, but the d5-knight already eyes that center and dxd4 then ...d6 strikes the e5-spearhead at its base. With the c-file half-open and White's d4-pawn now isolated once ...dxe5 trades, the second player plays for blockade and pressure down the c-file. The knight pair on c6 and d5 swarms the d4 and e5 squares while the light-squared bishop heads out before ...e6 locks it in.", sayShort: "Hit e5 at its base with …d6" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N572: SublineNarration = {
  intro: { say: "Instead of capturing on d4 Black clamps with ...c4, locking the queenside and fixing White's pawn chain on c3 and d4. The knight on d5 is a permanent thorn and the c4-pawn cramps White's queenside, daring b3 to open lines for the second player. Black follows the wedge with queenside expansion, undermining the base of the chain rather than trading into White's central space.", sayShort: "Clamp with …c4, fix the chain" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N573: SublineNarration = {
  intro: { say: "Bc4 develops against the d5-knight and f7 but without the d4-push the bishop has little bite, since ...e6 will reinforce d5 at will. Black expands on the queenside with ...a5 and ...b6, fianchettoing the long-diagonal bishop to bear down on White's center. The c5-pawn and the d5-outpost give the second player a free hand while White's setup stays passive.", sayShort: "…e6 holds d5, expand queenside" },
  sources: ['concept:pos-outpost', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N574: SublineNarration = {
  intro: { say: "g3 — White fianchettoes to challenge your d5-knight along the long diagonal, but the plan is slow. Strike the spearhead at once: …d6 undermines the e5-pawn, and after exd6 the centre opens in your favour, with the centralised knight and a clear lead in development.", sayShort: "g3 — …d6 undermines e5." },
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N575: SublineNarration = {
  intro: { say: "Black answers the f4-Grand Prix Bb5 with the energetic ...Nd4, occupying the central outpost and hitting the bishop. After Nf3 the second player gains space with ...c4 and even strikes back on the kingside with ...g5, challenging White's f4-pawn before the attack gets rolling. The d4-knight is a thorn in White's camp while Black takes over the initiative on both flanks.", sayShort: "…Nd4, then …g5 counterstrikes f4" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N576: SublineNarration = {
  intro: { say: "The Grand Prix Bc4 takes aim at f7 early, but Black's g7-bishop already counters along the long diagonal and ...e6 will shut the bishop's view of f7. The second player completes the kingside fianchetto with ...Bg7 and prepares ...e6 and ...Nge7 to control the key f5-square. By blunting the attacking bishop and striking in the center, Black defuses the kingside storm and turns to queenside expansion.", sayShort: "…Bg7 and …e6 defuse the attack" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N577: SublineNarration = {
  intro: { say: "By fianchettoing with g3 and Bg2 White steers into a closed Sicilian rather than the sharp f4-attack, contesting the long light diagonal. Black mirrors the setup with ...g6 and ...Bg7, fighting for the same diagonal and the dark squares around d4. With both kings heading to safety behind the fianchettoes, the second player prepares ...d6 and ...e5 or ...Rb8 with ...b5 to expand on the queenside where White's pieces are less active.", sayShort: "Mirror the fianchetto, expand queenside" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N578: SublineNarration = {
  intro: { say: "When White plays an early Bb5 Black leaps in with ...Nd4, planting the knight on a dominant central outpost and gaining a tempo on the bishop. After Bc4 the second player solidifies with ...e6 and ...e5, building a broad pawn front and locking the knight on d4 in place. The d4-knight cramps White's whole position while Black expands with ...a6 and ...a5 on the queenside.", sayShort: "…Nd4 outpost, …e5 builds the front" },
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N579: SublineNarration = {
  intro: { say: "Without the f4-thrust White's Nf3 lets Black grab the center directly with ...e5, taking a big chunk of central space in Sveshnikov fashion. The e5-pawn controls d4 and f4, denying White the squares the Grand Prix attack craves. Black follows with ...Be7 and quick development, intending ...d6 and ...Nf6 with a sound, space-gaining structure and no kingside attack to fear.", sayShort: "…e5 seizes the center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N580: SublineNarration = {
  intro: { say: "Nge2 keeps White's options flexible but blocks the f1-bishop and delays the kingside attack. Black develops actively with ...Nf6, pressuring e4 and preparing ...d5 or ...g6 with a kingside fianchetto. With White's pieces tangled on the back rank, the second player gets in quick development and contests the center before any f4-storm can be organized.", sayShort: "…Nf6 hits e4, develop quickly" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N581: SublineNarration = {
  intro: { say: "Bc4 is the aggressive Grand Prix bishop, eyeing the f7-square and supporting a future f5-pawn break against Black's king. Black neutralizes it by preparing ...e6 and ...Nge7, blunting the diagonal and controlling the f5-square the attack relies on. With the g7-bishop already raking the long diagonal, the second player meets the kingside storm by striking back in the center and on the queenside with ...d6, ...a6 and ...b5.", sayShort: "Blunt the c4-bishop with …e6" },
  sources: ['concept:att-kingside-storm', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N582: SublineNarration = {
  intro: { say: "Combining f4 with g3 is a slow setup that weakens the dark squares around White's king and forfeits the bite of the c4 or b5 bishop. Black continues calmly with ...d6 and ...e6, keeping the g7-bishop's diagonal open and preparing central play. With White's kingside light squares loosened by g3, the second player aims at the e4-pawn and the long diagonal where the fianchettoed bishop dominates.", sayShort: "Exploit the loosened dark squares" },
  sources: ['concept:pos-weak-squares', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N583: SublineNarration = {
  intro: { say: "With a4 White stops Black's ...b5 expansion but spends a tempo on the flank instead of developing or attacking. Black ignores the wing gesture and develops with ...d6 and ...e6, keeping the g7-bishop strong on the long diagonal. The second player can answer the slow play by hitting the center with ...e5 or ...d5, since White's delayed development leaves the e4-point under-defended.", sayShort: "Ignore a4, strike the center" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N584: SublineNarration = {
  intro: { say: "The restrained d3 supports e4 and prepares a slow buildup, but it cedes the chance for a quick f5-break and leaves White short of central space. Black develops harmoniously with ...d6 and ...e6, keeping the g7-bishop active and eyeing the long diagonal. With the position semi-closed, the second player expands on the queenside with ...a6 and ...b5 while White's modest setup offers no kingside threats.", sayShort: "…d6, …e6, expand on the queenside" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N585: SublineNarration = {
  intro: { say: "Bb5 is the critical Grand Prix try, pinning the c6-knight and threatening to swap it off to soften Black's control of e5 and d4. Black is happy to allow Bxc6, since after ...bxc6 the doubled c-pawns reinforce the center and the dark-squared bishop on g7 grows into a monster on the long diagonal. The half-open b-file and the bishop pair fully compensate for the structure, and ...d6 with ...e5 stakes a firm claim in the center.", sayShort: "Allow Bxc6 — bishop pair, long diagonal" },
  sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N586: SublineNarration = {
  intro: { say: "White recaptures c3 with the bishop, but Black has kept the gambit pawn and grabbed queenside space with …a6 and …b5, pushing the c4-bishop back to b3, then planted the bishop on b7. From b7 it rakes the long diagonal at e4 and g2, the ideal anti-Morra post. With the extra pawn, a solid e6-shell, and the strong fianchetto, Black aims to trade into a position where the material edge tells.", sayShort: "…Bb7 rakes the long diagonal, pawn up" },
  sources: ['concept:pawn-fianchetto', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N587: SublineNarration = {
  intro: { say: "White delays the knight recapture with Nf3 before Nxc3, but Black keeps the gambit pawn and develops normally with …Nc6, …e6 and …a6. The knight heads to e7 and g6 rather than f6, sidestepping any Bg5 pin, and …b5 will chase the c4-bishop off the f7-diagonal. Hold the material, build a shell with no weaknesses, and let White try to prove the initiative is worth a pawn — usually it falls short.", sayShort: "…e6, …a6 — hold the pawn, no weaknesses" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N588: SublineNarration = {
  intro: { say: "White declines the gambit, recapturing on d4 with the knight via Nf3, so this is simply an Open Sicilian and Black hands no pawn back. With …d6, …Nf6 and …a6 Black sets up a Najdorf, and …e5 hits the d4-knight, which retreats to b3, gaining the d5-square as an outpost. The bishop comes to e6 to fight for d5, and Black gets the familiar Sicilian counterplay on both wings with a fully sound game.", sayShort: "Morra declined — Najdorf-style …e5, …Be6" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N589: SublineNarration = {
  intro: { say: "White declines by recapturing with the queen, Qxd4, so Black loses no material and gains a tempo hitting the queen with …Nc6. After Qd3 Black expands on the queenside with …a6, …a5 and …a4, prying at White's b3-pawn, then fianchettoes with …b6 to put the bishop on b7. The plan is sound Sicilian play with a free tempo already banked: aim the b7-bishop at e4 and use the queenside space against White's loosened pawns.", sayShort: "Qxd4 declined — …a4 and …b6 pry queenside" },
  sources: ['concept:pos-tempo', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N590: SublineNarration = {
  intro: { say: "Black holds the gambit pawn and meets the c4-bishop with the standard …e6 and …a6, preparing …b5 to chase the bishop and seize queenside space. The plan is to develop the knight to e7 and on to g6 rather than f6, sidestepping any Bg5 pin, then blunt the c4-bishop's aim at f7. A solid shell behind the e6-pawn plus the extra pawn means White must prove the initiative is worth the material — usually it is not.", sayShort: "…e6, …a6, …b5 — blunt the bishop" },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N591: SublineNarration = {
  intro: { say: "White develops quietly with Be2 instead of the aggressive c4-bishop, so Black seizes the centre with …e5, claiming the d4-square and a broad pawn front while a pawn up. With no bishop eyeing f7 there is no pressure to parry, so …a6 prepares …b5 and easy development with …Nf6, …Be7 and castling. Solid, simple, and a pawn ahead — the central pawns and the material edge do the work.", sayShort: "…e5 grabs the center, pawn up" },
  sources: ['concept:pos-center', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N592: SublineNarration = {
  intro: { say: "Black is a clean pawn up in the model shell — …e6, …a6 and the knight on e7 — and White lifts the queen to e2 to back the e4-pawn and connect the rooks. Black answers with …Ng6, freeing the f8-bishop and challenging White's setup, then …b5 to drive the c4-bishop off the f7-diagonal. Hold the extra pawn, complete development without weaknesses, and let White's missing breakthrough turn the material into the advantage.", sayShort: "…Ng6 then …b5 — keep the pawn" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N593: SublineNarration = {
  intro: { say: "White plays a4 to stop Black's …b5 freeing break before it comes, but the move costs time and leaves the b4-square weak. Black continues the antidote with …Nge7, heading for g6, keeping the extra pawn and a flexible structure. The b4-hole and White's spent tempo favour the defender: develop calmly, eye a knight to b4 or a …d5 break, and let the material edge plus the lack of a White breakthrough decide.", sayShort: "a4 weakens b4 — …Nge7 stays solid" },
  sources: ['concept:pos-weak-squares', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N594: SublineNarration = {
  intro: { say: "White lifts the queen to e2 to support e4 and prepare rooks to the central files, and Black strikes at once with …b5, kicking the c4-bishop and grabbing queenside space while a pawn up. The bishop must retreat, and …Bb7 follows to rake the long diagonal at e4 and g2. Black's method holds firm: blunt the c4-bishop, finish development behind the e6-pawn, and ride the extra pawn into the better game.", sayShort: "…b5 hits the bishop, pawn up" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N595: SublineNarration = {
  intro: { say: "Black holds the gambit pawn with the …e6, …a6, …Nge7 system, and White's bishop comes to e3 to develop and watch the queenside dark squares. Black answers with …Ng6, freeing the f8-bishop and pressing White's grip, then castles behind the solid pawn shell. The recipe is constant across the accepted Morra: develop without weaknesses, neutralise the c4-bishop with …b5, and convert the extra pawn once the initiative runs dry.", sayShort: "…Ng6 — develop, keep the pawn" },
  sources: ['concept:pos-development', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N596: SublineNarration = {
  intro: { say: "Black has taken the gambit pawn with …dxc3 and built the model antidote: …e6, …a6 and the knight to e7, keeping the extra pawn and a sound structure. White swings the bishop to g5 to provoke a weakness, but with the knight on e7 rather than f6 there is nothing to pin, so the bishop bites on granite. Black's plan is …Ng6 to hit the g5-bishop and free the f8-bishop, then …b5 to chase the c4-bishop off the f7-diagonal, holding the pawn while White's initiative thins.", sayShort: "Keep the pawn — …Ng6 answers Bg5" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N597: SublineNarration = {
  intro: { say: "In this Kieseritzky line White grabs the d5-pawn with Bxd5, but Black is unbothered and pushes ...f3, sending the passed pawn deep into White's kingside. The f3-pawn cramps White and the open lines from the ...d5 break give Black active piece play and attacking chances against the uncastled king. The second player has surrendered a pawn back but gained a dangerous initiative on the kingside.", sayShort: "…f3 storms the exposed kingside" },
  sources: ['concept:pawn-passed', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N598: SublineNarration = {
  intro: { say: "With Nc3 White develops and tries to undermine the g5-pawn rather than the sharp h4-thrust. Black supports the chain and meets g3 with ...g4, locking the kingside and kicking the f3-knight away from the defense of the f4-pawn. The second player keeps the extra pawn on f4 and a cramping kingside structure while White lacks the central presence to justify the gambit.", sayShort: "Hold f4, lock with …g4" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N599: SublineNarration = {
  intro: { say: "This is the Hanstein Gambit, where Black supports the f4-pawn with ...g5 and fianchettoes the dark-squared bishop to g7 to bear down on White's center and king. After White castles into the half-open f-file, the second player calmly develops with ...d6 and ...Nc6, keeping the extra pawn and the powerful g7-bishop. With sound development and material in hand, Black aims to neutralize the attack and convert the gambit pawn.", sayShort: "Hanstein — …Bg7 holds the booty" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N600: SublineNarration = {
  intro: { say: "When White plays d4 and offers the knight, Black takes it with ...gxf3, accepting a second pawn since the resulting attack can be parried. After Bxf4 and Qxf3 Black strikes the center with ...d6 and ...d5, returning a pawn to blunt the queen and open lines for development. The second player emerges with a sound structure and the initiative once the central counterthrust neutralizes White's piece play.", sayShort: "Take on f3, then …d5 counters" },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N601: SublineNarration = {
  intro: { say: "This is the Kieseritzky Gambit, where Black holds the f4-pawn with the ...g5 and ...g4 chain and kicks the f3-knight to e5. After d4 and the retreat Nd3, Black snaps the central e4-pawn with ...Nxe4, winning a second pawn and keeping the kingside chain intact. With pawns on f4 and g4 cramping White and an extra pawn in hand, the second player defends the booty and trades into a winning endgame.", sayShort: "Kieseritzky — grab e4 with …Nxe4" },
  sources: ['concept:pawn-passed', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N602: SublineNarration = {
  intro: { say: "When White tries to win the g4-pawn back with Nxg4 in the Kieseritzky, Black hits the center with ...Nxe4, restoring the material balance with a strongly centralized knight. After d3 dislodges the knight, the f-pawn surges with ...f3, cramping the white kingside and fixing weaknesses around the king. Black's active pieces and the advanced f3-pawn leave White struggling to untangle and complete development.", sayShort: "…Nxe4 centralizes, …f3 cramps White" },
  sources: ['concept:pos-centralization', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N603: SublineNarration = {
  intro: { say: "The Allgaier-style Ng5 sacrifices the knight on the g5-square to chase Black's king, but the second player keeps cool with ...d5 to open the center for defense. After d4, Black plays ...h6 to question the knight and then pushes ...f3 to jam White's kingside and blunt the attack. With an extra piece in hand once the knight is dealt with, Black weathers the storm and stands materially ahead.", sayShort: "…d5 and …h6 refute the Ng5 sac" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N604: SublineNarration = {
  intro: { say: "Against the Bishop's Gambit Black grabs on f4 and then counterstrikes the center with ...d5, the classical refutation that opens lines before White is ready. After e5 hits the f6-knight, the passed f-pawn marches with ...f3, splitting White's kingside and reaching f2 with check, a thorn next to the white king. The extra pawn and the active pieces give Black a healthy structural plus while White's king sits exposed on e1.", sayShort: "…d5 break, the f-pawn runs to f2" },
  sources: ['concept:pos-center', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N605: SublineNarration = {
  intro: { say: "In the Bishop's Gambit Black prepares the freeing ...d5 with ...c6 and develops the knight to f6 to hit e4. When White grabs the center with d4, Black pins the c3-knight with ...Bb4, undermining the defender of the e4-pawn and adding pressure to the center. With the f4-pawn still in pocket and active development, the second player keeps the material edge and a comfortable, well-coordinated position.", sayShort: "…Bb4 pins, prepares the …d5 break" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N606: SublineNarration = {
  intro: { say: "After Bb3 retreats the bishop and Black plays the freeing ...d5, the further Nf3 lets the second player push ...d4, gaining space and kicking the c3-knight from the center. The advanced ...d3 pawn then wedges deep into White's position, cramping the queenside and disrupting development. Black holds the extra f4-pawn while the queenside spearhead gives a lasting space and structural advantage.", sayShort: "…d4 and …d3 wedge cramps White" },
  sources: ['concept:pos-space', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N607: SublineNarration = {
  intro: { say: "When White plays the quiet d3 to bolster e4 after Black's ...d5 break, the second player marches the f-pawn with ...f3, splitting the white kingside pawns. The f3-pawn reaches f2 with check, lodging right beside White's king on e1 and tying down the defense. With the center opened by ...d5 and an extra, dangerous passed pawn, Black holds a clear structural and material advantage.", sayShort: "…f3-f2+ jams the white king" },
  sources: ['concept:pawn-passed', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N608: SublineNarration = {
  intro: { say: "After the standard ...d5 break against the Bishop's Gambit, White grabs the center with d4, but Black ignores it and pushes ...f3 to split White's kingside pawns. The runner reaches f2 with check, sitting beside the white king on e1 and disrupting White's coordination. With the center already challenged and a dangerous passed pawn deep in White's position, the second player holds the structural and material edge.", sayShort: "…f3-f2+ splits White's kingside" },
  sources: ['concept:pawn-passed', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N609: SublineNarration = {
  intro: { say: "Qf3 in the Bishop's Gambit defends e4 but places the queen on an exposed square in front of the king. Black hits back immediately with ...d5, and after exd5 the gambit ...c5 frees the position and prepares to recapture the d5-pawn with full development. The second player keeps the f4-pawn and gains time on White's loose queen while opening the center to exploit the exposed king.", sayShort: "…d5 hits the loose queen" },
  sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N610: SublineNarration = {
  intro: { say: "d3 — White develops modestly in the Bishop's Gambit, but slow play hands Black the centre. …d5 is the thematic counterstrike, hitting the c4-bishop and the e4-pawn together; after exd5 the position cracks open with a Black development lead and the extra f4-pawn still firmly in hand.", sayShort: "d3 — …d5 strikes the centre." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N611: SublineNarration = {
  intro: { say: "By developing with Nf3 in the Bishop's Gambit White covers the kingside, but Black breaks at once with ...d5 to free the position and challenge the center. After exd5 the thrust ...c5 prepares to recapture on d5 with a fully mobilized army and an extra pawn on f4. The second player opens lines for the pieces and keeps the structural and material edge while White lags in completing development.", sayShort: "…d5 and …c5 free the position" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N612: SublineNarration = {
  intro: { say: "Qe2 in the Bishop's Gambit defends e4 but again exposes the queen on the e-file. Black plays ...d5, and after exd5+ the zwischenzug ...Ne4 blocks the check and plants a powerful knight in the center with tempo. The second player then pushes ...f3, hitting the queen and jamming the kingside, keeping the initiative and a strong central knight while White scrambles to coordinate.", sayShort: "…Ne4 blocks, …f3 hits the queen" },
  sources: ['concept:tac-zwischen', 'concept:pos-centralization', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N613: SublineNarration = {
  intro: { say: "Black plays the solid ...e6 setup, so White grabs maximum space with c4, kicking the d5-knight back to b6 and erecting a broad pawn front on c4, d4 and e5. This is the Four Pawns spirit of the Modern, where White's space advantage is enormous and Black is severely cramped. The plan is to develop with Nc3 and Nf3, maintain the pawn chain, and use the territorial bind to suffocate the black pieces.", sayShort: "c4 grabs space, cramp Black" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N614: SublineNarration = {
  intro: { say: "When Black retreats ...Nb6 early and locks the center with ...d5, the position takes on a French-like closed character with White's e5-pawn cramping Black. White develops the bishop actively to d3, aiming at the kingside and the h7-square. White's plan is to castle, prepare f4 and a kingside pawn storm, using the e5-wedge as the spearhead against Black's restricted king.", sayShort: "Closed center, prepare f4 storm" },
  sources: ['concept:pawn-chain', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N615: SublineNarration = {
  intro: { say: "Black's early ...Nc6 pressures the d4-pawn, but White simply braces the center with c3 and prepares to expand. The e5 and d4 pawns give White a commanding space advantage while Black's pieces remain passive and short of squares. White's plan is to complete development behind the pawn chain, support d4 fully, and use the territorial bind to restrict Black before advancing in the center.", sayShort: "Brace the center, keep the bind" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N616: SublineNarration = {
  intro: { say: "…b5 — Black grabs queenside space to shield the d5-knight from c4, an offbeat try. Undermine it: a3 prepares c4 to challenge the knight, and once the flank pawns are questioned White's broad e5-d4 centre and faster development leave Black's queenside looking overextended.", sayShort: "…b5 — a3 prepares c4." },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N617: SublineNarration = {
  intro: { say: "When Black exchanges on e5, the knight recaptures to a powerful central post and White completes development modestly with Be2. Black's ...c6 shores up the d5-knight and ...Bf5 develops the bishop outside the pawn chain. White's plan is to castle, play c4 to challenge the d5-knight, and convert the lasting space advantage the e5 and d4 pawns granted in the opening.", sayShort: "Strong Ne5, prepare c4 break" },
  sources: ['concept:pos-centralization', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N618: SublineNarration = {
  intro: { say: "When Black challenges the c4-bishop with ...Nb6, White retreats to b3 where the bishop keeps a fine diagonal aiming at f7. Black completes the fianchetto with ...Bg7, but White holds the imposing e5 and d4 pawn center and the freer position. The plan is to castle, support the center with c3 or Re1, and use the space edge to restrict Black's pieces and prepare a central or kingside advance.", sayShort: "Bb3 keeps the diagonal and the center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N619: SublineNarration = {
  intro: { say: "After ...Nb6 White gains queenside space with a4 and a5 to fix the knight, then checks with Bb5+ to disrupt Black's development. When ...c6 forces matters and ...Kd7 is provoked, the black king is stranded in the center, unable to castle. White's plan is to open lines against the exposed king, keep the central space edge, and exploit Black's lack of coordination and king safety.", sayShort: "Bb5+ strands the black king" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N620: SublineNarration = {
  intro: { say: "Black supports the d5-knight with ...c6 before trading on e5, and the f3-knight recaptures to its strong central outpost. White develops simply with Be2 and Black brings the bishop out with ...Bf5 before the pawn chain closes. White's plan is to castle, prepare c4 to challenge the d5-knight, and lean on the space advantage and the centralized knight to keep the initiative.", sayShort: "Recapture with Ne5, prepare c4" },
  sources: ['concept:pos-centralization', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N621: SublineNarration = {
  intro: { say: "When Black develops ...Nc6, White expands with c4 to kick the d5-knight and then unleashes the e6 break, shattering Black's kingside pawns after ...fxe6. The resulting doubled, isolated e-pawns and the open f-file leave Black's structure permanently damaged. White's plan is to develop with pressure on the weakened black kingside and exploit the structural ruin the e6 thrust created.", sayShort: "e6 break wrecks Black's kingside" },
  sources: ['concept:pawn-doubled', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N622: SublineNarration = {
  intro: { say: "After Black trades on e5 and the f3-knight recaptures, White's centralized Ne5 dominates and the Bc4 develops with an eye on the f7-square and the d5-knight. Black fianchettoes with ...g6, but White keeps a comfortable space edge in the center. The plan is to support the strong knight, castle, and use the central majority and active bishop to press against Black's slightly loosened kingside.", sayShort: "Centralized Ne5 and active Bc4" },
  sources: ['concept:pos-centralization', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N623: SublineNarration = {
  intro: { say: "Black fianchettoes the kingside bishop and props the d5-knight with ...c6, while White develops the Bc4 against d5 and castles into safety. White retains the broad e5 and d4 center and a clear space advantage over the cramped black pieces. The plan is to expand with c4 to kick the knight, then advance in the center or on the kingside where Black has less room to maneuver.", sayShort: "Castle, then c4 to gain space" },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N624: SublineNarration = {
  intro: { say: "Black harasses with ...Nb6 and tries to keep a pawn on the e-file, but White gains queenside space with a4 and lets the black e-pawn overextend to e3. The advanced e3-pawn is weak and easily blockaded, while White's harmonious development and central control dominate. White's plan is to round up the loose e3-pawn, complete development, and exploit the structural superiority the overextension created.", sayShort: "Let the e-pawn overextend, then win it" },
  sources: ['concept:pawn-backward', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

export const SUBLINE_NARRATION_E4OTHER: Record<string, SublineNarration> = {
  'alekhine-defence::0::Bc4@6': N414,
  'alekhine-defence::0::Bd3@18': N409,
  'alekhine-defence::0::Be2@18': N406,
  'alekhine-defence::0::Nc3@4': N412,
  'alekhine-defence::0::Nf3@6': N407,
  'alekhine-defence::0::Nf3@8': N415,
  'alekhine-defence::0::Qb3@18': N413,
  'alekhine-defence::0::a3@18': N408,
  'alekhine-defence::0::c4@4': N411,
  'alekhine-defence::0::exd6@8': N410,
  'alekhine-defence::1::Nbd2@12': N423,
  'alekhine-defence::1::Nc3@12': N422,
  'alekhine-defence::1::Re1@12': N418,
  'alekhine-defence::1::b3@16': N420,
  'alekhine-defence::1::c3@12': N421,
  'alekhine-defence::1::c4@4': N411,
  'alekhine-defence::1::c4@6': N410,
  'alekhine-defence::1::exd6@12': N417,
  'alekhine-defence::1::h3@12': N416,
  'alekhine-defence::1::h3@16': N419,
  'alekhine-defence::2::Be3@18': N424,
  'alekhine-defence::2::Nc3@10': N410,
  'alekhine-defence::2::Nc3@14': N428,
  'alekhine-defence::2::a3@18': N426,
  'alekhine-defence::2::b3@16': N429,
  'alekhine-defence::2::c4@4': N411,
  'alekhine-defence::2::d5@16': N425,
  'alekhine-defence::2::d5@18': N427,
  'alekhine-defence::2::f4@8': N430,
  'alekhine-defence::3::Be3@14': N436,
  'alekhine-defence::3::Nc3@10': N411,
  'alekhine-defence::3::Nc3@14': N433,
  'alekhine-defence::3::Re1@18': N437,
  'alekhine-defence::3::a3@18': N431,
  'alekhine-defence::3::b3@18': N434,
  'alekhine-defence::3::d5@18': N432,
  'alekhine-defence::3::f4@8': N435,
  'alekhine-defence::3::h3@14': N438,
  'alekhine-defence::4::Bc4@10': N439,
  'alekhine-defence::4::Bc4@12': N442,
  'alekhine-defence::4::Nc3@10': N444,
  'alekhine-defence::4::Nc3@12': N446,
  'alekhine-defence::4::Nf3@10': N445,
  'alekhine-defence::4::Nxe5@14': N447,
  'alekhine-defence::4::d4@4': N407,
  'alekhine-defence::4::exd6@10': N440,
  'alekhine-defence::4::exd6@12': N441,
  'alekhine-defence::4::f4@12': N443,
  'alekhine-defence::5::Bc4@12': N448,
  'alekhine-defence::5::Bc4@6': N414,
  'alekhine-defence::5::Bd3@12': N450,
  'alekhine-defence::5::Be2@12': N451,
  'alekhine-defence::5::Nc3@4': N412,
  'alekhine-defence::5::Nf3@10': N452,
  'alekhine-defence::5::Nxf7@10': N453,
  'alekhine-defence::5::c3@12': N449,
  'alekhine-defence::5::c4@4': N411,
  'alekhine-defence::5::c4@6': N410,
  'alekhine-defence::6::Bc4@6': N414,
  'alekhine-defence::6::Bd3@12': N457,
  'alekhine-defence::6::Nc3@4': N412,
  'alekhine-defence::6::Nf3@8': N415,
  'alekhine-defence::6::c4@4': N411,
  'alekhine-defence::6::d5@10': N456,
  'alekhine-defence::6::dxe5@18': N454,
  'alekhine-defence::6::f4@8': N430,
  'alekhine-defence::6::h3@12': N455,
  'anti-alapin-black::0::Bb5@12': N123,
  'anti-alapin-black::0::Bc4@12': N569,
  'anti-alapin-black::0::Bd3@4': N84,
  'anti-alapin-black::0::Be2@12': N570,
  'anti-alapin-black::0::Nc3@12': N121,
  'anti-alapin-black::0::Qc2@4': N86,
  'anti-alapin-black::0::d3@4': N80,
  'anti-alapin-black::0::d4@4': N81,
  'anti-alapin-black::0::exd6@12': N120,
  'anti-alapin-black::0::f3@4': N85,
  'anti-alapin-black::1::Bc4@6': N573,
  'anti-alapin-black::1::Bd3@4': N84,
  'anti-alapin-black::1::Qc2@4': N86,
  'anti-alapin-black::1::d3@4': N80,
  'anti-alapin-black::1::d4@4': N81,
  'anti-alapin-black::1::d4@6': N571,
  'anti-alapin-black::1::d4@8': N572,
  'anti-alapin-black::1::f3@4': N85,
  'anti-alapin-black::1::g3@6': N574,
  'anti-alekhine-modern::0::Nb6@5': N614,
  'anti-alekhine-modern::0::Nb6@7': N619,
  'anti-alekhine-modern::0::Nc6@5': N615,
  'anti-alekhine-modern::0::Nc6@7': N621,
  'anti-alekhine-modern::0::b5@5': N616,
  'anti-alekhine-modern::0::c6@7': N620,
  'anti-alekhine-modern::0::dxe5@7': N617,
  'anti-alekhine-modern::0::e6@5': N613,
  'anti-alekhine-modern::0::g6@7': N618,
  'anti-alekhine-modern::1::Bg4@7': N407,
  'anti-alekhine-modern::1::Nb6@5': N614,
  'anti-alekhine-modern::1::Nb6@7': N619,
  'anti-alekhine-modern::1::Nc6@5': N615,
  'anti-alekhine-modern::1::Nc6@7': N621,
  'anti-alekhine-modern::1::b5@5': N616,
  'anti-alekhine-modern::1::c6@7': N620,
  'anti-alekhine-modern::1::e6@5': N613,
  'anti-alekhine-modern::1::g6@7': N618,
  'anti-alekhine-modern::1::g6@9': N622,
  'anti-alekhine-modern::2::Bg4@7': N407,
  'anti-alekhine-modern::2::Nb6@5': N614,
  'anti-alekhine-modern::2::Nb6@7': N619,
  'anti-alekhine-modern::2::Nc6@5': N615,
  'anti-alekhine-modern::2::Nc6@7': N621,
  'anti-alekhine-modern::2::b5@5': N616,
  'anti-alekhine-modern::2::c6@7': N620,
  'anti-alekhine-modern::2::c6@9': N623,
  'anti-alekhine-modern::2::dxe5@7': N617,
  'anti-alekhine-modern::2::e6@5': N613,
  'anti-alekhine-modern::3::Bg4@7': N407,
  'anti-alekhine-modern::3::Nb6@5': N614,
  'anti-alekhine-modern::3::Nc6@5': N615,
  'anti-alekhine-modern::3::Nc6@7': N621,
  'anti-alekhine-modern::3::b5@5': N616,
  'anti-alekhine-modern::3::c6@7': N620,
  'anti-alekhine-modern::3::dxe5@7': N617,
  'anti-alekhine-modern::3::dxe5@9': N624,
  'anti-alekhine-modern::3::e6@5': N613,
  'anti-alekhine-modern::3::g6@7': N618,
  'anti-caro-fantasy::0::Bxc3+@9': N494,
  'anti-caro-fantasy::0::Nd7@9': N495,
  'anti-caro-fantasy::0::Ne7@9': N491,
  'anti-caro-fantasy::0::Nf6@9': N492,
  'anti-caro-fantasy::0::Qa5@9': N497,
  'anti-caro-fantasy::0::Qb6@5': N499,
  'anti-caro-fantasy::0::b6@9': N500,
  'anti-caro-fantasy::0::dxe4@5': N496,
  'anti-caro-fantasy::0::dxe4@9': N493,
  'anti-caro-fantasy::0::g6@5': N498,
  'anti-caro-fantasy::1::Be6@9': N506,
  'anti-caro-fantasy::1::Nd7@7': N504,
  'anti-caro-fantasy::1::Nf6@7': N501,
  'anti-caro-fantasy::1::Qb6@5': N499,
  'anti-caro-fantasy::1::e5@5': N508,
  'anti-caro-fantasy::1::e6@5': N505,
  'anti-caro-fantasy::1::e6@7': N502,
  'anti-caro-fantasy::1::exd4@9': N507,
  'anti-caro-fantasy::1::g6@5': N498,
  'anti-caro-fantasy::1::g6@7': N503,
  'anti-caro-fantasy::2::Nf6@9': N514,
  'anti-caro-fantasy::2::Qb6@5': N499,
  'anti-caro-fantasy::2::Qxb2@11': N512,
  'anti-caro-fantasy::2::dxe4@5': N496,
  'anti-caro-fantasy::2::dxe4@7': N509,
  'anti-caro-fantasy::2::dxe4@9': N511,
  'anti-caro-fantasy::2::e5@11': N513,
  'anti-caro-fantasy::2::e5@5': N508,
  'anti-caro-fantasy::2::e6@5': N505,
  'anti-caro-fantasy::2::e6@7': N510,
  'anti-caro-fantasy::3::Nf6@9': N516,
  'anti-caro-fantasy::3::dxe4@5': N496,
  'anti-caro-fantasy::3::e5@5': N508,
  'anti-caro-fantasy::3::e5@7': N518,
  'anti-caro-fantasy::3::e5@9': N515,
  'anti-caro-fantasy::3::e6@5': N505,
  'anti-caro-fantasy::3::e6@7': N517,
  'anti-caro-fantasy::3::g6@5': N498,
  'anti-french-advance::0::Bd7@7': N522,
  'anti-french-advance::0::Nge7@9': N521,
  'anti-french-advance::0::Nh6@9': N523,
  'anti-french-advance::0::Qb6@7': N520,
  'anti-french-advance::0::Qb6@9': N519,
  'anti-french-advance::0::b6@5': N524,
  'anti-french-advance::1::Bd7@11': N527,
  'anti-french-advance::1::Bd7@13': N531,
  'anti-french-advance::1::Bd7@7': N522,
  'anti-french-advance::1::Bd7@9': N526,
  'anti-french-advance::1::Nc6@7': N150,
  'anti-french-advance::1::Nh6@11': N525,
  'anti-french-advance::1::a5@11': N528,
  'anti-french-advance::1::b6@5': N524,
  'anti-french-advance::1::f6@11': N529,
  'anti-french-advance::1::f6@13': N530,
  'anti-grand-prix-black::0::Bb5@4': N578,
  'anti-grand-prix-black::0::Bb5@6': N575,
  'anti-grand-prix-black::0::Bc4@6': N576,
  'anti-grand-prix-black::0::Bc4@8': N581,
  'anti-grand-prix-black::0::Nf3@4': N579,
  'anti-grand-prix-black::0::Nge2@4': N580,
  'anti-grand-prix-black::0::a4@8': N583,
  'anti-grand-prix-black::0::d3@8': N584,
  'anti-grand-prix-black::0::g3@4': N577,
  'anti-grand-prix-black::0::g3@8': N582,
  'anti-grand-prix-black::1::Bb5@4': N578,
  'anti-grand-prix-black::1::Bb5@6': N575,
  'anti-grand-prix-black::1::Bb5@8': N585,
  'anti-grand-prix-black::1::Bc4@6': N576,
  'anti-grand-prix-black::1::Nf3@4': N579,
  'anti-grand-prix-black::1::Nge2@4': N580,
  'anti-grand-prix-black::1::a4@8': N583,
  'anti-grand-prix-black::1::d3@8': N584,
  'anti-grand-prix-black::1::g3@4': N577,
  'anti-grand-prix-black::1::g3@8': N582,
  'anti-kings-gambit-black::0::Bc4@6': N599,
  'anti-kings-gambit-black::0::Bxd5@12': N597,
  'anti-kings-gambit-black::0::Nc3@6': N598,
  'anti-kings-gambit-black::0::Ng5@8': N603,
  'anti-kings-gambit-black::0::Nxg4@10': N602,
  'anti-kings-gambit-black::0::d4@10': N601,
  'anti-kings-gambit-black::0::d4@6': N600,
  'anti-kings-gambit-black::1::Nf3@10': N606,
  'anti-kings-gambit-black::1::Nf3@8': N611,
  'anti-kings-gambit-black::1::Qe2@8': N612,
  'anti-kings-gambit-black::1::Qf3@8': N609,
  'anti-kings-gambit-black::1::d3@10': N607,
  'anti-kings-gambit-black::1::d3@6': N610,
  'anti-kings-gambit-black::1::d4@10': N608,
  'anti-kings-gambit-black::1::d4@8': N605,
  'anti-kings-gambit-black::1::e5@10': N604,
  'anti-modern-150::0::Bb7@11': N554,
  'anti-modern-150::0::Nd7@11': N556,
  'anti-modern-150::0::Nd7@7': N563,
  'anti-modern-150::0::Nd7@9': N561,
  'anti-modern-150::0::Nf6@7': N558,
  'anti-modern-150::0::a6@5': N559,
  'anti-modern-150::0::c5@5': N560,
  'anti-modern-150::0::c6@5': N555,
  'anti-modern-150::0::c6@7': N557,
  'anti-modern-150::0::d5@5': N562,
  'anti-modern-150::1::Nd7@11': N566,
  'anti-modern-150::1::Nf6@11': N568,
  'anti-modern-150::1::Nf6@7': N558,
  'anti-modern-150::1::a5@11': N565,
  'anti-modern-150::1::a6@11': N567,
  'anti-modern-150::1::a6@5': N559,
  'anti-modern-150::1::a6@7': N564,
  'anti-modern-150::1::c5@5': N560,
  'anti-modern-150::1::c6@5': N555,
  'anti-modern-150::1::d5@5': N562,
  'anti-modern-150::2::Nd7@7': N563,
  'anti-modern-150::2::a6@5': N559,
  'anti-modern-150::2::a6@7': N564,
  'anti-modern-150::2::c5@5': N560,
  'anti-modern-150::2::c6@5': N555,
  'anti-modern-150::2::c6@7': N557,
  'anti-modern-150::2::d5@5': N562,
  'anti-pirc-austrian::0::c5@9': N552,
  'anti-pirc-austrian::1::O-O@9': N553,
  'anti-scandinavian::0::Bf5@9': N534,
  'anti-scandinavian::0::Bg4@11': N537,
  'anti-scandinavian::0::Bg4@9': N535,
  'anti-scandinavian::0::Nc6@9': N536,
  'anti-scandinavian::0::Qd6@5': N303,
  'anti-scandinavian::0::Qd8@5': N533,
  'anti-scandinavian::0::c6@7': N532,
  'anti-scandinavian::1::Bg4@9': N542,
  'anti-scandinavian::1::Qa5@5': N538,
  'anti-scandinavian::1::Qd8@5': N533,
  'anti-scandinavian::1::b5@11': N543,
  'anti-scandinavian::1::c6@7': N541,
  'anti-scandinavian::1::c6@9': N539,
  'anti-scandinavian::1::g6@11': N544,
  'anti-scandinavian::1::g6@9': N540,
  'anti-scandinavian::2::Bf5@9': N549,
  'anti-scandinavian::2::Qa5@5': N538,
  'anti-scandinavian::2::Qd6@5': N303,
  'anti-scandinavian::2::a6@9': N551,
  'anti-scandinavian::2::c6@7': N547,
  'anti-scandinavian::2::c6@9': N546,
  'anti-scandinavian::2::e6@9': N550,
  'anti-scandinavian::2::g6@7': N548,
  'anti-scandinavian::2::g6@9': N545,
  'anti-sicilian-rossolimo::0::Nf6@5': N489,
  'anti-sicilian-rossolimo::0::d6@5': N488,
  'anti-sicilian-rossolimo::0::e5@5': N490,
  'anti-sicilian-rossolimo::0::e6@5': N487,
  'anti-sicilian-rossolimo::1::Nf6@5': N489,
  'anti-sicilian-rossolimo::1::d6@5': N488,
  'anti-sicilian-rossolimo::1::e5@5': N490,
  'anti-sicilian-rossolimo::1::g6@5': N51,
  'anti-sicilian-rossolimo::2::Nf6@5': N489,
  'anti-sicilian-rossolimo::2::e5@5': N490,
  'anti-sicilian-rossolimo::2::e6@5': N487,
  'anti-sicilian-rossolimo::2::g6@5': N51,
  'anti-sicilian-rossolimo::3::d6@5': N488,
  'anti-sicilian-rossolimo::3::e5@5': N490,
  'anti-sicilian-rossolimo::3::e6@5': N487,
  'anti-sicilian-rossolimo::3::g6@5': N51,
  'anti-smith-morra-black::0::Bc4@6': N586,
  'anti-smith-morra-black::0::Bc4@8': N590,
  'anti-smith-morra-black::0::Be2@10': N591,
  'anti-smith-morra-black::0::Be3@14': N595,
  'anti-smith-morra-black::0::Nf3@4': N588,
  'anti-smith-morra-black::0::Nf3@6': N587,
  'anti-smith-morra-black::0::Qe2@12': N594,
  'anti-smith-morra-black::0::Qe2@14': N592,
  'anti-smith-morra-black::0::Qxd4@4': N589,
  'anti-smith-morra-black::0::a4@12': N593,
  'anti-smith-morra-black::1::Bc4@6': N586,
  'anti-smith-morra-black::1::Bc4@8': N590,
  'anti-smith-morra-black::1::Be2@10': N591,
  'anti-smith-morra-black::1::Be3@14': N595,
  'anti-smith-morra-black::1::Bg5@14': N596,
  'anti-smith-morra-black::1::Nf3@4': N588,
  'anti-smith-morra-black::1::Nf3@6': N587,
  'anti-smith-morra-black::1::Qe2@12': N594,
  'anti-smith-morra-black::1::Qxd4@4': N589,
  'anti-smith-morra-black::1::a4@12': N593,
  'caro-kann::0::Bc4@16': N212,
  'caro-kann::0::Bc4@6': N211,
  'caro-kann::0::Kb1@24': N214,
  'caro-kann::0::Nd2@4': N216,
  'caro-kann::0::Ne5@24': N217,
  'caro-kann::0::O-O@22': N218,
  'caro-kann::0::c4@22': N219,
  'caro-kann::0::e5@4': N213,
  'caro-kann::0::exd5@4': N215,
  'caro-kann::1::Bg5@8': N224,
  'caro-kann::1::Nc3@6': N228,
  'caro-kann::1::Nc3@8': N220,
  'caro-kann::1::a3@8': N225,
  'caro-kann::1::c3@12': N227,
  'caro-kann::1::c3@8': N221,
  'caro-kann::1::c4@8': N222,
  'caro-kann::1::h3@8': N223,
  'caro-kann::1::h4@6': N226,
  'caro-kann::2::Be2@10': N234,
  'caro-kann::2::Be3@12': N233,
  'caro-kann::2::Bg5@12': N230,
  'caro-kann::2::d3@10': N235,
  'caro-kann::2::d3@4': N232,
  'caro-kann::2::exd5@12': N231,
  'caro-kann::2::exd5@4': N236,
  'caro-kann::2::g3@10': N237,
  'caro-kann::2::gxf3@8': N229,
  'caro-kann::3::Bb5@16': N240,
  'caro-kann::3::Bc4@16': N246,
  'caro-kann::3::Bd3@6': N241,
  'caro-kann::3::Nxd5@16': N242,
  'caro-kann::3::Nxd5@18': N244,
  'caro-kann::3::a3@16': N243,
  'caro-kann::3::a3@18': N245,
  'caro-kann::3::c5@8': N239,
  'caro-kann::3::cxd5@8': N238,
  'caro-kann::4::Be2@10': N251,
  'caro-kann::4::Be3@10': N248,
  'caro-kann::4::Bg5@14': N255,
  'caro-kann::4::c3@12': N254,
  'caro-kann::4::c3@8': N247,
  'caro-kann::4::d5@8': N250,
  'caro-kann::4::dxe5@10': N253,
  'caro-kann::4::dxe5@14': N252,
  'caro-kann::4::dxe5@8': N249,
  'caro-kann::5::Bg3@18': N262,
  'caro-kann::5::Ne2@8': N256,
  'caro-kann::5::Ne5@18': N257,
  'caro-kann::5::Qxb7@20': N261,
  'caro-kann::5::Rae1@22': N258,
  'caro-kann::5::c4@6': N215,
  'caro-kann::5::h3@14': N259,
  'caro-kann::5::h3@16': N260,
  'caro-kann::5::h3@22': N263,
  'caro-kann::6::Bc4@12': N265,
  'caro-kann::6::Bd2@18': N268,
  'caro-kann::6::Be3@12': N266,
  'caro-kann::6::Be3@16': N267,
  'caro-kann::6::Nf3@12': N264,
  'caro-kann::6::Nf4@22': N272,
  'caro-kann::6::Ng3@22': N271,
  'caro-kann::6::h3@18': N270,
  'caro-kann::6::h3@22': N269,
  'french-defence::0::Nd2@4': N141,
  'french-defence::0::Ne1@18': N147,
  'french-defence::0::Ng5@18': N149,
  'french-defence::0::Qc2@18': N148,
  'french-defence::0::Qe1@18': N144,
  'french-defence::0::Rb1@16': N143,
  'french-defence::0::Re1@18': N145,
  'french-defence::0::exd5@4': N142,
  'french-defence::0::h3@18': N146,
  'french-defence::1::Bd2@8': N155,
  'french-defence::1::Ne2@6': N153,
  'french-defence::1::Nf3@12': N154,
  'french-defence::1::Qd3@20': N156,
  'french-defence::1::cxd4@20': N151,
  'french-defence::1::e5@4': N150,
  'french-defence::1::exd5@4': N142,
  'french-defence::1::exd5@6': N152,
  'french-defence::1::h4@12': N157,
  'french-defence::2::Bd3@20': N160,
  'french-defence::2::Be2@18': N161,
  'french-defence::2::Ne2@18': N162,
  'french-defence::2::O-O-O@18': N159,
  'french-defence::2::a3@20': N164,
  'french-defence::2::e5@4': N150,
  'french-defence::2::e5@6': N158,
  'french-defence::2::exd5@4': N142,
  'french-defence::2::h4@10': N163,
  'french-defence::3::Nc3@22': N167,
  'french-defence::3::Ng3@22': N171,
  'french-defence::3::Rc1@24': N165,
  'french-defence::3::a3@22': N170,
  'french-defence::3::c3@8': N169,
  'french-defence::3::e5@4': N150,
  'french-defence::3::exd5@4': N142,
  'french-defence::3::f4@20': N168,
  'french-defence::3::h3@22': N166,
  'french-defence::4::Nc3@12': N175,
  'french-defence::4::Nc3@4': N176,
  'french-defence::4::Nd2@4': N141,
  'french-defence::4::Ne5@12': N179,
  'french-defence::4::Re1@12': N172,
  'french-defence::4::c3@12': N173,
  'french-defence::4::c3@14': N178,
  'french-defence::4::c4@12': N177,
  'french-defence::4::h3@14': N174,
  'french-defence::5::Bb5@14': N184,
  'french-defence::5::Bd3@14': N181,
  'french-defence::5::Nd2@4': N141,
  'french-defence::5::Nxf6+@14': N183,
  'french-defence::5::c3@14': N182,
  'french-defence::5::e5@4': N150,
  'french-defence::5::e5@6': N158,
  'french-defence::5::exd5@4': N142,
  'french-defence::5::f3@8': N180,
  'french-defence::6::Bg5@14': N185,
  'french-defence::6::Bg5@16': N189,
  'french-defence::6::Ng3@14': N187,
  'french-defence::6::O-O@12': N190,
  'french-defence::6::Qc2@14': N188,
  'french-defence::6::Qe2@12': N191,
  'french-defence::6::Qe2@14': N186,
  'french-defence::6::e5@4': N150,
  'french-defence::6::exd5@4': N142,
  'french-defence::7::Be3@20': N193,
  'french-defence::7::Kh1@20': N195,
  'french-defence::7::Nd2@4': N141,
  'french-defence::7::Qf3@20': N194,
  'french-defence::7::Rd1@22': N197,
  'french-defence::7::Re1@20': N192,
  'french-defence::7::a3@20': N196,
  'french-defence::7::exd5@4': N142,
  'french-defence::7::g3@20': N198,
  'french-defence::8::Bc1@10': N202,
  'french-defence::8::Be3@10': N200,
  'french-defence::8::dxc5@20': N203,
  'french-defence::8::e5@4': N150,
  'french-defence::8::e5@6': N158,
  'french-defence::8::exd5@4': N142,
  'french-defence::8::exd5@8': N201,
  'french-defence::8::f4@20': N204,
  'french-defence::8::h4@20': N199,
  'french-defence::9::Bb5+@16': N210,
  'french-defence::9::Be3@14': N207,
  'french-defence::9::Bg5@14': N209,
  'french-defence::9::Bg5@16': N208,
  'french-defence::9::Nd2@4': N141,
  'french-defence::9::O-O@14': N206,
  'french-defence::9::c3@14': N205,
  'french-defence::9::e5@4': N150,
  'french-defence::9::exd5@4': N142,
  'pirc-defence::0::Bd3@8': N343,
  'pirc-defence::0::Be2@10': N340,
  'pirc-defence::0::Be3@10': N336,
  'pirc-defence::0::Be3@14': N339,
  'pirc-defence::0::Bxa6@14': N335,
  'pirc-defence::0::Qe1@16': N341,
  'pirc-defence::0::dxc5@14': N337,
  'pirc-defence::0::e5@10': N338,
  'pirc-defence::0::e5@14': N334,
  'pirc-defence::0::h3@16': N342,
  'pirc-defence::1::Bc4@18': N351,
  'pirc-defence::1::Bc4@8': N349,
  'pirc-defence::1::Be3@16': N345,
  'pirc-defence::1::Be3@8': N346,
  'pirc-defence::1::Bf4@8': N350,
  'pirc-defence::1::Bg5@16': N353,
  'pirc-defence::1::Re1@12': N348,
  'pirc-defence::1::Re1@16': N352,
  'pirc-defence::1::h3@12': N347,
  'pirc-defence::1::h3@8': N344,
  'pirc-defence::2::Be2@10': N358,
  'pirc-defence::2::Bg5@6': N363,
  'pirc-defence::2::Bh6@10': N355,
  'pirc-defence::2::Nf3@10': N357,
  'pirc-defence::2::Nf3@6': N361,
  'pirc-defence::2::O-O-O@10': N354,
  'pirc-defence::2::f3@4': N362,
  'pirc-defence::2::f4@6': N360,
  'pirc-defence::2::h3@10': N359,
  'pirc-defence::2::h4@10': N356,
  'pirc-defence::3::Bd3@14': N371,
  'pirc-defence::3::Be2@12': N370,
  'pirc-defence::3::Bh6@12': N364,
  'pirc-defence::3::Kb1@12': N367,
  'pirc-defence::3::Nf3@12': N368,
  'pirc-defence::3::e5@12': N369,
  'pirc-defence::3::e5@8': N373,
  'pirc-defence::3::f3@12': N366,
  'pirc-defence::3::f4@8': N372,
  'pirc-defence::3::h4@12': N365,
  'pirc-defence::4::Bd3@4': N379,
  'pirc-defence::4::Bg5@14': N380,
  'pirc-defence::4::Bg5@16': N381,
  'pirc-defence::4::Qe2@14': N378,
  'pirc-defence::4::Re1@12': N375,
  'pirc-defence::4::a5@14': N376,
  'pirc-defence::4::a5@16': N382,
  'pirc-defence::4::dxe5@6': N377,
  'pirc-defence::4::f3@4': N362,
  'pirc-defence::4::h3@14': N374,
  'pirc-defence::5::Be3@14': N391,
  'pirc-defence::5::Bg5@14': N392,
  'pirc-defence::5::Bg5@16': N390,
  'pirc-defence::5::d5@12': N385,
  'pirc-defence::5::dxe5@12': N386,
  'pirc-defence::5::dxe5@14': N387,
  'pirc-defence::5::f4@16': N389,
  'pirc-defence::5::h3@12': N384,
  'pirc-defence::5::h3@14': N383,
  'pirc-defence::5::h3@16': N388,
  'pirc-defence::6::Bd3@4': N379,
  'pirc-defence::6::Nf3@6': N399,
  'pirc-defence::6::O-O@12': N398,
  'pirc-defence::6::Qe1@16': N400,
  'pirc-defence::6::dxe5@10': N394,
  'pirc-defence::6::dxe5@12': N395,
  'pirc-defence::6::f3@4': N362,
  'pirc-defence::6::fxe5@10': N393,
  'pirc-defence::6::fxe5@12': N396,
  'pirc-defence::6::h3@14': N397,
  'pirc-defence::7::Bc4@12': N403,
  'pirc-defence::7::Bd3@8': N343,
  'pirc-defence::7::Be2@10': N340,
  'pirc-defence::7::Be3@10': N336,
  'pirc-defence::7::Be3@12': N404,
  'pirc-defence::7::e5@8': N401,
  'pirc-defence::7::e6@12': N405,
  'pirc-defence::7::h4@12': N402,
  'scandinavian-defence::0::Bb3@14': N276,
  'scandinavian-defence::0::Nd5@14': N273,
  'scandinavian-defence::0::Ne4@14': N274,
  'scandinavian-defence::0::Ne5@14': N275,
  'scandinavian-defence::0::Nf3@4': N280,
  'scandinavian-defence::0::O-O@16': N281,
  'scandinavian-defence::0::a3@16': N278,
  'scandinavian-defence::0::a3@18': N279,
  'scandinavian-defence::0::h3@14': N277,
  'scandinavian-defence::1::Bb5+@4': N288,
  'scandinavian-defence::1::Be3@14': N284,
  'scandinavian-defence::1::Be3@16': N282,
  'scandinavian-defence::1::Nf3@4': N290,
  'scandinavian-defence::1::Re1@12': N287,
  'scandinavian-defence::1::c3@12': N283,
  'scandinavian-defence::1::c4@4': N291,
  'scandinavian-defence::1::c4@6': N289,
  'scandinavian-defence::1::h3@12': N285,
  'scandinavian-defence::1::h3@14': N286,
  'scandinavian-defence::2::Bb5+@4': N288,
  'scandinavian-defence::2::Be2@12': N293,
  'scandinavian-defence::2::Nc3@12': N294,
  'scandinavian-defence::2::Nf3@12': N299,
  'scandinavian-defence::2::Qa4+@12': N295,
  'scandinavian-defence::2::Qe2@12': N292,
  'scandinavian-defence::2::a3@12': N297,
  'scandinavian-defence::2::d4@4': N296,
  'scandinavian-defence::2::d5@12': N298,
  'scandinavian-defence::3::Be3@12': N300,
  'scandinavian-defence::3::Be3@14': N304,
  'scandinavian-defence::3::Bg5@12': N305,
  'scandinavian-defence::3::Bg5@14': N301,
  'scandinavian-defence::3::Nf3@4': N280,
  'scandinavian-defence::3::Re1@14': N302,
  'scandinavian-defence::3::d4@4': N308,
  'scandinavian-defence::3::g3@10': N303,
  'scandinavian-defence::3::h3@12': N307,
  'scandinavian-defence::3::h3@14': N306,
  'scandinavian-defence::4::Bb5+@4': N288,
  'scandinavian-defence::4::Be3@10': N312,
  'scandinavian-defence::4::Nc3@10': N313,
  'scandinavian-defence::4::Nc3@12': N311,
  'scandinavian-defence::4::Nc3@14': N315,
  'scandinavian-defence::4::Nf3@4': N290,
  'scandinavian-defence::4::c3@10': N310,
  'scandinavian-defence::4::c3@14': N314,
  'scandinavian-defence::4::c4@12': N309,
  'scandinavian-defence::4::c4@4': N291,
  'scandinavian-defence::5::Be3@12': N318,
  'scandinavian-defence::5::Be3@14': N323,
  'scandinavian-defence::5::Bf4@12': N321,
  'scandinavian-defence::5::Bg5@12': N317,
  'scandinavian-defence::5::Bg5@14': N320,
  'scandinavian-defence::5::O-O@12': N316,
  'scandinavian-defence::5::Qd3@12': N322,
  'scandinavian-defence::5::Qd3@18': N325,
  'scandinavian-defence::5::Re1@16': N324,
  'scandinavian-defence::5::g4@14': N319,
  'scandinavian-defence::6::Bb3@14': N329,
  'scandinavian-defence::6::Nd5@14': N326,
  'scandinavian-defence::6::Ne4@14': N327,
  'scandinavian-defence::6::Ne5@14': N328,
  'scandinavian-defence::6::Nf3@4': N280,
  'scandinavian-defence::6::O-O@16': N333,
  'scandinavian-defence::6::a3@16': N331,
  'scandinavian-defence::6::a3@18': N332,
  'scandinavian-defence::6::h3@14': N330,
  'sicilian-alapin::0::Bb5@12': N88,
  'sicilian-alapin::0::Bb5@14': N87,
  'sicilian-alapin::0::Bd3@4': N84,
  'sicilian-alapin::0::Bxf7+@14': N89,
  'sicilian-alapin::0::Nc3@12': N83,
  'sicilian-alapin::0::Qc2@4': N86,
  'sicilian-alapin::0::d3@4': N80,
  'sicilian-alapin::0::d4@4': N81,
  'sicilian-alapin::0::exd6@12': N82,
  'sicilian-alapin::0::f3@4': N85,
  'sicilian-alapin::1::Be2@10': N93,
  'sicilian-alapin::1::Be3@10': N95,
  'sicilian-alapin::1::Na3@10': N92,
  'sicilian-alapin::1::Nf3@6': N97,
  'sicilian-alapin::1::Rc1@20': N98,
  'sicilian-alapin::1::Re1@14': N94,
  'sicilian-alapin::1::c4@14': N96,
  'sicilian-alapin::1::d4@4': N91,
  'sicilian-alapin::1::e5@4': N90,
  'sicilian-alapin::1::h3@14': N99,
  'sicilian-alapin::2::Bd3@14': N104,
  'sicilian-alapin::2::Be3@14': N100,
  'sicilian-alapin::2::Bg5@14': N101,
  'sicilian-alapin::2::Nbd2@14': N108,
  'sicilian-alapin::2::a3@14': N105,
  'sicilian-alapin::2::b3@14': N107,
  'sicilian-alapin::2::dxc5@14': N102,
  'sicilian-alapin::2::exd5@6': N106,
  'sicilian-alapin::2::g4@14': N103,
  'sicilian-alapin::2::h3@14': N109,
  'sicilian-alapin::3::Bb5@12': N114,
  'sicilian-alapin::3::Bd3@10': N116,
  'sicilian-alapin::3::Bd3@14': N118,
  'sicilian-alapin::3::Be3@10': N119,
  'sicilian-alapin::3::Be3@12': N113,
  'sicilian-alapin::3::Nf3@10': N110,
  'sicilian-alapin::3::f4@10': N111,
  'sicilian-alapin::3::f4@12': N112,
  'sicilian-alapin::3::h3@10': N117,
  'sicilian-alapin::3::h3@12': N115,
  'sicilian-alapin::4::Bb5@12': N123,
  'sicilian-alapin::4::Bb5@14': N122,
  'sicilian-alapin::4::Bd3@4': N84,
  'sicilian-alapin::4::Bxf7+@14': N124,
  'sicilian-alapin::4::Nc3@12': N121,
  'sicilian-alapin::4::Qc2@4': N86,
  'sicilian-alapin::4::d3@4': N80,
  'sicilian-alapin::4::d4@4': N81,
  'sicilian-alapin::4::exd6@12': N120,
  'sicilian-alapin::4::f3@4': N85,
  'sicilian-alapin::5::Bb5@10': N127,
  'sicilian-alapin::5::Be2@10': N128,
  'sicilian-alapin::5::Be3@10': N126,
  'sicilian-alapin::5::Na3@10': N130,
  'sicilian-alapin::5::Nf3@6': N97,
  'sicilian-alapin::5::Nxe5@10': N129,
  'sicilian-alapin::5::c4@10': N125,
  'sicilian-alapin::5::d4@4': N91,
  'sicilian-alapin::5::dxc5@8': N131,
  'sicilian-alapin::5::e5@4': N90,
  'sicilian-alapin::6::Bb3@14': N132,
  'sicilian-alapin::6::Bb5@12': N88,
  'sicilian-alapin::6::Bd3@4': N84,
  'sicilian-alapin::6::Bxf7+@14': N89,
  'sicilian-alapin::6::Nc3@12': N83,
  'sicilian-alapin::6::Qc2@4': N86,
  'sicilian-alapin::6::d3@4': N80,
  'sicilian-alapin::6::d4@4': N81,
  'sicilian-alapin::6::exd6@12': N82,
  'sicilian-alapin::6::f3@4': N85,
  'sicilian-alapin::7::Bb5+@6': N136,
  'sicilian-alapin::7::Bb5+@8': N140,
  'sicilian-alapin::7::Bb5@12': N135,
  'sicilian-alapin::7::Bc4@12': N134,
  'sicilian-alapin::7::Nc3@10': N138,
  'sicilian-alapin::7::Nc3@12': N133,
  'sicilian-alapin::7::Nf3@6': N139,
  'sicilian-alapin::7::Qa4+@6': N137,
  'sicilian-alapin::7::d4@4': N91,
  'sicilian-alapin::7::e5@4': N90,
  'sicilian-dragon::0::Bb5+@4': N3,
  'sicilian-dragon::0::Bg5@24': N29,
  'sicilian-dragon::0::Bh6@24': N27,
  'sicilian-dragon::0::Nde2@28': N31,
  'sicilian-dragon::0::O-O-O@16': N30,
  'sicilian-dragon::0::Qxd4@6': N14,
  'sicilian-dragon::0::c3@4': N13,
  'sicilian-dragon::0::f3@8': N0,
  'sicilian-dragon::0::g4@24': N28,
  'sicilian-dragon::1::Bb5+@4': N3,
  'sicilian-dragon::1::Be2@10': N33,
  'sicilian-dragon::1::Bh6@24': N27,
  'sicilian-dragon::1::Kb1@24': N32,
  'sicilian-dragon::1::O-O-O@16': N30,
  'sicilian-dragon::1::Qxd4@6': N14,
  'sicilian-dragon::1::c3@4': N13,
  'sicilian-dragon::1::f3@8': N0,
  'sicilian-dragon::1::g4@24': N28,
  'sicilian-dragon::2::Bb5+@4': N3,
  'sicilian-dragon::2::Be2@10': N33,
  'sicilian-dragon::2::O-O-O@16': N30,
  'sicilian-dragon::2::Qxd4@6': N14,
  'sicilian-dragon::2::c3@4': N13,
  'sicilian-dragon::2::f3@8': N0,
  'sicilian-dragon::2::g3@10': N36,
  'sicilian-dragon::2::g4@16': N35,
  'sicilian-dragon::2::h4@18': N34,
  'sicilian-dragon::3::Bb5+@4': N3,
  'sicilian-dragon::3::Bc4@10': N40,
  'sicilian-dragon::3::Be3@10': N37,
  'sicilian-dragon::3::Qd2@18': N39,
  'sicilian-dragon::3::Qxd4@6': N14,
  'sicilian-dragon::3::c3@4': N13,
  'sicilian-dragon::3::f3@18': N38,
  'sicilian-dragon::3::f3@8': N0,
  'sicilian-dragon::3::g3@10': N36,
  'sicilian-dragon::4::Bb5+@4': N3,
  'sicilian-dragon::4::Bc4@14': N42,
  'sicilian-dragon::4::Bd3@14': N41,
  'sicilian-dragon::4::Be2@10': N33,
  'sicilian-dragon::4::Be3@10': N37,
  'sicilian-dragon::4::Be3@14': N43,
  'sicilian-dragon::4::Qxd4@6': N14,
  'sicilian-dragon::4::c3@4': N13,
  'sicilian-dragon::4::f3@8': N0,
  'sicilian-dragon::5::Bb5@4': N51,
  'sicilian-dragon::5::Qd2@16': N50,
  'sicilian-dragon::5::Rc1@18': N45,
  'sicilian-dragon::5::c3@6': N44,
  'sicilian-dragon::5::f3@12': N49,
  'sicilian-dragon::5::f3@14': N47,
  'sicilian-dragon::5::f3@16': N48,
  'sicilian-dragon::5::f3@18': N46,
  'sicilian-dragon::5::f4@18': N52,
  'sicilian-dragon::5::h3@18': N53,
  'sicilian-dragon::6::Bb5+@4': N3,
  'sicilian-dragon::6::Bc4@16': N56,
  'sicilian-dragon::6::Be2@10': N7,
  'sicilian-dragon::6::Bg5@10': N4,
  'sicilian-dragon::6::Bh6@16': N57,
  'sicilian-dragon::6::f3@8': N0,
  'sicilian-dragon::6::g4@16': N54,
  'sicilian-dragon::6::g4@18': N55,
  'sicilian-dragon::6::h3@10': N10,
  'sicilian-dragon::7::Bb5+@12': N58,
  'sicilian-dragon::7::Bb5+@4': N3,
  'sicilian-dragon::7::Bc4@10': N40,
  'sicilian-dragon::7::Be2@10': N33,
  'sicilian-dragon::7::Be3@10': N37,
  'sicilian-dragon::7::Qxd4@6': N14,
  'sicilian-dragon::7::c3@4': N13,
  'sicilian-dragon::7::f3@8': N0,
  'sicilian-dragon::7::g3@10': N36,
  'sicilian-najdorf::0::Bb5+@4': N3,
  'sicilian-najdorf::0::Bd3@16': N6,
  'sicilian-najdorf::0::Be2@10': N7,
  'sicilian-najdorf::0::Be2@16': N1,
  'sicilian-najdorf::0::Bg5@10': N4,
  'sicilian-najdorf::0::Nd5@16': N5,
  'sicilian-najdorf::0::f3@8': N0,
  'sicilian-najdorf::0::g4@16': N8,
  'sicilian-najdorf::0::g4@18': N2,
  'sicilian-najdorf::1::Bb5+@4': N3,
  'sicilian-najdorf::1::Bc4@10': N12,
  'sicilian-najdorf::1::Be3@10': N9,
  'sicilian-najdorf::1::Bg5@10': N4,
  'sicilian-najdorf::1::Qxd4@6': N14,
  'sicilian-najdorf::1::c3@4': N13,
  'sicilian-najdorf::1::f3@10': N11,
  'sicilian-najdorf::1::f3@8': N0,
  'sicilian-najdorf::1::h3@10': N10,
  'sicilian-najdorf::2::Bb5+@4': N3,
  'sicilian-najdorf::2::Bc4@14': N17,
  'sicilian-najdorf::2::Bd3@14': N15,
  'sicilian-najdorf::2::Be2@10': N7,
  'sicilian-najdorf::2::Be2@14': N19,
  'sicilian-najdorf::2::Be3@10': N9,
  'sicilian-najdorf::2::Qd2@14': N16,
  'sicilian-najdorf::2::e5@14': N18,
  'sicilian-najdorf::2::f3@8': N0,
  'sicilian-najdorf::3::Bb5+@4': N3,
  'sicilian-najdorf::3::Bc4@10': N12,
  'sicilian-najdorf::3::Be2@10': N7,
  'sicilian-najdorf::3::Be3@10': N9,
  'sicilian-najdorf::3::Qxd4@6': N14,
  'sicilian-najdorf::3::c3@4': N13,
  'sicilian-najdorf::3::f3@10': N11,
  'sicilian-najdorf::3::f3@8': N0,
  'sicilian-najdorf::3::h3@10': N10,
  'sicilian-najdorf::4::Bb5+@4': N3,
  'sicilian-najdorf::4::Be2@16': N21,
  'sicilian-najdorf::4::Be3@10': N9,
  'sicilian-najdorf::4::Bg5@10': N4,
  'sicilian-najdorf::4::Bg5@14': N20,
  'sicilian-najdorf::4::Nde2@12': N23,
  'sicilian-najdorf::4::Nf5@12': N24,
  'sicilian-najdorf::4::f3@8': N0,
  'sicilian-najdorf::4::g4@18': N22,
  'sicilian-najdorf::5::Bb5+@4': N3,
  'sicilian-najdorf::5::Be2@10': N7,
  'sicilian-najdorf::5::Be3@10': N9,
  'sicilian-najdorf::5::Bg5@10': N4,
  'sicilian-najdorf::5::Qxd4@6': N14,
  'sicilian-najdorf::5::c3@4': N13,
  'sicilian-najdorf::5::f3@10': N11,
  'sicilian-najdorf::5::f3@8': N0,
  'sicilian-najdorf::5::h3@10': N10,
  'sicilian-najdorf::6::Bb5+@4': N3,
  'sicilian-najdorf::6::Bc4@10': N12,
  'sicilian-najdorf::6::Be2@10': N7,
  'sicilian-najdorf::6::Be3@10': N9,
  'sicilian-najdorf::6::Bg5@10': N4,
  'sicilian-najdorf::6::c3@4': N13,
  'sicilian-najdorf::6::f3@10': N11,
  'sicilian-najdorf::6::f3@8': N0,
  'sicilian-najdorf::6::h3@10': N10,
  'sicilian-najdorf::7::Bb5+@4': N3,
  'sicilian-najdorf::7::Bc4@10': N12,
  'sicilian-najdorf::7::Be2@10': N7,
  'sicilian-najdorf::7::Bg5@10': N4,
  'sicilian-najdorf::7::f3@10': N11,
  'sicilian-najdorf::7::f3@18': N26,
  'sicilian-najdorf::7::f3@8': N0,
  'sicilian-najdorf::7::h3@10': N10,
  'sicilian-najdorf::7::h3@18': N25,
  'sicilian-najdorf::8::Bb5+@4': N3,
  'sicilian-najdorf::8::Bc4@10': N12,
  'sicilian-najdorf::8::Be2@10': N7,
  'sicilian-najdorf::8::Be3@10': N9,
  'sicilian-najdorf::8::Bg5@10': N4,
  'sicilian-najdorf::8::c3@4': N13,
  'sicilian-najdorf::8::f3@10': N11,
  'sicilian-najdorf::8::f3@8': N0,
  'sicilian-najdorf::8::h3@10': N10,
  'sicilian-sveshnikov::0::Bb5@4': N51,
  'sicilian-sveshnikov::0::Be2@22': N66,
  'sicilian-sveshnikov::0::Nb3@10': N61,
  'sicilian-sveshnikov::0::Nf3@10': N62,
  'sicilian-sveshnikov::0::Nf5@10': N63,
  'sicilian-sveshnikov::0::Nxc6@10': N60,
  'sicilian-sveshnikov::0::Nxc6@8': N59,
  'sicilian-sveshnikov::0::a4@24': N65,
  'sicilian-sveshnikov::0::f3@8': N64,
  'sicilian-sveshnikov::1::Bb5@4': N51,
  'sicilian-sveshnikov::1::Nb3@10': N61,
  'sicilian-sveshnikov::1::Nc3@4': N68,
  'sicilian-sveshnikov::1::Nd5@16': N67,
  'sicilian-sveshnikov::1::Nf3@10': N62,
  'sicilian-sveshnikov::1::Nf5@10': N63,
  'sicilian-sveshnikov::1::Nxc6@10': N60,
  'sicilian-sveshnikov::1::Nxc6@8': N59,
  'sicilian-sveshnikov::1::f3@8': N64,
  'sicilian-sveshnikov::2::Bb5@4': N51,
  'sicilian-sveshnikov::2::Bxf6@16': N69,
  'sicilian-sveshnikov::2::Nb3@10': N61,
  'sicilian-sveshnikov::2::Nc3@4': N68,
  'sicilian-sveshnikov::2::Nf3@10': N62,
  'sicilian-sveshnikov::2::Nf5@10': N63,
  'sicilian-sveshnikov::2::Nxc6@10': N60,
  'sicilian-sveshnikov::2::Nxc6@8': N59,
  'sicilian-sveshnikov::2::f3@8': N64,
  'sicilian-sveshnikov::3::Bb5@4': N51,
  'sicilian-sveshnikov::3::Bxf6@16': N69,
  'sicilian-sveshnikov::3::Nb3@10': N61,
  'sicilian-sveshnikov::3::Nc3@4': N68,
  'sicilian-sveshnikov::3::Nf3@10': N62,
  'sicilian-sveshnikov::3::Nf5@10': N63,
  'sicilian-sveshnikov::3::Nxc6@10': N60,
  'sicilian-sveshnikov::3::Nxc6@8': N59,
  'sicilian-sveshnikov::3::f3@8': N64,
  'sicilian-sveshnikov::4::Bb5@4': N51,
  'sicilian-sveshnikov::4::Nb3@10': N61,
  'sicilian-sveshnikov::4::Nc3@4': N68,
  'sicilian-sveshnikov::4::Ndb5@10': N70,
  'sicilian-sveshnikov::4::Nf5@10': N63,
  'sicilian-sveshnikov::4::Nxc6@10': N60,
  'sicilian-sveshnikov::4::Nxc6@8': N59,
  'sicilian-sveshnikov::4::O-O@14': N71,
  'sicilian-sveshnikov::4::f3@8': N64,
  'sicilian-sveshnikov::5::Bb5@4': N51,
  'sicilian-sveshnikov::5::Bxf6@16': N69,
  'sicilian-sveshnikov::5::Nb3@10': N61,
  'sicilian-sveshnikov::5::Nc3@4': N68,
  'sicilian-sveshnikov::5::Nf3@10': N62,
  'sicilian-sveshnikov::5::Nf5@10': N63,
  'sicilian-sveshnikov::5::Nxc6@10': N60,
  'sicilian-sveshnikov::5::Nxc6@8': N59,
  'sicilian-sveshnikov::5::f3@8': N64,
  'sicilian-sveshnikov::6::Bb5@4': N51,
  'sicilian-sveshnikov::6::Bd3@16': N78,
  'sicilian-sveshnikov::6::Be3@16': N77,
  'sicilian-sveshnikov::6::Bg5@16': N76,
  'sicilian-sveshnikov::6::Nb3@8': N73,
  'sicilian-sveshnikov::6::Nf3@8': N74,
  'sicilian-sveshnikov::6::Nf5@8': N75,
  'sicilian-sveshnikov::6::Nxc6@8': N72,
  'sicilian-sveshnikov::6::c3@6': N44,
  'sicilian-sveshnikov::6::f3@16': N79,
  'sicilian-sveshnikov::7::Bb5@4': N51,
  'sicilian-sveshnikov::7::Be2@22': N66,
  'sicilian-sveshnikov::7::Nb3@10': N61,
  'sicilian-sveshnikov::7::Nc3@4': N68,
  'sicilian-sveshnikov::7::Nf3@10': N62,
  'sicilian-sveshnikov::7::Nf5@10': N63,
  'sicilian-sveshnikov::7::Nxc6@10': N60,
  'sicilian-sveshnikov::7::Nxc6@8': N59,
  'sicilian-sveshnikov::7::f3@8': N64,
  'smith-morra-gambit::0::Bd7@17': N460,
  'smith-morra-gambit::0::Be6@21': N465,
  'smith-morra-gambit::0::Bg4@19': N464,
  'smith-morra-gambit::0::Nf6@5': N467,
  'smith-morra-gambit::0::O-O@17': N459,
  'smith-morra-gambit::0::Qa5@17': N461,
  'smith-morra-gambit::0::Qb6@17': N463,
  'smith-morra-gambit::0::Qc7@17': N458,
  'smith-morra-gambit::0::a6@17': N462,
  'smith-morra-gambit::0::a6@21': N466,
  'smith-morra-gambit::1::Bd7@15': N470,
  'smith-morra-gambit::1::Bg4@15': N474,
  'smith-morra-gambit::1::a6@15': N471,
  'smith-morra-gambit::1::a6@21': N477,
  'smith-morra-gambit::1::d5@15': N472,
  'smith-morra-gambit::1::dxc3@5': N476,
  'smith-morra-gambit::1::dxe5@13': N468,
  'smith-morra-gambit::1::e6@13': N469,
  'smith-morra-gambit::1::e6@15': N473,
  'smith-morra-gambit::1::e6@9': N475,
  'smith-morra-gambit::2::Bd7@19': N480,
  'smith-morra-gambit::2::Be6@19': N481,
  'smith-morra-gambit::2::Bg4@15': N482,
  'smith-morra-gambit::2::Nf6@13': N478,
  'smith-morra-gambit::2::a6@17': N486,
  'smith-morra-gambit::2::a6@19': N479,
  'smith-morra-gambit::2::b6@19': N484,
  'smith-morra-gambit::2::dxc3@5': N476,
  'smith-morra-gambit::2::e6@13': N483,
  'smith-morra-gambit::2::h6@19': N485,
};
