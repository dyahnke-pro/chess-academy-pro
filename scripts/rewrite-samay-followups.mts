import { readFileSync, writeFileSync } from 'node:fs';
import { GEM_NARRATION } from '../src/data/lessons/punishGemNarration.ts';

const F: Record<string, string> = {
  'pro-samayraina-open-sicilian:e4_c5_Nf3_Nc6_d4_cxd4_Nxd4_Nf6_Nc3_e5_Ndb5_d6_Bg5_a6_Bxf6:Qxf6':
    'Nxa8 — the knight snares the rook in the corner and escapes via b6, snapping the c8-bishop too. White is up decisive material.',
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4:Bc5':
    'Qxc5 — the queen snaps the loose bishop; a clean piece up, and Qxc6+ scoops another pawn with check.',
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_d6_d4:a6':
    'dxe5 — the central pawn falls; White is a clean pawn up and Black is saddled with doubled c-pawns.',
  'pro-samayraina-french-white:e4_e6_d4_d5_exd5_exd5_Bd3_Bd6_Nf3_Ne7_O-O_O-O_Re1:Bg4':
    'Ng5+ — the knight leaps in with check; after Kg8 Qxg4 White has regained the piece, pocketed the h7-pawn, and shredded Black’s king.',
  'pro-samayraina-french-white:e4_e6_d4_d5_exd5_exd5_Bd3_Bd6_Nf3_Ne7_O-O_O-O_Re1_Bg4_c3:c6':
    'Ng5+ — check, and after Kg8 Qxg4 White has won back the piece plus the h7-pawn, with a raging attack on the bared king.',
  'pro-samayraina-scandi:e4_d5_exd5_Qxd5_Nc3_Qa5_d4_c6_Bd2_Qc7_Nf3_Nf6_Bc4_Bg4:Bxf7+':
    '…Bxf3 — Black trades pieces to safety; a whole piece up, the king strolls back to g8 and consolidates.',
};

const path = 'src/data/lessons/punishGemNarration.ts';
let text = readFileSync(path, 'utf8');
let done = 0;
for (const [id, follow] of Object.entries(F)) {
  const cur = (GEM_NARRATION as Record<string, { watch: string[]; learn: string[] }>)[id];
  if (!cur) throw new Error(`missing ${id}`);
  const newWatch = cur.watch.map((s) => (/The follow-up is decisive/.test(s) ? follow : s));
  const oldLine = `    watch: ${JSON.stringify(cur.watch)},`;
  const newLine = `    watch: ${JSON.stringify(newWatch)},`;
  if (!text.includes(oldLine)) throw new Error(`watch line not found for ${id}`);
  text = text.replace(oldLine, newLine);
  done++;
}
writeFileSync(path, text);
console.log(`rewrote ${done} followups`);
