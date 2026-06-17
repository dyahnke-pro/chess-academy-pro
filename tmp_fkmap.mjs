import fs from 'fs';
const d = JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base = fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine = fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op='four-knights-game'; const o=d[op]; const seen=new Set(); const out=[];
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const v=Number(vi), t=s.triggerMove;
  let c;
  if(t==='g6') c='FK_G6';
  else if(v===1) c='FK_SCOTCH_FK';
  else if(v===3) c='FK_HALLOWEEN';
  else if(v===5) c='FK_ITALIAN_FT';
  else if(v===8) c='FK_GLEK';
  else if(v===2) c = (t==='Bb4') ? 'FK_D4_PIN' : 'FK_NMD5';
  else if(v===6) c = (t==='Bb4') ? 'FK_SPANISH' : (t==='Bd6'||t==='Bc5') ? 'FK_BC5BD6' : 'FK_RUBINSTEIN';
  else c = (t==='Bc5'||t==='Bd6') ? 'FK_BC5BD6' : 'FK_SPANISH';
  out.push(`  '${key}': ${c},`);
}
fs.writeFileSync('./tmp_fk.txt', out.join('\n')+'\n');
console.log('total',out.length);
