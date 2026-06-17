import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='kings-gambit'; const o=d[op]; const seen=new Set(); const out=[];
const early=new Set(['Be7','Ne7','Nf6','d5','d6']);
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi),t=s.triggerMove,p=s.atPly; let c;
  if(p===5&&early.has(t)&&(v===5||v===6)) c='KG_ACCEPTED';
  else if(v===0) c='KG_HANSTEIN';
  else if(v===1) c='KG_FISCHER';
  else if(v===2) c='KG_MUZIO';
  else if(v===3) c='KG_FALKBEER';
  else if(v===4) c='KG_DECLINED';
  else if(v===5) c='KG_KIESERITZKY';
  else if(v===6) c='KG_ALLGAIER';
  else if(v===7) c='KG_BISHOPS';
  out.push(`  '${key}': ${c},`);
}
const hdr='  // -- Kings Gambit --\n';
fs.writeFileSync('./tmp_kg.txt',hdr+out.join('\n')+'\n');
console.log('total',out.length);
