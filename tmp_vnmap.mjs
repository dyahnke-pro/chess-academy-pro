import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='vienna-game'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi); const mv=s.moves; let c;
  if(mv.includes('Qh5')) c='VN_FRANKENSTEIN';
  else if(v===0) c='VN_F4D5';
  else if(v===4) c='VN_HAMPPE';
  else if(v===5) c='VN_GAMBIT_E5';
  else if(v===6) c='VN_G3';
  else if(v===7) c='VN_QG4';
  else if(v===2) c='VN_QUIET';
  else c='VN_BC4_DEV';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_vn.txt','  // -- Vienna Game --\n'+out.join('\n')+'\n');
console.log('total',out.length);
