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
import { Chess, type Square, type Color, type Move } from 'chess.js';

export interface WhyItFailed {
  /** One sentence, past tense — the move has already been played. */
  line: string;
  /** Squares worth marking: the target, then the piece that refutes it. */
  squares: string[];
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
  const netOnLanding = captureNet(after, mv.to, mv.captured ?? null);
  if (netOnLanding < 0) {
    const recap = leastValuableAttackerOf(after, mv.to);
    if (recap) {
      const down = Math.abs(netOnLanding);
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
  for (const row of after.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== me || cell.type === 'k' || cell.square === mv.to) continue;
      let defendedByMover = false;
      try { defendedByMover = before.attackers(cell.square, me).includes(mv.from); } catch { /* skip */ }
      if (!defendedByMover) continue;
      if (seeGain(after, cell.square) <= 0) continue; // opponent can't actually win it
      const attacker = leastValuableAttackerOf(after, cell.square);
      if (!attacker) continue;
      if (!worstAbandon || (VALUE[cell.type] ?? 0) > (VALUE[worstAbandon.type] ?? 0)) {
        worstAbandon = { sq: cell.square, type: cell.type, attacker };
      }
    }
  }
  if (worstAbandon) {
    return {
      kind: 'abandoned-defender',
      squares: [worstAbandon.sq, worstAbandon.attacker.sq],
      line: `Your ${NAME[mv.piece]} was the only thing guarding the ${NAME[worstAbandon.type]} on ${worstAbandon.sq} — once it left, the ${NAME[worstAbandon.attacker.type]} on ${worstAbandon.attacker.sq} takes it.`,
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
  if (guards.length > 0 && studentBoard && seeInitiate(studentBoard, target.sq) < 0) {
    const guard = leastValuableAttackerOf(after, target.sq);
    if (guard) {
      return {
        kind: 'held-by-defender',
        squares: [target.sq, guard.sq],
        line: `That eyed the ${NAME[target.piece.type]} on ${target.sq}, but the ${NAME[guard.type]} on ${guard.sq} holds it — taking there just loses the exchange.`,
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
