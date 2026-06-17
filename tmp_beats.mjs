import fs from 'fs';
import { Chess } from 'chess.js';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
let src=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const re=/^\s*'([^']+)':\s*([A-Z_][A-Z0-9_]*),/gm;
const constKeys={}; let m; while((m=re.exec(src))){ (constKeys[m[2]] ??= []).push(m[1]); }
function movesOf(key){const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(key);const[,op,vi,trig,ply]=mm;const list=d[op]?.[vi]??[];const s=list.find(x=>x.triggerMove===trig&&x.atPly===Number(ply));return s||null;}

// beat defs: const -> {at, say, short, arrows:[[from,to,color?]], hi:[[sq,color]]}
const B = {
RUY_BERLIN:{at:5,say:"Nf6 leaves e5 to its fate and bites at e4 instead — pure Berlin nerve. Castle behind your own pressure: the f3-knight already leans on e5, and after Nxe4 d4 Nd6 the queens come off into the endgame you want.",short:"Nf6 — castle, your knight eyes e5.",ar:[['f3','e5']],hi:[['e5','KEY'],['e4','SOFT']]},
RUY_OPEN:{at:9,say:"Black snatches e4 — now hammer the centre straight back. d4 prises it open, the e4-knight gets chased, and your central majority plus the loose black queenside tell the tale.",short:"Nxe4 — strike d4 at the centre.",hi:[['d4','KEY'],['e4','ATK']]},
RUY_B5:{at:9,say:"b5 puts the question to your bishop — slide it to b3, where it still glares down the diagonal toward f7. You concede nothing, and the early b5 leaves c6 and d5 a shade loose for later.",short:"b5 — retreat to b3, eye f7.",ar:[['a4','b3']],hi:[['b3','KEY'],['f7','SOFT']]},
RUY_BG4:{at:15,say:"Bg4 pins your f3-knight to the queen — no need to fret. h3 puts the question; after Bh5 you keep the d4 break in hand and the pin is an itch, not a wound.",short:"Bg4 — h3 puts the question.",hi:[['f3','KEY'],['h3','ATK']]},
RUY_CHIGORIN:{at:17,say:"Na5 lunges at your prized bishop — refuse the trade. Bc2 keeps it alive on the b1-h7 road aimed at Black's king, while the knight sulks on the rim, miles from the centre.",short:"Na5 — keep the bishop, Bc2.",ar:[['b3','c2']],hi:[['c2','KEY'],['a5','SOFT']]},
RUY_BREYER:{at:17,say:"Nb8 — the deep Breyer retreat, rerouting the knight via d7. While it tours the back rank, seize the moment: d4 claims the full centre before the knight ever gets home.",short:"Nb8 — grab the centre with d4.",hi:[['d4','KEY'],['b8','SOFT']]},
RUY_ZAITSEV:{at:17,say:"Bb7 trains on e4 down the long diagonal — meet it head-on with d4, building the broad duo. The pressure on e4 is real but contained, and your space plus the knight tour keep the initiative.",short:"Bb7 — answer d4, hold e4.",hi:[['e4','KEY'],['d4','ATK']]},
RUY_BB7_A4:{at:15,say:"Bb7 answers your a4 thrust — keep prising the queenside. Trade or jab on b5, then turn to d4: you've dodged the Marshall entirely and kept a clean Spanish pull.",short:"Bb7 — press b5, then d4.",hi:[['b5','KEY'],['d4','SOFT']]},
RUY_BE7_LATE:{at:11,say:"Be7 tucks back into the solid slot — nothing changes for you. c3 and d4 build the centre, then Nbd2-f1-g3 swings the knight kingside. Sound but passive; the space is yours.",short:"Be7 — c3 and d4, take space.",hi:[['d4','KEY']]},
RUY_MARSHALL_E4:{at:17,say:"e4 jabs your knight and clears the way for Black's onslaught — but you're a clean pawn up. Tuck the knight to d2, wall up with Be3, and once the storm blows out the pawn decides.",short:"e4 — retreat the knight to d2.",ar:[['f3','d2']],hi:[['d2','KEY'],['e4','SOFT']]},
IT_GP_BC5:{at:5,say:"Bc5 — the Giuoco, both bishops trained on the enemy f-pawn. Stake your tempo: c3 readies d4 to blow the centre open while your bishop already eyes f7.",short:"Bc5 — c3 then d4, eye f7.",ar:[['c4','f7']],hi:[['d4','KEY'],['f7','SOFT']]},
IT_TWO_KNIGHTS:{at:5,say:"Nf6 hits e4 and picks a fight — oblige it. d4 cracks the centre, or Ng5 dives straight at f7. Both swing your pieces at Black's tender point.",short:"Nf6 — d4 or Ng5 at f7.",ar:[['c4','f7']],hi:[['e4','KEY'],['f7','SOFT']]},
IT_HUNGARIAN:{at:5,say:"Be7 — the meek Hungarian. Punish the passivity: d4 plants the full centre, you castle and develop with a free hand while Black sits cramped and short of counterplay.",short:"Be7 — take the centre with d4.",hi:[['d4','KEY']]},
IT_GIUOCO_BB6:{at:11,say:"Bb6 hands you the prize — a broad d4-e4 centre. Roll it forward: d5 grabs space and cramps the c6-knight, and your central majority squeezes Black off the board.",short:"Bb6 — push d5, cramp c6.",hi:[['d5','KEY'],['c6','SOFT']]},
IT_PIANISSIMO_BB6:{at:11,say:"Bb6 keeps it quiet — stay patient. c3 braces the centre, the knight tours Nbd2-f1-g3, and the d4 break waits in reserve. A long squeeze where your small space edge is the asset.",short:"Bb6 — patient: c3, then d4.",hi:[['d4','KEY']]},
IT_GRECO_BXC3:{at:13,say:"Bxc3+ trades to dent your pawns — but bxc3 hands you a towering d4-e4 centre and a half-open b-file. Push d5 or e5 and storm: those pawns are a battering ram, not a weakness.",short:"Bxc3+ — bxc3, towering centre.",hi:[['d4','KEY'],['e4','ATK']]},
IT_GRECO_OO:{at:13,say:"O-O castles right into your guns — uncork the attack. d5 kicks the c6-knight, Bg5 pins its defender, and the e-pawn rolls at the king. Centre, bishops, initiative: go fast.",short:"O-O — d5 and Bg5, attack.",ar:[['c1','g5']],hi:[['d5','KEY'],['g5','ATK']]},
IT_BD2_QUIET:{at:15,say:"O-O — the quiet line, and your isolated d4-pawn is the proud kind: it grips e5 and c5. Re1 and Ne5 post your pieces aggressively; the isolani is a spear here, never a weakness.",short:"O-O — active isolani, Ne5.",ar:[['f3','e5']],hi:[['d4','KEY'],['e5','ATK']]},
IT_BD2_D6:{at:15,say:"d6 keeps the structure compact — no attack to fear, none to fear from. Finish with Nc3 and Re1, hold the central d4-pawn, and play the long game from the better side of equality.",short:"d6 — develop, hold d4.",hi:[['d4','KEY']]},
IT_EVANS:{at:11,say:"You're a pawn down and on top — the Evans bargain. The c3-d4 centre rolls, Ba3 will rake the king, and Qb3 lines up with your bishop on f7. Develop with threats and pour it on.",short:"Evans — roll the centre, hit f7.",ar:[['c4','f7']],hi:[['d4','KEY'],['f7','SOFT']]},
TK_D3_QUIET:{at:6,say:"d3 ducks the sharp lines — develop in comfort. The bishop swings to c5, you castle, and the freeing d5 break beckons. Sound and equal, every piece flowing to a good square.",short:"d3 — …Bc5, aim for …d5.",ar:[['f8','c5']],hi:[['c5','KEY'],['d5','SOFT']]},
TK_NG5:{at:6,say:"Ng5 lunges at f7 — answer d5! and slam the centre shut. After exd5 the Polerio's Na5 or the sharp b5 gambits hand you a roaring initiative. Welcome this, don't fear it.",short:"Ng5 — answer …d5, seize play.",hi:[['d5','KEY'],['f7','SOFT']]},
TK_D4_GAMBIT:{at:6,say:"d4 — the Scotch Gambit. Take it: exd4, then meet the coming Max Lange with your own d5 break, returning the pawn to free your game and blunt White's bishop.",short:"d4 — take exd4, then …d5.",hi:[['d4','KEY'],['d5','ATK']]},
TK_QUIET_BB5:{at:14,say:"Bb5 pins after your Na5 — shrug it off. c6 puts the question; the bishop must retreat, your knight eyes the bishop pair, and the position is comfortably level. A pinprick, no more.",short:"Bb5 — kick it with …c6.",hi:[['c6','KEY'],['b5','SOFT']]},
FK_D4_PIN:{at:7,say:"Bb4 pins before resolving the centre — don't stall. d5 gains space and kicks the c6-knight, or the sharp Nxe5 grabs a pawn and tests the pin. Either way the centre opens your way.",short:"Bb4 — answer d5 or Nxe5.",hi:[['d5','KEY'],['e5','ATK']]},
SC_NF6_EARLY:{at:5,say:"Nf6 hits e4 before recapturing — answer dxe5. After Nxe4 the centre clears into a balanced game where your extra space and faster development give the nagging edge.",short:"Nf6 — take dxe5, keep the edge.",ar:[['f3','e5']],hi:[['e5','KEY']]},
SCG_D6:{at:5,say:"d6 declines the gambit meekly — make it cost. Bb5 pins the c6-knight, you keep the full d4-e4 duo, and a clean space edge gives a risk-free pull. He handed you the centre.",short:"d6 — Bb5 pin, keep the centre.",ar:[['f1','b5']],hi:[['d4','KEY'],['b5','SOFT']]},
EV_NF6:{at:5,say:"Nf6 dodges the Evans into a Two Knights — fine by you. d4 cracks the centre or Ng5 dives at f7. Play it with the same Evans aggression and keep the initiative.",short:"Nf6 — d4 or Ng5 at f7.",ar:[['c4','f7']],hi:[['e4','KEY'],['f7','SOFT']]},
EV_BXB4:{at:7,say:"Bxb4 accepts — now build the dream. c3 and d4 roll the centre, Ba3 rakes the king, and your bishop eyes f7. A pawn for a lead in development you cash straight into an attack.",short:"Bxb4 — c3, d4, then attack.",ar:[['c4','f7']],hi:[['d4','KEY'],['f7','SOFT']]},
EV_BA5:{at:9,say:"Ba5 — the main retreat. Strike: d4 throws the centre forward, Qb3 lines the queen-and-bishop battery on f7, O-O brings the rook in. The pawn's a memory; the initiative is real.",short:"Ba5 — d4 and Qb3 on f7.",ar:[['c4','f7']],hi:[['d4','KEY'],['f7','SOFT']]},
SCH_ITALIAN:{at:4,say:"Bc4 sidesteps into an Italian — comfortable for you. The bishop swings to c5, you castle and head for the d5 break. Familiar, equal, every plan at your fingertips.",short:"Bc4 — …Bc5, easy Italian.",ar:[['f8','c5']],hi:[['c5','KEY']]},
SCH_SCOTCH:{at:4,say:"d4 avoids the Schliemann with a Scotch — equalize cleanly. After exd4, Qe7 leans on e5 and Nd5 plants a central blockade; the bishop pair and easy play are yours.",short:"d4 — …Qe7 and …Nd5.",hi:[['d4','SOFT'],['d5','KEY']]},
SCH_FOUR_KNIGHTS:{at:4,say:"Nc3 steers to a calm Four Knights — mirror it. Nf6 claims your share of the centre, weakness-free, with the Bb4 pin and Nd4 counter held in reserve. Nothing to fear.",short:"Nc3 — …Nf6, easy equality.",hi:[['e4','KEY'],['e5','SOFT']]},
SCH_NC3:{at:6,say:"Nc3 — the main line. Don't blink: fxe4 and Nf6 keep the initiative rolling, challenging White's knight and grabbing the centre. Sharp, sound, and yours to attack.",short:"Nc3 — …fxe4 and …Nf6.",hi:[['e4','KEY']]},
SCH_D3:{at:6,say:"d3 keeps it solid — defuse it calmly. After fxe4 dxe4 you develop Nf6 and Bc5, eyeing the kingside down the half-open f-file. At least equal, and the more aggressive side.",short:"d3 — …Bc5, press the f-file.",ar:[['f8','c5']],hi:[['c5','KEY'],['f5','SOFT']]},
SCH_BXC6:{at:6,say:"Bxc6 trades to dent you — recapture dxc6 and count the trumps: the bishop pair, a big centre, open rook files. With Bc5 and the f4 push you grab the dynamic side.",short:"Bxc6 — …dxc6, bishop pair.",hi:[['c6','KEY'],['f4','SOFT']]},
SCH_D4:{at:6,say:"d4 counters in the centre — stay aggressive. fxe4 keeps the lines open and your knights and the f-file stay live. The open brawl is exactly where the Schliemann thrives.",short:"d4 — …fxe4, keep lines open.",hi:[['e4','KEY']]},
STAF_E5:{at:8,say:"e5 shoves your knight — bounce it to e4, a strong central outpost. Hit back with c5 and Bc5; White's king sits uncastled while your development races ahead.",short:"e5 — …Ne4, hit back …c5.",ar:[['f6','e4']],hi:[['e4','KEY'],['c5','SOFT']]},
STAF_CRITICAL:{at:6,say:"Nxf7 — White's critical fork wins the exchange, the Stafford at its thinnest. Take it with Kxf7, spring your development ahead, and play for activity and traps, eyes open you're fighting for the draw.",short:"Nxf7 — …Kxf7, fight for it.",hi:[['f7','KEY']]},
MAR_ITALIAN:{at:4,say:"Bc4 dodges into an Italian — comfortable. The bishop posts to c5, you head for d6 and the d5 break. Equal and well-charted; White's gained nothing by avoiding the fight.",short:"Bc4 — …Bc5, comfortable Italian.",ar:[['f8','c5']],hi:[['c5','KEY']]},
MAR_SCOTCH:{at:4,say:"d4 avoids the Ruy with a Scotch — equalize cleanly. Qe7 leans on e5, Nd5 blockades the centre; the bishop pair and easy development are yours, and White's sidestep cost him any edge.",short:"d4 — …Qe7 and …Nd5.",hi:[['d4','SOFT'],['d5','KEY']]},
MAR_FOUR_KNIGHTS:{at:4,say:"Nc3 — a calm Four Knights. Mirror with Nf6, weakness-free, the Bb4 pin and the Nd4 Rubinstein in reserve. White dodged the Marshall, but you stand perfectly sound.",short:"Nc3 — …Nf6, easy equality.",hi:[['e4','KEY'],['e5','SOFT']]},
MAR_MAIN:{at:16,say:"exd5 — the Marshall is ON. Nxd5 recaptures, then Nf6, Bd6, Qh4 and the rook-lift swing every piece at White's king. The pawn's burned for one of chess's great attacks — go all in.",short:"exd5 — …Nxd5, storm the king.",ar:[['f6','d5']],hi:[['d5','KEY'],['h4','SOFT']]},
};

// verify every arrow origin + ply against EACH key's subline
let bad=0;
for(const [cst,b] of Object.entries(B)){
  for(const key of constKeys[cst]||[]){
    const s=movesOf(key); if(!s){console.log('NO SUBLINE',key);bad++;continue;}
    if(b.at>=s.moves.length){console.log('PLY OOR',cst,key,b.at);bad++;continue;}
    const c=new Chess(); for(let i=0;i<=b.at;i++) c.move(s.moves[i]);
    for(const a of (b.ar||[])){ if(!c.get(a[0])){console.log('EMPTY ARROW',cst,key,a[0]);bad++;} }
    if(b.short && b.short.trim().split(/\s+/).length>8){console.log('SHORT>8',cst,b.short);bad++;}
  }
}
console.log(bad? `\n${bad} PROBLEMS`:'\nALL BEATS VERIFIED OK');
fs.writeFileSync('./tmp_beats.json', JSON.stringify(B));
