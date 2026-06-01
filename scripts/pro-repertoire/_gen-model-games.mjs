import fs from 'node:fs';
const wins=JSON.parse(fs.readFileSync('data/sources/magnuscarlsen-model-wins.json','utf8'));
const H=(pgn,tag)=>{const m=pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"`));return m?m[1]:'';};
const bare=(pgn)=>{const i=pgn.search(/\n\n/);if(i<0)return pgn;let b=pgn.slice(i).replace(/\{[^}]*\}/g,'');let p;do{p=b;b=b.replace(/\([^()]*\)/g,'')}while(b!==p);return b.replace(/\b\d+\.+\s*/g,'').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/,'').replace(/\s+/g,' ').trim();};
// per-opening: color + theme blurbs (one per game slot, hand-authored)
const META={
 'pro-carlsen-open-sicilian':{side:'white',name:'Open Sicilian',blurbs:[
  "the English Attack in full flow — Carlsen castles long and storms the kingside to a crushing win.",
  "a model Najdorf squeeze where the d5-square and the better structure decide.",
  "the Open Sicilian as a positional weapon: small edges accumulated into a win."]},
 'pro-carlsen-ruy-lopez':{side:'white',name:'Ruy Lopez',blurbs:[
  "the Spanish slow squeeze — the b3-bishop and the knight tour grind out the point.",
  "a Closed Ruy where patient manoeuvring turns a tiny edge into a full win.",
  "the anti-Marshall: dodge the gambit, then outplay in a long strategic battle."]},
 'pro-carlsen-queens-pawn':{side:'white',name:"Queen's Pawn",blurbs:[
  "the d4 squeeze — the isolated-pawn pressure and the bishop pair convert.",
  "a Catalan-flavoured grind where the g2-bishop quietly decides the game.",
  "classic Carlsen technique: nurse a structural edge to the win."]},
 'pro-carlsen-sicilian':{side:'black',name:'Sicilian',blurbs:[
  "the Najdorf counter-attack — opposite-side castling and the queenside avalanche.",
  "Black's dynamic Sicilian where the bishop pair and the open g-file tell.",
  "a model win showing the Sicilian is a fighting weapon, not a draw."]},
 'pro-carlsen-1e5':{side:'black',name:'1...e5',blurbs:[
  "the Closed Ruy from Black's side — the Chigorin reroute and a long grind.",
  "rock-solid 1...e5 turned into a winning endgame by superior technique.",
  "a classical 1...e5 where Black's resilience outlasts White's initiative."]},
 'pro-carlsen-nimzo':{side:'black',name:'Nimzo / QGD',blurbs:[
  "the QGD freed by ...c5, then the queenside expansion converts the edge.",
  "a Nimzo-flavoured game where the bishop and the dark squares decide.",
  "sound, flexible Black play against 1.d4 ground into a win."]},
 'pro-carlsen-kid':{side:'black',name:"King's Indian",blurbs:[
  "the Mar del Plata kingside storm — ...f5-f4 and the attack crashes through.",
  "a King's Indian where Black's kingside avalanche overwhelms the white king.",
  "the King's Indian as a winning weapon: cede the centre, then attack."]},
 'pro-carlsen-french':{side:'black',name:'French',blurbs:[
  "the French counter-attack — ...c5 and ...b4 break open White's queenside.",
  "a model French where the pawn-chain strategy and ...f6 break decide.",
  "the French as a fighting defence: solid, then a queenside roller to win."]},
};
const games=JSON.parse(fs.readFileSync('src/data/model-games.json','utf8'));
const byId=new Map(games.map((g,i)=>[g.id,i]));
let added=0;
for(const [id,meta] of Object.entries(META)){
  const list=wins[id]||[];
  list.slice(0,3).forEach((w,idx)=>{
    const pgn=w.pgn;
    const white=H(pgn,'White'),black=H(pgn,'Black');
    const we=parseInt(H(pgn,'WhiteElo'))||0,be=parseInt(H(pgn,'BlackElo'))||0;
    const result=H(pgn,'Result');
    const date=H(pgn,'Date')||'';const year=parseInt(date.slice(0,4))||2024;
    const url=H(pgn,'Link')||H(pgn,'Site')||'';
    const opp=w.isW?black:white;
    const entry={
      id:`mg-pro-carlsen-${id.replace('pro-carlsen-','')}-${idx+1}`,
      openingId:id, white, black, whiteElo:we, blackElo:be, result,
      year, event:`chess.com (${date.replace(/\./g,'-')})`,
      pgn:bare(pgn),
      sourceUrl:url.startsWith('http')?url:'https://www.chess.com/member/magnuscarlsen',
      studentSide:meta.side,
      overview:`Carlsen vs ${opp} (${w.oppElo}), ${year} — ${meta.name}: ${meta.blurbs[idx]||meta.blurbs[0]}`,
    };
    if(byId.has(entry.id))games[byId.get(entry.id)]=entry;else{games.push(entry);added++;}
  });
}
fs.writeFileSync('src/data/model-games.json',JSON.stringify(games,null,2)+'\n');
console.log('model games +'+added+', total',games.length);
