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
  kind: 'held-by-defender' | 'answered-by-tactic';
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

  // What the move NEWLY hits. A piece the student was already attacking before
  // they moved is not the idea behind this move, and claiming it was would put
  // a reason in their mouth they never had.
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

  const targetValue = VALUE[target.piece.type] ?? 0;
  const moverValue = VALUE[mv.piece] ?? 0;
  let guards: Square[];
  try {
    guards = after.attackers(target.sq, them).filter((sq) => sq !== target.sq);
  } catch {
    return null;
  }

  // ── HELD BY A DEFENDER ──────────────────────────────────────────────────
  //
  // Guarded, and the attacker is worth more than the target: the capture is a
  // losing trade, so the "threat" never existed. Only claimed when the value
  // comparison makes it unambiguous — a guarded EQUAL trade is a real option a
  // student may well want, and calling that a failure would be wrong.
  if (guards.length > 0 && moverValue > targetValue) {
    const guard = guards
      .map((sq) => ({ sq, piece: after.get(sq) }))
      .flatMap((g) => (g.piece ? [{ sq: g.sq, piece: g.piece }] : []))
      .sort((a, b) => (VALUE[a.piece.type] ?? 0) - (VALUE[b.piece.type] ?? 0))[0];
    if (guard) {
      return {
        kind: 'held-by-defender',
        squares: [target.sq, guard.sq],
        line: `That hit the ${NAME[target.piece.type]} on ${target.sq}, but the ${NAME[guard.piece.type]} on ${guard.sq} is holding it — taking there just trades your ${NAME[mv.piece]} for less.`,
      };
    }
  }

  // ── ANSWERED BY A TACTIC ────────────────────────────────────────────────
  //
  // Nothing guards it, so it reads as free — and it is the OPPONENT's move.
  // A reply that gives check AND attacks the piece that did the attacking wins
  // the tempo the whole idea depended on: the check must be answered, and the
  // attacker is gone before it ever collects.
  //
  // Every part of that is checked here rather than asserted: the reply is a
  // legal move from chess.js, it really gives check, and the attacked square
  // really is the one the student's piece stands on.
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
