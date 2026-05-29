#!/usr/bin/env node
// Replace the Alapin trapLines with mined-only entries. The 3 traps
// I fabricated tonight (Nxe5 / Nxe4 / Qxb2) get REMOVED and replaced
// with the top mined patterns from mine-alapin-traps.mjs output.
// Every entry's pgn comes from a REAL GAME — copied verbatim from his
// archive, never reconstructed.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const PRO_PATH = 'src/data/pro-repertoires.json';
const CANDIDATES_PATH = 'data/sources/danielnaroditsky-alapin-trap-candidates.json';
const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));

// Hand-curated selection from the mining output. Each entry references
// the candidate index (frequency rank) for verification.
// Filtered: skipped patterns that are main-line continuations (false
// positives where Black plays the principled move and the punish is
// just an even trade) — patterns #2 (d5 after Bb3, 46 games) and #4
// (Nf6 after exd5 exd5 Nf3, 11 games) are the standard exchange
// sequences, not blunders.
const TRAP_SELECTIONS = [
  {
    rank: 0, // #1 — 62 games — Bc4-Gambit Nc6 block fails
    nameOverride: 'Bc4-Gambit + exf7+ (Nc6 block fails, 62 games incl. Hans Niemann 3161)',
    explanation:
      "Naroditsky's signature Alapin trap in the 4…d6 sub-line. After Bc4 Nb6 e6 Nxc4 Qa4+, Black has to interpose against the queen check. The natural move …Nc6 LOSES because exf7+! drags the king out, then Qxc4+ recovers the bishop and Black's king is permanently exposed on f7/g8. 62 opponents fell into this in his archive, including HansOnTwitch (3161), ckgchess (2888), and pheonixking2000 (2936). The trap line shown is taken directly from his game vs HansOnTwitch (chess.com/game/live/112143011955). Drill the punish so you can find exf7+ over the board the moment Black plays …Nc6.",
  },
  {
    rank: 2, // #3 — 17 games — d5-Open cxd4 → Nb5 fork
    nameOverride: 'd5-Open cxd4 → Nb5 Outpost (17 games incl. Sam Shankland 2934)',
    explanation:
      "In the d5-Open after Na3 Nc6 Be3, Black's natural …cxd4 (releasing central tension) gets punished by Nb5! — the knight jumps from a3 to b5 attacking the queen on d5 AND the prize square c7. Black has limited queen retreats; …Qd8 (the actual game move in 17 of his wins) loses tempi, then Nbxd4 + Nxc6 trade-down leaves White with structural advantage. The trap line is taken from his game vs remi04 (2836) at chess.com/game/live/77203313889 — the same pattern hit 17 opponents in his data, including Sam Shankland (2934). Drill the Nb5 jump as the punish.",
  },
  {
    rank: 5, // #6 — 10 games — Kg8 walk-in to e6+ central crush
    nameOverride: 'Bxf7+ → e6+ → Kg8 Walk-In (10 games incl. ShadowKing71 3122)',
    explanation:
      "In the Bb5+ Bd7 Bc4 Nb6 sub-line of the Nf6 spine, after Bxf7+! Kxf7 e6+, Black has a fork in the road: retreat …Kg8 (gives up castling forever, 10 games) or come forward. The trap line shown takes the …Kg8 retreat — White plays exd7 Qxd7 O-O and Black has lost castling rights, the f7-pawn, the bishop pair... all for one White bishop. From the actual game vs ShadowKing71 (3122) at chess.com/game/live/106030753121. 10 opponents fell into this exact retreat including AlexTruskavetsky (2676) and NovakCabarkapa (2847). When you reach the Bxf7+ check, drill the exd7 follow-up so you can execute it cleanly.",
  },
  {
    rank: 9, // #10 — 7 games — Bg4 in Nc6 line
    nameOverride: '...Bg4 Pin Reflex in Nc6 line (7 games)',
    explanation:
      "In the 2…Nc6 line after d4 cxd4 cxd4 d5 exd5 Qxd5 Nf3, Black's natural …Bg4 pinning the knight gets punished. 7 opponents fell into this, and the actual game continuation shows the structural exploit. The trap line is taken from a real game in his archive (see source below) — drill the punish so you don't allow Black to keep the pin.",
  },
];

const builtTraps = [];
for (const sel of TRAP_SELECTIONS) {
  const cand = candidates[sel.rank];
  if (!cand) { console.error(`SKIP rank ${sel.rank} — no candidate`); continue; }
  const sample = cand.samples[0];
  const prefixMoves = sample.prefixMoves;
  const punish = sample.punish;
  const fullPgn = [...prefixMoves, ...punish].join(' ');

  // Validate chess.js
  const c = new Chess();
  let ok = true;
  for (const m of fullPgn.split(' ')) {
    try { c.move(m); }
    catch (e) {
      console.error(`FAIL ${sel.nameOverride}: illegal "${m}" — ${e.message}`);
      ok = false; break;
    }
  }
  if (!ok) continue;
  const plies = fullPgn.split(' ').length;
  if (plies < 6) {
    console.error(`FAIL ${sel.nameOverride}: only ${plies} plies`);
    continue;
  }

  builtTraps.push({
    name: sel.nameOverride,
    pgn: fullPgn,
    explanation: sel.explanation,
  });
  console.log(`OK ${sel.nameOverride} — ${plies} plies, ${cand.count} games fell into this`);
}

// Merge: keep the existing data-grounded "Nc3 Queen-Tempo (2…Nc6 Line)"
// (which IS in the data — the spine derivation showed Qd8 forced), REMOVE
// the 3 fabricated traps + the 2 duplicates of mined patterns I already
// had, REPLACE with the 4 mined entries above.

const data = JSON.parse(fs.readFileSync(PRO_PATH, 'utf8'));
const alapin = data.openings.find((o) => o.id === 'pro-naroditsky-alapin');
if (!alapin) { console.error('pro-naroditsky-alapin not found'); process.exit(1); }

// Keep only the Nc3 queen-tempo (the only one that wasn't a duplicate or
// fabrication) + replace everything else with mined entries.
const ncTempo = alapin.trapLines.find((t) => t.name.includes('Queen-Tempo'));
alapin.trapLines = [
  ...(ncTempo ? [ncTempo] : []),
  ...builtTraps,
];

fs.writeFileSync(PRO_PATH, JSON.stringify(data, null, 2));
console.log(`\npro-repertoires.json: ${alapin.trapLines.length} trapLines (${builtTraps.length} freshly mined + ${ncTempo ? 1 : 0} retained)`);
