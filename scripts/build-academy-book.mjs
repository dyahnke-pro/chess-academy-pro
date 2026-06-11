import { readFile, writeFile } from 'node:fs/promises';
const md = await readFile('docs/academy/philosophy-of-a-general.md', 'utf-8');
const lines = md.split('\n');

const title = (lines.find(l => l.startsWith('# ')) || '# ').slice(2).trim();
const subtitle = (lines.find(l => l.startsWith('### ')) || '### ').slice(4).trim();
const taglineLine = lines.find(l => l.startsWith('*Chess through')) || '';
const tagline = taglineLine.replace(/^\*|\*$/g, '').trim();

const chapters = [];
let cur = null;
let mode = 'body';
let curPara = '';
const pushPara = () => { if (curPara.trim()) cur.paragraphs.push(curPara.trim()); curPara = ''; };
const flush = () => { if (cur) { if (curPara.trim()) cur.paragraphs.push(curPara.trim()); curPara=''; chapters.push(cur); } cur = null; };

for (const raw of lines) {
  const line = raw.replace(/\s+$/, '');
  if (line.startsWith('## ')) {
    flush();
    const head = line.slice(3).trim();
    const [label, ...rest] = head.split(' — ');
    cur = { id: '', label: label.trim(), title: rest.join(' — ').trim() || label.trim(), paragraphs: [], cliffsNotes: [], sources: '' };
    cur.id = (cur.title || cur.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    mode = 'body'; curPara = '';
    continue;
  }
  if (!cur) continue;
  if (line.startsWith('# ')) continue;
  if (line.startsWith('### CliffsNotes')) { pushPara(); mode = 'cliffs'; continue; }
  if (line.startsWith('**Sources.**')) { pushPara(); cur.sources = line.replace('**Sources.**', '').replace(/\*/g, '').trim(); mode = 'sources'; continue; }
  if (line.startsWith('---')) { pushPara(); continue; }
  if (mode === 'cliffs') { if (line.startsWith('- ')) cur.cliffsNotes.push(line.slice(2).replace(/\*\*/g, '').trim()); continue; }
  if (mode === 'sources') { if (line.trim() && !line.startsWith('-')) cur.sources += ' ' + line.replace(/\*/g, '').trim(); continue; }
  if (line.trim() === '') pushPara();
  else curPara += (curPara ? ' ' : '') + line.trim();
}
flush();

for (const c of chapters) {
  c.paragraphs = c.paragraphs
    .filter(p => !/lessons above are the/i.test(p))
    .map(p => p.replace(/\*\*/g, '').replace(/\*/g, '').trim())
    .filter(Boolean);
}
const book = { id: 'philosophy-of-a-general', title, subtitle, tagline, chapters };
await writeFile('src/data/academy/philosophy-of-a-general.json', JSON.stringify(book, null, 2) + '\n');
console.log('title:', title, '||', subtitle);
console.log('chapters:', chapters.length);
for (const c of chapters) console.log(`  ${c.label.padEnd(10)} | ${c.title.slice(0,32).padEnd(32)} | ${c.paragraphs.length}¶ ${c.cliffsNotes.length}cn ${c.sources ? 'src' : 'NO-SRC'}`);
