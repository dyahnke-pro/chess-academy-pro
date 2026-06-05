import { readFileSync, writeFileSync } from 'node:fs';
import { GEM_NARRATION } from '../src/data/lessons/punishGemNarration.ts';

// Authored, board-verified replacements for the 19 generic-template Samay gems.
// Role-based: each generic beat is detected by its template text and swapped.
const A: Record<string, { inacc: string; punish: string; followup: string; learn: string }> = {
  'pro-samayraina-open-sicilian:e4_c5_Nf3_Nc6_d4_cxd4_Nxd4_e5_Nb5:Qa5+': {
    inacc: 'Qa5+? — the check looks active, but it ignores the Nb5-knight ready to spring to d6. White simply blocks and develops.',
    punish: 'N1c3! — the queen’s knight blocks the check and develops; now Nd6+ is unstoppable.',
    followup: 'a3 — after the trade on c3, Nd6+ drives the king to f8: Black forfeits castling and White’s bishop pair and dominating knight leave him close to winning.',
    learn: 'N1c3 — block, then Nd6+ bites',
  },
  'pro-samayraina-open-sicilian:e4_c5_Nf3_e6_d4_cxd4_Nxd4_Nc6_Nc3_Qc7_Be2_a6_O-O_Nf6_Be3_Bb4_f3:b5': {
    inacc: 'b5? — the queenside push comes too early; it loosens Black’s pawns before he can support them.',
    punish: 'a4! — striking at b5 at once; after …bxa4 Nxc6 Qxc6 Nxa4 White wins the pawn back with much the better structure.',
    followup: 'Nxa4 — the pawn is regained and Black’s queenside is left full of holes; White is clearly on top.',
    learn: 'a4 — crack the loose b5',
  },
  'pro-samayraina-open-sicilian:e4_c5_Nf3_g6_d4_cxd4_Nxd4_Nf6_Nc3_Bg7_Be2:Qa5': {
    inacc: 'Qa5? — the queen sortie hits nothing and only hands White tempi to chase her.',
    punish: 'Nb3 — questioning the offside queen; she must trudge all the way back to d8.',
    followup: 'e5 — the f6-knight is kicked home too; Black has thrown away three tempi and White seizes the centre.',
    learn: 'Nb3 — chase the stray queen',
  },
  'pro-samayraina-open-sicilian:e4_c5_Nf3_g6_d4_cxd4_Nxd4_Nf6_Nc3_Bg7_Be2_Nc6_Be3:Qa5': {
    inacc: 'Qa5? — the queen drifts to a5 with no target; White just gains time and builds.',
    punish: 'Nb3 — nudging the queen off a5; she retreats and White is free to set up Qd2, f3 and O-O-O.',
    followup: 'Qd2 — White rolls out a comfortable attacking formation; the misplaced queen leaves him clearly better.',
    learn: 'Nb3 — gain time on the queen',
  },
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_Nf6_O-O_Nxe4_d4:Nxd4': {
    inacc: 'Nxd4? — trading the knight here only helps White, who recaptures and keeps the extra pawn with a big initiative.',
    punish: 'Nxd4 — recapturing toward the centre. White is a pawn up, and the loose e4-knight will be hounded by Bd3 and Re1.',
    followup: 'Bd3 — hitting the e4-knight; White rolls forward a pawn ahead with all the play.',
    learn: 'Nxd4 — recapture, a pawn up',
  },
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_a6_Bxc6_dxc6_O-O_f6_d4_exd4_Nxd4_c5_Nb3:Be6': {
    inacc: 'Be6? — a passive square; it invites a trade that leaves White with the better structure.',
    punish: 'Qe2 — calmly improving. After …Bxb3 axb3 White owns the open a-file and the healthier pawns; the Exchange-Ruy edge tells.',
    followup: 'Nc3 — White develops harmoniously and presses the long-term structural pull.',
    learn: 'Qe2 — keep the structural pull',
  },
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_d6_d4_Bd7_Nc3:Be7': {
    inacc: 'Be7? — it fails to defend e5; White removes the defender and wins the pawn.',
    punish: 'Bxc6! — and after …Bxc6 dxe5 dxe5 Qxd8 Rxd8 Nxe5 White has won the e5-pawn cleanly.',
    followup: 'Nxe5 — a clean pawn to the good, with the simpler position.',
    learn: 'Bxc6 — then dxe5 wins e5',
  },
  'pro-samayraina-ruy:e4_e5_Nf3_Nc6_Bb5_d6_d4_Bd7_Nc3_Nf6_O-O_Be7_Re1_exd4_Nxd4:Ne5': {
    inacc: 'Ne5? — the knight jumps in but invites Nf5, hitting the e7-bishop with tempo.',
    punish: 'Nf5 — eyeing the e7-bishop; after …O-O Nxe7+ White trades into the bishop pair and a pull.',
    followup: 'Nxe7+ — picking up the bishop pair; White is comfortably better.',
    learn: 'Nf5 — hit e7, win the pair',
  },
  'pro-samayraina-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4:Bb6': {
    inacc: 'Bb6? — too passive; it hands White the crushing central break for free.',
    punish: 'e5! — storming the centre with tempo, kicking the f6-knight; in the complications White emerges a pawn up with a clamp.',
    followup: 'exd6 — White nets the pawn and keeps a dominating centre.',
    learn: 'e5 — storm, win a pawn',
  },
  'pro-samayraina-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3:O-O': {
    inacc: 'O-O? — natural, but it lets Bg5 pin the f6-knight and pick up the bishop pair.',
    punish: 'Bg5 — pinning f6; after …h6 Bxf6 Bxc3 bxc3 Qxf6 White keeps the bishop pair and the broad centre.',
    followup: 'Bxf6 — White wins the bishop pair and stands clearly better with the big centre.',
    learn: 'Bg5 — pin f6, win the pair',
  },
  'pro-samayraina-italian:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4_O-O:d5': {
    inacc: 'd5? — a premature break with the king still in the centre; it walks into a crushing knight jump.',
    punish: 'Nxd5! — the knight crashes to the dominant d5-outpost; with Black’s king stuck in the centre and his pieces tangled, White is winning.',
    followup: 'Nxe7 — trading into a near-decisive grip while Black’s king languishes on e8.',
    learn: 'Nxd5 — seize the outpost',
  },
  'pro-samayraina-italian:e4_e5_Nf3_Nc6_Bc4_Nf6_d3_Be7_O-O_O-O_Re1:d5': {
    inacc: 'd5? — striking too soon; it opens the e-file straight onto Black’s own pieces.',
    punish: 'exd5! — and after …Nxd5 Nxe5! the e-file pin wins the e5-pawn; White is up material.',
    followup: 'Rxe5 — collecting the pawn down the pinned file; White is a clean pawn ahead.',
    learn: 'exd5 — then Nxe5 wins a pawn',
  },
  'pro-samayraina-caro-white:e4_c6_d4_d5_exd5_cxd5_Bd3_Nc6_c3_Nf6_Bf4_Bg4_Qb3:b6': {
    inacc: 'b6? — slow and weakening; it does nothing about the pin or the centre.',
    punish: 'h3 — putting the question to the g4-bishop; it must retreat passively to c8.',
    followup: 'Nf3 — the bishop is shut back in and White develops with a comfortable, lasting edge.',
    learn: 'h3 — drive the bishop back',
  },
  'pro-samayraina-caro-white:e4_c6_d4_d5_exd5_cxd5_Bd3_Nc6_c3_Nf6_Bf4_Bg4_Qb3_Qd7_Nd2_e6_Ngf3:Be7': {
    inacc: 'Be7? — passive; it lets the knight jump to e5 and trade off Black’s active bishop.',
    punish: 'Ne5 — hitting the g4-bishop; after the trade White keeps a pleasant space edge.',
    followup: 'Nxg4 — White swaps off Black’s good bishop and stands clearly more comfortable.',
    learn: 'Ne5 — trade off the bishop',
  },
  'pro-samayraina-open-e5:e4_e5_Nf3_Nc6_Bc4_Bc5_c3_Nf6_d4_exd4_cxd4_Bb4+_Nc3_Nxe4:Qe2': {
    inacc: 'Qe2? — White misplaces the queen and never challenges the strong e4-knight. Black breaks the centre open.',
    punish: '…d5! — the central break supports the e4-knight and tears White’s centre open; after …Bxc3 and …Nxc3 Black wins material.',
    followup: '…Nxc3 — Black collects material with the dominant knight; he is clearly winning.',
    learn: '…d5 — break, the e4-knight rules',
  },
  'pro-samayraina-open-e5:e4_e5_Nf3_Nc6_d4_exd4:Ng5': {
    inacc: 'Ng5? — a pointless lunge at f7 that defends nothing; the knight just gets chased back.',
    punish: '…Be7 — calmly developing; the g5-knight has no follow-up and must retreat, leaving Black the extra d4-pawn.',
    followup: '…Nf6 — Black completes development a clean pawn up, the gambit refuted.',
    learn: '…Be7 — develop, keep the pawn',
  },
  'pro-samayraina-sicilian-black:e4_c5_c3_Nf6_e5_Nd5_d4_cxd4_Nf3_Nc6_cxd4_d6:Bb5': {
    inacc: 'Bb5? — the pin walks into a check that wins material.',
    punish: '…Qa5+! — the check ties in with …Nxc3; after Nc3 Nxc3 Bxc6+ bxc6 bxc3 Qxc3+ Black snaps a pawn with check.',
    followup: '…Qxc3+ — Black regains the material with check and the bishop pair, clearly better.',
    learn: '…Qa5+ — check, then win c3',
  },
  'pro-samayraina-sicilian-black:e4_c5_c3_Nf6_e5_Nd5_d4_cxd4_Nf3_Nc6_cxd4_d6_Bc4_Nb6_Bb5_dxe5:d5': {
    inacc: 'd5? — overpushing; …a6 questions the bishop and the centre collapses in Black’s favour.',
    punish: '…a6 — hitting the b5-bishop; after Bxc6+ bxc6 dxc6 Qxd1+ Kxd1 White’s king is stranded and Black is clearly better.',
    followup: '…f6 — Black undermines the c6-pawn; White’s stuck king and loose pawns leave Black on top.',
    learn: '…a6 — question the bishop',
  },
  'pro-samayraina-scandi:e4_d5_exd5_Qxd5_Nc3_Qd8_d4_Nf6_Nf3_c6_Bc4_Bg4_h3_Bxf3_Qxf3_e6:Bg5': {
    inacc: 'Bg5? — it ignores the loose d4-pawn; Black simply snaps it off.',
    punish: '…Qxd4 — winning the undefended central pawn; Black is a clean pawn up.',
    followup: '…Nbd7 — Black consolidates the extra pawn with an easy game.',
    learn: '…Qxd4 — grab the free pawn',
  },
};

const path = 'src/data/lessons/punishGemNarration.ts';
let text = readFileSync(path, 'utf8');
const isInacc = (s: string) => /There is a concrete punishment|a clear inaccuracy\. There is/.test(s);
const isPunish = (s: string) => /wins material or breaks through by force|the strong reply that leaves/.test(s);
const isFollow = (s: string) => /The follow-up is decisive/.test(s);
const isLearn = (s: string) => /— the punishment$/.test(s);

let done = 0;
for (const [id, a] of Object.entries(A)) {
  const cur = (GEM_NARRATION as Record<string, { watch: string[]; learn: string[] }>)[id];
  if (!cur) throw new Error(`missing gem ${id}`);
  const newWatch = cur.watch.map((s) => (isInacc(s) ? a.inacc : isPunish(s) ? a.punish : isFollow(s) ? a.followup : s));
  const newLearn = cur.learn.map((s) => (isLearn(s) ? a.learn : s));
  for (const [key, oldArr, newArr] of [['watch', cur.watch, newWatch], ['learn', cur.learn, newLearn]] as const) {
    const oldLine = `    ${key}: ${JSON.stringify(oldArr)},`;
    const newLine = `    ${key}: ${JSON.stringify(newArr)},`;
    if (!text.includes(oldLine)) throw new Error(`old ${key} line not found for ${id}\n${oldLine}`);
    text = text.replace(oldLine, newLine);
  }
  done++;
}
writeFileSync(path, text);
console.log(`rewrote ${done} gems`);
