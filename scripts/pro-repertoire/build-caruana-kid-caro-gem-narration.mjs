import { readFileSync, writeFileSync } from 'node:fs';

const gems = JSON.parse(readFileSync('src/data/punish-gems.json', 'utf8')).filter((x) => x.openingId.startsWith('pro-caruana') && (x.openingId.includes('kid') || x.openingId.includes('caro')));
const gid = (x) => x.openingId + ':' + x.lineMoves.replace(/\s+/g, '_') + ':' + x.inaccuracy;

const KI = ['concept:tac-trap', 'concept:pos-initiative', 'https://www.chess.com/openings/Kings-Indian-Defense'];
const CK = ['concept:tac-trap', 'concept:pos-initiative', 'https://www.chess.com/openings/Caro-Kann-Defense'];

const TEXT = {
  // KID
  'd4_Nf6_c4_g6_Nc3_Bg7_e4_d6_h3_O-O:f4': {
    src: KI, inacc: 'f4?! — White overextends with the Four-Pawns idea but the centre is loose.',
    punish: '…Nh5! — hitting the f4-pawn and heading for the great f4/g3 squares; Black grabs the initiative.',
    follow: 'After …Ng3 forking the rook, Black is clearly better — the overextension backfires.',
    learnPunish: '…Nh5 — hit f4, grab the initiative',
  },
  'd4_Nf6_c4_g6_Nc3_Bg7_e4_d6_Nf3_O-O_Be2_e5_dxe5_dxe5:Nxe5': {
    src: KI, inacc: 'Nxe5?! — greedily grabbing the e5-pawn, but it walks into a queen trade that wins it back with interest.',
    punish: '…Qxd1+! — the zwischenzug; after …Nxe4 Black regains the pawn with a dominant position.',
    follow: 'After …Bxe5 and …Nc6 Black is clearly better with the bishop pair and the active pieces.',
    learnPunish: '…Qxd1+ — trade and regain the pawn',
  },
  // Caro Fantasy
  'e4_c6_d4_d5_f3_dxe4_fxe4_e5:dxe5': {
    src: CK, inacc: 'dxe5?! — grabbing the pawn opens the king while it sits in the centre.',
    punish: '…Qh4+! — the check rakes the open king and forks the e4-pawn; Black regains material with a raging attack.',
    follow: 'After …Qxe4+ and …Bf5 Black has a winning attack against the stranded king.',
    learnPunish: '…Qh4+ — check and fork e4',
  },
  'e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4:Nxd4': {
    src: CK, inacc: 'Nxd4?! — recapturing with the knight walks straight into the fork; the king cannot castle.',
    punish: '…Qh4+! — check, and the e4-pawn hangs on the fourth rank; Black wins it back with the safer king.',
    follow: 'After the queens trade Black emerges a clean pawn up — the engine reads +1.1.',
    learnPunish: '…Qh4+ — check and win e4',
  },
  'e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4_Bc4_Be6_Bxe6_fxe6:Nxd4': {
    src: CK, inacc: 'Nxd4?! — again the recapture invites the check; the king is denied castling.',
    punish: '…Qh4+! — the queen leaps to the open fourth rank; with …Bc5 and …Nd7 Black piles in.',
    follow: 'Black gets a crushing lead in development against the stranded f1-king.',
    learnPunish: '…Qh4+ — check, swarm the king',
  },
  'e4_c6_d4_d5_f3_dxe4_fxe4_e5_Nf3_exd4_Bc4_Be6_Bxe6_fxe6_O-O_Nf6:Ne5': {
    src: CK, inacc: 'Ne5?! — the knight jumps in with no support and can simply be challenged away.',
    punish: '…Be7! — calm development; the e5-knight has no real threat and must retreat, leaving Black better.',
    follow: 'Black is comfortably better with the extra pawn and the sounder structure.',
    learnPunish: '…Be7 — ignore it, stay solid',
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
console.error('inserted ' + entries.length + ' KID/Caro gem narration entries');
