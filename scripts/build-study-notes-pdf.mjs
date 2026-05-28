import fs from 'fs';
const D='docs/audit-runs/2026-05-27-pro-provenance/naroditsky-study-notes';
const files=fs.readdirSync(D).filter(f=>f.endsWith('.pgn')).sort();
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
// render movetext: emphasize {comments}
function renderMoves(mt){
  return esc(mt).replace(/\{([^}]*)\}/g,'<span class="note">$1</span>').replace(/\$\d+/g,'');
}
let body='';
const studies={};
for(const f of files){
  const txt=fs.readFileSync(`${D}/${f}`,'utf8');
  // split into games by blank-line-separated header+movetext blocks
  const games=txt.split(/\n\n(?=\[Event )/);
  for(const g of games){
    const sm=g.match(/\[StudyName "([^"]*)"/); const cm=g.match(/\[ChapterName "([^"]*)"/);
    const om=g.match(/\[Opening "([^"]*)"/);
    const study=(sm?sm[1]:f).trim(); const chap=(cm?cm[1]:'').trim(); const op=(om?om[1]:'').trim();
    // movetext = after last header line
    const parts=g.split(/\]\n\n/); let mt=parts.length>1?parts.slice(1).join(']\n\n'):'';
    if(!mt) { const i=g.lastIndexOf('"]'); mt=i>=0?g.slice(i+2):''; }
    mt=mt.replace(/\s+/g,' ').trim();
    (studies[study]=studies[study]||[]).push({chap,op,mt});
  }
}
for(const [study,chs] of Object.entries(studies)){
  body+=`<h2>${esc(study)}</h2>`;
  for(const c of chs){
    if(/INSTRUCTIONS|READ ME|ADD LICHESS|CATALOGUE|LiChessTools|leave a LIKE/i.test(c.chap)) continue;
    body+=`<div class="chap"><h3>${esc(c.chap||c.op||'(chapter)')}</h3>`;
    if(c.op&&c.op!==c.chap) body+=`<div class="op">${esc(c.op)}</div>`;
    if(c.mt) body+=`<div class="mv">${renderMoves(c.mt)}</div>`;
    body+=`</div>`;
  }
}
const html=`<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;font-size:10pt;line-height:1.4;margin:28px;color:#111}
h1{font-size:20pt;border-bottom:3px solid #333}
h2{font-size:14pt;color:#1a4d8f;border-bottom:1px solid #aaa;margin-top:28px;page-break-after:avoid}
h3{font-size:11pt;color:#444;margin:14px 0 4px;page-break-after:avoid}
.op{font-style:italic;color:#777;font-size:9pt;margin-bottom:3px}
.mv{font-family:'DejaVu Sans Mono',monospace;font-size:8.5pt;color:#222;background:#f7f7f7;padding:6px 8px;border-left:3px solid #ccd;white-space:normal}
.note{color:#0b6b2e;font-style:italic;font-family:Georgia,serif}
.chap{page-break-inside:avoid;margin-bottom:8px}
.caveat{background:#fff7e6;border:1px solid #e0c070;padding:10px;font-size:9pt;margin:12px 0}
</style></head><body>
<h1>Naroditsky's Study Notes</h1>
<p style="color:#555">Grounding corpus for the Chess Academy Pro pro-masterclass build — his repertoire lines + teaching ideas, harvested from his lichess studies.</p>
<div class="caveat"><b>Caveat:</b> These are <b>fan-compiled and fan-transcribed</b> lichess studies of Naroditsky's repertoire and speedruns — faithful to his <i>lines and ideas</i>, but <b>not his verbatim prose</b>. Use as a trusted grounding reference, attributed as "Naroditsky's Study Notes," not as direct quotes.</div>
${body}
</body></html>`;
fs.writeFileSync('/tmp/naroditsky-study-notes.html',html);
console.log('HTML built:',(html.length/1024).toFixed(0),'KB, studies:',Object.keys(studies).length);
