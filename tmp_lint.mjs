import fs from 'fs';
const src = fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
// crude: find all sayShort: '...' and beat sayShort, count words
const re=/sayShort:\s*(["'])((?:\\.|(?!\1).)*)\1/g; let m,bad=0;
while((m=re.exec(src))){ const t=m[2].replace(/\\"/g,'"').replace(/\\'/g,"'"); const n=t.trim().split(/\s+/).length; if(n>8){console.log('OVER',n,JSON.stringify(t));bad++;} }
console.log(bad?`${bad} OVER-LIMIT`:'all cues <=8');
