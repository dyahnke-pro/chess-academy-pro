import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base=fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='vienna-gambit'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const c = Number(vi)===0 ? 'VG_E5':'VG_QF3';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_vg.txt','  // -- Vienna Gambit --\n'+out.join('\n')+'\n');
console.log('total',out.length);
