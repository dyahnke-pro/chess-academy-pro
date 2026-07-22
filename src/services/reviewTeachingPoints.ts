/**
 * reviewTeachingPoints — the missing Naroditsky TEACHING MESSAGES (David 2026-07-20,
 * "add the missing teaching points"). Each is a reusable chess LESSON he leans on,
 * computed from the board (G0 — chess.js only; the LLM voices, never decides):
 *
 * 🔒 THE COMPOSED-ADVICE DOCTRINE (David 2026-07-22, root-cause law — "CLEAN
 * FIXES THAT PREVENT HALLUCINATIONS FROM EVEN BEING POSSIBLE"): advice text is
 * COMPOSED FROM BOARD OBJECTS at runtime, never written ahead of the board.
 * Concretely: (1) every piece/square/phase/rights NOUN in an output sentence is
 * INTERPOLATED from a computed value (a piece found on the board, a counted
 * array, a parsed FEN field) — a hand-typed "knight"/"rook"/"castled king" that
 * assumes inventory or state is BANNED; (2) conditional phrases are keyed to
 * exhaustively-computed state, so a fragment claiming X is only selectable when
 * X was computed true; (3) fixed prose is allowed ONLY for pure principles that
 * reference nothing on the board ("a passed pawn's whole job is to run");
 * (4) durability adjectives ("lasting", "for good") attach only to fact classes
 * where permanence is provable (pawn structure, castling rights). This is G0's
 * inversion applied to AUTHORED templates: the template author decides nothing
 * the board didn't deliver. planPrescriptions.test.ts is the regression net —
 * the net is NOT the fix; this composition rule is.
 *
 *   M2  attacker/defender COUNT on a contested piece ("more attackers than
 *       defenders — it falls").
 *   M6  the King & Queen are the WORST defenders (a piece leaning only on the
 *       enemy K/Q — hit the guard, the piece drops).
 *   M20 a rook on the SEVENTH ("pigs on the seventh").
 *   M8/M32 a BAD enemy bishop hemmed in by its own pawns.
 *   M12 the WORST-PLACED friendly piece — improve it.
 *   M14/M23 push the passed pawn; knights are poor blockers.
 *
 * Every clause is emitted ONLY when the board actually shows it (empty > generic >
 * invented). Squares/pieces are always real, so the narration-accuracy gate holds.
 */
import { Chess, type Color, type Square } from 'chess.js';
import { describeStructure } from './boardStructure';
import { seeGain } from './positionReadingService';
import { captureHasCounterTactic } from './groundedAnswer';

const PIECE_VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const PIECE_NOUN: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

interface Cell { type: string; color: Color; square: string; }
function cells(chess: Chess): Cell[] {
  const out: Cell[] = [];
  for (const row of chess.board()) for (const c of row) if (c) out.push({ type: c.type, color: c.color, square: c.square });
  return out;
}
function isLight(sq: string): boolean { return ((sq.charCodeAt(0) - 97) + (Number(sq[1]) - 1)) % 2 === 1; }

/**
 * M2 — COUNT the attackers and defenders on the most contested piece. Reports the
 * single most valuable target where one side has MORE attackers than defenders:
 * an enemy piece the student can win, or a student piece under threat to shore up.
 */
export function attackerDefenderCount(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  let best: { text: string; value: number } | null = null;
  // OFFENSIVE only — the M2 lesson is "more attackers than defenders → it falls".
  // We deliberately do NOT flag the student's own overloaded piece: it collides
  // with an intentional sacrifice (the sacked rook/queen is MEANT to be loose).
  //
  // "So it falls" is a strong claim — a raw HEAD-COUNT can't carry it (two
  // attackers worth Q+P vs one defender can still LOSE the exchange), and even
  // a SEE-positive capture can walk into a fork one move later (the e5
  // hallucination class, David 2026-07-21). Verify with the flipped-board
  // student-to-move scan: the capture must exist, net material by SEE, and
  // survive the opponent's immediate counter-tactics — or the claim is dropped.
  const flippedParts = fen.split(' ');
  flippedParts[1] = studentColorWB;
  flippedParts[3] = '-';
  let flipped: Chess | null = null;
  try {
    flipped = new Chess(flippedParts.join(' '));
    if (flipped.inCheck()) flipped = null; // illegal null-move state — no claim
  } catch { flipped = null; }
  for (const c of cells(chess)) {
    if (c.color !== enemy || c.type === 'k' || c.type === 'p') continue;
    const sq = c.square as Square;
    const atk = chess.attackers(sq, studentColorWB).length;
    const def = chess.attackers(sq, enemy).length;
    if (atk === 0 || atk <= def) continue; // need a genuine numerical overload
    if (!flipped) continue;
    const cap = flipped.moves({ verbose: true }).find((m) => m.to === sq && m.captured);
    if (!cap) continue; // no legal capture (pinned attackers) — it does not fall
    const net = seeGain(flipped, sq);
    if (net <= 0) continue; // the exchange sequence does not actually win material
    if (captureHasCounterTactic(flipped.fen(), cap.san, enemy, net)) continue; // refuted one move later
    const cand = { value: PIECE_VAL[c.type] ?? 0,
      text: `count the attackers and defenders on their ${PIECE_NOUN[c.type]} on ${sq}: ${plural(atk, 'attacker')} to ${plural(def, 'defender')} — more attackers than defenders, so it falls` };
    if (!best || cand.value > best.value) best = cand;
  }
  return best ? best.text : null;
}

function plural(n: number, noun: string): string { return `${n} ${noun}${n === 1 ? '' : 's'}`; }

/**
 * M6 — the King and Queen are the WORST defenders: a piece leaning ONLY on the
 * enemy king or queen to hold it is loose, because the moment the royal defender is
 * hit it must abandon the piece. Reports an enemy piece the student attacks whose
 * only defender is the enemy K or Q.
 */
export function royalDefenderTarget(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  for (const c of cells(chess)) {
    if (c.color !== enemy || c.type === 'k' || c.type === 'p') continue;
    const sq = c.square as Square;
    if (chess.attackers(sq, studentColorWB).length === 0) continue; // must be under attack
    const defenders = chess.attackers(sq, enemy);
    if (defenders.length === 0) continue; // that's just hanging — a different lesson
    const allRoyal = defenders.every((d) => { const t = chess.get(d)?.type; return t === 'k' || t === 'q'; });
    if (allRoyal) {
      // Name EVERY royal guard — the Opera d8 rook was guarded by king AND
      // queen, and "guarded only by the king" was a false board claim
      // (scrutiny 2026-07-21). One royal → name it; both → name both.
      const types = new Set(defenders.map((d) => chess.get(d)?.type));
      const guard = types.size === 2 ? 'king and queen' : types.has('q') ? 'queen' : 'king';
      return `their ${PIECE_NOUN[c.type]} on ${sq} is guarded only by the ${guard} — and the king and queen are the worst defenders, because the moment you hit the guard the piece drops`;
    }
  }
  return null;
}

/** M20 — a student rook that has reached the SEVENTH rank ("pigs on the seventh"). */
export function rookOnSeventh(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const rank = studentColorWB === 'w' ? '7' : '2';
  const rook = cells(chess).find((c) => c.type === 'r' && c.color === studentColorWB && c.square[1] === rank);
  return rook ? `your rook has reached the seventh on ${rook.square} — a rook on the seventh is a pig, chewing through the pawns and pinning the king back` : null;
}

/**
 * M8/M32 — a BAD enemy bishop: hemmed in by its OWN pawns fixed on its colour, so
 * it has little scope. Requires ≥4 enemy pawns on the bishop's colour AND the
 * bishop itself has ≤2 squares (genuinely bad, not just theoretically).
 */
export function badEnemyBishop(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  // Past the opening only — an UNDEVELOPED starting bishop has 0 squares and 4
  // same-colour pawns too, but it isn't "bad", just not out yet (the false
  // positive the diagnostic caught at moves 2-9).
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  if (fullmove < 12) return null;
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const all = cells(chess);
  const enemyMob = mobilityMap(chess, enemy); // ONE moves() enumeration
  for (const c of all) {
    if (c.type !== 'b' || c.color !== enemy) continue;
    // A bishop still on its home square is undeveloped, not bad.
    if ((enemy === 'w' && (c.square === 'c1' || c.square === 'f1')) || (enemy === 'b' && (c.square === 'c8' || c.square === 'f8'))) continue;
    const light = isLight(c.square);
    const ownPawnsSameColour = all.filter((p) => p.type === 'p' && p.color === enemy && isLight(p.square) === light).length;
    if (ownPawnsSameColour < 4) continue;
    if ((enemyMob.get(c.square) ?? 0) > 2) continue;
    return `their bishop on ${c.square} is a bad piece — hemmed in behind its own pawns on the same colour, with almost nowhere to go`;
  }
  return null;
}

/**
 * M12 — the student's WORST-PLACED piece: the minor or rook with the fewest legal
 * squares. The "what do I do when there's no tactic" lesson — find it a job. Only
 * fires past the opening and only when a piece is genuinely stuck (≤1 square).
 */
export function worstPlacedFriendlyPiece(fen: string, studentColorWB: Color): string | null {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  if (fullmove < 10) return null;
  const mob = mobilityMap(chess, studentColorWB); // ONE moves() enumeration
  let worst: { sq: string; type: string; m: number } | null = null;
  for (const c of cells(chess)) {
    if (c.color !== studentColorWB) continue;
    if (c.type !== 'n' && c.type !== 'b' && c.type !== 'r') continue;
    const m = mob.get(c.square) ?? 0;
    if (!worst || m < worst.m) worst = { sq: c.square, type: c.type, m };
  }
  if (worst && worst.m <= 1) {
    return `your worst-placed piece is the ${PIECE_NOUN[worst.type]} on ${worst.sq} — it has almost no squares, so the plan is to reroute it somewhere it actually does a job`;
  }
  return null;
}

/**
 * M14/M23 — a student PASSED pawn is a trump that must be pushed; and if the enemy
 * has a knight, remember knights are poor at stopping a runner. Reports the passer +
 * the push cue (+ the knight note when it applies).
 */
export function passedPawnPush(fen: string, studentColorWB: Color, passedSquare: string | null): string | null {
  if (!passedSquare) return null;
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return null; }
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const enemyHasKnight = cells(chess).some((c) => c.type === 'n' && c.color === enemy);
  const knightNote = enemyHasKnight ? ', and their knight is a poor blocker — knights are bad at stopping a runner' : '';
  return `your passed pawn on ${passedSquare} wants to run — passed pawns are meant to be pushed${knightNote}`;
}

/**
 * "THE PLANS FROM HERE" — the FORWARD plans the student should pursue, each with
 * the concrete HOW (David 2026-07-20: "add in more future plans … and exactly HOW
 * to do those plans"). A great review doesn't only describe the board and name a
 * plan — it spells out the method: which squares, which pieces, which breaks.
 * Board-derived (G0), in Danya priority order; returns EVERY plan that genuinely
 * applies (not just the top one), so the student hears the full agenda. Empty when
 * nothing concrete stands out.
 */
export function deriveNextPlans(fen: string, studentColorWB: Color): string[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const struct = describeStructure(fen);
  if (!struct) return [];
  const enemy: Color = studentColorWB === 'w' ? 'b' : 'w';
  const all = cells(chess);
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  const plans: string[] = [];

  // 1. Enemy king exposed in the centre → open lines and attack it, HOW spelled out.
  const enemyKing = all.find((c) => c.type === 'k' && c.color === enemy);
  const openCentralFile = struct.pawns.openFiles.find((f) => f === 'd' || f === 'e') ?? null;
  if (enemyKing && fullmove >= 8 && 'cdef'.includes(enemyKing.square[0])
    && (enemy === 'w' ? '12'.includes(enemyKing.square[1]) : '78'.includes(enemyKing.square[1]))
    && openCentralFile) {
    // The soft squares in front of a stuck king — where a sac usually lands.
    // Rook clause scales to the rooks the student actually HAS (prescription
    // gate, David 2026-07-22 — never prescribe a piece that isn't there).
    const softSquares = enemy === 'w' ? 'd2 and f2' : 'd7 and f7';
    const rookCount = all.filter((c) => c.type === 'r' && c.color === studentColorWB).length;
    const fileClause = rookCount >= 2
      ? `then double both rooks onto the open ${openCentralFile}-file so they bear straight down on the king; `
      : rookCount === 1
        ? `then swing your rook onto the open ${openCentralFile}-file so it bears straight down on the king; `
        : '';
    plans.push(`the plan from here is to attack their king stuck on ${enemyKing.square} before it ever reaches safety. Here's exactly how: first make sure your OWN king is tucked away, ${fileClause}bring every piece into the attack with tempo — a move that develops AND threatens is worth two; and hunt for a sacrifice on the soft squares ${softSquares} that rips the cover off, because once the king is bare it's checks all the way to mate`);
  }

  // 2. Your passed pawn → push it, HOW spelled out. The king joins the escort
  // ONLY once the queens are off — telling a student to march the king up a
  // middlegame board is phase-blind advice (template-logic sweep, David
  // 2026-07-22: read every authored line as a chess player).
  const passer = struct.pawns.passedPawns[studentColorWB][0];
  if (passer) {
    const queensOn = all.some((c) => c.type === 'q');
    const escort = queensOn
      ? 'escort it with your pieces rather than pushing it alone into danger — the king joins the escort once the queens come off'
      : 'escort it up with your king and pieces rather than pushing it alone into danger';
    plans.push(`the plan from here is to get your passed pawn on ${passer} promoting. Here's how: clear the square in front of it so nothing blocks the road, ${escort}, and advance it one safe square at a time until they have to give up a piece to stop it — a passed pawn's whole job is to run`);
  }

  // 3. An enemy weak (isolated) pawn on the c–f files → besiege it, HOW spelled
  // out. Only prescribe pieces the student actually HAS — "plant a knight"
  // with no knight on the board is nonsense advice (template-logic sweep).
  const weak = struct.pawns.isolatedPawns[enemy].find((sq) => 'cdef'.includes(sq[0])) ?? struct.pawns.isolatedPawns[enemy][0];
  if (weak) {
    const block = `${weak[0]}${enemy === 'w' ? Number(weak[1]) + 1 : Number(weak[1]) - 1}`;
    // The blockader is an ACTUAL board object — its noun is interpolated from
    // the piece found, so prescribing an absent piece is unwritable (root-
    // cause doctrine, David 2026-07-22). Knight preferred (the classic
    // blockader), any minor otherwise, square-control phrasing when no minor
    // exists at all.
    const blockader = all.find((c) => c.type === 'n' && c.color === studentColorWB)
      ?? all.find((c) => c.type === 'b' && c.color === studentColorWB)
      ?? null;
    const blockBit = blockader
      ? `plant your ${blockader.type === 'n' ? 'knight' : 'bishop'} on the square right in front of it, ${block}, so it can never advance to free itself`
      : `control the square right in front of it, ${block}, so it can never advance to free itself`;
    plans.push(`the plan from here is to win their weak pawn on ${weak}. Here's how: ${blockBit}; then stack your heavy pieces on the file to gang up on it, trade off the pieces that defend it one by one, and either win it outright or tie their whole army to babysitting it`);
  }

  // 4. An open file you don't yet own with a heavy piece → seize it, HOW
  // spelled out — only when the student still HAS a rook to put there.
  const myRooks = all.filter((c) => c.type === 'r' && c.color === studentColorWB);
  const myHeavyFiles = new Set(all.filter((c) => (c.type === 'r' || c.type === 'q') && c.color === studentColorWB).map((c) => c.square[0]));
  const freeOpenFile = struct.pawns.openFiles.find((f) => !myHeavyFiles.has(f));
  if (freeOpenFile && myRooks.length > 0) {
    const doubleBit = myRooks.length >= 2 ? 'double the second rook behind the first so nothing can challenge you, and ' : '';
    plans.push(`the plan from here is to seize the open ${freeOpenFile}-file. Here's how: put a rook on it right away before they contest it, ${doubleBit}drive down to the seventh rank where a rook chews through pawns and pins the king back`);
  }

  // 5. You already hold an outpost → dominate from it, HOW spelled out.
  const myOutpost = struct.outposts.find((o) => o.color === studentColorWB);
  if (myOutpost) {
    plans.push(`the plan from here is to make that ${myOutpost.piece === 'n' ? 'knight' : 'bishop'} on ${myOutpost.square} the boss of the board. Here's how: keep a pawn defending it so it can never be chased off, refuse any trade that gives it up cheaply, and use it as the anchor to pile your other pieces onto the weakness behind it`);
  }

  // 6. Your worst-placed piece (stuck) → reroute it, HOW spelled out.
  if (fullmove >= 10) {
    const mob = mobilityMap(chess, studentColorWB);
    let worst: { sq: string; type: string; m: number } | null = null;
    for (const c of all) {
      if (c.color !== studentColorWB || (c.type !== 'n' && c.type !== 'b' && c.type !== 'r')) continue;
      const m = mob.get(c.square) ?? 0;
      if (!worst || m < worst.m) worst = { sq: c.square, type: c.type, m };
    }
    if (worst && worst.m <= 1) {
      plans.push(`the plan from here is to rescue your worst piece, the ${PIECE_NOUN[worst.type]} on ${worst.sq}. Here's how: don't play a single attacking move until it's fixed — spend two or three tempi walking it to a square where it actually bites, because a piece doing nothing means you're effectively playing down a piece`);
    }
  }

  // 7. Up a clear amount of material → simplify and convert, HOW spelled out.
  // The surplus NOUN is COMPOSED from the actual material breakdown — "the
  // extra piece" was hand-typed while bal >= 2 can be two pawns or the
  // exchange (root-cause doctrine, David 2026-07-22: advice text is composed
  // from board objects, never written ahead of the board).
  const bal = struct.material.balance * (studentColorWB === 'w' ? 1 : -1);
  if (bal >= 2) {
    const pts: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
    const nonPawn = (color: Color): number => all.filter((c) => c.color === color && c.type !== 'p' && c.type !== 'k')
      .reduce((s, c) => s + (pts[c.type] ?? 0), 0);
    const pawnDiff = all.filter((c) => c.color === studentColorWB && c.type === 'p').length
      - all.filter((c) => c.color === enemy && c.type === 'p').length;
    const nonPawnDiff = nonPawn(studentColorWB) - nonPawn(enemy);
    const surplus = nonPawnDiff >= 3 ? 'the extra piece'
      : nonPawnDiff >= 2 ? 'the exchange'
      : pawnDiff >= 1 ? `your extra pawn${pawnDiff > 1 ? 's' : ''}`
      : 'your material edge';
    plans.push(`the plan from here is to convert your extra material. Here's how: offer a trade of pieces at every chance but keep the pawns on, steer straight for an endgame where ${surplus} ${surplus.endsWith('s') ? 'are' : 'is'} decisive, and don't get greedy or complicate — simplicity is what wins a won game`);
  }

  // 8. Bishop pair → open the position for the two bishops, HOW spelled out.
  const myB = all.filter((c) => c.type === 'b' && c.color === studentColorWB).length;
  const enemyB = all.filter((c) => c.type === 'b' && c.color === enemy).length;
  if (myB >= 2 && enemyB <= 1) {
    // "MAKE THE PAIR COUNT", never "cash in" — cashing-in reads as selling the
    // asset, which contradicts the very next clause about guarding both from a
    // swap (David 2026-07-22). The pair converts by DOMINATING an open board
    // while both bishops live; the trade comes last, at full price.
    // The "outgun" comparison names what the enemy ACTUALLY has (prescription
    // gate — never reference a piece that isn't on the board, even in an idiom).
    const enemyN = all.some((c) => c.type === 'n' && c.color === enemy);
    const rival = enemyN && enemyB === 1 ? 'their knight and bishop'
      : enemyN ? 'their knights'
      : enemyB === 1 ? 'their lone bishop'
      : 'anything they have left';
    plans.push(`the plan from here is to make your bishop pair count. Here's how: trade pawns to rip the position open, guard both bishops from any swap, and point them at both wings at once — in an open board two bishops rake the whole thing and simply outgun ${rival}. The pair is only an advantage while both live; you trade one at the very end, when it wins something concrete`);
  }

  return plans;
}

/** Back-compat single-plan helper (the top-priority plan), retained for callers
 *  that want just one. */
export function deriveNextPlan(fen: string, studentColorWB: Color): string | null {
  return deriveNextPlans(fen, studentColorWB)[0] ?? null;
}

/** Can the opponent still WIN the `side` piece sitting on `sq` (value `val`),
 *  with the opponent to move? Pin-aware (uses legal captures, not raw
 *  attackers()): the piece is winnable when the opponent has a legal capture
 *  onto `sq` AND either a strictly CHEAPER attacker takes it (falls regardless
 *  of defence) or it is undefended. Returns false (safe) when no legal capture
 *  reaches it, or every capturer is ≥ its value and it is defended (equal trade
 *  at worst). Used by the trapped-piece rescue scan. */
function pieceStillWinnable(afterOppToMove: Chess, sq: string, side: Color, val: number): boolean {
  const cell = afterOppToMove.get(sq as Square);
  if (!cell || cell.color !== side) return false; // the piece left / was captured resolving the move
  const legalCaps = afterOppToMove.moves({ verbose: true }).filter((m) => m.to === sq && m.captured);
  if (legalCaps.length === 0) return false; // nothing can legally take it
  const cheaper = legalCaps.some((m) => (PIECE_VAL[afterOppToMove.get(m.from)?.type ?? 'k'] ?? 99) < val);
  if (cheaper) return true; // a cheaper piece takes it — it falls
  const defended = afterOppToMove.attackers(sq as Square, side).length > 0;
  return !defended; // undefended → free; defended vs equal-or-higher → holdable
}

/** Per-square legal-move counts for every piece of `color`, from ONE moves()
 *  enumeration (one Chess build) — far cheaper than a fresh Chess per piece. */
function mobilityMap(chess: Chess, color: Color): Map<string, number> {
  const out = new Map<string, number>();
  const parts = chess.fen().split(' ');
  parts[1] = color; parts[3] = '-';
  try {
    for (const mv of new Chess(parts.join(' ')).moves({ verbose: true })) {
      out.set(mv.from, (out.get(mv.from) ?? 0) + 1);
    }
  } catch { /* leave empty */ }
  return out;
}

/**
 * THE "WHY NOT JUST TAKE?" TEACHER (David 2026-07-21, locked as the best-line
 * explanation standard: "The bishop on g5 is guarded by the h4-pawn. That's the
 * whole story… This needs to be the explanation on the best line moves!!").
 * When the line's chosen move IGNORES a tempting capture, explain concretely why
 * the grab fails — the student is staring at that capture, and the line makes no
 * sense to them until someone says why it's wrong. Fully computed (G0):
 *  • find the most tempting capture the mover DIDN'T play (victim worth >= 3);
 *  • SEE the exchange: a net loss >= 1 → "X falls to Y — you'd trade A for B";
 *  • an EVEN trade whose pawn-recapture rips open a file toward the mover's own
 *    king (the hxg5 pattern: recapturing pawn leaves file F, recapturer has a
 *    heavy piece on F, mover's king within a file of F) → say THAT.
 * Silence otherwise (empty > generic > invented) — a capture that simply wins is
 * not a temptation to warn about, and an even trade with no consequence is not
 * worth a clause.
 */
export function explainTemptingCapture(
  fen: string,
  chosenSan: string,
  /** WHO the mover is, for correct-seat speech (David 2026-07-21: "You realize
   *  it was white in this game..?" — the first version always said "your queen /
   *  your king", which reads from the WRONG SEAT whenever the line being walked
   *  is the opponent's; a review line's mover alternates every ply).
   *  'you' → the student is the mover (second person);
   *  'they' → the opponent is the mover (the student watches their reasoning);
   *  'neutral' → side names from the fen (theory dives — no seat at all). */
  perspective: 'you' | 'they' | 'neutral' = 'you',
): string | null {
  try {
    const c = new Chess(fen);
    const mover = c.turn();
    const caps = c.moves({ verbose: true }).filter((m) => m.captured && PIECE_VAL[m.captured] >= 3);
    if (caps.length === 0) return null;
    // The most tempting = highest victim value; prefer the queen grabbing (the
    // student's eye goes to the biggest piece that looks takable).
    caps.sort((a, b) => PIECE_VAL[b.captured as string] - PIECE_VAL[a.captured as string]);
    const t = caps[0];
    const chosen = new Chess(fen).move(chosenSan);
    if (!chosen) return null;
    // The line TAKES the tempting victim — nothing to explain. Bail whether it
    // captures with the SAME piece OR a different one: "that's why the line
    // leaves it alone" while the line grabs that very square (with another
    // piece) was self-contradicting (board-awareness sweep, 2026-07-22).
    if (chosen.to === t.to && chosen.captured) return null;
    if (chosen.from === t.from && chosen.to === t.to) return null;
    const victimVal = PIECE_VAL[t.captured as string];
    const after = new Chess(fen);
    after.move(t.san);
    // Opponent's best exchange net on the landing square (their POV).
    const oppNet = seeGain(after, t.to);
    const capturerNoun = PIECE_NOUN[t.piece];
    const victimNoun = PIECE_NOUN[t.captured as string];
    // THE TRAPPED-CAPTURER CASE (David 2026-07-21: "the trapped piece was the
    // queen!!!" — in his game Black's Qf6 was attacked by Bg5 with EVERY flight
    // square covered). When the piece that could take is itself TRAPPED, "the
    // line leaves it alone" is FALSE teaching: the exchange happens anyway, and
    // the line is just picking the cheapest version of losing the piece. Tell
    // the trapped-piece truth instead.
    if (t.piece === 'q' || t.piece === 'r') {
      const trapped = findTrappedPiece(fen, mover);
      if (trapped && trapped.square === t.from) {
        const trapPoss = perspective === 'you' ? 'your' : perspective === 'they' ? 'their' : `${mover === 'w' ? 'White' : 'Black'}'s`;
        return `The real story: ${trapPoss} ${trapped.piece} on ${trapped.square} is trapped — attacked by the ${trapped.attackerPiece} on ${trapped.attackerSquare}, and every escape square is covered. The line isn't declining the ${victimNoun}; it's picking the cheapest way to let the ${trapped.piece} go.`;
      }
    }
    // Identify the cheapest recapturer for the prose ("the h-pawn takes back").
    const enemy: Color = mover === 'w' ? 'b' : 'w';
    const recapSquares = after.attackers(t.to, enemy);
    let recapNoun: string | null = null;
    let recapFrom: string | null = null;
    let best = Infinity;
    for (const s of recapSquares) {
      const p = after.get(s);
      if (p && PIECE_VAL[p.type] < best) { best = PIECE_VAL[p.type]; recapNoun = PIECE_NOUN[p.type]; recapFrom = s as string; }
    }
    // Seat-correct pronouns: the mover's possessive ("your"/"their"/"White's"),
    // and who the line belongs to in the closing clause.
    const moverName = mover === 'w' ? 'White' : 'Black';
    const moverPoss = perspective === 'you' ? 'your' : perspective === 'they' ? 'their' : `${moverName}'s`;
    const lineWhose = perspective === 'you' ? 'the line' : perspective === 'they' ? 'their line' : `${moverName}'s line`;
    if (oppNet - victimVal >= 1 && recapNoun && recapFrom) {
      // The grab LOSES material: guarded piece, bad trade.
      const notFree = perspective === 'they' ? 'is NOT free for them' : 'is NOT free';
      return `Notice the ${victimNoun} on ${t.to} ${notFree} — it's guarded by the ${recapNoun} on ${recapFrom}, so ${t.san} just trades ${moverPoss} ${capturerNoun} for a ${victimNoun}${PIECE_VAL[t.piece] > victimVal ? ` — giving up ${PIECE_VAL[t.piece]} points for ${victimVal}` : ''}. That's why ${lineWhose} leaves it alone.`;
    }
    if (oppNet - victimVal === 0 && recapNoun === 'pawn' && recapFrom) {
      // EVEN trade — but does the pawn-recapture open a file at the mover's king?
      const sim = new Chess(after.fen());
      const recapMove = sim.moves({ verbose: true }).find((m) => m.from === recapFrom && m.to === t.to);
      if (recapMove) {
        sim.move(recapMove.san);
        const file = recapFrom[0];
        const board = sim.board().flat().filter((p): p is NonNullable<typeof p> => p !== null);
        const fileHasEnemyPawn = board.some((p) => p.type === 'p' && p.color === enemy && p.square[0] === file);
        const enemyHeavyOnFile = board.some((p) => (p.type === 'r' || p.type === 'q') && p.color === enemy && p.square[0] === file);
        const myKing = board.find((p) => p.type === 'k' && p.color === mover);
        const kingNear = myKing ? Math.abs(myKing.square.charCodeAt(0) - file.charCodeAt(0)) <= 1 : false;
        if (!fileHasEnemyPawn && enemyHeavyOnFile && kingNear) {
          const kingPoss = perspective === 'you' ? 'your king' : perspective === 'they' ? 'their own king' : `${moverName}'s own king`;
          const opener = perspective === 'you' ? 'their heavy piece' : 'a heavy piece';
          return `The trade ${t.san} looks natural, but after the ${recapNoun} takes back, the ${file}-file rips open — straight at ${kingPoss}, with ${opener} already sitting on it. ${lineWhose.charAt(0).toUpperCase()}${lineWhose.slice(1)} keeps the tension instead.`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * NOTABLE-MOVE TEACHER (David 2026-07-21, IMG_4570: "Still too many moves passing
 * without narration, for both sides. I feel like Danya would have said something
 * about this ambitious pawn push"). Fires on moves that CHANGE THE GAME'S SHAPE
 * yet would otherwise pass silently — for EITHER side. Fully computed:
 *  • an AMBITIOUS WING PUSH — a flank pawn crossing into rank 4+ (mover's POV):
 *    names the space gained, the exact squares it no longer guards, and whether
 *    it's committal (own king uncastled or on that wing) or a storm (enemy king
 *    on that wing);
 *  • a CENTRAL BREAK — a d/e-pawn move that creates direct pawn contact.
 * Null on ordinary moves (empty > generic).
 */
export function describeNotableMove(fenBefore: string, san: string, moverIsStudent: boolean): string | null {
  try {
    const before = new Chess(fenBefore);
    const mv = before.move(san);
    if (!mv) return null;
    const mover = mv.color;
    const enemy: Color = mover === 'w' ? 'b' : 'w';
    const subj = moverIsStudent ? 'you' : 'your opponent';
    const poss = moverIsStudent ? 'your' : 'their';
    if (mv.piece !== 'p' || mv.captured) return null;
    const file = mv.to[0];
    const toRank = Number(mv.to[1]);
    const rankFromMoverPov = mover === 'w' ? toRank : 9 - toRank;
    const after = new Chess(fenBefore); after.move(san);
    const board = after.board().flat().filter((p): p is NonNullable<typeof p> => p !== null);

    // CENTRAL BREAK: d/e-pawn move that lands in direct contact with an enemy pawn.
    if ((file === 'd' || file === 'e') && rankFromMoverPov >= 4) {
      const dir = mover === 'w' ? 1 : -1;
      const contact = ['-1', '1'].some((df) => {
        const f = String.fromCharCode(file.charCodeAt(0) + Number(df));
        const sq = `${f}${toRank + dir}`;
        const p = board.find((x) => x.square === sq);
        return !!p && p.type === 'p' && p.color === enemy;
      });
      if (contact) {
        return `${subj === 'you' ? 'You strike' : 'Your opponent strikes'} in the centre with ${san} — the pawns are touching now, and every exchange here opens lines. Breaks like this are how the position's character gets decided.`;
      }
      return null;
    }

    // AMBITIOUS WING PUSH: flank pawn (a-c or f-h) reaching rank 4+ from the
    // mover's POV. Compute the squares the pawn used to guard and no longer does.
    const isWing = 'abc'.includes(file) || 'fgh'.includes(file);
    if (!isWing || rankFromMoverPov < 4) return null;
    const travelled = Math.abs(Number(mv.to[1]) - Number(mv.from[1]));
    if (travelled < 2 && rankFromMoverPov < 5) return null; // one quiet step, not yet ambitious
    const dir = mover === 'w' ? 1 : -1;
    const fromRank = Number(mv.from[1]);
    const weakened: string[] = [];
    for (const df of [-1, 1]) {
      const f = String.fromCharCode(file.charCodeAt(0) + df);
      if (f < 'a' || f > 'h') continue;
      const sq = `${f}${fromRank + dir}`;
      // Weakened if no other own pawn can still guard that square.
      const stillGuarded = board.some((p) => p.type === 'p' && p.color === mover
        && Math.abs(p.square.charCodeAt(0) - sq.charCodeAt(0)) === 1
        && Number(p.square[1]) + dir === Number(sq[1]));
      if (!stillGuarded) weakened.push(sq);
    }
    const wing = 'abc'.includes(file) ? 'queenside' : 'kingside';
    const myKing = board.find((p) => p.type === 'k' && p.color === mover);
    const theirKing = board.find((p) => p.type === 'k' && p.color === enemy);
    const kingWingOf = (sq: string | undefined): string | null => !sq ? null : ('abc'.includes(sq[0]) ? 'queenside' : 'fgh'.includes(sq[0]) ? 'kingside' : 'centre');
    const myWing = kingWingOf(myKing?.square);
    const theirWing = kingWingOf(theirKing?.square);
    const parts: string[] = [];
    parts.push(`${subj === 'you' ? 'You throw' : 'Your opponent throws'} the ${file}-pawn forward — an ambitious ${wing} push that grabs space`);
    if (theirWing === wing) parts.push(`and points a pawn storm at ${subj === 'you' ? 'their' : 'your'} king`);
    if (weakened.length) parts.push(`. The price: ${weakened.join(' and ')} ${weakened.length === 1 ? 'is' : 'are'} no longer guarded by a pawn — ${poss} own camp is looser behind it`);
    if (myWing === 'centre') parts.push(`, and ${poss} king is still in the middle, so it's a real commitment`);
    else if (myWing === wing) parts.push(`, and it's the wing ${poss} own king lives on — pushing those pawns thins the king's cover`);
    return `${parts.join('')}.`;
  } catch {
    return null;
  }
}

/**
 * CONCESSION TEACHER (David 2026-07-21, IMG_4571: "What serious positional
 * concessions have been made? What are the ramifications of this move?"). For a
 * flagged move, name the LASTING damage it caused — computed by diffing the
 * position before/after from the mover's side:
 *  • king-shield pawns lost or advanced (the king's cover thinned);
 *  • a new enemy PASSED pawn granted;
 *  • the mover's pawn islands increasing (structure splintered);
 *  • squares the moved pawn used to guard, now permanently unguardable.
 * Returns a compact clause or null when no structural concession shows.
 */
export function describeConcessions(fenBefore: string, san: string, moverIsStudent: boolean): string | null {
  try {
    const b = new Chess(fenBefore);
    const mv = b.move(san);
    if (!mv) return null;
    const mover = mv.color;
    const enemy: Color = mover === 'w' ? 'b' : 'w';
    const poss = moverIsStudent ? 'your' : 'their';
    const before = new Chess(fenBefore);
    const after = new Chess(fenBefore); after.move(san);
    const sB = describeStructure(fenBefore);
    const sA = describeStructure(after.fen());
    const out: string[] = [];
    // King shield: pawns on the 3 files around the king, within 2 ranks in front.
    const shield = (chess: Chess, color: Color): number => {
      const all = chess.board().flat().filter((p): p is NonNullable<typeof p> => p !== null);
      const king = all.find((p) => p.type === 'k' && p.color === color);
      if (!king) return 0;
      const kf = king.square.charCodeAt(0); const kr = Number(king.square[1]);
      const dir = color === 'w' ? 1 : -1;
      return all.filter((p) => p.type === 'p' && p.color === color
        && Math.abs(p.square.charCodeAt(0) - kf) <= 1
        && (Number(p.square[1]) - kr) * dir >= 1 && (Number(p.square[1]) - kr) * dir <= 2).length;
    };
    const shieldB = shield(before, mover); const shieldA = shield(after, mover);
    if (shieldA < shieldB) out.push(`${poss} king's pawn cover thinned (${shieldB} shield pawns down to ${shieldA})`);
    if (sB && sA) {
      const passB = sB.pawns.passedPawns[enemy].length; const passA = sA.pawns.passedPawns[enemy].length;
      if (passA > passB) out.push(`it hands the opponent a passed pawn on ${sA.pawns.passedPawns[enemy].find((p) => !sB.pawns.passedPawns[enemy].includes(p)) ?? sA.pawns.passedPawns[enemy][0]}`);
      const isoB = sB.pawns.isolatedPawns[mover].length; const isoA = sA.pawns.isolatedPawns[mover].length;
      if (isoA > isoB) out.push(`${poss} pawn structure splinters — a new isolated pawn on ${sA.pawns.isolatedPawns[mover].find((p) => !sB.pawns.isolatedPawns[mover].includes(p)) ?? sA.pawns.isolatedPawns[mover][0]}`);
    }
    if (out.length === 0) return null;
    return `The lasting concession: ${out.join('; ')}.`;
  } catch {
    return null;
  }
}

/**
 * TRAPPED-PIECE DETECTOR (David 2026-07-21: "the trapped piece was the queen!!!"
 * — his position had Black's queen on f6 attacked by Bg5 with EVERY flight
 * square covered; the review talked about the bishop instead). Conservative,
 * fully computed: a rook or queen of `side` is TRAPPED when it is attacked AND
 * every legal move of that piece loses it:
 *  • a non-capture flight is unsafe if the destination is attacked by a CHEAPER
 *    enemy piece, or attacked at all while undefended;
 *  • a capture-flight is unsafe if the exchange loses material (SEE);
 * staying put must also lose (attacked by a cheaper piece, or attacked while
 * undefended). Equal-trade escapes (queen takes queen on a defended square)
 * count as ESCAPES — that's a trade, not a trap. Returns the trapped piece or
 * null. Minors are skipped (a trapped minor is usually just "wins a piece" —
 * the tactics layer covers it; R/Q traps are the story-level events).
 */
export function findTrappedPiece(
  fen: string,
  side: Color,
): { square: string; piece: string; attackerSquare: string; attackerPiece: string } | null {
  try {
    const chess = new Chess(fen);
    const enemy: Color = side === 'w' ? 'b' : 'w';
    for (const c of cells(chess)) {
      if (c.color !== side || (c.type !== 'q' && c.type !== 'r')) continue;
      const sq = c.square as Square;
      const val = PIECE_VAL[c.type];
      const attackers = chess.attackers(sq, enemy);
      if (attackers.length === 0) continue;
      const cheapAtk = attackers.find((a) => (PIECE_VAL[chess.get(a)?.type ?? 'k'] ?? 99) < val);
      const defended = chess.attackers(sq, side).length > 0;
      if (!cheapAtk && defended) continue; // holdable where it stands → not trapped
      // Enumerate the piece's own moves — side-to-move flip so it can "move" now.
      const parts = chess.fen().split(' ');
      parts[1] = side; parts[3] = '-';
      const probe = new Chess(parts.join(' '));
      const moves = probe.moves({ verbose: true }).filter((m) => m.from === sq);
      if (moves.length === 0) continue; // frozen ≠ trapped unless attacked-cheaper (covered below)
      let allLose = true;
      for (const m of moves) {
        const after = new Chess(parts.join(' '));
        after.move(m.san);
        if (m.captured) {
          // Capture-flight: unsafe when the recapture wins the exchange.
          const oppNet = seeGain(after, m.to);
          const gain = PIECE_VAL[m.captured] ?? 0;
          if (oppNet - gain < 1) { allLose = false; break; } // wins/even → escape
        } else {
          const atk = after.attackers(m.to, enemy);
          if (atk.length === 0) { allLose = false; break; } // clean flight
          const cheaper = atk.some((a) => (PIECE_VAL[after.get(a)?.type ?? 'k'] ?? 99) < val);
          const def = after.attackers(m.to, side).length > 0;
          if (!cheaper && def) { allLose = false; break; } // defended vs equal → trade escape
        }
      }
      if (!allLose) continue;
      // RESCUE SCAN (board-awareness sweep, 2026-07-22): the piece's own moves
      // all lose, but the side may still SAVE it another way — capture the
      // attacker (hxg5!), interpose against a slider, or add a defender. The old
      // detector ignored every rescue that wasn't the piece moving itself, so it
      // declared "every escape square is covered" while a pawn could just take
      // the attacker. Scan the side's OTHER legal moves; if any leaves the piece
      // no longer winnable by the opponent, it is NOT trapped (empty > invented).
      let rescued = false;
      for (const m of probe.moves({ verbose: true })) {
        if (m.from === sq) continue; // the piece's own moves already scanned
        const after = new Chess(parts.join(' '));
        try { after.move(m.san); } catch { continue; }
        if (pieceStillWinnable(after, sq, side, val)) continue;
        rescued = true;
        break;
      }
      if (rescued) continue;
      const atkSq = cheapAtk ?? attackers[0];
      const atkPiece = chess.get(atkSq);
      return { square: sq, piece: PIECE_NOUN[c.type], attackerSquare: atkSq as string, attackerPiece: PIECE_NOUN[atkPiece?.type ?? 'p'] };
    }
    return null;
  } catch {
    return null;
  }
}
