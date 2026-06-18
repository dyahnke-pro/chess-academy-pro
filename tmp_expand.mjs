import fs from 'fs';
const inp=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const out={};
for(const p of inp.positions){ const {keys,...b}=p; for(const k of keys) out[k]=b; }
fs.writeFileSync(process.argv[3],JSON.stringify(out));
console.log('expanded',inp.positions.length,'positions ->',Object.keys(out).length,'keys');
