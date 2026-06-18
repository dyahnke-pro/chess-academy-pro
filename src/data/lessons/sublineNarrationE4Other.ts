import type { AnnotationArrow, AnnotationHighlight } from '../../types';
import type { SublineNarration } from '../../services/sublineLesson';

// GROUP B — 1.e4 (Sicilian / French / Caro-Kann / Pirc / Alekhine / Scandinavian)
// + their counter-weapons. Owned by ONE parallel session.
// HAND-AUTHORED, board-verified subline narration in the coach-beside-you voice:
// every entry leads with the deviation move and tells the student what to do and
// why. Grounded in the real line; shared lines map one narration to many keys.
// Key format: `${openingId}::${variationIndex}::${triggerMove}@${atPly}`.

const KEY = 'rgba(255,214,0,0.88)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

const N0: SublineNarration = {
  intro: { say: "Bc4 — White's Bc4-Bb3 aimed at f7 and Qh5 lunged at your kingside, but you already grabbed the e5-pawn and shoved it to …e4 and …e3. That e3-pawn wedges deep beside White's f2, cramping his kingside and denying his pieces their natural squares while the h5-queen finds no real target. Keep your extra pawn and a sound position — the premature attack has run out of force.", sayShort: "…e3 jams kingside — keep the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-space'],
};

const N1: SublineNarration = {
  intro: { say: "Bd3 — in the Four Pawns Attack White offers this to challenge your active f5-bishop on the b1-h7 diagonal. Trade with …Bxd3 to ease the cramp and leave his d4 and e5 pawns weaker, or keep the bishop and hold …Bb4's pin on the c3-knight. His broad pawn chain is overextended, so swarm the d4 and e5 squares with your pieces.", sayShort: "Bd3 challenge — trade or hold f5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N2: SublineNarration = {
  intro: { say: "Be2 — White finishes development in the Four Pawns Attack, his most ambitious try, with e5, d4, c4 and f4 claiming huge space. You're already active: …Nc6 and …Bf5 hit the centre, and …Bb4 pins the c3-knight to pile onto d4. Don't fear that pawn wall — play against e5 and d4 with your pieces; the over-extended chain is your long-term target.", sayShort: "Four Pawns Attack — pressure the centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N3: SublineNarration = {
  intro: { say: "Nc3 — the rare Two Knights line, and after …Nxc3 and dxc3 you return with …d6, …d5 and the bold …d4-…d3 thrust. That …d3 pawn is a thorn wedged deep in White's camp, cramping his f1-bishop and kingside while you develop freely around it. Let the advanced passed pawn dictate the game and tie his pieces down to containing it.", sayShort: "…d4, …d3 — thorn in White's camp" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-passed', 'concept:pos-space'],
};

const N4: SublineNarration = {
  intro: { say: "Nf3 — the Modern Variation main line, White developing naturally behind his broad e5 and d4 centre. Your …Bg4 pins toward that f3-knight to pressure the centre, and after Be2 he quietly breaks the pin and keeps the big pawn duo intact. He'll hold his space with O-O and c4 and try to squeeze you, so keep leaning on d4.", sayShort: "Be2 unpins, keep the big center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N5: SublineNarration = {
  intro: { say: "Nf3 — go for the fianchetto: play …g6 toward …Bg7, and after exd6 and …cxd6 you own the half-open c-file. With h3 stopping …Bg4, strike with …d5 to lock the centre and fix White's c4-pawn while your long-diagonal bishop bears on d4 and the queenside. That …d5 break grabs central space and gives you a concrete plan against his pawns.", sayShort: "…d5 break — fix c4, take centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pawn-fianchetto'],
};

const N6: SublineNarration = {
  intro: { say: "Qb3 — White hits your b7-pawn and tries to break the …Bb4 setup in the Four Pawns Attack. Defend comfortably with …Qe7, or play …Bxc3+ then …Na5 to hound the queen, and keep the heat on his over-extended e5-d4-c4 chain. The sortie is easily met — let your active pieces keep swarming his broad centre.", sayShort: "Meet Qb3 — defend b7, harass queen" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-space'],
};

const N7: SublineNarration = {
  intro: { say: "a3 — White breaks your …Bb4 pin on the c3-knight and asks the bishop to declare itself. Capture with …Bxc3 to wreck his queenside pawns and keep pressure on d4, or retreat to e7 for a normal game. Either way, his over-extended e5-d4-c4 chain stays your long-term target — keep your pieces aimed at it.", sayShort: "Meet a3 — …Bxc3 damages structure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-doubled', 'concept:tac-pin'],
};

const N8: SublineNarration = {
  intro: { say: "c4 — the Exchange Variation after the …exd6 recapture, leaving a sound symmetrical skeleton and the open e-file. White develops Nc3 and Bd3 toward your kingside, so answer …Be7 and castle quickly before contesting the centre with …Nc6, …Bf5 and the …d5 break. Your structure is solid and the game flows naturally with no weaknesses to defend.", sayShort: "Exchange …exd6 — solid and open" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N9: SublineNarration = {
  intro: { say: "exd6 — recapture to keep a sound, symmetrical pawn skeleton and open the e-file for your rooks. White's Bd3 eyes your kingside, so play …Be7 and castle quickly to tuck the king away before contesting the centre with …Nc6 and …Bf5 or …Bg4. The half-open e-file and your slightly cramped but solid structure give you a reliable, low-risk game.", sayShort: "Exchange …exd6 — solid, open e-file" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N10: SublineNarration = {
  intro: { say: "Nbd2 — White reroutes the knight, aiming for Nf1-g3 or Nb3 and keeping his queenside pawns flexible. Keep your …Bg4 pin on the f3-knight that guards d4, and fully developed with …e6 and …Be7, castle and break with …dxe5 or …c5. The quiet manoeuvre is harmless — you have an easy, equal game with clear central targets.", sayShort: "Nbd2 manoeuvre — keep d4 pressure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N11: SublineNarration = {
  intro: { say: "Nc3 — White develops here instead of the usual c4, settling for a smaller centre. Keep your …Bg4 pin on the f3-knight that defends d4, and with …e6 and …Be7 done, castle and strike with …dxe5 or …Nc6 to dissolve his spearhead. The reduced centre and your harmonious development promise comfortable, equal play.", sayShort: "Nc3 — smaller centre, …Bg4 bites" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N12: SublineNarration = {
  intro: { say: "Re1 — White backs the e5-pawn and prepares to contest the e-file. Your g4-bishop pins the f3-knight that guards d4, and with …e6 and …Be7 done, castle before challenging the centre with …c5 or …Nc6. Keep up the pressure on d4 — your coordinated pieces leave you comfortably placed.", sayShort: "Re1 backs e5 — pressure d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-open-file'],
};

const N13: SublineNarration = {
  intro: { say: "b3 — White supports c4 and opens the long diagonal for a bishop on b2 to reinforce d4. You're fully developed and castled, so keep your g4-bishop pressing the f3-knight and eye the …d5 or …f6 breaks to hit his centre. Your b6-knight and harmonious setup hand you a balanced, flexible middlegame.", sayShort: "b3 props c4 — break with …d5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N14: SublineNarration = {
  intro: { say: "c3 — White props the d4-pawn with granite support and prepares a slow build-up. You're fully developed with …Bg4 pinning the f3-knight, …e6 and …Be7 in place, so castle and then break with …c5 or …f6 to challenge the e5-pawn. The solid but passive c3 hands you easy equality and a clear plan against his centre.", sayShort: "c3 props d4 — break with …c5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pos-development'],
};

const N15: SublineNarration = {
  intro: { say: "exd6 — White releases the central tension and steers toward an Exchange structure; recapture with …Bxd6 or …cxd6. Your g4-bishop still pins the f3-knight that guards d4, and after recapturing you have easy development with …O-O, …Nc6 and equal play. Trading his e5-pawn removes the spearhead and frees your game.", sayShort: "exd6 — recapture, free development" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N16: SublineNarration = {
  intro: { say: "h3 — White questions your g4-bishop, so decide: …Bh5 to keep the pin on the f3-knight, or …Bxf3 to trade and damage his structure. Either way you've finished …e6 and …Be7 and can castle, keeping steady pressure on the d4-pawn the knight defends. The position is solid and the central tension favours the better-developed side — you.", sayShort: "Meet h3 — …Bh5 or …Bxf3" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-prophylaxis'],
};

const N17: SublineNarration = {
  intro: { say: "h3 — with c4 and Nc3 already added for space, White now challenges your g4-bishop. You've castled and developed fully, so play …Bh5 to hold the pin on the f3-knight, or …Bxf3 to leave him a slightly weakened kingside. Your b6-knight and pressure on d4 keep you comfortable in a sound, manoeuvring middlegame.", sayShort: "h3 question — keep pressure on d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-pin', 'concept:pos-king-safety'],
};

const N18: SublineNarration = {
  intro: { say: "Be3 — a fully developed Exchange: both kings are castled and your …Nc6, …Bf5 and …Be7 sit harmoniously around the open e-file. He reinforces d4 and connects his rooks, but you're fully equal — contest the centre with …d5, or trade the f5-bishop and double on the e-file to hit d4. The structure is balanced and you have no weaknesses.", sayShort: "Exchange — equal, fully developed" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N19: SublineNarration = {
  intro: { say: "Nc3 — a standard Exchange where White calmly reinforces his grip on d5 and e4. You've castled, so continue …Nc6 and …Bf5 or …Bg4 to pressure d4 and contest the open e-file. The symmetrical structure gives him no targets — you're fully equal with natural piece play and the …d5 break in reserve.", sayShort: "Exchange — develop …Nc6 and …Bf5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N20: SublineNarration = {
  intro: { say: "a3 — White takes the b4-square from your pieces and prepares queenside expansion with b4. You're fully developed and equal, with …Bf5 and …Nc6 active and the e-file open, so contest the centre with …d5 or trade down on e-file pressure. His modest a3 changes little — your position is comfortable and weakness-free.", sayShort: "Exchange — equal, contest with …d5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-space'],
};

const N21: SublineNarration = {
  intro: { say: "b3 — White supports c4 and aims a bishop from b2 at the d4-pawn. You've developed naturally — …Nc6 leans on d4, …Be7 and castling complete the kingside — so bring the bishop to f5 or g4 before contesting the centre with …d5. The open e-file and your harmonious structure leave you equal with nothing to defend.", sayShort: "b3 supports c4 — equal Exchange" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N22: SublineNarration = {
  intro: { say: "d5 — White pushes immediately to kick your c6-knight and grab space before finishing development. The knight lands well: …Nb4 hits the d5-pawn and eyes c2 and d3, and the advance becomes a target you blockade. His premature thrust leaves d5 loose and the e5-square free for your pieces.", sayShort: "d5 kick — …Nb4 hits the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N23: SublineNarration = {
  intro: { say: "d5 — White lunges for space and kicks your c6-knight, but the advance loosens the centre and surrenders e5. Retreat to a strong post with …Nb4 or …Ne5, then treat the d5-pawn as a fixed target to blockade and attack. His space grab leaves the d-pawn overextended and the e5-outpost beckoning your pieces.", sayShort: "Meet d5 — blockade, …Ne5 outpost" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N24: SublineNarration = {
  intro: { say: "f4 — White props the e5-pawn and grabs maximum space in the Four Pawns Attack. You've already hit back: …dxe5 and …Nc6 pressure d4 and e5, and …Bf5 develops the bishop to its best diagonal before …e6 locks it in. Don't challenge his broad chain head-on — pile up on it, since it's loosely held.", sayShort: "Four Pawns — …Nc6, …Bf5 pressure" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-development'],
};

const N25: SublineNarration = {
  intro: { say: "Be3 — a calm Exchange where White develops the bishop and supports d4 as both sides start castling. Continue …Nc6 and …Bf5 or …Bg4 to lean on d4, and contest the open e-file with …Re8. The symmetrical structure has no weaknesses, and your natural development plus the …d5 break ensure full equality.", sayShort: "Be3 supports d4 — answer …Nc6" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N26: SublineNarration = {
  intro: { say: "Nc3 — reaching the Exchange by a c4-first order, White bolsters the centre as both sides begin castling. Your plan is unchanged: …Nc6 and …Bf5 develop with pressure on d4, and the open e-file invites …Re8. The balanced structure and harmonious development give you an easy, weakness-free game.", sayShort: "Exchange — easy, balanced development" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N27: SublineNarration = {
  intro: { say: "Re1 — White claims the open e-file, the natural battleground in this structure. You've matched his development with …Bf5, …Nc6 and …Be7, so contest the file with …Re8 and challenge d4. The position is symmetrical and equal — your active pieces and the …d5 break keep the middlegame comfortable.", sayShort: "Re1 grabs e-file — answer …Re8" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N28: SublineNarration = {
  intro: { say: "a3 — by a different order you reach the same fully developed Exchange, White grabbing queenside space. Your pieces are ideally placed — …Bf5 on the active diagonal, …Nc6 leaning on d4, the king safely castled — and the open e-file invites rook play. Keep the …d5 break or pressure on d4 in hand; you're fully equal with no structural concerns.", sayShort: "Exchange — harmonious, open e-file" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N29: SublineNarration = {
  intro: { say: "b3 — a fully developed Exchange where White prepares a bishop on b2 to bolster d4 along the long diagonal. You're comfortably equal with …Bf5, …Nc6 and …Be7 active and the e-file open for your rooks. Aim for the …d5 break or pressure against d4 — his fianchetto setup changes nothing about your sound, weakness-free game.", sayShort: "b3 fianchetto — Black fully equal" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-open-file'],
};

const N30: SublineNarration = {
  intro: { say: "d5 — reaching this structure by a different order, White pushes past to attack your c6-knight and grab space. Reroute the knight to a fine square with …Ne5 or …Nb4, and treat the advanced d5-pawn as a long-term weakness to blockade and besiege. The freed e5-square is an ideal outpost for your pieces.", sayShort: "d5 grab — blockade and besiege" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-outpost', 'concept:pawn-backward'],
};

const N31: SublineNarration = {
  intro: { say: "f4 — reaching the Four Pawns Attack by a different move order, you again meet the e5-d4-c4-f4 wall with …dxe5, …Nc6 and …Bf5. Your bishop on f5 eyes the b1-h7 diagonal and supports the coming …e6, while your knight on c6 leans on d4. His space looks imposing, but every advanced pawn is a target for your pieces.", sayShort: "Four Pawns — target the pawn chain" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-center'],
};

const N32: SublineNarration = {
  intro: { say: "h3 — a quiet Exchange where White simply makes luft and prevents …Bg4, both sides having begun castling. Develop naturally with …Nc6 and …Bf5 to press d4, and contest the open e-file with …Re8. The symmetrical structure and your harmonious pieces leave you fully equal with no weaknesses to worry about.", sayShort: "h3 luft — develop …Nc6, …Bf5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-open-file'],
};

const N33: SublineNarration = {
  intro: { say: "Bc4 — in this Chase line White jabs at your d5-knight, but answer …a6 to deny his pieces the b5-square and prepare …a5 to cramp his queenside. The c5-pawn is over-extended and becomes a target once you break with …dxc5 or …e6. Your d5-knight is secure for now, and the queenside expansion gains useful space.", sayShort: "…a6 and …a5 — queenside space" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N34: SublineNarration = {
  intro: { say: "Bc4 — the c5-pawn has been exchanged off and White's bishop hits your d5-knight and the f7-square. Answer …a6 to take the b5-square from his pieces and prepare …e6 to challenge the bishop and finish development. The position has opened in your favour, with a healthy structure and easy piece play.", sayShort: "…a6 — control b5, prepare …e6" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-prophylaxis', 'concept:pos-development'],
};

const N35: SublineNarration = {
  intro: { say: "Nc3 — in the Chase Variation White challenges your d5-knight while the c5-pawn stakes out queenside space. Play …a6 and …a5 to clamp that side and restrain his pawn majority before striking the centre with …dxc5 or …e6. The c5-pawn is a long-term weakness, and your queenside expansion neutralises his space.", sayShort: "…a6, …a5 — clamp the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pawn-backward'],
};

const N36: SublineNarration = {
  intro: { say: "Nc3 — the c5-pawn has been traded off and White challenges your well-placed d5-knight. Play …a6 to keep his pieces off b5 and prepare …Be7, …Be6 and castling with a free position. With the early space evaporated and material even, you develop comfortably and have the half-open files to work with.", sayShort: "…a6 — free Chase Variation game" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-prophylaxis'],
};

const N37: SublineNarration = {
  intro: { say: "Nf3 — White develops to support the centre while keeping the c5-pawn's space. Expand with …a6 and …a5 to restrain his queenside, and prepare …dxc5 or …e6 to undermine the advanced pawn. Your d5-knight is secure and the c5-pawn will become a target, leaving you comfortable and active.", sayShort: "…a5 — restrain, target c5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pawn-backward'],
};

const N38: SublineNarration = {
  intro: { say: "Nxe5 — the Chase Variation, where c4 and c5 harried your knight from d5 to b6 and back to d5, but the c5-pawn was loosened and traded off. After …dxe5 and Nxe5 the board simplifies sharply: White's space is gone and you have the freer development with …Bf5, …e6 and …Be7 to come. Your d5-knight is well placed and the position is balanced.", sayShort: "Chase Variation — simplified, free game" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-tempo', 'concept:pos-development'],
};

const N39: SublineNarration = {
  intro: { say: "exd6 — White grabbed a pawn, but it sits deep on d6 with no support and the c5-pawn is also loose. Play …a6 and …a5 to clamp the queenside and restrain his pawns before rounding up the overextended d6-pawn with …Bxd6 or …Qxd6. His greedy grabs leave him weak, scattered pawns and hand you the initiative.", sayShort: "…a6, …a5 — round up loose pawns" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-space'],
};

const N40: SublineNarration = {
  intro: { say: "exd6 — White grabbed a pawn in the Chase Variation, but the d6-pawn is weak and over-extended, sitting deep in your camp with no support. Play …a6 to restrict his pieces and prepare …Bxd6 to regain the material with an active bishop. The greedy grab hands you easy development and a lead in piece activity.", sayShort: "…a6 — regain the loose d6-pawn" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-initiative', 'concept:pos-development'],
};

const N41: SublineNarration = {
  intro: { say: "f4 — White bolsters the e5-pawn after the c5-pawn was traded off, edging toward a Four Pawns structure. Play the useful …a6 to control b5 and prepare …dxe5 or …Bf5 with …e6 to undermine the centre. The e5-f4 duo looks strong but is loosely held — press it with your pieces once development is complete.", sayShort: "…a6 — prepare to undermine e5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N42: SublineNarration = {
  intro: { say: "Bc4 — the knights traded on d7, and after …Bxd7 you have a comfortable, simplified position with the light-squared bishop already out. The bishop targets f7, so play …a6 to prepare …e6, blunting it before completing development with …Be7 and …O-O. With the heavy central pawns gone and material even, you face no weaknesses.", sayShort: "…a6 blunts the c4-bishop" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N43: SublineNarration = {
  intro: { say: "Bd3 — after the knight trade on d7 and …Bxd7, White eyes your kingside on the b1-h7 diagonal. Play …a6 to deny b5 and prepare …e6, …Be7 and castling, your light-squared bishop already out and no weaknesses to mind. The simplified position is balanced and you complete development without difficulty.", sayShort: "…a6 — calm, simplified equality" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N44: SublineNarration = {
  intro: { say: "Be2 — following the knight trade on d7 and …Bxd7, White develops modestly and prepares to castle. You hold the more active light-squared bishop, so play …a6 to control b5 before …e6, …Be7 and castling. The simplified, symmetrical structure with the big centre dissolved gives you a fully equal, comfortable game.", sayShort: "…a6 — equal, comfortable simplification" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N45: SublineNarration = {
  intro: { say: "Nf3 — you've already cleared the centre with …dxe5 and challenged the e5-knight with …Nd7, and now that it has retreated, the …e6 and …e5 plan strikes at d4 directly. With …e5 you contest the centre as an equal, having traded off White's advanced e-pawn and freed the position. Your pieces flow out naturally and the early space edge has evaporated.", sayShort: "…e5 contests the centre" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pos-development'],
};

const N46: SublineNarration = {
  intro: { say: "Nxf7 — White tried this unsound sacrifice, but his e5-knight was simply attacked by …Nd7, and the sac gives up a piece for two pawns and a check. Take on f7 with the king; though it loses castling, it sits safely on a quiet board with your extra knight. Make luft with …a6, consolidate patiently, and convert — the sacrifice has no follow-up attack.", sayShort: "Refute Nxf7 — up a piece" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:tac-sacrifice', 'concept:pos-king-safety'],
};

const N47: SublineNarration = {
  intro: { say: "c3 — the knights traded on d7 and White props the d4-pawn, settling for a small, solid centre after the early tension dissolved. You recaptured with …Bxd7, have the freer development, and play …a6 to prepare …e6, …Be7 and castling. With the heavy centre gone and material even, you face a quiet, equal game with easy piece play.", sayShort: "c3 props d4 — quiet equality" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N48: SublineNarration = {
  intro: { say: "Bd3 — in the Modern Exchange with …cxd6 and a fianchetto, you have the half-open c-file and a g6-bishop heading to g7. Strike with …d5 to lock the centre and fix White's c4-pawn as a target while your long-diagonal bishop bears down on the queenside. That …d5 break seizes central space and gives you a clear plan against his pawns.", sayShort: "…d5 — lock centre, fix c4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pos-center', 'concept:pawn-fianchetto'],
};

const N49: SublineNarration = {
  intro: { say: "d5 — White advanced for space, so meet it with …e5 and …e4, slamming the door shut and gaining a protected passed-pawn feel in the centre. Your …e4 pawn cramps his kingside and denies his knight the f3-square, while the closed centre lets you expand with …f5 and a kingside attack. Turn the space he grabbed against him.", sayShort: "…e5, …e4 — close and cramp" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N50: SublineNarration = {
  intro: { say: "dxe5 — in the Modern Exchange with a fianchetto, you recaptured toward the centre with …cxd6 and built the Pirc-style setup with …g6 and …Bg7. Your …e5 strike hit d4, and now this opens the long diagonal where your g7-bishop already aims at e5 and beyond. Recapture on e5 to free the position and trade off the broad pawns that defined White's space.", sayShort: "…e5 break — recapture on e5" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N51: SublineNarration = {
  intro: { say: "h3 — in the Modern Exchange with a fianchetto, your …cxd6 kept the half-open c-file and …g6 prepares the long-diagonal bishop, while White makes luft and stops …Bg4. Complete the Pirc-like setup with …Bg7, aiming at d4 and the e5-square. Then castle and strike with …e5 or …Nc6 to challenge his broad centre.", sayShort: "…Bg7 fianchetto — aim at d4" },
  sources: ['https://en.wikipedia.org/wiki/Alekhine_Defence', 'concept:pawn-fianchetto', 'concept:pos-center'],
};

const N52: SublineNarration = {
  intro: { say: "Bb5 — White pins your c6-knight, the one backing your …d6 strike at e5, after the delayed d4-recapture. Break the pin or take on e5 to melt his centre down to the lone isolated d4-pawn. Then steer your knights into b6 and d5 and besiege the target.", sayShort: "Unpin or trade, d4 is weak" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N53: SublineNarration = {
  intro: { say: "Bc4 — White hits your d5-knight and eyes f7, but the bishop bites on granite: …e6 props up d5 with tempo. Play …dxe5 to leave him an isolated d4-pawn, then blockade it with your knight on d5. The c-file and that d5 outpost outlast his short-lived poke at f7.", sayShort: "…e6 shores d5, blockade the isolani" },
  sources: ['concept:pos-outpost', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N54: SublineNarration = {
  intro: { say: "Bd3 — White's bishop and the Nf3 setup are quiet and do nothing to contest the centre. Finish with …Nc6 and stand ready to hit the middle with …d5 or …e5, since he hasn't staked a claim there. Easy, harmonious development equalises and lets you play for the initiative.", sayShort: "Develop freely, prepare …d5 or …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N55: SublineNarration = {
  intro: { say: "Be2 — a quiet developing move that leaves the d4-pawn without dynamic support. Strike with …dxe5 to open the position and expose that isolated d4-pawn as a fixed target. Blockade with your d5-knight, press with the c6-knight, and take the initiative down the half-open c-file.", sayShort: "…dxe5, fix and besiege d4" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N56: SublineNarration = {
  intro: { say: "Nc3 — White offers to swap off your d5-knight, here with his d4-recapture delayed past Nf3. Take on c3 to saddle him with doubled pawns, or hold the knight and keep pressing the e5- and d4-pawns with …d6 and your c6-knight. The isolated d4-pawn is the fault line to grind.", sayShort: "Trade or hold d5, grind the isolani" },
  sources: ['concept:pawn-isolated', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N57: SublineNarration = {
  intro: { say: "Qc2 — an early, passive queen move that does nothing for the centre or his development. Develop with …Nc6, then clamp and storm: …c4 freezes his queenside chain while …a6-a5-a4 pries open the b-file. The wedge holds him in place as your attack gathers pace.", sayShort: "…c4 wedge, …a4 storm the queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N58: SublineNarration = {
  intro: { say: "d3 — White declines the centre for a King's-Indian-Attack setup with d3 and f4, but the slow plan hands you the queenside. Clamp with …c4, then storm with …a6-a5-a4 to pry open the b-file against his chain before his kingside play wakes up. With the centre closed, your wing attack arrives first.", sayShort: "…c4 and …a5-a4 storm the queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N59: SublineNarration = {
  intro: { say: "d4 — go for it: snap the e4-pawn with …Nxe4, since c3 has blocked his natural Nc3 defender. He regains it with dxc5, but that c5-pawn is loose — undermine it with …b6. He's spent moves chasing your e4-knight while your structure stays sound and his queenside pawns become targets.", sayShort: "…Nxe4 grabs the pawn, …b6 hits c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N60: SublineNarration = {
  intro: { say: "exd6 — White clears the e5-pawn with his knight already on f3, leaving himself the isolated d4-pawn. Recapture and play freely against it: your …a6 denies b5 to his bishop and knight, then you blockade d5 and grind that lone pawn down.", sayShort: "Trade on d6, isolani is the target" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N61: SublineNarration = {
  intro: { say: "f3 — clumsy: it props a future e4-centre but blocks his king's knight and weakens the light squares near his king. Seize the queenside with …c4 and the …a6-a5-a4 storm, levering open the b-file against his chain. With his development snarled, your wing attack rolls in unopposed.", sayShort: "…c4 and …a4 storm against snarled White" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N62: SublineNarration = {
  intro: { say: "Bc4 — White develops against your d5-knight and f7, but without the d4-push it has little bite: …e6 reinforces d5 at will. Expand with …a5 and …b6, then fianchetto your long-diagonal bishop to bear down on his centre. The c5-pawn and the d5 outpost give you a free hand while his setup stays passive.", sayShort: "…e6 holds d5, expand queenside" },
  sources: ['concept:pos-outpost', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N63: SublineNarration = {
  intro: { say: "d4 — the Alapin's e5-d4 duo, but your d5-knight already eyes that centre. Take and play …d6 to strike the e5-spearhead at its base; once …dxe5 trades, his d4-pawn is isolated on the half-open c-file. Swarm d4 and e5 with your knights on c6 and d5, and get the light-squared bishop out before …e6 locks it in.", sayShort: "Hit e5 at its base with …d6" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N64: SublineNarration = {
  intro: { say: "…c4 — instead of capturing on d4, clamp: lock the queenside and fix his pawn chain on c3 and d4. Your d5-knight becomes a permanent thorn and the c4-pawn cramps him, daring b3 to open lines for you. Follow the wedge with queenside expansion, undermining the base of the chain rather than trading into his central space.", sayShort: "Clamp with …c4, fix the chain" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N65: SublineNarration = {
  intro: { say: "g3 — White fianchettoes to challenge your d5-knight on the long diagonal, but the plan is slow. Strike the spearhead at once with …d6 to undermine e5; after exd6 the centre opens in your favour, with your centralised knight and a clear lead in development.", sayShort: "g3 — …d6 undermines e5." },
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N66: SublineNarration = {
  intro: { say: "Nb6 — Black retreats early and locks the centre with …d5, taking on a French-like closed character with your e5-pawn cramping him. Develop your bishop actively to d3, aiming at the kingside and h7. Castle, prep f4, and storm the kingside, using the e5-wedge as the spearhead against his restricted king.", sayShort: "Closed center, prepare f4 storm" },
  sources: ['concept:pawn-chain', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N67: SublineNarration = {
  intro: { say: "Nb6 — gain queenside space with a4 and a5 to fix the knight, then check with Bb5+ to disrupt his development. Once …c6 forces matters and …Kd7 is provoked, his king is stranded in the centre, unable to castle. Open lines against that exposed king, keep your central space edge, and exploit his lack of coordination.", sayShort: "Bb5+ strands the black king" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N68: SublineNarration = {
  intro: { say: "Nc6 — Black pressures your d4-pawn, so simply brace the centre with c3 and prepare to expand. Your e5 and d4 pawns give you commanding space while his pieces stay passive and short of squares. Complete development behind the chain, support d4 fully, and use the bind to restrict him before you advance.", sayShort: "Brace the center, keep the bind" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N69: SublineNarration = {
  intro: { say: "Nc6 — expand with c4 to kick his d5-knight, then unleash your e6 break, shattering his kingside pawns after …fxe6. The doubled, isolated e-pawns and the open f-file leave his structure permanently damaged. Develop your pieces with pressure on that weakened kingside and exploit the ruin your e6 thrust created.", sayShort: "e6 break wrecks Black's kingside" },
  sources: ['concept:pawn-doubled', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N70: SublineNarration = {
  intro: { say: "…b5 — Black grabs queenside space to shield the d5-knight from c4, an offbeat try. Undermine it: a3 prepares c4 to challenge the knight, and once the flank pawns are questioned your broad e5-d4 centre and faster development leave his queenside looking overextended.", sayShort: "…b5 — a3 prepares c4." },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N71: SublineNarration = {
  intro: { say: "c6 — Black props the d5-knight before trading on e5, and your f3-knight recaptures to its strong central outpost. Develop simply with Be2 as he brings his bishop out with …Bf5 before the chain closes. Castle, prepare c4 to challenge the d5-knight, and lean on your space and that centralised knight to keep the initiative.", sayShort: "Recapture with Ne5, prepare c4" },
  sources: ['concept:pos-centralization', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N72: SublineNarration = {
  intro: { say: "dxe5 — Black exchanges, so recapture with the knight to a powerful central post and develop modestly with Be2. His …c6 shores up the d5-knight and …Bf5 develops the bishop outside the chain. Castle, play c4 to challenge that d5-knight, and convert the lasting space your e5 and d4 pawns granted.", sayShort: "Strong Ne5, prepare c4 break" },
  sources: ['concept:pos-centralization', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N73: SublineNarration = {
  intro: { say: "…e6 — Black chooses the solid setup, so grab maximum space with c4, kicking his d5-knight to b6 and erecting a broad front on c4, d4 and e5. In the Four Pawns spirit of the Modern, your space is enormous and Black is severely cramped. Develop with Nc3 and Nf3, hold the chain, and suffocate his pieces with the bind.", sayShort: "c4 grabs space, cramp Black" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N74: SublineNarration = {
  intro: { say: "…g6 — Black heads for the …Bg7 fianchetto against your big centre. When …Nb6 challenges your c4-bishop, retreat it to b3 where it keeps the fine diagonal aimed at f7; you still hold the imposing e5 and d4 pawns and the freer game. Castle, brace the centre with c3 or Re1, and use your space edge to restrict him and prepare a central or kingside advance.", sayShort: "Bb3 keeps the diagonal and the center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N75: SublineNarration = {
  intro: { say: "g6 — Black fianchettoes after trading on e5, but your f3-knight has recaptured and your centralised Ne5 dominates, with the Bc4 eyeing f7 and the d5-knight. You keep a comfortable space edge in the centre. Support that strong knight, castle, and use the central majority and active bishop to press his slightly loosened kingside.", sayShort: "Centralized Ne5 and active Bc4" },
  sources: ['concept:pos-centralization', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N76: SublineNarration = {
  intro: { say: "c6 — Black fianchettoes the kingside bishop and props the d5-knight, while you develop the Bc4 against d5 and castle to safety. You retain the broad e5 and d4 centre and a clear space edge over his cramped pieces. Expand with c4 to kick the knight, then advance in the centre or kingside where he has less room.", sayShort: "Castle, then c4 to gain space" },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N77: SublineNarration = {
  intro: { say: "dxe5 — Black harasses with …Nb6 and tries to keep an e-file pawn, so gain queenside space with a4 and let that pawn overextend to e3. The advanced e3-pawn is weak and easily blockaded, while your harmonious development and central control dominate. Round it up, complete development, and exploit the structure his overextension handed you.", sayShort: "Let the e-pawn overextend, then win it" },
  sources: ['concept:pawn-backward', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alekhine%27s_Defence'],
};

const N78: SublineNarration = {
  intro: { say: "…Bxc3+ — recapture bxc3 and you bank the bishop pair plus a reinforced d4-pawn, eating only doubled c-pawns. Once …c5-c4 fixes the queenside, let your two bishops rake the open board while the c3-pawn shields d4. Use the half-open b-file for your rook and press that lasting edge against his slower setup.", sayShort: "bxc3 — bishop pair, b-file, strong d4" },
  sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N79: SublineNarration = {
  intro: { say: "…Nd7 — he keeps the structure flexible for …Ngf6 or …e5, but his kingside stays home and his king sits in the centre. Plant Bf4 to control e5 and the dark diagonal, hold e4 with f3, and lean on your firm d4-e4 centre. Hit the Bb4 pin with a3 and ride your extra central space.", sayShort: "Nd7 slow — Bf4 and centre dominate" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N80: SublineNarration = {
  intro: { say: "…Ne7 — this French-style knight keeps f6 free for …f5 or …g6, but it locks in the f8-bishop and clogs his kingside. Aim Bf4 at c7 and the dark squares while your d4-e4 centre with f3 behind it stays rock solid. Break with a3 to question the Bb4 and expand for the freer game.", sayShort: "Passive Ne7 — Bf4 and centre press" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N81: SublineNarration = {
  intro: { say: "…Nf6 — natural development that adds a second hitter to e4, but f3 holds e4 firmly and Bf4 owns e5 and the c7-h2 diagonal. With the Bb4 pinning your c3-knight, play a3 to challenge it and keep your broad d4-e4 centre. Remember f3 propping e4 is the spine of the Fantasy — lean on that central space.", sayShort: "Nf6 hits e4 — f3 holds, Bf4 active" },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N82: SublineNarration = {
  intro: { say: "…Qa5 — paired with …Bb4 it piles on your pinned c3-knight, so play a3 to question the bishop and unpin with b4 ideas. After …c5-c4, lever the c4-pawn with b3 while your d4-e4 centre and f3 hold. Your Bf4 and central space carry the initiative, and that a5-queen becomes a target once b4 comes.", sayShort: "Qa5 piles on Nc3 — a3 unpins" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N83: SublineNarration = {
  intro: { say: "…Qb6 — after the e4-trade he grabs space with …c5 and …c4 and eyes b2 and d4, with …a6 prepping …b5 to defend c4. Lever that advanced c4-pawn with a3 and b3, and point your d4-e4 centre and half-open f-file at f7. His queenside push is loosening — the c-pawn is weak and his king is still uncastled.", sayShort: "c4 and a6 — b3 undermines the chain" },
  sources: ['concept:pawn-backward', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N84: SublineNarration = {
  intro: { say: "…b6 — he expands with …b5 and a fianchetto, but it leaves c6 and the long light diagonal weak. Answer a3 to question the Bb4 and b3 to brace the queenside, keeping your d4-e4 centre intact. Your central space and Bf4 outrun his slow flank play, with c6 a lasting hole to target.", sayShort: "b6-b5 flank — weak c6, strong centre" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N85: SublineNarration = {
  intro: { say: "…dxe4 — he follows with …e5 and …Bg4 to pin your f3-knight and pressure d4. Meet the pin calmly: a3 and b3 secure the queenside, and after …c5-c4 the b3-lever exposes c4 as a weakness. Your d4 and e4 pawns plus the half-open f-file give you the initiative once you break the pin with h3 or Be2.", sayShort: "Bg4 pins Nf3 — b3 hits c4" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N86: SublineNarration = {
  intro: { say: "…dxe4 — he pushes …e3 then …e2 to jam your first rank, but that runner is miles from support. Keep the queenside solid with a3 and b3 and simply round the pawn up with Bxe2 or Bf1, gaining tempo. Your Bf4 and strong d4 centre leave you comfortably ahead once the loose pawn falls.", sayShort: "e3-e2 runner — round it up, gain tempo" },
  sources: ['concept:pos-tempo', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N87: SublineNarration = {
  intro: { say: "…Qb6 — in the fianchetto Fantasy he eyes b2 and d4 while …c5-c4 grabs queenside space. Brace with a3 and meet …c4 with b3 to lever the pawn off c4, opening lines against his queenside. Your d4-e4 centre backed by f3 and Be3 hands you broad space and targets on that loose c-pawn.", sayShort: "Qb6 and c4 — b3 cracks the chain" },
  sources: ['concept:pos-space', 'concept:pawn-backward', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N88: SublineNarration = {
  intro: { say: "…Be6 — after …e5 he bolsters the centre and eyes your queenside. Defend d4 with Nf3 and prepare to castle, brace the queenside with a3 and b3, and after …c5-c4 undermine the pawn with b3. Your centre, the f-file, and smoother development outweigh his space grab.", sayShort: "Be6 props centre — b3 undercuts c4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N89: SublineNarration = {
  intro: { say: "…Nd7 — he expands with …c5-c4 and preps …b5 with …a6 to hold c4. Build the c3-d4-e4 chain with a3, b3, and c3 to anchor the centre; that earlier b3-lever still leaves c4 loose. Your broad centre and half-open f-file dominate while his queenside pawns overreach with his king uncastled.", sayShort: "Nd7 and c4 — c3 anchors centre" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N90: SublineNarration = {
  intro: { say: "…Nf6 — after the e4-trade he provokes, so play e5 to kick the knight and clamp the dark squares from d4-e5. He plants a pawn deep with …c5-c4 and …c3, but a3 and b3 keep your queenside intact and that c3-pawn turns into a weak, overextended target. Your space and the strong e5-d4 chain command the centre.", sayShort: "e5 kicks knight — c3 pawn overextends" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N91: SublineNarration = {
  intro: { say: "…e5 — he strikes early, so grab the pawn with dxe5 while he tries …Bc5 and the …d4-d3-d2+ run to disrupt you. That d2-pawn is only a harmless check — scoop it with Bxd2 or Qxd2 and stay a clean pawn ahead. Your extra e5-pawn and his loose, undefended advance decide it once you catch up in development.", sayShort: "dxe5 grabs pawn — d2 check is harmless" },
  sources: ['concept:pos-tempo', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N92: SublineNarration = {
  intro: { say: "…e6 — a French-flavoured Fantasy where his Bb4 pins your c3-knight and your Bf4 develops with tempo. Question the bishop with a3, and after …c5-c4 lever it with b3 while he tries …e5 against d4 and the f4-bishop. Your d4-e4 centre with f3 behind it holds a durable space edge as his pawns overextend.", sayShort: "French-style Bb4 pin — b3 breaks c4" },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N93: SublineNarration = {
  intro: { say: "…e6 — after the e4-trade he sets a French shell and grabs space with …c5-c4. Build a solid pawn wall with a3, b3, and c3 to bolster d4 before he strikes with …e5. With pawns on c3, d4, and e4 your centre is broad and well-supported while his c4-pawn overextends and his king lags.", sayShort: "e6 and c4 — c3 shores up d4" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N94: SublineNarration = {
  intro: { say: "…exd4 — he opens the centre, so gambit the pawn with Bc4 and quick O-O for rapid development and an attack on f7. Your bishop on c4 stares down f7, your rook lands on f1 behind the half-open file, and his king is still in the centre. The lead in development and the f7-pressure fully pay for the d4-pawn.", sayShort: "Gambit centre — Bc4 and Rf1 hit f7" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N95: SublineNarration = {
  intro: { say: "…g6 — after the e4-trade he fianchettos but then lashes out with …g5, weakening his own kingside. Build the c3-d4-e4 chain with a3, b3, and c3 to anchor the centre, and note the holes that loose …g5 leaves on f5 and h5. Your solid centre against his airy kingside is a clear structural edge with targets to attack.", sayShort: "g5 weakens kingside — solid centre punishes" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N96: SublineNarration = {
  intro: { say: "…Nf6 — after …Bg7 he sets a Pirc-like structure and pressures e4. Hold e4 with f3, support d4 and the dark squares with Be3, and let your d4-e4 pawns command the centre. Expand with Qd2 and queenside play while his kingside fianchetto contests the long diagonal.", sayShort: "Bg7 fianchetto — f3 holds, Be3 braces" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N97: SublineNarration = {
  intro: { say: "…Qxb2 — he grabs the b2-pawn, but that queen is now stranded deep in your camp with your rook eyeing it down the b-file. Play a3 and g3 to trap or harass her while keeping your d4-e4 centre; his …c5 hits d4 but he is badly behind in development. Treat that pawn as poisoned and press your lead in piece play.", sayShort: "Poisoned b2 — queen stranded, develop fast" },
  sources: ['concept:tac-trap', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N98: SublineNarration = {
  intro: { say: "…dxe4 — he fianchettos …Bg7 to pressure your d4-e4 centre along the long diagonal. Secure the queenside with a3 and b3, and after …c5-c4 expose the pawn with the b3-lever. Your broad central pawns and half-open f-file give space and an attacking base while his queenside pushes loosen his own structure.", sayShort: "Bg7 eyes centre — b3 hits c4" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N99: SublineNarration = {
  intro: { say: "…dxe4 — against his …g6 setup, recapture fxe4 for a broad pawn front on d4 and e4 with the f-file half-open. He grabs queenside space with …c5 and …c4, so lever c4 loose with b3 and expose it as a target. Your centre plus Be3 and the half-open f-file give the more harmonious position.", sayShort: "Fianchetto Fantasy — b3 undermines c4" },
  sources: ['concept:pos-center', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N100: SublineNarration = {
  intro: { say: "…e5 — with …Qb6 already pressuring b2 and d4 he tries to crack the centre, but you stay braced: a3 and b3 cover the queenside and the d4-e4-f3 trio holds firm. After …c5 he has two pawn levers but no development, while your pieces aim at the centre and f7. His premature pushes leave his king stuck and the centre yours.", sayShort: "e5 and c5 levers — centre holds firm" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N101: SublineNarration = {
  intro: { say: "…e6 — he mixes …g6 with …e6 and a quick …b5-b4, loosening both wings. Meet …b4 with a3 to challenge it and b3 to keep the queenside firm, supporting d4 with Be3 while e4 holds. His committal pushes leave his king uncastled and his pawns overextended against your compact d4-e4 centre.", sayShort: "b5-b4 overextends — White centre stays compact" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N102: SublineNarration = {
  intro: { say: "…Nf6 — he hits e4 while …Qb6 eyes b2 and d4. Hold e4, prop the queenside with a3, and meet …c5-c4 with b3 to crack the chain. Your broad d4-e4 centre and half-open f-file give space and an attacking front against his slow queenside play.", sayShort: "Nf6 hits e4 — b3 levers c4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N103: SublineNarration = {
  intro: { say: "…e5 — lunge into it with dxe5 to win the pawn while he tries the …d4-d3-d2+ runner to jam you. That d2-pawn is a harmless check cut off from support — take it with Bxd2 or Qxd2 and stay a clean pawn up. His wrecked centre and exposed king decide the position in your favour.", sayShort: "dxe5 wins pawn — d2 runner falls" },
  sources: ['concept:pos-tempo', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N104: SublineNarration = {
  intro: { say: "…e5 — the Fantasy's f3 props e4 so your broad d4-e4 centre holds the Caro at bay. After …Qb6 hits b2 and the trade on e4, he strikes d4 with …e5; just shore up with a3 and b3 while c2 stays solid. He grabs space with …c5-c4, so undermine it with b3 and aim your centre and the half-open f-file at f7.", sayShort: "Fantasy f3 — big centre, b3 hits c4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N105: SublineNarration = {
  intro: { say: "…e6 — after …Qb6 eyes b2, this reinforces d5 and frees his f8-bishop in a French structure. Cover b2 with a3, hold the centre, and meet …c5-c4 with b3 to lever c4 while g3 preps your fianchetto. His closing …e5 hits d4, but your d4-e4 centre with f3 and g3 behind it gives the more flexible, better-developed game.", sayShort: "e6 French setup — b3 and g3 expand" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N106: SublineNarration = {
  intro: { say: "…Bd7 — he's lining up the same Bb5 trade to unload his cramped light-squared bishop. Prep a3 and answer Bb5 with c4, striking d5 and the bishop at once; after Bxc4 you've handed back a pawn but won the bishop pair, half-open lines, and a clear lead in development. Hound that c4-bishop and pry the centre open while his queen idles on b6.", sayShort: "c4 break — bishop pair, lead" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N107: SublineNarration = {
  intro: { say: "…Nge7 — the knight heads for f5 or g6 to lean on d4 and e5 instead of blocking his c6-knight. Reply Na3, planning Nc2 to overprotect d4 while you keep b1 clear and eye b5 if he loosens the queenside. Keep the chain intact and stockpile defenders of d4 before you swing to expansion on the kingside.", sayShort: "Na3 reroute — overprotect d4" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N108: SublineNarration = {
  intro: { say: "…Nh6 — he's routing toward f5 to hit d4 and e3 without blocking his c6-knight. Don't grab on h6; develop Bd3 instead and let him burn a tempo while you build toward the kingside light squares. If the knight lands on f5 you can challenge it; meanwhile your e5 chain and the d3-bishop keep the long-term initiative on your side.", sayShort: "Nh6-f5 plan — Bd3 develops" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N109: SublineNarration = {
  intro: { say: "…Qb6 — closing with c4, he trades the central tension for a queenside bind and frees his knight to a5 toward b3 or c4. Your a3 already denied b4 to his pieces, and Nbd2 regroups the knight toward those light-square holes. With the centre locked, turn to the kingside and the standard f4-f5 lever, where your e5 pawn anchors the whole attack.", sayShort: "c4 locks — White eyes f5" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N110: SublineNarration = {
  intro: { say: "…Qb6 — it pressures d4 and b2, and his c4 thrust releases the tension to clamp the queenside and free Na5 toward b3 and c4. Your a3 took b4 from his knights, so reroute with Nbd2 toward b1-c3 or f1-e3, eyeing the holes he created. The chain's locked, so play on the wings: build your f4-f5 kingside break while his knight drifts to the rim on a5.", sayShort: "Locked chain — kingside break beckons" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N111: SublineNarration = {
  intro: { say: "…b6 — instead of the usual c5, he tries a queenside pawn rush with Qd7 and b5-b4 to undermine your c3-d4 chain from the flank. Meet the storm with a3 and b3, fixing the b4 pawn and keeping the queenside closed so his lunges run out of steam. His pieces are still on the back rank and your centre is solid, so you stand better and can later open the kingside where he's spent no time.", sayShort: "Flank rush stalled — centre holds" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N112: SublineNarration = {
  intro: { say: "…Bd7 — he completes the queenside, readying a rook lift or a later Rc8, but you've already seized space with a3 and b4. His cxd4 dissolves the tension, so recapture cxd4 and you've got a clean, mobile pawn on d4 backing the e5 spearhead. The b4 pawn cramps his minor pieces while you develop the bishop and roll on the kingside.", sayShort: "b4 space — mobile d4 centre" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N113: SublineNarration = {
  intro: { say: "…Bd7 — he tucks the bishop in behind the locked c4-d5 wall to free the back rank for castling and a rook on c8. The centre's fixed, so your plan is set: regroup the d2-knight, expand with the f4-f5 break, and use the e5 pawn as the cornerstone of a kingside initiative. His space deficit and the offside queen on b6 leave him reacting on the wrong wing.", sayShort: "Locked centre — f4-f5 plan stands" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N114: SublineNarration = {
  intro: { say: "…Bd7 — he swings the light-squared bishop toward b5 to trade off the piece his e5 chain otherwise buries behind e6. Hit it with c4, challenging d5 and the bishop at once; after Bxc4 you've given a pawn but ripped the centre open and gained the bishop pair plus a development lead. Round up the loose c4-bishop and use the open lines while his queen sits awkwardly on b6.", sayShort: "c4 break — bishop pair, open lines" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N115: SublineNarration = {
  intro: { say: "…Nc6 — this is the main-line Advance French battery against d4, with …c5, …Nc6, and …Bd7 readying …Qb6. His whole game targets your d4-pawn, defended only by c3 and the f3-knight. Expect …Qb6 hitting d4 and b2, then …Rc8 and …cxd4 or …Nh6-f5, piling on the base of the chain until your centre cracks — so shore it up.", sayShort: "Advance — battery on d4, …Qb6 next" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N116: SublineNarration = {
  intro: { say: "…Nh6 — the knight steers to f5 to hit d4 and e3, the classic French way to pressure the base of the chain. Answer a3 and b4, grabbing queenside space and daring him to release the centre; after cxd4 the structure clarifies and you recapture toward a mobile centre. Your b4 has cramped his queenside while the e5 spearhead keeps strangling the kingside.", sayShort: "b4 grabs space — Nh6 reroutes" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N117: SublineNarration = {
  intro: { say: "…a5 — he freezes the queenside to stop your b4 expansion before it can cramp him. Calmly develop Bd3, aiming it at the kingside light squares and h7 once e5 opens lines, and let him complete with Bd7. Settle into the maneuvering battle: your space and the e5 anchor underpin a slow buildup toward f4-f5.", sayShort: "a5 stops b4 — Bd3 eyes kingside" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N118: SublineNarration = {
  intro: { say: "…f6 — he hits the chain early and after Bd3 takes on e5, trying to dissolve your central spearhead before you're mobilized. Your bishop already rakes the b1-h7 diagonal from d3, and the recapture on e5 opens the position toward his exposed king and the loose e6 pawn. Your development lead and the open lines down the centre and toward h7 outweigh the temporary structural shift.", sayShort: "fxe5 opens — Bd3 hits h7" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N119: SublineNarration = {
  intro: { say: "…f6 — with the queenside locked by c4, he strikes the head of the chain, the thematic French break against your e5 pawn. Keep the centre solid and meet the lever on its own terms, recapturing or supporting e5 so the tension favours your better-developed side. Opening the f-file tends to help you here, with your pieces aimed at the kingside while his queen and a5-bound knight are far off.", sayShort: "f6 lever — White holds e5" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N120: SublineNarration = {
  intro: { say: "Bb5 — leap in with …Nd4, planting the knight on a dominant central outpost and gaining a tempo on the bishop. After Bc4, solidify with …e6 and …e5 to build a broad pawn front and lock that d4-knight in place. It cramps his whole position while you expand with …a6 and …a5 on the queenside.", sayShort: "…Nd4 outpost, …e5 builds the front" },
  sources: ['concept:pos-outpost', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N121: SublineNarration = {
  intro: { say: "Bb5 — meet the f4-Grand Prix with the energetic …Nd4, taking the central outpost and hitting the bishop. After Nf3, grab space with …c4 and even counterstrike with …g5 against his f4-pawn before his attack gets rolling. The d4-knight is a thorn in his camp while you take over the initiative on both flanks.", sayShort: "…Nd4, then …g5 counterstrikes f4" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N122: SublineNarration = {
  intro: { say: "Bc4 — White aims at f7 early, but your g7-bishop already counters on the long diagonal and …e6 will shut its view of f7. Finish the kingside fianchetto with …Bg7, then prepare …e6 and …Nge7 to control the key f5-square. Blunt the attacking bishop, strike in the centre, and turn to queenside expansion.", sayShort: "…Bg7 and …e6 defuse the attack" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N123: SublineNarration = {
  intro: { say: "Bc4 — the aggressive Grand Prix bishop, eyeing f7 and backing a future f5-break at your king. Neutralise it: prepare …e6 and …Nge7 to blunt the diagonal and control the f5-square the attack relies on. With your g7-bishop raking the long diagonal, answer the storm by hitting back in the centre and queenside with …d6, …a6 and …b5.", sayShort: "Blunt the c4-bishop with …e6" },
  sources: ['concept:att-kingside-storm', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N124: SublineNarration = {
  intro: { say: "Nf3 — with no f4-thrust, grab the centre directly with your …e5, Sveshnikov-style. Your e5-pawn controls d4 and f4, denying him the very squares the Grand Prix attack craves. Follow with …Be7 and quick development, intending …d6 and …Nf6 for a sound, space-gaining structure with no kingside attack to fear.", sayShort: "…e5 seizes the center" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N125: SublineNarration = {
  intro: { say: "Nge2 — keeps his options open but blocks his own f1-bishop and delays the kingside attack. Develop actively with your …Nf6, pressuring e4 and preparing …d5 or …g6 with a fianchetto. With his pieces tangled on the back rank, get your development in fast and contest the centre before any f4-storm can be organised.", sayShort: "…Nf6 hits e4, develop quickly" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N126: SublineNarration = {
  intro: { say: "a4 — White stops your …b5 but spends a tempo on the flank instead of developing or attacking. Ignore the wing gesture: develop with …d6 and …e6, keeping your g7-bishop strong on the long diagonal. Punish the slow play by hitting the centre with …e5 or …d5, since his delayed development leaves e4 under-defended.", sayShort: "Ignore a4, strike the center" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N127: SublineNarration = {
  intro: { say: "d3 — restrained: it supports e4 but cedes the quick f5-break and leaves him short of central space. Develop harmoniously with …d6 and …e6, keeping your g7-bishop active on the long diagonal. With the position semi-closed, expand on the queenside with …a6 and …b5 while his modest setup offers no kingside threats.", sayShort: "…d6, …e6, expand on the queenside" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N128: SublineNarration = {
  intro: { say: "g3 — White fianchettoes into a closed Sicilian rather than the sharp f4-attack, fighting for the long light diagonal. Mirror him with your …g6 and …Bg7, contesting that diagonal and the dark squares around d4. With both kings tucked behind fianchettoes, prepare …d6 and …e5, or …Rb8 and …b5, to expand where his pieces are least active.", sayShort: "Mirror the fianchetto, expand queenside" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N129: SublineNarration = {
  intro: { say: "g3 — combined with f4 it's slow, weakening the dark squares around his king and forfeiting the bite of the c4 or b5 bishop. Continue calmly with …d6 and …e6, keeping your g7-bishop's diagonal open and preparing central play. With his kingside light squares loosened, aim at the e4-pawn and the long diagonal where your bishop dominates.", sayShort: "Exploit the loosened dark squares" },
  sources: ['concept:pos-weak-squares', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N130: SublineNarration = {
  intro: { say: "Bb5 — the critical Grand Prix try, pinning your c6-knight and threatening to swap it off to soften your grip on e5 and d4. Welcome Bxc6: after …bxc6 the doubled c-pawns reinforce your centre and your g7-bishop grows into a monster on the long diagonal. The half-open b-file and bishop pair fully compensate, so stake your claim with …d6 and …e5.", sayShort: "Allow Bxc6 — bishop pair, long diagonal" },
  sources: ['concept:pos-bishop-pair', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Grand_Prix_Attack'],
};

const N131: SublineNarration = {
  intro: { say: "Bc4 — White eyes f7 in this King's Gambit, but you're set for the Hanstein: you've already propped your f4-pawn with …g5, so fianchetto …Bg7 to bear down on his centre and king. After he castles into the half-open f-file, develop calmly with …d6 and …Nc6, keeping your extra pawn and the powerful g7-bishop. With sound development and material in hand, you neutralise the attack and convert the gambit pawn.", sayShort: "Hanstein — …Bg7 holds the booty" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N132: SublineNarration = {
  intro: { say: "Bxd5 — White grabs the d5-pawn in this Kieseritzky line, but stay unbothered and push …f3, sending the passed pawn deep into his kingside. The f3-pawn cramps him, and the open lines from your …d5 break hand you active piece play against his uncastled king. You've given a pawn back but gained a dangerous initiative.", sayShort: "…f3 storms the exposed kingside" },
  sources: ['concept:pawn-passed', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N133: SublineNarration = {
  intro: { say: "Nc3 — White develops and tries to undermine your g5-pawn rather than the sharp h4-thrust. Support the chain, and meet g3 with …g4 to lock the kingside and kick the f3-knight off the defence of f4. You keep the extra f4-pawn and a cramping structure while he lacks the central presence to justify the gambit.", sayShort: "Hold f4, lock with …g4" },
  sources: ['concept:pawn-chain', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N134: SublineNarration = {
  intro: { say: "Ng5 — the Allgaier-style knight sac on g5 to chase your king, but keep cool with …d5 to open the centre for defence. After d4, play …h6 to question the knight, then …f3 to jam his kingside and blunt the attack. With an extra piece once the knight is dealt with, you weather the storm a clear pawn up.", sayShort: "…d5 and …h6 refute the Ng5 sac" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N135: SublineNarration = {
  intro: { say: "Nxg4 — White tries to win the g4-pawn back in the Kieseritzky, so hit the centre with …Nxe4, restoring material with a strongly centralised knight. After d3 dislodges it, surge the f-pawn with …f3 to cramp his kingside and fix the weaknesses around his king. Your active pieces and that f3-pawn leave him struggling to untangle.", sayShort: "…Nxe4 centralizes, …f3 cramps White" },
  sources: ['concept:pos-centralization', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N136: SublineNarration = {
  intro: { say: "d4 — this is the Kieseritzky: hold the f4-pawn with your …g5 and …g4 chain and kick the f3-knight to e5. After d4 and the retreat Nd3, snap the central e4-pawn with …Nxe4, winning a second pawn with the kingside chain intact. Pawns on f4 and g4 cramp him; defend the booty and trade into a winning endgame.", sayShort: "Kieseritzky — grab e4 with …Nxe4" },
  sources: ['concept:pawn-passed', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N137: SublineNarration = {
  intro: { say: "d4 — White offers the knight, so take it with …gxf3, accepting a second pawn since the attack can be parried. After Bxf4 and Qxf3, strike the centre with …d6 and …d5, returning a pawn to blunt the queen and open lines for development. You emerge with a sound structure and the initiative once the counterthrust neutralises his pieces.", sayShort: "Take on f3, then …d5 counters" },
  sources: ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N138: SublineNarration = {
  intro: { say: "Nf3 — after Bb3 retreats and your freeing …d5, this lets you push …d4, gaining space and kicking the c3-knight from the centre. Ram on with …d3 to wedge deep into his position, cramping the queenside and disrupting his development. Hold the extra f4-pawn while the queenside spearhead gives you a lasting space and structural edge.", sayShort: "…d4 and …d3 wedge cramps White" },
  sources: ['concept:pos-space', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N139: SublineNarration = {
  intro: { say: "Nf3 — White covers the kingside in the Bishop's Gambit, so break at once with …d5 to free the position and challenge the centre. After exd5, prepare to recapture with …c5, mobilising your whole army with the extra f4-pawn still in hand. You open lines for the pieces and keep the structural and material edge while he lags in development.", sayShort: "…d5 and …c5 free the position" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N140: SublineNarration = {
  intro: { say: "Qe2 — defends e4 but again exposes the queen on the e-file. Play your …d5, and after exd5+ slot in the zwischenzug …Ne4, blocking the check and planting a powerful knight in the centre with tempo. Then push …f3 to hit his queen and jam the kingside, keeping your initiative while he scrambles to coordinate.", sayShort: "…Ne4 blocks, …f3 hits the queen" },
  sources: ['concept:tac-zwischen', 'concept:pos-centralization', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N141: SublineNarration = {
  intro: { say: "Qf3 — defends e4 but parks the queen on an exposed square in front of his king. Hit back at once with …d5, and after exd5 free the position with the gambit …c5, preparing to recapture d5 with full development. You keep the f4-pawn and gain time on his loose queen while the open centre exposes his king.", sayShort: "…d5 hits the loose queen" },
  sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N142: SublineNarration = {
  intro: { say: "d3 — White bolsters e4 after your …d5 break, so march the f-pawn with …f3, splitting his kingside pawns. The runner reaches f2 with check, lodging right beside his king on e1 and tying down his defence. With the centre opened by …d5 and a dangerous passed pawn deep in his camp, you hold a clear structural and material edge.", sayShort: "…f3-f2+ jams the white king" },
  sources: ['concept:pawn-passed', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N143: SublineNarration = {
  intro: { say: "d3 — White develops modestly in the Bishop's Gambit, but slow play hands you the centre. …d5 is the thematic counterstrike, hitting the c4-bishop and the e4-pawn together; after exd5 the position cracks open with your development lead and the extra f4-pawn still firmly in hand.", sayShort: "d3 — …d5 strikes the centre." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N144: SublineNarration = {
  intro: { say: "d4 — after your …d5 break, White grabs the centre, but ignore it and push …f3 to split his kingside pawns. The runner reaches f2 with check, sitting beside his king on e1 and disrupting his coordination. With the centre already challenged and a dangerous passed pawn deep in his position, you hold the structural and material edge.", sayShort: "…f3-f2+ splits White's kingside" },
  sources: ['concept:pawn-passed', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N145: SublineNarration = {
  intro: { say: "…Bb4 — prepare the freeing …d5 with …c6 and develop your knight to f6 to hit e4. When White grabs the centre with d4, pin the c3-knight with …Bb4, undermining the defender of e4 and piling onto the centre. With the f4-pawn still in pocket and active development, you keep the material edge and a comfortable, well-coordinated position.", sayShort: "…Bb4 pins, prepares the …d5 break" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N146: SublineNarration = {
  intro: { say: "…d5 — grab on f4 and counterstrike the centre, the classical refutation that opens lines before he's ready. After e5 hits your f6-knight, march the passed f-pawn with …f3, splitting his kingside and reaching f2 with check, a thorn next to his king. The extra pawn and your active pieces give you a healthy plus while his king sits exposed on e1.", sayShort: "…d5 break, the f-pawn runs to f2" },
  sources: ['concept:pos-center', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/King%27s_Gambit'],
};

const N147: SublineNarration = {
  intro: { say: "…Bb7 — your 150 setup is humming: pawns on e4 and d4, bishop on e3 and queen on d2 lined up for Bh6 to swap his g7-bishop and bare the dark squares around his king. He grabs queenside space with a6, b5 and Bb7, but your a3 blunts b4 and your kingside plan stays primed. Castle long, then push h4-h5 to crack open g6 while the h6 trade strips his king's best defender.", sayShort: "150 Attack — Bh6 then h4-h5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N148: SublineNarration = {
  intro: { say: "…Nd7 — with a6 and b5 already gaining queenside space, he bolsters the centre and preps c5. Your a3 keeps b4 in check while the Be3-Qd2 battery stays trained on h6, the heart of the 150 plan. Castle long and push h4-h5; trading the dark-squared bishop on h6 and prising open g6 hands you the attack before his queenside push gets going.", sayShort: "Nd7 holds — White preps h4-h5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N149: SublineNarration = {
  intro: { say: "…Nd7 — his early knight keeps things flexible, eyeing e5 or c5 and leaving the c-pawn free, but it does little to contest your centre. You've got the e4-d4 pawns and the bishop on e3 with Qd2 to follow, the foundation of the 150 Attack. Go direct: complete with Qd2 and castle long, then trade his g7-bishop with Bh6 and storm the kingside with the h-pawn.", sayShort: "Nd7 passive — White builds 150 attack" },
  sources: ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N150: SublineNarration = {
  intro: { say: "…Nd7 — he holds the knight back, keeping c5 or e5 in reserve and supporting a queenside expansion with a6 already in. Your full 150 structure is in place: e4 and d4 in the centre, bishop on e3 and queen on d2 ready for Bh6 to trade his key g7-bishop. Complete with long castling, then advance the h-pawn — the dark squares around his king are your target.", sayShort: "150 setup — Bh6 swap looms" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N151: SublineNarration = {
  intro: { say: "…Nf6 — he challenges e4 and steers toward Pirc-flavoured play, hitting your central pawn directly. Your Be3 and the looming Qd2 form the 150 battery; just be ready to meet a later Ng4 by guarding e3, then castle long and aim Bh6 at his fianchetto. The pawns on e4 and d4 give you the central space that makes the kingside pawn storm so potent.", sayShort: "Nf6 hits e4 — 150 plan ready" },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N152: SublineNarration = {
  intro: { say: "…a6 — against his flank advance of a6, b5 and b4, switch to a broad pawn front with f4, building a big e4-d4-f4 centre and grabbing space everywhere. His pawn lands on b3, but your a3 and the g3 fianchetto plan keep your king safe and leave that b3-pawn weak and cut off. With your centre rolling and his pawns spent on the rim, you hold a clear spatial bind and the better long-term chances.", sayShort: "Big f4 centre — flank pawns spent" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N153: SublineNarration = {
  intro: { say: "…c5 — he strikes the centre; after dxc5 his queen chases the pawn back via a5, and you use the tempo to leap the knight into d5. That outpost on d5, unchallengeable by a pawn, gives you a dominating central piece while his queen on c5 and knight on a6 sit awkwardly. Keep the initiative, developing with gain of time around the entrenched d5-knight.", sayShort: "Nd5 outpost — Black pieces awkward" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N154: SublineNarration = {
  intro: { say: "…c6 — he goes for the central counter with d5 and the e-pawn knifes to e2, but it's overextended and well controlled. Your quiet a3, b3 and h3 have shored up both flanks and made luft, so that e2-pawn sits blockaded with nowhere to go and you'll collect it at leisure. You enjoy more space and a sounder structure — his deep pawn is a target, not a trump.", sayShort: "e2 overextended — blockade and win it" },
  sources: ['concept:pawn-passed', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N155: SublineNarration = {
  intro: { say: "…c6 — he mixes the queenside pawn storm with a central thrust, but after a3 and b3 his b4 pawn is fixed and now c5 strikes at d4. Hold the centre with the d4 pawn supported, or meet c5 by keeping tension while your Be3-Qd2 battery still points at h6. The queenside locks up and your plan to castle long and storm with h4-h5 stays the most dangerous idea on the board.", sayShort: "c5 hits d4 — kingside plan intact" },
  sources: ['concept:pos-center', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N156: SublineNarration = {
  intro: { say: "…d5 — his early push invites a Scandinavian-like structure; take on d5 and, when his knight recaptures and routes via f6, hold the extra central pawn with Bc4 defending it and eyeing f7. The bishop on c4 and the protected d5-pawn give you a comfortable space edge and easy development, while he must spend time regaining the pawn. Your development lead and central grip set the agenda.", sayShort: "Bc4 holds d5 — space and lead" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N157: SublineNarration = {
  intro: { say: "…Nd7 — he props the centre with c6 and b5, then brings the knight back to support a c5 or e5 break. Your a3 restrains b4 and the e3-bishop with the d2-queen behind it is poised for Bh6 to remove his g7-bishop guarding the dark squares. Follow the standard plan: castle long and march the h-pawn, since with him committed on the queenside the kingside is where you strike.", sayShort: "150 battery — long castle, h-pawn rolls" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N158: SublineNarration = {
  intro: { say: "…Nf6 — he grabs queenside space with c6 and b5, then develops to pressure e4 and join the defence. Your a3 holds back b4, and with the bishop on e3 and queen on d2 the Bh6 trade is in the air to weaken the dark squares around his king. Castle long and advance the h-pawn — the g6-f6-Bg7 shell is exactly what your h4-h5 storm aims to crack.", sayShort: "Nf6 develops — h-pawn storm awaits" },
  sources: ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N159: SublineNarration = {
  intro: { say: "…a5 — he props the queenside with c6 and b5, then rolls a5 and a4 to lever open lines toward your long-castled king. Answer the storm with a3 and b3, fixing the pawns so his a4 push grinds against a solid wall rather than breaking through. Your e4-d4 centre and the Be3-Qd2 battery aimed at h6 stay untouched, so stay on plan: castle long and storm the kingside with the h-pawn.", sayShort: "a4 levers — b3 holds the wall" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N160: SublineNarration = {
  intro: { say: "…a6 — he supports b5 and then breaks with b4, trying to lever open the queenside against your king. Meet the lunge head-on with a3 and b3, and after b4 either recapture axb4 or let the fixed structure keep his pawns from breaking through. Meanwhile your e4-d4 centre stands firm and the Be3-Qd2 battery stays aimed at h6 for the kingside attack you're building.", sayShort: "b4 lever met — centre and battery hold" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N161: SublineNarration = {
  intro: { say: "…a6 — he pushes b4 and a5 to pry at your queenside, but your a3 met b4 and b3 has bricked up the structure so his pawns jam against a fixed wall. Your e4-d4 centre and the Be3-Qd2 battery stay untouched, free to swing into the Bh6 kingside plan and a pawn storm. With the queenside locked and his king still in the centre, castle long and roll the h-pawn.", sayShort: "Queenside jammed — kingside storm next" },
  sources: ['concept:pos-space', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Modern_Defense'],
};

const N162: SublineNarration = {
  intro: { say: "…c5 — the principled Austrian counter, hitting d4 before you can roll forward. Answer with the energetic d5, gaining space and locking the centre, or Bb5+ to disrupt his development; either way your e4-f4 pawns and the f3-knight keep the kingside ambitions alive. It all turns on whether your central pawns become a steamroller or his c5 break loosens them — so push to make them roll.", sayShort: "c5 hits centre — d5 or Bb5+" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N163: SublineNarration = {
  intro: { say: "O-O — he castles into your Austrian Attack, the sharpest weapon against the Pirc, where you've built a broad e4-d4-f4 front with knights on c3 and f3 backing an eventual e5. Develop the bishop to d3 or e2, castle, and prepare the e5 break or a kingside push that exploits the space behind your f4 pawn. The big centre is your engine — mobilize it before he hits back with c5 or e5.", sayShort: "Austrian Attack — big centre rolls" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N164: SublineNarration = {
  intro: { say: "…Bf5 — he gets the light-squared bishop active outside the chain before …c6. You have the ideal d4-pawn centre with Nf3 and Nc3 out, so hit the bishop with Ne5 or expand with Bd2 and O-O-O. His early queen sortie to a5 cost time — you are ahead in development with the freer game.", sayShort: "Bf5 active — Ne5 or O-O-O presses" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N165: SublineNarration = {
  intro: { say: "…Bg4 — after …c6 makes luft for his queen, he pins your f3-knight to pressure d4. Your Bc4 already eyes f7 and the d4-pawn centre stays firm, so play h3 to question the bishop and keep the bind. His early …Qa5 cost time — your two developed bishops and central space hold the more active position.", sayShort: "c6 and Bg4 pin — Bc4 eyes f7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N166: SublineNarration = {
  intro: { say: "…Bg4 — he pins your f3-knight to ease the pressure on d4 and develop with tempo. Meet it with Be2 or h3, keep your d4-pawn centre, and break the pin as you finish developing. His …Qa5 plus …Bg4 plan is active, but the free tempi from chasing that queen leave you the better game.", sayShort: "Bg4 pins Nf3 — h3 breaks, centre holds" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N167: SublineNarration = {
  intro: { say: "…Nc6 — he adds pressure on d4, but this blocks his c-pawn so the a5-queen has no …c6 retreat and can be harassed. Hold the centre with d4, develop Bd2 and prepare O-O-O, and chase the exposed queen with b4 ideas. Your lead in development and the secure d4-pawn give the freer, more aggressive game.", sayShort: "Nc6 blocks c-pawn — queen stays exposed" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N168: SublineNarration = {
  intro: { say: "…Qd6 — in this main line choose the restrained g3 setup, planning Bg2 and a fianchetto over the sharp Bc4 systems. He answers …Bg4, pinning your f3-knight to the queen before your bishop reaches g2, then follows with …Nc6 and …e6 or …e5 to make d4 a target. Note his …a6 already rules out any Nb5 hop at the queen.", sayShort: "g3 fianchetto — …Bg4 pins f3" },
  sources: ['concept:tac-pin', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N169: SublineNarration = {
  intro: { say: "…Qd8 — after this passive retreat he develops …Bg4 to pin your f3-knight and contest d4. Hold your d4-centre, break the pin with Be2 or h3, and stay well ahead in development thanks to the tempi spent chasing the queen. Your compact d4-Nc3-Nf3 setup commands the centre while his queen sits idle at home.", sayShort: "Qd8 then Bg4 — break pin, lead develops" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N170: SublineNarration = {
  intro: { say: "…c6 — he gives the a5-queen a retreat on c7 and shores up d5. Build the centre with d4, develop Nf3 and Bc4 to bear down on f7, and ready Bd2 and O-O-O. He catches up with …Nf6 and …Bf5, but your lead in development and that active c4-bishop keep the initiative.", sayShort: "c6 frees queen — Bc4 hits f7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N171: SublineNarration = {
  intro: { say: "…Bg4 — with the queen on d6 he pins your f3-knight to pressure d4. Meet it with Be2 or h3, keep your broad d4-centre, and stay ahead in development from the early queen chase. Your compact d4-Nc3-Nf3 structure commands the centre as you prepare to castle and untangle the pin.", sayShort: "Bg4 pins Nf3 — h3 breaks, centre holds" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N172: SublineNarration = {
  intro: { say: "…Qa5 — the classical retreat after Nc3 hits the d5-queen with tempo, eyeing your c3-knight along the a5-e1 diagonal. Build the ideal centre with d4, develop Nf3 and Bc4 aiming at f7, and bank the free moves from chasing the queen. After …c6 and …Bf5, ready Bd2 and O-O-O with a lead in development and the more active pieces.", sayShort: "Main line — d4 centre, Bc4 eyes f7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N173: SublineNarration = {
  intro: { say: "…b5 — he expands with …a6 and …b5 to fianchetto his queen's bishop on b7 against your g2-bishop. Your d4-centre and long-diagonal g2-bishop fight for the light squares, and …b5 loosens c6 and c5. After Bb7, finish with O-O and pressure the queenside, holding the more active position and central space.", sayShort: "b5 expands — g2 bishop fights long diagonal" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N174: SublineNarration = {
  intro: { say: "…c6 — after …Qd6 he plays solidly then pins your f3-knight with …Bg4. Bolster d4 with Be3 and prepare Qd2 and O-O-O, keeping your broad centre and the more harmonious setup. His early queen moves cost tempi — your central pawns and quick queenside castling promise a lasting initiative.", sayShort: "c6 and Bg4 pin — Be3 braces d4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N175: SublineNarration = {
  intro: { say: "…c6 — with …Qd6 he sets a solid but passive shell, so plant Ne5 on a powerful central outpost eyeing f7 and d7. After …Nbd7 challenges it, recapture or reinforce while holding your d4-centre and the bind. Your strong e5-knight, central pawns, and lead in development give a lasting initiative against his cramped setup.", sayShort: "Ne5 outpost — central bind, f7 pressure" },
  sources: ['concept:pos-outpost', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N176: SublineNarration = {
  intro: { say: "…g6 — he combines …a6 with a double fianchetto, playing …g6 and …Bg7 against your g2-bishop. Let your d4-centre and g2-bishop battle for the long light diagonal and d5 as both kings head to safety. After Bg7, complete with O-O and hold your central space and the more purposeful setup while his …Qd6 and slow development lag.", sayShort: "Double fianchetto — g2 bishop, d4 centre" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N177: SublineNarration = {
  intro: { say: "…g6 — with the queen on d6 he fianchettos but then lunges …g5-g4 to harass your f3-knight, loosening his own kingside. Keep your d4-centre solid, brace the queenside with a3 and b3, and retreat the knight to e5 or d2 with tempo. His advancing g-pawns leave f5 and h5 weak, and your compact centre dominates his airy king.", sayShort: "g4 chases knight — kingside left weak" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N178: SublineNarration = {
  intro: { say: "…Bf5 — after the passive …Qd8 retreat he develops the bishop outside the chain. You hold the ideal d4-centre with Nc3 and Nf3 out, so hit the bishop with Ne5 or expand with Bd2 and O-O-O. The tempi gained chasing the queen leave you ahead in development with the more active, spacious position.", sayShort: "Bf5 develops — Ne5 or O-O-O presses" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N179: SublineNarration = {
  intro: { say: "…a6 — after the passive …Qd8 he drifts with …a6-a5-a4 on the edge instead of developing. Build your d4-centre, develop smoothly with Bc4 and Bd2, and meet …a4 with b3 to keep the queenside closed. His time-wasting flank pawns leave him badly behind while your development and central control dominate.", sayShort: "a-pawn drift — White develops and dominates" },
  sources: ['concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N180: SublineNarration = {
  intro: { say: "…c6 — after the passive …Qd8 he tries to free up with …c5 against d4, backed by …a6 and …b5. Develop Bc4 to eye f7, prop the queenside with a3 and b3, and answer …c5 by keeping the centre fluid. Your lead in development and the active light-squared bishop outweigh his loosening queenside pushes.", sayShort: "c5 break — Bc4 and centre stay strong" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N181: SublineNarration = {
  intro: { say: "…c6 — after the passive …Qd8 retreat, Black builds a small but solid shell. Seize the centre with your d4, develop Nf3 and Bc4 to target f7, and cash in the lead in development your early queen-chase earned. Meet …Bf5 with O-O and central play, dominating the space against his cramped setup.", sayShort: "Qd8 passive — Bc4 and centre dominate" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N182: SublineNarration = {
  intro: { say: "…e6 — after …Qd8 he tries …e5 then …e4 to chase your f3-knight. Your d4-pawn centre is solid, so brace the queenside with a3 and b3 and let that overextended e4-pawn fall to Nd2 or Ng1 and recapture. Your lead in development and his loose e-pawn leave you the better structure and initiative.", sayShort: "e5-e4 overreach — knight steps, pawn falls" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N183: SublineNarration = {
  intro: { say: "…g6 — after …Qd8 he fianchettos …Bg7 but lashes out with …g5-g4 to chase your f3-knight, fatally weakening his king. Hold your d4-centre, play a3 and b3 for queenside calm, and step the knight to e5 or d2 while f5 and h5 become permanent holes. Your solid centre against his shredded kingside is a clear structural advantage.", sayShort: "g5-g4 wrecks kingside — centre punishes" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N184: SublineNarration = {
  intro: { say: "…g6 — he retreats all the way to …Qd8 and fianchettos, then over-presses with …g5-g4 to chase your f3-knight. Hold the centre with d4, play a3 and b3 for queenside solidity, and step the knight to e5 or d2 as his kingside collapses with holes on f5 and h5. Your intact centre against his wrecked pawns hands you a clear edge.", sayShort: "g5-g4 overreaches — knight hops, holes appear" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N185: SublineNarration = {
  intro: { say: "Nf6 — Black attacks your e4-pawn, inviting you to clarify with Bxc6 or defend with Nc3 or Qe2. The most testing try is Bxc6, doubling his pawns and meeting …dxc6 with a structural game against those weakened c-pawns. Trade into a position where his doubled pawns and lack of a clear break give you a stable, risk-free edge.", sayShort: "Bxc6 doubles, defend e4 cleanly" },
  sources: ['concept:pawn-doubled', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N186: SublineNarration = {
  intro: { say: "d6 — Black supports a future …e5 in a solid Sicilian structure, so castle and keep your Bb5 aimed at the c6-knight. Play Bxc6 then bxc6 to fix doubled pawns, or keep tension with Re1 and c3 preparing d4. Aim for a comfortable positional game where your pressure on c6 and the half-open lines outweigh his bishop pair.", sayShort: "Castle, eye Bxc6 on the c6-knight" },
  sources: ['concept:pawn-doubled', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N187: SublineNarration = {
  intro: { say: "…e5 — Black grabs central space, but it leaves the d5-square permanently weak and the d6-pawn potentially backward. Castle and exploit that d5-hole: reroute your knight there and lean on the soft d6-point. Trade on c6 if it helps, then plant a piece on the d5 outpost, turning his space grab into a chronic liability for you to target.", sayShort: "Castle, exploit the d5-hole" },
  sources: ['concept:pos-outpost', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N188: SublineNarration = {
  intro: { say: "e6 — against this flexible setup, castle and keep your Bb5 pressure on the c6-knight, preparing Re1 and the c3 with d4 break. Bxc6 would hand him the bishop pair here, so often retreat the bishop and play for a small but lasting space edge with d4. Open the centre on good terms and use your development lead against his slightly cramped pieces.", sayShort: "Castle, prepare the c3 and d4 break" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Rossolimo_Variation'],
};

const N189: SublineNarration = {
  intro: { say: "g6 — you've sidestepped the Open Sicilian with the Rossolimo, threatening Bxc6 to damage his structure. Black fianchettoes with …g6, preparing …Bg7 to bear down the long diagonal on e5 and the centre. After short castling he follows with …Bg7 and …e5 or …Nf6, content that the bishop pair you might win is offset by his solid dark-square grip and ready central counterplay.", sayShort: "Rossolimo — fianchetto and hold the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N190: SublineNarration = {
  intro: { say: "…Bb7 — you've kept the gambit pawn, grabbed queenside space with …a6 and …b5 to push the c4-bishop back to b3, and now plant the bishop on b7. From there it rakes the long diagonal at e4 and g2, the ideal anti-Morra post. With the extra pawn, a solid e6-shell, and this strong fianchetto, trade into a position where your material edge tells.", sayShort: "…Bb7 rakes the long diagonal, pawn up" },
  sources: ['concept:pawn-fianchetto', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N191: SublineNarration = {
  intro: { say: "…e6 — hold the gambit pawn and meet the c4-bishop with …e6 and …a6, preparing …b5 to chase it and seize queenside space. Develop the knight to e7 and on to g6 rather than f6, sidestepping any Bg5 pin, then blunt the c4-bishop's aim at f7. A solid shell behind the e6-pawn plus your extra pawn means White must prove the initiative is worth the material — it usually isn't.", sayShort: "…e6, …a6, …b5 — blunt the bishop" },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N192: SublineNarration = {
  intro: { say: "…e5 — White developed quietly with Be2 instead of the aggressive c4-bishop, so seize the centre and claim the d4-square with a broad pawn front while a pawn up. With no bishop eyeing f7 there's no pressure to parry, so …a6 prepares …b5 and easy development with …Nf6, …Be7 and castling. Solid, simple, and a pawn ahead — your central pawns and material edge do the work.", sayShort: "…e5 grabs the center, pawn up" },
  sources: ['concept:pos-center', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N193: SublineNarration = {
  intro: { say: "…Ng6 — you've held the gambit pawn with the …e6, …a6, …Nge7 system, and White's bishop has come to e3 watching the queenside dark squares. Answer with …Ng6 to free the f8-bishop and press White's grip, then castle behind your solid pawn shell. The recipe stays constant: develop without weaknesses, neutralise the c4-bishop with …b5, and convert your extra pawn once the initiative runs dry.", sayShort: "…Ng6 — develop, keep the pawn" },
  sources: ['concept:pos-development', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N194: SublineNarration = {
  intro: { say: "Nf3 — White declines the gambit, recapturing on d4 with the knight, so this is simply an Open Sicilian and you hand no pawn back. With …d6, …Nf6 and …a6 set up a Najdorf, and …e5 hits the d4-knight, driving it to b3 and gaining the d5-square as an outpost. Bring the bishop to e6 to fight for d5, and take the familiar Sicilian counterplay on both wings with a fully sound game.", sayShort: "Morra declined — Najdorf-style …e5, …Be6" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N195: SublineNarration = {
  intro: { say: "Nf3 — White delays the recapture before Nxc3, but you keep the gambit pawn and develop normally with …Nc6, …e6 and …a6. Steer your knight to e7 and g6 rather than f6, sidestepping any Bg5 pin, and your …b5 chases the c4-bishop off the f7-diagonal. Hold the material, build a shell with no weaknesses, and let White try to prove his initiative is worth a pawn — it usually falls short.", sayShort: "…e6, …a6 — hold the pawn, no weaknesses" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N196: SublineNarration = {
  intro: { say: "…b5 — White lifts the queen to e2 to support e4 and ready rooks for the central files, so strike at once, kicking the c4-bishop and grabbing queenside space while a pawn up. The bishop must retreat, and …Bb7 follows to rake the long diagonal at e4 and g2. Your method holds firm: blunt the c4-bishop, finish development behind the e6-pawn, and ride the extra pawn into the better game.", sayShort: "…b5 hits the bishop, pawn up" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N197: SublineNarration = {
  intro: { say: "…Ng6 — you're a clean pawn up in the model shell of …e6, …a6 and the knight on e7, and White lifts the queen to e2 to back e4 and connect the rooks. Answer with …Ng6 to free the f8-bishop and challenge White's setup, then …b5 to drive the c4-bishop off the f7-diagonal. Hold the extra pawn, complete development without weaknesses, and let White's missing breakthrough turn the material into the win.", sayShort: "…Ng6 then …b5 — keep the pawn" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N198: SublineNarration = {
  intro: { say: "Qxd4 — White declines by recapturing with the queen, so you lose no material and gain a tempo hitting the queen with …Nc6. After Qd3 expand on the queenside with …a6, …a5 and …a4, prying at White's b3-pawn, then fianchetto with …b6 to put the bishop on b7. Play sound Sicilian chess with a free tempo banked: aim the b7-bishop at e4 and use the queenside space against White's loosened pawns.", sayShort: "Qxd4 declined — …a4 and …b6 pry queenside" },
  sources: ['concept:pos-tempo', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N199: SublineNarration = {
  intro: { say: "a4 — White stops your …b5 freeing break before it comes, but the move costs time and leaves the b4-square weak. Continue the antidote with …Nge7, heading for g6, keeping the extra pawn and a flexible structure. The b4-hole and White's spent tempo favour you: develop calmly, eye a knight to b4 or a …d5 break, and let the material edge plus the lack of a White breakthrough decide.", sayShort: "a4 weakens b4 — …Nge7 stays solid" },
  sources: ['concept:pos-weak-squares', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N200: SublineNarration = {
  intro: { say: "Bg5 — you've taken the gambit pawn with …dxc3 and built the model antidote of …e6, …a6 and the knight to e7, holding the pawn and a sound structure. White swings the bishop to g5 to provoke a weakness, but with your knight on e7 rather than f6 there's nothing to pin — it bites on granite. Play …Ng6 to hit the g5-bishop and free the f8-bishop, then …b5 to chase the c4-bishop off the f7-diagonal, holding the pawn while White's initiative thins.", sayShort: "Keep the pawn — …Ng6 answers Bg5" },
  sources: ['concept:pos-king-safety', 'concept:pawn-majority', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N201: SublineNarration = {
  intro: { say: "Bc4 — White swings the bishop at f7 and the a2-g8 diagonal, but stay unbothered: your light bishop is safely tucked on h7 and your knight sits on d7. Play …e6 to blunt the c4-bishop, then …Ngf6, …Bd6 and castle. You're neutralising that bishop and steering into the familiar rock-solid Caro middlegame.", sayShort: "Classical — meet Bc4 with …e6" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N202: SublineNarration = {
  intro: { say: "Bc4 — White sacrifices a pawn with Bc4 and f3 to rip lines open, but grab the material and shove your passed pawn deep to e2, hitting the f1-square. With …b5 already gaining queenside space you're materially ahead and structurally fine. Be ready to hand back some of it to finish developing and castle, holding the extra pawn while White's compensation runs dry.", sayShort: "Gambit line — …e2 passer, extra pawn" },
  sources: ['concept:pawn-passed', 'concept:tac-sacrifice'],
};

const N203: SublineNarration = {
  intro: { say: "Kb1 — White tucks the king to b1 and prepares to throw the queenside pawns at you. Lean on your textbook structure: bishop already traded via h7, knights on d7 and f6, bishop to e7, then castle short into the storm. Hit the centre with …c5, absorb White's kingside space behind your solid wall, and counterattack on the other wing.", sayShort: "Classical main — castle into the storm" },
  sources: ['concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N204: SublineNarration = {
  intro: { say: "Nd2 — White reaches the Classical via this move order, but you get the same main-line structure: develop the light bishop to f5 and g6, then secure it with …h6. Send the knights to d7 and f6, and when White plays Bd3, trade the light bishop off. Finish developing, castle, and break with …c5 — a reliable, well-mapped road with none of the French's headaches.", sayShort: "Classical via Nd2 — standard setup" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N205: SublineNarration = {
  intro: { say: "Ne5 — White posts the knight on the e5 outpost, propped by the d4-pawn. You're fully prepared: the light bishop is already traded, your knights and bishop are out, so meet it with …Nxe5 or just …O-O and keep everything solid. Castle short, brace for White's pawn storm behind your rock-solid Caro wall, and break with …c5 to counter near White's king.", sayShort: "Classical — e5 outpost, castle short" },
  sources: ['concept:pos-outpost', 'concept:pos-king-safety'],
};

const N206: SublineNarration = {
  intro: { say: "O-O — White skips the pawn storm and tucks the king short on g1 for a quieter game. Lean on your textbook setup: light bishop traded via h7, knights on d7 and f6, pawn on e6. Complete with …Bd6 or …Be7 and …O-O. With kings on the same wing it's a manoeuvring fight, and your solid structure plus the …c5 break keep you comfortable.", sayShort: "Classical — short castle, quiet game" },
  sources: ['concept:pos-king-safety', 'concept:pos-development'],
};

const N207: SublineNarration = {
  intro: { say: "c4 — White grabs central space instead of castling, building a broad pawn front. Trust your solid structure: light bishop traded via h7, knights on d7 and f6, pawn on e6. Develop with …Bd6 or …Bb4, castle, then strike with …c5. Your well-coordinated Caro setup neutralises that extra space, so hit the centre and don't let it intimidate you.", sayShort: "Classical — meet c4 with …c5 break" },
  sources: ['concept:pos-center', 'concept:pos-development'],
};

const N208: SublineNarration = {
  intro: { say: "e5 — this is the whole point of the defence: your light bishop reached f5 before …e6 ever locked it in, so you have none of the French's bad-bishop misery. With the d4-e5 chain set, route your knight to d7 heading for f8 or b6, then strike with the freeing …c5 at the base of White's chain. Your bishop on f5 and pawn on e6 give you a solid, harmonious setup.", sayShort: "Advance — good bishop on f5" },
  sources: ['concept:pawn-chain', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N209: SublineNarration = {
  intro: { say: "exd5 — you've reached the Panov-Botvinnik tabiya, so pin the c3-knight with …Bb4 and pile pressure on the centre. White's c4 set up an isolated-queen's-pawn fight: pin and pressure c3, recapture on d5 when White trades, and blockade the d4-pawn with a knight on c6. Your b4-bishop fights for the central dark squares and stops White getting a free hand.", sayShort: "Panov — …Bb4 pins and pressures" },
  sources: ['concept:tac-pin', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N210: SublineNarration = {
  intro: { say: "Bg5 — White develops the bishop, so answer with the full queenside rush: …c5 against d4, …c4 to clamp, then …c3 to wedge into White's camp. That c3-pawn cramps White and fixes the queenside while your good bishop stays active on f5 outside the chain. Play for the queenside space and the long-term squeeze — the Caro hands you the freer game with no bad bishop.", sayShort: "Advance — …c3 deep queenside wedge" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N211: SublineNarration = {
  intro: { say: "g4 — White lunges to harass your f5-bishop and rolls h4-h5 for kingside space, so answer …h5 to freeze the pawns and keep your bishop. Retreat it safely to g6; you've already hit d4 with …c5, so those kingside pawns are blunted before they roll. Your structure stays sound, the good bishop survives, and …c5 gives you clear counterplay against White's overextended kingside.", sayShort: "Advance — …h5 stops the g4-h4 storm" },
  sources: ['concept:att-kingside-storm', 'concept:pos-space'],
};

const N212: SublineNarration = {
  intro: { say: "Nc3 — White develops the knight, questioning your grip on d5 and eyeing b5 and e4. Keep developing with …Nd7, preparing …c5 and …Ne7 or …Nb6 to reinforce the centre. Your pride is the good bishop on f5, sitting outside the pawn chain — you're playing a French-type position without the bad bishop, so aim the …c5 break at d4.", sayShort: "Advance — develop, prepare …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N213: SublineNarration = {
  intro: { say: "a3 — White spends a quiet waiting move to take b4 away before developing Be2. Develop calmly with …Nd7 heading for f8 or b6, then prep the thematic …c5 against the base of the d4-e5 chain. Your good bishop on f5 sits outside the chain as your pride: play …c5, …Qb6 and …Nc6, fighting for d4 from the Caro's healthy, no-bad-bishop structure.", sayShort: "Advance — develop, ready …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N214: SublineNarration = {
  intro: { say: "c3 — you've already hit d4 with …c5, and White props the centre up with c3. With your good bishop on f5, knight on d7, and pawns on c5 and e6, keep pressing d4: pile on with …Qb6, …Nc6, or open lines with …cxd4. The whole point of the early …Bf5 pays off here — you've got a French-style position without the bad bishop, fighting for the centre from a healthy base.", sayShort: "Advance — …c5 hits d4's base" },
  sources: ['concept:pawn-chain', 'concept:pos-center'],
};

const N215: SublineNarration = {
  intro: { say: "c3 — White buttresses the d4-e5 chain and develops modestly with Be2. You've got the ideal Caro setup: good bishop on f5 outside the chain, knight on d7 heading for f8 or b6, …c5 break ready against d4. Play …c5, …Qb6 and …Nc6 to pressure d4 from a healthy structure where, unlike the French, your light-squared bishop is already a happy, active piece.", sayShort: "Advance — solid setup, prepare …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-development'],
};

const N216: SublineNarration = {
  intro: { say: "c4 — White expands in the centre to challenge d5, so reroute your knight flexibly to e7 to support the centre and head for g6 or f5. Your good bishop already stands on f5 outside the chain; keep d5 defended while you prep the …c5 break or …Nbc6. Meet White's central ambition with sound development and contest d4 and e5 from the Caro's trademark healthy structure.", sayShort: "Advance — …Ne7 holds d5" },
  sources: ['concept:pos-center', 'concept:pos-development'],
};

const N217: SublineNarration = {
  intro: { say: "h3 — White grabs g4, so launch the full queenside plan: …c5 against d4, …c4 to clamp, …c3 to wedge deep into White's camp. That c3-pawn cramps White and fixes the queenside while your good bishop stays active on f5 outside the chain. Play for the queenside space and the long-term restraint of White's pieces — the Caro structure pays off with no bad bishop to babysit.", sayShort: "Advance — …c3 wedges the queenside" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N218: SublineNarration = {
  intro: { say: "h4 — White grabs kingside space, so meet h4-h5 with …h5 to freeze the pawns, then let the bishops trade on d3. You've already played …c5 against d4; now push …c4, gaining queenside space and a clamp while fixing White's queenside pawns. With your good bishop swapped on your own terms, you have a healthy structure and a clear plan: …Qb6, …Nc6 and a minority-style queenside expansion.", sayShort: "Advance — …c4 clamps the queenside" },
  sources: ['concept:pos-space', 'concept:pawn-chain'],
};

const N219: SublineNarration = {
  intro: { say: "…d4 — you've traded the light bishop for the f3-knight, handing White the bishop pair but in a closed, solid position. With White's queen on f3 and bishop tucked to e2, slam the door with …d4: it grabs space and shuts the knight out of d5 and c4. That d4-pawn cramps White and hands you a clear queenside and central plan, neutralising the bishops in a blocked structure.", sayShort: "Two Knights — …d4 cramps White" },
  sources: ['concept:pos-space', 'concept:pos-bishop-pair'],
};

const N220: SublineNarration = {
  intro: { say: "…c5 — White supports d4 with Be3, so strike with …c5 to fight for the centre. You've traded the light bishop for the f3-knight, so open the position on your own terms: …c5 challenges d4 and frees your game. This dynamic break gives you active pieces and a sound structure, and keeping the position fluid stops White's bishop pair from ever clamping down.", sayShort: "Two Knights — …c5 strikes the centre" },
  sources: ['concept:pos-center', 'concept:pos-initiative'],
};

const N221: SublineNarration = {
  intro: { say: "…c5 — White pins your f6-knight with Bg5, so hit back with …c5 against d4. Having given up the bishop for the f3-knight, only open the position on your own terms: …c5 challenges the centre and frees you. That pin isn't dangerous — meet it with …Be7 or …cxd4 — and the central tension favours you as the side with the sounder structure.", sayShort: "Two Knights — …c5 strikes the centre" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N222: SublineNarration = {
  intro: { say: "…d4 — White keeps the centre modest with d3, so grab space with the …d4 wedge. You've traded the light bishop for the f3-knight, so neutralise White's bishop pair by closing the position; that d4-pawn kicks the c3-knight and cramps White. Reroute your d7-knight toward the kingside or c5, and play comfortably for the queenside and the central clamp.", sayShort: "Two Knights — …d4 space clamp" },
  sources: ['concept:pos-space', 'concept:pawn-chain'],
};

const N223: SublineNarration = {
  intro: { say: "…c5 — this quiet King's-Indian-Attack treatment has the queens off on d1 with White's king stuck on d1 after recapturing. You're fine: develop the knight to f6 hitting e4, send the bishop to g7 on the long diagonal, and grab central space and a queenside majority with …c5. With no queens on, White's king on d1 is more a liability than an asset — play for the better structure and smooth development.", sayShort: "Queenless — …c5 and …g7 bishop" },
  sources: ['concept:pawn-majority', 'concept:pos-development'],
};

const N224: SublineNarration = {
  intro: { say: "…c5 — White releases the tension with exd5, so hit back at once with …c5 rather than recapture passively. Having traded the light bishop for the f3-knight, use …c5 to open lines and free the position on your own terms. The dynamic …c5 challenges d4 and d5, generating active pieces and keeping you from getting cramped against White's bishop pair.", sayShort: "Two Knights — …c5 fights the centre" },
  sources: ['concept:pos-center', 'concept:pos-initiative'],
};

const N225: SublineNarration = {
  intro: { say: "Ne5 — White posts the knight aggressively and pins with Bb5, but you're solidly placed with the lone d-pawn structure. Your knight on c6 and pawn on e6 support the centre; play …Bd7 to calmly unpin and offer to trade off White's active pieces. Your structure is sound and symmetric, so swap off the e5-knight and b5-bishop, finish developing, and reach a comfortable balanced middlegame.", sayShort: "Exchange — …Bd7 unpins, trades off" },
  sources: ['concept:tac-pin', 'concept:pos-development'],
};

const N226: SublineNarration = {
  intro: { say: "…d4 — White fianchettoes with g3 to activate the light-squared bishop, so answer with the …d4 space-grab. Having traded off the light bishop, blunt White's bishop pair by closing the centre; that d4-pawn evicts the c3-knight and seizes territory. Play for the queenside and the central clamp, leaving White's fianchettoed bishop biting on the granite of your pawn chain.", sayShort: "Two Knights — …d4 against the fianchetto" },
  sources: ['concept:pos-space', 'concept:pawn-fianchetto'],
};

const N227: SublineNarration = {
  intro: { say: "gxf3 — White recaptures with the g-pawn, accepting doubled f-pawns and an open g-file for the bishop pair. Exploit that structural concession: your …e6, …Nf6 and …c5 break challenge the centre and hit his damaged kingside. With his king cover compromised, play for the better structure and target those weak f-pawns and the half-open files in the long game.", sayShort: "Two Knights — …c5, target doubled f-pawns" },
  sources: ['concept:pawn-doubled', 'concept:pos-center'],
};

const N228: SublineNarration = {
  intro: { say: "Bb5 — a true isolated-queen's-pawn battle where the d-file and the d5/e5 squares decide everything. You've got the standard play: your bishop pinned the c3-knight, …Nxd5 centralised, and the knight on c6 blockades d4. White's Bb5 adds pressure and eyes your structure, so play …Be7 and castle, treating White's isolated d-pawn as your long-term target.", sayShort: "Panov — blockade the isolated d-pawn" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N229: SublineNarration = {
  intro: { say: "Bc4 — White swings the bishop actively at your d5-knight and eyes f7 in this isolated-queen's-pawn fight. You're solidly placed: knight on c6 blockading d4, bishop on b4 pinning and pressuring the centre, and …Be7 or …Be6 completing development while neutralising that c4-bishop. Stick to the classic plan: restrain and target White's isolated d-pawn, anchoring on the d5 and c6 blockading squares.", sayShort: "Panov — meet Bc4, blockade d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N230: SublineNarration = {
  intro: { say: "Bd3 — White builds the natural Exchange setup with the bishop on d3 and Bf4. You've got a comfortable mirror structure with the lone d-pawn and your knight already on c6 covering e5. Develop your bishop to g4 to pin or trade White's f3-knight and pressure d4, then complete with …e6 and …Bd6, contesting the dark squares White is trying to claim.", sayShort: "Exchange — meet Bf4 with …Bg4" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N231: SublineNarration = {
  intro: { say: "Nxd5 — White trades knights on d5, so recapture and keep the typical IQP setup with active pieces. Your bishop on b4, your knight on c6 blockading d4, and the half-open files hand you plenty of counterplay against his isolated d-pawn. Your task is clear: restrain and round up that d4-pawn, finish developing, and use the d5 and e4 squares as your outposts.", sayShort: "Panov — recapture, target d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N232: SublineNarration = {
  intro: { say: "Nxd5 — White trades on d5 with both sides castled and developed, simplifying toward the isolated-queen's-pawn battle. Recapture and keep your standard plan: your knight on c6 blockades d4, your bishop on b4 pressures the dark squares, your pieces swarm the lone d-pawn. With sound development and active pieces, restrain and round up his isolated d4-pawn as the long-term weakness.", sayShort: "Panov — recapture, blockade d4" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N233: SublineNarration = {
  intro: { say: "a3 — White questions your b4-bishop in this isolated-queen's-pawn middlegame. You've got the typical strong setup: …Nxd5 centralised the knight, the knight on c6 blockades d4, and the bishop pressures the centre. Retreat the bishop to e7 or trade on c3, then settle your pieces around the d4-pawn — that's the long-term weakness you aim to restrain and win.", sayShort: "Panov — a3 questions the b4-bishop" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N234: SublineNarration = {
  intro: { say: "a3 — both sides castled and developed, and White asks your b4-bishop its intentions in this isolated-queen's-pawn middlegame. You've got the ideal setup: knight centralised on d5, knight on c6 blockading d4, bishop pressuring the centre. Retreat to e7 or trade on c3, then settle your pieces around the lone d-pawn and run the standard plan — restrain and eventually win White's isolated pawn.", sayShort: "Panov — a3 questions the bishop" },
  sources: ['concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Panov%E2%80%93Botvinnik_Attack'],
};

const N235: SublineNarration = {
  intro: { say: "c5 — White advances to grab queenside space instead of holding the tension, so fianchetto with …g6 and …Bg7 to pressure the long diagonal and d4. With your g7-bishop bearing down on d4 and the …e5 or …b6 breaks available, undermine White's advanced c5-pawn and centre. Meet Bb5+ by blocking with …Nc6 or …Bd7, and keep fighting for the dark squares and the central breaks.", sayShort: "Panov — …g7 bishop hits d4" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center'],
};

const N236: SublineNarration = {
  intro: { say: "cxd5 — you've reached the main isolated-queen's-pawn tabiya after the early cxd5 and …Nxd5. Pin the c3-knight with …Bb4, the standard plan to pressure the centre and the d4-pawn that's about to be isolated. With your knight centralised on d5 and your bishop fighting for the dark squares, your pieces are active and ready to blockade and round up White's lone d-pawn over the long game.", sayShort: "Panov — …Bb4, blockade d4" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin'],
};

const N237: SublineNarration = {
  intro: { say: "Be2 — your …e5 broke the centre and White develops quietly, so seize space with …c5 and the …c4 clamp on the queenside. Your bishop on g4 still pins the f3-knight, pressuring d4, while the …c4 wedge fixes White's pawns and preps …b5-b4. You've got a healthy, spacious position with the e5-pawn anchoring the centre — exploit the soft spots the early f3 left in White's camp.", sayShort: "Fantasy — …c4 grabs queenside space" },
  sources: ['concept:pos-space', 'concept:tac-pin'],
};

const N238: SublineNarration = {
  intro: { say: "Be3 — your …e5 broke the centre and White defends d4 with the bishop, so play …c5 and …c4 to fix the queenside and grab a clamp. Your bishop pins the f3-knight while the …c4 wedge restrains White's queenside pawns, giving you space and a clear plan. Push …c4 for territory and prepare …b5-b4, with the e5-pawn anchoring the centre against White's slightly loosened position.", sayShort: "Fantasy — …c4 clamps the queenside" },
  sources: ['concept:pos-space', 'concept:tac-pin'],
};

const N239: SublineNarration = {
  intro: { say: "Bg5 — your …e5 has fully contested the centre and White pins your f6-knight. You're comfortably developed: your bishop on g4 pins White's f3-knight right back, both knights are out, and the d4/e5 tension is balanced. Hold the e5 strongpoint, finish with …Be7 and castle, and treat White's loosened f-file as a feature to exploit, not something to fear.", sayShort: "Fantasy — …e5 holds, mutual pins" },
  sources: ['concept:tac-pin', 'concept:pos-center'],
};

const N240: SublineNarration = {
  intro: { say: "c3 — your …e5 counterblow met White's f3-centre, and White props d4 up with c3. With your bishop pinning the f3-knight and your knight on d7, hold the e5 strongpoint — you're comfortably equal. Finish developing with …Ngf6 and …Be7, castle, and exploit the slight loosening White's early f3 left, knowing the centre is firmly contested.", sayShort: "Fantasy — …e5 strongpoint, develop" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N241: SublineNarration = {
  intro: { say: "c3 — your …e5 counter met White's broad centre and the pawns locked, so grab queenside space with …c5-c4 and …a6. White's b3 challenges your c4-pawn, so support it with …a6 preparing …b5, building a queenside chain. Play for space and the …b5-b4 break against White's queenside — the early f3 and b3 loosened White's structure and hand you a comfortable game.", sayShort: "Fantasy — queenside chain with …c4, …a6" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N242: SublineNarration = {
  intro: { say: "d5 — White locks the centre after your …e5, so roll the queenside with …c5, …c4 and …c3 to clamp and wedge into White's camp. With the centre fixed, the play shifts to the wings: your c3-pawn cramps White's queenside while you prep …b5-b4 and minor-piece manoeuvres behind the chain. Play for the queenside space in a locked position where White's early f3 left lasting soft spots.", sayShort: "Fantasy — locked centre, …c3 wedge" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N243: SublineNarration = {
  intro: { say: "dxe5 — White released the centre, but don't rush to regain the pawn: expand with …c5 and …c4 to clamp the queenside. Your bishop on g4 pins the f3-knight, and you'll recover or pressure the e5-pawn while grabbing space with the …c4 wedge. Run the thematic queenside expansion with …b5-b4, exploiting the structure the early f3 loosened while keeping piece activity and the initiative.", sayShort: "Fantasy — …c4 space, regain e5" },
  sources: ['concept:pos-space', 'concept:pos-initiative'],
};

const N244: SublineNarration = {
  intro: { say: "dxe5 — you struck …e5 against White's broad pawn centre and White has just released the tension. With your bishop pinning the f3-knight and both knights heading to f6 and d7, regain the e5-pawn smoothly and reach an open, comfortable position. The point of …e5 was to break White's grip before it became a steamroller — you come out fully developed with no weaknesses.", sayShort: "Fantasy — …e5 break frees Black" },
  sources: ['concept:pos-center', 'concept:tac-pin'],
};

const N245: SublineNarration = {
  intro: { say: "dxe5 — White captured, but rather than regain the pawn at once, roll the queenside with …c5, …c4 and …c3, wedging deep into White's camp. That c3-pawn cramps White and fixes the queenside while you round up the e5-pawn or build piece pressure to restore material. Play for the space advantage and long-term restraint, exploiting the weaknesses the early f3 and your queenside advances created.", sayShort: "Fantasy — …c3 wedge, regain e5" },
  sources: ['concept:pawn-chain', 'concept:pos-space'],
};

const N246: SublineNarration = {
  intro: { say: "Bg3 — White preserves the dark-squared bishop instead of trading it on d6. Your bishop on d6 still eyes the kingside dark squares, and with the structure fully symmetric, you're comfortably equal from sound development. Complete with …O-O, contest the e5 outpost the knights are eyeing, and consider trading the dark-squared bishops on g3 or e5 to leave a balanced, easy-to-play position.", sayShort: "Exchange — Bg3 keeps the bishop" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N247: SublineNarration = {
  intro: { say: "Ne2 — White develops the knight to e2 rather than f3, so start queenside operations with …a6, …a5 and …a4 to fix and pressure White's pawns. In this symmetric lone-d-pawn structure you're fully equal, and the minority-style …a4 advance provokes weaknesses once b3 chases it. Develop the rest naturally with …Nf6, …Bf5 or …Bg4 and …e6, playing for the queenside and better minor pieces.", sayShort: "Exchange — …a4 probes the queenside" },
  sources: ['concept:pawn-minority-attack', 'concept:pos-development'],
};

const N248: SublineNarration = {
  intro: { say: "Ne5 — White jumps to the e5 outpost it's been angling for, hitting your g4-bishop and d7-queen. You're well placed to meet it: trade on e5 or challenge with …Bxe5 to dissolve the outpost, and the symmetric structure means White gets no real edge. Your bishop on d6 already eyes e5, so contest the centre and keep the balanced lone-d-pawn position firmly in hand.", sayShort: "Exchange — challenge the e5 knight" },
  sources: ['concept:pos-outpost', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N249: SublineNarration = {
  intro: { say: "Qxb7 — White grabs the b7-pawn with the queen, a greedy raid that hands you the initiative. Your a8-rook is ready to hit the queen, and after …Rb8 or …O-O the lines open in your favour — that pawn was poison, not a real gain. Develop with tempo: your solid centre and lead in coordination more than pay for the pawn while the queen scrambles back and you seize the b-file.", sayShort: "Exchange — Qxb7 grab invites …Rb8" },
  sources: ['concept:pos-initiative', 'concept:pos-open-file'],
};

const N250: SublineNarration = {
  intro: { say: "Rae1 — the symmetrical Exchange with the dark-squared bishops already traded on d6. White lifts the rook to eye the half-open e-file and the e5 break, but you both own a lone d-pawn and the structure is balanced. With your queen settled on d6 and knight on c6 holding e5, keep developing harmoniously and contest the centre with the rook to c8 or a timely …e5 of your own.", sayShort: "Symmetrical Exchange — rook eyes e-file" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N251: SublineNarration = {
  intro: { say: "h3 — White probes with Qb3 and then h3, questioning your b7-pawn and g4-bishop. You're fully prepared: your queen on d7 defends b7 and supports the bishop, which can retreat to h5 or trade on f3. The symmetric lone-d-pawn structure gives you full equality, so complete with …e6 and …Bd6, contesting the e5 outpost and the e-file in a balanced middlegame.", sayShort: "Exchange — …Qd7 covers b7, hold g4" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N252: SublineNarration = {
  intro: { say: "h3 — White questions your g4-bishop before finishing development. Retreat to h5 or trade on a knight, keeping the symmetric lone-d-pawn structure firmly balanced. With your queen on d7 covering b7 against the Qb3 probe and your pieces harmoniously placed, continue with …Bd6 and …O-O, reaching full equality where the e5 outpost and the e-file are the only fighting ground.", sayShort: "Exchange — h3 questions the bishop" },
  sources: ['concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence'],
};

const N253: SublineNarration = {
  intro: { say: "h3 — the symmetrical Exchange with the dark bishops traded and both kings castled, and White questions your g4-bishop. You've got full equality: queen centralised on d6, knight on c6 holding e5, bishop free to retreat to h5 or trade on f3 into a totally balanced lone-d-pawn structure. With everything developed, play for the e5 break or piece pressure, comfortable in a position with no weaknesses.", sayShort: "Exchange — h3 nudges the g4-bishop" },
  sources: ['concept:pos-development', 'concept:pos-king-safety'],
};

const N254: SublineNarration = {
  intro: { say: "Bc4 — you recaptured with …exf6 toward the centre for the half-open e-file and the bishop pair, and White swings the bishop at f7. Castle calmly, then play …Re8 to pressure the e-file while your bishop on d6 supports kingside play. Your doubled f-pawns grip e5 and g5, so you're structurally robust — play for the e-file and the two bishops, neutralising the c4-bishop with …Be6 or …Qc7 in time.", sayShort: "Tartakower — castle, then …Re8" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N255: SublineNarration = {
  intro: { say: "Bd2 — White connects the rooks and prepares queenside castling against your e8-rook check. Lean on your trademark structure: bishop on d6, rook pressuring the e-file, and …h5 grabbing kingside space while the doubled f-pawns hold e5 and g5. Continue with …Nd7-f8 and …Qc7, keeping your solid wall and aiming counterplay at whichever wing White commits its king.", sayShort: "Tartakower — e-file pressure builds" },
  sources: ['concept:pos-open-file', 'concept:pos-development'],
};

const N256: SublineNarration = {
  intro: { say: "Be3 — you recaptured …exf6 toward the centre for the half-open e-file and the bishop pair, so castle into safety while White defends d4. Your structure is full of resources: the doubled f-pawns control e5 and g5, your bishop on d6 supports kingside play, and …Re8 will pressure the e-file. Play for the two bishops and the e-file — a sound, dynamic position where the structural concession is well paid for.", sayShort: "Tartakower — castle, two bishops, e-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N257: SublineNarration = {
  intro: { say: "Be3 — you've got the half-open e-file and the bishop pair after recapturing toward the centre, and White blocks the check and defends d4. Keep building: your rook pressures the e-file, your bishop sits actively on d6, and …Nd7-f8 reroutes the knight to defend and prepare …Ng6. The doubled f-pawns are a feature gripping e5 and g5, so play for the e-file and a kingside or central break.", sayShort: "Tartakower — Be3 blocks the e-file check" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N258: SublineNarration = {
  intro: { say: "Nf3 — you recaptured …exf6 toward the centre for the half-open e-file and the bishop pair, so castle into safety. White develops naturally, but your structure is rich in resources: the doubled f-pawns control e5 and g5, and your bishop on d6 plus the coming …Re8 generate pressure. Play for the e-file and a kingside pawn break or central play, confident the bishop pair pays for the structural concession.", sayShort: "Tartakower — castle, claim the e-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file'],
};

const N259: SublineNarration = {
  intro: { say: "Nf4 — opposite castling, and White plants the knight to aim at e6 and g6 and back a kingside push. Lean on your standard solid setup: rook on e8, bishop on d6, knight rerouted to f8, and …h5 restraining White's expansion. Your doubled f-pawns control e5 and g5, so you're structurally sound — turn to counterplay against White's king with …Qc7 and the queenside pawns.", sayShort: "Tartakower — knight to f4, counter on queenside" },
  sources: ['concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N260: SublineNarration = {
  intro: { say: "Ng3 — opposite-side castling, and White reroutes the knight to eye f5 and h5. You're fully mobilised: rook controlling the e-file, bishop on d6, knight rerouted via f8 to defend and prepare …Ng6. The doubled f-pawns grip e5 and g5 for a sturdy kingside, so keep the e-file pressure going and prepare queenside counterplay with …Qc7 and …b5 toward White's king.", sayShort: "Tartakower — knight to g3, hold e-file" },
  sources: ['concept:pos-open-file', 'concept:pawn-doubled'],
};

const N261: SublineNarration = {
  intro: { say: "h3 — you recaptured toward the centre for the half-open e-file and the bishop pair, and White restrains your …Bg4 and …h4 ideas. Lean on your trademark structure: rook checking and pressuring on e8, bishop on d6, …h5 already grabbing kingside space. The doubled f-pawns grip e5 and g5, so continue with …Nd7-f8 and …Qc7, playing for the e-file and counterplay at whichever wing White commits its king.", sayShort: "Tartakower — h3 restrains Black's expansion" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N262: SublineNarration = {
  intro: { say: "h3 — you recaptured …exf6 toward the centre, giving up the symmetrical pawn for the half-open e-file and the bishop pair. With your rook already checking on e8, bishop on d6, and knight rerouting via f8, you've got a rock-solid kingside and active pieces. White's h3 is slow prophylaxis — keep piling on the e-file and expand with …Ng6 and …Qc7, confident the doubled f-pawns are a strength controlling e5 and g5.", sayShort: "Tartakower — e-file and bishop pair" },
  sources: ['concept:pos-open-file', 'concept:pos-bishop-pair'],
};

const N263: SublineNarration = {
  intro: { say: "…c5 — you've dissolved the center and won the d4-pawn, dropping the queen to the safe d6-square in this open Tarrasch. White's lead in development and the active Bc4 are his compensation, but you're solid with no weaknesses to attack. Play …Nf6, …Nc6, and …Be7 to castle quickly, handing back the extra pawn if needed to kill the initiative and reach a comfortable middlegame.", sayShort: "Open Tarrasch — …c5 wins d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-initiative'],
};

const N264: SublineNarration = {
  intro: { say: "Ne1 — White reroutes the knight toward d3 or g2 behind his chain, now that your …c5-c4 has frozen the queenside in this closed Advance French. With the center locked, your play is on the flanks: hit with …f6 to break the e5-d4 chain from above, or storm with …g5-g4. Your a5-knight props up c4, and …Nec6 or …Nf5 brings the kingside knight to bear on his static center.", sayShort: "Advance — closed center, break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N265: SublineNarration = {
  intro: { say: "Ng5 — the knight jumps toward e4, or provokes …h6 to weaken your kingside, with the queenside clamped by your …c4 in this closed Advance French. Stay on plan: …h6 repels the knight, then …f6 or …g5 breaks White's e5-d4 structure from above. Your a5-knight anchors c4, and reroute the kingside knight via …Nec6 or …Nf5 to join the assault on his static center.", sayShort: "Advance — …h6 then break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N266: SublineNarration = {
  intro: { say: "Qc2 — White readies b2-b3 or a central f4-break, with your …c4 freezing the queenside in this closed Advance French. The locked center hands the game to the wings: play …f6 to undermine the e5-d4 chain, or …g5-g4 to storm the kingside. Your a5-knight guards c4 and eyes b3, and …Nec6 or …Nf5 redeploys the kingside knight against his stable but passive structure.", sayShort: "Advance — locked …c4, …f6 break" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N267: SublineNarration = {
  intro: { say: "…c4 — you've locked the queenside, fixing White's c3 and d4 pawns and freeing your hands for a pawn storm in this closed Advance French. Your a5-knight guards c4 and eyes b3, while …Ne7 prepares …Nf5 or …g5-g4 against his kingside. Break with …f6 or …g5 to crack his chain and create the play — with the center closed, the wing pawns decide.", sayShort: "Advance — locked …c4, prepare …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N268: SublineNarration = {
  intro: { say: "Rb1 — White readies b2-b3 to challenge your cramping c4-pawn, with your …c4 already freezing the queenside in this closed Advance French. Hold the bind: your a5-knight and a …b5 push keep c4 defended and the structure clamped. Play …b5, …Ne7, and …f6 or …g5, generating play on whichever wing White doesn't, since the locked center hands the game to the flank pawns.", sayShort: "Advance — hold …c4, expand with …b5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-space'],
};

const N269: SublineNarration = {
  intro: { say: "Re1 — White readies a central break with f2-f4 or Nf1-h2, your …c4 having frozen the queenside in this closed Advance French. With the center locked, your play is on the wings: …Nec6 or …g5 and …f6 to undermine his e5-d4 chain. Your a5-knight anchors c4 — open the kingside or break with …f6 before he can organize his own pawn storm.", sayShort: "Advance — closed …c4, break with …f6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N270: SublineNarration = {
  intro: { say: "exd5 — the Exchange French, and the symmetrical structure puts a premium on piece activity and the open e-file. Mirror with …Bd6 aiming at h2, then …O-O, …c6, and …Bg4 to get your problem bishop outside the chain. Seize the e-file with …Re8 and contest the central squares — whoever finds the first concrete target in this symmetry takes the initiative.", sayShort: "Exchange — mirror development, fight for e-file" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N271: SublineNarration = {
  intro: { say: "h3 — White just makes luft and stops …Ng4 ideas, your …c4 having fixed the queenside in this closed Advance French. With the center locked solid, your plans live on the wings: break with …f6 from above, or storm with …g5-g4. Your a5-knight guards c4 and eyes b3, and …Nec6 or …Nf5 brings the kingside knight into the attack on his stable but passive center.", sayShort: "Advance — …c4 bind, …f6 or …g5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:att-kingside-storm'],
};

const N272: SublineNarration = {
  intro: { say: "Bd2 — White prepares to recapture on c3 with the bishop, dodging the doubled pawns if you trade, in this Winawer. Develop …Ne7 toward g6 or f5 and keep the tension with …Nbc6 hitting d4. Time …cxd4 and …Qa5 or …Bxc3 to undermine his e5-d4 chain — if he does recapture with the bishop, you grab the c-file and the better structure.", sayShort: "Winawer — …Ne7, pressure the d4-chain" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N273: SublineNarration = {
  intro: { say: "Ne2 — White wants to recapture on c3 with a knight and dodge the doubled pawns, but take on e4 first and retreat the bishop intact to e7. After Nxe4 and …Nf6, challenge his centralized knight and keep the bishop pair with no structural concessions. Play …Nxe4 or …Nbd7, then …b6 and …Bb7 — you have a sound, harmonious position with nothing to attack.", sayShort: "Winawer — …dxe4, keep the bishop on e7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-bishop-pair'],
};

const N274: SublineNarration = {
  intro: { say: "Nf3 — White develops quietly instead of launching Qg4 at your kingside in this Winawer. You hold the structural trumps: his doubled c-pawns and the d4-base are chronic weaknesses, and …Bd7 prepares …Bc6 or …Ba4 to pressure them. Play …Qa5, …Nbc6, and …c4, fixing the c3-pawn and opening the queenside against his crippled camp.", sayShort: "Winawer — pressure doubled c-pawns" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-doubled', 'concept:att-queenside-attack'],
};

const N275: SublineNarration = {
  intro: { say: "Qd3 — White retreats the queen to defend and untangle after grabbing both your kingside pawns in this Winawer Poisoned Pawn. You've sacrificed for a roaring initiative: your rook on g8 commands the open g-file and …cxd4 has ripped open the center. Play …Nxe5 or …d4, then …Bd7 and …O-O-O, hurling pieces at his uncastled king — the open g-file and lead in development far outweigh the pawns.", sayShort: "Winawer Poisoned Pawn — g-file attack" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-initiative', 'concept:tac-sacrifice'],
};

const N276: SublineNarration = {
  intro: { say: "…cxd4 — you've sacrificed both kingside pawns to open the g-file and seize the initiative against White's exposed setup in this Winawer Poisoned Pawn. Your rook on g8 already glares down the open file at g2, and the center is cracked open while his queen sits offside on h7. Continue …Nxd4 or …Bd7 with …O-O-O, throwing every piece at his king — the pawn deficit is irrelevant against the raging g-file attack.", sayShort: "Winawer Poisoned Pawn — g-file initiative" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-initiative', 'concept:tac-sacrifice'],
};

const N277: SublineNarration = {
  intro: { say: "exd5 — White exchanges to reach a symmetrical, open structure, your bishop still pinning the c3-knight on b4 in this Winawer. Your knight on c6 pressures d4, and you're comfortable and weakness-free. Play …Nge7, …O-O, and …Bg4 or …Re8, developing harmoniously and keeping the pin on c3 to restrain his center — the open position gives you easy, equal play.", sayShort: "Winawer Exchange — pin holds, …Nge7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N278: SublineNarration = {
  intro: { say: "h4 — the sharp Winawer thrust, White grabbing kingside space and eyeing h5 before you can pile onto his shattered c-pawns. Strike the base instead: …Qc7 trains on the c3- and e5-pawns at once. Those doubled c-pawns are White's permanent Winawer weakness, and the queen begins the siege.", sayShort: "h4 — …Qc7 hits c3 and e5." },
  sources: ['concept:pawn-doubled', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N279: SublineNarration = {
  intro: { say: "Bd3 — White has released the tension with dxc5, letting you recapture with the queen on the active c5-square in this Classical French. With the dark-squared bishops gone and the d-file half-open, you develop easily with a clear target on his e5-pawn and the d4-square. Play …Nb4 hitting d3, …Bd7, and …Rc8, contesting the c-file while the knight eyes the d5 and d3 outposts.", sayShort: "Classical — queen active on c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N280: SublineNarration = {
  intro: { say: "Be2 — White develops modestly and prepares to castle in this Classical French with the dark-squared bishops traded. You've already played …c5 and …Nc6 to hit the d4-base of his chain, with …a6 controlling b5. Play …cxd4, …Qb6, and …Bd7-b5 or …Rc8, opening the c-file and pressing the d4-pawn — your queenside play against the chain is the heart of the Classical.", sayShort: "Classical — …c5 hits d4, open the c-file" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-open-file'],
};

const N281: SublineNarration = {
  intro: { say: "Ne2 — White lifts the knight to overprotect d4 and reroute toward f4 or g3 in this Classical French with bishops traded. You've already struck with …c5 and …Nc6 at the chain's base, and …a6 covers b5. Play …cxd4, …Qb6, and …Bd7-b5, opening the c-file and pressing d4 — with the dark-squared bishops gone, your queenside pawn-and-piece play against his center is the standing theme.", sayShort: "Classical — …c5 hits d4, …Qb6 next" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-open-file'],
};

const N282: SublineNarration = {
  intro: { say: "O-O-O — White's long castle signals a race of opposite-wing attacks in this Classical French with the dark-squared bishops traded. You've already struck with …c5 and brought the knight to c6, so the d4-base is under fire and the c-file is opening toward his king on c1. Play …cxd4, …b5-b4, and …Rb8, hurling your queenside pawns at his king while he storms the kingside with g4-f5.", sayShort: "Classical — race, …c5 and …b5 storm" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:att-queenside-attack', 'concept:pawn-chain'],
};

const N283: SublineNarration = {
  intro: { say: "a3 — White stops …Nb4 and …Qb4 after releasing the tension with dxc5, you having recaptured the queen to the active c5-post in this Classical French. With the dark-squared bishops gone and the d-file half-open, you develop easily and eye his e5-pawn and the d4-square. Play …Bd7, …O-O-O or …O-O, and …Rc8, using the c-file and your queen's activity to pressure his loose center.", sayShort: "Classical — queen active on c5, …Rc8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N284: SublineNarration = {
  intro: { say: "e5 — White grabs space and props it with f4 in the Steinitz Classical French, so undermine the chain at its base with …c5 and …Nc6. The d4-pawn is your target — pressure from the c6-knight and the queen forces him to give it up or accept a cramped, locked structure. Play …cxd4, …Qb6, and …Be7, prying open the c-file and the queenside.", sayShort: "Steinitz — hit the chain base, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-center'],
};

const N285: SublineNarration = {
  intro: { say: "h4 — the Alekhine-Chatard Attack: instead of trading on e7, White lunges to support Bg5 and threaten g4-g5, opening the h-file at your king. Answer …Bxg5 then …hxg5, accepting damaged kingside pawns to kill his attacking bishop and trade off the aggressor. After that, play …c5 and …Nc6 to hit d4 — the structure favors whoever strikes at the chain.", sayShort: "Alekhine-Chatard — take on g5, hit d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:att-kingside-storm', 'concept:pawn-chain'],
};

const N286: SublineNarration = {
  intro: { say: "Nc3 — White adds a defender to his isolated d4-pawn and eyes e4 and b5 in this open Tarrasch. You're excellently placed: knight on c6, bishop on d6 toward h2, queen on c7 stacked on the c-file. Play …O-O, …a6 to deny Nb5, and pressure d4 with …Bd7 and the rooks — that isolated d4-pawn stays the permanent weakness you blockade and besiege.", sayShort: "Tarrasch — besiege the isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N287: SublineNarration = {
  intro: { say: "Ng3 — White reroutes the knight toward f5 or h5 to harass your kingside, his d4-pawn isolated in this open Tarrasch. You're splendidly developed: knight on c6, bishop on d6 toward h2, queen on c7 on the c-file. Play …O-O, …Re8, and …Bd7-e8 piling onto d4, with …e5 in reserve to break free — his isolated d4-pawn is the permanent weakness you blockade and besiege.", sayShort: "Tarrasch — siege the isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N288: SublineNarration = {
  intro: { say: "Rc1 — you've dissolved the center with …c5 and …f6, leaving White an isolated d4-pawn to blockade and besiege in this open Italian-style Tarrasch. Your pieces are ideal: knight on c6, bishop on d6 aiming at h2, queen on c7 lined up on the c-file behind his rook. Play …Bd7-e8-h5 or …e5 to free everything, while the d4-pawn stays a permanent weakness.", sayShort: "Tarrasch — blockade White's isolated d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N289: SublineNarration = {
  intro: { say: "a3 — White stops …Nb4 hitting your d3-bishop and prepares b2-b4 for space, his d4-pawn isolated in this open Tarrasch. Your pieces are model-placed: knight on c6, bishop on d6 toward h2, queen on c7 on the c-file. Play …O-O, …Bd7-e8-h5 to pile on d4, and the …e5 break to free the game — the isolated d4-pawn is the standing weakness you blockade and besiege.", sayShort: "Tarrasch — blockade and pressure d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N290: SublineNarration = {
  intro: { say: "c3 — White builds the e5-d4-c3 pawn chain, so attack its base at once with …c5 and …Nc6 in this closed Tarrasch. Your light-squared bishop on d3 and the cramped d7-knight tell the story: generate counterplay against d4 before his kingside space crushes you. Branch into …Qb6 hitting d4 and b2, or …f6 to break the chain from above and free the position.", sayShort: "Closed Tarrasch — …c5 and …Nc6 on d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-space'],
};

const N291: SublineNarration = {
  intro: { say: "f4 — White clamps the e5-square and discourages your …e5 freeing break in this open Tarrasch. You're well-placed: knight on c6, bishop on d6 toward h2, the recaptured knight on f6 eyeing e4 and g4. Play …O-O, …Qc7 or …Qb6, and …Bd7 piling onto the isolated d4-pawn — the f4-push weakens e3 and the g1-a7 diagonal, giving you fresh squares to target.", sayShort: "Tarrasch — besiege d4, exploit e3 hole" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-weak-squares'],
};

const N292: SublineNarration = {
  intro: { say: "h3 — White just makes luft and stops …Ng4 or …Bg4, his d4-pawn fixed as the long-term weakness in this open Tarrasch. You're ideally coordinated: knight on c6, bishop on d6 aiming at h2, queen on c7 stacked on the c-file. Play …O-O, …Bd7-e8-h5 to add pressure, or the …e5 break to free the position — the blockade and siege of d4 is your standing edge.", sayShort: "Tarrasch — blockade and besiege d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N293: SublineNarration = {
  intro: { say: "Nc3 — White pressures d5 and angles for the e4-break in this Exchange French. Mirror him with your …c6 to bolster d5 and …Bg4 or …Bf5 to get your bishop outside the chain. Grab the e-file with your …Re8, play …Nbd7 and …Qc7 with your bishop pointed at h2 — hold d5, contest the central files, and the symmetrical position stays fully balanced for you.", sayShort: "Exchange — hold d5 with …c6, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N294: SublineNarration = {
  intro: { say: "…Bxc3 — you've traded the dark-squared bishop to saddle White with doubled, weak c-pawns, and now you castle into Qg4's kingside aim in this main-line Winawer. The bargain is structural: he owns the bishop pair and space, but his c3- and c4-pawns and the d4-base are chronic targets. Press with …Nbc6, …Qa5, and …cxd4, opening lines against the crippled queenside while your king sits safely on g8.", sayShort: "Winawer — doubled c-pawns the target" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-doubled', 'concept:pos-bishop-pair'],
};

const N295: SublineNarration = {
  intro: { say: "Ne5 — White posts the knight on the natural central outpost in this symmetrical Exchange French. Challenge it directly with …Nbd7 or …Nc6 to trade off the intruder, or play …c5 to strike at d4 and undermine its support. Play …Re8 for the e-file, …c5, and exchange on e5 — your harmonious pieces and the open center give fully equal, active play.", sayShort: "Exchange — challenge the e5-knight, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-outpost', 'concept:pos-open-file'],
};

const N296: SublineNarration = {
  intro: { say: "Re1 — White grabs the e-file in this Exchange French, where symmetry breaks only by who acts first. Answer with your …Re8 to contest the open file directly, then complete with …c6, …Nbd7 and …Qc7, lining up your bishop and queen at h2. Seize the e-file and aim for a minority advance or a kingside regrouping — whoever controls the e-file and the e4/e5 squares holds the edge.", sayShort: "Exchange — contest the e-file, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:pos-development'],
};

const N297: SublineNarration = {
  intro: { say: "c3 — White props up d4 and settles into a slow symmetrical struggle in this Exchange French. Mirror him with your …c6 and develop …Bg4 or …Bf5 outside the chain, then …Nbd7 and …Qc7 to aim your battery at h2. Contest the e-file with your …Re8 and prepare your minority advance …b5-b4 against c3 — whoever creates the first real target in this symmetry grabs the initiative.", sayShort: "Exchange — …c6, develop the bishop out" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-minority-attack', 'concept:pos-development'],
};

const N298: SublineNarration = {
  intro: { say: "c3 — White props up d4 with both bishops already out in this Exchange French. Your g4-bishop pins the f3-knight, restraining his central breaks, while …Nbd7 and …c6 round out your harmonious setup. Play …Re8 to seize the e-file and …h6 to ask the g5-bishop its intentions, keeping the symmetrical position double-edged with full chances for you.", sayShort: "Exchange — pin on f3, …Re8" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-open-file'],
};

const N299: SublineNarration = {
  intro: { say: "c4 — White breaks the symmetry, pressuring d5 and accepting an isolated queen's pawn if you play …dxc4, in this Exchange French. Take with …dxc4 to win the bishop pair after …Bxc4, or hold with …c6, leaving him a potential isolated d-pawn. Play …c6 and …Bg4 to pin f3, then …Re8 and …Nbd7, blockading d5 or d4 and exploiting whichever isolated pawn he ends up with.", sayShort: "Exchange — …c6, target the isolated pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-isolated', 'concept:pos-development'],
};

const N300: SublineNarration = {
  intro: { say: "h3 — White asks your g4-bishop to declare itself in this mirrored Exchange French. Keep the pin alive with …Bh5 or trade with …Bxf3, conceding the bishop pair to plant a knight on the e4-outpost. The symmetry is only surface-deep — play for …Nbd7, …c6, and a minority push or …Re8 to seize the open e-file before he does.", sayShort: "Exchange — …Bh5 or trade for e4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-open-file', 'concept:tac-pin'],
};

const N301: SublineNarration = {
  intro: { say: "Bb5 — White pins your d7-knight and pressures the queenside before you finish developing in this Burn Variation. You keep the bishop pair, with the dark-squared bishop active on f6 against d4. Play …c6 to chase the b5-bishop or …a6 and …c5 to break the pin and hit the center — once you play …b6 and …Bb7, both bishops sweep the long diagonals for a comfortable game.", sayShort: "Burn — break the pin, …c6 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N302: SublineNarration = {
  intro: { say: "Bd3 — your …dxe4 handed White the center but left you the bishop pair after the f6-bishop traded for the knight in this Burn Variation. Your dark-squared bishop sits active on f6, pressing d4 and the long diagonal, and the d7-knight can reroute to b6 or f6. Complete with …b6, …Bb7, and …c5, striking at d4 and putting both bishops to work on the long diagonals.", sayShort: "Burn — bishop pair, …b6 and …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N303: SublineNarration = {
  intro: { say: "Nxf6+ — White trades the e4-knight, so recapture with the d7-knight to keep a sound, symmetrical structure in this Burn Variation. The second bishop is gone, but you're solid and weakness-free, with the c8-bishop ready for b7 after …b6. Play …b6, …Bb7, …c5, and …O-O, hitting the d4-pawn and putting the long-diagonal bishop to work for comfortable equality.", sayShort: "Burn — recapture …Nxf6, …b6 and …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pawn-chain'],
};

const N304: SublineNarration = {
  intro: { say: "c3 — White shores up the d4-base but leaves his center static and slightly passive in this Burn Variation, where you hold the two bishops and your dark-squared bishop is already active on f6 against d4. Play …b6 and …Bb7 to harness the long light diagonal, then …c5 to challenge d4 — with both bishops working, you have the more comfortable middlegame.", sayShort: "Burn — bishop pair, …b6 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-bishop-pair', 'concept:pawn-chain'],
};

const N305: SublineNarration = {
  intro: { say: "f3 — White tries to win back the e4-pawn in this offbeat French. Don't hand it over: your …e3 jams the pawn deep into his camp, a permanent thorn cramping his f1-bishop and freezing his whole kingside. That advanced pawn on e3 is worth far more to you than the tempo White recovers.", sayShort: "f3 — …e3 jams a thorn." },
  sources: ['concept:pos-space', 'concept:pawn-passed', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N306: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight, the c6-bishop already freed, in this Rubinstein setup. You're perfectly solid: the bishop on c6 trades off his strong e4-knight or supports …Nxe4, and with the c3-pawn his d4 has no natural support beyond the queen. Play …Be7, break the pin, and aim for …c5 to liquidate the center and equalize fully.", sayShort: "Rubinstein — break the pin, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N307: SublineNarration = {
  intro: { say: "Bg5 — White pins your recaptured knight, the e4-knight having been swapped on f6, in this Rubinstein. Your bishop on c6 already controls the long light diagonal and bears down on f3, so you're fully developed and free of weaknesses. Break the pin with …Be7 and prepare …c5 or …Qd5, liquidating the d4-pawn and reaching dead equality with active pieces.", sayShort: "Rubinstein — c6-bishop strong, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N308: SublineNarration = {
  intro: { say: "Ng3 — White sidesteps the trade of his e4-knight by dropping it back, keeping pieces on, in this Rubinstein. You're fully developed and untroubled: your bishop on c6 commands the long light diagonal, and the c3-pawn leaves his d4 reliant on the queen alone. Play …Be7, castle, and prepare the …c5 break to liquidate d4, reaching the comfortable, solid equality the Rubinstein promises.", sayShort: "Rubinstein — c6-bishop strong, …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N309: SublineNarration = {
  intro: { say: "O-O — your …dxe4 conceded the center for a rock-solid, congestion-free game in this Rubinstein French. Your light-squared bishop has already escaped the pawn chain to c6, eyeing the e4-knight and the long diagonal. With castling done, finish with …Ngf6 and …Be7, then play the freeing breaks …c5 or …e5 to challenge his lone d4-pawn.", sayShort: "Rubinstein — solid, bishop freed on c6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N310: SublineNarration = {
  intro: { say: "Qc2 — White defends e4 indirectly and eyes the b1-h7 diagonal, your c6-bishop already developed, in this Rubinstein. You're solid and symmetrical in feel, with the light-squared bishop active on c6 toward f3 and g2. Play …Be7, …O-O, and the …c5 break to liquidate his d4-pawn — with no weaknesses and harmonious development, you equalize comfortably.", sayShort: "Rubinstein — bishop on c6, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N311: SublineNarration = {
  intro: { say: "Qe2 — White centralizes the queen to connect rooks before deciding on a setup in this Rubinstein. Your freed light-squared bishop on c6 is the point of the whole variation, bearing on his e4-knight and the long diagonal toward g2. Play …Ngf6 to challenge e4, then …Be7 and …O-O, with the standard …c5 break in reserve to liquidate d4 and equalize.", sayShort: "Rubinstein — bishop on c6, …Ngf6" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N312: SublineNarration = {
  intro: { say: "Qe2 — White lifts the queen to connect the rooks and prepare central play, your c6-bishop already developed, in this Rubinstein. You're solid and symmetrical in spirit: the bishop on c6 contests his e4-knight and the long diagonal, and the c3-pawn keeps his d4 from extra support. Play …Be7, castle, and aim for …c5 or …Qd5 to dissolve d4 and reach a comfortable, weakness-free equality.", sayShort: "Rubinstein — solid, …c5 frees" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N313: SublineNarration = {
  intro: { say: "Be3 — White hits your centralized queen to gain a tempo for the attack in this Milner-Barry Gambit accepted. You hold the extra d4-pawn and have already played …a6 to deny Nb5, so just step the queen back to safety. Play …Qb6 or …Qd8, then …Ne7 and …Nc6, completing development and tucking the king away — keep the pawn, weather the initiative, win the endgame.", sayShort: "Milner-Barry — extra pawn, retreat the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-development'],
};

const N314: SublineNarration = {
  intro: { say: "Kh1 — White clears g1 to prepare f2-f4 and his attacking initiative in this Milner-Barry Gambit accepted. You have the extra d4-pawn, the queen well-centralized, and …a6 stopping Nb5. Play …Qb6 or …Bc6 to defuse his pieces, then …Ne7 and …O-O-O — consolidate around the centralized queen and convert the extra pawn once your king is safe.", sayShort: "Milner-Barry — extra pawn, finish development" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N315: SublineNarration = {
  intro: { say: "Qf3 — White eyes your f7-pawn and the kingside, seeking compensation for the lost pawn, in this Milner-Barry Gambit accepted. You're up a clean pawn with the queen well-centralized on d4 and …a6 covering b5. Play …Qb6 or …Bc6 to neutralize his queen's aim, then …Ne7 and …O-O-O or …Be7 — once your king is safe, the extra pawn carries you into a winning endgame.", sayShort: "Milner-Barry — extra pawn, guard f7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N316: SublineNarration = {
  intro: { say: "Rd1 — White's rook swings over to harass your centralized queen and regain the pawn in this Milner-Barry Gambit accepted. You have the extra d-pawn and have prudently played …a6 to deny Nb5 and …Ne7 to bolster the kingside. Play …Nc6 or …Qb6 to retreat the queen safely, then …Be7 and …O-O — once the king is tucked away, the pawn is yours to keep.", sayShort: "Milner-Barry — extra pawn, untangle the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N317: SublineNarration = {
  intro: { say: "Re1 — White prepares his piece play for the lost material, you having snatched the d4-pawn with the knight and recaptured by queen in this Advance French Milner-Barry-style gambit. You're up a clean pawn and just need to consolidate: the queen on d4 is well-centralized and …a6 has covered b5. Play …Ne7-c6 or …Bc5 to challenge the queen, then …O-O-O or …Be7, keeping the extra pawn and weathering the initiative.", sayShort: "Advance — extra pawn, consolidate the d4-queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-centralization', 'concept:pos-king-safety'],
};

const N318: SublineNarration = {
  intro: { say: "a3 — White takes the b4-square from your queen and bishop and supports a future b2-b4 in this Milner-Barry Gambit accepted. You hold the extra d4-pawn with the queen strongly centralized and …a6 already denying Nb5. Play …Qb6 or …Bc6 to retreat the queen and trade attackers, then …Ne7 and …O-O-O — consolidate and convert the clean extra pawn in the endgame.", sayShort: "Milner-Barry — keep the pawn, untangle" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N319: SublineNarration = {
  intro: { say: "g3 — White prepares Bf4 or a fianchetto to chip at your centralized queen and exploit the dark squares in this Milner-Barry Gambit accepted. You're a clean pawn up with the queen strong on d4 and …a6 covering b5. Play …Qb6 or …Bc6 to neutralize his developing pieces, then …Ne7 and …O-O-O or …Be7 — once your king is safe, the extra d-pawn decides the game.", sayShort: "Milner-Barry — extra pawn, retreat the queen" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pos-centralization'],
};

const N320: SublineNarration = {
  intro: { say: "Bc1 — White retreats the bishop all the way back to dodge the …Bxc3 doubling in this MacCutcheon Lasker line, so plant your knight on the e4-outpost. With Qg4 hitting g7, …g6 shores up the kingside and blunts the queen's aim. Play …Bxc3 and …c5, smashing into his d4-e5 chain while your e4-knight and the half-open structure give sharp, active counterplay.", sayShort: "MacCutcheon — knight on e4, …c5 break" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-outpost', 'concept:pawn-chain'],
};

const N321: SublineNarration = {
  intro: { say: "Be3 — White retreats the bishop rather than allow the damage of …Bxc3 in this MacCutcheon line, and your f6-knight is pinned no longer. Play …Ne4 hitting the c3-knight to force clarification on the queenside. Then …Bxc3, …Nxc3 or …bxc3 damaging his pawns, followed by …c5 to attack the d4-e5 chain at its base while your king finds safety.", sayShort: "MacCutcheon — …Ne4 then …c5" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pawn-chain', 'concept:pos-development'],
};

const N322: SublineNarration = {
  intro: { say: "dxc5 — White's king sits on d2 and he releases the center rather than hold the chain under fire in this MacCutcheon. You've already damaged his queenside with …Bxc3 and provoked Kxd2, and now the center opens with his king exposed. Play …Nc6 and …Qa5 hitting c5 and the loose c3-pawn, with …Bd7 and …O-O-O to swing the rooks against his stranded monarch.", sayShort: "MacCutcheon — open lines at the d2-king" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N323: SublineNarration = {
  intro: { say: "exd5 — White sidesteps the main lines by capturing on d5 immediately in this MacCutcheon. Recapture with …exd5 or the sharper …Qxd5, opening the position while your active b4-bishop keeps pinning the c3-knight. With …exd5 you get a free, symmetrical structure and easy development to …Nc6, …O-O, and …Re8 — the pinned knight and the open e-file give comfortable, weakness-free play.", sayShort: "MacCutcheon — recapture …exd5, free game" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N324: SublineNarration = {
  intro: { say: "f4 — White reinforces e5 and braces the center against your …c5 break, his king on d2 in this MacCutcheon. You hold the structural trumps: his doubled c-pawns and the awkward king are permanent liabilities. Play …Nc6 and …Qa5 to hit c3 and the d4-pawn, then …cxd4 and …Bd7 with …O-O-O, opening files against his king before it can find shelter.", sayShort: "MacCutcheon — …Nc6 and …Qa5 on the king" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N325: SublineNarration = {
  intro: { say: "h4 — White's king is stranded on d2 and this push aims to pry open the h-file against your weakened kingside in a sharp MacCutcheon. You've won the dark-squared bishop and damaged his queenside pawns, and your …c5 break already hits the d4-base. Play …Nc6, …Qa5, and …c4, turning the central tension into a queenside assault while his misplaced king and doubled c-pawns tell.", sayShort: "MacCutcheon — White king stuck, …c5 strike" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-king-safety', 'concept:pawn-doubled'],
};

const N326: SublineNarration = {
  intro: { say: "Bb5+ — White checks after the center opened with dxc5 and …Bxc5 in this Rubinstein, so just block with …Bd7 or …Nd7, trading off his developed bishop and easing any pressure. With the structure symmetrical and your c5-bishop active toward f2, complete …O-O and …Qe7, reaching an open, equal middlegame where your harmonious pieces are at least his match.", sayShort: "Rubinstein — block the check, …Bd7" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N327: SublineNarration = {
  intro: { say: "Be3 — White develops the dark-squared bishop to bolster d4 against your …c5 strike in this Rubinstein. You're solid and symmetrical in feel, with knights traded on f6 and no weaknesses to defend. Play …cxd4 and …Bc5 hitting e3, or …Be7 and …O-O with …b6 and …Bb7 — contest d4 and bring your pieces to their natural, harmonious squares for full equality.", sayShort: "Rubinstein — …c5 challenges the d4-pawn" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N328: SublineNarration = {
  intro: { say: "Bg5 — White pins your recaptured f6-knight after you struck the center with …c5 in this Rubinstein. You're solid with a symmetrical feel and no structural weaknesses to defend. Play …Be7 to break the pin or …cxd4 first, then …b6 and …Bb7 to command the long light diagonal — once developed, challenge the d4-pawn and reach a comfortable, balanced middlegame.", sayShort: "Rubinstein — break the pin, …c5 strikes d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:tac-pin', 'concept:pos-development'],
};

const N329: SublineNarration = {
  intro: { say: "Bg5 — White develops with a pin on the f6-knight now that the c5-pawn has been traded off. Unravel calmly: …O-O tucks the king away and a later …Be7 or …h6 breaks the pin. With your bishop already active on c5 and the structure symmetrical, Black has easy, equal piece play.", sayShort: "Bg5 — castle, then break the pin." },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N330: SublineNarration = {
  intro: { say: "O-O — White castles, you having already struck d4 with …c5 in this Rubinstein. With knights swapped on f6 and the center fluid, you have a free, weakness-free game and clear development to …Be7, …O-O, and …b6. The d4-pawn, no longer guarded by a knight, is your standing target — coordinate rooks on c8 and d8 and press it while completing your harmonious setup.", sayShort: "Rubinstein — …c5 break, target d4" },
  sources: ['https://en.wikipedia.org/wiki/French_Defence', 'concept:pos-development', 'concept:pos-center'],
};

const N331: SublineNarration = {
  intro: { say: "c3 — White shores up the d4-pawn against your …c5 break in this solid Rubinstein structure. Develop naturally with …Bd6, …O-O and …Qc7, keeping the pressure trained on d4. With the position symmetrical and your pieces a touch freer, Black reaches comfortable, fully equal play.", sayShort: "c3 — develop, keep hitting d4." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/French_Defence'],
};

const N332: SublineNarration = {
  intro: { say: "Bd3 — White aims the bishop at your kingside and the h7-square before completing with Nf3. Castle with …O-O, then strike the centre with …c5 or …Nc6 and …e5, because the e4-d4-f4 pawn front must be challenged head-on. Your g7-bishop bears down the long diagonal — break with …c5 hitting d4 and let the open lines work for your better-developed pieces against White's ambitious but loosenable centre.", sayShort: "Bd3 aims kingside — break …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N333: SublineNarration = {
  intro: { say: "Be2 — White keeps the big centre but softens the attacking ambitions of Bd3 or Bc4. Challenge it immediately: …c5 hits d4, or …Nc6 and …e5, because the e4-d4-f4 phalanx must be contested before it cements. Your g7-bishop is the long-term asset on the long diagonal — break with …c5 and let the open lines favor your better-developed pieces.", sayShort: "Quiet Be2 — challenge centre …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N334: SublineNarration = {
  intro: { say: "Be3 — White props d4 with the dark-squared bishop before deciding on a kingside push or a queen lift to d2. Challenge the big centre without delay: …c5 hits d4, or …Nc6 and …e5 strike from the other side, refusing to let the e4-d4-f4 phalanx settle. Your g7-bishop is poised on the long diagonal — break with …c5, and if White plays d5 the position opens for the bishop's pressure on b2.", sayShort: "Be3 props d4 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N335: SublineNarration = {
  intro: { say: "Be3 — White defends d4 and develops the bishop as the central tension peaks. Your …c5 has already hit d4, so play …cxd4 to open the centre, when your a6-knight jumps to c5 or b4 hitting White's structure and the g7-bishop comes alive on the long diagonal. Open the position before White's f4 phalanx advances — exchange on d4 and use your active minor pieces against the loosened white centre.", sayShort: "Be3 props d4 — open with …cxd4" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N336: SublineNarration = {
  intro: { say: "Bxa6 — White surrenders the bishop pair to damage your queenside after …bxa6. Your doubled a-pawns look ugly, but the recapture opens the b-file for your rook pointing at b2, while your two bishops on g7 and c8 rake long diagonals. Recapture …bxa6, contest the centre with …cxd4, and use the open b-file and active bishops to compensate for the structural concession.", sayShort: "Bxa6 — recapture …bxa6, open b-file" },
  sources: ['concept:pos-bishop-pair', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N337: SublineNarration = {
  intro: { say: "Qe1 — White lifts the queen toward h4 for a kingside attack after your …Na6 and …c5 met d5 and the knight rerouted to c7 to support …b5. With the centre fixed, play on the queenside: …b5 with the c7-knight backing it pries open lines, while …Rb8 and …a6 fuel the advance. Race the wings — push …b5-b4 to hit the c3-knight before White's queen swings over.", sayShort: "Qe1 swings kingside — strike …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N338: SublineNarration = {
  intro: { say: "dxc5 — White opens the centre and offers the pawn back for development after your …c5 struck d4. Your a6-knight is perfectly placed to recapture with …Nxc5, hitting the d3-bishop and the e4-pawn from an active post, or …dxc5 keeps the structure with an open d-file. Recapture with the knight to gain a tempo on the bishop, when your g7-bishop and the open position give you a comfortable, active game.", sayShort: "dxc5 — recapture …Nxc5 with tempo" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N339: SublineNarration = {
  intro: { say: "e5 — White grabs space and kicks your f6-knight before you have counter-struck, so it drops back to d7 or e8. The thrust is double-edged: the e5-pawn is advanced and can be undermined, so answer with …Nfd7 and …c5, hitting d4 to dissolve White's centre. Once it opens your g7-bishop becomes powerful on the long diagonal — don't let the broad pawns stand, break with …c5 and round up the e5-pawn.", sayShort: "e5 grabs space — undermine with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N340: SublineNarration = {
  intro: { say: "e5 — White lunges to gain space and harry your f6-knight, which retreats to d7 or e8, but your …c5 has already hit d4. After the exchanges the centre opens and the advanced e5-pawn becomes a target on a board where your g7-bishop rakes the long diagonal. Play …cxd4 to open lines and bring your a6-knight to c5 or b4, hitting White's overextended structure.", sayShort: "e5 lunge — …cxd4 opens the centre" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N341: SublineNarration = {
  intro: { say: "h3 — White keeps your c8-bishop off g4 and readies a kingside expansion after your …Na6 and …c5 met d5 and the knight rerouted to c7 for …b5. With the centre fixed by d5, your play is on the queenside: …b5 with the c7-knight behind it pries open lines, while …Rb8 and …a6 build the advance. Push …b5-b4 to challenge the c3-knight and open the b-file before White's f4-f5 storm gathers pace.", sayShort: "Fixed centre — expand with …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N342: SublineNarration = {
  intro: { say: "Bc4 — White redeploys the bishop to the active a2-g8 diagonal aiming at f7, the centre having clarified after dxe5 dxe5 with the d-file open. With queens still on, equalize by completing development: …Qe7 or …Qc7 connects your rooks, …Nb6 hits the c4-bishop with tempo, and your g7-bishop and e5-pawn control the centre. Piece activity decides in this symmetrical structure — contest the open d-file with …Rd8 and keep the e5-pawn defended.", sayShort: "Bc4 redeploys — …Nb6 with tempo" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N343: SublineNarration = {
  intro: { say: "Bc4 — White trains the bishop on the a2-g8 diagonal and the f7-square, an active developing choice. Castle and prepare the small-centre breaks: …c6 to blunt the bishop and ready …d5 or …b5, or …Nc6 and …e5 to contest the centre directly. Develop …O-O and …Nbd7, hit the c4-bishop with …Nb6 when useful, and choose the central break that suits White's plan while your g7-bishop pressures d4.", sayShort: "Bc4 hits f7 — …c6 blunts the bishop" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N344: SublineNarration = {
  intro: { say: "Be3 — White develops the dark-squared bishop and supports d4, your …c6 and …e5 having already broken in the centre. The tension between e5 and d4 is the heart of the position: keep it, and meet dxe5 with …dxe5 reaching a symmetrical centre where your d7-knight reroutes via f8 to e6 or g6. White's a4 gains queenside space, so answer with …Qc7 and …Re8 to back the e5-pawn and stay solid in this slow, maneuvering middlegame.", sayShort: "Be3 props d4 — keep …e5 tension" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N345: SublineNarration = {
  intro: { say: "Be3 — White develops the dark-squared bishop and supports d4, often a prelude to Qd2 and a 150-style plan with a later Bh6 trade. Play …O-O and …c6, preparing the small-centre breaks …e5 or …b5, and if White sets up the Bh6 trade then expand queenside with …b5. Your g7-bishop eyes d4 — finish castling, choose your central break, and be ready to meet the dark-square battery with timely counterplay.", sayShort: "Be3 props d4 — prepare …c6, …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N346: SublineNarration = {
  intro: { say: "Bf4 — White develops the dark-squared bishop actively, eyeing your d6-pawn and discouraging an early …e5 push. Play …O-O and …c6, preparing …b5 for queenside space or readying …Nbd7 and …e5 once the d6-pawn is sufficiently supported. Your g7-bishop watches d4 and b2 — finish castling, blunt the f4-bishop's pressure on d6 with …Nbd7 and …Qb6 ideas, and choose the central break when the moment is right.", sayShort: "Bf4 eyes d6 — develop …c6, …Nbd7" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N347: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight to the queen and eyes a trade to loosen your grip on e5 and d5, after …c6 and …e5. Question the bishop with …h6: after Bh4 or a retreat, your d7-knight reroutes via f8 to e6 or g6 to overprotect the e5-pawn, and …Qc7 and …Re8 complete the setup. Keep the central tension, neutralize the pin, and contest the e-file in this slow, solid Philidor-shaped middlegame.", sayShort: "Bg5 pins f6 — …h6 then reroute" },
  sources: ['concept:tac-pin', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N348: SublineNarration = {
  intro: { say: "Re1 — White backs the e4-pawn and supports a later e5 advance, quiet but flexible. With your …c6 small-centre setup in place, play …e5 to contest the centre directly or …b5 and …a6 for queenside space, with …Nbd7 completing development. Your g7-bishop pressures d4 — choose between the central …e5 break and queenside expansion based on whether White reveals an e5 push or a slower buildup.", sayShort: "Re1 supports e5 — answer with …e5" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N349: SublineNarration = {
  intro: { say: "Re1 — White backs the e4-pawn and supports holding the central tension, your …c6 and …e5 already played. Your structure is set: …Qc7 and …Re8 reinforce e5, your d7-knight reroutes via f8 to e6 or g6, and …a5 can fix White's a4-pawn to prevent b5. Keep the d4/e5 standoff, develop the rook to e8 to contest the e-file, and meet a future dxe5 with …dxe5 reaching a balanced, easy-to-play structure.", sayShort: "Re1 backs e4 — hold …e5 tension" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N350: SublineNarration = {
  intro: { say: "h3 — White rules out …Bg4 and prepares Be3 or a queenside expansion in this mainline Classical Pirc with the Be2-Nf3 setup. Your small-centre plan is to strike with …e5 next, when the d4/e5 tension gives counterplay, or …b5 with the …c6 already in place to grab queenside space. Develop …Nbd7 and …e5, keep your g7-bishop active on the long diagonal, and be ready to meet d5 with a knight reroute toward the kingside.", sayShort: "h3 prep — strike back with …e5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N351: SublineNarration = {
  intro: { say: "h3 — White slips in an early h3 to prevent …Bg4 and keep options open before deciding on Be2 or Be3. Develop unhurried: …O-O, …c6, and then the small-centre break with …e5 or …b5 to stake a claim. Your g7-bishop is already aimed at d4 and b2 — finish castling, prepare …e5, and meet a later d5 by rerouting a knight toward the kingside for the …f5 plan.", sayShort: "Early h3 — develop, ready …e5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N352: SublineNarration = {
  intro: { say: "Be2 — White plays modestly instead of pushing for the Bh6 trade, keeping the Be3-Qd2 setup flexible. Play …c6 and …b5 for queenside space, or …Nc6 and …e5 to strike the centre, judging by where White's king goes. Your g7-bishop eyes d4 and b2 — develop …Nbd7, prepare the …b5 or …e5 break, and stay alert to a later Bh6 by meeting it with …Bxh6 and queenside counterplay.", sayShort: "Be2 flexible — prepare …c6, …b5" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N353: SublineNarration = {
  intro: { say: "Bg5 — White's Byrne Variation pins your f6-knight to the queen and pressures the centre, often heading for Qd2 and queenside castling. Complete the fianchetto with …Bg7, then play …O-O and …c6, preparing the …b5 queenside storm that opposite-side castling invites. Ease the pin with …h6 or with …c6 and …Qc7 unpinning — develop normally and aim your pawns at wherever White's king lands.", sayShort: "Byrne Bg5 — castle, ready …c6, …b5" },
  sources: ['concept:tac-pin', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N354: SublineNarration = {
  intro: { say: "Bh6 — White's Be3-Qd2 battery strikes, offering to trade the dark-squared bishops before you can use your g7-bishop on the long diagonal. Allowing …Bxh6 Qxh6 hands White a target on the dark squares around your king, so react with …Bxh6 followed by …c6 and queenside play, answering with …b5 once White commits the king. If you want to keep the bishop, …c5 hitting d4 changes the central tension before the trade resolves.", sayShort: "Bh6 trades — answer …c6 then …b5" },
  sources: ['concept:pos-bishop-pair', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N355: SublineNarration = {
  intro: { say: "Nf3 — White develops naturally and supports d4 instead of an immediate Bh6 trade or pawn storm, the Be3-Qd2 battery already in place. Play …c6 to prepare …b5, anticipating that White may castle long, and …Nbd7 to ready the central break. Your g7-bishop is poised on the long diagonal — play …c6 and …b5 to grab queenside space, and if White castles queenside accelerate the …b5-b4 storm against the king.", sayShort: "Nf3 develops — ready …c6 and …b5" },
  sources: ['concept:pos-development', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N356: SublineNarration = {
  intro: { say: "Nf3 — White develops naturally rather than the aggressive f4, the Classical Variation tabiya leading to a slow positional struggle. With your kingside fianchetto complete, play the small-centre break — …O-O, …c6, and then …e5 or …b5 to claim space, contesting the centre at the right moment. Your g7-bishop eyes d4 and b2 down the long diagonal — develop solidly and choose your central break once White shows whether the bishop goes to e2, c4, or e3.", sayShort: "Classical setup — prepare …c6 and …e5" },
  sources: ['concept:pos-development', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N357: SublineNarration = {
  intro: { say: "O-O-O — White commits the king to the queenside, the Be3 and Qd2 battery eyeing h6 for a bishop trade. That tells you exactly where to attack: the …c6 and …b5-b4 pawn storm rolls straight at White's king on c1. Race plans — open the b-file with …b5-b4, keep your g7-bishop on the long diagonal, and prioritize speed because both sides are pawn-storming opposite wings.", sayShort: "Opposite castling — …b5-b4 storm" },
  sources: ['concept:att-queenside-attack', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N358: SublineNarration = {
  intro: { say: "f3 — White's early f3 invited …e5, the centre liquidated with dxe5 dxe5, and the queens came off via Qxd8+ Kxd8 into an endgame with your king on d8. The structure is symmetrical with e5 facing e4, so expand on the queenside with …a6-a5 to fix targets and gain space. Centralize the king toward e7, develop with …Be6 and …Nc6 hitting central squares, and use the …a5-a4 lever to pry open White's b3-pawn.", sayShort: "Queens off — …a5 expands, king to e7" },
  sources: ['concept:pawn-minority-attack', 'concept:end-opposition', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N359: SublineNarration = {
  intro: { say: "f4 — White builds the broad e4-d4-f4 pawn centre with Nf3 supporting it, the main tabiya of the Austrian Attack and the most ambitious anti-Pirc setup. Castle, then strike the centre: …c5 hitting d4 or …Nc6 followed by …e5 are the two principled breaks, because a big pawn centre must be challenged before it becomes overwhelming. Your fianchettoed g7-bishop is the long-term hero — don't sit passively, contest the centre immediately.", sayShort: "Austrian centre — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N360: SublineNarration = {
  intro: { say: "h3 — White denies your …Ng4 hit on the e3-bishop and prepares a kingside pawn advance. Hit back in the centre and on the queenside: your …c6 readies …b5, while …e5 or …c5 challenges d4 to undercut any wing attack before it rolls. With his Be3-Qd2 battery aiming at h6, expect Bh6 — answer it with …Bxh6 and …b5, and meet the slow setup with an active central or queenside break.", sayShort: "h3 stops …Ng4 — break …c6, …b5" },
  sources: ['concept:pos-prophylaxis', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N361: SublineNarration = {
  intro: { say: "h4 — White starts the kingside pawn storm before castling, intending h5 to crack open the g6-pawn and your king cover. Answer with central counterplay: …c5 hitting d4 or …e5 opens the position so the wing attack loses its footing, and …Nc6 adds pressure on the centre. Meet a flank lunge with a central strike — break with …c5, and if the centre opens White's advanced h-pawn and uncastled king become liabilities.", sayShort: "h4 storm — counter in centre …c5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N362: SublineNarration = {
  intro: { say: "Bd3 — White builds a kingside attack of his own while your …c6 and …b5 are rolling at his king on c1. With the bishop on d3, play …b4 to chase the c3-knight and rip open the b-file and the a8-h1 diagonal toward White's king. Keep pushing — …b4, …a5-a4, and …Qa5 add fuel; in opposite-castling positions the side that opens lines first usually mates first.", sayShort: "…b4 next — open b-file at the king" },
  sources: ['concept:att-queenside-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N363: SublineNarration = {
  intro: { say: "Be2 — White develops modestly and clears the way for Nf3, declining an immediate pawn storm in this Byrne setup with opposite-side castling. That quiet tempo accelerates your counterattack: with …c6 in place, …b5-b4 hits the c3-knight and pries open lines at White's king on c1. Push …b5 right away, back it with …Qa5 and …a5-a4, and keep your g7-bishop bearing down the long diagonal toward the white queenside.", sayShort: "Be2 quiet — punish with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N364: SublineNarration = {
  intro: { say: "Bh6 — White forces the trade of the dark-squared bishops to strip your kingside cover, in this 150-style setup with Bg5 and opposite-side castling. Recapture …Bxh6 Qxh6, and the position becomes a pure pawn-storm race: White's king sits on c1, so your …b5-b4 advance is already underway thanks to …c6. Don't fear the bishop trade — speed is everything, and your queenside attack arrives because White spent tempi on the swap.", sayShort: "Bh6 trades — race with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N365: SublineNarration = {
  intro: { say: "Kb1 — White tucks the king off the c-file, a useful prophylactic step before the pawn storms collide after opposite-side castling. That spent tempo is a green light for your counterattack: with …c6 already in, push …b5-b4 to hit the c3-knight and pry open lines toward White's king. Don't slow down — …b5, …Qa5, and …a5-a4 keep the queenside fire burning; in these races the side that opens the enemy king first wins.", sayShort: "Kb1 prophylaxis — race on with …b5" },
  sources: ['concept:att-queenside-attack', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N366: SublineNarration = {
  intro: { say: "Nf3 — White develops naturally and supports d4 rather than committing to an immediate pawn storm, in this Byrne setup with opposite-side castling. That gives you a free tempo to press the queenside attack: with …c6 in place, …b5-b4 rolls at the c3-knight and White's king on c1. Push …b5 at once, follow with …Qa5 and …a5-a4, and keep your g7-bishop trained down the long diagonal — speed wins these pawn-storm races.", sayShort: "Nf3 develops — race with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N367: SublineNarration = {
  intro: { say: "e5 — White lunges to attack your f6-knight and open lines while the Bg5 still pins it to the queen, opposite-side castling set. The knight is awkwardly placed, so reply …dxe5 striking back in the centre, or …Nd5 if available, breaking White's momentum before the storm starts. Resolve the centre with …dxe5 and continue the queenside counter …b5-b4, using the open position and your long-diagonal bishop against White's king on c1.", sayShort: "e5 lunge — hit back with …dxe5" },
  sources: ['concept:pos-center', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N368: SublineNarration = {
  intro: { say: "e5 — White combines Bg5 with an early e5 thrust, attacking your f6-knight while the bishop pins it to your d8-queen, a try to disrupt before you are developed. The knight cannot simply move, so reply …dxe5 hitting back in the centre, or …Nfd7 to keep the structure intact; either way address the pin and the advanced pawn. Resolve the tension with …dxe5 or …h6 to question the bishop, then use the long diagonal once the centre opens.", sayShort: "e5 with pin — answer …dxe5" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N369: SublineNarration = {
  intro: { say: "f3 — White braces e4 and prepares a slow kingside pawn storm with g4-h4, opposite-side castling set. That hands you the initiative on the other wing: your …c6 is already played, so …b5-b4 rolls at the king on c1 before White's g- and h-pawns get moving. Push …b5 at once, follow with …Qa5 and …a5-a4 to pry open the b- and a-files, and keep your g7-bishop trained down the long diagonal toward White's queenside.", sayShort: "f3 slow — beat it with …b5-b4" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N370: SublineNarration = {
  intro: { say: "f4 — White builds a broad centre with an Austrian-style advance while the Bg5 eyes your f6-knight and the d8-queen. Reply with the standard central challenge: …c5 striking d4, or …Nbd7 and …e5, refusing to let the e4-d4-f4 phalanx stand unopposed. Your g6/g7 fianchetto means the long diagonal will open once the centre cracks — break with …c5 and develop quickly to exploit any overextension.", sayShort: "Big centre — challenge with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N371: SublineNarration = {
  intro: { say: "h4 — White launches the kingside storm h4-h5 to crack open your g6-pawn and the cover around your king, opposite-side castling set. This is a pure race, so don't defend passively — push the queenside counter: …b5-b4 hammers the c3-knight in front of White's king on c1. Meet h4 with …b5 immediately, keep your g7-bishop on the long diagonal, and back the attack with …Qa5 and …a5-a4; fastest storm wins.", sayShort: "h4 storm — counter-race with …b5" },
  sources: ['concept:att-kingside-storm', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N372: SublineNarration = {
  intro: { say: "Bd3 — this offbeat line let you seize the centre with …e5 and …d5, and after c3 props the centre you've expanded with …a6-a5-a4 against White's queenside. Your …a4 lever cracks the b3-pawn, opening the a-file and creating a target, while your broad …d5/…e5 centre gives you space and free development. Probe with …axb3 to open the a-file, post a knight on the c5 or d4 outpost, and use the central pawns to cramp White.", sayShort: "…a4 cracks b3 — big …d5/…e5 centre" },
  sources: ['concept:pos-center', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N373: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight against the queen and pressures the e5/d5 complex in this solid …e5 Lion. Break the pin or question the bishop with …h6, then continue the standard plan: …Qc7 connects to defend e5, and your d7-knight reroutes via f8 to e6 or g6 to overprotect the central pawn. The structure stays Philidor-like and resilient — keep the d4/e5 tension, finish development, and contest the e-file with the rooks.", sayShort: "Bg5 pins — …h6, overprotect e5" },
  sources: ['concept:tac-pin', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N374: SublineNarration = {
  intro: { say: "Bg5 — White pins nothing but eyes a trade of your f6-knight to weaken your grip on e5 and the d5-square, in this solid …e5 Lion. With your harmonious …Be7, …Qc7, …Nbd7 structure, meet it with …h6 to question the bishop, then reroute your d7-knight via f8 to e6 or g6 to overprotect e5. The position stays solid and Philidor-like — keep the central tension and contest the e-file with the rooks once development finishes.", sayShort: "Bg5 eyes f6 — …h6 then reroute knight" },
  sources: ['concept:pawn-chain', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N375: SublineNarration = {
  intro: { say: "Qe2 — White connects the rooks, defends e4, and prepares to double on the central files or expand with Rd1, in this …e5 Lion structure. Keep the solid plan: …Qc7 and …Re8 back the e5-pawn, your d7-knight reroutes via f8 to e6 or g6, and …a5 fixes White's a4-pawn to deny b5. With the d4/e5 tension held, the game stays maneuvering — overprotect e5, contest the open files, and wait for White to commit before resolving the centre.", sayShort: "Qe2 connects rooks — hold e5 solid" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N376: SublineNarration = {
  intro: { say: "Re1 — White piles a third piece behind the e4-pawn, eyeing the e5-point, in this Lion-style …e5 system with a Philidor-shaped centre. Your …Nbd7 and …Be7 setup keeps the structure compact, so hold e5 with the knights and prepare …c6 to give the queen the c7-square and blunt the c4-bishop. With both kings castled short the game stays maneuvering — reroute your d7-knight toward f8 and g6 to defend the kingside and contest the e-file.", sayShort: "Re1 eyes e5 — hold with …c6" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N377: SublineNarration = {
  intro: { say: "a5 — White stakes out queenside space, fixing a pawn on the fifth rank and securing the b6-outpost, before committing the rook. In this …e5 Lion structure continue the standard maneuvering: …Qc7 and …Re8 support e5, your d7-knight heads for f8 and e6 or g6, and …b5 or …b6 challenges the a5-pawn when ready. Stay solid and Philidor-like, keep the central tension, and reroute your pieces to their best posts behind the e5-pawn.", sayShort: "a5 grabs space — keep e5 solid" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N378: SublineNarration = {
  intro: { say: "a5 — White grabs queenside space, fixing the structure and gaining the b6-square to clamp your minor pieces. In this solid …e5 Lion, answer patiently: your d7-knight reroutes via f8 to e6 or g6 to overprotect e5, …Re8 contests the e-file, and …b6 or …b5 challenges the advanced a-pawn at the right moment. Keep the e5-pawn defended, maneuver your pieces to their best squares, and treat the position as a slow, well-grounded Philidor structure.", sayShort: "a5 clamps queenside — reroute knight" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N379: SublineNarration = {
  intro: { say: "dxe5 — the central tension resolved early into a symmetrical e5-versus-e4 structure with queens off the d-file, and you've expanded with …a6-a5-a4 to fix a queenside weakness. Your …a4 break cracks White's b3-pawn, creating a target and a potential outpost, while the f3-pawn shows White wants a slow positional game. Probe with …axb3 to open the a-file for your rook, place a knight on the c5 or d4 outpost, and treat this as a maneuvering endgame-like middlegame.", sayShort: "…a4 cracks b3 — open the a-file" },
  sources: ['concept:pawn-minority-attack', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N380: SublineNarration = {
  intro: { say: "h3 — White prevents …Bg4 and readies Be3 or Re1, expanding with a4, in this solid …e5 Lion structure. With the d4/e5 tension intact, play patiently: …Qc7 and …Re8 back the e5-pawn, your d7-knight reroutes via f8 to e6 or g6, and …a5 can fix White's a4-pawn to deny b5. The structure resembles a Philidor — keep e5, contest the e-file, and wait for White to commit before choosing between …exd4 and …d5.", sayShort: "h3 prevents …Bg4 — play …Qc7, …Re8" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N381: SublineNarration = {
  intro: { say: "Be3 — White supports d4 while developing the dark-squared bishop, in the Fianchetto Variation after your …e5 and …Nc6. The d4/e5 tension is the focus: keep it, and if White takes dxe5 the open d-file and active pieces give equality, while d5 closes the centre into a KID where …f5 becomes the plan. Develop …Re8 to press the e-file, complete with …a5, and let the structure dictate whether to open the centre or prepare the kingside break.", sayShort: "Be3 props d4 — keep …e5 tension" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N382: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight to the queen, eyeing a trade to weaken your central grip, in the Fianchetto Variation after …e5 and …Nc6. Question the bishop with …h6: after Bxf6 …Bxf6 you keep a solid centre with the bishop pair, or after a retreat the knight stays to support e5 and d4. Maintain the d4/e5 tension, develop …Re8 to contest the e-file, and meet the pin calmly without surrendering the strong centre.", sayShort: "Bg5 pins f6 — …h6 keeps the centre" },
  sources: ['concept:tac-pin', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N383: SublineNarration = {
  intro: { say: "Bg5 — White pins nothing yet but eyes a trade of your f6-knight after a possible …h6, the centre closed by d5 and your c6-knight retreated to e7. In this KID-shaped structure your play is on the kingside: …h6 questions the bishop, then …f5 is the thematic break against White's clamp, with knights rerouting via d7 and e8 to support it. Meet Bg5 with …h6 to clarify the bishop, then prepare …f5 to open lines at White's king.", sayShort: "…h6 then …f5 — KID kingside break" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N384: SublineNarration = {
  intro: { say: "d5 — White closes the centre, declining the tension after your …e5 and steering into a King's-Indian-type structure. The closed centre defines both plans: White will expand on the queenside, while your lever is …f5, supported by a knight reroute to d7 and e8 and your g7-bishop waiting behind the e5-pawn. Lock in with …a5 to slow White's queenside, then build the …f5 break to generate kingside play.", sayShort: "d5 closes centre — prepare …f5" },
  sources: ['concept:pawn-chain', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N385: SublineNarration = {
  intro: { say: "dxe5 — White takes immediately, before you've played …Nc6, opening the d-file and the centre, in the Fianchetto Variation. Recapture …dxe5, and after the queens come off the d-file you're comfortable: your g7-bishop bears down the long diagonal, the knights find e5 and d4 squares, and the symmetrical structure offers easy equality. Develop …Nc6 or …Nbd7 to control the central squares, and use the half-open d-file with the rooks.", sayShort: "dxe5 — recapture, easy equality" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N386: SublineNarration = {
  intro: { say: "dxe5 — White resolves the centre, opening the d-file and trading off the central tension, in the Fianchetto Variation. Recapture …dxe5, and the symmetrical e5-versus-e4 structure favors your smoothly developed pieces: your c6-knight pressures d4-squares, your g7-bishop rakes the long diagonal, and …Qxd1 or …Qe7 contests the open d-file. With queens likely traded, this is a balanced, slightly easier-to-play position thanks to your active fianchettoed bishop.", sayShort: "dxe5 — recapture, open d-file equal" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N387: SublineNarration = {
  intro: { say: "f4 — White breaks to open lines on the kingside and challenge your e5-pawn, the centre closed by d5. Maintain the central block: after …exf4 the e-file opens and your g7-bishop and e7-knight target e4, or hold with …Nd7 and meet the f-file pressure by reorganizing. This is KID-flavored play — let White overextend on the kingside, then strike back with …f5 of your own to fix the structure in your favor.", sayShort: "f4 break — meet with …exf4 or …f5" },
  sources: ['concept:pos-center', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N388: SublineNarration = {
  intro: { say: "h3 — White keeps your c8-bishop off g4 while preparing to resolve the tension or castle, in the Fianchetto Variation after your …e5. The d4/e5 standoff is the key: if White plays dxe5 you recapture and the open position favors your active pieces, and if d5 the centre closes into a KID where …f5 becomes the plan. Develop …Nc6 to pressure d4, complete with …Re8, and let the structure decide between an open game and a kingside pawn break.", sayShort: "h3 waits — …Nc6 pressures d4" },
  sources: ['concept:pos-center', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N389: SublineNarration = {
  intro: { say: "h3 — White sidesteps …Bg4 and prepares queenside or central expansion, in the Fianchetto Variation after your …e5 and …Nc6. The central tension between e5 and d4 defines the plan: if White takes dxe5 you recapture and the open d-file and active pieces equalize, and if White pushes d5 your c6-knight reroutes via e7 toward the …f5 break. Keep …e5 supported, complete with …Re8 and …a5 to fix the queenside, and let the structure dictate which break to prepare.", sayShort: "h3 waits — keep the …e5 tension" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N390: SublineNarration = {
  intro: { say: "h3 — White prepares to expand with g4 or simply prevents …Bg4, the Fianchetto Variation having transposed into a King's-Indian-style closed centre where d5 locked the pawns and pushed your c6-knight to e7. With the centre shut, your play is on the kingside: …Nd7 or …Ne8 reroutes a knight, …f5 is the thematic break, and your g7-bishop bides its time behind the e5-pawn. Treat this like a KID — meet the closed centre with a kingside pawn advance against White's king.", sayShort: "Closed centre — prepare the …f5 break" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N391: SublineNarration = {
  intro: { say: "Nf3 — in this Pribyl/Czech move order you delay the fianchetto and play …c6 and …Bg4 to pin the f3-knight against the queen and pressure d4. The pin makes White's centre harder to maintain: after a later …e5 the d4-pawn comes under fire, and if White breaks the pin with h3 then …Bxf3 doubles the pawns and grips the light squares. Develop flexibly with …Nbd7 and …e5, using the pinned knight to justify the central counter.", sayShort: "…Bg4 pin — pressure d4 then …e5" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N392: SublineNarration = {
  intro: { say: "O-O — White castles short, accepting your …Bg4 pin on the f3-knight and the central tension between e5 and d4, in this …c6/…Qa5 Pirc. Keep the pieces humming: your queen on a5 stings the queenside, your g4-bishop pins f3, and …exd4 or …exf4 can open the centre when the moment is right. Resolve the tension favorably or trade …Bxf3 to double White's pawns and grip the light squares, using your active development to seize the initiative.", sayShort: "O-O allows pin — keep …Bg4 pressure" },
  sources: ['concept:tac-pin', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N393: SublineNarration = {
  intro: { say: "Qe1 — White unpins the c3-knight by stepping off the d-file while eyeing the kingside, in this …c6/…Qa5 Pirc where you've developed fully with …Bg4, …Nbd7, and …Be7. Keep the initiative: your …Bg4 pin on f3 still bites, …exd4 or …exf4 can open the centre at the right moment, and your queen on a5 pressures the queenside. Castle, complete the rooks, and choose the central break that exploits White's slightly loose, attack-minded setup.", sayShort: "Qe1 unpins — keep …Bg4 pressure" },
  sources: ['concept:tac-pin', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N394: SublineNarration = {
  intro: { say: "dxe5 — White grabs the e5-square but opens the d-file onto his own position. Play …c5 to stake queenside space and clamp d4 for good, and with …c4 hitting the d3-bishop plus your queen on a5 raking c3, you seize exactly the initiative White's central capture failed to earn.", sayShort: "dxe5 — …c5 clamps, …c4 harasses." },
  sources: ['concept:pos-initiative', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N395: SublineNarration = {
  intro: { say: "dxe5 — the central tension snaps after your …e5 and …Bg4, in this Pribyl/Czech setup where …c6 and …Qa5 pin White down on the queenside. Recapture with …dxe5 to open the d-file and leave your g4-bishop pinning the f3-knight against the queen, so White's e4-pawn and f4-pawn become the targets. Your active queen on a5 and bishop on g4 give quick piece play — trade on f3 to damage White's structure if the knight cannot break the pin.", sayShort: "dxe5 — recapture, keep the Bg4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N396: SublineNarration = {
  intro: { say: "fxe5 — White opens the f-file but cedes the central tension. Hit back on the other wing: …c5 jabs the d4-pawn while your queen on a5 pins down the c3-knight, and …c4 follows to harass the d3-bishop. Your queenside initiative arrives faster than White's open f-file can bite.", sayShort: "fxe5 — …c5 and …c4 counter." },
  sources: ['concept:pos-initiative', 'concept:att-queenside-attack', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N397: SublineNarration = {
  intro: { say: "fxe5 — White grabs the centre after your …e5 and …Bg4, but your pieces are already active: the g4-bishop pins the f3-knight to the queen, so recapturing the pawn or hitting e5 is straightforward. Play …dxe5 to open the d-file and keep the pin biting, when the e4-pawn becomes weak and your queen on a5 stings the queenside. The trade on f3 looms if White cannot unpin, doubling the pawns and confirming your grip on the light squares.", sayShort: "fxe5 — recapture, keep the f3 pin" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N398: SublineNarration = {
  intro: { say: "h3 — White questions your g4-bishop, which is pinning the f3-knight, in this …c6/…Qa5 Pirc. The choice is concrete: …Bxf3 doubles White's pawns and concedes the bishop pair but cements your grip on the light squares and the e5-point, while …Bh5 keeps the pin alive at the cost of a later g4. With your queen on a5 pressuring the queenside and the knights ready for f8-e6, your pieces are harmoniously placed for a maneuvering struggle.", sayShort: "h3 hits Bg4 — …Bxf3 doubles pawns" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N399: SublineNarration = {
  intro: { say: "Bc4 — White trains the bishop on the f7-square and the a2-g8 diagonal, daring you to grab space, after e5 Nfd7 in the Austrian Attack. Equalize with …c5, striking d4 and challenging the broad centre before White completes development. If the centre opens, the e5-pawn is overextended and your g7-bishop springs to life down the long diagonal — meet Bc4 calmly, finish with …Nb6 hitting the bishop, and break with …c5.", sayShort: "Bc4 hits f7 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N400: SublineNarration = {
  intro: { say: "Be3 — White develops the bishop to brace d4 and the e5-pawn, the knight already chased to d7 with e5 in the Austrian Attack. Counter with the central break …c5, hitting d4 to dissolve White's advanced phalanx, with your d7-knight ready to recapture or jump to b6. Once the centre opens the e5-pawn becomes a target and your g7-bishop dominates the long diagonal — strike …c5 now, before White consolidates the broad pawn front.", sayShort: "Be3 supports e5 — break with …c5" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N401: SublineNarration = {
  intro: { say: "e5 — White pushed before Nf3, chasing your knight to d7, and only now develops Nf3 to support the broad centre. The advanced e5-pawn is the target: strike with …c5 hitting d4, intending …cxd4 to undermine the chain and open lines for your g7-bishop down the long diagonal. Your d7-knight supports the …c5 break and can hop to b6 or back into e5 once it is won — contest the centre actively rather than letting the phalanx stand.", sayShort: "e5 then Nf3 — undermine with …c5" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N402: SublineNarration = {
  intro: { say: "e6 — White rams a sharp pawn sacrifice to blow open your f7-pawn and the diagonals toward your king before development is complete, after e5 Nfd7 in the Austrian Attack. Accept calmly: …fxe6 leaves you up a pawn with a slightly weakened structure, but your d7-knight, your g7-bishop, and the extra centre pawn give a sound defense once the dust settles. Take with …fxe6, complete development with …Nf6 and …Nc6, and consolidate the extra material against White's bluff.", sayShort: "e6 sac — take …fxe6, consolidate" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N403: SublineNarration = {
  intro: { say: "h4 — White announces a kingside pawn storm aimed at your fianchettoed g7-bishop, the f6-knight already chased to d7 with e5 in the Austrian Attack. Against this h4-h5 lunge counter in the centre, not on the wing: hit the e5/d4 chain with …c5, and if the centre opens the loose advanced pawns become targets. Your d7-knight heads for b6 or supports …c5 — striking at d4 is the principled response to a flank attack.", sayShort: "h4 storm — counter centre with …c5" },
  sources: ['concept:att-kingside-storm', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Pirc_Defence'],
};

const N404: SublineNarration = {
  intro: { say: "Bb3 — White tucks the bishop back, sidestepping any …b5 or …Nd5 tempo on c4 while keeping the diagonal toward f7. Your …Qa5 structure is fully sound: the c6-pawn screens your queen, the f5-bishop is active outside the chain, and …e6 holds the center. Play …Bb4 to pin the c3-knight, then …Nbd7, castle, and break with …c5 — you equalize comfortably against White's small space edge.", sayShort: "Bb3 retreats — you play …Bb4, …c5" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N405: SublineNarration = {
  intro: { say: "Nd5 — White lunges the c3-knight in, but your c6-pawn is right there to chase it. Hit it with …cxd5 to win the knight, or after an exchange on f6 recapture and stand fine. With your queen on a5 and the c6-pawn supporting the center, this Nd5 has no lasting bite — answer …cxd5 (or …Nxd5) and you emerge solid, ready to develop the queenside and target d4.", sayShort: "Nd5 lunge — …cxd5 refutes it" },
  sources: ['concept:pos-center', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N406: SublineNarration = {
  intro: { say: "Ne4 — White centralizes, offering to trade your f6-knight and unpin the a5-queen from the c3-knight. Just answer …Nxe4 or …Bxe4, removing the knight and keeping your structure sound: the c6-pawn shields your queen, the f5-bishop is active, and the center holds. Then continue …Nd7, …Be7 and …O-O — the Ne4 sortie achieves nothing lasting.", sayShort: "Ne4 traded off — you stay solid" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N407: SublineNarration = {
  intro: { say: "Ne5 — White posts the knight aggressively, eyeing f7 and your kingside. Neutralize it directly: …Nbd7 challenges it, or …Bd6 hits it, and the trade leaves your structure intact. Your c6-pawn shields the a5-queen and the f5-bishop covers key light squares including b1-h7. Once the e5-knight is dealt with, continue …Be7 and …O-O for a comfortable position.", sayShort: "Ne5 — challenge it with …Nbd7" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N408: SublineNarration = {
  intro: { say: "Nf3 — White develops without the usual Nc3, so you're in no hurry to retreat your queen. Pin the f3-knight with …Bg4 and develop …Nc6 toward d4, with your central queen on d5 well supported. Because White hasn't kicked the queen, you get easy, rapid development: head for …O-O-O and …e6 or …e5, generating quick pressure while the f3-knight stays pinned.", sayShort: "No Nc3 — you develop with tempo" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N409: SublineNarration = {
  intro: { say: "O-O — White finally tucks the king away short instead of going long, sidestepping the opposite-wing race. Your …Bb4 still pins the c3-knight; continue …Nbd7, …O-O and …Qc7 or …Qd8, with the f5-bishop and c6-pawn forming the familiar rock-solid …Qa5 structure. With both kings on the kingside it's more positional — aim for the …c5 break and pressure on d4.", sayShort: "Short castling avoids the storm" },
  sources: ['concept:pos-king-safety', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N410: SublineNarration = {
  intro: { say: "a3 — with kings still in the center, White challenges your b4-bishop pinning the c3-knight. Take on c3 to inflict doubled pawns, or retreat …Bd6/…Be7 and keep the tension. The f5-bishop, the solid c6-pawn screening your a5-queen, and a coming …Nbd7 give you a harmonious setup — and …Bxc3 makes White's long castling unappealing, so make him decide where the king goes.", sayShort: "a3 questions …Bb4 before kings settle" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N411: SublineNarration = {
  intro: { say: "a3 — both sides are committed to opposite wings: White castled long, your queen sits on a5 with …Bb4 pinning the c3-knight. Answer …Bxc3 to damage White's queenside pawns right in front of the king. With the f5-bishop, the c6-pawn shielding your queen, and …Nbd7 ready to swing, storm with …b5-b4 against White's king on c1 — trading on c3 hands you the classic opposite-castling attack.", sayShort: "Opposite castling — …Bxc3 cracks the king" },
  sources: ['concept:att-queenside-attack', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N412: SublineNarration = {
  intro: { say: "h3 — White plays it prophylactically, giving the king luft and ruling out any …Bg4 before castling. Your …Qa5 setup is fully sound: the c6-pawn screens your queen, the f5-bishop is active outside the chain, and …e6 secures the center. Pin the c3-knight with …Bb4, then …Nbd7, castle, and break with …c5 — the slow h3 just lets you complete development at ease.", sayShort: "h3 luft — you play …Bb4 and develop" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N413: SublineNarration = {
  intro: { say: "Bb5+ — a sideline check that just provokes …Bd7 and then retreats to e2, having gained nothing; recapture the pawn with …Nxd5 and stand well centralized. As White shuffles with a3 and b3, seize the queenside initiative: …a5-a4 cramps him and opens lines, and …axb3 prises open the a-file for your rook. Your central activity translates straight into a queenside pawn storm.", sayShort: "Bb5+ achieves nothing — …a4 storms queenside" },
  sources: ['concept:att-queenside-attack', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N414: SublineNarration = {
  intro: { say: "Be3 — White supports d4 and nudges your b6-knight. You have the ideal Modern Scandinavian setup: castled, the knight on b6 pressing c4, the g7-bishop trained on d4 down the long diagonal. Add a second attacker on d4 with …Nc6 and pin the f3-knight with …Bg4 — your piece pressure fully balances White's central space.", sayShort: "Be3 supports d4 — …Nc6 and …Bg4 next" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N415: SublineNarration = {
  intro: { say: "Be3 — White finishes development, bolstering d4 and eyeing your b6-knight. You're fully mobilized: castled, the b6-knight pressures c4, the c6-knight and g7-bishop both bear on d4. Pin the f3-knight with …Bg4 to pile onto d4, or strike with …e5 directly. It's a healthy Grünfeld-style setup where your piece pressure offsets White's space.", sayShort: "Be3 props d4 — you hit the center" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N416: SublineNarration = {
  intro: { say: "Nf3 — White delays d4, but after …Nxd5, d4, …g6 you transpose straight into the Modern Scandinavian fianchetto. Your b6-knight pressures c4 and the g7-bishop bears on d4; play the standard Grünfeld-style plan of …O-O, …Nc6 and …Bg4. The independent move order gives White nothing extra — meet his broad center with active piece play.", sayShort: "Transposes to Modern fianchetto setup" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N417: SublineNarration = {
  intro: { say: "Re1 — White centralizes the rook on the half-open e-file before expanding. You have the comfortable Modern Scandinavian fianchetto: castled, the d5-knight centralized, the g7-bishop bearing on d4 and beyond. Pressure d4 with …Nc6, break with …c5 or …e5, and develop the light bishop to g4 or f5 — your harmonious piece play matches White's small space edge.", sayShort: "Re1 on e-file — you play …Nc6, …c5" },
  sources: ['concept:pos-open-file', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N418: SublineNarration = {
  intro: { say: "c3 — White props up d4 modestly rather than grabbing space with c4. That frees your d5-knight from any harassment, so it sits proudly in the center while the g7-bishop and a coming …Nc6 press d4. Open the position with …Nc6, …Bg4 or …c5; with no c4-pawn to contest the center, your pieces are at least as active as White's.", sayShort: "Quiet c3 — your d5-knight stays strong" },
  sources: ['concept:pos-center', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N419: SublineNarration = {
  intro: { say: "c4 — when White tries to hold the extra pawn with c4 and c6, strike with …cxd5, transposing into a Panov-style structure with a Nimzo flavor after …Bb4 pinning the c3-knight. Your d5-pawn and the e6-point give a sound, classical center; the …Bb4 pin pressures White's e4 ideas and prepares …O-O. You get active, well-developed pieces with no structural concessions.", sayShort: "…cxd5 and …Bb4 — Nimzo-Panov pin" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N420: SublineNarration = {
  intro: { say: "c4 — White grabs the full center early, kicking your d5-knight to b6. Don't be bothered: the knight on b6 already eyes c4 and your fianchettoed g7-bishop targets d4 down the long diagonal. With …O-O, …Nc6 and …Bg4 coming, play it like a reversed-tempo Grünfeld — pressure the big center instead of fearing it.", sayShort: "Early c4 — Grünfeld-style center pressure" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N421: SublineNarration = {
  intro: { say: "h3 — White rules out the …Bg4 pin before deciding on c4. You have the model Modern Scandinavian fianchetto: castled, the d5-knight centralized, the g7-bishop on the long diagonal trained at d4. With …Bg4 prevented, hit the center another way — …Nc6 and …e5, or …Bf5 and …c5. The h3 costs a tempo that helps you organize the central pressure.", sayShort: "h3 prevents …Bg4 — you hit d4 anyway" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N422: SublineNarration = {
  intro: { say: "h3 — White denies you the …Bg4 pin before continuing development. You have the model Modern Scandinavian: castled, the b6-knight pressing c4, the g7-bishop aimed at d4. With …Bg4 prevented, switch plans to …Nc6 and …e5 or …Bf5/…Be6, still hammering the d4-c4 center. The h3 spends a tempo — use it to organize the assault on White's broad pawns.", sayShort: "h3 stops …Bg4 — you play …Nc6, …e5" },
  sources: ['concept:pos-center', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N423: SublineNarration = {
  intro: { say: "Be2 — in the Icelandic Gambit White returns to safety, declining to cling to the extra pawn. You have full compensation: the e6-bishop and …Bb4+ pin, the queen on e7 bearing down the e-file at the white king. Develop …Nc6, …O-O-O and …Rd8 with pressure along the open lines — your lead in development and active pieces fully justify the pawn given on e6.", sayShort: "Icelandic Gambit — your lead in development" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N424: SublineNarration = {
  intro: { say: "Nc3 — in the Icelandic Gambit White develops straight into your …Bb4 pin. You have full compensation for the e6-pawn: the e6-bishop pressuring c4, the b4-bishop pinning the c3-knight, the queen on e7 eyeing the e-file. Continue …O-O-O and …Nc6 for fast, harmonious development; capturing on c3 also wrecks White's queenside pawns. Your initiative is well worth the pawn.", sayShort: "Nc3 walks into the …Bb4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N425: SublineNarration = {
  intro: { say: "Nf3 — in the Icelandic Gambit White reinforces d4 and prepares to castle out of the pin. You have full compensation for the e6-pawn: the e6-bishop hitting c4, the b4-bishop pinning toward d2, the queen on e7 commanding the e-file at White's uncastled king. Throw every piece into the open position with …Nc6, …O-O-O and …Rd8 — your pawn deficit is well offset by the initiative.", sayShort: "Nf3 props d4 — you keep the initiative" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N426: SublineNarration = {
  intro: { say: "Qa4+ — in the Icelandic Gambit White grabs a tempo and offers to trade your active bishop, but calmly block with …c6, which also supports the center. You keep the b4-bishop's pinning ideas and the e6-bishop hitting c4, with the queen on e7 lined up on the e-file. After …c6 White's queen on a4 is offside; continue …O-O, …Nbd7 with full development and lasting pressure for the pawn.", sayShort: "Qa4+ met by …c6 — queen offside" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N427: SublineNarration = {
  intro: { say: "Qe2 — in the Icelandic-Palme Gambit you sacrificed a pawn with …e6 to blast open lines, and after dxe6 Bxe6 your bishop hits c4 and …Bb4+ pins, with the queen on e7 eyeing the center. White's Qe2 offers a trade; meet it with …a6 to keep the structure flexible, prevent Nb5, and prepare …Nc6 and …O-O-O with raking pressure for the pawn.", sayShort: "Icelandic Gambit — development for a pawn" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N428: SublineNarration = {
  intro: { say: "a3 — in the Icelandic Gambit White prods your b4-bishop, so keep the structure flexible with …a6: decline the trade on d2 and instead prepare …Nc6 and queenside castling. You have rich compensation for the e6-pawn: the e6-bishop hitting c4, the e7-queen on the open e-file, and a big lead in development. Head for …O-O-O, …Rd8 and active piece play — White's extra pawn is hard to make count.", sayShort: "a3 prods …Bb4 — …a6 keeps tension" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N429: SublineNarration = {
  intro: { say: "d4 — this is the Modern Scandinavian: instead of recapturing with the queen, you grabbed d5 with the knight and now fianchetto. White's broad c4-d4 center looks imposing, but your knight already retreated to b6 to hit c4 and the g7-bishop rakes the long diagonal straight at d4. Play …O-O, …Nc6 and a later …Bg4 or …e5 — chip at the center rather than block it.", sayShort: "Modern Scandinavian — fianchetto, pressure the center" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N430: SublineNarration = {
  intro: { say: "d5 — White lunges to gain space and hit your e6-bishop, but the pawn is over-extended: prepare …a6 to round it up, and simply step the bishop to d7 or g4. In the Icelandic Gambit your development advantage is decisive — the b4-bishop pins, the e7-queen eyes the e-file, and …Nbd7, …O-O-O pile onto the loose d5-pawn. The advanced pawn becomes a weakness, not a strength.", sayShort: "d5 over-extends — you round it up" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N431: SublineNarration = {
  intro: { say: "Be3 — White reinforces d4 in the …Qd6 system. Your setup is already harmonious: the queen safe on d6, …a6 covering b5, the bishop active on f5 outside the pawn chain. Continue …e6, …Be7, …Nbd7 and …O-O, then break with …c5 in the center. With every piece working and no weaknesses to attack, you're fully comfortable against White's small space edge.", sayShort: "Be3 props d4 — …Qd6 stays solid" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N432: SublineNarration = {
  intro: { say: "Be3 — White completes development, reinforcing d4. Your …Qd6 setup is fully in place: queen safe on d6, …a6 ruling out Nb5, the bishop active on f5, and …e6 securing the center. Continue …Be7 or …Bb4, …Nbd7 and …O-O, then the freeing …c5 break. With every piece harmoniously placed and no weaknesses, you've comfortably solved the opening.", sayShort: "Be3 supports d4 — you stay harmonious" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N433: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight before castling. In the …Qd6 system you're well placed: the queen safe on d6, …a6 stopping Nb5, the bishop active on f5. Break the pin with …Nbd7 or …e6 and …Be7, then …O-O. The mirrored development leaves no weaknesses — aim for the freeing …c5 or …e5 break for a comfortable, classical game.", sayShort: "Bg5 pin — untie it with …Be7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N434: SublineNarration = {
  intro: { say: "Bg5 — in the …Qd6 system White pins your f6-knight and eyes the kingside. You're comfortably set: the queen rests safely on d6, …a6 covers b5, the f5-bishop is outside the pawn chain, and …e6 has solidified the center. Break the pin with …Be7, then …Nbd7 and …O-O — your harmonious structure leaves White nothing concrete to attack.", sayShort: "Bg5 pin met by …Be7 setup" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N435: SublineNarration = {
  intro: { say: "Re1 — White centralizes the rook, supporting a future d4-d5 or e-file pressure. Your …Qd6 setup is fully harmonious: the queen safe on d6, …a6 stopping Nb5, the bishop on f5 outside the pawn chain, and …e6 solidifying. Continue …Be7, …Nbd7 and …O-O, then look to the …c5 break to free the position — there's nothing for White to target.", sayShort: "Re1 centralizes — you complete your setup" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N436: SublineNarration = {
  intro: { say: "d4 — White grabs the center and develops Nf3 and Be2; you've already hit the d4-pawn with …Nc6 and now pin the f3-knight with …Bg4. Because White never played Nc3 to kick your queen, keep the active queen on d5 and your lead in piece activity. Head for …O-O-O, …e6 and pile onto d4 with …Bxf3 and …e5 or by doubling on the d-file — your harmonious development fully offsets White's central space.", sayShort: "…Bg4 pins f3 — pressure on d4" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N437: SublineNarration = {
  intro: { say: "h3 — White gives the king luft and forestalls your …Bg4 ideas. Your …Qd6 setup is already harmonious: queen on d6, …a6 ruling out Nb5, the bishop developed to f5 outside the pawn chain. Continue …e6, …Be7, …Nbd7 and …O-O, then the central …c5 break. The slow h3 just lets you finish developing in comfort with a sound, weakness-free structure.", sayShort: "h3 luft — you develop smoothly" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N438: SublineNarration = {
  intro: { say: "h3 — White gives the king luft and prevents any …Bg4 pin. Your …Qd6 structure is rock-solid: queen on d6, …a6 stopping Nb5, the f5-bishop developed outside the chain, …e6 anchoring the center. Continue …Be7, …Nbd7 and …O-O, with the …c5 break to come. The h3 is a small slow move — use it to complete development at leisure with a sound position.", sayShort: "h3 gives luft — you finish development" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N439: SublineNarration = {
  intro: { say: "Be3 — with the light-squared bishops traded on e2 and your queen recapturing d5, White guards d4. As he shuffles with a3, take queenside space: …a6 and …a5-a4 cramp his b-pawn and prepare to open the a-file. You have no bad piece and an active centralized queen; play …Nc6, …e6, …Be7 and …O-O for a comfortable game with queenside initiative.", sayShort: "…a5-a4 seizes queenside space" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N440: SublineNarration = {
  intro: { say: "Nc3 — White hits your d5-queen, which slides aside, and as he marks time with a3 grab queenside space with …a5-a4. The light-squared bishops are off after …Bxe2, so you have no problem piece; keep the queen active and follow with …Nc6, …e6, …Be7 and …O-O. The …a4 advance cramps White's b-pawn and gives you a pleasant queenside initiative in a fully equal position.", sayShort: "…a4 cramps queenside — easy game" },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N441: SublineNarration = {
  intro: { say: "Nc3 — White develops to c3 hitting your d5-queen, so answer …e5 in the center. The bishops are already off after …Bxe2, so you have no problem piece to manage; step the queen aside and …e5 frees the position. With …Nc6, …Bb4 or …Bd6 and …O-O to come, you equalize comfortably — the early light-squared bishop trade took the sting out of White's space.", sayShort: "Nc3 hits queen — …e5 frees you" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N442: SublineNarration = {
  intro: { say: "Nc3 — White hits your d5-queen, which steps to a safe square. With the bishops already swapped on e2, you have no problem piece and an active queen; press d4 with …Nc6 and complete development with …Bb4 or …Bd6 and …O-O. The early …Bxe2 trade is the whole idea of this line — it removes White's good bishop and leaves you comfortable and balanced.", sayShort: "Nc3 hits queen — you stay comfortable" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N443: SublineNarration = {
  intro: { say: "c3 — after the early …Bg4 and the trade on e2, you recaptured d5 with the queen and face this solid but passive prop of d4. With the light-squared bishops gone you have no bad piece, so as White marks time with a3, seize queenside space: …a6 and …a5-a4 cramp his b-pawn and prepare to open the a-file. Continue …Nc6, …e6, …Be7 and …O-O with a small but pleasant queenside initiative.", sayShort: "Bishops off — …a5 grabs queenside space" },
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N444: SublineNarration = {
  intro: { say: "c3 — White shores up d4 after both sides have completed kingside development. With the light-squared bishops already traded on e2, you have no bad piece and the queen sits actively on d5; press d4 with …Nc6 and follow …Bd6 or …Be7 and …O-O. The c3-pawn means White won't challenge the center with c4, so your pieces have free rein for an easy, balanced game.", sayShort: "c3 props d4 — you stay fully equal" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N445: SublineNarration = {
  intro: { say: "c4 — you recaptured d5 with the queen only after trading the light-squared bishops on e2, eliminating White's good bishop and easing the cramped Scandinavian. When White expands with c4, strike back at once with …e5 in the center, opening lines while you're comfortably developed. After dxe5 recapture with the queen and tempo, or play …Nc6 — the position simplifies toward easy equality with no bad pieces left.", sayShort: "Bishops traded — …e5 breaks the center" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N446: SublineNarration = {
  intro: { say: "Be3 — White bolsters d4 before deciding on castling. In the modern …Qd8 line you're fully set up: the queen tucked safely home, the bishop on g4 pinning the f3-knight, and …e6 solidifying. Continue …Nc6 or …Nbd7, …Be7 and …O-O, keeping the f3-pin to pressure d4. The position is sound and flexible with no targets for White.", sayShort: "Be3 props d4 — your …Bg4 pin holds" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N447: SublineNarration = {
  intro: { say: "Be3 — after your …Bg4-h5 maneuver, White reinforces d4 while your h5-bishop maintains its pin on the f3-knight along the d1-h5 diagonal. Stay solid and continue …Nc6 or …Nbd7, …Be7 and …O-O. The pin on f3 keeps d4 under fire, and with the queen safely home on d8 and no weaknesses, you've comfortably equalized in this …Qd8 main line.", sayShort: "Be3 supports d4 — f3 still pinned" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N448: SublineNarration = {
  intro: { say: "Bf4 — White develops the dark-squared bishop actively rather than to g5, eyeing c7 and the long diagonal. In the …Qd8 line you're well set: the queen safely home, the bishop on g4 pinning the f3-knight, and …e6 solidifying. Continue …Nc6 or …Nbd7, …Bd6 or …Be7 and …O-O; the g4-pin keeps d4 under pressure. Your sound, flexible structure gives the f4-bishop no weaknesses to exploit.", sayShort: "Bf4 develops — …Bg4 keeps d4 hit" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N449: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight before committing the king. Break the pin with …Be7 and continue the modern …Qd8 plan: the bishop already active on g4 pinning f3, the queen safely home, and …Nbd7 plus …O-O to come. The mirrored pins cancel out — your solid structure with pressure on d4 promises a comfortable, weakness-free middlegame.", sayShort: "Bg5 pin answered by …Be7" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N450: SublineNarration = {
  intro: { say: "Bg5 — White pins your f6-knight while your h5-bishop keeps its own pin on f3 down the d1-h5 diagonal. Break the pin with …Be7, after which both sides are fully developed and ready to castle. Your structure is rock-solid: your queen safely home on d8, no pawn weaknesses, and …Nbd7 or …Nc6 plus a timely …c5 or …b5 break ahead — the very heart of the modern …Qd8 Scandinavian you're playing.", sayShort: "Bg5 pin — …Be7 unties it" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N451: SublineNarration = {
  intro: { say: "O-O — White castles short and accepts your …Bg4 pin on the f3-knight rather than chasing it with h3. Complete development naturally: …Nc6 to press d4, …Be7 and …O-O, with the queen already rerouted to d8. The pin on f3 keeps d4 under pressure — aim for the …e6-…e5 or …Nc6-…Nb4 ideas to seize the initiative against the broad center.", sayShort: "White castles into your …Bg4 pin" },
  sources: ['concept:tac-pin', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N452: SublineNarration = {
  intro: { say: "Qd3 — White lifts the queen, connecting the pieces and preparing to castle while keeping options on both wings. Your …Qd8 setup is solid: the bishop on g4 pinning the f3-knight, the queen tucked safely home, and …e6 securing the center. Continue …Nc6 or …Nbd7, …Be7 and …O-O, maintaining the f3-pin to pressure d4. With no weaknesses, you've comfortably navigated the opening into a balanced middlegame.", sayShort: "Qd3 connects — you stay solid, f3 pinned" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N453: SublineNarration = {
  intro: { say: "Qd3 — White lifts the queen toward the kingside, supporting a possible e-file or g4 plan while Bg5 pins your f6-knight. You're solidly placed: the c6-pawn anchors the center, …Be7 has broken the g5-pin's bite, and your h5-bishop maintains the pin on f3 along the d1-h5 diagonal. Continue …Nbd7, …O-O and then …b5 or …c5 to break — your firm pawn structure leaves no weaknesses.", sayShort: "Qd3 eyes kingside — you stay solid" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N454: SublineNarration = {
  intro: { say: "Re1 — White castles short and lifts the rook for central pressure while your h5-bishop keeps the f3-knight pinned. Your structure is impeccable: queen home on d8, c6-pawn anchoring the center, the light-squared bishop active outside the chain. Continue …Be7, …Nbd7 and …O-O, then a freeing …c5 or …b5 — there's no weakness for the e1-rook to exploit.", sayShort: "Re1 central pressure — you stay rock-solid" },
  sources: ['concept:pos-open-file', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N455: SublineNarration = {
  intro: { say: "g4 — White over-presses, lunging to trap your h5-bishop after the …Bg4-h5 pin. Retreat …Bg6, and now g4 is a permanent weakness: the white king has lost its kingside pawn shelter and can no longer castle short comfortably. Continue …Nc6, …Bb4 or …Bd6 and open lines toward the exposed king with …h5, striking back at the over-extended pawns.", sayShort: "g4 overreaches — target the weakened king" },
  sources: ['concept:pos-king-safety', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N456: SublineNarration = {
  intro: { say: "Bb3 — via the Bd2-first order White retreats the bishop, keeping its eye on f7 and avoiding any …b5 or …Nd5 tempo on c4. Your …Qa5 structure is rock-solid: the c6-pawn screens your queen, the f5-bishop is active, and …e6 holds the center. Pin the c3-knight with …Bb4, then …Nbd7, castle, and break with …c5 — you have no weaknesses and equalize comfortably.", sayShort: "Bb3 retreat — you play …Bb4, …c5" },
  sources: ['concept:pos-development', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N457: SublineNarration = {
  intro: { say: "Nd5 — the sortie again, this time via the Bd2-first order, and again your c6-pawn answers it: …cxd5 simply wins the knight or forces a favorable trade on f6. Your …Qa5 setup with the c6-pawn shielding your queen and the f5-bishop outside the chain is built to meet exactly this. After …cxd5 or …Nxd5 you're solid, with the half-open c-file and pressure on d4 to come.", sayShort: "Nd5 met by …cxd5, you stay solid" },
  sources: ['concept:pos-center', 'concept:tac-trap', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N458: SublineNarration = {
  intro: { say: "Ne4 — via the Bd2-first order White centralizes, offering to swap your f6-knight while breaking your a5-queen's pressure on c3. Answer …Nxe4 or …Bxe4 and keep a solid setup: c6 guarding your queen, the bishop active, the center intact. After the exchange develop …Nd7, …Be7 and …O-O comfortably — the e4-knight had no real threat behind it.", sayShort: "Ne4 swap — you stay untroubled" },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N459: SublineNarration = {
  intro: { say: "Ne5 — White jumps the knight in aiming at f7, via the Bd2-first move order. Meet it head-on with …Nbd7 or …Bd6, trading or chasing the intruder while the rest of your position stays solid: the c6-pawn screens your a5-queen and the f5-bishop guards the light squares. Once the e5-knight is dealt with, complete development with …Be7 and …O-O for a balanced game.", sayShort: "Ne5 met by …Nbd7, you stay solid" },
  sources: ['concept:pos-outpost', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N460: SublineNarration = {
  intro: { say: "O-O — by the Bd2-first move order White castles short, declining the opposite-castling fight. Your b4-bishop keeps the c3-knight pinned while you build the standard …Qa5 setup: c6-pawn screening your queen, bishop active on f5, …Nbd7 and …O-O to come. With kings on the same side it becomes a maneuvering battle — you have the typical resources of …c5 or …Bxc3 followed by play on the queenside.", sayShort: "Both castle short — a maneuvering game" },
  sources: ['concept:pos-king-safety', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N461: SublineNarration = {
  intro: { say: "a3 — reached via the Bd2-first order, it's the same central tension: White hits your b4-bishop that pins the c3-knight. Your structure — queen on a5, c6-pawn guarding it, bishop active on f5 — is the classic …Qa5 main line, and capturing on c3 doubles White's pawns. Whether you trade or retreat, head for …Nbd7, …O-O-O or …O-O, and pressure the long-term weakness of White's queenside.", sayShort: "a3 prods …Bb4 in …Qa5 main line" },
  sources: ['concept:tac-pin', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N462: SublineNarration = {
  intro: { say: "a3 — the same opposite-castling battle by a different move order, with Bd2 played before Bc4. White prods your b4-bishop that pins the c3-knight; capturing on c3 shatters the pawns sheltering his king on c1. You're set up to storm with …b5-b4 while …Nbd7, the c6-pawn and the f5-bishop hold the center and queenside together. The race favors whoever lands first — and your structure points straight at the white king.", sayShort: "…Bxc3 doubles pawns, …b5 storm coming" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N463: SublineNarration = {
  intro: { say: "h3 — reached via the Bd2-first order, White inserts it prophylactically to give the king luft and prevent any …Bg4 pin before castling. Your …Qa5 structure is rock-solid: the c6-pawn screens your queen, the f5-bishop is active outside the chain, and …e6 secures the center. Pin the c3-knight with …Bb4, then …Nbd7, castle, and break with …c5 — the slow h3 just lets you complete development in comfort.", sayShort: "h3 luft — you play …Bb4, …c5" },
  sources: ['concept:pos-king-safety', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Scandinavian_Defense'],
};

const N464: SublineNarration = {
  intro: { say: "Bb5 — White pins your c6-knight, the piece that backs up your …d6 lever against the e5-pawn. Break it with …Bd7, or just play …dxe5 and dissolve his centre into the lone isolated d4-pawn. With the b6 or d5 outpost waiting for your knights, fear nothing — you've got a clear structural target.", sayShort: "Break the pin, dissolve into the isolani" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N465: SublineNarration = {
  intro: { say: "Bb5 — instead of dropping to b3, White pins your c6-knight that supports the …d6 break against e5. Stay unbothered: …Bd7 or …dxe5 untangles you, and your b6-knight already pressures c4 and d5. Trade into the structure where White's lone isolated d4-pawn is your target.", sayShort: "Break with …d6, exploit the isolani" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N466: SublineNarration = {
  intro: { say: "Bxf7+ — White lashes out, but against your developed setup it's unsound speculation. Take it: …Kxf7 leaves your king safe enough and you a whole piece up for one pawn, with your b6- and c6-knights covering the centre and the isolated d4-pawn already weak. There's no follow-up storm — consolidate with …e6, then …Be7 and …Kg8, and keep the extra piece.", sayShort: "…Kxf7 grabs the piece; the sac is unsound" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N467: SublineNarration = {
  intro: { say: "Nc3 — White offers to trade off your well-placed d5-knight in the isolated queen pawn structure. Allow it happily: …Nxc3 doubles his pawns, or …d6 keeps striking the e5-pawn while your c6-knight presses d4. Either way that lone d4-pawn stays the chronic weakness you play against.", sayShort: "Allow the trade, the d4 pawn stays weak" },
  sources: ['concept:pawn-isolated', 'concept:pawn-doubled', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N468: SublineNarration = {
  intro: { say: "exd6 — White releases the central tension, dissolving the e5-spearhead and leaving the isolated d4-pawn behind. Recapture on d6 with comfortable development and a clear target, or play …a6 first to take b5 from his pieces. With the e5-wedge gone, the lone d4-pawn is the fixed weakness you target.", sayShort: "Recapture d6, the d4 isolani remains" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N469: SublineNarration = {
  intro: { say: "Be2 — solid but passive, so finish developing with …Nc6 and add a third piece against the d4-pawn. After the queen recapture you've gained time and stand harmoniously while his e2-bishop does nothing for the centre. Develop, castle, and lean on the isolated d4-pawn.", sayShort: "…Nc6 develops, third hit on d4" },
  sources: ['concept:pos-development', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N470: SublineNarration = {
  intro: { say: "Be3 — White overprotects the d4-pawn, but after …cxd4 cxd4 the isolated queen pawn is fully exposed. Play …Nc6 to add a piece to the blockade, with the d5-square waiting for your knight or queen. With your queen already developed from the early recapture, you're a tempo up on a standard IQP middlegame.", sayShort: "…cxd4 fixes it, …Nc6 blockades" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N471: SublineNarration = {
  intro: { say: "…Qxd5 — your recapture gives free, tempo-rich development, and White's only way to defend d4 and support c4 is the awkward Na3 on the rim. Answer …Nc6, piling a third attacker on d4 and ignoring the offside knight. Smooth piece play against a clumsy white setup is the whole point.", sayShort: "…Nc6 hits d4; Na3 sits offside" },
  sources: ['concept:pos-development', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N472: SublineNarration = {
  intro: { say: "Nf3 — a transposition into your …Qxd5 main line, where White again resorts to the awkward Na3 to defend d4 and prepare c4. Develop smoothly with …Nf6, …e6 and …Nc6, the last adding a third attacker to d4 while the offside a3-knight does little. The free development from your queen recapture leaves you a tempo ahead.", sayShort: "…Nc6 piles on d4; Na3 is offside" },
  sources: ['concept:pos-development', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N473: SublineNarration = {
  intro: { say: "Rc1 — a textbook IQP middlegame: after the …cxd4 trade White nurses the isolated d4-pawn and swings the rook to the half-open c-file for activity. You've got the structure under control, queen on d6 eyeing d4 and the c6-knight ready to hop into the d5-blockade. Trade his active pieces and convert the long-term weakness of the lone d4-pawn.", sayShort: "Blockade d5, neutralise the c-file rook" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N474: SublineNarration = {
  intro: { say: "Re1 — a standard IQP try, backing a future d4-d5 break and piling on the e-file. You've castled safely with your queen still active and the structure clamped; play …Nc6 and …cxd4 to trade into a clean isolani target. His rook supports activity, but the lone d4-pawn stays the long-term liability.", sayShort: "Castle safely, neutralise the e-file lift" },
  sources: ['concept:pawn-isolated', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N475: SublineNarration = {
  intro: { say: "c4 — White kicks your queen off d5 and grabs a broad pawn front with c4 and d4. Retreat with tempo to safety and notice the advance has voided d4's protection and left a backward d-pawn once …cxd4 follows. Keep pressing the d4-pawn and the d5-square, now against a looser white centre.", sayShort: "Retreat with tempo, target d4 and d5" },
  sources: ['concept:pawn-backward', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N476: SublineNarration = {
  intro: { say: "d4 — a sharp move order: the centre liquidates, you recapture …Qxd5 with tempo, then strike …e5 against the d4-pawn. After Nc3, play …Bb4 to pin the c3-knight that defends d4 and threaten to crack the support of the isolated pawn. Your …e5 plus the …Bb4 pin turns White's centre into a target straight out of the opening.", sayShort: "…e5 and …Bb4 pin pressure the d4 pawn" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N477: SublineNarration = {
  intro: { say: "e5 — White declines on d5 and locks a closed French-style centre, d4-e5 against d5. Clamp the queenside with …c4 and storm …a6-a5-a4, prying open the b-file against his pawn chain while your c4-pawn freezes his queenside. With the centre locked, the wing race favours the side that struck first — that's you, so be the aggressor.", sayShort: "Clamp …c4, storm …a5-a4 on the wing" },
  sources: ['concept:att-queenside-attack', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N478: SublineNarration = {
  intro: { say: "h3 — White gives the king luft and stops …Bg4 before committing in the IQP middlegame. You're fully developed and castled, queen already active from the early recapture, so play …Nc6 and …cxd4 to fix the lone d4-pawn as your target. The quiet h3 just hands you a free move to organise the blockade.", sayShort: "…Nc6 and …cxd4, fix the isolani" },
  sources: ['concept:pawn-isolated', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N479: SublineNarration = {
  intro: { say: "Bd3 — White redeploys to confront your active f5-knight and reinforce the kingside. Hold the knight or trade it favourably, then run the standard plan against the French-Advance chain: …cxd4 to open lines, …Qb6 to hit d4 and b2, and …Be7 to finish developing. Pressure on the d4-pawn at the base of the chain is your constant.", sayShort: "…cxd4 break, …Qb6 hits the base" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N480: SublineNarration = {
  intro: { say: "Be3 — in this French-Advance structure, White's d4-e5 chain faces your d5-e6, and the bishop steps in to guard d4 and challenge your f5-knight. You've rerouted that knight to f5 where it pressures d4 and e3. Play the …cxd4 break and pile on the d4-pawn, with …Qb6 and …Be7 to follow.", sayShort: "…Nf5 hits d4, prepare the …cxd4 break" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N481: SublineNarration = {
  intro: { say: "Bg5 — in the French-Advance structure White eyes e7 and probes your kingside knight routing. Carry on calmly: …Qb6 or …Be7 challenges the bishop while your f5-knight keeps biting d4 and e3. The …cxd4 break followed by pressure on the d4-pawn is your reliable counterplay against the chain.", sayShort: "…Nf5 stays put, prepare …cxd4" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N482: SublineNarration = {
  intro: { say: "Nbd2 — White heads for b3 or f3 to bolster d4 in the French-Advance structure. Continue with …cxd4 to open the c-file and …Qb6, ganging up on the d4-pawn at the base of the chain while your f5-knight pressures d4 and e3. Undermining d4 carries your counterplay.", sayShort: "…cxd4, …Qb6, gang up on d4" },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N483: SublineNarration = {
  intro: { say: "a3 — a quiet move ruling out your …Bb4 and …Nb4 ideas before White commits the queenside. Just proceed with the thematic plan: …cxd4 to chip at the chain, …Qb6 to pressure d4 and b2, and …Be7 to develop, with your f5-knight a thorn in front of e5. His slow move gives you free time to organise the …cxd4 break.", sayShort: "Free tempo; play …cxd4 and …Qb6" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N484: SublineNarration = {
  intro: { say: "b3 — White prepares to fianchetto the c1-bishop to b2, reinforcing d4 along the long dark diagonal in the French-Advance chain. Press on with the …cxd4 break and …Qb6, hitting both the d4-pawn and the b2-point the bishop will occupy. Your f5-knight keeps gnawing d4 and e3, and your counterplay flows from pressure on the chain's base.", sayShort: "…cxd4 and …Qb6 strike the base" },
  sources: ['concept:pawn-chain', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N485: SublineNarration = {
  intro: { say: "dxc5 — White surrenders the d4-strongpoint to grab the c5-pawn for now. Recapture comfortably with …Bxc5; dissolving the d4-pawn frees your pieces and your c6-knight, leaving your f5-knight ideally posted in front of e5. Trading his space concession into active piece play suits you.", sayShort: "…Bxc5 regains it, free piece play" },
  sources: ['concept:pos-development', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N486: SublineNarration = {
  intro: { say: "…exd5 — your recapture leaves a symmetrical isolani structure, your d5-pawn against his d4. Grab queenside space with …c4, locking the chain and clamping b3, then …a6 to put the question to the b5-bishop. With the centre fixed, play shifts to the wings where your …c4 wedge hands you a pleasant space edge and a clear queenside target.", sayShort: "Lock with …c4, gain queenside space" },
  sources: ['concept:pawn-isolated', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N487: SublineNarration = {
  intro: { say: "g4 — White lunges to chase your strong f5-knight, but it seriously weakens the king he just castled toward. Retreat to h4 or e7 and note the gaping light squares around his king; …h5 can prise open the kingside while your d7-bishop eyes the long light diagonal. The …cxd4 break still looms, and now his king has no shelter.", sayShort: "Retreat the knight; g4 wrecks White's king" },
  sources: ['concept:pos-king-safety', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N488: SublineNarration = {
  intro: { say: "h3 — White denies …Ng4 and gives the king luft in the French-Advance chain. Ignore it and press the standard plan: …cxd4 to open lines, …Qb6 to hit d4 and b2, your f5-knight gnawing d4 and e3. The quiet h3 just gifts you a free tempo to prepare the break against the d4-pawn.", sayShort: "Free tempo; …cxd4 hits the base" },
  sources: ['concept:pawn-chain', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N489: SublineNarration = {
  intro: { say: "Bb5 — White pins your c6-knight that presses the d4-pawn. Break the pin and keep the pressure with …Bd7 or …a6, since that knight's job is to harass d4 at the base of his chain. Your g7-bishop already bears down on e5 — your whole plan is to liquidate White's broad centre, not respect it.", sayShort: "Break the pin, keep hitting d4" },
  sources: ['concept:tac-pin', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N490: SublineNarration = {
  intro: { say: "Bd3 — White supports the centre and aims at the kingside in the fianchetto line, but strike first. …g5-g4 levers open lines and drives the f3-knight, loosening his grip on e5 while your g7-bishop rakes the long diagonal. This committal pawn storm undermines White's broad centre before it becomes a battering ram.", sayShort: "…g5-g4 storms, evict the f3-knight" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N491: SublineNarration = {
  intro: { say: "Bd3 — White clamps the centre with d4-e5 and develops to support the advance and eye the kingside. Route your knight via h6 toward f5, where it bites d4 and e3, while your g7-bishop pressures the long diagonal behind the e5-pawn. Play …Nf5, then undermine e5 with …f6 or a queenside break to crack his broad centre.", sayShort: "…Nh6-f5 to bite d4, undermine e5" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N492: SublineNarration = {
  intro: { say: "Be3 — White guards the d4-pawn at the base of the chain, but you're already storming. …g5-g4 levers open the kingside and chases the f3-knight, loosening the e5-pawn while your g7-bishop rakes the long diagonal toward it. Cracking White's broad centre with your wing pawns is the throughline of the fianchetto setup.", sayShort: "…g5-g4 storm, loosen e5" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N493: SublineNarration = {
  intro: { say: "Be3 — White bolsters the d4-pawn at the base of the d4-e5 chain. Your setup is harmonious: the g7-bishop rakes the long diagonal at the e5-pawn, the c6-knight presses d4, and …Nh6-f5 or …f6 is coming to undermine his centre. Chip away at e5 and d4 rather than let White play with a free hand and his space.", sayShort: "Pressure e5 and d4, route …Nf5" },
  sources: ['concept:pawn-chain', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N494: SublineNarration = {
  intro: { say: "Nf3 — against your fianchetto White builds a big pawn centre, locking d4-e5 versus d5. Your g7-bishop bites the long diagonal, so play the …g5-g4 lever to evict the f3-knight, loosening his grip on e5 and opening lines toward his king. This is a committal kingside pawn storm — undermine the e5-spearhead and the centre cracks.", sayShort: "Storm with …g5-g4, evict the f3-knight" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N495: SublineNarration = {
  intro: { say: "f4 — White bolsters the e5-wedge with a third pawn, building a broad d4-e5-f4 front. Crack it at the weak link: …g5 strikes f4, and after the tension resolves …g4 peels the support away, leaving the e5- and d4-pawns to wither under your g7-bishop's glare on the long diagonal.", sayShort: "f4 — …g5 cracks the wedge." },
  sources: ['concept:pawn-chain', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N496: SublineNarration = {
  intro: { say: "f4 — White props up the e5-pawn into a stonewall-style centre, but it weakens his king's cover. Strike back at once with …g5, hitting f4 and prying the centre open; if he takes, the g-file and long diagonal blaze open for your g7-bishop and rook. The …g5 lever turns his space into an exposed shell.", sayShort: "…g5 cracks f4, open lines for the bishop" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N497: SublineNarration = {
  intro: { say: "h3 — White tries to forestall your …g4 lever, but storm regardless: …g5-g4, and after hxg4 the h-file opens toward his king. Your g7-bishop bears down the long diagonal at e5, and prising open the kingside while White is still uncastled is exactly your aim. Undermine the e5-pawn at the head of the chain.", sayShort: "…g5-g4 anyway, open the h-file" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N498: SublineNarration = {
  intro: { say: "h3 — White stops …Bg4 and …g4 ideas, but it costs a tempo and weakens his kingside light squares. Storm anyway with …g5, intending …g4 to lever f3 and undermine the e5-pawn; with your g7-bishop on the long diagonal, opening files favours you. Break at the head of White's chain first.", sayShort: "…g5-g4 storm, undermine e5" },
  sources: ['concept:att-kingside-storm', 'concept:pawn-fianchetto', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N499: SublineNarration = {
  intro: { say: "Bb5 — the same idea by a different move order, White's knight already on f3 before recapturing on d4. The pin leans on your c6-knight that braces the …d6 strike at e5, but your b6-knight and the pressure on the lone d4-pawn give you the comfortable side. Liquidate the e5-pawn and blockade on d5 — that's the throughline.", sayShort: "Same plan: …d6 break, blockade d5" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N500: SublineNarration = {
  intro: { say: "Bxf7+ — the same lunge reached with Nf3 inserted before the d4-recapture, and just as unsound. Take it: …Kxf7 banks the piece for a pawn, and with your b6- and c6-knights guarding the centre and the d4-pawn isolated, White has no attack. Walk your king to safety and convert the material edge.", sayShort: "…Kxf7 wins the piece, no attack" },
  sources: ['concept:tac-sacrifice', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N501: SublineNarration = {
  intro: { say: "…e5 — hit back in the centre, and meet Bb5 by clamping with …c4 and advancing …e4. Your …c4 wedge locks his queenside and …e4 evicts the f3-knight, grabbing central space while his b5-bishop finds no real target once the pin is broken. Your early queen recapture funds this energetic central expansion.", sayShort: "…c4 and …e4 seize central space" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N502: SublineNarration = {
  intro: { say: "…e5 — answer the IQP plan, and against the modest Be2 expand with …c4 and …e4. Your …c4 wedge clamps his queenside and …e4 drives the f3-knight back, gaining central space and the initiative while his e2-bishop stays passive. The early …Qxd5 and …e5 fund this aggressive central push.", sayShort: "…c4 clamps, …e4 grabs space" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N503: SublineNarration = {
  intro: { say: "…e5 — answer the IQP plan with the central counterstrike, and after Be3 grab queenside space and momentum with …c4 and …e4. Your …c4 wedge clamps his queenside while …e4 kicks the f3-knight and seizes central space, leaving White cramped and reactive. The early …Qxd5 bought the time for this aggressive central expansion.", sayShort: "…c4 clamps, …e4 kicks the knight" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N504: SublineNarration = {
  intro: { say: "…e5 — meet the isolated queen pawn plan with the central thrust, and against the awkward Na3 grab space with …c4 and …e4. Your …c4 wedge traps his offside a3-knight out of play and …e4 evicts the f3-knight, leaving White cramped on both wings. The early …Qxd5 and …e5 power this aggressive central and queenside expansion.", sayShort: "…c4 traps Na3, …e4 grabs the centre" },
  sources: ['concept:pos-space', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N505: SublineNarration = {
  intro: { say: "Nxe5 — White grabs your …e5-pawn, but you have compensation: after …Nxe5 dxe5 your queen on d5 sits actively and …c4 grabs queenside space, while his e5-pawn becomes a target, not a strength. Play …c4 and …a6 to clamp and expand before reclaiming or pressuring the pawn. Your lead in piece activity offsets the temporary material.", sayShort: "…c4 clamps; the e5-pawn becomes a target" },
  sources: ['concept:pos-initiative', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N506: SublineNarration = {
  intro: { say: "…e5 — meet the IQP plan head-on, and after White's c4 hits your queen, ram …e4 and …e3 deep into his position. Your …e3 wedge fractures his kingside pawns and obstructs his c1- and f1-bishops, handing you a dangerous protected runner. The whole point of the early …Qxd5 and …e5 is this sharp central pawn lunge.", sayShort: "Ram …e5-e4-e3, wedge into White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N507: SublineNarration = {
  intro: { say: "dxc5 — White forces an early queen trade, and after Qxd1+ Kxd1 his king is dragged to d1 with castling rights gone. Win the c5-pawn back at leisure with …a6 and …Bxc5 or …Qxc5, while his displaced king stays a long-term endgame liability. Trading queens into a structure where White's king is stuck in the centre is comfortable for you.", sayShort: "Queens off; White's king stuck on d1" },
  sources: ['concept:pos-king-safety', 'concept:end-opposition', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N508: SublineNarration = {
  intro: { say: "Bb3 — after the …Nf6 line White grabbed the centre with e5 and an isolated d4-pawn, and the c4-bishop retreats once your knight reroutes to b6. You've already struck the e5-wedge with …d6, and your knights on b6 and c6 train on d4 while his b3-bishop eyes an empty f7 diagonal. Liquidate e5, complete development with …Bg4 and …e6, and leave White nursing the lone d4-pawn.", sayShort: "Hit e5 with …d6, target d4" },
  sources: ['concept:pawn-isolated', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N509: SublineNarration = {
  intro: { say: "Bb5+ — White checks before regaining the pawn, so block with …Nbd7 and keep your d5-pawn for now. With …a6, …c4 and …a5 grab queenside space and fix the structure, daring his b5-bishop to declare itself. Your …c4 wedge clamps b3 and gives you a durable space advantage where White has overextended.", sayShort: "…c4 wedge, queenside space and clamp" },
  sources: ['concept:pos-space', 'concept:pawn-chain', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N510: SublineNarration = {
  intro: { say: "Bb5+ — White checks instead of recapturing on d4. Answer …Bd7, then drive the passed pawn …d4-d3-d2+, jamming a wedge deep in his camp. Your d2-pawn checks on the back rank and freezes his queenside, tangling his c1-bishop and b1-knight around it. Use the advanced runner as a thorn while you complete development behind it.", sayShort: "Push the passer to d2+, jam White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N511: SublineNarration = {
  intro: { say: "Bb5 — White pins your c6-knight in the isolated queen pawn structure, hoping to trade and weaken your grip on d4. Break the pin with …Bd7 and keep your knights on c6 and d5 blockading and pressing the lone d4-pawn. Whatever White trades, the IQP stays his standing weakness.", sayShort: "Unpin with …Bd7, blockade d5" },
  sources: ['concept:tac-pin', 'concept:pawn-isolated', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N512: SublineNarration = {
  intro: { say: "Bc4 — White hits your d5-knight and eyes f7 in the isolated queen pawn structure. You're well placed: your knights on d5 and c6 blockade and pressure the lone d4-pawn, and …e6 shores up the d5-outpost without conceding the f7-diagonal. Exchange his active pieces and the isolani stays the standing weakness.", sayShort: "…e6 holds d5, press the isolated pawn" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N513: SublineNarration = {
  intro: { say: "Nc3 — White accepts the isolated d4-pawn and attacks your d5-knight. Swing the bishop to b4 to pin that knight against his king on e1, doubling the pressure on c3 before he can untangle. With …e6 already in, your d5-knight is solid — blockade the isolani and trade pieces, which only sharpens the weakness of the lone d4-pawn.", sayShort: "Bishop pins c3, blockade the d4 isolani" },
  sources: ['concept:pawn-isolated', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N514: SublineNarration = {
  intro: { say: "Nc3 — White challenges your strong d5-knight, trying to make something of the isolated d4-pawn. You're fully mobilised: knights on c6 and d5 grip the central light squares and your d5-knight blockades the isolani head-on. Trade minor pieces and press the lone d4-pawn — the standard recipe against an IQP, and you hold the structural trump.", sayShort: "Blockade d5, press the isolated pawn" },
  sources: ['concept:pawn-isolated', 'concept:pos-outpost', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N515: SublineNarration = {
  intro: { say: "Nf3 — White lets you regain the pawn with …Nxd5, but after …cxd4 shove the passer instead: …d4-d3-d2+, ramming a wedge to the back rank. Your d2-pawn checks his king and freezes his c1-bishop and b1-knight, tying the queenside in knots. Play around the advanced thorn, finishing development while White untangles.", sayShort: "Run the passer to d2+, freeze White" },
  sources: ['concept:pawn-passed', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N516: SublineNarration = {
  intro: { say: "Qa4+ — White grabs your d5-pawn with a check, then Qb3, but the queen ends up exposed and chasing pawns. Block with …Nbd7, fianchetto with …g6, and gain queenside space with …c4, hitting his b3-queen and clamping the position. Then …g5 expands on the kingside — his greedy queen excursion cost development and handed you a free hand.", sayShort: "Harass the b3-queen, gain space with …c4" },
  sources: ['concept:pos-development', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Alapin_Variation'],
};

const N517: SublineNarration = {
  intro: { say: "Bb5+ — the Moscow Variation, White sidestepping the open Sicilian with a check on move three. Block with …Bd7; after the trade your queen recaptures and you've swapped off White's good bishop for nothing. Develop naturally with …Nc6, …g6 or …e6 and you reach a sound, slightly easier Sicilian with the bishop pair already simplified away.", sayShort: "Bb5+ — …Bd7, trade off his bishop." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Moscow_Variation'],
};

const N518: SublineNarration = {
  intro: { say: "Bg5 — in this Soltis position White pins your f6-knight, the defender of the h5-pawn and the e4/d5 squares, prepping Nd5 or f4 to soften your kingside. You've got …h5 already keeping the kingside shut, so race on the queenside: …Rc4 or …Rxc3, …Qa5 and …b5. He's spent a tempo on the pin, and your …Rxc3 exchange sac smashes the c1-king's cover faster than his attack arrives.", sayShort: "Bg5 pin — race on the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:tac-pin', 'concept:att-exchange-sac'],
};

const N519: SublineNarration = {
  intro: { say: "Bh6 — the Soltis main line of the Yugoslav, where White hunts your g7 Dragon bishop, the dark-square defender and soul of your counterattack. Answer …Bxh6 and after Qxh6 keep fighting: your …h5-pawn has frozen White's h-pawn, so the kingside can't be ripped open by h5xg6. Crash through first with …Rxc3 and …Qa5, …b5 against the c1-king before his pieces reach the h-file and g7.", sayShort: "Bh6 swaps your Dragon bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-exchange-sac', 'concept:pos-king-safety'],
};

const N520: SublineNarration = {
  intro: { say: "Nde2 — you've already played …Nc4 and after Bxc4 …Rxc4 your rook sits active on c4, raking the half-open c-file and eyeing e4; now White's knight retreats to overprotect c3 and reroute toward the kingside. You've swapped off his light-squared bishop, easing the heat on your king. Drive …b5-b4 and …Qa5 to crash the c-file against the b1-king, …Be6 to trade his last bishop, with the ever-present …Rxc3 break waiting.", sayShort: "…Rxc4 active — drive …b5-b4 in" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-open-file', 'concept:att-queenside-attack'],
};

const N521: SublineNarration = {
  intro: { say: "O-O-O — the Yugoslav tabiya. White's castled queenside, primed for h4-h5 to pry open your kingside while you sit short-castled behind the g7-bishop. Both kings opposite, so it's a pure pawn-storm race: play …Rc8, …Ne5 and …Nc4 or the …Rxc3 exchange sac to smash his queenside cover, with …a6 and …b5 opening lines at the c1-king before the h-file opens against yours.", sayShort: "Yugoslav Attack — opposite-side race" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-exchange-sac'],
};

const N522: SublineNarration = {
  intro: { say: "Qxd4 — White recaptures with the queen instead of the knight, hoping to develop fast with c4 in a Maroczy-style bind. Hit the queen with tempo: …Nc6 forces it to commit, and after Bb5 calmly block with …Bd7, ready to trade and untangle. You equalise by chasing the early queen and finishing development at no cost.", sayShort: "Qxd4 — …Nc6 hits the queen with tempo." },
  beats: [
    { atMove: 7, say: "…Nc6 — developing with a gain of tempo, the knight jabbing the exposed queen. White must move it again, and every queen move is a move you're not wasting. This is why the early Qxd4 is harmless: Black develops naturally while White shuffles his most valuable piece.", sayShort: "…Nc6 — hit the queen, develop free.", arrows: [A('c6','d4','rgba(40,185,95,0.92)')], highlights: [H('d4','rgba(40,185,95,0.92)')] },
  ],
  sources: ['concept:pos-development', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Sicilian_Defence'],
};

const N523: SublineNarration = {
  intro: { say: "c3 — the Alapin-flavoured Anti-Sicilian, White building a d4-pawn centre on the cheap. Don't let him have it free: your …Nf6 pressures e4, and …g6 with …Bg7 fianchettoes onto the long diagonal, eyeing the centre. Aim your …d5 or …Bg4 break to undermine d4, reaching a comfortable game where his slow setup gives you no trouble.", sayShort: "c3 — …Nf6, fianchetto, hit the centre." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Alapin_Variation'],
};

const N524: SublineNarration = {
  intro: { say: "f3 — paired with an early c4, White angles for a Maroczy bind, clamping d5 and e4. Don't let yourself be squeezed: your …e5 grabs the centre, …Be6 pressures the queenside, and the powerful …d5 break blows the position open before the bind can solidify. Striking the centre is your antidote to the flank clamp — and here it equalises cleanly.", sayShort: "c4 — …d5 break shatters the bind." },
  beats: [
    { atMove: 13, say: "…d5! — the thematic central break that refutes the bind. White's c4 and e4 pawns are challenged head-on; if cxd5 then …Bxb3 and …Nxd5 leaves Black perfectly placed. The lesson is permanent: answer a flank clamp by striking the centre, and the clamp dissolves.", sayShort: "…d5 — break the Maroczy bind.", arrows: [A('d5','c4','rgba(40,185,95,0.92)'), A('d5','e4','rgba(40,185,95,0.92)')], highlights: [H('d5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N525: SublineNarration = {
  intro: { say: "g4 — in this Soltis structure you've locked the kingside with …h5, so White plays g4 to pry it open with gxh5 and a file for the rooks and queen at your king. Answer …hxg4 or …Nxg4, keeping your king's cover intact and trading down his attackers. Stay in the race: …Rxc3 and …Qa5 with …b5 to break the c1-king's shelter, leaning on the g7-bishop and the c-file faster than his h- and g-file assault.", sayShort: "g4 pries open the locked kingside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-exchange-sac'],
};

const N526: SublineNarration = {
  intro: { say: "Be2 — the Classical Dragon: White develops modestly rather than the sharp Yugoslav f3 and Be3, aiming to castle short and play a quieter positional game. With both kings heading kingside, the venom of opposite-side storms is gone. Keep your Dragon machine running: …O-O, …Nc6, …Bd7 and …Rc8 with …Ne5 or …a6 and …b5, using the long-diagonal bishop and c-file pressure to fight for the centre and the d4-square.", sayShort: "Classical Dragon — quieter, both castle short" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N527: SublineNarration = {
  intro: { say: "Kb1 — the prophylactic king-tuck of the Yugoslav Soltis line, stepping off the c-file and the a7-g1 diagonal to blunt your …Rxc3 and …Qa5 before White presses the kingside. You've got the kingside locked with …h5 and the knight on e5, so push on: …Nc4 hits the queen and bishop, then …Rxc3 exchange sac and …b5-b4 to tear open the queenside, racing the b1-king even with the tempo he's spent.", sayShort: "Kb1 prophylaxis — push …Nc4, …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-prophylaxis', 'concept:att-queenside-attack'],
};

const N528: SublineNarration = {
  intro: { say: "g3 — White meets your Dragon with a restrained mirror fianchetto, contesting the long light diagonal and blunting your g7-bishop with a bishop on g2. It's a quiet positional line, not a storm. Develop naturally: …Nc6 hits d4, then …Bg7, …O-O and …Bd7 with …Rc8 or …a6 and …Nxd4, fighting for the centre and the c-file. With no opposite-side attack, aim for comfortable equality and the standard …b5 or …d5 freeing breaks.", sayShort: "g3 fianchetto — quiet positional Dragon" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N529: SublineNarration = {
  intro: { say: "g4 — White flings the g-pawn before castling, an aggressive Yugoslav move-order intending h4-h5 and g5 to blow open your kingside fast. Generate counterplay immediately on the other wing: …Rc8, …Ne5 and …Nc4 to harass his pieces, …a6 and …b5 to pry open the queenside, and the standard …Rxc3 exchange sac — striking at his king before the g- and h-pawns crash through against your fianchettoed king.", sayShort: "Early g4 storm — counter fast queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-exchange-sac'],
};

const N530: SublineNarration = {
  intro: { say: "h4 — White launches the h-pawn before castling long, the most direct Yugoslav try; h4-h5 aims to rip open the h-file and the g6-square in front of your king. Counterstrike on the queenside without delay: …Rc8, …Ne5 hitting the c4-bishop, …h5 to jam his h-pawn, and the …Rxc3 exchange sac with …Qa5 and …b5 to break through on the queenside before the h-file opens against the g7-bishop's king.", sayShort: "h4 storm — counter on the queenside" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-kingside-storm', 'concept:att-queenside-attack'],
};

const N531: SublineNarration = {
  intro: { say: "Bc4 — White's bishop eyes f7 and the a2-g8 diagonal, often a prelude to the Yugoslav or a quick attacking setup. Complete the fianchetto with …Bg7, putting your bishop on its dominant diagonal. Then …O-O, …Nc6 or …a6 and …b5 to challenge the c4-bishop with tempo, …Bd7 and …Rc8 for the c-file, generating the usual Dragon counterplay against his king once both sides commit.", sayShort: "Bc4 setup — …b5 will hit the bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N532: SublineNarration = {
  intro: { say: "Be3 — White signals the dreaded Yugoslav Attack, intending f3, Qd2, O-O-O and a pawn storm with h4-h5 and g4. Your fianchettoed bishop on g7 rakes the long diagonal toward d4 and b2, the engine of all your counterplay. Castle, play …Nc6, …Bd7 and …Rc8, then race down the c-file with the …Rxc3 exchange sac and queenside pressure before his kingside avalanche lands.", sayShort: "Dragon bishop eyes the long diagonal" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:att-queenside-attack'],
};

const N533: SublineNarration = {
  intro: { say: "Qd2 — a Classical Dragon where White connects rooks and eyes Bh6 to trade your powerful g7-bishop. Both kings sit safe on the kingside, so it's a positional middlegame, not a storm race. Meet Bh6 with …Bxh6 only when it favours you, play …Rc8 and …a6-a5 to expand and pressure the b3-knight, and look to …Na5 or …Nd7-e5 outposts and the c-file for active piece play.", sayShort: "Classical Qd2 — guard the g7 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-development', 'concept:pos-king-safety'],
};

const N534: SublineNarration = {
  intro: { say: "f3 — a Classical Dragon where White's castled short and played Nb3, a solid setup with no opposite-side storm; the f3-pawn guards e4 and the g4-square. You're developed harmoniously, …Be6 controlling key light squares and …Nc6 pressuring d4. Play …Rc8 and …a6-a5 to gain queenside space and harass the b3-knight, …Na5 or …Ne5 for an outpost, and maneuver patiently — the g7-bishop and c-file pressure give comfortable equality.", sayShort: "Classical f3 — …Rc8 and …a5 space" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N535: SublineNarration = {
  intro: { say: "Bc4 — this Levenfish line with f4 and the trade on c6 left you doubled c-pawns but the half-open b-file and the bishop pair, and now White develops aggressively toward f7. You're solid and ready to fight for the centre: …Bg7 finishes the fianchetto, …O-O, then …d5 striking the centre and opening lines for your bishops, or …Rb8 to exploit the b-file — using dark-square control and the central break to punish his loosening f4-push.", sayShort: "Levenfish Bc4 — …d5 hits the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-center'],
};

const N536: SublineNarration = {
  intro: { say: "Bd3 — the Levenfish Attack with an early f4: White grabbed space and traded on c6, giving you doubled c-pawns but a half-open b-file and a strong centre, and now the bishop eyes your kingside. After …bxc6 your structure is compact. Play …Bg7 to finish the fianchetto, …O-O, then …d5 or …Rb8 — using the open b-file, the bishop pair on the long diagonals, and the central …d5 break to exploit his loosened f4-advance and overextended kingside.", sayShort: "Levenfish — …bxc6 and …d5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-open-file'],
};

const N537: SublineNarration = {
  intro: { say: "Be3 — this Levenfish line with f4 traded on c6 and now develops, leaving you doubled c-pawns but the open b-file and the bishop pair. Your structure is compact and ready for central action: …Bg7 completes the fianchetto, …O-O, then the …d5 break to hit his centre and free your bishops, or …Rb8 and …Qa5 to exploit the half-open b-file — turning the structural concession into dynamic dark-square play against his overextended f4-pawn.", sayShort: "Levenfish Be3 — …d5 and b-file play" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-doubled', 'concept:pos-open-file'],
};

const N538: SublineNarration = {
  intro: { say: "Qd2 — a Maroczy Bind where White connects rooks and prepares Bh6 to challenge your strong g7-bishop while the c4-e4 clamp holds. You're cramped but solid behind the fianchetto: play …Bd7 and …a6 with …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to pressure e4, and meet Bh6 by keeping the dark-squared bishop where it matters — building patiently toward the …b5 break that escapes the bind.", sayShort: "Maroczy Qd2 — hold the g7 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-development'],
};

const N539: SublineNarration = {
  intro: { say: "Rc1 — the Maroczy Bind: White's c4 and e4 pawns clamp the d5- and b5-squares, denying you the freeing breaks and the open c-file rush of the Yugoslav, and now the rook overprotects c4 and eyes the half-open file. Settle into the long maneuvering battle: …a6 and …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to challenge e4, and the patient …a5-a4 or freeing …b5 break to escape the bind without losing the dark-square strength of the g7-bishop.", sayShort: "Maroczy Bind — break the clamp" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N540: SublineNarration = {
  intro: { say: "c3 — the Smith-Morra Gambit declined into an open game: White sacrifices the c3-pawn for development, recaptures with the knight and aims the c4-bishop and open c- and d-files at your king. You've taken the extra pawn — shore up with …e6 and …a6, blunting the bishop and preparing …b5 and …d6. Develop carefully: …d6, …Be7, …Nf6, …O-O, neutralising his lead and converting the extra material once your king is safe.", sayShort: "Morra Gambit — develop, hold the pawn" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-open-file'],
};

const N541: SublineNarration = {
  intro: { say: "f3 — a Maroczy Bind where White bolsters e4 early, locking in the c4-e4 space clamp before finishing development. Your g7-bishop anchors the dark squares and you're cramped but sound. Play …O-O, …d6 and …Bd7 with …a6 and …Rc8 to fight for the c-file, …Nxd4 and …Bc6 to pressure e4, and prepare the thematic …b5 break — the move that liberates you from the clamp without surrendering the long-diagonal bishop's strength.", sayShort: "Maroczy f3 — clamp then break …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N542: SublineNarration = {
  intro: { say: "f3 — a Maroczy Bind where White buttresses e4 before completing development, settling into the positional clamp that denies you the …d5 and …b5 breaks. Your g7-bishop holds the dark squares while you sit cramped but resilient. Play …d6, …Bd7 and …a6 with …Rc8 to fight for the c-file, then …Nxd4 and …Bc6 to challenge e4, and build patiently toward the freeing …b5 break that escapes the bind without conceding the dark-square grip.", sayShort: "Maroczy f3 — fight for the c-file" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N543: SublineNarration = {
  intro: { say: "f3 — a Maroczy Bind where White reinforces e4 and the c4-e4 pawns squeeze your position, denying the freeing breaks. Your g7-bishop is your pride, holding the long diagonal. Play the classic anti-Maroczy treatment: …Bd7 and …a6 with …Rc8 for the c-file, …Nxd4 and …Bc6 to challenge the e4-pawn, and the carefully prepared …b5 break — backed by …Qa5 and …Rfc8 — to crack the bind and liberate your pieces before he expands further.", sayShort: "Maroczy f3 — prepare the …b5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pawn-minority-attack'],
};

const N544: SublineNarration = {
  intro: { say: "f3 — another Maroczy Bind setup, the pawn reinforcing e4 and the c4-e4 clamp, settling in for a positional squeeze rather than a Yugoslav storm. You're cramped but solid, the g7-bishop controlling the dark squares. Play …Nxd4 and …Bc6 to pressure e4, …a6 and …Rc8 for the c-file, and the long-prepared …b5 break — supported by …Qa5 and …Rfc8 — to crack the bind and free the position before he expands further on the queenside.", sayShort: "f3 Maroczy — patient …b5 break" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N545: SublineNarration = {
  intro: { say: "f4 — in this Maroczy Bind White grabs more space, intending e5 or f5 to expand on the kingside while his c4-pawn keeps the bind on d5 and b5. Counter before he rolls forward: your …Nxd4 and …Bc6 trade pieces and hit e4, …Rc8 and …a6 contest the c-file, and your …b5 break frees the queenside — leaning on your g7-bishop to keep the dark squares secure against his advance.", sayShort: "Maroczy f4 — trade and break …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-center'],
};

const N546: SublineNarration = {
  intro: { say: "h3 — in this Maroczy Bind White plays a quiet prophylactic move, ruling out …Ng4 and …Bg4 pins and settling in for the long positional squeeze behind the c4-e4 clamp. You're solid with the g7-bishop and harmonious development: play …Rc8 and …a6 to contest the c-file, …Nxd4 and …Bc6 to challenge the e4-pawn, …a5-a4 to gain queenside space and pin down his b-pawn, and the eventual …b5 break to free yourself from the bind.", sayShort: "Maroczy h3 — patient …a5 and …b5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-space', 'concept:pos-prophylaxis'],
};

const N547: SublineNarration = {
  intro: { say: "Bc4 — the Dragadorf, where White sets up the Yugoslav with the bishop aimed at f7 and the a2-g8 diagonal while your …a6 readies the queenside pawn storm. With opposite-side castling looming, it's a sharp race: play …b5 to hit the c4-bishop and gain tempo, …Bb7 raking e4 on the long diagonal, …Nbd7-b6 and …b4 to break open the b- and c-files against his king, racing your assault before his kingside pawns advance.", sayShort: "Dragadorf — …b5 hits the c4 bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:pos-tempo'],
};

const N548: SublineNarration = {
  intro: { say: "Be2 — the classical, restrained Najdorf. White forgoes the pawn storm for quiet development and a slow squeeze on d5. Take your share of the centre with …e5, retreat-proofing the knight to b3, and develop the bishop to e7. The game becomes a strategic battle over the d5-square — and your …a6/…b5 expansion gives full counterplay.", sayShort: "Be2 — …e5 and …Be7, fight for d5." },
  beats: [
    { atMove: 11, say: "…e5 — the central clamp again. The pawn hits d4 and grabs the e5/d4 dark squares; White's knight steps to b3. Now …Be7, …O-O and a timely …b5 give you the standard Najdorf queenside expansion while you keep a wary eye on the d5-hole.", sayShort: "…e5 — clamp the dark squares.", arrows: [A('e5','d4','rgba(40,185,95,0.92)')], highlights: [H('e5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N549: SublineNarration = {
  intro: { say: "Bg5 — the Poisoned Pawn complex, the sharpest forest in the Najdorf. White pins your f6-knight and prepares f4 with a huge initiative. The principled answer is …e6 and the venomous …Qb6, eyeing the b2-pawn and daring White to defend it. Grab the pawn, weather the storm — theory says you survive and emerge a pawn up.", sayShort: "Bg5 — …Qb6 hits the poisoned b2-pawn." },
  beats: [
    { atMove: 13, say: "…Qb6 — the queen leaps out to hit b2 and the d4-knight at once. This is the Poisoned Pawn proper: White must choose between defending b2 passively or sacrificing it for a raging attack. You take it and hold on; the analysis runs thirty moves deep and Black is fine everywhere.", sayShort: "…Qb6 — double-attack b2 and d4.", arrows: [A('b6','b2','rgba(40,185,95,0.92)')], highlights: [H('b2','rgba(40,185,95,0.92)'), H('d4','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:tac-fork', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N550: SublineNarration = {
  intro: { say: "Bh6 — in this Dragadorf White rushes to swap off your fianchettoed g7-bishop, the dark-square guardian and spearhead of your counterattack, before the …a6/…b5 plan rolls. Answer …Bxh6 and after Qxh6 replace that defender with active counterplay: …b5 and …Bb7 on the long diagonal, …Nbd7-b6 and …b4 to chase the c3-knight and crash through on the queenside, racing his pressure on the now-weakened dark squares near your king.", sayShort: "Bh6 swaps the Dragon bishop early" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pos-weak-squares', 'concept:att-queenside-attack'],
};

const N551: SublineNarration = {
  intro: { say: "g4 — a Dragadorf hybrid where White skips queenside castling and storms immediately with g4-g5 to dislodge your f6-knight and open lines at your king. You've played …a6 to prepare the queenside expansion that defines this system, so push on: …b5 and …b4 to chase the c3-knight and rip open the b- and c-files, …Bb7 raking e4 on the long diagonal, and …Nbd7-b6, racing the attack on his still-uncastled king before g5 does damage.", sayShort: "Dragadorf — meet g4 with …b5-b4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-kingside-storm'],
};

const N552: SublineNarration = {
  intro: { say: "g4 — the Dragadorf, a Najdorf-Dragon hybrid where you've already played …a6 and …b5 to open the queenside before White's g4 launches the kingside storm. Both sides are flinging pawns at the enemy king in a sharp opposite-castling race: play …b4 to chase the c3-knight and tear open the b- and c-files, …Bb7 raking the long diagonal at e4, and …Nbd7-b6 with rooks to the queenside, betting your attack on the c1-king arrives first.", sayShort: "Dragadorf — …b5-b4 races g4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:att-queenside-attack', 'concept:att-kingside-storm'],
};

const N553: SublineNarration = {
  intro: { say: "h3 — the Adams Attack, a quiet waiting move preparing g4 without allowing …Ng4. Answer in kind: …e5 grabs the centre, the knight tucks to e2, and the cheeky …h5 stops g4 cold in its tracks. White's slow plan is neutralised and you get a comfortable Najdorf with the centre in hand.", sayShort: "h3 — …e5 then …h5 stops g4." },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N554: SublineNarration = {
  intro: { say: "Bb5+ — White tries an offbeat order with Bg5 and this check, hoping to disrupt your development before the g7 Dragon bishop gets to work. Interpose calmly with …Bd7 or …Nbd7, neutralising the check and preparing to castle. Your plan is unchanged: complete development, contest the centre, and let the g7-bishop and …Rc8 c-file pressure generate counterplay — the early Bb5+ commits his bishop without solving your solid setup.", sayShort: "Bb5+ check — interpose and develop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Dragon_Variation', 'concept:pawn-fianchetto', 'concept:pos-development'],
};

const N555: SublineNarration = {
  intro: { say: "Bd3 — a slightly passive square, the bishop eyeing the kingside while White prepares to castle. Your Najdorf wall stands firm: …e5, …Be7, …Be6 guarding d5. Castle, bring the knight to d7, and break with …b5 — his modest bishop placement means you're comfortably equal with the easier middlegame plan.", sayShort: "Bd3 — castle and break …b5." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N556: SublineNarration = {
  intro: { say: "Be2 — White settles for the quiet English-Attack-without-the-storm, developing modestly instead of castling long. Your wall is built: …e5, …Be7, …Be6 nailing d5. Castle, play …Nbd7 and …b5, and you've got a rock-solid Najdorf where the d5-square is the only battleground — and you control its approaches.", sayShort: "Be2 — castle, …b5, contest d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N557: SublineNarration = {
  intro: { say: "Nd5 — White plants the knight on the coveted outpost and offers a trade. Don't fear it: …Bxd5 exchanges the strong knight, and after exd5 your light-squared bishop is gone but so is his best piece, leaving a Boleslavsky-style structure where your dark-square play on the queenside and the half-open c-file give full equality.", sayShort: "Nd5 — trade it; play the dark squares." },
  sources: ['concept:pos-center', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N558: SublineNarration = {
  intro: { say: "g4 — the English Attack storm without Qd2 first, White hurrying the kingside pawns. Your wall is set: …e5, …Be7, …Be6 on d5. Castle into the queenside and counter with …b5, …Nbd7-b6-c4, hammering the c3-knight and the light squares. The Najdorf race is on, and your queenside attack arrives first.", sayShort: "g4 — castle, …b5, race the queenside." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N559: SublineNarration = {
  intro: { say: "g4 — the English Attack's signature pawn storm, White flinging the g-pawn to pry open your king. You've set up perfectly: …e5 and …Be6 hold the centre, the knight sits on d7 ready to reroute. Meet the storm with queenside play — …b5, …Nb6, …Nc4 — and race him. Whoever's attack lands first wins, and yours is usually faster.", sayShort: "g4 — race him with …b5 queenside." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N560: SublineNarration = {
  intro: { say: "Bc4 — the Fischer–Sozin, aiming the bishop straight at f7 and the a2-g8 diagonal. Blunt it the main-line way: …e6 builds a wall on the light squares, and …b5 immediately questions the bishop and gains queenside space. With the diagonal closed and your pawns rolling, the Sozin's bite is drawn and you take over the initiative.", sayShort: "Bc4 — …e6 wall, …b5 gains space." },
  beats: [
    { atMove: 13, say: "…b5 — striking at once before White organises a4. The pawn gains queenside space and threatens …b4 to chase the c3-knight off its post. Combined with …e6 shutting the bishop's diagonal, this is how the Najdorf defuses the Sozin and grabs the initiative on the wing.", sayShort: "…b5 — gain space, threaten …b4.", arrows: [A('b5','b4','rgba(40,185,95,0.92)')], highlights: [H('b5','rgba(255,214,0,0.88)'), H('c3','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N561: SublineNarration = {
  intro: { say: "Be3 — the English Attack, White's most ambitious Najdorf try. He wants f3, Qd2 and a kingside pawn storm. Don't sit and wait: hit the centre with …e5, kicking the d4-knight back and clamping the dark squares, then plant the bishop on e6 to nail down d5. You get the Najdorf's ideal pawn break in first.", sayShort: "Be3 — strike …e5, clamp d5." },
  beats: [
    { atMove: 11, say: "…e5 — the move that defines the Najdorf. The pawn punches at the d4-knight and seizes the dark squares e5 and d4 for good. White's knight must retreat to b3 or e2; meanwhile you free the f8-bishop and prepare …Be6 hitting d5, the square the whole battle revolves around.", sayShort: "…e5 — kick d4, own the dark squares.", arrows: [A('e5','d4','rgba(40,185,95,0.92)')], highlights: [H('e5','rgba(255,214,0,0.88)'), H('d5','rgba(80,140,255,0.32)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N562: SublineNarration = {
  intro: { say: "f3 — the English Attack move order, bracing e4 before Be3. Take the centre immediately with …e5, kicking the knight to b3, then …Be6 to guard d5. You reach the main Najdorf structure where you'll castle and break with …b5, generating queenside play against his long-castled king.", sayShort: "f3 — …e5 and …Be6, then …b5." },
  beats: [
    { atMove: 11, say: "…e5 — staking the centre before White can clamp it. The pawn hits d4, the knight goes to b3, and the e5/d4 dark squares are yours. Next comes …Be6 covering d5 and the thematic …b5 expansion — the heartbeat of every Najdorf.", sayShort: "…e5 — seize the centre.", arrows: [A('e5','d4','rgba(40,185,95,0.92)')], highlights: [H('e5','rgba(255,214,0,0.88)')] },
  ],
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N563: SublineNarration = {
  intro: { say: "Bc4 — White aims the bishop at f7 inside the classical main line after Bg5 and f4. Calmly complete development: …Be7 breaks the pin, …O-O tucks the king away, then …b5 hits the bishop and rolls the queenside. His pieces look menacing, but your solid wall on e6 and timely …b5 neutralise the attack and turn the long-term chances your way.", sayShort: "Bc4 — …Be7, castle, …b5." },
  sources: ['concept:pos-development', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N564: SublineNarration = {
  intro: { say: "Bd3 — after Bg5 and f4, the classical main line, White builds a big centre with the bishop pinning your f6-knight. Break the pin with …Be7; his bishop on d3 invites your …O-O and a later …b5 or …Qc7. Castle, finish development, and prepare your …b5/…Bb7 counter on the long diagonal against his ambitious but loosening setup.", sayShort: "Bg5 f4 — …Be7, castle, then …b5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N565: SublineNarration = {
  intro: { say: "Be2 — after Bg5 and f4, White develops modestly in the classical main line, declining the sharpest tries. Finish the standard setup: …Be7 unpins, …O-O, …Qc7 and …Nbd7, then …b5 and …Bb7 to fight for the long diagonal and e4. With White restrained, you get the classic Najdorf counterplay at no risk.", sayShort: "Be2 — …Be7, castle, …b5 and …Bb7." },
  sources: ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N566: SublineNarration = {
  intro: { say: "Qd2 — the main-line Najdorf, White connecting for queenside castling behind the Bg5/f4 build-up. Complete the classical setup with …Be7 and …O-O, then strike with …b5 and …Bb7, contesting the long diagonal and the e4-pawn. It's the great theoretical battleground where your queenside counterplay races his kingside pawns.", sayShort: "Qd2 — castle, then …b5 and …Bb7." },
  sources: ['concept:pos-center', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N567: SublineNarration = {
  intro: { say: "e5 — the critical thrust in the Bg5/f4 main line, White trying to blow open the centre while you're behind in development. Meet it precisely: …dxe5 fxe5 leaves the e5-pawn loose, or …Nfd7 sidesteps, and after the dust settles your extra centre pawn and his loosened structure favour you. Don't panic — the e5-break is double-edged for him too.", sayShort: "e5 — …dxe5 and exploit the loose pawn." },
  sources: ['concept:pos-center', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N568: SublineNarration = {
  intro: { say: "Be2 — the English Attack handled positionally; instead of charging with g4, White tucks the bishop to e2 and castles short. Your …e5 thrust has already claimed the centre and chased the knight to b3, so d5 is the whole battle: he eyes it, you cover it with the e6-bishop and the f6-knight. Roll out the standard Najdorf queenside expansion, …Nbd7, …b5 and …Nb6, fighting for d5 and gaining space toward his king's eventual home.", sayShort: "English Attack — fight for d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation', 'concept:pos-weak-squares', 'concept:pos-space'],
};

const N569: SublineNarration = {
  intro: { say: "Bg5 — White pins after the f3 setup, pressuring the f6-knight that guards d5. Your structure already answers it: …e5 and …Be6 own the centre and the key light square. Meet the pin with …Be7 and …Nbd7, and if he trades on f6 recapture toward the centre, keeping the d5-square firmly under control.", sayShort: "Bg5 — …Be7, hold d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N570: SublineNarration = {
  intro: { say: "Nde2 — after f3, White reroutes the knight toward g3 to bear down on your d5- and f5-squares. Meet it with the standard wall: your …e5 staked the centre, now …Be6 guards d5 head-on. Continue …Nbd7, …b5 and …Nb6, fighting him for that one outpost — the entire strategic point of your whole Najdorf structure.", sayShort: "f3 — …Be6 guards d5." },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N571: SublineNarration = {
  intro: { say: "Nf5 — a tricky leap to the rim, the knight eyeing g7 and e7, but you can round it up. The cool …a5 prepares …a4 and …Ra6 to hunt the offside knight, or simply gains queenside space while you develop. His adventurous knight has no stable support, and you emerge with the bishop pair or a clear structural plus.", sayShort: "Nf5 — …a5, then round up the knight." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N572: SublineNarration = {
  intro: { say: "g4 — the same English Attack storm by a different move order, f3 before Be3. Your structure is the model Najdorf wall: …e5, …Be6, …Be7, knight to d7. Answer the kingside thrust the Najdorf way — expand with …b5 and …Nc4, hammering c3 and the light squares while he commits his pawns forward. It's a race, and you're built to win it.", sayShort: "g4 — counter with …b5 and …Nc4." },
  sources: ['concept:pos-space', 'concept:pos-king-safety', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N573: SublineNarration = {
  intro: { say: "f3 — White braces e4 and prepares to castle long after the bishop's retreat to g3. You've already gained kingside space with …g5 and …h6; your g7-bishop completes the picture, glaring down the long diagonal at the heart of his position. You're in the sharp, modern Najdorf now — playing for the attack, not equality.", sayShort: "f3 — fianchetto g7, attack." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N574: SublineNarration = {
  intro: { say: "h3 — White ends the …Ng4 skirmish, having coaxed your kingside pawns forward with the Bg5-h4-g3 dance. Those …h6 and …g5 thrusts aren't weaknesses here — they're space. Fianchetto the bishop on g7 raking the long diagonal, and you've got a hyper-aggressive Najdorf where your kingside pawns roll while he's still untangling.", sayShort: "h3 — fianchetto g7, roll the pawns." },
  sources: ['concept:pos-space', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Najdorf_Variation'],
};

const N575: SublineNarration = {
  intro: { say: "Be2 — the modern positional treatment of the Sveshnikov: White supports d5 with c3, develops quietly and aims to reroute the a3-knight to c2 and e3. You hold the bishop pair and the dark-squared bishop on f6 eyeing the long diagonal. Play …Bg5 to trade off his good bishop or relocate, …Be6 hitting d5, …Rb8 and the freeing …f5 break to challenge his central knight and open lines.", sayShort: "Positional Be2 — reroute toward d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-bishop-pair'],
};

const N576: SublineNarration = {
  intro: { say: "Nb3 — rather than the sharp Ndb5, White simply retreats the attacked knight, declining the Sveshnikov tabiya for a quieter game. Your e5-pawn cramps him and you've a free hand to develop without conceding the d5-hole as starkly. Play …Be7, …O-O, and …Be6 or …a5-a4 to harass the b3-knight, with …d5 a recurring break to liberate your position and claim equal central play.", sayShort: "Quiet Nb3 retreat — develop freely" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N577: SublineNarration = {
  intro: { say: "Nf3 — instead of the critical Ndb5, White meekly retreats, where the knight hits your e5-pawn but allows you easy development. You've gained central space with …e5 and avoided conceding the sharp d5-hole on his terms. Play …Bb4 pinning the c3-knight and …d5, or …Be7 and …O-O, with the e5-pawn and free piece play promising at least equality.", sayShort: "Passive Nf3 — Black develops freely" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-space'],
};

const N578: SublineNarration = {
  intro: { say: "Nf5 — White answers …e5 with an aggressive leap, the knight sitting near your king but challengeable at once. Play …d5, striking the centre and threatening to engulf the f5-knight after …d4 or …Bxf5. The point: that knight has no stable support, so you open the position with …d5, exploit the loose piece, and emerge with the central pawn duo and the bishop pair.", sayShort: "…d5 punishes the f5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:tac-trap'],
};

const N579: SublineNarration = {
  intro: { say: "Nxc6 — White retreats by capturing rather than allowing the full Sveshnikov, handing you the bishop pair and a strong e5-pawn. Recapture …bxc6 to open the b-file, then …Bb4 pins the c3-knight, hitting the e4-pawn and pressuring d5. Follow with …d5 or …O-O, using the pin and the central pawn mass to seize the initiative on the light squares around his centre.", sayShort: "…Bb4 pins the c3 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N580: SublineNarration = {
  intro: { say: "Nxc6 — White trades a move early and develops modestly with Bd3, declining the fight for d5. Recapture …bxc6 to open your b-file and …e5 to stake the centre, building the pawn mass typical of these structures. After a3, your …c5 advance grabs space and the dark squares; continue …d6, …Be7 and …O-O, leaning on your bishop pair and mobile central majority to outgun his passive setup.", sayShort: "…e5 and …c5 seize the centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-space'],
};

const N581: SublineNarration = {
  intro: { say: "a4 — the Sveshnikov positional main line: you kept the dark-squared bishop with …Bxf6 and rerouted it to g5, while White reroutes the offside a3-knight via c2 to e3 to reinforce d5. Now a4 strikes at your queenside chain, trying to crack the b5-pawn and the a6-square before you finish …Be6 and …Rb8. Hold the queenside with …bxa4 or …b4, then keep challenging d5 and push …f5 to free the position.", sayShort: "a4 hits the queenside chain" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pawn-chain', 'concept:pos-outpost'],
};

const N582: SublineNarration = {
  intro: { say: "f3 — White plays it early, you grab the centre with …e5, and after the knight hops to b5 and meets …d6 and a3, you strike with the freeing …d5 break. This central thrust opens the position before he can consolidate the b5-knight, hitting e4 and freeing your pieces. Follow …d5 with …Be7 or …Be6 and rapid development, using the break to seize the initiative against his awkward setup.", sayShort: "…d5 break frees Black's centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-initiative'],
};

const N583: SublineNarration = {
  intro: { say: "Nc3 — White delays d4 and you answer with the …e5 thrust, a Sveshnikov-flavoured setup grabbing central space and discouraging the natural d4 break. Bc4 eyes your f7-pawn and the a2-g8 diagonal, so develop …Be7 to prepare castling. Play …Nf6, …O-O and …d6, holding the e5-point and contesting d5, content that his bishop on c4 finds few targets behind your solid pawn front.", sayShort: "…e5 setup — solid central space" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-space'],
};

const N584: SublineNarration = {
  intro: { say: "Nd5 — the Sveshnikov main tabiya: your …e5 seized the centre, …a6 booted the b5-knight to the dismal a3-square, and …b5 clamped it out of play. Now White plants the knight on the hole you conceded, the strong d5-outpost, threatening Nxf6 to wreck your kingside. Answer …Be7, recapture on f6 with the bishop after Bxf6, and fight back with …Ne7 and …Bxd5 or …Nxd5 in due course, leaning on the bishop pair and the e5/f5 break to justify the d5-hole.", sayShort: "Knight to d5 — outpost in the hole" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-bishop-pair'],
};

const N585: SublineNarration = {
  intro: { say: "Bxf6 — White trades before you can untangle, the main line of the Sveshnikov. Recapture …gxf6: it shatters your kingside but opens the g-file and hands you the bishop pair plus a granite e5/f6 pawn mass controlling key central squares. Play …Bg7 or …f5, hitting the e4-pawn and the d5-knight, generating play on the dark squares and down the g-file against his king.", sayShort: "Bxf6 — …gxf6 for the bishop pair" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pawn-doubled'],
};

const N586: SublineNarration = {
  intro: { say: "Ndb5 — the defining Sveshnikov moment: your …e5 hit the d4-knight, and rather than retreat passively White leaps to b5, eyeing d6 and the threat of Nd6+. You've voluntarily weakened the d5-square and the d6-pawn for a lead in development and central pawns. Play …d6 to deny the knight d6, then …a6 to chase it offside to a3, …b5 to box it in, and active piece play on the half-open c-file and the kingside.", sayShort: "Knight jumps to b5 — defining move" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-development', 'concept:pos-weak-squares'],
};

const N587: SublineNarration = {
  intro: { say: "O-O — White retreated to f3 rather than b5, and you seized the moment with …Bb4 pinning the c3-knight and the freeing …d5 break, equalising in the centre at once. With the pin tying down c3, …d5 strikes e4 and frees your game; now that he's castled, you've a comfortable position with the …d5-pawn and active pieces. Play …O-O, …Bxc3 if needed to win the e4-pawn, and play against his centre.", sayShort: "…Bb4 and …d5 — instant freedom" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-center'],
};

const N588: SublineNarration = {
  intro: { say: "Bd3 — White develops in this Kalashnikov-Sveshnikov, defending e4 and preparing to castle while the d5-knight anchors the position. You hold the familiar trumps: the bishop pair after a future …Nxd5, the e5/d6 centre and queenside space from …b5. Play …Be7, …O-O, …Bb7 or …Be6 to pressure d5, and the …f5 break to challenge his centre and activate your dark-squared bishop along the long diagonal.", sayShort: "Bd3 develops — Black eyes …f5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N589: SublineNarration = {
  intro: { say: "Be3 — in this Kalashnikov-to-Sveshnikov structure White develops rather than pinning on g5, eyeing a future c4 to undermine your queenside and bolstering control of d5. You've the standard bishop-pair prospects and a big centre with …e5 and …b5. Play …Be7, …O-O, …Be6 challenging the d5-knight, and …Rb8 with …f5 to break his grip and open the position for your bishops.", sayShort: "Be3 — bolster d5, prepare c4" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-outpost', 'concept:pos-weak-squares'],
};

const N590: SublineNarration = {
  intro: { say: "Bg5 — reaching the Sveshnikov by the Kalashnikov order, you've grabbed the centre with …e5 and kicked the knights to the rim, the a3-knight offside and the d5-knight his only active piece. The pin on your f6-knight pressures the d5-square you must contest. Play …Be7 and meet Bxf6 with …Bxf6, keeping the dark-squared bishop and aiming the standard …Ne7 to challenge the d5-knight, accepting the backward d6-pawn for piece activity and the bishop pair.", sayShort: "Sveshnikov — contest the d5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N591: SublineNarration = {
  intro: { say: "Bg5 — by the Kalashnikov order you've played …e5 and met the Nb3 retreat with …Nf6, developing toward d5 and e4, and now White pins, pressuring the d5-square and threatening to swap off a key defender. Continue …Be7 and meet Bxf6 with …Bxf6, retaining the dark-squared bishop, then play …O-O and …Be6 to contest d5, with …d5 or …a5 as the standard freeing ideas.", sayShort: "Bg5 pins — keep the dark bishop" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:tac-pin', 'concept:pos-bishop-pair'],
};

const N592: SublineNarration = {
  intro: { say: "Nf3 — via the Kalashnikov order White meets …e5 by retreating, attacking your e5-pawn rather than jumping to b5. Support the centre with your …Nf6, eyeing e4 and d5. After Nc3, continue …Bb4 or …Be7 and …d5, using your e5-space and quick development to fight for the centre without conceding the d5-hole the …Ndb5 lines allow.", sayShort: "Nf3 retreat — support e5, play …d5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-development'],
};

const N593: SublineNarration = {
  intro: { say: "Nf5 — by the Kalashnikov order White lunged here, you hit back with …d5, and after the queen trade on d5 the position has simplified with the f5-knight still loose and far from home. You hold the bishop pair and easy development while that knight must justify itself or retreat. Play …Nf6, …Bxf5 or …g6 to harass it, and develop quickly to exploit the half-open queenside files and your two bishops in an open position.", sayShort: "Queens off — harass the f5 knight" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-bishop-pair', 'concept:pos-development'],
};

const N594: SublineNarration = {
  intro: { say: "Nxc6 — White declines the Sveshnikov tension and trades, conceding you a broad pawn centre with the c5/d-file and e5 pawns. Recapture …bxc6 to open the b-file for your rook and prepare …c5 and …d5 to roll the centre forward. After Bc4 and a3 keeping his bishop on the a2-g8 diagonal, …c5 gains space and clamps the dark squares; continue …d6, …Be7, …O-O and a central pawn advance backed by the bishop pair.", sayShort: "Nxc6 — Black builds a pawn centre" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:pos-open-file'],
};

const N595: SublineNarration = {
  intro: { say: "f3 — White props up e4, an English-Attack-style move in this Kalashnikov-Sveshnikov preparing Be3, Qd2 and a possible kingside pawn storm. You hold the bishop pair and the e5/d6 centre with queenside space from …b5. Play …Be7, …O-O, …Be6 to contest the d5-knight and …Rb8, then the thematic …f5 to break in the centre before his slow buildup against your king gathers steam.", sayShort: "f3 props e4 — race with …f5" },
  sources: ['https://en.wikipedia.org/wiki/Sicilian_Defence,_Sveshnikov_Variation', 'concept:pos-center', 'concept:att-kingside-storm'],
};

const N596: SublineNarration = {
  intro: { say: "…Bd7 — Black connects the back rank and prepares …Rc8 to contest the c-file. Your machine is fully in place: bishop on c4 at f7, knight on c3 ready for d5 or b5, rook on d1 against the d6-pawn, queen on e2 holding e4. Bring the last rook to c1 and keep the pieces pointing at the king before Black coordinates — the initiative is your compensation, not the pawn.", sayShort: "…Bd7 — fight for the c-file" },
  sources: ['concept:pos-open-file', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N597: SublineNarration = {
  intro: { say: "…Be6 — Black offers a trade of light-squared bishops to ease the pressure on f7, with both your rooks on the c- and d-files and the queen on e2. Trade there if you like; the engine of the gambit stays the same — the c-file rook hammers the c6-knight and the backward d6-pawn, and the bishop on e3 eyes the queenside. Your initiative outweighs the pawn as long as Black's pieces stay passive.", sayShort: "…Be6 offers trade — keep the files" },
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N598: SublineNarration = {
  intro: { say: "…Bg4 — Black has played …e5 to blunt the centre and now pins your f3-knight, hoping to trade an attacker. Ignore the pin and keep building: the rook on d1 stares down the d6-pawn, the queen sits on e2 holding e4, and the bishop on e3 pressures the dark squares. The pin is loose — h3 can question the bishop, and the half-open files keep Black tied to defence.", sayShort: "Meet …Bg4 pin — keep the d-file pressure" },
  sources: ['concept:tac-pin', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N599: SublineNarration = {
  intro: { say: "…Nf6 — Black declines and develops the queen's knight to c6 to hit your d4-pawn, but after e5 kicks the knight to d5 and cxd4 rebuilds, you hold the broad centre on d4 and e4. This declined Morra is played for space rather than a pawn. Play the quiet a3 to take the b4-square from Black's pieces and prepare to expand on the queenside while the centre rolls.", sayShort: "Declined — central space, a3 clamp" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N600: SublineNarration = {
  intro: { say: "O-O — Black castles into the standard accepted-Morra structure, and now every piece points at the king: bishop on c4 at f7, knight on c3 ready for d5, rook on d1 on the d6-pawn, queen on e2 fuelling e4. Keep developing toward the king — a rook to c1, or d5 ideas — rather than rushing to win the pawn back. Black's lack of counterplay is the whole point; your lead in development is the compensation.", sayShort: "Black castles — pile pieces toward f7" },
  sources: ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N601: SublineNarration = {
  intro: { say: "…Qa5 — Black swings the queen out, pinning your c3-knight against nothing concrete but eyeing the a5-e1 diagonal and the e5-square. Carry on with the same plan: the rook on d1 pressures d6, the bishop on c4 watches f7, and the knight on c3 still wants d5 where it can't be taken comfortably. Hit that misplaced queen with b4 or Nd5 — the initiative keeps rolling and the gambit pawn stays a fair price.", sayShort: "…Qa5 — target the queen, keep pressing" },
  sources: ['concept:pos-initiative', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N602: SublineNarration = {
  intro: { say: "…Qb6 — Black hops the queen out to hit b2 and f2 and disrupt your smooth setup. Ignore the b2-pawn or guard it and keep the initiative: the rook on d1 presses d6, the bishop on c4 watches f7, and the knight on c3 eyes d5 and b5 hitting the loose queen. The exposed queen on b6 is a target — chase it with Na4 or Be3 with tempo, and your pressure only grows.", sayShort: "…Qb6 hits b2 — chase the queen" },
  sources: ['concept:pos-initiative', 'concept:tac-double-attack', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N603: SublineNarration = {
  intro: { say: "…Qc7 — Black drops the queen to the natural Morra square, lining up on the c-file, guarding e5 and eyeing the b8-h2 diagonal. Keep the standard machinery: rook on d1 against the d6-pawn, bishop on c4 against f7, knight on c3 ready to jump to d5 or b5. Since Black's queen shares the file with your rook, lean on Nd5 and Nb5 hitting c7 to keep the initiative pressing.", sayShort: "…Qc7 — answer with Nd5/Nb5 ideas" },
  sources: ['concept:pos-initiative', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N604: SublineNarration = {
  intro: { say: "…a6 — Black takes the b5-square from your knight and prepares …b5 against the c4-bishop before castling. Don't slow down: the rook on d1 eyes the d6-pawn, the bishop watches f7, and the knight on c3 still has the d5-outpost. Meet …b5 by dropping the bishop to b3 to keep the diagonal alive, and play Rac1 to pile onto the c-file — your lead in development is the lasting compensation.", sayShort: "…a6 readies …b5 — keep developing" },
  sources: ['concept:pos-development', 'concept:pos-open-file', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N605: SublineNarration = {
  intro: { say: "…a6 — with both your rooks bearing on the c- and d-files, Black plays …a6 to stop Nb5 and prepare …b5 against the c4-bishop. Keep the squeeze: the rook on c1 hammers the c-file and the c6-knight, the bishop on e3 covers the dark squares, and Bb3 tucks the bishop to safety while keeping the f7 diagonal. Black is solid but passive, and the open files are lasting compensation for the pawn.", sayShort: "…a6 prepares …b5 — hold the files" },
  sources: ['concept:pos-open-file', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N606: SublineNarration = {
  intro: { say: "…Bd7 — in the declined line the d5-knight retreated to b6 to attack your c4-bishop, which sidestepped to b5 to keep pinning the c6-knight, and now Black unpins. Your edge is the e5-pawn cramping Black plus the bishop-pair pressure; after exchanges on c6 or d7 the broad d4-e4 structure remains your trump. Keep the e5-pawn supported and the d-file in mind.", sayShort: "…Bd7 unpins — central clamp stands" },
  sources: ['concept:pos-center', 'concept:pos-bishop-pair', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N607: SublineNarration = {
  intro: { say: "…Bg4 — Black pins your f3-knight to chip at the support of the e5-pawn and the d4-centre, with the b6-knight and c6-knight already engaged. Meet the pin calmly: Be3, or h3 and Be2 ideas keep the centre intact, and the e5-pawn keeps cramping Black. The declined Morra leaves you the broad d4-e4 centre and freer pieces, so trade into a structure where space tells.", sayShort: "…Bg4 pins f3 — keep e5 centre" },
  sources: ['concept:tac-pin', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N608: SublineNarration = {
  intro: { say: "…a6 — after the d5-knight hit c4 and your bishop dropped to b5, Black questions the pinning bishop at once. Take on c6 to damage Black's structure, or retreat keeping the pin — either way your broad d4-e4 centre and the cramping e5-pawn are the lasting pluses. The declined Morra is about space and freer development, and …a6 spends a tempo that lets you keep building.", sayShort: "…a6 hits the bishop — clamp holds" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N609: SublineNarration = {
  intro: { say: "…a6 — Black has traded down through …dxe5 and the knights on d7 into a calmer declined-Morra structure, and now drives your b5-bishop back. Keep a pleasant pull: the pawn on d4 anchors the centre, the knight on c3 eyes d5, and the half-open d-file gives your rooks a target. With queens still on, your slightly freer development and central space remain the assets even without the gambit pawn.", sayShort: "Simplified declined — central pull stands" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N610: SublineNarration = {
  intro: { say: "…d5 — Black tries to free himself with the central thrust, hitting your e4-pawn and challenging the bind, with the b6-knight already on your c4-bishop that moved to b5. Meet it with exd6 en passant to keep the e5-wedge gone but the d-file open, or hold e4 with pieces. Your lead in development and the pin on the c6-knight mean this freeing break opens lines for the better-mobilised side — you.", sayShort: "…d5 break — open lines favour White" },
  sources: ['concept:pos-center', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N611: SublineNarration = {
  intro: { say: "…dxc3 — Black grabs on c3, your knight recaptures, and the full gambit is on: one pawn invested for a raking lead in development. The bishop bites at f7 from c4, the knight on c3 eyes d5, and after castling your rooks come to the half-open c- and d-files straight at Black's queen and the d6-square. Play pure initiative — pile on the dark squares before Black untangles the kingside.", sayShort: "Accepted Morra — initiative for the pawn" },
  sources: ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N612: SublineNarration = {
  intro: { say: "…dxe5 — Black strikes at your cramping e5-pawn, the principled try to free the declined Morra. Recapture and keep the initiative: Nxe5 centralises the knight, hits the c6-knight and f7, and trades into a structure where your d4-pawn and active pieces dominate. With the bishop on c4 and the open lines, Black still has to prove the freeing trade didn't just open the game for you.", sayShort: "…dxe5 — recapture, keep the initiative" },
  sources: ['concept:pos-centralization', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N613: SublineNarration = {
  intro: { say: "…e6 — Black gives the d5-knight a retreat and challenges your c4-bishop's diagonal toward f7. Keep the declined-Morra blueprint: pawns on d4 and e4 hold the centre, the e5-pawn cramps Black's kingside, and the bishop eyes the weakened light squares around d5 and f7. Trades that open the d-file or the long diagonal favour the side with more space — you.", sayShort: "…e6 — central space, light-square pressure" },
  sources: ['concept:pos-center', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N614: SublineNarration = {
  intro: { say: "…e6 — Black frees the f8-bishop and prepares to break the e5-cramp, after the b6-knight chased your bishop to b5 where it pins the c6-knight. Keep the declined-Morra trumps: the e5-pawn cramps Black, the d4-pawn anchors the centre, and the pinned knight on c6 limits Black's freeing moves. Hold e5 and the central space — this is a positional pull, not a tactical strike.", sayShort: "…e6 frees Black — hold e5 cramp" },
  sources: ['concept:pos-space', 'concept:tac-pin', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N615: SublineNarration = {
  intro: { say: "…Nf6 — Black sidesteps the gambit, so push your pawn to e5, kick the knight to d5, and recapture cxd4 to rebuild a broad centre on d4 and e4. In the declined Morra, instead of an extra pawn for Black, you own the centre and a free game. Slip in the little move a3 to stop …Nb4 hitting your d5-knight, then clamp b4 before rolling the centre forward.", sayShort: "Declined — broad center on d4-e4" },
  sources: ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N616: SublineNarration = {
  intro: { say: "…Bd7 — Black completes the Hedgehog under the Maroczy bind and develops the bishop, planning …a6 and …b5 or a rook lift to c8. Your job is to keep the c4-e4 clamp that denies the …d5 break and the d5-square. The bishop on e3 holds the dark squares, the knight on c3 guards d5 and e4, and slow queenside restraint plus a timely f4 or central pressure keeps Black boxed in.", sayShort: "Hedgehog vs bind — restrain …b5" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N617: SublineNarration = {
  intro: { say: "…Be6 — in the Maroczy-bind Morra declined, Black pressures your c4-pawn and prepares …Nd7 with …b5 later. Hold the clamp: the c4 and e4 pawns deny the …d5 break, the bishop on e3 controls the dark squares, and the knight on c3 covers d5. If Black trades the e6-bishop for c4's guardian, recapture and keep the bind — the squeeze, not a quick attack, is how you win here.", sayShort: "…Be6 hits c4 — keep the bind" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N618: SublineNarration = {
  intro: { say: "…Bg4 — Black pins your f3-knight before castling, trying to trade a defender of the centre. Under the Maroczy bind that pin is harmless: Be2 or h3 unravels it, and the c4-e4 pawns keep choking the …d5 break either way. Finish development, keep the clamp on d5, and use your extra space to push the queenside or central pawns when Black runs out of useful moves.", sayShort: "…Bg4 pin — break it, hold the bind" },
  sources: ['concept:tac-pin', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N619: SublineNarration = {
  intro: { say: "…d3 — Black declines the safest way, returning the pawn so your bishop recaptures on d3 and no gambit fire remains. Answer with c4 and build the Maroczy bind: pawns on c4 and e4 clamp the d5-square and choke Black's freeing …d5 break. After the fianchetto on g7 meets your knight on c3, this is a positional squeeze, not a sacrifice — space and the bind do the work.", sayShort: "Morra declined — Maroczy c4-e4 bind" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N620: SublineNarration = {
  intro: { say: "…a6 — Black plays it early in the Maroczy structure, before castling, to prepare …b5 against your c4-pawn and gain queenside space. Stay on plan: keep the c4-e4 clamp that denies …d5, finish development with the bishop to e3, and watch the d5-square the bind controls. The …a6 and …b5 expansion is slow, so meet it with piece pressure and central space to keep the bind that is the soul of the declined Morra.", sayShort: "Early …a6 — keep the central clamp" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N621: SublineNarration = {
  intro: { say: "…a6 — in the declined Morra with the Maroczy bind, Black sets up the Hedgehog with …d6, …g6 and …a6, planning a slow …b5 against your c4-pawn. Keep the clamp: pawns on c4 and e4 deny the d5-square, the bishop sits on e3 over the dark squares, and h3 gives your king luft and stops …Ng4. The …a6 signals queenside play, so meet …b5 with patience and piece pressure to keep the bind intact.", sayShort: "Maroczy bind — restrain Black's …b5" },
  sources: ['concept:pos-space', 'concept:pos-weak-squares', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N622: SublineNarration = {
  intro: { say: "…b6 — Black fianchettoes the queen's bishop to b7, double-pressuring your e4-pawn and supporting an eventual …d5 break under the Maroczy bind. Overprotect e4 and keep the c4-pawn clamp on d5: the knight on c3 plus a queen or rook backing e4 hold the centre. The bishop on e3 keeps the dark squares, and your extra space lets you meet …d5 with a favourable opening of the position.", sayShort: "…b6 eyes e4 — overprotect, keep bind" },
  sources: ['concept:pawn-fianchetto', 'concept:pos-space', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N623: SublineNarration = {
  intro: { say: "…e6 — Black sets up the …g7-fianchetto, a flexible Maroczy structure aiming for …Nge7 and a later …d5 or …b5. Keep your c4-e4 bind that smothers his …d5 freeing break and claim the extra space. Castle and post your bishop on e3 over the dark squares to complete the clamp — the declined Morra is a positional bind, so your patience and central control, not a sacrifice, carry the day.", sayShort: "…e6 fianchetto — keep c4-e4 bind" },
  sources: ['concept:pos-space', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

const N624: SublineNarration = {
  intro: { say: "…h6 — Black slips this in under the Maroczy bind to deny your pieces the g5-square and rule out a future Bg5 pin. It's slow and doesn't free the position, so keep clamping: the c4-e4 pawns deny …d5, the bishop on e3 holds the dark squares, and the knight on c3 covers d5. With Black short of active breaks, expand on the queenside or prepare f4 to claim even more space.", sayShort: "…h6 is slow — keep the bind" },
  sources: ['concept:pos-space', 'concept:pos-prophylaxis', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'],
};

export const SUBLINE_NARRATION_E4OTHER: Record<string, SublineNarration> = {
  'alekhine-defence::0::Bc4@6': N0,
  'alekhine-defence::0::Bd3@18': N1,
  'alekhine-defence::0::Be2@18': N2,
  'alekhine-defence::0::Nc3@4': N3,
  'alekhine-defence::0::Nf3@6': N4,
  'alekhine-defence::0::Nf3@8': N5,
  'alekhine-defence::0::Qb3@18': N6,
  'alekhine-defence::0::a3@18': N7,
  'alekhine-defence::0::c4@4': N8,
  'alekhine-defence::0::exd6@8': N9,
  'alekhine-defence::1::Nbd2@12': N10,
  'alekhine-defence::1::Nc3@12': N11,
  'alekhine-defence::1::Re1@12': N12,
  'alekhine-defence::1::b3@16': N13,
  'alekhine-defence::1::c3@12': N14,
  'alekhine-defence::1::c4@4': N8,
  'alekhine-defence::1::c4@6': N9,
  'alekhine-defence::1::exd6@12': N15,
  'alekhine-defence::1::h3@12': N16,
  'alekhine-defence::1::h3@16': N17,
  'alekhine-defence::2::Be3@18': N18,
  'alekhine-defence::2::Nc3@10': N9,
  'alekhine-defence::2::Nc3@14': N19,
  'alekhine-defence::2::a3@18': N20,
  'alekhine-defence::2::b3@16': N21,
  'alekhine-defence::2::c4@4': N8,
  'alekhine-defence::2::d5@16': N22,
  'alekhine-defence::2::d5@18': N23,
  'alekhine-defence::2::f4@8': N24,
  'alekhine-defence::3::Be3@14': N25,
  'alekhine-defence::3::Nc3@10': N8,
  'alekhine-defence::3::Nc3@14': N26,
  'alekhine-defence::3::Re1@18': N27,
  'alekhine-defence::3::a3@18': N28,
  'alekhine-defence::3::b3@18': N29,
  'alekhine-defence::3::d5@18': N30,
  'alekhine-defence::3::f4@8': N31,
  'alekhine-defence::3::h3@14': N32,
  'alekhine-defence::4::Bc4@10': N33,
  'alekhine-defence::4::Bc4@12': N34,
  'alekhine-defence::4::Nc3@10': N35,
  'alekhine-defence::4::Nc3@12': N36,
  'alekhine-defence::4::Nf3@10': N37,
  'alekhine-defence::4::Nxe5@14': N38,
  'alekhine-defence::4::d4@4': N4,
  'alekhine-defence::4::exd6@10': N39,
  'alekhine-defence::4::exd6@12': N40,
  'alekhine-defence::4::f4@12': N41,
  'alekhine-defence::5::Bc4@12': N42,
  'alekhine-defence::5::Bc4@6': N0,
  'alekhine-defence::5::Bd3@12': N43,
  'alekhine-defence::5::Be2@12': N44,
  'alekhine-defence::5::Nc3@4': N3,
  'alekhine-defence::5::Nf3@10': N45,
  'alekhine-defence::5::Nxf7@10': N46,
  'alekhine-defence::5::c3@12': N47,
  'alekhine-defence::5::c4@4': N8,
  'alekhine-defence::5::c4@6': N9,
  'alekhine-defence::6::Bc4@6': N0,
  'alekhine-defence::6::Bd3@12': N48,
  'alekhine-defence::6::Nc3@4': N3,
  'alekhine-defence::6::Nf3@8': N5,
  'alekhine-defence::6::c4@4': N8,
  'alekhine-defence::6::d5@10': N49,
  'alekhine-defence::6::dxe5@18': N50,
  'alekhine-defence::6::f4@8': N24,
  'alekhine-defence::6::h3@12': N51,
  'anti-alapin-black::0::Bb5@12': N52,
  'anti-alapin-black::0::Bc4@12': N53,
  'anti-alapin-black::0::Bd3@4': N54,
  'anti-alapin-black::0::Be2@12': N55,
  'anti-alapin-black::0::Nc3@12': N56,
  'anti-alapin-black::0::Qc2@4': N57,
  'anti-alapin-black::0::d3@4': N58,
  'anti-alapin-black::0::d4@4': N59,
  'anti-alapin-black::0::exd6@12': N60,
  'anti-alapin-black::0::f3@4': N61,
  'anti-alapin-black::1::Bc4@6': N62,
  'anti-alapin-black::1::Bd3@4': N54,
  'anti-alapin-black::1::Qc2@4': N57,
  'anti-alapin-black::1::d3@4': N58,
  'anti-alapin-black::1::d4@4': N59,
  'anti-alapin-black::1::d4@6': N63,
  'anti-alapin-black::1::d4@8': N64,
  'anti-alapin-black::1::f3@4': N61,
  'anti-alapin-black::1::g3@6': N65,
  'anti-alekhine-modern::0::Nb6@5': N66,
  'anti-alekhine-modern::0::Nb6@7': N67,
  'anti-alekhine-modern::0::Nc6@5': N68,
  'anti-alekhine-modern::0::Nc6@7': N69,
  'anti-alekhine-modern::0::b5@5': N70,
  'anti-alekhine-modern::0::c6@7': N71,
  'anti-alekhine-modern::0::dxe5@7': N72,
  'anti-alekhine-modern::0::e6@5': N73,
  'anti-alekhine-modern::0::g6@7': N74,
  'anti-alekhine-modern::1::Bg4@7': N4,
  'anti-alekhine-modern::1::Nb6@5': N66,
  'anti-alekhine-modern::1::Nb6@7': N67,
  'anti-alekhine-modern::1::Nc6@5': N68,
  'anti-alekhine-modern::1::Nc6@7': N69,
  'anti-alekhine-modern::1::b5@5': N70,
  'anti-alekhine-modern::1::c6@7': N71,
  'anti-alekhine-modern::1::e6@5': N73,
  'anti-alekhine-modern::1::g6@7': N74,
  'anti-alekhine-modern::1::g6@9': N75,
  'anti-alekhine-modern::2::Bg4@7': N4,
  'anti-alekhine-modern::2::Nb6@5': N66,
  'anti-alekhine-modern::2::Nb6@7': N67,
  'anti-alekhine-modern::2::Nc6@5': N68,
  'anti-alekhine-modern::2::Nc6@7': N69,
  'anti-alekhine-modern::2::b5@5': N70,
  'anti-alekhine-modern::2::c6@7': N71,
  'anti-alekhine-modern::2::c6@9': N76,
  'anti-alekhine-modern::2::dxe5@7': N72,
  'anti-alekhine-modern::2::e6@5': N73,
  'anti-alekhine-modern::3::Bg4@7': N4,
  'anti-alekhine-modern::3::Nb6@5': N66,
  'anti-alekhine-modern::3::Nc6@5': N68,
  'anti-alekhine-modern::3::Nc6@7': N69,
  'anti-alekhine-modern::3::b5@5': N70,
  'anti-alekhine-modern::3::c6@7': N71,
  'anti-alekhine-modern::3::dxe5@7': N72,
  'anti-alekhine-modern::3::dxe5@9': N77,
  'anti-alekhine-modern::3::e6@5': N73,
  'anti-alekhine-modern::3::g6@7': N74,
  'anti-caro-fantasy::0::Bxc3+@9': N78,
  'anti-caro-fantasy::0::Nd7@9': N79,
  'anti-caro-fantasy::0::Ne7@9': N80,
  'anti-caro-fantasy::0::Nf6@9': N81,
  'anti-caro-fantasy::0::Qa5@9': N82,
  'anti-caro-fantasy::0::Qb6@5': N83,
  'anti-caro-fantasy::0::b6@9': N84,
  'anti-caro-fantasy::0::dxe4@5': N85,
  'anti-caro-fantasy::0::dxe4@9': N86,
  'anti-caro-fantasy::0::g6@5': N87,
  'anti-caro-fantasy::1::Be6@9': N88,
  'anti-caro-fantasy::1::Nd7@7': N89,
  'anti-caro-fantasy::1::Nf6@7': N90,
  'anti-caro-fantasy::1::Qb6@5': N83,
  'anti-caro-fantasy::1::e5@5': N91,
  'anti-caro-fantasy::1::e6@5': N92,
  'anti-caro-fantasy::1::e6@7': N93,
  'anti-caro-fantasy::1::exd4@9': N94,
  'anti-caro-fantasy::1::g6@5': N87,
  'anti-caro-fantasy::1::g6@7': N95,
  'anti-caro-fantasy::2::Nf6@9': N96,
  'anti-caro-fantasy::2::Qb6@5': N83,
  'anti-caro-fantasy::2::Qxb2@11': N97,
  'anti-caro-fantasy::2::dxe4@5': N85,
  'anti-caro-fantasy::2::dxe4@7': N98,
  'anti-caro-fantasy::2::dxe4@9': N99,
  'anti-caro-fantasy::2::e5@11': N100,
  'anti-caro-fantasy::2::e5@5': N91,
  'anti-caro-fantasy::2::e6@5': N92,
  'anti-caro-fantasy::2::e6@7': N101,
  'anti-caro-fantasy::3::Nf6@9': N102,
  'anti-caro-fantasy::3::dxe4@5': N85,
  'anti-caro-fantasy::3::e5@5': N91,
  'anti-caro-fantasy::3::e5@7': N103,
  'anti-caro-fantasy::3::e5@9': N104,
  'anti-caro-fantasy::3::e6@5': N92,
  'anti-caro-fantasy::3::e6@7': N105,
  'anti-caro-fantasy::3::g6@5': N87,
  'anti-french-advance::0::Bd7@7': N106,
  'anti-french-advance::0::Nge7@9': N107,
  'anti-french-advance::0::Nh6@9': N108,
  'anti-french-advance::0::Qb6@7': N109,
  'anti-french-advance::0::Qb6@9': N110,
  'anti-french-advance::0::b6@5': N111,
  'anti-french-advance::1::Bd7@11': N112,
  'anti-french-advance::1::Bd7@13': N113,
  'anti-french-advance::1::Bd7@7': N106,
  'anti-french-advance::1::Bd7@9': N114,
  'anti-french-advance::1::Nc6@7': N115,
  'anti-french-advance::1::Nh6@11': N116,
  'anti-french-advance::1::a5@11': N117,
  'anti-french-advance::1::b6@5': N111,
  'anti-french-advance::1::f6@11': N118,
  'anti-french-advance::1::f6@13': N119,
  'anti-grand-prix-black::0::Bb5@4': N120,
  'anti-grand-prix-black::0::Bb5@6': N121,
  'anti-grand-prix-black::0::Bc4@6': N122,
  'anti-grand-prix-black::0::Bc4@8': N123,
  'anti-grand-prix-black::0::Nf3@4': N124,
  'anti-grand-prix-black::0::Nge2@4': N125,
  'anti-grand-prix-black::0::a4@8': N126,
  'anti-grand-prix-black::0::d3@8': N127,
  'anti-grand-prix-black::0::g3@4': N128,
  'anti-grand-prix-black::0::g3@8': N129,
  'anti-grand-prix-black::1::Bb5@4': N120,
  'anti-grand-prix-black::1::Bb5@6': N121,
  'anti-grand-prix-black::1::Bb5@8': N130,
  'anti-grand-prix-black::1::Bc4@6': N122,
  'anti-grand-prix-black::1::Nf3@4': N124,
  'anti-grand-prix-black::1::Nge2@4': N125,
  'anti-grand-prix-black::1::a4@8': N126,
  'anti-grand-prix-black::1::d3@8': N127,
  'anti-grand-prix-black::1::g3@4': N128,
  'anti-grand-prix-black::1::g3@8': N129,
  'anti-kings-gambit-black::0::Bc4@6': N131,
  'anti-kings-gambit-black::0::Bxd5@12': N132,
  'anti-kings-gambit-black::0::Nc3@6': N133,
  'anti-kings-gambit-black::0::Ng5@8': N134,
  'anti-kings-gambit-black::0::Nxg4@10': N135,
  'anti-kings-gambit-black::0::d4@10': N136,
  'anti-kings-gambit-black::0::d4@6': N137,
  'anti-kings-gambit-black::1::Nf3@10': N138,
  'anti-kings-gambit-black::1::Nf3@8': N139,
  'anti-kings-gambit-black::1::Qe2@8': N140,
  'anti-kings-gambit-black::1::Qf3@8': N141,
  'anti-kings-gambit-black::1::d3@10': N142,
  'anti-kings-gambit-black::1::d3@6': N143,
  'anti-kings-gambit-black::1::d4@10': N144,
  'anti-kings-gambit-black::1::d4@8': N145,
  'anti-kings-gambit-black::1::e5@10': N146,
  'anti-modern-150::0::Bb7@11': N147,
  'anti-modern-150::0::Nd7@11': N148,
  'anti-modern-150::0::Nd7@7': N149,
  'anti-modern-150::0::Nd7@9': N150,
  'anti-modern-150::0::Nf6@7': N151,
  'anti-modern-150::0::a6@5': N152,
  'anti-modern-150::0::c5@5': N153,
  'anti-modern-150::0::c6@5': N154,
  'anti-modern-150::0::c6@7': N155,
  'anti-modern-150::0::d5@5': N156,
  'anti-modern-150::1::Nd7@11': N157,
  'anti-modern-150::1::Nf6@11': N158,
  'anti-modern-150::1::Nf6@7': N151,
  'anti-modern-150::1::a5@11': N159,
  'anti-modern-150::1::a6@11': N160,
  'anti-modern-150::1::a6@5': N152,
  'anti-modern-150::1::a6@7': N161,
  'anti-modern-150::1::c5@5': N153,
  'anti-modern-150::1::c6@5': N154,
  'anti-modern-150::1::d5@5': N156,
  'anti-modern-150::2::Nd7@7': N149,
  'anti-modern-150::2::a6@5': N152,
  'anti-modern-150::2::a6@7': N161,
  'anti-modern-150::2::c5@5': N153,
  'anti-modern-150::2::c6@5': N154,
  'anti-modern-150::2::c6@7': N155,
  'anti-modern-150::2::d5@5': N156,
  'anti-pirc-austrian::0::c5@9': N162,
  'anti-pirc-austrian::1::O-O@9': N163,
  'anti-scandinavian::0::Bf5@9': N164,
  'anti-scandinavian::0::Bg4@11': N165,
  'anti-scandinavian::0::Bg4@9': N166,
  'anti-scandinavian::0::Nc6@9': N167,
  'anti-scandinavian::0::Qd6@5': N168,
  'anti-scandinavian::0::Qd8@5': N169,
  'anti-scandinavian::0::c6@7': N170,
  'anti-scandinavian::1::Bg4@9': N171,
  'anti-scandinavian::1::Qa5@5': N172,
  'anti-scandinavian::1::Qd8@5': N169,
  'anti-scandinavian::1::b5@11': N173,
  'anti-scandinavian::1::c6@7': N174,
  'anti-scandinavian::1::c6@9': N175,
  'anti-scandinavian::1::g6@11': N176,
  'anti-scandinavian::1::g6@9': N177,
  'anti-scandinavian::2::Bf5@9': N178,
  'anti-scandinavian::2::Qa5@5': N172,
  'anti-scandinavian::2::Qd6@5': N168,
  'anti-scandinavian::2::a6@9': N179,
  'anti-scandinavian::2::c6@7': N180,
  'anti-scandinavian::2::c6@9': N181,
  'anti-scandinavian::2::e6@9': N182,
  'anti-scandinavian::2::g6@7': N183,
  'anti-scandinavian::2::g6@9': N184,
  'anti-sicilian-rossolimo::0::Nf6@5': N185,
  'anti-sicilian-rossolimo::0::d6@5': N186,
  'anti-sicilian-rossolimo::0::e5@5': N187,
  'anti-sicilian-rossolimo::0::e6@5': N188,
  'anti-sicilian-rossolimo::1::Nf6@5': N185,
  'anti-sicilian-rossolimo::1::d6@5': N186,
  'anti-sicilian-rossolimo::1::e5@5': N187,
  'anti-sicilian-rossolimo::1::g6@5': N189,
  'anti-sicilian-rossolimo::2::Nf6@5': N185,
  'anti-sicilian-rossolimo::2::e5@5': N187,
  'anti-sicilian-rossolimo::2::e6@5': N188,
  'anti-sicilian-rossolimo::2::g6@5': N189,
  'anti-sicilian-rossolimo::3::d6@5': N186,
  'anti-sicilian-rossolimo::3::e5@5': N187,
  'anti-sicilian-rossolimo::3::e6@5': N188,
  'anti-sicilian-rossolimo::3::g6@5': N189,
  'anti-smith-morra-black::0::Bc4@6': N190,
  'anti-smith-morra-black::0::Bc4@8': N191,
  'anti-smith-morra-black::0::Be2@10': N192,
  'anti-smith-morra-black::0::Be3@14': N193,
  'anti-smith-morra-black::0::Nf3@4': N194,
  'anti-smith-morra-black::0::Nf3@6': N195,
  'anti-smith-morra-black::0::Qe2@12': N196,
  'anti-smith-morra-black::0::Qe2@14': N197,
  'anti-smith-morra-black::0::Qxd4@4': N198,
  'anti-smith-morra-black::0::a4@12': N199,
  'anti-smith-morra-black::1::Bc4@6': N190,
  'anti-smith-morra-black::1::Bc4@8': N191,
  'anti-smith-morra-black::1::Be2@10': N192,
  'anti-smith-morra-black::1::Be3@14': N193,
  'anti-smith-morra-black::1::Bg5@14': N200,
  'anti-smith-morra-black::1::Nf3@4': N194,
  'anti-smith-morra-black::1::Nf3@6': N195,
  'anti-smith-morra-black::1::Qe2@12': N196,
  'anti-smith-morra-black::1::Qxd4@4': N198,
  'anti-smith-morra-black::1::a4@12': N199,
  'caro-kann::0::Bc4@16': N201,
  'caro-kann::0::Bc4@6': N202,
  'caro-kann::0::Kb1@24': N203,
  'caro-kann::0::Nd2@4': N204,
  'caro-kann::0::Ne5@24': N205,
  'caro-kann::0::O-O@22': N206,
  'caro-kann::0::c4@22': N207,
  'caro-kann::0::e5@4': N208,
  'caro-kann::0::exd5@4': N209,
  'caro-kann::1::Bg5@8': N210,
  'caro-kann::1::Nc3@6': N211,
  'caro-kann::1::Nc3@8': N212,
  'caro-kann::1::a3@8': N213,
  'caro-kann::1::c3@12': N214,
  'caro-kann::1::c3@8': N215,
  'caro-kann::1::c4@8': N216,
  'caro-kann::1::h3@8': N217,
  'caro-kann::1::h4@6': N218,
  'caro-kann::2::Be2@10': N219,
  'caro-kann::2::Be3@12': N220,
  'caro-kann::2::Bg5@12': N221,
  'caro-kann::2::d3@10': N222,
  'caro-kann::2::d3@4': N223,
  'caro-kann::2::exd5@12': N224,
  'caro-kann::2::exd5@4': N225,
  'caro-kann::2::g3@10': N226,
  'caro-kann::2::gxf3@8': N227,
  'caro-kann::3::Bb5@16': N228,
  'caro-kann::3::Bc4@16': N229,
  'caro-kann::3::Bd3@6': N230,
  'caro-kann::3::Nxd5@16': N231,
  'caro-kann::3::Nxd5@18': N232,
  'caro-kann::3::a3@16': N233,
  'caro-kann::3::a3@18': N234,
  'caro-kann::3::c5@8': N235,
  'caro-kann::3::cxd5@8': N236,
  'caro-kann::4::Be2@10': N237,
  'caro-kann::4::Be3@10': N238,
  'caro-kann::4::Bg5@14': N239,
  'caro-kann::4::c3@12': N240,
  'caro-kann::4::c3@8': N241,
  'caro-kann::4::d5@8': N242,
  'caro-kann::4::dxe5@10': N243,
  'caro-kann::4::dxe5@14': N244,
  'caro-kann::4::dxe5@8': N245,
  'caro-kann::5::Bg3@18': N246,
  'caro-kann::5::Ne2@8': N247,
  'caro-kann::5::Ne5@18': N248,
  'caro-kann::5::Qxb7@20': N249,
  'caro-kann::5::Rae1@22': N250,
  'caro-kann::5::c4@6': N209,
  'caro-kann::5::h3@14': N251,
  'caro-kann::5::h3@16': N252,
  'caro-kann::5::h3@22': N253,
  'caro-kann::6::Bc4@12': N254,
  'caro-kann::6::Bd2@18': N255,
  'caro-kann::6::Be3@12': N256,
  'caro-kann::6::Be3@16': N257,
  'caro-kann::6::Nf3@12': N258,
  'caro-kann::6::Nf4@22': N259,
  'caro-kann::6::Ng3@22': N260,
  'caro-kann::6::h3@18': N261,
  'caro-kann::6::h3@22': N262,
  'french-defence::0::Nd2@4': N263,
  'french-defence::0::Ne1@18': N264,
  'french-defence::0::Ng5@18': N265,
  'french-defence::0::Qc2@18': N266,
  'french-defence::0::Qe1@18': N267,
  'french-defence::0::Rb1@16': N268,
  'french-defence::0::Re1@18': N269,
  'french-defence::0::exd5@4': N270,
  'french-defence::0::h3@18': N271,
  'french-defence::1::Bd2@8': N272,
  'french-defence::1::Ne2@6': N273,
  'french-defence::1::Nf3@12': N274,
  'french-defence::1::Qd3@20': N275,
  'french-defence::1::cxd4@20': N276,
  'french-defence::1::e5@4': N115,
  'french-defence::1::exd5@4': N270,
  'french-defence::1::exd5@6': N277,
  'french-defence::1::h4@12': N278,
  'french-defence::2::Bd3@20': N279,
  'french-defence::2::Be2@18': N280,
  'french-defence::2::Ne2@18': N281,
  'french-defence::2::O-O-O@18': N282,
  'french-defence::2::a3@20': N283,
  'french-defence::2::e5@4': N115,
  'french-defence::2::e5@6': N284,
  'french-defence::2::exd5@4': N270,
  'french-defence::2::h4@10': N285,
  'french-defence::3::Nc3@22': N286,
  'french-defence::3::Ng3@22': N287,
  'french-defence::3::Rc1@24': N288,
  'french-defence::3::a3@22': N289,
  'french-defence::3::c3@8': N290,
  'french-defence::3::e5@4': N115,
  'french-defence::3::exd5@4': N270,
  'french-defence::3::f4@20': N291,
  'french-defence::3::h3@22': N292,
  'french-defence::4::Nc3@12': N293,
  'french-defence::4::Nc3@4': N294,
  'french-defence::4::Nd2@4': N263,
  'french-defence::4::Ne5@12': N295,
  'french-defence::4::Re1@12': N296,
  'french-defence::4::c3@12': N297,
  'french-defence::4::c3@14': N298,
  'french-defence::4::c4@12': N299,
  'french-defence::4::h3@14': N300,
  'french-defence::5::Bb5@14': N301,
  'french-defence::5::Bd3@14': N302,
  'french-defence::5::Nd2@4': N263,
  'french-defence::5::Nxf6+@14': N303,
  'french-defence::5::c3@14': N304,
  'french-defence::5::e5@4': N115,
  'french-defence::5::e5@6': N284,
  'french-defence::5::exd5@4': N270,
  'french-defence::5::f3@8': N305,
  'french-defence::6::Bg5@14': N306,
  'french-defence::6::Bg5@16': N307,
  'french-defence::6::Ng3@14': N308,
  'french-defence::6::O-O@12': N309,
  'french-defence::6::Qc2@14': N310,
  'french-defence::6::Qe2@12': N311,
  'french-defence::6::Qe2@14': N312,
  'french-defence::6::e5@4': N115,
  'french-defence::6::exd5@4': N270,
  'french-defence::7::Be3@20': N313,
  'french-defence::7::Kh1@20': N314,
  'french-defence::7::Nd2@4': N263,
  'french-defence::7::Qf3@20': N315,
  'french-defence::7::Rd1@22': N316,
  'french-defence::7::Re1@20': N317,
  'french-defence::7::a3@20': N318,
  'french-defence::7::exd5@4': N270,
  'french-defence::7::g3@20': N319,
  'french-defence::8::Bc1@10': N320,
  'french-defence::8::Be3@10': N321,
  'french-defence::8::dxc5@20': N322,
  'french-defence::8::e5@4': N115,
  'french-defence::8::e5@6': N284,
  'french-defence::8::exd5@4': N270,
  'french-defence::8::exd5@8': N323,
  'french-defence::8::f4@20': N324,
  'french-defence::8::h4@20': N325,
  'french-defence::9::Bb5+@16': N326,
  'french-defence::9::Be3@14': N327,
  'french-defence::9::Bg5@14': N328,
  'french-defence::9::Bg5@16': N329,
  'french-defence::9::Nd2@4': N263,
  'french-defence::9::O-O@14': N330,
  'french-defence::9::c3@14': N331,
  'french-defence::9::e5@4': N115,
  'french-defence::9::exd5@4': N270,
  'pirc-defence::0::Bd3@8': N332,
  'pirc-defence::0::Be2@10': N333,
  'pirc-defence::0::Be3@10': N334,
  'pirc-defence::0::Be3@14': N335,
  'pirc-defence::0::Bxa6@14': N336,
  'pirc-defence::0::Qe1@16': N337,
  'pirc-defence::0::dxc5@14': N338,
  'pirc-defence::0::e5@10': N339,
  'pirc-defence::0::e5@14': N340,
  'pirc-defence::0::h3@16': N341,
  'pirc-defence::1::Bc4@18': N342,
  'pirc-defence::1::Bc4@8': N343,
  'pirc-defence::1::Be3@16': N344,
  'pirc-defence::1::Be3@8': N345,
  'pirc-defence::1::Bf4@8': N346,
  'pirc-defence::1::Bg5@16': N347,
  'pirc-defence::1::Re1@12': N348,
  'pirc-defence::1::Re1@16': N349,
  'pirc-defence::1::h3@12': N350,
  'pirc-defence::1::h3@8': N351,
  'pirc-defence::2::Be2@10': N352,
  'pirc-defence::2::Bg5@6': N353,
  'pirc-defence::2::Bh6@10': N354,
  'pirc-defence::2::Nf3@10': N355,
  'pirc-defence::2::Nf3@6': N356,
  'pirc-defence::2::O-O-O@10': N357,
  'pirc-defence::2::f3@4': N358,
  'pirc-defence::2::f4@6': N359,
  'pirc-defence::2::h3@10': N360,
  'pirc-defence::2::h4@10': N361,
  'pirc-defence::3::Bd3@14': N362,
  'pirc-defence::3::Be2@12': N363,
  'pirc-defence::3::Bh6@12': N364,
  'pirc-defence::3::Kb1@12': N365,
  'pirc-defence::3::Nf3@12': N366,
  'pirc-defence::3::e5@12': N367,
  'pirc-defence::3::e5@8': N368,
  'pirc-defence::3::f3@12': N369,
  'pirc-defence::3::f4@8': N370,
  'pirc-defence::3::h4@12': N371,
  'pirc-defence::4::Bd3@4': N372,
  'pirc-defence::4::Bg5@14': N373,
  'pirc-defence::4::Bg5@16': N374,
  'pirc-defence::4::Qe2@14': N375,
  'pirc-defence::4::Re1@12': N376,
  'pirc-defence::4::a5@14': N377,
  'pirc-defence::4::a5@16': N378,
  'pirc-defence::4::dxe5@6': N379,
  'pirc-defence::4::f3@4': N358,
  'pirc-defence::4::h3@14': N380,
  'pirc-defence::5::Be3@14': N381,
  'pirc-defence::5::Bg5@14': N382,
  'pirc-defence::5::Bg5@16': N383,
  'pirc-defence::5::d5@12': N384,
  'pirc-defence::5::dxe5@12': N385,
  'pirc-defence::5::dxe5@14': N386,
  'pirc-defence::5::f4@16': N387,
  'pirc-defence::5::h3@12': N388,
  'pirc-defence::5::h3@14': N389,
  'pirc-defence::5::h3@16': N390,
  'pirc-defence::6::Bd3@4': N372,
  'pirc-defence::6::Nf3@6': N391,
  'pirc-defence::6::O-O@12': N392,
  'pirc-defence::6::Qe1@16': N393,
  'pirc-defence::6::dxe5@10': N394,
  'pirc-defence::6::dxe5@12': N395,
  'pirc-defence::6::f3@4': N358,
  'pirc-defence::6::fxe5@10': N396,
  'pirc-defence::6::fxe5@12': N397,
  'pirc-defence::6::h3@14': N398,
  'pirc-defence::7::Bc4@12': N399,
  'pirc-defence::7::Bd3@8': N332,
  'pirc-defence::7::Be2@10': N333,
  'pirc-defence::7::Be3@10': N334,
  'pirc-defence::7::Be3@12': N400,
  'pirc-defence::7::e5@8': N401,
  'pirc-defence::7::e6@12': N402,
  'pirc-defence::7::h4@12': N403,
  'scandinavian-defence::0::Bb3@14': N404,
  'scandinavian-defence::0::Nd5@14': N405,
  'scandinavian-defence::0::Ne4@14': N406,
  'scandinavian-defence::0::Ne5@14': N407,
  'scandinavian-defence::0::Nf3@4': N408,
  'scandinavian-defence::0::O-O@16': N409,
  'scandinavian-defence::0::a3@16': N410,
  'scandinavian-defence::0::a3@18': N411,
  'scandinavian-defence::0::h3@14': N412,
  'scandinavian-defence::1::Bb5+@4': N413,
  'scandinavian-defence::1::Be3@14': N414,
  'scandinavian-defence::1::Be3@16': N415,
  'scandinavian-defence::1::Nf3@4': N416,
  'scandinavian-defence::1::Re1@12': N417,
  'scandinavian-defence::1::c3@12': N418,
  'scandinavian-defence::1::c4@4': N419,
  'scandinavian-defence::1::c4@6': N420,
  'scandinavian-defence::1::h3@12': N421,
  'scandinavian-defence::1::h3@14': N422,
  'scandinavian-defence::2::Bb5+@4': N413,
  'scandinavian-defence::2::Be2@12': N423,
  'scandinavian-defence::2::Nc3@12': N424,
  'scandinavian-defence::2::Nf3@12': N425,
  'scandinavian-defence::2::Qa4+@12': N426,
  'scandinavian-defence::2::Qe2@12': N427,
  'scandinavian-defence::2::a3@12': N428,
  'scandinavian-defence::2::d4@4': N429,
  'scandinavian-defence::2::d5@12': N430,
  'scandinavian-defence::3::Be3@12': N431,
  'scandinavian-defence::3::Be3@14': N432,
  'scandinavian-defence::3::Bg5@12': N433,
  'scandinavian-defence::3::Bg5@14': N434,
  'scandinavian-defence::3::Nf3@4': N408,
  'scandinavian-defence::3::Re1@14': N435,
  'scandinavian-defence::3::d4@4': N436,
  'scandinavian-defence::3::g3@10': N168,
  'scandinavian-defence::3::h3@12': N437,
  'scandinavian-defence::3::h3@14': N438,
  'scandinavian-defence::4::Bb5+@4': N413,
  'scandinavian-defence::4::Be3@10': N439,
  'scandinavian-defence::4::Nc3@10': N440,
  'scandinavian-defence::4::Nc3@12': N441,
  'scandinavian-defence::4::Nc3@14': N442,
  'scandinavian-defence::4::Nf3@4': N416,
  'scandinavian-defence::4::c3@10': N443,
  'scandinavian-defence::4::c3@14': N444,
  'scandinavian-defence::4::c4@12': N445,
  'scandinavian-defence::4::c4@4': N419,
  'scandinavian-defence::5::Be3@12': N446,
  'scandinavian-defence::5::Be3@14': N447,
  'scandinavian-defence::5::Bf4@12': N448,
  'scandinavian-defence::5::Bg5@12': N449,
  'scandinavian-defence::5::Bg5@14': N450,
  'scandinavian-defence::5::O-O@12': N451,
  'scandinavian-defence::5::Qd3@12': N452,
  'scandinavian-defence::5::Qd3@18': N453,
  'scandinavian-defence::5::Re1@16': N454,
  'scandinavian-defence::5::g4@14': N455,
  'scandinavian-defence::6::Bb3@14': N456,
  'scandinavian-defence::6::Nd5@14': N457,
  'scandinavian-defence::6::Ne4@14': N458,
  'scandinavian-defence::6::Ne5@14': N459,
  'scandinavian-defence::6::Nf3@4': N408,
  'scandinavian-defence::6::O-O@16': N460,
  'scandinavian-defence::6::a3@16': N461,
  'scandinavian-defence::6::a3@18': N462,
  'scandinavian-defence::6::h3@14': N463,
  'sicilian-alapin::0::Bb5@12': N464,
  'sicilian-alapin::0::Bb5@14': N465,
  'sicilian-alapin::0::Bd3@4': N54,
  'sicilian-alapin::0::Bxf7+@14': N466,
  'sicilian-alapin::0::Nc3@12': N467,
  'sicilian-alapin::0::Qc2@4': N57,
  'sicilian-alapin::0::d3@4': N58,
  'sicilian-alapin::0::d4@4': N59,
  'sicilian-alapin::0::exd6@12': N468,
  'sicilian-alapin::0::f3@4': N61,
  'sicilian-alapin::1::Be2@10': N469,
  'sicilian-alapin::1::Be3@10': N470,
  'sicilian-alapin::1::Na3@10': N471,
  'sicilian-alapin::1::Nf3@6': N472,
  'sicilian-alapin::1::Rc1@20': N473,
  'sicilian-alapin::1::Re1@14': N474,
  'sicilian-alapin::1::c4@14': N475,
  'sicilian-alapin::1::d4@4': N476,
  'sicilian-alapin::1::e5@4': N477,
  'sicilian-alapin::1::h3@14': N478,
  'sicilian-alapin::2::Bd3@14': N479,
  'sicilian-alapin::2::Be3@14': N480,
  'sicilian-alapin::2::Bg5@14': N481,
  'sicilian-alapin::2::Nbd2@14': N482,
  'sicilian-alapin::2::a3@14': N483,
  'sicilian-alapin::2::b3@14': N484,
  'sicilian-alapin::2::dxc5@14': N485,
  'sicilian-alapin::2::exd5@6': N486,
  'sicilian-alapin::2::g4@14': N487,
  'sicilian-alapin::2::h3@14': N488,
  'sicilian-alapin::3::Bb5@12': N489,
  'sicilian-alapin::3::Bd3@10': N490,
  'sicilian-alapin::3::Bd3@14': N491,
  'sicilian-alapin::3::Be3@10': N492,
  'sicilian-alapin::3::Be3@12': N493,
  'sicilian-alapin::3::Nf3@10': N494,
  'sicilian-alapin::3::f4@10': N495,
  'sicilian-alapin::3::f4@12': N496,
  'sicilian-alapin::3::h3@10': N497,
  'sicilian-alapin::3::h3@12': N498,
  'sicilian-alapin::4::Bb5@12': N52,
  'sicilian-alapin::4::Bb5@14': N499,
  'sicilian-alapin::4::Bd3@4': N54,
  'sicilian-alapin::4::Bxf7+@14': N500,
  'sicilian-alapin::4::Nc3@12': N56,
  'sicilian-alapin::4::Qc2@4': N57,
  'sicilian-alapin::4::d3@4': N58,
  'sicilian-alapin::4::d4@4': N59,
  'sicilian-alapin::4::exd6@12': N60,
  'sicilian-alapin::4::f3@4': N61,
  'sicilian-alapin::5::Bb5@10': N501,
  'sicilian-alapin::5::Be2@10': N502,
  'sicilian-alapin::5::Be3@10': N503,
  'sicilian-alapin::5::Na3@10': N504,
  'sicilian-alapin::5::Nf3@6': N472,
  'sicilian-alapin::5::Nxe5@10': N505,
  'sicilian-alapin::5::c4@10': N506,
  'sicilian-alapin::5::d4@4': N476,
  'sicilian-alapin::5::dxc5@8': N507,
  'sicilian-alapin::5::e5@4': N477,
  'sicilian-alapin::6::Bb3@14': N508,
  'sicilian-alapin::6::Bb5@12': N464,
  'sicilian-alapin::6::Bd3@4': N54,
  'sicilian-alapin::6::Bxf7+@14': N466,
  'sicilian-alapin::6::Nc3@12': N467,
  'sicilian-alapin::6::Qc2@4': N57,
  'sicilian-alapin::6::d3@4': N58,
  'sicilian-alapin::6::d4@4': N59,
  'sicilian-alapin::6::exd6@12': N468,
  'sicilian-alapin::6::f3@4': N61,
  'sicilian-alapin::7::Bb5+@6': N509,
  'sicilian-alapin::7::Bb5+@8': N510,
  'sicilian-alapin::7::Bb5@12': N511,
  'sicilian-alapin::7::Bc4@12': N512,
  'sicilian-alapin::7::Nc3@10': N513,
  'sicilian-alapin::7::Nc3@12': N514,
  'sicilian-alapin::7::Nf3@6': N515,
  'sicilian-alapin::7::Qa4+@6': N516,
  'sicilian-alapin::7::d4@4': N476,
  'sicilian-alapin::7::e5@4': N477,
  'sicilian-dragon::0::Bb5+@4': N517,
  'sicilian-dragon::0::Bg5@24': N518,
  'sicilian-dragon::0::Bh6@24': N519,
  'sicilian-dragon::0::Nde2@28': N520,
  'sicilian-dragon::0::O-O-O@16': N521,
  'sicilian-dragon::0::Qxd4@6': N522,
  'sicilian-dragon::0::c3@4': N523,
  'sicilian-dragon::0::f3@8': N524,
  'sicilian-dragon::0::g4@24': N525,
  'sicilian-dragon::1::Bb5+@4': N517,
  'sicilian-dragon::1::Be2@10': N526,
  'sicilian-dragon::1::Bh6@24': N519,
  'sicilian-dragon::1::Kb1@24': N527,
  'sicilian-dragon::1::O-O-O@16': N521,
  'sicilian-dragon::1::Qxd4@6': N522,
  'sicilian-dragon::1::c3@4': N523,
  'sicilian-dragon::1::f3@8': N524,
  'sicilian-dragon::1::g4@24': N525,
  'sicilian-dragon::2::Bb5+@4': N517,
  'sicilian-dragon::2::Be2@10': N526,
  'sicilian-dragon::2::O-O-O@16': N521,
  'sicilian-dragon::2::Qxd4@6': N522,
  'sicilian-dragon::2::c3@4': N523,
  'sicilian-dragon::2::f3@8': N524,
  'sicilian-dragon::2::g3@10': N528,
  'sicilian-dragon::2::g4@16': N529,
  'sicilian-dragon::2::h4@18': N530,
  'sicilian-dragon::3::Bb5+@4': N517,
  'sicilian-dragon::3::Bc4@10': N531,
  'sicilian-dragon::3::Be3@10': N532,
  'sicilian-dragon::3::Qd2@18': N533,
  'sicilian-dragon::3::Qxd4@6': N522,
  'sicilian-dragon::3::c3@4': N523,
  'sicilian-dragon::3::f3@18': N534,
  'sicilian-dragon::3::f3@8': N524,
  'sicilian-dragon::3::g3@10': N528,
  'sicilian-dragon::4::Bb5+@4': N517,
  'sicilian-dragon::4::Bc4@14': N535,
  'sicilian-dragon::4::Bd3@14': N536,
  'sicilian-dragon::4::Be2@10': N526,
  'sicilian-dragon::4::Be3@10': N532,
  'sicilian-dragon::4::Be3@14': N537,
  'sicilian-dragon::4::Qxd4@6': N522,
  'sicilian-dragon::4::c3@4': N523,
  'sicilian-dragon::4::f3@8': N524,
  'sicilian-dragon::5::Bb5@4': N189,
  'sicilian-dragon::5::Qd2@16': N538,
  'sicilian-dragon::5::Rc1@18': N539,
  'sicilian-dragon::5::c3@6': N540,
  'sicilian-dragon::5::f3@12': N541,
  'sicilian-dragon::5::f3@14': N542,
  'sicilian-dragon::5::f3@16': N543,
  'sicilian-dragon::5::f3@18': N544,
  'sicilian-dragon::5::f4@18': N545,
  'sicilian-dragon::5::h3@18': N546,
  'sicilian-dragon::6::Bb5+@4': N517,
  'sicilian-dragon::6::Bc4@16': N547,
  'sicilian-dragon::6::Be2@10': N548,
  'sicilian-dragon::6::Bg5@10': N549,
  'sicilian-dragon::6::Bh6@16': N550,
  'sicilian-dragon::6::f3@8': N524,
  'sicilian-dragon::6::g4@16': N551,
  'sicilian-dragon::6::g4@18': N552,
  'sicilian-dragon::6::h3@10': N553,
  'sicilian-dragon::7::Bb5+@12': N554,
  'sicilian-dragon::7::Bb5+@4': N517,
  'sicilian-dragon::7::Bc4@10': N531,
  'sicilian-dragon::7::Be2@10': N526,
  'sicilian-dragon::7::Be3@10': N532,
  'sicilian-dragon::7::Qxd4@6': N522,
  'sicilian-dragon::7::c3@4': N523,
  'sicilian-dragon::7::f3@8': N524,
  'sicilian-dragon::7::g3@10': N528,
  'sicilian-najdorf::0::Bb5+@4': N517,
  'sicilian-najdorf::0::Bd3@16': N555,
  'sicilian-najdorf::0::Be2@10': N548,
  'sicilian-najdorf::0::Be2@16': N556,
  'sicilian-najdorf::0::Bg5@10': N549,
  'sicilian-najdorf::0::Nd5@16': N557,
  'sicilian-najdorf::0::f3@8': N524,
  'sicilian-najdorf::0::g4@16': N558,
  'sicilian-najdorf::0::g4@18': N559,
  'sicilian-najdorf::1::Bb5+@4': N517,
  'sicilian-najdorf::1::Bc4@10': N560,
  'sicilian-najdorf::1::Be3@10': N561,
  'sicilian-najdorf::1::Bg5@10': N549,
  'sicilian-najdorf::1::Qxd4@6': N522,
  'sicilian-najdorf::1::c3@4': N523,
  'sicilian-najdorf::1::f3@10': N562,
  'sicilian-najdorf::1::f3@8': N524,
  'sicilian-najdorf::1::h3@10': N553,
  'sicilian-najdorf::2::Bb5+@4': N517,
  'sicilian-najdorf::2::Bc4@14': N563,
  'sicilian-najdorf::2::Bd3@14': N564,
  'sicilian-najdorf::2::Be2@10': N548,
  'sicilian-najdorf::2::Be2@14': N565,
  'sicilian-najdorf::2::Be3@10': N561,
  'sicilian-najdorf::2::Qd2@14': N566,
  'sicilian-najdorf::2::e5@14': N567,
  'sicilian-najdorf::2::f3@8': N524,
  'sicilian-najdorf::3::Bb5+@4': N517,
  'sicilian-najdorf::3::Bc4@10': N560,
  'sicilian-najdorf::3::Be2@10': N548,
  'sicilian-najdorf::3::Be3@10': N561,
  'sicilian-najdorf::3::Qxd4@6': N522,
  'sicilian-najdorf::3::c3@4': N523,
  'sicilian-najdorf::3::f3@10': N562,
  'sicilian-najdorf::3::f3@8': N524,
  'sicilian-najdorf::3::h3@10': N553,
  'sicilian-najdorf::4::Bb5+@4': N517,
  'sicilian-najdorf::4::Be2@16': N568,
  'sicilian-najdorf::4::Be3@10': N561,
  'sicilian-najdorf::4::Bg5@10': N549,
  'sicilian-najdorf::4::Bg5@14': N569,
  'sicilian-najdorf::4::Nde2@12': N570,
  'sicilian-najdorf::4::Nf5@12': N571,
  'sicilian-najdorf::4::f3@8': N524,
  'sicilian-najdorf::4::g4@18': N572,
  'sicilian-najdorf::5::Bb5+@4': N517,
  'sicilian-najdorf::5::Be2@10': N548,
  'sicilian-najdorf::5::Be3@10': N561,
  'sicilian-najdorf::5::Bg5@10': N549,
  'sicilian-najdorf::5::Qxd4@6': N522,
  'sicilian-najdorf::5::c3@4': N523,
  'sicilian-najdorf::5::f3@10': N562,
  'sicilian-najdorf::5::f3@8': N524,
  'sicilian-najdorf::5::h3@10': N553,
  'sicilian-najdorf::6::Bb5+@4': N517,
  'sicilian-najdorf::6::Bc4@10': N560,
  'sicilian-najdorf::6::Be2@10': N548,
  'sicilian-najdorf::6::Be3@10': N561,
  'sicilian-najdorf::6::Bg5@10': N549,
  'sicilian-najdorf::6::c3@4': N523,
  'sicilian-najdorf::6::f3@10': N562,
  'sicilian-najdorf::6::f3@8': N524,
  'sicilian-najdorf::6::h3@10': N553,
  'sicilian-najdorf::7::Bb5+@4': N517,
  'sicilian-najdorf::7::Bc4@10': N560,
  'sicilian-najdorf::7::Be2@10': N548,
  'sicilian-najdorf::7::Bg5@10': N549,
  'sicilian-najdorf::7::f3@10': N562,
  'sicilian-najdorf::7::f3@18': N573,
  'sicilian-najdorf::7::f3@8': N524,
  'sicilian-najdorf::7::h3@10': N553,
  'sicilian-najdorf::7::h3@18': N574,
  'sicilian-najdorf::8::Bb5+@4': N517,
  'sicilian-najdorf::8::Bc4@10': N560,
  'sicilian-najdorf::8::Be2@10': N548,
  'sicilian-najdorf::8::Be3@10': N561,
  'sicilian-najdorf::8::Bg5@10': N549,
  'sicilian-najdorf::8::c3@4': N523,
  'sicilian-najdorf::8::f3@10': N562,
  'sicilian-najdorf::8::f3@8': N524,
  'sicilian-najdorf::8::h3@10': N553,
  'sicilian-sveshnikov::0::Bb5@4': N189,
  'sicilian-sveshnikov::0::Be2@22': N575,
  'sicilian-sveshnikov::0::Nb3@10': N576,
  'sicilian-sveshnikov::0::Nf3@10': N577,
  'sicilian-sveshnikov::0::Nf5@10': N578,
  'sicilian-sveshnikov::0::Nxc6@10': N579,
  'sicilian-sveshnikov::0::Nxc6@8': N580,
  'sicilian-sveshnikov::0::a4@24': N581,
  'sicilian-sveshnikov::0::f3@8': N582,
  'sicilian-sveshnikov::1::Bb5@4': N189,
  'sicilian-sveshnikov::1::Nb3@10': N576,
  'sicilian-sveshnikov::1::Nc3@4': N583,
  'sicilian-sveshnikov::1::Nd5@16': N584,
  'sicilian-sveshnikov::1::Nf3@10': N577,
  'sicilian-sveshnikov::1::Nf5@10': N578,
  'sicilian-sveshnikov::1::Nxc6@10': N579,
  'sicilian-sveshnikov::1::Nxc6@8': N580,
  'sicilian-sveshnikov::1::f3@8': N582,
  'sicilian-sveshnikov::2::Bb5@4': N189,
  'sicilian-sveshnikov::2::Bxf6@16': N585,
  'sicilian-sveshnikov::2::Nb3@10': N576,
  'sicilian-sveshnikov::2::Nc3@4': N583,
  'sicilian-sveshnikov::2::Nf3@10': N577,
  'sicilian-sveshnikov::2::Nf5@10': N578,
  'sicilian-sveshnikov::2::Nxc6@10': N579,
  'sicilian-sveshnikov::2::Nxc6@8': N580,
  'sicilian-sveshnikov::2::f3@8': N582,
  'sicilian-sveshnikov::3::Bb5@4': N189,
  'sicilian-sveshnikov::3::Bxf6@16': N585,
  'sicilian-sveshnikov::3::Nb3@10': N576,
  'sicilian-sveshnikov::3::Nc3@4': N583,
  'sicilian-sveshnikov::3::Nf3@10': N577,
  'sicilian-sveshnikov::3::Nf5@10': N578,
  'sicilian-sveshnikov::3::Nxc6@10': N579,
  'sicilian-sveshnikov::3::Nxc6@8': N580,
  'sicilian-sveshnikov::3::f3@8': N582,
  'sicilian-sveshnikov::4::Bb5@4': N189,
  'sicilian-sveshnikov::4::Nb3@10': N576,
  'sicilian-sveshnikov::4::Nc3@4': N583,
  'sicilian-sveshnikov::4::Ndb5@10': N586,
  'sicilian-sveshnikov::4::Nf5@10': N578,
  'sicilian-sveshnikov::4::Nxc6@10': N579,
  'sicilian-sveshnikov::4::Nxc6@8': N580,
  'sicilian-sveshnikov::4::O-O@14': N587,
  'sicilian-sveshnikov::4::f3@8': N582,
  'sicilian-sveshnikov::5::Bb5@4': N189,
  'sicilian-sveshnikov::5::Bxf6@16': N585,
  'sicilian-sveshnikov::5::Nb3@10': N576,
  'sicilian-sveshnikov::5::Nc3@4': N583,
  'sicilian-sveshnikov::5::Nf3@10': N577,
  'sicilian-sveshnikov::5::Nf5@10': N578,
  'sicilian-sveshnikov::5::Nxc6@10': N579,
  'sicilian-sveshnikov::5::Nxc6@8': N580,
  'sicilian-sveshnikov::5::f3@8': N582,
  'sicilian-sveshnikov::6::Bb5@4': N189,
  'sicilian-sveshnikov::6::Bd3@16': N588,
  'sicilian-sveshnikov::6::Be3@16': N589,
  'sicilian-sveshnikov::6::Bg5@16': N590,
  'sicilian-sveshnikov::6::Nb3@8': N591,
  'sicilian-sveshnikov::6::Nf3@8': N592,
  'sicilian-sveshnikov::6::Nf5@8': N593,
  'sicilian-sveshnikov::6::Nxc6@8': N594,
  'sicilian-sveshnikov::6::c3@6': N540,
  'sicilian-sveshnikov::6::f3@16': N595,
  'sicilian-sveshnikov::7::Bb5@4': N189,
  'sicilian-sveshnikov::7::Be2@22': N575,
  'sicilian-sveshnikov::7::Nb3@10': N576,
  'sicilian-sveshnikov::7::Nc3@4': N583,
  'sicilian-sveshnikov::7::Nf3@10': N577,
  'sicilian-sveshnikov::7::Nf5@10': N578,
  'sicilian-sveshnikov::7::Nxc6@10': N579,
  'sicilian-sveshnikov::7::Nxc6@8': N580,
  'sicilian-sveshnikov::7::f3@8': N582,
  'smith-morra-gambit::0::Bd7@17': N596,
  'smith-morra-gambit::0::Be6@21': N597,
  'smith-morra-gambit::0::Bg4@19': N598,
  'smith-morra-gambit::0::Nf6@5': N599,
  'smith-morra-gambit::0::O-O@17': N600,
  'smith-morra-gambit::0::Qa5@17': N601,
  'smith-morra-gambit::0::Qb6@17': N602,
  'smith-morra-gambit::0::Qc7@17': N603,
  'smith-morra-gambit::0::a6@17': N604,
  'smith-morra-gambit::0::a6@21': N605,
  'smith-morra-gambit::1::Bd7@15': N606,
  'smith-morra-gambit::1::Bg4@15': N607,
  'smith-morra-gambit::1::a6@15': N608,
  'smith-morra-gambit::1::a6@21': N609,
  'smith-morra-gambit::1::d5@15': N610,
  'smith-morra-gambit::1::dxc3@5': N611,
  'smith-morra-gambit::1::dxe5@13': N612,
  'smith-morra-gambit::1::e6@13': N613,
  'smith-morra-gambit::1::e6@15': N614,
  'smith-morra-gambit::1::e6@9': N615,
  'smith-morra-gambit::2::Bd7@19': N616,
  'smith-morra-gambit::2::Be6@19': N617,
  'smith-morra-gambit::2::Bg4@15': N618,
  'smith-morra-gambit::2::Nf6@13': N619,
  'smith-morra-gambit::2::a6@17': N620,
  'smith-morra-gambit::2::a6@19': N621,
  'smith-morra-gambit::2::b6@19': N622,
  'smith-morra-gambit::2::dxc3@5': N611,
  'smith-morra-gambit::2::e6@13': N623,
  'smith-morra-gambit::2::h6@19': N624,
};
