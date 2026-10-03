/**
 * whyItFailed — why the move the student actually played does not work.
 *
 * 🔒 THE HALF THE REVIEW WAS MISSING. `reviewBetterLineWhy` already narrates
 * the engine's better line ply by ply — David 2026-07-21: "Need to know why Bf2
 * was better. A deeper understanding is critical." But knowing why the OTHER
 * move was good is not the same as knowing why YOURS was wrong, and the second
 * one is the thing the student actually did. Told only "the stronger move was
 * X", they learn a move; told why their own idea failed, they learn the reason
 * it will fail again.
 *
 * Two geometries, both provable from the board with no engine at all:
 *
 *   HELD BY A DEFENDER — the move hits something, but the target is guarded and
 *   the piece doing the hitting is worth more than the piece it is hitting. The
 *   attack was never a threat. Naming the guard is the whole lesson: the
 *   student looked at the target and not at what stands behind it.
 *
 *   ANSWERED BY A TACTIC — nothing guards the target, so it looks free, and it
 *   is not, because it is the opponent's move and they have a check that hits
 *   the attacking piece at the same time. The student counted material and did
 *   not count tempo. This is the case that gives the module its name and the
 *   one that is invisible without playing the position forward a ply.
 *
 * G0 throughout: every clause is a fact computed here — which piece attacks
 * which square, which piece defends it, whether a reply gives check and forks —
 * and the model does not get to decide any of it. G3 likewise: every move named
 * is a legal move produced by chess.js, never one recalled from anywhere.
 *
 * Silence is the common answer and the correct one. Most errors are not this
 * shape, and inventing a geometry for them would teach the student to distrust
 * the ones that are real.
 */
import { gambitFile } from './inaccuracyCall';
import { proofCut } from './exchangeLedger';
import { Chess, type Square, type Color, type Move } from 'chess.js';

export interface WhyItFailed {
  /** One sentence, past tense — the move has already been played. */
  line: string;
  /** Squares worth marking: the target, then the piece that refutes it. */
  squares: string[];
  /** For a piece left hanging: the same fact when the reply did NOT take it
   *  (walk 900, 17…Bg1 — "the rook on f1 just takes it" after they played
   *  Nxg4). The caller that knows the reply chooses. */
  missed?: string;
  kind:
    | 'held-by-defender'    // the capture loses the exchange after recaptures
    | 'answered-by-tactic'  // an in-between check hits the attacker
    | 'lost-the-piece'      // the moved piece itself is taken for too little
    | 'abandoned-defender'  // moving it undefended one of your own pieces
    | 'walks-into-fork';    // the move let a reply hit two of your pieces
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/** Squares an enemy piece of `by` occupies that `from` attacks in this position. */
function attackedFrom(board: Chess, from: Square, mover: Color): Square[] {
  const hits: Square[] = [];
  for (const row of board.board()) {
    for (const sq of row) {
      if (!sq || sq.color === mover || sq.type === 'k') continue;
      // `attackers` answers the question the other way round — who hits this
      // square — which is the only direction chess.js offers and is enough:
      // the moved piece is one of them or it is not.
      if (board.attackers(sq.square, mover).includes(from)) hits.push(sq.square);
    }
  }
  return hits;
}

/** Same position, but forced to `side` to move (en-passant cleared) — lets the
 *  swap-off ask "if I captured here" even when it is really the other side's
 *  turn. Static-exchange only; the mover's own king is safe (they just moved). */
function withTurn(fen: string, side: Color): string {
  const p = fen.split(' ');
  if (p.length < 6) return fen;
  p[1] = side;
  p[3] = '-';
  return p.join(' ');
}

/**
 * SIGNED static-exchange value on `sq` for the side to move — the material it
 * nets by INITIATING a capture there with best play (least-valuable-attacker
 * each time; the RECAPTURER may stand pat, so the deeper recursion floors at 0,
 * but the initiating value itself is returned signed so a losing capture reads
 * negative). Board-only, no engine: every capture is a legal chess.js move, so
 * pins and X-rays are handled for free (a pinned piece can't recapture; a
 * discovered attacker joins once the piece in front of it moves).
 */
function seeInitiate(board: Chess, sq: Square): number {
  const side = board.turn();
  const victim = board.get(sq);
  if (!victim || victim.color === side) return 0;
  let lva: Square | null = null;
  let lvaVal = Infinity;
  for (const a of board.attackers(sq, side)) {
    const p = board.get(a);
    if (!p || a === sq) continue;
    const v = VALUE[p.type] ?? 0;
    if (v < lvaVal) { lvaVal = v; lva = a; }
  }
  if (!lva) return 0;
  const next = new Chess(board.fen());
  let m: Move | null = null;
  try { m = next.move({ from: lva, to: sq, promotion: 'q' }); } catch { return 0; }
  if (!m) return 0; // pinned / illegal — the attacker can't actually take
  return (VALUE[victim.type] ?? 0) - Math.max(0, seeInitiate(next, sq));
}

/** THE PIECE ON `sq` IS PINNED TO SOMETHING WORTH MORE (David's hand walk
 *  2026-09-24). Lift it off the board: if `by` now attacks a piece of the other
 *  side worth more than it that `by` did not attack before, it stands in front
 *  of that piece — a RELATIVE pin chess.js's legality cannot see (the knight on
 *  b6 may legally recapture on d5; it just hands over the queen behind it). */
/** After `from`x`to` by the side to move in `pos`, the most `me` wins back by
 *  any capture of theirs (a static exchange on each of their pieces). */
function counterWinsBack(pos: Chess, from: Square, to: Square, me: 'w' | 'b'): number {
  let b: Chess;
  try { b = new Chess(pos.fen()); b.move({ from, to, promotion: 'q' }); } catch { return 0; }
  let best = 0;
  for (const row of b.board()) for (const cell of row) {
    if (!cell || cell.color === me || cell.type === 'k') continue;
    if (b.attackers(cell.square, me).length === 0) continue;
    best = Math.max(best, seeGain(b, cell.square));
  }
  return best;
}

export function pinnedToMore(board: Chess, sq: Square, by: 'w' | 'b'): boolean {
  const piece = board.get(sq);
  if (!piece || piece.color === by) return false;
  const worth = VALUE[piece.type] ?? 0;
  let lifted: Chess;
  try { lifted = new Chess(board.fen()); lifted.remove(sq); } catch { return false; }
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== piece.color || cell.square === sq) continue;
      if ((VALUE[cell.type] ?? 0) <= worth) continue;
      const before = new Set(board.attackers(cell.square, by));
      if (lifted.attackers(cell.square, by).some((a) => !before.has(a))) return true;
    }
  }
  return false;
}

/** Material the side to move actually WINS by capturing on `sq` (floored — it
 *  won't start a losing capture). Use for "can the opponent win my piece here". */
function seeGain(board: Chess, sq: Square): number {
  return Math.max(0, seeInitiate(board, sq));
}

/** Net for the student of a move that landed on `sq` capturing `capturedType`,
 *  after the opponent's best swap-off. Negative = the move loses material. */
function captureNet(after: Chess, sq: Square, capturedType: string | null): number {
  const grabbed = capturedType ? (VALUE[capturedType] ?? 0) : 0;
  return grabbed - seeGain(after, sq);
}

/**
 * Why the played move fails, or null when the board does not say.
 *
 * Called with the position BEFORE the move, so both geometries can be compared
 * against what the move changed rather than guessed at from the result.
 */
export function whyItFailed(args: {
  fenBefore: string;
  playedSan: string;
  studentColor: 'white' | 'black';
  /** The engine's line AFTER the played move (UCI, their reply first), or
   *  null when unknown. REQUIRED (WO-OUTCOME-01): "X just takes it", "you come
   *  out N points down" and "once it left, Y wins it" are outcomes, and an
   *  outcome is what the engine's line does, read by the one ledger — a swap
   *  count said "the knight on f5 wins it" of a piece the engine never takes
   *  (walk oct3a, 25…g6). No line, no outcome sentence. */
  playedLineUci: readonly string[] | null;
}): WhyItFailed | null {
  const me: Color = args.studentColor === 'white' ? 'w' : 'b';
  const them: Color = me === 'w' ? 'b' : 'w';

  let before: Chess;
  let after: Chess;
  let mv: Move;
  try {
    before = new Chess(args.fenBefore);
    if (before.turn() !== me) return null; // not the student's move to explain
    after = new Chess(args.fenBefore);
    const applied = after.move(args.playedSan);
    if (!applied) return null;
    mv = applied;
  } catch {
    return null;
  }

  // THE OUTCOME, FROM THE LINE: what the engine's line after the move wins
  // from the student (the ledger's settled net), and which squares their side
  // captures on within that proof.
  const lineMoves: Move[] = [];
  try {
    const c = new Chess(after.fen());
    for (const u of args.playedLineUci ?? []) {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (!m) break;
      lineMoves.push(m);
    }
  } catch { /* the line stops where it stops being legal */ }
  const lineSans = lineMoves.map((m) => m.san);
  const proof = lineSans.length > 0 ? proofCut(args.fenBefore, [args.playedSan, ...lineSans], me) : null;
  const studentDown = proof && !proof.mate && proof.ledger && proof.ledger.netPawns < 0 ? -proof.ledger.netPawns : 0;
  // Their captures inside the proof: square → the piece that takes there.
  // (proof plies count the played move, so their moves are lineMoves[0, 2, …].)
  const theirCaptures = new Map<string, { sq: Square; type: string }>();
  if (studentDown > 0 && proof) {
    for (let i = 0; i < proof.plies - 1; i += 2) {
      const m = lineMoves[i];
      if (m?.captured && !theirCaptures.has(m.to)) theirCaptures.set(m.to, { sq: m.from, type: m.piece });
    }
  }
  const lineTakes = (sq: string): boolean => theirCaptures.has(sq);

  // The least-valuable enemy piece attacking `sq` — the one that leads a capture
  // there (and, when the point is "your piece falls", the one that takes it).
  const leastValuableAttackerOf = (board: Chess, sq: Square): { sq: Square; type: string } | null => {
    let best: { sq: Square; type: string } | null = null;
    let bestVal = Infinity;
    for (const a of board.attackers(sq, them)) {
      const p = board.get(a);
      if (!p || a === sq) continue;
      const v = VALUE[p.type] ?? 0;
      if (v < bestVal) { bestVal = v; best = { sq: a, type: p.type }; }
    }
    return best;
  };

  // ── THE MOVE LOSES THE PIECE IT MOVED (or the capture is a losing trade) ──
  //
  // Play the position forward one swap-off on the square the piece landed on.
  // If the student comes out behind, that IS why the move failed — quantified,
  // not hand-waved. Two phrasings from the same geometry: a capture that trades
  // down (held-by-defender — name the recapturer) vs a piece simply left
  // hanging (lost-the-piece). The upstream caller only asks about moves already
  // graded as errors, so naming the loss is the lesson, not an over-claim.
  // A PAWN OFFERED TO PRY THEIR KING OPEN IS NOT "LEFT HANGING" (hand walk
  // 2026-09-24: Naroditsky's a5 against b6 beside the long-castled king was
  // "That left your pawn on a5 hanging"). The gambit wording names it instead.
  if (mv.piece === 'p' && gambitFile(args.fenBefore, args.playedSan, args.studentColor)) return null;
  const netOnLanding = captureNet(after, mv.to, mv.captured ?? null);
  if (netOnLanding < 0 && lineTakes(mv.to)) {
    const recap = theirCaptures.get(mv.to) ?? null;
    if (recap) {
      const down = studentDown;
      const pts = down === 1 ? '1 point' : `${down} points`;
      if (mv.captured) {
        return {
          kind: 'held-by-defender',
          squares: [mv.to, recap.sq],
          line: `That took the ${NAME[mv.captured]} on ${mv.to}, but the ${NAME[recap.type]} on ${recap.sq} takes back and you come out ${pts} down.`,
        };
      }
      return {
        kind: 'lost-the-piece',
        squares: [mv.to, recap.sq],
        line: `That left your ${NAME[mv.piece]} on ${mv.to} hanging — the ${NAME[recap.type]} on ${recap.sq} just takes it.`,
        missed: `That left your ${NAME[mv.piece]} on ${mv.to} hanging to the ${NAME[recap.type]} on ${recap.sq} — they missed it this time.`,
      };
    }
  }

  // ── ABANDONED A DEFENDER (moving the piece undefended one of your own) ────
  //
  // David 2026-08-28: "removes a guard from another square." The moved piece was
  // the ONLY thing holding one of your other pieces together — once it leaves,
  // the opponent wins that piece by a swap-off that wasn't there a move ago. The
  // causal link is proven, not guessed: mv.from was among the piece's defenders
  // before, and the swap-off there is now losing for you.
  let worstAbandon: { sq: Square; type: string; attacker: { sq: Square; type: string } } | null = null;
  // THE SWAP-OFF MUST BE NEW (walk 2026-09-30: "your bishop was the only thing
  // guarding the queen on d6" — c7 guarded it too, and a bishop takes a queen
  // whoever guards it). The same board before the move, them to move: if they
  // already won as much there, leaving did not cause it.
  let beforeTheirs: Chess | null = null;
  try {
    const parts = before.fen().split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    beforeTheirs = new Chess(parts.join(' '));
  } catch { beforeTheirs = null; }
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== me || cell.type === 'k' || cell.square === mv.to) continue;
      if (!lineTakes(cell.square)) continue;
      let defendedByMover = false;
      try { defendedByMover = before.attackers(cell.square, me).includes(mv.from); } catch { /* skip */ }
      if (!defendedByMover) continue;
      const gainNow = seeGain(after, cell.square);
      if (gainNow <= 0) continue; // opponent can't actually win it
      if (beforeTheirs && seeGain(beforeTheirs, cell.square) >= gainNow) continue;
      const attacker = theirCaptures.get(cell.square) ?? null;
      if (!attacker) continue;
      // THE WIN MUST BE CLEAN (walk 2026-10-02: "once it left, the knight on
      // f3 wins it" — Nxd4 leaves their own knight on e4 hanging to …Nxe4).
      // After their capture, if you win back at least as much anywhere else,
      // the piece was not lost to that capture.
      if (counterWinsBack(after, attacker.sq, cell.square, me) >= gainNow) continue;
      if (!worstAbandon || (VALUE[cell.type] ?? 0) > (VALUE[worstAbandon.type] ?? 0)) {
        worstAbandon = { sq: cell.square, type: cell.type, attacker };
      }
    }
  }
  if (worstAbandon) {
    return {
      kind: 'abandoned-defender',
      squares: [worstAbandon.sq, worstAbandon.attacker.sq],
      line: after.attackers(worstAbandon.sq, me).length === 0
        ? `Your ${NAME[mv.piece]} was the only thing guarding the ${NAME[worstAbandon.type]} on ${worstAbandon.sq} — once it left, the ${NAME[worstAbandon.attacker.type]} on ${worstAbandon.attacker.sq} takes it.`
        : `Your ${NAME[mv.piece]} was holding the ${NAME[worstAbandon.type]} on ${worstAbandon.sq} together — once it left, the ${NAME[worstAbandon.attacker.type]} on ${worstAbandon.attacker.sq} wins it.`,
    };
  }

  // The rest of the geometry keys off what the move NEWLY hits. A piece the
  // student was already attacking is not the idea behind this move, so claiming
  // it was would put a reason in their mouth they never had.
  let newTargets: Square[];
  try {
    const hitNow = attackedFrom(after, mv.to, me);
    const hitBefore = new Set(attackedFrom(before, mv.from, me));
    newTargets = hitNow.filter((sq) => !hitBefore.has(sq));
  } catch {
    return null;
  }
  if (newTargets.length === 0) return null;

  // The most valuable thing it hits — the one the student was most likely
  // playing for.
  const targets = newTargets
    .map((sq) => ({ sq, piece: after.get(sq) }))
    .flatMap((t) => (t.piece ? [{ sq: t.sq, piece: t.piece }] : []))
    .sort((a, b) => (VALUE[b.piece.type] ?? 0) - (VALUE[a.piece.type] ?? 0));
  const target = targets[0];
  if (!target) return null;

  let guards: Square[];
  try {
    guards = after.attackers(target.sq, them).filter((sq) => sq !== target.sq);
  } catch {
    return null;
  }

  // ── THE THREAT ISN'T REAL — CAPTURING THE TARGET LOSES ────────────────────
  //
  // The move eyes a defended piece, but the swap-off on that square is losing
  // for you, so the "threat" never existed. Deeper than "it's defended": it's
  // proven by the exchange (student forced to move so the capture can be
  // simulated), and it names the guard that makes it a bad trade.
  let studentBoard: Chess | null = null;
  try { studentBoard = new Chess(withTurn(after.fen(), me)); } catch { studentBoard = null; }
  const swap = guards.length > 0 && studentBoard ? seeInitiate(studentBoard, target.sq) : 0;
  // ONLY A TEMPTING SWAP IS WORTH NAMING (David 2026-09-24: "No one is going
  // to take a pawn for a queen"). Past two pawns down the capture was never a
  // real option, so explaining why it fails states the obvious.
  // A GUARD THAT IS PINNED DOES NOT HOLD, and a move that PINS its target was
  // never "eyeing" it for a swap (hand walk 2026-09-24: Ra6 pinning Nb6 to the
  // queen was called "eyed the knight … the queen holds it"; Nc3 hitting d5,
  // whose only guard was that pinned knight, was called a knight for a pawn —
  // and Nxd5 won the game).
  const realGuards = guards.filter((g) => !pinnedToMore(after, g, me));
  const pinsTarget = pinnedToMore(after, target.sq, me);
  // A CAPTURE'S IDEA IS THE CAPTURE (1200 Sicilian walk 2026-09-27: 17.Bxd4
  // "That eyed the pawn on g7…", 19.Nxc5 "That eyed the pawn on b7…"). What
  // the piece happens to see from its new square is not what the student took
  // for — the capture itself is, and the landing-square rule above answers it.
  if (!mv.captured && swap < 0 && swap >= -2 && realGuards.length > 0 && !pinsTarget) {
    const guard = leastValuableAttackerOf(after, target.sq);
    if (guard) {
      // The COMPUTED cost of the swap-off, never "the exchange" — that term
      // means rook for minor piece, and walk 6 (L2) heard it said of a bishop
      // taking a guarded pawn.
      const down = -swap;
      // IN PIECES, NOT POINTS (2026-09-24 Learn tape: "taking there comes out 8
      // points down" meant the queen for a pawn). The first capture is made by
      // the cheapest attacker, so that is the piece given up for the target.
      let taker: { type: string } | null = null;
      if (studentBoard) {
        let bestVal = Infinity;
        for (const a of studentBoard.attackers(target.sq, me)) {
          const p = studentBoard.get(a);
          const v = p ? VALUE[p.type] ?? 0 : Infinity;
          if (p && v < bestVal) { bestVal = v; taker = { type: p.type }; }
        }
      }
      const cost = taker
        ? `gives up your ${NAME[taker.type]} for the ${NAME[target.piece.type]}`
        : `comes out ${down === 1 ? 'a pawn' : `${down} points`} down`;
      return {
        kind: 'held-by-defender',
        squares: [target.sq, guard.sq],
        line: `That eyed the ${NAME[target.piece.type]} on ${target.sq}, but the ${NAME[guard.type]} on ${guard.sq} holds it — taking there ${cost}.`,
      };
    }
  }

  // ── ANSWERED BY A TACTIC ────────────────────────────────────────────────
  //
  // Nothing guards it, so it reads as free — and it is the OPPONENT's move.
  // A reply that gives check AND attacks the piece that did the attacking wins
  // the tempo the whole idea depended on: the check must be answered, and the
  // attacker is gone before it ever collects. Every part is checked here, not
  // asserted: the reply is a legal chess.js move, it really gives check, and
  // the attacked square really is the one the student's piece stands on.
  if (guards.length === 0) {
    for (const reply of after.moves({ verbose: true })) {
      const probe = new Chess(after.fen());
      let played: Move | null = null;
      try { played = probe.move(reply.san); } catch { continue; }
      if (!played || !probe.isCheck()) continue;
      let hitsAttacker = false;
      try {
        hitsAttacker = probe.attackers(mv.to, them).includes(played.to);
      } catch { continue; }
      if (!hitsAttacker) continue;
      return {
        kind: 'answered-by-tactic',
        squares: [target.sq, played.to],
        line: `Nothing was defending the ${NAME[target.piece.type]} on ${target.sq} — but it was their move, and ${played.san} comes with check and hits your ${NAME[mv.piece]} on ${mv.to} at the same time.`,
      };
    }
  }

  return null;
}
