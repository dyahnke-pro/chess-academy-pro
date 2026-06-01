import fs from 'node:fs';
const refs=JSON.parse(fs.readFileSync('src/data/pro-game-references.json','utf8')).filter(g=>g.playerId==='carlsen');
const win=g=>(g.studentSide==='white'&&g.result==='1-0')||(g.studentSide==='black'&&g.result==='0-1');
// authored per-variation idea fragments (grounded in each line's established plan)
const IDEA={
 'pro-carlsen-1e5::Berlin ...Nf6':'the Berlin — Carlsen steers into the queenless middlegame and outplays his opponent in the ending, the bishop pair telling',
 'pro-carlsen-1e5::vs Four Knights':'the symmetrical Four Knights — patient piece play and a timely break crack a tough nut',
 'pro-carlsen-1e5::vs Italian Bc4':'the Italian — the slow Pianissimo build, then a kingside expansion that overwhelms',
 'pro-carlsen-1e5::vs Scotch d4':'the Scotch — Black trades into a sound structure and grinds the long endgame',
 'pro-carlsen-caro-kann::Exchange':'the Exchange Caro — a balanced structure squeezed for 184 moves until it breaks',
 'pro-carlsen-caro-kann::vs 2.Nf3 d3 (KIA)':'the quiet KIA — queens come off and Carlsen presses the better structure home',
 'pro-carlsen-caro-kann::vs Two Knights':'the Two Knights Caro — Black challenges the centralised knight and wins the minor-piece battle',
 'pro-carlsen-closed-sicilian::Bb5 vs …Nc6':'the Bb5 Grand Prix — White trades the right pieces and converts a structural edge',
 'pro-carlsen-closed-sicilian::vs …d6':'the f4 Grand Prix — the kingside storm rolls and the minor-piece ending is won clean',
 'pro-carlsen-french::Winawer Bb4':'the Winawer — Black takes the bishop pair concession and grinds the heavy ending',
 'pro-carlsen-french::vs Advance e5':'the Advance — the …f6 break frees the position and the passed pawn decides',
 'pro-carlsen-french::vs Exchange':'the Exchange French — symmetry broken by superior technique',
 'pro-carlsen-french::vs Tarrasch Nd2':'the Tarrasch — patient development and a clean structural win',
 'pro-carlsen-kid::Fianchetto g3':'the Fianchetto KID — Black manoeuvres behind the closed centre and converts',
 'pro-carlsen-kid::Grünfeld ...d5':'the Grünfeld — Black hits the big centre and the dynamic play pays off',
 'pro-carlsen-kings-gambit::Falkbeer 2…d5':'the Falkbeer — White meets the counter-gambit correctly and keeps the extra pawn',
 'pro-carlsen-modern::Classical Nf3':'the Classical Modern — the g7-bishop rakes the long diagonal to a win',
 'pro-carlsen-modern::vs Austrian f4':'the Austrian Attack — Black absorbs the centre and strikes back from the flanks',
 'pro-carlsen-modern::vs Nc3 with …c6/…d5':'the …c6/…d5 Modern — the central break frees Black to a winning game',
 'pro-carlsen-nimzo::Bogo-Indian Bb4+':'the Bogo-Indian — Black equalises cleanly and outplays from a sound structure',
 'pro-carlsen-nimzo::Nimzo-Indian Bb4':'the Nimzo — the doubled-pawn structure handled to perfection',
 'pro-carlsen-nimzo::Queen’s Indian b6':'the Queen’s Indian — the long-diagonal bishop presses White’s centre to a win',
 'pro-carlsen-nimzo::vs Catalan g3':'the Open Catalan — Black holds the pawn, consolidates, and converts (vs Ding)',
 'pro-carlsen-open-sicilian::Classical Bc4':'the Classical Bc4 Open Sicilian — the d4 break opens lines for a crushing attack',
 'pro-carlsen-open-sicilian::Hyperaccelerated ...g6':'the Hyperaccelerated Dragon — the Maroczy bind squeezed home',
 'pro-carlsen-open-sicilian::Moscow Bb5+':'the Moscow — a small edge nursed into a winning ending',
 'pro-carlsen-open-sicilian::Open vs ...e6':'the Open Sicilian vs …e6 — central control converted to the full point',
 'pro-carlsen-open-sicilian::Rossolimo vs ...Nc6':'the Rossolimo — the better structure pressed to a win',
 'pro-carlsen-queens-pawn::Bogo-Indian Bb4+':'White’s d4 complex — the bishop pair and central space decide',
 'pro-carlsen-queens-pawn::Catalan g3':'the Catalan — the long-diagonal bishop and queenside pressure win',
 'pro-carlsen-queens-pawn::Nimzo-Indian Nc3':'the Nimzo with Nc3 — White’s centre and bishop pair tell',
 'pro-carlsen-queens-pawn::Queen’s Indian b6':'the Queen’s Indian — White meets …Ba6 and grinds the edge',
 'pro-carlsen-queens-pawn::vs King’s Indian g6':'the KID with d5+b4 — the queenside bayonet storm rolls through (vs Firouzja)',
 'pro-carlsen-reti::Réti into c4 vs …Nf6':'the Réti into a big centre — e4 and the space advantage convert',
 'pro-carlsen-reti::vs …c5 Symmetric':'the Symmetric Réti — the fianchetto squeeze nursed to a win',
 'pro-carlsen-reti::vs …e6 (Catalan)':'the Réti–Catalan — long-diagonal pressure to the full point',
 'pro-carlsen-ruy-lopez::Berlin vs ...Nf6':'the Berlin — a 151-move grind, the endgame mastery on full display (vs Hikaru)',
 'pro-carlsen-ruy-lopez::Four Knights Nc3':'the Four Knights — harmonious development and a clean conversion',
 'pro-carlsen-ruy-lopez::Italian Bc4':'the Giuoco Pianissimo — the slow build and the better minor pieces',
 'pro-carlsen-ruy-lopez::Scotch d4':'the Scotch — central play and a winning ending (vs Naroditsky)',
 'pro-carlsen-ruy-lopez::vs Petrov ...Nf6':'the Petrov — a tiny edge nursed into the full point',
 'pro-carlsen-scandinavian::3…Qa5 Main':'the classical 3…Qa5 — the bishop developed outside the chain, a 132-move win (vs Hikaru)',
 'pro-carlsen-scandinavian::3…Qd8 Solid':'the solid 3…Qd8 — rock-solid play that wears the opponent down',
 'pro-carlsen-scandinavian::vs 2.Nc3':'the 2.Nc3 line — …dxe4 and …Nf6 equalise, then Carlsen presses',
 'pro-carlsen-sicilian::Open vs ...Nc6':'the Sveshnikov-style Open — trade down and outplay (vs Firouzja)',
 'pro-carlsen-sicilian::Taimanov ...e6':'the Taimanov — flexible development and a 150-move masterclass (vs Hikaru)',
 'pro-carlsen-sicilian::vs Alapin c3':'the Alapin — Black frees the good bishop and presses home',
 'pro-carlsen-sicilian::vs Rossolimo Bb5':'the Rossolimo as Black — the bishop pair and the better structure win (vs Hikaru)',
 'pro-carlsen-sicilian::vs Smith-Morra / d4':'the Smith-Morra declined — Black neutralises the gambit and converts',
};
const byVar={};
for(const r of refs){ if(!win(r)||r.variation==='main')continue; const k=r.proOpeningId+'::'+r.variationLabel;(byVar[k]=byVar[k]||[]).push(r);}
const models=JSON.parse(fs.readFileSync('src/data/model-games.json','utf8'));
const haveIds=new Set(models.map(m=>m.id));
let added=0;
for(const k of Object.keys(byVar)){
  const idea=IDEA[k]; if(!idea){console.error('NO IDEA for',k);continue;}
  const top=byVar[k].sort((a,b)=>b.opponentRating-a.opponentRating)[0];
  const [oid,vlabel]=k.split('::');
  const id=`mg-${oid}-var-${vlabel.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;
  if(haveIds.has(id))continue;
  const opp=top.studentSide==='white'?top.black:top.white;
  const oppElo=top.opponentRating; const year=+(top.date||'').slice(0,4)||2024;
  models.push({
    id, openingId:oid, variation:vlabel,
    white:top.white, black:top.black,
    whiteElo:top.studentSide==='white'?top.opponentRating&&3000:top.opponentRating, // placeholder; set below
    blackElo:0,
    result:top.result, year, event:`chess.com (${top.date})`,
    pgn:top.pgn, sourceUrl:top.url&&top.url.startsWith('http')?top.url:'https://www.chess.com/member/magnuscarlsen',
    studentSide:top.studentSide,
    overview:`Carlsen vs ${opp} (${oppElo}), ${year} — ${idea}.`,
  });
  // fix elos: student side carries Carlsen, opponent the rating
  const m=models[models.length-1];
  if(top.studentSide==='white'){m.whiteElo=2882;m.blackElo=top.opponentRating;}else{m.whiteElo=top.opponentRating;m.blackElo=2882;}
  haveIds.add(id); added++;
}
fs.writeFileSync('src/data/model-games.json',JSON.stringify(models,null,2)+'\n');
console.log('added '+added+' per-variation model games; total='+models.length);
