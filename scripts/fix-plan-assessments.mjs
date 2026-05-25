import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

// David 2026-05-25: a played line that shows no obvious material advantage
// MUST fully EXPLAIN the advantage in its closing narration — never a bare
// "Black is equal / comfortable / ready". Rewrite the final assessment beat
// of every plan flagged with a vague closer so it names the concrete trumps
// (the structure, the file/diagonal, the plan that converts the edge).
// Board-verified against the final FEN; lead-the-eye is regenerated after.

const PATH = 'src/data/middlegame-plans.json';

const NEW_FINAL = {
  'mp-frenchdefence-exchange':
    "…Bxg3 wins the bishop pair, and with both bishops trained on White's king and the rook on the open e-file, Black is the more active side — the Exchange's symmetry is no draw, it is Black's to press.",
  'mp-frenchdefence-fortknox':
    "Castling completes the Fort Knox: not one weakness to target, the problem bishop already traded off, and the …c5 and …e5 breaks both loaded. It is a spring, not a wall — full equality, and the easier side to play.",
  'mp-frenchdefence-rubinstein':
    "…gxf6 recaptures toward the centre: the doubled f-pawns clamp e5 and g5, the half-open g-file feeds the rook at White's king, and the b7-bishop rakes the long diagonal — concrete attacking assets, not just a tidy structure.",
  'mp-scandinaviandefence-main':
    "Black stands fully mobilised: the queen on a5 pins down the queenside, the bishop on f5 is active outside the chain, and both knights bear on d4. Equal material, but every black piece already works while White must still untangle.",
  'mp-scandinaviandefence-modern':
    "…Ne5 plants the knight on a dominant central square, eyeing c4 and f3 and daring a trade; with the g7-bishop on the long diagonal and pressure mounting on White's c4-d5 wedge, Black has a clear King's-Indian-style plan against the centre and fully equal, easier-to-play chances.",
  'mp-scandinaviandefence-tiviakov':
    "…Ne5 centralises on a powerful square, hitting f3 and c4, while the rook already sits on the half-open d-file behind White's advanced d5-pawn. Black has active, fully-equal play and a ready-made target — the over-extended d5-pawn.",
  'mp-scandinaviandefence-portuguese':
    "…Qh5 keeps the queen biting at the kingside light squares while …Bd6 trains on h2; Black's lead in development and active pieces are full compensation for the gambit pawn — an easy initiative, not mere equality.",
  'mp-alekhinedefence-fourpawns':
    "Castling completes the mobilisation, and the …f6 lever is next: crack the e5-spearhead and the whole Four Pawns centre collapses, with Black's knights on b6/c6 and bishops on e7/f5 poised to pour through. Black is at least equal with by far the more dynamic position.",
  'mp-alekhinedefence-exchange':
    "…Bf6 trains the bishop on d4, …Bg4 pins its defender, and the …d5 break is loaded — Black hits White's broad centre from every angle. Free development and concrete pressure give Black the easier, fully-equal game.",
  'mp-alekhinedefence-scandtrans':
    "…c5 strikes d4 and frees Black's game entirely; once the tension resolves Black has a sound structure with no weaknesses and smooth development — a line that tried to trick Black into passivity, refuted into comfortable equality.",
  'mp-benkogambit-declined':
    "…Nxa6 brings the knight back toward b4 and b5; with the half-open a-file, the g7-bishop on the long diagonal and a ready …b5 break, Black gets the Benko's trademark queenside pressure for free, in a balanced position that is far easier to handle as Black.",
  'mp-dutchdefence-main':
    "…Bd7 completes development, and now Black's plan is concrete and fast: the queen reroutes via e8 to h5, then …g5-g4 and …f4 prise open lines at White's king while the g7-bishop already rakes the long diagonal. White expands on the queenside, but Black strikes first and closer to the king — that race, won by a tempo, is the Leningrad's whole point.",
  'mp-nimzoindian-main':
    "…h6 puts the question to the g5-bishop, and Black's edge is clear: the a6-bishop pins White to the light squares, …c5 will crack the centre, and White's e4 stays permanently soft after the …Bxc3 trade. Black is the structurally healthier side with the active pieces.",
  'mp-nimzoindian-rubinstein':
    "…cxd4 opens the centre on Black's terms: the d4-pawn cramps White, and after …Bxc3 the doubled c-pawns become a lasting target while Black's pieces flow to active squares. Black presses the structure and never defends — comfortably the easier game.",
  'mp-nimzoindian-leningrad':
    "…Nbd7 finishes development behind the clamp; now …g5 entombs the h4-bishop and …g5-g4 storms the kingside while White's doubled c-pawns sit frozen as a target. In the locked centre only Black has a real plan — clearly the better side.",
  'mp-nimzoindian-kasparov':
    "…bxc6 leaves Black a compact pawn mass and the half-open b-file; the knight dominates d5, …Bxc3 will fracture White's queenside, and the light bishop swings to a6. Black has concrete targets on White's queenside and the more purposeful position.",
  'mp-nimzoindian-fischer':
    "…a6 readies …c5 to hit d4 and …a5 to undercut b4, while the b7-bishop locks down e4 and the d6-bishop eyes the kingside. Black keeps both bishops and a sound centre with active play on each wing — it is Black, not White, who sets the agenda.",
  'mp-carokann-advance':
    "…Qe7 stacks the queen behind the pressure on e5; with the light bishop entrenched on e4 and the dark bishop and both knights all trained on the e5-spearhead, Black besieges White's over-extended pawn. Black has the easier game and the clearer plan — pile up on e5 until it falls.",
  'mp-carokann-two-knights':
    "…cxd4 opens the centre on Black's terms: the d4-pawn cramps White and the half-open c-file invites the rooks, while Black carries not a single weakness. Comfortable equality with by far the more purposeful pieces.",
  'mp-carokann-tartakower':
    "…Be6 develops the second bishop into a harmonious setup; with both bishops active, the cramping h4-pawn squeezing White's king and the rook on the open e-file, Black holds a real initiative — the doubled f-pawns bought genuine, lasting assets.",

  // Other completed (not in-flight) masterclasses — same standard applied.
  'mp-pircdefence-lion':
    "…Nxe5 plants a strong knight in the centre; with the b7-bishop raking the long diagonal, the solid c6-d6 chain and a …d5 break in hand, Black has a fully-equal Lion — active pieces, no weaknesses, the kind of position Black plays for a win.",
  'mp-pircdefence-czech':
    "…dxe5 opens the centre just as Black is fully mobilised: the queen on a5 rakes the queenside, the knights and the e7-bishop are all active, and White's f4-thrust has left e4 and the king's shelter loose. Black has easy equality and the more purposeful plan.",
  'mp-italiangame-evans':
    "Nc3 completes a menacing setup: the b2-bishop and d3-bishop both rake Black's kingside, the d5-e4 centre cramps Black, and White's lead in development is full compensation for the gambit pawn — the attack plays itself with Qd2, Ng5 and the rooks swinging over.",
  'mp-catalanopening-slav':
    "Qe2 readies the recapture on c4; with the broad d4-e4 centre, the Catalan bishop firing down the long diagonal and the pawn coming back, White emerges with a real space-and-development edge — the Slav move-order gave Black nothing.",
};

const data = JSON.parse(readFileSync(PATH, 'utf-8'));
let touched = 0;
for (const plan of data) {
  const repl = NEW_FINAL[plan.id];
  if (!repl) continue;
  for (const ln of plan.playableLines ?? []) {
    if (!ln.annotations?.length) continue;
    // Board-verify the line is still legal end-to-end (defensive).
    const c = new Chess(ln.fen);
    for (const m of ln.moves) {
      if (!c.move(m)) { console.error(`ILLEGAL ${plan.id}: ${m}`); process.exit(1); }
    }
    ln.annotations[ln.annotations.length - 1] = repl;
  }
  touched++;
}
if (touched !== Object.keys(NEW_FINAL).length) {
  console.error(`expected ${Object.keys(NEW_FINAL).length} plans, touched ${touched}`);
  process.exit(1);
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`rewrote final assessment on ${touched} plans`);
