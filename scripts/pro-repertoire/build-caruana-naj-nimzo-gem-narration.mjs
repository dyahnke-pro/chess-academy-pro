import { readFileSync, writeFileSync } from 'node:fs';

const gems = JSON.parse(readFileSync('src/data/punish-gems.json', 'utf8')).filter(
  (x) => x.openingId === 'pro-caruana-najdorf' || x.openingId === 'pro-caruana-nimzo-indian',
);
const gid = (x) => x.openingId + ':' + x.lineMoves.replace(/\s+/g, '_') + ':' + x.inaccuracy;

const NAJ = ['concept:pos-center', 'concept:pos-initiative', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];
const NIM = ['concept:pos-center', 'concept:pos-initiative', 'https://www.chess.com/openings/Nimzo-Indian-Defense'];

const TEXT = {
  // Najdorf — White lunges the knight to f5 instead of retreating after …e5.
  'e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6_f3_e5:Nf5': {
    src: NAJ,
    inacc: 'Nf5?! — after …e5 hits the knight, White lunges to f5 hoping to provoke, but the piece has no support and just becomes a target.',
    punish: '…d5! — striking the centre at once; the e4-pawn is undermined and the loose f5-knight has nowhere good to go.',
    follow: 'After …Bxf5 trades the intruder and …Qb6 rakes b2 and d4, Black is clearly on top — the engine reads about +1.0.',
    learnPunish: '…d5 — strike the centre, trap the knight',
  },
  // Najdorf — the h3 English with the same Nf5 lunge; here Black builds a bind.
  'e4_c5_Nf3_d6_d4_cxd4_Nxd4_Nf6_Nc3_a6_h3_e5:Nf5': {
    src: NAJ,
    inacc: 'Nf5?! — again the knight jumps to f5 with nothing behind it, inviting Black to claim the centre.',
    punish: '…d5! — the central break; the e4-point falls and the f5-knight is shoved back.',
    follow: 'After …d4 gains space and …h5 chases the sidelined g3-knight, Black has a clear positional bind.',
    learnPunish: '…d5 — break the centre, gain the bind',
  },
  // Nimzo-Indian — White grabs space with c5 before completing development.
  'd4_Nf6_c4_e6_Nc3_Bb4_e3_O-O_Bd3_d5:c5': {
    src: NIM,
    inacc: 'c5?! — White grabs queenside space, but the pawn is overextended and undefended by pieces.',
    punish: '…b6! — undermining the c5-pawn at its base; White cannot hold the chain together.',
    follow: 'After …axb6 opens the a-file and …Ba6 pins down the shattered queenside pawns, Black is clearly better — about +0.8.',
    learnPunish: '…b6 — undermine the overextended pawn',
  },
};

const entries = [];
for (const g of gems) {
  const key = g.lineMoves.replace(/\s+/g, '_') + ':' + g.inaccuracy;
  const t = TEXT[key];
  if (!t) { console.error('NO TEXT for ' + key); continue; }
  const ply = g.playLine.split(' ');
  const idx = g.lineMoves.split(' ').length;
  const watch = ply.map(() => '');
  const learn = ply.map(() => '');
  watch[idx] = t.inacc;
  if (idx + 1 < ply.length) { watch[idx + 1] = t.punish; learn[idx + 1] = t.learnPunish; }
  const fi = Math.min(idx + 5, ply.length - 1);
  if (fi > idx + 1) watch[fi] = t.follow;
  entries.push({ id: gid(g), sources: t.src, watch, learn });
}

let snippet = '';
for (const e of entries) {
  snippet += '  ' + JSON.stringify(e.id) + ': {\n';
  snippet += '    sources: ' + JSON.stringify(e.sources) + ',\n';
  snippet += '    watch: ' + JSON.stringify(e.watch) + ',\n';
  snippet += '    learn: ' + JSON.stringify(e.learn) + ',\n';
  snippet += '  },\n';
}

const path = 'src/data/lessons/punishGemNarration.ts';
let src = readFileSync(path, 'utf8');
for (const e of entries) {
  if (src.includes(JSON.stringify(e.id))) { console.error('already present: ' + e.id + ' — aborting'); process.exit(1); }
}
const marker = '};\n\nexport function getGemNarration';
const at = src.lastIndexOf(marker);
src = src.slice(0, at) + snippet + src.slice(at);
writeFileSync(path, src);
console.error('inserted ' + entries.length + ' Najdorf/Nimzo gem narration entries');
