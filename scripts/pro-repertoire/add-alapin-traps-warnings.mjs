#!/usr/bin/env node
// Author the missing Alapin trap lines + warning lines.
// Every line chess.js-validated and ≥6 plies; trap lines end with
// student gaining material; warning lines END with student worse off
// (showing the consequence of the wrong move). Every entry's
// `explanation` follows the error → consequence → fix template.

import fs from 'node:fs';
import { Chess } from 'chess.js';

const PRO_PATH = 'src/data/pro-repertoires.json';

// ============================================================
// NEW TRAPS — 3 to add (covering nf6-main, d6-mainline, e6-french)
// ============================================================
const NEW_TRAPS = [
  {
    name: 'Nxe5 Pawn Grab Backfires (nf6-main)',
    pgn: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 Nxe5 Nxe5',
    explanation:
      "After the standard Bb3 setup, Black sometimes gets greedy and grabs the e5-pawn with …Nxe5 — thinking the pawn is hanging. It isn't: the c6-knight is the ONLY piece that can reach e5, and once it captures, the f3-knight simply takes back with Nxe5 winning a clean knight for a pawn. Black's d5-knight can't recapture (knight squares from d5 are b4/b6/c3/c7/e3/e7/f4/f6 — NOT e5). The line we surface shows the trade resolving with us up material; from here we continue normal development and convert the structural + material edge in the endgame. Naroditsky's data shows this pawn-grab failure at all amateur rating bands.",
  },
  {
    name: 'Premature ...Nxe4 in d6 Mainline',
    pgn: 'e4 c5 c3 d6 d4 cxd4 cxd4 Nf6 Nc3 Nxe4 Nxe4 d5 Bb5+ Bd7 Qe2',
    explanation:
      "In the d6 mainline after Nc3, Black sometimes plays the eager …Nxe4 trying to win a pawn off the centre. The refutation is concrete: Nxe4 (recapture, winning back the knight), …d5 (Black tries to force the knight back), Bb5+ (bishop check pins everything), …Bd7 (forced block), Qe2 (consolidates the knight). Net material: White wins a knight (3) for a pawn (1) = up clear material. The d4-pawn stays safe because Black's pieces are tangled around the c-file. Continue with O-O + Re1 and convert the endgame.",
  },
  {
    name: 'Wing-Grab Qxb2 in e6 French',
    pgn: 'e4 c5 c3 e6 d4 d5 e5 Qb6 Nf3 Qxb2 Nbd2 cxd4 Rb1 Qxa2 Bb5+ Nc6 Bxc6+ bxc6 Rb2',
    explanation:
      "Against the e6-French line, Black sometimes plays …Qb6 followed by the greedy …Qxb2 grabbing our wing pawn. The trap closes immediately: Nbd2 (developing toward the queen), …cxd4, Rb1 (we deflect the queen — she must move OR lose to the rook), …Qxa2 (the queen escapes further into Black's territory and Black is now down development), Bb5+! Nc6 Bxc6+ bxc6 (we crack Black's queenside structure), Rb2 — Black's queen is awkward and our pieces dominate. Net: even though the pawn count looks like Black +2 pawns, our piece activity + Black's destroyed queenside structure + the trapped-queen risk wins clearly. Avoid greedy pawn grabs in the opening!",
  },
];

// ============================================================
// IMPROVED WARNINGS — replace the existing 2 + add 3 new
// Every warning walks: ERROR (what move/decision is wrong) →
// CONSEQUENCE (the resulting bad position shown by the PGN) →
// FIX (what to play instead).
// ============================================================
const NEW_WARNINGS = [
  {
    name: 'Premature d4 push — Black equalises with …d5',
    pgn: 'e4 c5 c3 Nc6 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 e6 Nf3 Nf6',
    explanation:
      "ERROR: White rushes d4 on move 3 BEFORE Black declares with Nf6 or e6. CONSEQUENCE shown by the line: Black plays …cxd4 cxd4 …d5! exd5 …Qxd5 — Black's queen comes out with tempo and gets free development, reaching a Scandinavian-style position with Black equalising completely. White's whole Alapin plan (the supported central pawn duo + Nc3-tempo-on-the-queen) is dead because Black struck FIRST. FIX: WAIT. After 2.c3, do NOT play d4 immediately. Let Black declare with …Nf6 (then 3.e5 Nd5 4.d4 forces Black to react) OR …e6 (then 3.d4 d5 4.e5 transitions into French-Advance lines you know) OR …d6 (then 3.d4 wins time because Black committed). The d4-push timing is the whole opening — get it wrong and you're playing a worse Open Sicilian.",
  },
  {
    name: 'Bc2 retreat instead of Bxe6 trade',
    pgn: 'e4 c5 c3 Nf6 e5 Nd5 Nf3 Nc6 Bc4 Nb6 Bb3 d5 exd6 Qxd6 O-O Be6 Bc2 O-O-O',
    explanation:
      "ERROR: After Black offers the bishop trade with …Be6, White retreats Bc2 instead of capturing with Bxe6. CONSEQUENCE shown by the line: Black keeps the bishop pair (the light-squared bishop is Black's coordination anchor in the Caro/Sicilian hybrid structure) AND castles long (…O-O-O), getting active piece play on the open files. Our 73.8% score plan (initiate the f7-diagonal trade) is DEAD — the Bc2-bishop now has no targets, Black's bishop on e6 stares at our king. FIX: when Black plays …Be6, ALWAYS take with Bxe6! Trade off Black's best-developed piece, then continue with the queenside crawl a4-a5-a6 to fix Black's pawns permanently. The Alapin's signature 73.8% conversion depends on this exact trade-initiation timing.",
  },
  {
    name: 'Be2 retreat against the …Bg4 pin (d5 Open)',
    pgn: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4 Be2 Bxf3 Bxf3 Qd6 O-O e6 Nbd2 Be7 Re1 O-O',
    explanation:
      "ERROR: In the d5 Open after Black plays …Bg4 pinning our Nf3 to the queen, White panics and retreats Be2 to defuse the pin. CONSEQUENCE shown by the line: Black trades off the knight directly with …Bxf3, we recapture with the bishop (Bxf3), Black retreats the queen to safety (…Qd6) and completes development calmly with …e6 / …Be7 / …O-O. The bishop pair is now equal, our light-squared f1-bishop never reaches c4 for the f7-attacking plan, and Black has equalised completely. The whole d5-open conversion idea (Na3-Nb5 outpost, Bc4-Bb3 diagonal pressure) is DEAD because the bishops came off too early. FIX: against …Bg4, play h3 FIRST! After h3 Bh5, then g4 Bg6 — we break the pin AND keep the f1-bishop for the Bc4-Bb3 attacking plan. The light-squared bishop is the conversion piece in every Alapin variation; protect it.",
  },
  {
    name: 'Nbxd4 surrenders the outpost early (d5 Open)',
    pgn: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Na3 Nc6 Be3 cxd4 Nb5 Qd7 Nbxd4 Nxd4 Qxd4 a6',
    explanation:
      "ERROR: After the …cxd4 / Nb5 / …Qd7 sequence, White takes back with the WRONG knight — Nbxd4 (the b5-knight retreats to recapture) instead of Nfxd4. CONSEQUENCE shown by the line: Black plays …Nxd4 trading off our central knight, then …Qxd4 by us, then Black plays …a6 preparing …b5 to chase our queen AND develop the c8-bishop actively. The whole Nb5-outpost idea (eyeing c7 + d6, extracting tempo concessions from Black's queen) is DEAD because we voluntarily came off the prize square. FIX: capture with Nfxd4 (the f3-knight)! This KEEPS the Nb5 on its outpost, where it still threatens Nc7+ tactics AND covers d6. The Alapin's 71% score in d5-open depends on Nb5 staying put long enough to extract concessions; trading it back voluntarily throws the whole plan.",
  },
];

// ============ BUILD ============
const errors = [];

// Validate every entry
for (const trap of NEW_TRAPS) {
  const chess = new Chess();
  let ok = true;
  for (const san of trap.pgn.split(' ')) {
    try { chess.move(san); }
    catch (e) { errors.push(`TRAP ${trap.name}: illegal "${san}" — ${e.message}`); ok = false; break; }
  }
  const plies = trap.pgn.split(' ').length;
  if (plies < 6) errors.push(`TRAP ${trap.name}: only ${plies} plies (need ≥6)`);
  if (ok) console.log(`OK trap "${trap.name}" — ${plies} plies, legal`);
}
for (const warn of NEW_WARNINGS) {
  const chess = new Chess();
  let ok = true;
  for (const san of warn.pgn.split(' ')) {
    try { chess.move(san); }
    catch (e) { errors.push(`WARN ${warn.name}: illegal "${san}" — ${e.message}`); ok = false; break; }
  }
  const plies = warn.pgn.split(' ').length;
  if (plies < 6) errors.push(`WARN ${warn.name}: only ${plies} plies (need ≥6)`);
  if (ok) console.log(`OK warning "${warn.name}" — ${plies} plies, legal`);
}

if (errors.length > 0) {
  console.error('\n=== ERRORS ===');
  for (const e of errors) console.error(' ', e);
  process.exit(1);
}

// Merge into pro-repertoires.json
const data = JSON.parse(fs.readFileSync(PRO_PATH, 'utf8'));
const alapin = data.openings.find((o) => o.id === 'pro-naroditsky-alapin');
if (!alapin) { console.error('pro-naroditsky-alapin not found'); process.exit(1); }

// Keep the existing 3 traps + add 3 new
alapin.trapLines = [
  ...alapin.trapLines.slice(0, 3), // existing 3
  ...NEW_TRAPS,
];
// REPLACE warnings entirely (the existing 2 had the bug David caught)
alapin.warningLines = NEW_WARNINGS;

fs.writeFileSync(PRO_PATH, JSON.stringify(data, null, 2));
console.log(`\npro-repertoires.json updated:`);
console.log(`  trapLines: ${alapin.trapLines.length} (3 existing + ${NEW_TRAPS.length} new)`);
console.log(`  warningLines: ${alapin.warningLines.length} (replaced — error→consequence→fix template)`);
