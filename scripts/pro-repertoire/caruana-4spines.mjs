import fs from 'node:fs';
import { Chess } from 'chess.js';
const raw=fs.readFileSync('data/sources/caruana-pgnmentor/Caruana.pgn','utf8').replace(/\r\n/g,'\n');
const H=(g,k)=>{const m=g.match(new RegExp(`\\[${k} "([^"]*)"\\]`));return m?m[1]:null;};
const parsed=[];
for(const g of raw.split(/\n\n(?=\[Event )/)){const b=H(g,'Black');if(!(b||'').toLowerCase().includes('caruana'))continue;let c=new Chess(),s;try{c.loadPgn(g,{sloppy:true});s=c.history();}catch{continue;}if(s.length<16)continue;parsed.push(s);}
const V={
 'French Advance':['e4','e6','d4','d5','e5','c5','c3','Nc6','Nf3','Bd7','Be2','Nge7','O-O','Ng6'],
 'French Tarrasch':['e4','e6','d4','d5','Nd2','Be7','Ngf3','Nf6','e5','Nfd7'],
 'French Exchange':['e4','e6','d4','d5','exd5','exd5'],
 'Caro Exchange':['e4','c6','d4','d5','exd5','cxd5','Bd3'],
};
for(const [name,prefix] of Object.entries(V)){
 const m=parsed.filter(s=>prefix.every((x,i)=>s[i]===x));
 const spine=prefix.slice();
 while(spine.length<18){const on=m.filter(s=>spine.every((x,i)=>s[i]===x)&&s.length>spine.length);if(on.length<2)break;const c={};for(const s of on)c[s[spine.length]]=(c[s[spine.length]]||0)+1;const[best,n]=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];if(n<2)break;spine.push(best);}
 console.log(name+' ('+m.length+'g, '+spine.length+'p):\n  '+spine.join(' '));
}
